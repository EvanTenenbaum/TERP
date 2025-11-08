import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as matchingEngine from "../matchingEngineEnhanced";
import * as historicalAnalysis from "../historicalAnalysis";
import { requirePermission } from "../_core/permissionMiddleware";

/**
 * Matching Router (Enhanced Version)
 * Handles matching operations between client needs and inventory/vendor supply
 */
export const matchingEnhancedRouter = router({
  /**
   * Find matches for a specific client need
   */
  findMatchesForNeed: publicProcedure
    .input(z.object({ needId: z.number() }))
    .query(async ({ input }) => {
      try {
        const matches = await matchingEngine.findMatchesForNeed(input.needId);

        return {
          success: true,
          data: matches,
        };
      } catch (error) {
        console.error("Error finding matches for need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to find matches",
        };
      }
    }),

  /**
   * Find client needs that match a specific inventory batch
   */
  findMatchesForBatch: publicProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      try {
        const matches = await matchingEngine.findClientNeedsForBatch(input.batchId);

        return {
          success: true,
          data: matches,
        };
      } catch (error) {
        console.error("Error finding matches for batch:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to find matches",
        };
      }
    }),

  /**
   * Find client needs that match a specific vendor supply
   */
  findMatchesForVendorSupply: publicProcedure
    .input(z.object({ vendorSupplyId: z.number() }))
    .query(async ({ input }) => {
      try {
        const matches = await matchingEngine.findClientNeedsForVendorSupply(input.vendorSupplyId);

        return {
          success: true,
          data: matches,
        };
      } catch (error) {
        console.error("Error finding matches for vendor supply:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to find matches",
        };
      }
    }),

  /**
   * Analyze client purchase history to identify patterns
   */
  analyzeClientPurchaseHistory: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        minPurchases: z.number().default(2),
        daysBack: z.number().default(365),
      })
    )
    .query(async ({ input }) => {
      try {
        const patterns = await historicalAnalysis.analyzeClientPurchaseHistory(
          input.clientId,
          input.minPurchases
        );

        return {
          success: true,
          data: patterns,
        };
      } catch (error) {
        console.error("Error analyzing purchase history:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to analyze purchase history",
        };
      }
    }),

  /**
   * Identify lapsed buyers (clients who used to buy but haven't recently)
   */
  identifyLapsedBuyers: publicProcedure
    .input(
      z.object({
        minPastPurchases: z.number().default(3),
        daysSinceLastPurchase: z.number().default(90),
      })
    )
    .query(async ({ input }) => {
      try {
        const lapsedBuyers = await historicalAnalysis.getLapsedBuyers(
          input.daysSinceLastPurchase
        );

        return {
          success: true,
          data: lapsedBuyers,
        };
      } catch (error) {
        console.error("Error identifying lapsed buyers:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to identify lapsed buyers",
        };
      }
    }),
});

