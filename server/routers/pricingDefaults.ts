/**
 * Pricing Defaults Router
 * Manages default margin percentages for product categories
 * v2.0 Sales Order Enhancements
 */

import { z } from "zod";
import { publicProcedure as protectedProcedure, router } from "../_core/trpc";
import { pricingService } from "../services/pricingService";

export const pricingDefaultsRouter = router({
  /**
   * Get all default margins
   */
  getAll: protectedProcedure.query(async () => {
    return await pricingService.getAllDefaults();
  }),

  /**
   * Get default margin for category
   */
  getByCategory: protectedProcedure
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

      const margin = await pricingService.getDefaultMargin(
        input.productCategory,
        effectiveDate
      );

      return {
        productCategory: input.productCategory,
        margin,
      };
    }),

  /**
   * Create or update default margin
   */
  upsert: protectedProcedure
    .input(
      z.object({
        productCategory: z.string(),
        marginPercent: z.number().min(0).max(100),
        description: z.string(),
        effectiveDate: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id || 1;

      const result = await pricingService.upsertDefaultMargin(
        input.productCategory,
        input.marginPercent,
        input.description,
        new Date(input.effectiveDate),
        userId
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
  getMarginWithFallback: protectedProcedure
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

