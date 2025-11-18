import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getRecentMetrics, getSlowQueryStats } from "../_core/performanceMiddleware";

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
});
