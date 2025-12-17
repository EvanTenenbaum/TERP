import { z } from "zod";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as salesSheetEnhancements from "../salesSheetEnhancements";
import { requirePermission } from "../_core/permissionMiddleware";

export const salesSheetEnhancementsRouter = router({
  // Version control
  createVersion: publicProcedure
    .input(
      z.object({
        templateId: z.number(),
        userId: z.number(),
        changes: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await salesSheetEnhancements.createSalesSheetVersion(
        input.templateId,
        input.userId,
        input.changes
      );
    }),

  getVersionHistory: publicProcedure
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

  restoreVersion: publicProcedure
    .input(
      z.object({
        versionId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await salesSheetEnhancements.restoreSalesSheetVersion(
        input.versionId,
        input.userId
      );
    }),

  // Clone template
  cloneTemplate: publicProcedure
    .input(
      z.object({
        templateId: z.number(),
        userId: z.number(),
        newName: z.string(),
        clientId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await salesSheetEnhancements.cloneSalesSheetTemplate(
        input.templateId,
        input.userId,
        input.newName,
        input.clientId
      );
    }),

  // Expiration management
  setExpiration: publicProcedure
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
  createBulkOrders: publicProcedure
    .input(
      z.object({
        templateId: z.number(),
        userId: z.number(),
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
    .mutation(async ({ input }) => {
      return await salesSheetEnhancements.createBulkOrdersFromSalesSheet(
        input.templateId,
        input.clientOrders,
        input.userId
      );
    }),

  // Client-specific pricing
  getClientPricing: publicProcedure
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
  getActiveSheets: publicProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await salesSheetEnhancements.getActiveSalesSheets(input.clientId);
    }),

  // Usage statistics
  getUsageStats: publicProcedure
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
