/**
 * Organization Settings Router
 * FEAT-010, FEAT-012, FEAT-013, FEAT-014, FEAT-015
 * Handles organization-wide settings, user preferences, and custom statuses
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { getDb } from "../db";
import {
  organizationSettings,
  userPreferences,
  unitTypes,
  customFinanceStatuses,
  locations,
} from "../../drizzle/schema";
import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ============================================================================
// Organization Settings Sub-Router
// ============================================================================
const orgSettingsRouter = router({
  // Get all organization settings
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const settings = await db.select().from(organizationSettings).where(eq(organizationSettings.isActive, true));

    // Convert to key-value map for easier consumption
    const settingsMap: Record<string, unknown> = {};
    for (const setting of settings) {
      settingsMap[setting.settingKey] = setting.settingValue;
    }

    return { settings, settingsMap };
  }),

  // Get a specific setting by key
  getByKey: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [setting] = await db
        .select()
        .from(organizationSettings)
        .where(eq(organizationSettings.settingKey, input.key))
        .limit(1);

      return setting || null;
    }),

  // Update a setting (admin only)
  update: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.unknown(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [existing] = await db
        .select()
        .from(organizationSettings)
        .where(eq(organizationSettings.settingKey, input.key))
        .limit(1);

      if (existing) {
        await db
          .update(organizationSettings)
          .set({
            settingValue: JSON.stringify(input.value),
            description: input.description || existing.description,
          })
          .where(eq(organizationSettings.settingKey, input.key));
      } else {
        await db.insert(organizationSettings).values({
          settingKey: input.key,
          settingValue: JSON.stringify(input.value),
          description: input.description,
          settingType: typeof input.value === "boolean" ? "BOOLEAN" :
                       typeof input.value === "number" ? "NUMBER" :
                       typeof input.value === "object" ? "JSON" : "STRING",
        });
      }

      return { success: true };
    }),

  // Bulk update settings
  bulkUpdate: adminProcedure
    .input(z.object({
      settings: z.array(z.object({
        key: z.string(),
        value: z.unknown(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      for (const setting of input.settings) {
        const [existing] = await db
          .select()
          .from(organizationSettings)
          .where(eq(organizationSettings.settingKey, setting.key))
          .limit(1);

        if (existing) {
          await db
            .update(organizationSettings)
            .set({ settingValue: JSON.stringify(setting.value) })
            .where(eq(organizationSettings.settingKey, setting.key));
        } else {
          await db.insert(organizationSettings).values({
            settingKey: setting.key,
            settingValue: JSON.stringify(setting.value),
            settingType: typeof setting.value === "boolean" ? "BOOLEAN" :
                         typeof setting.value === "number" ? "NUMBER" :
                         typeof setting.value === "object" ? "JSON" : "STRING",
          });
        }
      }

      return { success: true };
    }),
});

// ============================================================================
// User Preferences Sub-Router (FEAT-010)
// ============================================================================
const userPrefsRouter = router({
  // Get current user's preferences
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = getAuthenticatedUserId(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    // Return defaults if no preferences exist
    if (!prefs) {
      return {
        userId,
        defaultWarehouseId: null,
        defaultLocationId: null,
        showCogsInOrders: true,
        showMarginInOrders: true,
        showGradeField: true,
        hideExpectedDelivery: false,
      };
    }

    return prefs;
  }),

  // Update current user's preferences
  update: protectedProcedure
    .input(z.object({
      defaultWarehouseId: z.number().nullable().optional(),
      defaultLocationId: z.number().nullable().optional(),
      showCogsInOrders: z.boolean().optional(),
      showMarginInOrders: z.boolean().optional(),
      showGradeField: z.boolean().optional(),
      hideExpectedDelivery: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [existing] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      if (existing) {
        await db
          .update(userPreferences)
          .set(input)
          .where(eq(userPreferences.userId, userId));
      } else {
        await db.insert(userPreferences).values({
          userId,
          ...input,
        });
      }

      return { success: true };
    }),

  // Set default warehouse (convenience method)
  setDefaultWarehouse: protectedProcedure
    .input(z.object({ warehouseId: z.number().nullable() }))
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Validate warehouse exists
      if (input.warehouseId) {
        const [warehouse] = await db
          .select()
          .from(locations)
          .where(and(eq(locations.id, input.warehouseId), isNull(locations.deletedAt)))
          .limit(1);

        if (!warehouse) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Warehouse not found" });
        }
      }

      const [existing] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      if (existing) {
        await db
          .update(userPreferences)
          .set({ defaultWarehouseId: input.warehouseId })
          .where(eq(userPreferences.userId, userId));
      } else {
        await db.insert(userPreferences).values({
          userId,
          defaultWarehouseId: input.warehouseId,
        });
      }

      return { success: true };
    }),
});

// ============================================================================
// Unit Types Sub-Router (FEAT-013)
// ============================================================================
const unitTypesRouter = router({
  // List all unit types
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const units = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.isActive, true))
      .orderBy(asc(unitTypes.sortOrder));

    return units;
  }),

  // Get unit type by code
  getByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [unit] = await db
        .select()
        .from(unitTypes)
        .where(eq(unitTypes.code, input.code))
        .limit(1);

      return unit || null;
    }),

  // Create unit type (admin only)
  create: adminProcedure
    .input(z.object({
      code: z.string().min(1).max(20),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      category: z.enum(["WEIGHT", "COUNT", "VOLUME", "PACKAGED"]),
      conversionFactor: z.number().optional(),
      baseUnitCode: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.insert(unitTypes).values({
        code: input.code.toUpperCase(),
        name: input.name,
        description: input.description,
        category: input.category,
        conversionFactor: input.conversionFactor?.toString() || "1",
        baseUnitCode: input.baseUnitCode,
        sortOrder: input.sortOrder || 0,
      });

      return { success: true };
    }),

  // Update unit type (admin only)
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(["WEIGHT", "COUNT", "VOLUME", "PACKAGED"]).optional(),
      conversionFactor: z.number().optional(),
      baseUnitCode: z.string().nullable().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, conversionFactor, ...updates } = input;
      const finalUpdates: Record<string, unknown> = { ...updates };
      if (conversionFactor !== undefined) {
        finalUpdates.conversionFactor = conversionFactor.toString();
      }

      await db
        .update(unitTypes)
        .set(finalUpdates)
        .where(eq(unitTypes.id, id));

      return { success: true };
    }),

  // Delete (deactivate) unit type (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(unitTypes)
        .set({ isActive: false })
        .where(eq(unitTypes.id, input.id));

      return { success: true };
    }),
});

// ============================================================================
// Custom Finance Statuses Sub-Router (FEAT-015)
// ============================================================================
const financeStatusesRouter = router({
  // List statuses by entity type
  list: protectedProcedure
    .input(z.object({
      entityType: z.enum(["INVOICE", "ORDER", "PAYMENT", "BILL", "CREDIT"]).optional()
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let query = db
        .select()
        .from(customFinanceStatuses)
        .where(eq(customFinanceStatuses.isActive, true));

      if (input?.entityType) {
        query = db
          .select()
          .from(customFinanceStatuses)
          .where(
            and(
              eq(customFinanceStatuses.isActive, true),
              eq(customFinanceStatuses.entityType, input.entityType)
            )
          );
      }

      const statuses = await query.orderBy(asc(customFinanceStatuses.sortOrder));
      return statuses;
    }),

  // Get statuses grouped by entity type
  listGrouped: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const statuses = await db
      .select()
      .from(customFinanceStatuses)
      .where(eq(customFinanceStatuses.isActive, true))
      .orderBy(asc(customFinanceStatuses.sortOrder));

    // Group by entity type
    const grouped: Record<string, typeof statuses> = {};
    for (const status of statuses) {
      if (!grouped[status.entityType]) {
        grouped[status.entityType] = [];
      }
      grouped[status.entityType].push(status);
    }

    return grouped;
  }),

  // Create custom status (admin only)
  create: adminProcedure
    .input(z.object({
      entityType: z.enum(["INVOICE", "ORDER", "PAYMENT", "BILL", "CREDIT"]),
      statusCode: z.string().min(1).max(50),
      statusLabel: z.string().min(1).max(100),
      description: z.string().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      sortOrder: z.number().optional(),
      isDefault: z.boolean().optional(),
      isTerminal: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // If setting as default, clear other defaults for this entity type
      if (input.isDefault) {
        await db
          .update(customFinanceStatuses)
          .set({ isDefault: false })
          .where(eq(customFinanceStatuses.entityType, input.entityType));
      }

      await db.insert(customFinanceStatuses).values({
        entityType: input.entityType,
        statusCode: input.statusCode.toUpperCase(),
        statusLabel: input.statusLabel,
        description: input.description,
        color: input.color || "#6B7280",
        sortOrder: input.sortOrder || 0,
        isDefault: input.isDefault || false,
        isTerminal: input.isTerminal || false,
      });

      return { success: true };
    }),

  // Update custom status (admin only)
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      statusLabel: z.string().optional(),
      description: z.string().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      sortOrder: z.number().optional(),
      isDefault: z.boolean().optional(),
      isTerminal: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get the current status to know its entity type
      const [current] = await db
        .select()
        .from(customFinanceStatuses)
        .where(eq(customFinanceStatuses.id, input.id))
        .limit(1);

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Status not found" });
      }

      // If setting as default, clear other defaults for this entity type
      if (input.isDefault) {
        await db
          .update(customFinanceStatuses)
          .set({ isDefault: false })
          .where(eq(customFinanceStatuses.entityType, current.entityType));
      }

      const { id, ...updates } = input;
      await db
        .update(customFinanceStatuses)
        .set(updates)
        .where(eq(customFinanceStatuses.id, id));

      return { success: true };
    }),

  // Delete (deactivate) custom status (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(customFinanceStatuses)
        .set({ isActive: false })
        .where(eq(customFinanceStatuses.id, input.id));

      return { success: true };
    }),
});

// ============================================================================
// Team Settings Sub-Router (FEAT-021)
// ============================================================================
const teamSettingsRouter = router({
  /**
   * Get team-wide settings that apply to all team members
   * These are settings that when changed, affect all users in the team
   */
  getTeamSettings: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Get settings marked as team-wide
    const teamSettings = await db
      .select()
      .from(organizationSettings)
      .where(
        and(
          eq(organizationSettings.isActive, true),
          eq(organizationSettings.scope, "TEAM")
        )
      );

    const settingsMap: Record<string, unknown> = {};
    for (const setting of teamSettings) {
      try {
        settingsMap[setting.settingKey] = JSON.parse(setting.settingValue as string);
      } catch {
        settingsMap[setting.settingKey] = setting.settingValue;
      }
    }

    return { settings: teamSettings, settingsMap };
  }),

  /**
   * Update a team-wide setting (admin only)
   * This will affect all team members
   */
  updateTeamSetting: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.unknown(),
      description: z.string().optional(),
      syncToMembers: z.boolean().default(true), // Whether to sync to existing team members
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Update or create the team setting
      const [existing] = await db
        .select()
        .from(organizationSettings)
        .where(eq(organizationSettings.settingKey, input.key))
        .limit(1);

      if (existing) {
        await db
          .update(organizationSettings)
          .set({
            settingValue: JSON.stringify(input.value),
            description: input.description || existing.description,
            scope: "TEAM",
          })
          .where(eq(organizationSettings.settingKey, input.key));
      } else {
        await db.insert(organizationSettings).values({
          settingKey: input.key,
          settingValue: JSON.stringify(input.value),
          description: input.description,
          settingType: typeof input.value === "boolean" ? "BOOLEAN" :
                       typeof input.value === "number" ? "NUMBER" :
                       typeof input.value === "object" ? "JSON" : "STRING",
          scope: "TEAM",
        });
      }

      // Optionally sync to all team members' user preferences
      if (input.syncToMembers) {
        // Map team settings to user preferences fields
        const preferenceMapping: Record<string, string> = {
          "team_show_cogs_in_orders": "showCogsInOrders",
          "team_show_margin_in_orders": "showMarginInOrders",
          "team_show_grade_field": "showGradeField",
          "team_hide_expected_delivery": "hideExpectedDelivery",
          "team_default_warehouse_id": "defaultWarehouseId",
        };

        const prefField = preferenceMapping[input.key];
        if (prefField) {
          // Update all existing user preferences to match team setting
          await db
            .update(userPreferences)
            .set({ [prefField]: input.value });
        }
      }

      return { success: true };
    }),

  /**
   * Apply team settings to a specific user
   * Useful when a new team member is added
   */
  applyTeamSettingsToUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get all team settings
      const teamSettings = await db
        .select()
        .from(organizationSettings)
        .where(
          and(
            eq(organizationSettings.isActive, true),
            eq(organizationSettings.scope, "TEAM")
          )
        );

      // Map team settings to user preferences
      const userPrefUpdates: Record<string, unknown> = {};
      const preferenceMapping: Record<string, string> = {
        "team_show_cogs_in_orders": "showCogsInOrders",
        "team_show_margin_in_orders": "showMarginInOrders",
        "team_show_grade_field": "showGradeField",
        "team_hide_expected_delivery": "hideExpectedDelivery",
        "team_default_warehouse_id": "defaultWarehouseId",
      };

      for (const setting of teamSettings) {
        const prefField = preferenceMapping[setting.settingKey];
        if (prefField) {
          try {
            userPrefUpdates[prefField] = JSON.parse(setting.settingValue as string);
          } catch {
            userPrefUpdates[prefField] = setting.settingValue;
          }
        }
      }

      // Upsert user preferences
      const [existing] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, input.userId))
        .limit(1);

      if (existing) {
        await db
          .update(userPreferences)
          .set(userPrefUpdates)
          .where(eq(userPreferences.userId, input.userId));
      } else {
        await db.insert(userPreferences).values({
          userId: input.userId,
          ...userPrefUpdates,
        });
      }

      return { success: true };
    }),

  /**
   * Get list of settings that are team-wide vs user-specific
   */
  getSettingsClassification: protectedProcedure.query(async () => {
    return {
      teamSettings: [
        { key: "team_show_cogs_in_orders", label: "Show COGS in Orders", type: "boolean" },
        { key: "team_show_margin_in_orders", label: "Show Margin in Orders", type: "boolean" },
        { key: "team_show_grade_field", label: "Show Grade Field", type: "boolean" },
        { key: "team_hide_expected_delivery", label: "Hide Expected Delivery", type: "boolean" },
        { key: "team_default_warehouse_id", label: "Default Warehouse", type: "number" },
      ],
      userSettings: [
        { key: "theme", label: "Theme Preference", type: "string" },
        { key: "notifications_enabled", label: "Enable Notifications", type: "boolean" },
        { key: "dashboard_layout", label: "Dashboard Layout", type: "json" },
      ],
    };
  }),
});

// ============================================================================
// Main Organization Settings Router
// ============================================================================
export const organizationSettingsRouter = router({
  settings: orgSettingsRouter,
  userPreferences: userPrefsRouter,
  unitTypes: unitTypesRouter,
  financeStatuses: financeStatusesRouter,
  teamSettings: teamSettingsRouter, // FEAT-021: Team-wide settings

  // Convenience method to get all settings for a form/page
  getDisplaySettings: protectedProcedure.query(async ({ ctx }) => {
    const userId = getAuthenticatedUserId(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Get org settings
    const orgSettings = await db.select().from(organizationSettings);
    const settingsMap: Record<string, unknown> = {};
    for (const setting of orgSettings) {
      try {
        settingsMap[setting.settingKey] = JSON.parse(setting.settingValue as string);
      } catch {
        settingsMap[setting.settingKey] = setting.settingValue;
      }
    }

    // Get user preferences
    const [userPrefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    return {
      organization: settingsMap,
      user: userPrefs || {
        showCogsInOrders: true,
        showMarginInOrders: true,
        showGradeField: settingsMap.grade_field_enabled !== false,
        hideExpectedDelivery: settingsMap.expected_delivery_enabled === false,
        defaultWarehouseId: null,
      },
      // Computed display settings (combining org and user)
      display: {
        showGradeField: settingsMap.grade_field_enabled !== false && (userPrefs?.showGradeField ?? true),
        gradeFieldRequired: settingsMap.grade_field_required === true,
        showExpectedDelivery: settingsMap.expected_delivery_enabled !== false && !(userPrefs?.hideExpectedDelivery ?? false),
        showCogsInOrders: userPrefs?.showCogsInOrders ?? true,
        showMarginInOrders: userPrefs?.showMarginInOrders ?? true,
        cogsDisplayMode: settingsMap.cogs_display_mode || "VISIBLE",
        packagedUnitEnabled: settingsMap.packaged_unit_enabled !== false,
      },
    };
  }),
});
