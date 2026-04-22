/**
 * VIP Alerts Router (TER-1231)
 * Manages VIP price alert signals for sales team
 */

import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import {
  getVipAlertStats,
  getTriggeredVipAlerts,
  dismissVipAlert,
} from "../services/vipAlertService";
import { TRPCError } from "@trpc/server";

export const vipAlertsRouter = router({
  /**
   * Get all triggered VIP alerts for the alerts panel
   */
  list: adminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional().default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const limit = input?.limit ?? 50;
        const alerts = await getTriggeredVipAlerts(limit);
        return {
          data: alerts,
          total: alerts.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch VIP alerts",
          cause: error,
        });
      }
    }),

  /**
   * Get VIP alert stats for badges
   */
  getStats: adminProcedure.query(async () => {
    try {
      return await getVipAlertStats();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch VIP alert stats",
        cause: error,
      });
    }
  }),

  /**
   * Dismiss a VIP alert
   */
  dismiss: adminProcedure
    .input(
      z.object({
        alertId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const success = await dismissVipAlert(input.alertId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to dismiss alert",
          });
        }
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to dismiss VIP alert",
          cause: error,
        });
      }
    }),
});
