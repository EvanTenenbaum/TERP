import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as matchingEngine from "../matchingEngine";
import * as historicalAnalysis from "../historicalAnalysis";
import { logger } from "../_core/logger";

/**
 * Matching Engine Router
 * Handles matching operations and historical analysis
 */
export const matchingRouter = router({
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
        logger.error("Error finding matches for need:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to find matches",
        };
      }
    }),

  /**
   * Find potential buyers for an inventory item
   */
  findBuyersForInventory: publicProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      try {
        const buyers = await matchingEngine.findBuyersForInventory(
          input.batchId
        );

        return {
          success: true,
          data: buyers,
        };
      } catch (error) {
        logger.error("Error finding buyers for inventory:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to find buyers",
        };
      }
    }),

  /**
   * Find potential buyers for a vendor supply item
   */
  findBuyersForVendorSupply: publicProcedure
    .input(z.object({ supplyId: z.number() }))
    .query(async ({ input }) => {
      try {
        const buyers = await matchingEngine.findBuyersForVendorSupply(
          input.supplyId
        );

        return {
          success: true,
          data: buyers,
        };
      } catch (error) {
        logger.error("Error finding buyers for vendor supply:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to find buyers",
        };
      }
    }),

  /**
   * Get all active needs with their best matches
   */
  getAllActiveNeedsWithMatches: publicProcedure.query(async () => {
    try {
      const results = await matchingEngine.getAllActiveNeedsWithMatches();

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      logger.error("Error getting active needs with matches:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get active needs with matches",
      };
    }
  }),

  /**
   * Analyze purchase history for a client
   */
  analyzeClientPurchaseHistory: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        minPurchases: z.number().default(3),
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
        logger.error("Error analyzing client purchase history:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to analyze purchase history",
        };
      }
    }),

  /**
   * Find historical buyers for an inventory item
   */
  findHistoricalBuyers: publicProcedure
    .input(
      z.object({
        strain: z.string().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        lapsedDaysThreshold: z.number().default(90),
      })
    )
    .query(async ({ input }) => {
      try {
        const { lapsedDaysThreshold, ...batchData } = input;
        const matches = await historicalAnalysis.findHistoricalBuyers(
          batchData,
          lapsedDaysThreshold
        );

        return {
          success: true,
          data: matches,
        };
      } catch (error) {
        logger.error("Error finding historical buyers:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to find historical buyers",
        };
      }
    }),

  /**
   * Get lapsed buyers (clients who haven't purchased in X days)
   */
  getLapsedBuyers: publicProcedure
    .input(
      z.object({
        daysThreshold: z.number().default(90),
      })
    )
    .query(async ({ input }) => {
      try {
        const lapsedBuyers = await historicalAnalysis.getLapsedBuyers(
          input.daysThreshold
        );

        return {
          success: true,
          data: lapsedBuyers,
        };
      } catch (error) {
        logger.error("Error getting lapsed buyers:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get lapsed buyers",
        };
      }
    }),

  /**
   * Get proactive opportunities (lapsed buyers + available inventory)
   */
  getProactiveOpportunities: publicProcedure
    .input(
      z.object({
        daysThreshold: z.number().default(90),
      })
    )
    .query(async ({ input }) => {
      try {
        const opportunities =
          await historicalAnalysis.getProactiveOpportunities(
            input.daysThreshold
          );

        return {
          success: true,
          data: opportunities,
        };
      } catch (error) {
        logger.error("Error getting proactive opportunities:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get proactive opportunities",
        };
      }
    }),

  /**
   * Predict reorder for a specific client and item
   */
  predictReorder: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        strain: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const prediction = await historicalAnalysis.predictReorder(
          input.clientId,
          input.strain,
          input.category
        );

        return {
          success: true,
          data: prediction,
        };
      } catch (error) {
        logger.error("Error predicting reorder:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to predict reorder",
        };
      }
    }),

  /**
   * Get all predictive reorder opportunities
   */
  getPredictiveReorderOpportunities: publicProcedure
    .input(
      z.object({
        lookAheadDays: z.number().default(30),
        minOrderCount: z.number().default(3),
      })
    )
    .query(async ({ input }) => {
      try {
        const predictions =
          await historicalAnalysis.getPredictiveReorderOpportunities(
            input.lookAheadDays,
            input.minOrderCount
          );

        return {
          success: true,
          data: predictions,
        };
      } catch (error) {
        logger.error("Error getting predictive reorder opportunities:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get predictive reorder opportunities",
        };
      }
    }),
});
