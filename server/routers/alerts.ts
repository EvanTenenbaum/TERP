/**
 * WS-008: Alerts Router
 * Sprint 4 Track A: 4.A.7 - Enhanced Low Stock & Needs-Based Alerts
 *
 * Features:
 * - LOW_STOCK, CRITICAL_STOCK, OUT_OF_STOCK alerts from batch data
 * - Configurable global thresholds
 * - Client needs alerts
 * - Alert acknowledgment
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure, vipPortalProcedure } from "../_core/trpc";
import { db } from "../db";
import { clients, clientNeeds, batches, products, lots, vendors, brands } from "../../drizzle/schema";
import { eq, desc, sql, and, gt, ne } from "drizzle-orm";

// Default thresholds for stock alerts
const DEFAULT_THRESHOLDS = {
  lowStock: 50,
  criticalStock: 10,
  outOfStock: 0,
};

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
   * List alerts with pagination
   * BUG-034: Standardized .list procedure for API consistency
   */
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(1000).optional().default(50),
        offset: z.number().min(0).optional().default(0),
        type: alertTypeEnum.optional(),
        acknowledged: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

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

      // Get client needs alerts (status=ACTIVE is the pending state)
      if (!input?.type || input.type === "CLIENT_NEED") {
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
          .limit(limit + offset);

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

      // Apply pagination
      const total = alerts.length;
      const paginatedAlerts = alerts.slice(offset, offset + limit);

      return {
        data: paginatedAlerts,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    }),

  /**
   * Get all active alerts
   * Sprint 4 Track A: 4.A.7 WS-008 - Now includes low stock alerts from batch data
   */
  getAll: adminProcedure
    .input(
      z.object({
        type: alertTypeEnum.optional(),
        acknowledged: z.boolean().optional(),
        limit: z.number().default(50),
        lowStockThreshold: z.number().default(DEFAULT_THRESHOLDS.lowStock),
        criticalStockThreshold: z.number().default(DEFAULT_THRESHOLDS.criticalStock),
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
        metadata?: Record<string, unknown>;
      }> = [];

      // LOW_STOCK alerts from live batches
      if (!input.type || input.type === "LOW_STOCK" || input.type === "OUT_OF_STOCK") {
        const batchData = await db
          .select({
            id: batches.id,
            sku: batches.sku,
            code: batches.code,
            productName: products.nameCanonical,
            category: products.category,
            onHandQty: batches.onHandQty,
            reservedQty: batches.reservedQty,
            quarantineQty: batches.quarantineQty,
            holdQty: batches.holdQty,
            createdAt: batches.createdAt,
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
          .where(eq(batches.batchStatus, "LIVE"))
          .limit(100);

        for (const batch of batchData) {
          const onHand = parseFloat(batch.onHandQty || "0");
          const reserved = parseFloat(batch.reservedQty || "0");
          const quarantine = parseFloat(batch.quarantineQty || "0");
          const hold = parseFloat(batch.holdQty || "0");
          const available = Math.max(0, onHand - reserved - quarantine - hold);

          let shouldInclude = false;
          let alertType = "";
          let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
          let title = "";

          if (available <= 0) {
            if (!input.type || input.type === "OUT_OF_STOCK") {
              shouldInclude = true;
              alertType = "OUT_OF_STOCK";
              severity = "CRITICAL";
              title = "Out of Stock";
            }
          } else if (available <= input.criticalStockThreshold) {
            if (!input.type || input.type === "LOW_STOCK") {
              shouldInclude = true;
              alertType = "LOW_STOCK";
              severity = "HIGH";
              title = "Critical Stock";
            }
          } else if (available <= input.lowStockThreshold) {
            if (!input.type || input.type === "LOW_STOCK") {
              shouldInclude = true;
              alertType = "LOW_STOCK";
              severity = "MEDIUM";
              title = "Low Stock";
            }
          }

          if (shouldInclude) {
            alerts.push({
              id: `${alertType}-${batch.id}`,
              type: alertType,
              title: `${title}: ${batch.productName || batch.sku}`,
              description: `${available.toFixed(0)} units available (${batch.sku})`,
              severity,
              entityType: "batch",
              entityId: batch.id,
              createdAt: batch.createdAt || new Date(),
              metadata: {
                sku: batch.sku,
                code: batch.code,
                category: batch.category,
                available,
                onHand,
              },
            });
          }
        }
      }

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

      // Sort by severity
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      return alerts.slice(0, input.limit);
    }),

  /**
   * Get low stock products
   * Sprint 4 Track A: 4.A.7 WS-008 - Uses batch data with configurable thresholds
   */
  getLowStock: adminProcedure
    .input(
      z.object({
        includeOutOfStock: z.boolean().default(true),
        lowStockThreshold: z.number().default(DEFAULT_THRESHOLDS.lowStock),
        criticalStockThreshold: z.number().default(DEFAULT_THRESHOLDS.criticalStock),
        category: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      // Get all live batches with their stock levels
      const batchData = await db
        .select({
          id: batches.id,
          sku: batches.sku,
          code: batches.code,
          productId: batches.productId,
          productName: products.nameCanonical,
          category: products.category,
          vendorName: vendors.name,
          brandName: brands.name,
          onHandQty: batches.onHandQty,
          reservedQty: batches.reservedQty,
          quarantineQty: batches.quarantineQty,
          holdQty: batches.holdQty,
          batchStatus: batches.batchStatus,
        })
        .from(batches)
        .leftJoin(products, eq(batches.productId, products.id))
        .leftJoin(lots, eq(batches.lotId, lots.id))
        .leftJoin(vendors, eq(lots.vendorId, vendors.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(
          and(
            eq(batches.batchStatus, "LIVE"),
            input.category ? eq(products.category, input.category) : undefined
          )
        )
        .limit(500);

      const lowStockItems: Array<{
        id: number;
        sku: string;
        code: string;
        productName: string;
        category: string | null;
        vendorName: string | null;
        brandName: string | null;
        onHand: number;
        available: number;
        stockStatus: "LOW_STOCK" | "CRITICAL_STOCK" | "OUT_OF_STOCK";
        severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      }> = [];

      for (const batch of batchData) {
        const onHand = parseFloat(batch.onHandQty || "0");
        const reserved = parseFloat(batch.reservedQty || "0");
        const quarantine = parseFloat(batch.quarantineQty || "0");
        const hold = parseFloat(batch.holdQty || "0");
        const available = Math.max(0, onHand - reserved - quarantine - hold);

        let stockStatus: "LOW_STOCK" | "CRITICAL_STOCK" | "OUT_OF_STOCK" | null = null;
        let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

        if (available <= 0 && input.includeOutOfStock) {
          stockStatus = "OUT_OF_STOCK";
          severity = "CRITICAL";
        } else if (available <= input.criticalStockThreshold) {
          stockStatus = "CRITICAL_STOCK";
          severity = "HIGH";
        } else if (available <= input.lowStockThreshold) {
          stockStatus = "LOW_STOCK";
          severity = "MEDIUM";
        }

        if (stockStatus) {
          lowStockItems.push({
            id: batch.id,
            sku: batch.sku,
            code: batch.code,
            productName: batch.productName || "Unknown",
            category: batch.category,
            vendorName: batch.vendorName,
            brandName: batch.brandName,
            onHand,
            available,
            stockStatus,
            severity,
          });
        }
      }

      // Sort by severity (most critical first)
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      lowStockItems.sort((a, b) =>
        severityOrder[a.severity] - severityOrder[b.severity] || a.available - b.available
      );

      return lowStockItems.slice(0, input.limit);
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
   * Sprint 4 Track A: 4.A.7 WS-008 - Now includes real stock alert counts
   */
  getStats: adminProcedure
    .input(
      z.object({
        lowStockThreshold: z.number().default(DEFAULT_THRESHOLDS.lowStock),
        criticalStockThreshold: z.number().default(DEFAULT_THRESHOLDS.criticalStock),
      }).optional()
    )
    .query(async ({ input }) => {
      const lowStockThreshold = input?.lowStockThreshold ?? DEFAULT_THRESHOLDS.lowStock;
      const criticalStockThreshold = input?.criticalStockThreshold ?? DEFAULT_THRESHOLDS.criticalStock;

      // Count active client needs (ACTIVE is the pending state)
      const activeNeedsCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(clientNeeds)
        .where(eq(clientNeeds.status, "ACTIVE"));

      // Get all live batches and calculate stock stats
      const liveBatches = await db
        .select({
          onHandQty: batches.onHandQty,
          reservedQty: batches.reservedQty,
          quarantineQty: batches.quarantineQty,
          holdQty: batches.holdQty,
        })
        .from(batches)
        .where(eq(batches.batchStatus, "LIVE"));

      let outOfStockCount = 0;
      let criticalStockCount = 0;
      let lowStockCount = 0;

      for (const batch of liveBatches) {
        const onHand = parseFloat(batch.onHandQty || "0");
        const reserved = parseFloat(batch.reservedQty || "0");
        const quarantine = parseFloat(batch.quarantineQty || "0");
        const hold = parseFloat(batch.holdQty || "0");
        const available = Math.max(0, onHand - reserved - quarantine - hold);

        if (available <= 0) {
          outOfStockCount++;
        } else if (available <= criticalStockThreshold) {
          criticalStockCount++;
        } else if (available <= lowStockThreshold) {
          lowStockCount++;
        }
      }

      const needsCount = Number(activeNeedsCount[0]?.count || 0);

      return {
        lowStockCount,
        criticalStockCount,
        outOfStockCount,
        pendingNeedsCount: needsCount,
        totalAlerts: lowStockCount + criticalStockCount + outOfStockCount + needsCount,
        thresholds: {
          lowStock: lowStockThreshold,
          criticalStock: criticalStockThreshold,
        },
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
