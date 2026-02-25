import { z } from "zod";
import {
  protectedProcedure,
  router,
  getAuthenticatedUserId,
} from "../_core/trpc";
import * as dashboardAnalytics from "../dashboardAnalytics";
import * as inventoryAlerts from "../inventoryAlerts";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Date range input for dashboard queries */
const dateRangeInput = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

/** Date range with optional limit */
const dateRangeWithLimitInput = z.object({
  startDate: z.string(),
  endDate: z.string(),
  limit: z.number().optional(),
});

/** Export format input */
const exportInput = z.object({
  startDate: z.string(),
  endDate: z.string(),
  format: z.enum(["csv", "json"]).optional(),
});

/** Alert acknowledgement input */
const acknowledgeAlertInput = z.object({
  alertId: z.number(),
});

/** Alert resolution input */
const resolveAlertInput = z.object({
  alertId: z.number(),
  resolution: z.string(),
});

/** Success response type */
interface SuccessResponse {
  success: boolean;
}

// ============================================================================
// ROUTER
// ============================================================================

export const dashboardEnhancedRouter = router({
  // Get comprehensive dashboard data
  getDashboardData: protectedProcedure
    .input(dateRangeInput)
    .query(
      async ({
        input,
      }): Promise<
        Awaited<ReturnType<typeof dashboardAnalytics.getDashboardData>>
      > => {
        return await dashboardAnalytics.getDashboardData(
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }
    ),

  // Get sales performance metrics
  getSalesPerformance: protectedProcedure
    .input(dateRangeInput)
    .query(
      async ({
        input,
      }): Promise<
        Awaited<ReturnType<typeof dashboardAnalytics.getSalesPerformance>>
      > => {
        return await dashboardAnalytics.getSalesPerformance(
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }
    ),

  // Get AR aging report
  getARAgingReport: protectedProcedure.query(
    async (): Promise<
      Awaited<ReturnType<typeof dashboardAnalytics.getARAgingReport>>
    > => {
      return await dashboardAnalytics.getARAgingReport();
    }
  ),

  // Get inventory valuation
  getInventoryValuation: protectedProcedure.query(
    async (): Promise<
      Awaited<ReturnType<typeof dashboardAnalytics.getInventoryValuation>>
    > => {
      return await dashboardAnalytics.getInventoryValuation();
    }
  ),

  // Get top performing products
  getTopProducts: protectedProcedure
    .input(dateRangeWithLimitInput)
    .query(
      async ({
        input,
      }): Promise<
        Awaited<ReturnType<typeof dashboardAnalytics.getTopPerformingProducts>>
      > => {
        return await dashboardAnalytics.getTopPerformingProducts(
          new Date(input.startDate),
          new Date(input.endDate),
          input.limit
        );
      }
    ),

  // Get top clients
  getTopClients: protectedProcedure
    .input(dateRangeWithLimitInput)
    .query(
      async ({
        input,
      }): Promise<
        Awaited<ReturnType<typeof dashboardAnalytics.getTopClients>>
      > => {
        return await dashboardAnalytics.getTopClients(
          new Date(input.startDate),
          new Date(input.endDate),
          input.limit
        );
      }
    ),

  // Get profitability metrics
  getProfitabilityMetrics: protectedProcedure
    .input(dateRangeInput)
    .query(
      async ({
        input,
      }): Promise<
        Awaited<ReturnType<typeof dashboardAnalytics.getProfitabilityMetrics>>
      > => {
        return await dashboardAnalytics.getProfitabilityMetrics(
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }
    ),

  // Export dashboard data
  exportData: protectedProcedure
    .input(exportInput)
    .query(
      async ({
        input,
      }): Promise<
        Awaited<ReturnType<typeof dashboardAnalytics.exportDashboardData>>
      > => {
        return await dashboardAnalytics.exportDashboardData(
          new Date(input.startDate),
          new Date(input.endDate),
          input.format
        );
      }
    ),

  // Inventory Alerts
  generateAlerts: protectedProcedure.mutation(
    async (): Promise<SuccessResponse> => {
      await inventoryAlerts.generateInventoryAlerts();
      return { success: true };
    }
  ),

  getActiveAlerts: protectedProcedure.query(
    async (): Promise<
      Awaited<ReturnType<typeof inventoryAlerts.getActiveInventoryAlerts>>
    > => {
      return await inventoryAlerts.getActiveInventoryAlerts();
    }
  ),

  getAlertSummary: protectedProcedure.query(
    async (): Promise<
      Awaited<ReturnType<typeof inventoryAlerts.getAlertSummary>>
    > => {
      return await inventoryAlerts.getAlertSummary();
    }
  ),

  acknowledgeAlert: protectedProcedure
    .input(acknowledgeAlertInput)
    .mutation(async ({ input, ctx }): Promise<SuccessResponse> => {
      const userId = getAuthenticatedUserId(ctx);
      await inventoryAlerts.acknowledgeAlert(input.alertId, userId);
      return { success: true };
    }),

  resolveAlert: protectedProcedure
    .input(resolveAlertInput)
    .mutation(async ({ input, ctx }): Promise<SuccessResponse> => {
      const userId = getAuthenticatedUserId(ctx);
      await inventoryAlerts.resolveAlert(
        input.alertId,
        input.resolution,
        userId
      );
      return { success: true };
    }),
});
