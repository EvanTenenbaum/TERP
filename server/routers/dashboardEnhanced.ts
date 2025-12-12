import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as dashboardAnalytics from "../dashboardAnalytics";
import * as inventoryAlerts from "../inventoryAlerts";
import { requirePermission } from "../_core/permissionMiddleware";

export const dashboardEnhancedRouter = router({
  // Get comprehensive dashboard data
  getDashboardData: publicProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ input }) => {
      return await dashboardAnalytics.getDashboardData(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Get sales performance metrics
  getSalesPerformance: publicProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ input }) => {
      return await dashboardAnalytics.getSalesPerformance(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Get AR aging report
  getARAgingReport: publicProcedure
    .query(async () => {
      return await dashboardAnalytics.getARAgingReport();
    }),

  // Get inventory valuation
  getInventoryValuation: publicProcedure
    .query(async () => {
      return await dashboardAnalytics.getInventoryValuation();
    }),

  // Get top performing products
  getTopProducts: publicProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      limit: z.number().optional()
    }))
    .query(async ({ input }) => {
      return await dashboardAnalytics.getTopPerformingProducts(
        new Date(input.startDate),
        new Date(input.endDate),
        input.limit
      );
    }),

  // Get top clients
  getTopClients: publicProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      limit: z.number().optional()
    }))
    .query(async ({ input }) => {
      return await dashboardAnalytics.getTopClients(
        new Date(input.startDate),
        new Date(input.endDate),
        input.limit
      );
    }),

  // Get profitability metrics
  getProfitabilityMetrics: publicProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ input }) => {
      return await dashboardAnalytics.getProfitabilityMetrics(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Export dashboard data
  exportData: publicProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      format: z.enum(["csv", "json"]).optional()
    }))
    .query(async ({ input }) => {
      return await dashboardAnalytics.exportDashboardData(
        new Date(input.startDate),
        new Date(input.endDate),
        input.format
      );
    }),

  // Inventory Alerts
  generateAlerts: publicProcedure
    .mutation(async () => {
      await inventoryAlerts.generateInventoryAlerts();
      return { success: true };
    }),

  getActiveAlerts: publicProcedure
    .query(async () => {
      return await inventoryAlerts.getActiveInventoryAlerts();
    }),

  getAlertSummary: publicProcedure
    .query(async () => {
      return await inventoryAlerts.getAlertSummary();
    }),

  acknowledgeAlert: publicProcedure
    .input(z.object({
      alertId: z.number(),
      userId: z.number()
    }))
    .mutation(async ({ input }) => {
      await inventoryAlerts.acknowledgeAlert(input.alertId, input.userId);
      return { success: true };
    }),

  resolveAlert: publicProcedure
    .input(z.object({
      alertId: z.number(),
      resolution: z.string(),
      userId: z.number()
    }))
    .mutation(async ({ input }) => {
      await inventoryAlerts.resolveAlert(input.alertId, input.resolution, input.userId);
      return { success: true };
    }),
});

