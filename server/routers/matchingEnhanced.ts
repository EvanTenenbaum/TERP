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

  /**
   * Get all active needs with their matches (for dashboard widgets)
   */
  getAllActiveNeedsWithMatches: publicProcedure
    .query(async () => {
      // TODO: Implement full matching logic
      // For now, return empty data to satisfy TypeScript
      return {
        success: true,
        data: [] as Array<{
          clientNeedId: number;
          clientId: number;
          clientName: string;
          strain: string | null;
          priority: string;
          confidence: number;
          batchId: number;
          batchCode: string;
          availableQty: number;
          unitPrice: number;
          type?: string;
          reasons?: string[];
        }>,
      };
    }),

  /**
   * Get predictive reorder opportunities based on purchase history
   */
  getPredictiveReorderOpportunities: publicProcedure
    .input(z.object({
      lookAheadDays: z.number().optional().default(30),
      minOrderCount: z.number().optional().default(2),
    }).optional())
    .query(async () => {
      // TODO: Implement predictive analytics
      // For now, return empty data to satisfy TypeScript
      return {
        success: true,
        data: [] as Array<{
          clientId: number;
          clientName: string;
          productId: number;
          productName: string;
          strain?: string;
          category?: string;
          lastPurchaseDate: Date;
          predictedReorderDate: Date;
          confidence: number;
          averageQuantity: number;
          reasons?: string[];
        }>,
      };
    }),

  /**
   * Find potential buyers for a specific inventory batch
   */
  findBuyersForInventory: publicProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      // TODO: Implement buyer matching logic
      // For now, return empty data to satisfy TypeScript
      return {
        success: true,
        data: [] as Array<{
          clientId: number;
          clientName: string;
          matchScore: number;
          lastPurchaseDate: Date | null;
          totalPurchases: number;
        }>,
      };
    }),

  /**
   * Find historical buyers for a product/strain
   */
  findHistoricalBuyers: publicProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      // TODO: Implement historical buyer analysis
      // For now, return empty data to satisfy TypeScript
      return {
        success: true,
        data: [] as Array<{
          clientId: number;
          clientName: string;
          purchaseCount: number;
          lastPurchaseDate: Date;
          totalQuantity: number;
        }>,
      };
    }),
});

