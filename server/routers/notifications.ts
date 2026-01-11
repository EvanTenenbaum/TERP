import { z } from "zod";
import { router, protectedProcedure, vipPortalProcedure, adminProcedure } from "../_core/trpc";
import {
  deleteNotification,
  getNotificationPreferences,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "../services/notificationService";
import { getDb } from "../db";
import { organizationSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const paginationInput = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .optional();

const resolvePagination = (input: z.infer<typeof paginationInput>) => ({
  limit: input?.limit ?? 20,
  offset: input?.offset ?? 0,
});

// FEAT-023: Extended preference input with system vs user level distinction
const preferenceInput = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  orderUpdates: z.boolean().optional(),
  systemAlerts: z.boolean().optional(),
});

// FEAT-023: System-level notification settings schema
const systemNotificationSettingsSchema = z.object({
  // Global toggles that admin can enforce
  emailNotificationsEnabled: z.boolean().optional(),
  inAppNotificationsEnabled: z.boolean().optional(),
  smsNotificationsEnabled: z.boolean().optional(),
  // Category-level system settings
  systemAlertsForced: z.boolean().optional(), // Force system alerts ON for all users
  orderUpdatesDefault: z.boolean().optional(), // Default for new users
  appointmentRemindersDefault: z.boolean().optional(),
  // Quiet hours (system-wide)
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(), // "22:00"
  quietHoursEnd: z.string().optional(), // "07:00"
  // Admin override capability
  allowUserOverrides: z.boolean().optional(), // Whether users can customize their settings
});

export const notificationsRouter = router({
  list: protectedProcedure.input(paginationInput).query(async ({ ctx, input }) => {
    const { limit, offset } = resolvePagination(input);
    const items = await listNotifications({ userId: ctx.user.id }, { limit, offset });
    const unread = await getUnreadCount({ userId: ctx.user.id });

    return {
      items,
      unread,
      total: items.length,
      pagination: { limit, offset },
    };
  }),

  markRead: protectedProcedure
    .input(z.object({ notificationId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.notificationId, { userId: ctx.user.id });
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const updated = await markAllNotificationsRead({ userId: ctx.user.id });
    return { updated };
  }),

  delete: protectedProcedure
    .input(z.object({ notificationId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await deleteNotification(input.notificationId, { userId: ctx.user.id });
      return { success: true };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => ({
    unread: await getUnreadCount({ userId: ctx.user.id }),
  })),

  getPreferences: protectedProcedure.query(async ({ ctx }) =>
    getNotificationPreferences({ userId: ctx.user.id })
  ),

  updatePreferences: protectedProcedure
    .input(preferenceInput)
    .mutation(async ({ ctx, input }) =>
      updateNotificationPreferences({ userId: ctx.user.id }, input)
    ),

  vipList: vipPortalProcedure.input(paginationInput).query(async ({ ctx, input }) => {
    const { limit, offset } = resolvePagination(input);
    const clientId = ctx.clientId;
    const items = await listNotifications(
      { clientId, recipientType: "client" },
      { limit, offset }
    );
    const unread = await getUnreadCount({ clientId, recipientType: "client" });

    return {
      items,
      unread,
      total: items.length,
      pagination: { limit, offset },
    };
  }),

  vipMarkRead: vipPortalProcedure
    .input(z.object({ notificationId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.notificationId, {
        clientId: ctx.clientId,
        recipientType: "client",
      });
      return { success: true };
    }),

  vipMarkAllRead: vipPortalProcedure.mutation(async ({ ctx }) => {
    const updated = await markAllNotificationsRead({
      clientId: ctx.clientId,
      recipientType: "client",
    });
    return { updated };
  }),

  vipGetUnreadCount: vipPortalProcedure.query(async ({ ctx }) => ({
    unread: await getUnreadCount({
      clientId: ctx.clientId,
      recipientType: "client",
    }),
  })),

  vipGetPreferences: vipPortalProcedure.query(async ({ ctx }) =>
    getNotificationPreferences({
      clientId: ctx.clientId,
      recipientType: "client",
    })
  ),

  vipUpdatePreferences: vipPortalProcedure
    .input(preferenceInput)
    .mutation(async ({ ctx, input }) =>
      updateNotificationPreferences(
        { clientId: ctx.clientId, recipientType: "client" },
        input
      )
    ),

  // ============================================================================
  // FEAT-023: System vs User Level Notification Preferences
  // ============================================================================

  /**
   * Get system-level notification settings (admin only)
   */
  getSystemSettings: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const settingKeys = [
      "notification_email_enabled",
      "notification_in_app_enabled",
      "notification_sms_enabled",
      "notification_system_alerts_forced",
      "notification_order_updates_default",
      "notification_appointment_reminders_default",
      "notification_quiet_hours_enabled",
      "notification_quiet_hours_start",
      "notification_quiet_hours_end",
      "notification_allow_user_overrides",
    ];

    const settings = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.isActive, true));

    const settingsMap: Record<string, unknown> = {};
    for (const setting of settings) {
      if (settingKeys.includes(setting.settingKey)) {
        try {
          settingsMap[setting.settingKey] = JSON.parse(setting.settingValue as string);
        } catch {
          settingsMap[setting.settingKey] = setting.settingValue;
        }
      }
    }

    return {
      emailNotificationsEnabled: settingsMap["notification_email_enabled"] ?? true,
      inAppNotificationsEnabled: settingsMap["notification_in_app_enabled"] ?? true,
      smsNotificationsEnabled: settingsMap["notification_sms_enabled"] ?? false,
      systemAlertsForced: settingsMap["notification_system_alerts_forced"] ?? false,
      orderUpdatesDefault: settingsMap["notification_order_updates_default"] ?? true,
      appointmentRemindersDefault: settingsMap["notification_appointment_reminders_default"] ?? true,
      quietHoursEnabled: settingsMap["notification_quiet_hours_enabled"] ?? false,
      quietHoursStart: settingsMap["notification_quiet_hours_start"] ?? "22:00",
      quietHoursEnd: settingsMap["notification_quiet_hours_end"] ?? "07:00",
      allowUserOverrides: settingsMap["notification_allow_user_overrides"] ?? true,
    };
  }),

  /**
   * Update system-level notification settings (admin only)
   */
  updateSystemSettings: adminProcedure
    .input(systemNotificationSettingsSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const settingMapping: Record<string, keyof typeof input> = {
        "notification_email_enabled": "emailNotificationsEnabled",
        "notification_in_app_enabled": "inAppNotificationsEnabled",
        "notification_sms_enabled": "smsNotificationsEnabled",
        "notification_system_alerts_forced": "systemAlertsForced",
        "notification_order_updates_default": "orderUpdatesDefault",
        "notification_appointment_reminders_default": "appointmentRemindersDefault",
        "notification_quiet_hours_enabled": "quietHoursEnabled",
        "notification_quiet_hours_start": "quietHoursStart",
        "notification_quiet_hours_end": "quietHoursEnd",
        "notification_allow_user_overrides": "allowUserOverrides",
      };

      for (const [settingKey, inputKey] of Object.entries(settingMapping)) {
        const value = input[inputKey];
        if (value !== undefined) {
          const [existing] = await db
            .select()
            .from(organizationSettings)
            .where(eq(organizationSettings.settingKey, settingKey))
            .limit(1);

          if (existing) {
            await db
              .update(organizationSettings)
              .set({ settingValue: JSON.stringify(value) })
              .where(eq(organizationSettings.settingKey, settingKey));
          } else {
            await db.insert(organizationSettings).values({
              settingKey,
              settingValue: JSON.stringify(value),
              settingType: typeof value === "boolean" ? "BOOLEAN" : "STRING",
              description: `System notification setting: ${inputKey}`,
              scope: "SYSTEM",
            });
          }
        }
      }

      return { success: true };
    }),

  /**
   * Get combined preferences (system + user level)
   * Returns effective preferences after applying system overrides
   */
  getEffectivePreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Get user preferences
    const userPrefs = await getNotificationPreferences({ userId: ctx.user.id });

    // Get system settings
    const systemSettings = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.isActive, true));

    const systemMap: Record<string, unknown> = {};
    for (const setting of systemSettings) {
      if (setting.settingKey.startsWith("notification_")) {
        try {
          systemMap[setting.settingKey] = JSON.parse(setting.settingValue as string);
        } catch {
          systemMap[setting.settingKey] = setting.settingValue;
        }
      }
    }

    const allowUserOverrides = systemMap["notification_allow_user_overrides"] !== false;
    const systemAlertsForced = systemMap["notification_system_alerts_forced"] === true;
    const emailEnabled = systemMap["notification_email_enabled"] !== false;
    const inAppEnabled = systemMap["notification_in_app_enabled"] !== false;

    // Compute effective preferences
    const effective = {
      inAppEnabled: inAppEnabled && (allowUserOverrides ? userPrefs.inAppEnabled : true),
      emailEnabled: emailEnabled && (allowUserOverrides ? userPrefs.emailEnabled : true),
      appointmentReminders: allowUserOverrides ? userPrefs.appointmentReminders : true,
      orderUpdates: allowUserOverrides ? userPrefs.orderUpdates : true,
      systemAlerts: systemAlertsForced || userPrefs.systemAlerts, // Force ON if system requires
    };

    return {
      userPreferences: userPrefs,
      systemSettings: {
        emailNotificationsEnabled: emailEnabled,
        inAppNotificationsEnabled: inAppEnabled,
        systemAlertsForced,
        allowUserOverrides,
        quietHoursEnabled: systemMap["notification_quiet_hours_enabled"] ?? false,
        quietHoursStart: systemMap["notification_quiet_hours_start"] ?? "22:00",
        quietHoursEnd: systemMap["notification_quiet_hours_end"] ?? "07:00",
      },
      effectivePreferences: effective,
      canCustomize: allowUserOverrides,
    };
  }),

  /**
   * Get notification categories with their settings
   */
  getNotificationCategories: protectedProcedure.query(async ({ ctx }) => {
    const userPrefs = await getNotificationPreferences({ userId: ctx.user.id });

    return {
      categories: [
        {
          id: "system",
          name: "System Alerts",
          description: "Important system notifications, security alerts, and maintenance updates",
          enabled: userPrefs.systemAlerts,
          canDisable: false, // System alerts may be forced ON
          channels: ["in_app", "email"],
        },
        {
          id: "order",
          name: "Order Updates",
          description: "Updates about your orders, status changes, and delivery notifications",
          enabled: userPrefs.orderUpdates,
          canDisable: true,
          channels: ["in_app", "email"],
        },
        {
          id: "appointment",
          name: "Appointment Reminders",
          description: "Reminders for scheduled appointments and calendar events",
          enabled: userPrefs.appointmentReminders,
          canDisable: true,
          channels: ["in_app", "email", "sms"],
        },
        {
          id: "general",
          name: "General Notifications",
          description: "General updates, tips, and feature announcements",
          enabled: true,
          canDisable: true,
          channels: ["in_app"],
        },
      ],
    };
  }),
});
