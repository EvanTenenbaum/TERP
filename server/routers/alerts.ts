/**
 * WS-008: Alerts Router
 * Handles low stock alerts and needs-based notifications
 *
 * NOTE: Low stock threshold features are disabled until schema is extended
 * with minStockLevel and targetStockLevel columns on products table.
 */

import { z } from "zod";
import { router, adminProcedure, vipPortalProcedure } from "../_core/trpc";
import { db } from "../db";
import { clients, clientNeeds } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

// Alert type enum
const alertTypeEnum = z.enum([
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "CLIENT_NEED",
  "VENDOR_HARVEST",
  "PENDING_VALUATION",
]);

export const alertsRouter = router({
  /**
   * Get all active alerts
   * NOTE: LOW_STOCK alerts disabled until schema supports stock thresholds
   */
  getAll: adminProcedure
    .input(
      z.object({
        type: alertTypeEnum.optional(),
        acknowledged: z.boolean().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const alerts: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        entityType: string;
        entityId: number;
        createdAt: Date;
        acknowledgedAt?: Date;
        acknowledgedBy?: number;
      }> = [];

      // LOW_STOCK alerts disabled - requires minStockLevel/targetStockLevel on products
      // These columns don't exist in the current schema

      // Get client needs alerts (status=ACTIVE is the pending state)
      if (!input.type || input.type === "CLIENT_NEED") {
        const activeNeeds = await db
          .select({
            id: clientNeeds.id,
            clientId: clientNeeds.clientId,
            clientName: clients.name,
            category: clientNeeds.category,
            productName: clientNeeds.productName,
            strain: clientNeeds.strain,
            quantityMin: clientNeeds.quantityMin,
            quantityMax: clientNeeds.quantityMax,
            createdAt: clientNeeds.createdAt,
          })
          .from(clientNeeds)
          .leftJoin(clients, eq(clientNeeds.clientId, clients.id))
          .where(eq(clientNeeds.status, "ACTIVE"))
          .orderBy(desc(clientNeeds.createdAt))
          .limit(20);

        for (const need of activeNeeds) {
          const qtyDisplay =
            need.quantityMin && need.quantityMax
              ? `${need.quantityMin}-${need.quantityMax}`
              : need.quantityMin || need.quantityMax || "TBD";
          const itemDisplay =
            need.strain || need.productName || need.category || "Item";

          alerts.push({
            id: `CLIENT_NEED-${need.id}`,
            type: "CLIENT_NEED",
            title: `Client Need: ${need.clientName}`,
            description: `${itemDisplay} - ${qtyDisplay}`,
            severity: "MEDIUM",
            entityType: "clientNeed",
            entityId: need.id,
            createdAt: need.createdAt || new Date(),
          });
        }
      }

      return alerts.slice(0, input.limit);
    }),

  /**
   * Get low stock products
   * NOTE: Disabled - requires minStockLevel/targetStockLevel columns on products
   */
  getLowStock: adminProcedure
    .input(
      z.object({
        includeOutOfStock: z.boolean().default(true),
      })
    )
    .query(async () => {
      // Feature disabled: products table doesn't have minStockLevel/targetStockLevel
      // Return empty array until schema is extended
      return [];
    }),

  /**
   * Set stock alert thresholds for a product
   * NOTE: Disabled - requires minStockLevel/targetStockLevel columns on products
   */
  setThresholds: adminProcedure
    .input(
      z.object({
        productId: z.number(),
        minStockLevel: z.number(),
        targetStockLevel: z.number(),
      })
    )
    .mutation(async () => {
      // Feature disabled: products table doesn't have minStockLevel/targetStockLevel
      // Would need schema migration to add these columns
      return {
        success: false,
        message:
          "Stock thresholds not supported - schema needs minStockLevel/targetStockLevel columns",
      };
    }),

  /**
   * Acknowledge an alert
   */
  acknowledge: adminProcedure
    .input(
      z.object({
        alertId: z.string(),
      })
    )
    .mutation(async ({ ctx }) => {
      // For now, just return success
      // In a full implementation, this would store acknowledgment in a table
      return {
        success: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: ctx.user.id,
      };
    }),

  /**
   * Get alert stats for dashboard
   */
  getStats: adminProcedure.query(async () => {
    // Count active client needs (ACTIVE is the pending state)
    const activeNeedsCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(clientNeeds)
      .where(eq(clientNeeds.status, "ACTIVE"));

    return {
      lowStockCount: 0, // Disabled - schema doesn't support stock thresholds
      outOfStockCount: 0, // Disabled - schema doesn't support stock thresholds
      pendingNeedsCount: activeNeedsCount[0]?.count || 0,
      totalAlerts: activeNeedsCount[0]?.count || 0,
    };
  }),

  /**
   * Get needs for VIP portal
   * SEC-009: Protected with VIP portal authentication to prevent public exposure
   */
  getNeedsForVipPortal: vipPortalProcedure.query(async ({ ctx }) => {
    // Only return needs for the authenticated VIP client
    const clientId = ctx.clientId;
    const needs = await db
      .select({
        id: clientNeeds.id,
        category: clientNeeds.category,
        productName: clientNeeds.productName,
        strain: clientNeeds.strain,
        quantityMin: clientNeeds.quantityMin,
        quantityMax: clientNeeds.quantityMax,
        notes: clientNeeds.notes,
      })
      .from(clientNeeds)
      .leftJoin(clients, eq(clientNeeds.clientId, clients.id))
      .where(eq(clientNeeds.clientId, clientId))
      .orderBy(desc(clientNeeds.createdAt));

    // Aggregate by product/strain
    const aggregated = new Map<
      string,
      {
        productType: string;
        strain: string | null;
        totalQuantity: number;
        requestCount: number;
        vipRequests: number;
      }
    >();

    for (const need of needs) {
      const productType = need.category || need.productName || "Unknown";
      const key = `${productType}-${need.strain || "any"}`;
      const existing = aggregated.get(key);
      const qtyMin = parseFloat((need.quantityMin as string) || "0");

      if (existing) {
        existing.totalQuantity += qtyMin;
        existing.requestCount++;
      } else {
        aggregated.set(key, {
          productType,
          strain: need.strain,
          totalQuantity: qtyMin,
          requestCount: 1,
          vipRequests: 0, // VIP detection not available - clients.tier doesn't exist
        });
      }
    }

    return Array.from(aggregated.values()).sort(
      (a, b) => b.vipRequests - a.vipRequests || b.requestCount - a.requestCount
    );
  }),
});
