import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getRecentMetrics, getSlowQueryStats } from "../_core/performanceMiddleware";
import { getTrpcUsageSnapshot, getTrpcUsageSummary, resetTrpcUsage } from "../_core/usageTracker";

/**
 * Monitoring Router
 * 
 * Provides endpoints for viewing performance metrics and monitoring data
 * Only accessible to admin users
 */

export const monitoringRouter = router({
  /**
   * Get recent performance metrics
   * Returns the last 100 tRPC procedure executions with timing data
   */
  getRecentMetrics: adminProcedure.query(async () => {
    const metrics = getRecentMetrics();
    return {
      metrics,
      count: metrics.length,
    };
  }),

  /**
   * Get slow query statistics
   * Returns aggregated statistics about slow procedures
   */
  getSlowQueryStats: adminProcedure.query(async () => {
    return getSlowQueryStats();
  }),

  /**
   * Get performance summary
   * Returns a comprehensive overview of system performance
   */
  getPerformanceSummary: adminProcedure.query(async () => {
    const metrics = getRecentMetrics();
    const stats = getSlowQueryStats();
    
    // Group by procedure name
    const procedureStats = metrics.reduce((acc, metric) => {
      if (!acc[metric.procedure]) {
        acc[metric.procedure] = {
          count: 0,
          totalDuration: 0,
          errors: 0,
          slowCount: 0,
        };
      }
      
      acc[metric.procedure].count++;
      acc[metric.procedure].totalDuration += metric.duration;
      if (!metric.success) {
        acc[metric.procedure].errors++;
      }
      if (metric.duration > 1000) {
        acc[metric.procedure].slowCount++;
      }
      
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number; errors: number; slowCount: number }>);
    
    // Calculate averages and sort by slowest
    const procedureList = Object.entries(procedureStats)
      .map(([procedure, data]) => ({
        procedure,
        count: data.count,
        averageDuration: data.totalDuration / data.count,
        errorRate: (data.errors / data.count) * 100,
        slowRate: (data.slowCount / data.count) * 100,
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration);
    
    return {
      overview: stats,
      topSlowProcedures: procedureList.slice(0, 10),
      recentErrors: metrics.filter(m => !m.success).slice(-10),
    };
  }),

  /**
   * Get metrics for a specific procedure
   */
  getProcedureMetrics: adminProcedure
    .input(z.object({
      procedure: z.string(),
    }))
    .query(async ({ input }) => {
      const metrics = getRecentMetrics();
      const procedureMetrics = metrics.filter(m => m.procedure === input.procedure);
      
      if (procedureMetrics.length === 0) {
        return {
          procedure: input.procedure,
          metrics: [],
          stats: null,
        };
      }
      
      const totalDuration = procedureMetrics.reduce((sum, m) => sum + m.duration, 0);
      const errors = procedureMetrics.filter(m => !m.success).length;
      const slowCount = procedureMetrics.filter(m => m.duration > 1000).length;
      
      return {
        procedure: input.procedure,
        metrics: procedureMetrics,
        stats: {
          count: procedureMetrics.length,
          averageDuration: totalDuration / procedureMetrics.length,
          minDuration: Math.min(...procedureMetrics.map(m => m.duration)),
          maxDuration: Math.max(...procedureMetrics.map(m => m.duration)),
          errorRate: (errors / procedureMetrics.length) * 100,
          slowRate: (slowCount / procedureMetrics.length) * 100,
        },
      };
    }),

  /**
   * Get usage stats (what procedures are actually being called).
   *
   * This is the key building block for identifying unused endpoints and flows.
   * In-memory only (resets on deploy/restart), so you typically:
   * - reset
   * - use the app normally for a while
   * - review least-used / never-seen procedures
   */
  getUsageStats: adminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(500).optional(),
          sortBy: z.enum(["count", "lastSeen", "errorRate", "avgDuration"]).optional(),
          sortDirection: z.enum(["asc", "desc"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const opts = {
        limit: input?.limit ?? 200,
        sortBy: input?.sortBy ?? "count",
        sortDirection: input?.sortDirection ?? "desc",
      };
      const summary = getTrpcUsageSummary();
      const snapshot = getTrpcUsageSnapshot();

      const rows = snapshot.map((r) => {
        const avgDurationMs = r.count > 0 ? r.totalDurationMs / r.count : 0;
        const errorRatePercent = r.count > 0 ? (r.errorCount / r.count) * 100 : 0;
        return {
          ...r,
          avgDurationMs,
          errorRatePercent,
        };
      });

      const dir = opts.sortDirection === "asc" ? 1 : -1;
      const sorted = rows.sort((a, b) => {
        switch (opts.sortBy) {
          case "lastSeen":
            return (a.lastSeenAt.getTime() - b.lastSeenAt.getTime()) * dir;
          case "errorRate":
            return (a.errorRatePercent - b.errorRatePercent) * dir;
          case "avgDuration":
            return (a.avgDurationMs - b.avgDurationMs) * dir;
          case "count":
          default:
            return (a.count - b.count) * dir;
        }
      });

      return {
        summary,
        procedures: sorted.slice(0, opts.limit),
      };
    }),

  /**
   * Reset in-memory usage stats.
   * Useful to start a clean measurement window.
   */
  resetUsageStats: adminProcedure.mutation(async () => {
    return resetTrpcUsage();
  }),
});
