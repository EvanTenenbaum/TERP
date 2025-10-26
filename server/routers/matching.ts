import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as matchingEngine from "../matchingEngine";
import * as historicalAnalysis from "../historicalAnalysis";

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
        console.error("Error finding matches for need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to find matches",
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
        const buyers = await matchingEngine.findBuyersForInventory(input.batchId);

        return {
          success: true,
          data: buyers,
        };
      } catch (error) {
        console.error("Error finding buyers for inventory:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to find buyers",
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
        const buyers = await matchingEngine.findBuyersForVendorSupply(input.supplyId);

        return {
          success: true,
          data: buyers,
        };
      } catch (error) {
        console.error("Error finding buyers for vendor supply:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to find buyers",
        };
      }
    }),

  /**
   * Get all active needs with their best matches
   */
  getAllActiveNeedsWithMatches: publicProcedure
    .query(async () => {
      try {
        const results = await matchingEngine.getAllActiveNeedsWithMatches();

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        console.error("Error getting active needs with matches:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get active needs with matches",
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
        console.error("Error analyzing client purchase history:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to analyze purchase history",
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
        console.error("Error finding historical buyers:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to find historical buyers",
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
        const lapsedBuyers = await historicalAnalysis.getLapsedBuyers(input.daysThreshold);

        return {
          success: true,
          data: lapsedBuyers,
        };
      } catch (error) {
        console.error("Error getting lapsed buyers:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get lapsed buyers",
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
        const opportunities = await historicalAnalysis.getProactiveOpportunities(
          input.daysThreshold
        );

        return {
          success: true,
          data: opportunities,
        };
      } catch (error) {
        console.error("Error getting proactive opportunities:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get proactive opportunities",
        };
      }
    }),
});

