/**
 * Leaderboard Router
 * API endpoints for the unified leaderboard system
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getLeaderboard,
  getClientRanking,
  getEffectiveWeights,
  getDefaultWeights,
  saveUserWeights,
  resetUserWeights,
  invalidateCache,
  type MetricType,
  METRIC_CONFIGS,
  CUSTOMER_DEFAULT_WEIGHTS,
  SUPPLIER_DEFAULT_WEIGHTS,
} from "../services/leaderboard";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const clientTypeSchema = z.enum(["ALL", "CUSTOMER", "SUPPLIER", "DUAL"]);
const metricCategorySchema = z.enum(["MASTER", "FINANCIAL", "ENGAGEMENT", "RELIABILITY", "GROWTH"]);
const sortOrderSchema = z.enum(["asc", "desc"]);

const metricTypeSchema = z.enum([
  "ytd_revenue",
  "lifetime_value",
  "average_order_value",
  "profit_margin",
  "order_frequency",
  "recency",
  "on_time_payment_rate",
  "average_days_to_pay",
  "credit_utilization",
  "yoy_growth",
  "ytd_purchase_volume",
  "delivery_reliability",
  "quality_score",
  "product_variety",
  "response_time",
  "return_rate",
]);

const weightConfigSchema = z.record(z.string(), z.number().min(0).max(100));

const leaderboardParamsSchema = z.object({
  clientType: clientTypeSchema.optional().default("ALL"),
  metricCategory: metricCategorySchema.optional().default("MASTER"),
  weights: weightConfigSchema.optional(),
  search: z.string().optional(),
  sortBy: z.union([metricTypeSchema, z.literal("master_score")]).optional().default("master_score"),
  sortOrder: sortOrderSchema.optional().default("desc"),
  limit: z.number().min(1).max(100).optional().default(25),
  offset: z.number().min(0).optional().default(0),
  forceRefresh: z.boolean().optional().default(false),
});

// ============================================================================
// ROUTER
// ============================================================================

export const leaderboardRouter = router({
  /**
   * Get the full leaderboard with rankings
   */
  list: protectedProcedure
    .input(leaderboardParamsSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      
      const result = await getLeaderboard(input, userId);
      
      return {
        clients: result.clients.map(client => ({
          clientId: client.clientId,
          clientName: client.clientName,
          teriCode: client.teriCode,
          clientType: client.clientType,
          rank: client.rank,
          percentile: client.percentile,
          masterScore: client.masterScore,
          metrics: Object.fromEntries(
            Object.entries(client.metrics).map(([key, value]) => [
              key,
              {
                value: value?.value ?? null,
                isSignificant: value?.isSignificant ?? false,
              },
            ])
          ),
          trend: client.trend,
          trendAmount: client.trendAmount,
        })),
        totalCount: result.totalCount,
        metadata: {
          calculatedAt: result.metadata.calculatedAt.toISOString(),
          cacheHit: result.metadata.cacheHit,
          weightsApplied: result.metadata.weightsApplied,
          significanceWarnings: result.metadata.significanceWarnings,
        },
      };
    }),

  /**
   * Get ranking context for a single client (for profile page)
   */
  getForClient: protectedProcedure
    .input(z.object({
      clientId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      
      const result = await getClientRanking(input.clientId, userId);
      
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found or has no ranking data",
        });
      }
      
      return {
        clientId: result.clientId,
        rank: result.rank,
        percentile: result.percentile,
        totalClients: result.totalClients,
        masterScore: result.masterScore,
        categoryRanks: result.categoryRanks,
        metrics: Object.fromEntries(
          Object.entries(result.metrics).map(([key, value]) => [
            key,
            {
              value: value?.value ?? null,
              isSignificant: value?.isSignificant ?? false,
            },
          ])
        ),
        trend: result.trend,
        trendAmount: result.trendAmount,
        gapToNextRank: result.gapToNextRank,
        history: result.history,
      };
    }),

  /**
   * Get dashboard widget data (top/bottom performers)
   */
  getWidgetData: protectedProcedure
    .input(z.object({
      metric: z.union([metricTypeSchema, z.literal("master_score")]).optional().default("master_score"),
      mode: z.enum(["top", "bottom"]).optional().default("top"),
      limit: z.number().min(1).max(10).optional().default(5),
      clientType: clientTypeSchema.optional().default("ALL"),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      
      const result = await getLeaderboard({
        clientType: input.clientType,
        sortBy: input.metric,
        sortOrder: input.mode === "top" ? "desc" : "asc",
        limit: input.limit,
      }, userId);
      
      return {
        entries: result.clients.map(client => ({
          clientId: client.clientId,
          clientName: client.clientName,
          rank: client.rank,
          score: input.metric === "master_score" 
            ? client.masterScore ?? 0
            : client.metrics[input.metric as MetricType]?.value ?? 0,
          trend: client.trend,
          trendAmount: client.trendAmount,
        })),
        totalClients: result.totalCount,
        metric: input.metric,
        mode: input.mode,
        lastUpdated: result.metadata.calculatedAt.toISOString(),
      };
    }),

  // ============================================================================
  // WEIGHT MANAGEMENT
  // ============================================================================

  weights: router({
    /**
     * Get current user's weights (or defaults)
     */
    get: protectedProcedure
      .input(z.object({
        clientType: clientTypeSchema.optional().default("ALL"),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        const weights = await getEffectiveWeights(userId, input.clientType);
        const defaults = await getDefaultWeights(input.clientType);
        
        return {
          weights,
          isCustom: JSON.stringify(weights) !== JSON.stringify(defaults),
          clientType: input.clientType,
        };
      }),

    /**
     * Save user's custom weights
     */
    save: protectedProcedure
      .input(z.object({
        clientType: clientTypeSchema,
        weights: weightConfigSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Must be logged in to save weights",
          });
        }
        
        // Validate weights sum to approximately 100
        const sum = Object.values(input.weights).reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 100) > 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Weights must sum to 100%, got ${sum}%`,
          });
        }
        
        await saveUserWeights(userId, input.clientType, input.weights);
        
        return { success: true };
      }),

    /**
     * Reset user's weights to defaults
     */
    reset: protectedProcedure
      .input(z.object({
        clientType: clientTypeSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Must be logged in to reset weights",
          });
        }
        
        await resetUserWeights(userId, input.clientType);
        
        return { success: true };
      }),

    /**
     * Get default weights for a client type
     */
    getDefaults: protectedProcedure
      .input(z.object({
        clientType: clientTypeSchema,
      }))
      .query(async ({ input }) => {
        const weights = await getDefaultWeights(input.clientType);
        return { weights, clientType: input.clientType };
      }),
  }),

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  admin: router({
    /**
     * Invalidate leaderboard cache (admin only)
     */
    invalidateCache: adminProcedure
      .input(z.object({
        clientId: z.number().optional(),
      }).optional())
      .mutation(async ({ input }) => {
        await invalidateCache(input?.clientId);
        return { success: true, message: input?.clientId 
          ? `Cache invalidated for client ${input.clientId}` 
          : "All leaderboard cache invalidated" 
        };
      }),

    /**
     * Get available metrics configuration
     */
    getMetricConfigs: adminProcedure
      .query(() => {
        return {
          metrics: Object.entries(METRIC_CONFIGS).map(([key, config]) => ({
            type: key,
            name: config.name,
            description: config.description,
            category: config.category,
            direction: config.direction,
            format: config.format,
            applicableTo: config.applicableTo,
          })),
          defaultWeights: {
            CUSTOMER: CUSTOMER_DEFAULT_WEIGHTS,
            SUPPLIER: SUPPLIER_DEFAULT_WEIGHTS,
          },
        };
      }),
  }),

  // ============================================================================
  // EXPORT (placeholder - would need file generation)
  // ============================================================================

  /**
   * Export leaderboard data
   */
  export: protectedProcedure
    .input(z.object({
      format: z.enum(["csv", "json"]),
      clientType: clientTypeSchema.optional().default("ALL"),
      includeMetrics: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      
      const result = await getLeaderboard({
        clientType: input.clientType,
        limit: 1000, // Get all for export
      }, userId);
      
      if (input.format === "json") {
        return {
          format: "json",
          data: result.clients,
          metadata: {
            exportedAt: new Date().toISOString(),
            totalClients: result.totalCount,
            clientType: input.clientType,
          },
        };
      }
      
      // CSV format
      const headers = [
        "Rank",
        "Client Name",
        "TERI Code",
        "Client Type",
        "Master Score",
        "Percentile",
        "Trend",
      ];
      
      if (input.includeMetrics) {
        headers.push(
          "YTD Revenue",
          "Lifetime Value",
          "Avg Order Value",
          "Order Frequency",
          "On-Time Payment Rate",
          "Credit Utilization"
        );
      }
      
      const rows = result.clients.map(client => {
        const row = [
          client.rank.toString(),
          client.clientName,
          client.teriCode,
          client.clientType,
          client.masterScore?.toFixed(2) ?? "N/A",
          client.percentile.toFixed(1) + "%",
          client.trend,
        ];
        
        if (input.includeMetrics) {
          row.push(
            client.metrics.ytd_revenue?.value?.toFixed(2) ?? "N/A",
            client.metrics.lifetime_value?.value?.toFixed(2) ?? "N/A",
            client.metrics.average_order_value?.value?.toFixed(2) ?? "N/A",
            client.metrics.order_frequency?.value?.toString() ?? "N/A",
            client.metrics.on_time_payment_rate?.value?.toFixed(1) ?? "N/A",
            client.metrics.credit_utilization?.value?.toFixed(1) ?? "N/A"
          );
        }
        
        return row;
      });
      
      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      
      return {
        format: "csv",
        data: csv,
        metadata: {
          exportedAt: new Date().toISOString(),
          totalClients: result.totalCount,
          clientType: input.clientType,
        },
      };
    }),
});

export type LeaderboardRouter = typeof leaderboardRouter;
