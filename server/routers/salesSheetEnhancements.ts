import { z } from "zod";
import {
  router,
  protectedProcedure,
  adminProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import * as salesSheetEnhancements from "../salesSheetEnhancements";

export const salesSheetEnhancementsRouter = router({
  // Version control
  createVersion: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        changes: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetEnhancements.createSalesSheetVersion(
        input.templateId,
        userId,
        input.changes
      );
    }),

  getVersionHistory: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await salesSheetEnhancements.getSalesSheetVersionHistory(
        input.templateId
      );
    }),

  restoreVersion: protectedProcedure
    .input(
      z.object({
        versionId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetEnhancements.restoreSalesSheetVersion(
        input.versionId,
        userId
      );
    }),

  // Clone template
  cloneTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        newName: z.string(),
        clientId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetEnhancements.cloneSalesSheetTemplate(
        input.templateId,
        userId,
        input.newName,
        input.clientId
      );
    }),

  // Expiration management
  setExpiration: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        expirationDate: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await salesSheetEnhancements.setSalesSheetExpiration(
        input.templateId,
        new Date(input.expirationDate)
      );
      return { success: true };
    }),

  // SECURITY: This mutation modifies database state, requires admin access
  // Consider converting to a scheduled cron job instead of API endpoint
  deactivateExpired: adminProcedure.mutation(async () => {
    const count = await salesSheetEnhancements.deactivateExpiredSalesSheets();
    return { deactivatedCount: count };
  }),

  // Bulk order creation
  createBulkOrders: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        clientOrders: z.array(
          z.object({
            clientId: z.number(),
            items: z.array(
              z.object({
                itemId: z.number(),
                quantity: z.string(),
                price: z.string(),
              })
            ),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetEnhancements.createBulkOrdersFromSalesSheet(
        input.templateId,
        input.clientOrders,
        userId
      );
    }),

  // Client-specific pricing
  getClientPricing: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        clientId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await salesSheetEnhancements.getClientSpecificPricing(
        input.templateId,
        input.clientId
      );
    }),

  // Active sheets
  getActiveSheets: protectedProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await salesSheetEnhancements.getActiveSalesSheets(input.clientId);
    }),

  // Usage statistics
  getUsageStats: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await salesSheetEnhancements.getSalesSheetUsageStats(
        input.templateId
      );
    }),
});
