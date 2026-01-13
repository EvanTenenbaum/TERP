/**
 * Cash Audit Router
 * API endpoints for cash audit system including:
 * - Dashboard cash overview (MEET-001)
 * - Multi-location cash tracking (MEET-002)
 * - In/Out ledger management (MEET-003)
 * - Shift payment tracking (MEET-004)
 *
 * Feature: FEAT-007 Cash Audit System
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  cashLocations,
  bills,
  users,
} from "../../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logger } from "../_core/logger";

// ============================================================================
// MEET-001: Dashboard Available Money API
// ============================================================================

export const cashAuditRouter = router({
  /**
   * Get cash dashboard summary
   * Returns total cash on hand, scheduled payables, and available cash
   */
  getCashDashboard: protectedProcedure
    .use(requirePermission("accounting:read"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({ msg: "[CashAudit] Getting cash dashboard summary" });

      // Get total cash on hand from all active cash locations
      const cashOnHandResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${cashLocations.currentBalance} AS DECIMAL(15,2))), 0)`,
        })
        .from(cashLocations)
        .where(eq(cashLocations.isActive, true));

      const totalCashOnHand = Number(cashOnHandResult[0]?.total || 0);

      // Get scheduled payables (upcoming bills that are pending/partial)
      const todayStr = new Date().toISOString().split("T")[0];
      const scheduledPayablesResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${bills.amountDue} AS DECIMAL(15,2))), 0)`,
        })
        .from(bills)
        .where(
          and(
            inArray(bills.status, ["PENDING", "PARTIAL", "APPROVED"]),
            sql`${bills.deletedAt} IS NULL`,
            sql`CAST(${bills.amountDue} AS DECIMAL(15,2)) > 0`
          )
        );

      const scheduledPayables = Number(scheduledPayablesResult[0]?.total || 0);

      // Calculate available cash
      const availableCash = totalCashOnHand - scheduledPayables;

      return {
        totalCashOnHand,
        scheduledPayables,
        availableCash,
        lastUpdated: new Date(),
      };
    }),
});
