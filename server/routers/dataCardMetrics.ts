/**
 * Data Card Metrics tRPC Router
 * Provides API endpoints for fetching metric data for data cards
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as metricsDb from "../dataCardMetricsDb";
import { handleError } from "../_core/errors";
import { requirePermission } from "../_core/permissionMiddleware";

const moduleIdSchema = z.enum([
  'inventory',
  'quotes',
  'orders',
  'accounting',
  'vendor_supply',
  'clients'
]);

const metricIdSchema = z.string().regex(/^[a-z_]+$/);

export const dataCardMetricsRouter = router({
  /**
   * Get metrics for a specific module
   * Returns calculated metric values for the requested metric IDs
   */
  getForModule: protectedProcedure
    .input(z.object({
      moduleId: moduleIdSchema,
      metricIds: z.array(metricIdSchema).min(1).max(10),
    }))
    .query(async ({ input }) => {
      try {
        // Validate metric IDs are valid for this module
        const validIds = metricsDb.getValidMetricIds(input.moduleId);
        const invalidIds = input.metricIds.filter(id => !validIds.includes(id));
        
        if (invalidIds.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid metric IDs for ${input.moduleId}: ${invalidIds.join(', ')}`,
          });
        }
        
        // Fetch all metrics in a single optimized query
        const metrics = await metricsDb.calculateMetrics(input.moduleId, input.metricIds);
        
        return metrics;
      } catch (error) {
        handleError(error, "dataCardMetrics.getForModule");
        throw error; // Re-throw to send error response to client
      }
    }),
  
  /**
   * Get all available metric definitions for a module
   * Used for configuration UI to show available options
   */
  getAvailableMetrics: protectedProcedure
    .input(z.object({
      moduleId: moduleIdSchema,
    }))
    .query(async ({ input }) => {
      try {
        const definitions = metricsDb.getMetricDefinitions(input.moduleId);
        const validIds = metricsDb.getValidMetricIds(input.moduleId);
        
        return {
          moduleId: input.moduleId,
          availableMetricIds: validIds,
          definitions,
        };
      } catch (error) {
        handleError(error, "dataCardMetrics.getAvailableMetrics");
        throw error; // Re-throw to send error response to client
      }
    }),
});
