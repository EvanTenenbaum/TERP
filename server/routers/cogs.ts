import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getCurrentUserId } from "../_core/authHelpers";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { batches, orders, auditLogs } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

/**
 * COGS Router - Cost of Goods Sold Management
 * Implements COGS calculation, tracking, and reporting
 */
export const cogsRouter = router({
  /**
   * Get COGS summary for a period
   * Returns total COGS, revenue, gross profit, and margin
   */
  getCOGS: protectedProcedure
    .use(requirePermission("cogs:read"))
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        batchId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { startDate, endDate, batchId } = input;

      // Build date filters
      const dateFilters = [];
      if (startDate) {
        dateFilters.push(gte(orders.createdAt, startDate));
      }
      if (endDate) {
        dateFilters.push(lte(orders.createdAt, endDate));
      }

      // Query completed orders for COGS data
      const completedOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.saleStatus, "PAID"),
          ...dateFilters
        ),
      });

      // Calculate totals from orders
      let totalCOGS = 0;
      let totalRevenue = 0;
      let totalQuantity = 0;
      let orderCount = 0;

      for (const order of completedOrders) {
        // Parse items from JSON
        const items = typeof order.items === "string" 
          ? JSON.parse(order.items) 
          : order.items;

        if (!Array.isArray(items)) continue;

        // Filter by batchId if specified
        const relevantItems = batchId 
          ? items.filter((item: { batchId: number }) => item.batchId === batchId)
          : items;

        if (relevantItems.length === 0) continue;

        orderCount++;
        for (const item of relevantItems) {
          const qty = item.quantity ?? 0;
          const unitCogs = item.unitCogs ?? 0;
          const unitPrice = item.unitPrice ?? 0;

          totalQuantity += qty;
          totalCOGS += qty * unitCogs;
          totalRevenue += qty * unitPrice;
        }
      }

      const grossProfit = totalRevenue - totalCOGS;
      const grossMargin = totalRevenue > 0 
        ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 
        : 0;

      return {
        totalCOGS,
        totalRevenue,
        totalQuantity,
        orderCount,
        grossProfit,
        grossMargin: Math.round(grossMargin * 100) / 100,
        period: {
          startDate: startDate?.toISOString() ?? null,
          endDate: endDate?.toISOString() ?? null,
        },
      };
    }),

  /**
   * Calculate COGS impact for a batch cost change
   * Shows what would happen if COGS is updated
   */
  calculateImpact: protectedProcedure
    .use(requirePermission("cogs:read"))
    .input(
      z.object({
        batchId: z.number(),
        newCogs: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { batchId, newCogs } = input;
      const newCogsNum = parseFloat(newCogs);

      if (isNaN(newCogsNum) || newCogsNum < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid COGS value",
        });
      }

      // Get current batch
      const batch = await db.query.batches.findFirst({
        where: eq(batches.id, batchId),
      });

      if (!batch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Batch ${batchId} not found`,
        });
      }

      const currentCogs = parseFloat(batch.unitCogs ?? "0");
      const cogsChange = newCogsNum - currentCogs;

      // Find pending orders with this batch
      const pendingOrders = await db.query.orders.findMany({
        where: eq(orders.saleStatus, "PENDING"),
      });

      let affectedOrderCount = 0;
      let totalQuantityAffected = 0;
      let totalImpact = 0;

      for (const order of pendingOrders) {
        const items = typeof order.items === "string" 
          ? JSON.parse(order.items) 
          : order.items;

        if (!Array.isArray(items)) continue;

        const batchItems = items.filter(
          (item: { batchId: number }) => item.batchId === batchId
        );

        if (batchItems.length > 0) {
          affectedOrderCount++;
          for (const item of batchItems) {
            const qty = item.quantity ?? 0;
            totalQuantityAffected += qty;
            totalImpact += qty * cogsChange;
          }
        }
      }

      return {
        batchId,
        currentCogs,
        newCogs: newCogsNum,
        cogsChange,
        affectedOrderCount,
        totalQuantityAffected,
        totalImpact,
        impactDescription: totalImpact > 0 
          ? `COGS will increase by $${totalImpact.toFixed(2)} across ${affectedOrderCount} pending orders`
          : totalImpact < 0
          ? `COGS will decrease by $${Math.abs(totalImpact).toFixed(2)} across ${affectedOrderCount} pending orders`
          : "No impact on pending orders",
      };
    }),

  /**
   * Update batch COGS with audit trail
   */
  updateBatchCogs: protectedProcedure
    .use(requirePermission("cogs:update"))
    .input(
      z.object({
        batchId: z.number(),
        newCogs: z.string(),
        applyTo: z.enum(["PAST_SALES", "FUTURE_SALES", "BOTH"]),
        reason: z.string().min(1, "Reason is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getCurrentUserId(ctx);
      const { batchId, newCogs, applyTo, reason } = input;
      const newCogsNum = parseFloat(newCogs);

      if (isNaN(newCogsNum) || newCogsNum < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid COGS value",
        });
      }

      // Get current batch
      const batch = await db.query.batches.findFirst({
        where: eq(batches.id, batchId),
      });

      if (!batch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Batch ${batchId} not found`,
        });
      }

      const oldCogs = parseFloat(batch.unitCogs ?? "0");

      // Update batch COGS
      await db
        .update(batches)
        .set({
          unitCogs: newCogs,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batchId));

      // Create audit record using auditLogs table
      await db.insert(auditLogs).values({
        actorId: userId,
        action: "COGS_UPDATE",
        entity: "batch",
        entityId: batchId,
        before: JSON.stringify({ unitCogs: oldCogs.toString() }),
        after: JSON.stringify({
          unitCogs: newCogs,
          applyTo,
        }),
        reason,
      });

      // If applying to future sales or both, update pending orders
      if (applyTo === "FUTURE_SALES" || applyTo === "BOTH") {
        const pendingOrders = await db.query.orders.findMany({
          where: eq(orders.saleStatus, "PENDING"),
        });

        for (const order of pendingOrders) {
          const items = typeof order.items === "string" 
            ? JSON.parse(order.items) 
            : order.items;

          if (!Array.isArray(items)) continue;

          let updated = false;
          const updatedItems = items.map((item: { batchId: number; unitCogs: number; quantity: number; unitPrice: number; lineTotal: number; lineCogs: number; lineMargin: number; marginPercent: number }) => {
            if (item.batchId === batchId) {
              updated = true;
              const lineCogs = item.quantity * newCogsNum;
              const lineMargin = item.lineTotal - lineCogs;
              const marginPercent = item.lineTotal > 0 
                ? (lineMargin / item.lineTotal) * 100 
                : 0;

              return {
                ...item,
                unitCogs: newCogsNum,
                lineCogs,
                lineMargin,
                marginPercent,
              };
            }
            return item;
          });

          if (updated) {
            // Recalculate order totals
            const totalCogs = updatedItems.reduce(
              (sum: number, item: { lineCogs: number }) => sum + (item.lineCogs ?? 0),
              0
            );
            const subtotal = parseFloat(order.subtotal ?? "0");
            const totalMargin = subtotal - totalCogs;
            const avgMarginPercent = subtotal > 0 
              ? (totalMargin / subtotal) * 100 
              : 0;

            await db
              .update(orders)
              .set({
                items: JSON.stringify(updatedItems),
                totalCogs: totalCogs.toString(),
                totalMargin: totalMargin.toString(),
                avgMarginPercent: avgMarginPercent.toString(),
              })
              .where(eq(orders.id, order.id));
          }
        }
      }

      return {
        batchId,
        oldCogs,
        newCogs: newCogsNum,
        adjustment: newCogsNum - oldCogs,
        applyTo,
        adjustedBy: userId,
        reason,
      };
    }),

  /**
   * Get COGS adjustment history for a batch
   */
  getHistory: protectedProcedure
    .use(requirePermission("cogs:read"))
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Query audit logs for COGS changes on this batch
      const history = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.entity, "batch"),
          eq(auditLogs.entityId, input.batchId),
          eq(auditLogs.action, "COGS_UPDATE")
        ),
        orderBy: [desc(auditLogs.createdAt)],
      });

      // Transform to expected format
      return history.map((entry) => {
        const beforeData = entry.before ? JSON.parse(entry.before) : {};
        const afterData = entry.after ? JSON.parse(entry.after) : {};
        return {
          id: entry.id,
          batchId: entry.entityId,
          oldCogs: beforeData.unitCogs ?? "0",
          newCogs: afterData.unitCogs ?? "0",
          applyTo: afterData.applyTo ?? "FUTURE_SALES",
          reason: entry.reason ?? "",
          adjustedBy: entry.actorId,
          createdAt: entry.createdAt,
        };
      });
    }),

  /**
   * Get COGS breakdown by batch for a period
   */
  getCOGSByBatch: protectedProcedure
    .use(requirePermission("cogs:read"))
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { startDate, endDate } = input;

      // Get completed orders in date range
      const completedOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.saleStatus, "PAID"),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        ),
      });

      // Aggregate by batch
      const batchMap = new Map<number, {
        batchId: number;
        totalQuantity: number;
        totalCOGS: number;
        totalRevenue: number;
      }>();

      for (const order of completedOrders) {
        const items = typeof order.items === "string" 
          ? JSON.parse(order.items) 
          : order.items;

        if (!Array.isArray(items)) continue;

        for (const item of items) {
          const batchId = item.batchId;
          const qty = item.quantity ?? 0;
          const unitCogs = item.unitCogs ?? 0;
          const unitPrice = item.unitPrice ?? 0;

          const existing = batchMap.get(batchId) ?? {
            batchId,
            totalQuantity: 0,
            totalCOGS: 0,
            totalRevenue: 0,
          };

          existing.totalQuantity += qty;
          existing.totalCOGS += qty * unitCogs;
          existing.totalRevenue += qty * unitPrice;

          batchMap.set(batchId, existing);
        }
      }

      // Convert to array and add calculated fields
      const results = Array.from(batchMap.values()).map((batch) => ({
        ...batch,
        grossProfit: batch.totalRevenue - batch.totalCOGS,
        grossMargin: batch.totalRevenue > 0 
          ? ((batch.totalRevenue - batch.totalCOGS) / batch.totalRevenue) * 100 
          : 0,
      }));

      // Sort by total COGS descending
      results.sort((a, b) => b.totalCOGS - a.totalCOGS);

      return results;
    }),
});
