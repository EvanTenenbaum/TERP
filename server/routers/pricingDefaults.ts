/**
 * Pricing Defaults Router
 * Manages default margin percentages for product categories
 * v2.0 Sales Order Enhancements
 */

import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { pricingService } from "../services/pricingService";
import { requirePermission } from "../_core/permissionMiddleware";

export const pricingDefaultsRouter = router({
  /**
   * Get all default margins
   */
  getAll: protectedProcedure.use(requirePermission("pricing:read")).query(async () => {
    return await pricingService.getAllDefaultMargins();
  }),

  /**
   * Get default margin for category
   */
  getByCategory: protectedProcedure.use(requirePermission("pricing:read"))
    .input(
      z.object({
        productCategory: z.string(),
        effectiveDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const effectiveDate = input.effectiveDate
        ? new Date(input.effectiveDate)
        : new Date();

      const margin = await pricingService.getDefaultMarginByCategory(
        input.productCategory
      );

      return {
        productCategory: input.productCategory,
        margin,
      };
    }),

  /**
   * Create or update default margin
   */
  upsert: protectedProcedure.use(requirePermission("pricing:read"))
    .input(
      z.object({
        productCategory: z.string(),
        marginPercent: z.number().min(0).max(100),
        description: z.string(),
        effectiveDate: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      await pricingService.setDefaultMarginByCategory(
        input.productCategory,
        input.marginPercent
      );

      return {
        success: true,
        productCategory: input.productCategory,
        marginPercent: input.marginPercent,
      };
    }),

  /**
   * Get margin with fallback logic
   * Used by order creation to determine margin
   */
  getMarginWithFallback: protectedProcedure.use(requirePermission("pricing:read"))
    .input(
      z.object({
        clientId: z.number(),
        productCategory: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await pricingService.getMarginWithFallback(
        input.clientId,
        input.productCategory
      );
    }),
});

