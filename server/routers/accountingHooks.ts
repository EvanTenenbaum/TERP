/**
 * Accounting Hooks Router
 * API endpoints for automatic GL posting and COGS calculations
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as accountingHooks from "../accountingHooks";
import * as cogsCalculation from "../cogsCalculation";

export const accountingHooksRouter = router({
  /**
   * Seed standard chart of accounts
   */
  seedAccounts: protectedProcedure.mutation(async () => {
    await accountingHooks.seedStandardAccounts();
    return { success: true };
  }),

  /**
   * Calculate COGS for a sale
   */
  calculateSaleCOGS: protectedProcedure
    .input(
      z.object({
        lineItems: z.array(
          z.object({
            batchId: z.number(),
            quantity: z.string()
          })
        ),
        clientId: z.number()
      })
    )
    .query(async ({ input }) => {
      return await cogsCalculation.calculateSaleCOGS(
        { lineItems: input.lineItems },
        input.clientId
      );
    }),

  /**
   * Calculate weighted average COGS
   */
  calculateWeightedAverageCOGS: protectedProcedure
    .input(z.object({ batchIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      return await cogsCalculation.calculateWeightedAverageCOGS(input.batchIds);
    }),

  /**
   * Calculate total inventory value
   */
  calculateInventoryValue: protectedProcedure.query(async () => {
    return await cogsCalculation.calculateTotalInventoryValue();
  }),

  /**
   * Get COGS breakdown by product
   */
  getCOGSBreakdown: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return await cogsCalculation.getCOGSBreakdownByProduct(input.productId);
    }),

  /**
   * Reverse GL entries for a transaction
   */
  reverseGLEntries: protectedProcedure
    .input(
      z.object({
        referenceType: z.string(),
        referenceId: z.number(),
        reason: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await accountingHooks.reverseGLEntries(
        input.referenceType,
        input.referenceId,
        input.reason,
        ctx.user.id
      );
    })
});

