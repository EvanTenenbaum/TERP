import { z } from "zod";
import { router, protectedProcedure, vipPortalProcedure } from "../_core/trpc";
import {
  deleteNotification,
  getNotificationPreferences,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "../services/notificationService";

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

const preferenceInput = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  orderUpdates: z.boolean().optional(),
  systemAlerts: z.boolean().optional(),
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
});
