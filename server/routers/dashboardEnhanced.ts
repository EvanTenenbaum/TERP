import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as dashboardAnalytics from "../dashboardAnalytics";
import * as inventoryAlerts from "../inventoryAlerts";
import { requirePermission } from "../_core/permissionMiddleware";

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
  userId: z.number(),
});

/** Alert resolution input */
const resolveAlertInput = z.object({
  alertId: z.number(),
  resolution: z.string(),
  userId: z.number(),
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
  getDashboardData: publicProcedure
    .input(dateRangeInput)
    .query(async ({ input }): Promise<Awaited<ReturnType<typeof dashboardAnalytics.getDashboardData>>> => {
      return await dashboardAnalytics.getDashboardData(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Get sales performance metrics
  getSalesPerformance: publicProcedure
    .input(dateRangeInput)
    .query(async ({ input }): Promise<Awaited<ReturnType<typeof dashboardAnalytics.getSalesPerformance>>> => {
      return await dashboardAnalytics.getSalesPerformance(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Get AR aging report
  getARAgingReport: publicProcedure
    .query(async (): Promise<Awaited<ReturnType<typeof dashboardAnalytics.getARAgingReport>>> => {
      return await dashboardAnalytics.getARAgingReport();
    }),

  // Get inventory valuation
  getInventoryValuation: publicProcedure
    .query(async (): Promise<Awaited<ReturnType<typeof dashboardAnalytics.getInventoryValuation>>> => {
      return await dashboardAnalytics.getInventoryValuation();
    }),

  // Get top performing products
  getTopProducts: publicProcedure
    .input(dateRangeWithLimitInput)
    .query(async ({ input }): Promise<Awaited<ReturnType<typeof dashboardAnalytics.getTopPerformingProducts>>> => {
      return await dashboardAnalytics.getTopPerformingProducts(
        new Date(input.startDate),
        new Date(input.endDate),
        input.limit
      );
    }),

  // Get top clients
  getTopClients: publicProcedure
    .input(dateRangeWithLimitInput)
    .query(async ({ input }): Promise<Awaited<ReturnType<typeof dashboardAnalytics.getTopClients>>> => {
      return await dashboardAnalytics.getTopClients(
        new Date(input.startDate),
        new Date(input.endDate),
        input.limit
      );
    }),

  // Get profitability metrics
  getProfitabilityMetrics: publicProcedure
    .input(dateRangeInput)
    .query(async ({ input }): Promise<Awaited<ReturnType<typeof dashboardAnalytics.getProfitabilityMetrics>>> => {
      return await dashboardAnalytics.getProfitabilityMetrics(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Export dashboard data
  exportData: publicProcedure
    .input(exportInput)
    .query(async ({ input }): Promise<Awaited<ReturnType<typeof dashboardAnalytics.exportDashboardData>>> => {
      return await dashboardAnalytics.exportDashboardData(
        new Date(input.startDate),
        new Date(input.endDate),
        input.format
      );
    }),

  // Inventory Alerts
  generateAlerts: publicProcedure
    .mutation(async (): Promise<SuccessResponse> => {
      await inventoryAlerts.generateInventoryAlerts();
      return { success: true };
    }),

  getActiveAlerts: publicProcedure
    .query(async (): Promise<Awaited<ReturnType<typeof inventoryAlerts.getActiveInventoryAlerts>>> => {
      return await inventoryAlerts.getActiveInventoryAlerts();
    }),

  getAlertSummary: publicProcedure
    .query(async (): Promise<Awaited<ReturnType<typeof inventoryAlerts.getAlertSummary>>> => {
      return await inventoryAlerts.getAlertSummary();
    }),

  acknowledgeAlert: publicProcedure
    .input(acknowledgeAlertInput)
    .mutation(async ({ input }): Promise<SuccessResponse> => {
      await inventoryAlerts.acknowledgeAlert(input.alertId, input.userId);
      return { success: true };
    }),

  resolveAlert: publicProcedure
    .input(resolveAlertInput)
    .mutation(async ({ input }): Promise<SuccessResponse> => {
      await inventoryAlerts.resolveAlert(input.alertId, input.resolution, input.userId);
      return { success: true };
    }),
});

