import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import * as matchingEngine from "../matchingEngineEnhanced";
import * as historicalAnalysis from "../historicalAnalysis";

/**
 * Matching Router (Enhanced Version)
 * Handles matching operations between client needs and inventory/vendor supply
 */
export const matchingEnhancedRouter = router({
  /**
   * Find matches for a specific client need
   */
  findMatchesForNeed: protectedProcedure
    .use(requirePermission("matching:read"))
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
          error:
            error instanceof Error ? error.message : "Failed to find matches",
        };
      }
    }),

  /**
   * Find client needs that match a specific inventory batch
   */
  findMatchesForBatch: protectedProcedure
    .use(requirePermission("matching:read"))
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      try {
        const matches = await matchingEngine.findClientNeedsForBatch(
          input.batchId
        );

        return {
          success: true,
          data: matches,
        };
      } catch (error) {
        console.error("Error finding matches for batch:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to find matches",
        };
      }
    }),

  /**
   * Find client needs that match a specific vendor supply
   */
  findMatchesForVendorSupply: protectedProcedure
    .use(requirePermission("matching:read"))
    .input(z.object({ vendorSupplyId: z.number() }))
    .query(async ({ input }) => {
      try {
        const matches = await matchingEngine.findClientNeedsForVendorSupply(
          input.vendorSupplyId
        );

        return {
          success: true,
          data: matches,
        };
      } catch (error) {
        console.error("Error finding matches for vendor supply:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to find matches",
        };
      }
    }),

  /**
   * Analyze client purchase history to identify patterns
   */
  analyzeClientPurchaseHistory: protectedProcedure
    .use(requirePermission("matching:read"))
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
          error:
            error instanceof Error
              ? error.message
              : "Failed to analyze purchase history",
        };
      }
    }),

  /**
   * Identify lapsed buyers (clients who used to buy but haven't recently)
   */
  identifyLapsedBuyers: protectedProcedure
    .use(requirePermission("matching:read"))
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
          error:
            error instanceof Error
              ? error.message
              : "Failed to identify lapsed buyers",
        };
      }
    }),

  /**
   * Get all active needs with their matches (for dashboard widgets)
   */
  getAllActiveNeedsWithMatches: protectedProcedure
    .use(requirePermission("matching:read"))
    .query(async () => {
      try {
        const results = await matchingEngine.getAllActiveNeedsWithMatches();

        // Helper to safely extract client name from sourceData
        const getClientName = (
          sourceData: matchingEngine.Match["sourceData"],
          fallback: string
        ): string => {
          if ("client" in sourceData && sourceData.client?.name) {
            return sourceData.client.name;
          }
          return fallback;
        };

        // Helper to safely extract strain from sourceData
        const getStrain = (
          sourceData: matchingEngine.Match["sourceData"]
        ): string | null => {
          if ("product" in sourceData && sourceData.product?.nameCanonical) {
            return sourceData.product.nameCanonical;
          }
          if ("strain" in sourceData && sourceData.strain) {
            return sourceData.strain;
          }
          return null;
        };

        // Helper to safely extract batch code from sourceData
        const getBatchCode = (
          sourceData: matchingEngine.Match["sourceData"]
        ): string => {
          if ("batch" in sourceData && sourceData.batch?.code) {
            return sourceData.batch.code;
          }
          if (
            "id" in sourceData &&
            !("batch" in sourceData) &&
            !("client" in sourceData)
          ) {
            // This is EnhancedVendorSourceData
            return String(sourceData.id);
          }
          return "";
        };

        // Transform results into dashboard-friendly format
        const dashboardData = results.flatMap(result =>
          result.matches.map(match => ({
            clientNeedId: result.clientNeedId ?? 0,
            clientId: result.clientId,
            clientName: getClientName(
              match.sourceData,
              `Client ${result.clientId}`
            ),
            strain: getStrain(match.sourceData),
            priority:
              match.type === "EXACT"
                ? "HIGH"
                : match.type === "CLOSE"
                  ? "MEDIUM"
                  : "LOW",
            confidence: match.confidence,
            batchId: match.source === "INVENTORY" ? match.sourceId : 0,
            batchCode: getBatchCode(match.sourceData),
            availableQty: match.availableQuantity ?? 0,
            unitPrice: match.calculatedPrice ?? 0,
            type: match.type,
            reasons: match.reasons,
          }))
        );

        return {
          success: true,
          data: dashboardData,
        };
      } catch (error) {
        console.error("Error getting all active needs with matches:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get matches",
          data: [],
        };
      }
    }),

  /**
   * Get predictive reorder opportunities based on purchase history
   */
  getPredictiveReorderOpportunities: protectedProcedure
    .use(requirePermission("matching:read"))
    .input(
      z
        .object({
          lookAheadDays: z.number().optional().default(30),
          minOrderCount: z.number().optional().default(2),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const lookAheadDays = input?.lookAheadDays ?? 30;
        const minOrderCount = input?.minOrderCount ?? 2;

        // Get clients with purchase patterns
        const patterns =
          await historicalAnalysis.getPredictiveReorderOpportunities(
            lookAheadDays,
            minOrderCount
          );

        // Transform into predictive opportunities (using correct property names from ReorderPrediction)
        const opportunities = patterns.map(pattern => ({
          clientId: pattern.clientId,
          clientName: pattern.clientName ?? `Client ${pattern.clientId}`,
          productId: 0, // Not available in ReorderPrediction
          productName: pattern.strain ?? pattern.category ?? "Unknown Product",
          strain: pattern.strain,
          category: pattern.category,
          lastPurchaseDate: new Date(
            Date.now() - pattern.daysSinceLastOrder * 24 * 60 * 60 * 1000
          ),
          predictedReorderDate:
            pattern.predictedNextOrderDate ??
            new Date(Date.now() + lookAheadDays * 24 * 60 * 60 * 1000),
          confidence: pattern.confidence ?? 0.5,
          averageQuantity: pattern.avgQuantity ?? 0,
          reasons: pattern.reasons ?? ["Based on purchase history"],
        }));

        return {
          success: true,
          data: opportunities,
        };
      } catch (error) {
        console.error("Error getting predictive reorder opportunities:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get predictions",
          data: [],
        };
      }
    }),

  /**
   * Find potential buyers for a specific inventory batch
   */
  findBuyersForInventory: protectedProcedure
    .use(requirePermission("matching:read"))
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      try {
        const results = await matchingEngine.findBuyersForInventory(
          input.batchId
        );

        // Helper to safely extract data from sourceData union type
        const getClientName = (
          sourceData: matchingEngine.Match["sourceData"],
          fallback: string
        ): string => {
          if ("client" in sourceData && sourceData.client?.name) {
            return sourceData.client.name;
          }
          return fallback;
        };

        const getLastPurchaseDate = (
          sourceData: matchingEngine.Match["sourceData"]
        ): Date | null => {
          if ("lastPurchaseDate" in sourceData && sourceData.lastPurchaseDate) {
            return sourceData.lastPurchaseDate;
          }
          return null;
        };

        const getTotalPurchases = (
          sourceData: matchingEngine.Match["sourceData"]
        ): number => {
          if ("purchaseCount" in sourceData && sourceData.purchaseCount) {
            return sourceData.purchaseCount;
          }
          return 0;
        };

        // Transform results into buyer-focused format
        // FE-BUG-006: Frontend expects 'confidence' field, not 'matchScore'
        const buyers = results.map(result => ({
          clientId: result.clientId,
          clientName: result.matches[0]
            ? getClientName(
                result.matches[0].sourceData,
                `Client ${result.clientId}`
              )
            : `Client ${result.clientId}`,
          confidence: result.matches[0]?.confidence ?? 0, // FE-BUG-006: Renamed from matchScore
          matchScore: result.matches[0]?.confidence ?? 0, // Keep for backward compatibility
          lastPurchaseDate: result.matches[0]
            ? getLastPurchaseDate(result.matches[0].sourceData)
            : null,
          totalPurchases: result.matches[0]
            ? getTotalPurchases(result.matches[0].sourceData)
            : 0,
          matchType: result.matches[0]?.type,
          reasons: result.matches[0]?.reasons ?? [],
        }));

        return {
          success: true,
          data: buyers,
        };
      } catch (error) {
        console.error("Error finding buyers for inventory:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to find buyers",
          data: [],
        };
      }
    }),

  /**
   * Find historical buyers for a product/strain
   */
  findHistoricalBuyers: protectedProcedure
    .use(requirePermission("matching:read"))
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      try {
        // Get batch details first to find product/strain info
        const batchResults = await matchingEngine.findBuyersForInventory(
          input.batchId
        );

        // Helper to safely extract data from sourceData union type
        const getClientName = (
          sourceData: matchingEngine.Match["sourceData"],
          fallback: string
        ): string => {
          if ("client" in sourceData && sourceData.client?.name) {
            return sourceData.client.name;
          }
          return fallback;
        };

        const getPurchaseCount = (
          sourceData: matchingEngine.Match["sourceData"]
        ): number => {
          if ("purchaseCount" in sourceData && sourceData.purchaseCount) {
            return sourceData.purchaseCount;
          }
          return 0;
        };

        const getLastPurchaseDate = (
          sourceData: matchingEngine.Match["sourceData"]
        ): Date => {
          if ("lastPurchaseDate" in sourceData && sourceData.lastPurchaseDate) {
            return sourceData.lastPurchaseDate;
          }
          return new Date();
        };

        const getTotalQuantity = (
          sourceData: matchingEngine.Match["sourceData"]
        ): number => {
          if ("totalQuantity" in sourceData && sourceData.totalQuantity) {
            return sourceData.totalQuantity;
          }
          return 0;
        };

        // Filter to only historical matches
        const historicalBuyers = batchResults
          .filter(result => result.matches.some(m => m.type === "HISTORICAL"))
          .map(result => {
            const histMatch = result.matches.find(m => m.type === "HISTORICAL");
            return {
              clientId: result.clientId,
              clientName: histMatch
                ? getClientName(
                    histMatch.sourceData,
                    `Client ${result.clientId}`
                  )
                : `Client ${result.clientId}`,
              purchaseCount: histMatch
                ? getPurchaseCount(histMatch.sourceData)
                : 0,
              lastPurchaseDate: histMatch
                ? getLastPurchaseDate(histMatch.sourceData)
                : new Date(),
              totalQuantity: histMatch
                ? getTotalQuantity(histMatch.sourceData)
                : 0,
            };
          });

        return {
          success: true,
          data: historicalBuyers,
        };
      } catch (error) {
        console.error("Error finding historical buyers:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to find historical buyers",
          data: [],
        };
      }
    }),

  /**
   * FEAT-020: Find products matching by strain
   * Groups inventory batches by strain for easier matching
   */
  findProductsByStrain: protectedProcedure
    .use(requirePermission("matching:read"))
    .input(
      z.object({
        strainName: z.string().optional(),
        strainId: z.number().optional(),
        includeRelated: z.boolean().default(true), // Include strain family matches
      })
    )
    .query(async ({ input }) => {
      try {
        const { findProductsByStrain } =
          await import("../services/strainMatchingService");
        const results = await findProductsByStrain({
          strainName: input.strainName,
          strainId: input.strainId,
          includeRelated: input.includeRelated,
        });
        return { success: true, data: results };
      } catch (error) {
        console.error("Error finding products by strain:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to find products",
          data: [],
        };
      }
    }),

  /**
   * FEAT-020: Group products by subcategory
   * Returns products organized by their subcategory for catalog views
   */
  groupProductsBySubcategory: protectedProcedure
    .use(requirePermission("matching:read"))
    .input(
      z.object({
        category: z.string().optional(),
        includeOutOfStock: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      try {
        const { groupProductsBySubcategory } =
          await import("../services/strainMatchingService");
        const results = await groupProductsBySubcategory({
          category: input.category,
          includeOutOfStock: input.includeOutOfStock,
        });
        return { success: true, data: results };
      } catch (error) {
        console.error("Error grouping products by subcategory:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to group products",
          data: {},
        };
      }
    }),

  /**
   * FEAT-020: Find similar strains based on characteristics
   */
  findSimilarStrains: protectedProcedure
    .use(requirePermission("matching:read"))
    .input(
      z.object({
        strainId: z.number(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const { findSimilarStrains } =
          await import("../services/strainMatchingService");
        const results = await findSimilarStrains(input.strainId, input.limit);
        return { success: true, data: results };
      } catch (error) {
        console.error("Error finding similar strains:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to find similar strains",
          data: [],
        };
      }
    }),
});
