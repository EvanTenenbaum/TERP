/**
 * Inventory Movements Router
 * Sprint 4 Track A: 4.A.8 WS-009 - Enhanced Movement & Shrinkage Tracking
 * API endpoints for inventory movement tracking and management
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as inventoryMovementsDb from "../inventoryMovementsDb";
import { requirePermission } from "../_core/permissionMiddleware";
import { db } from "../db";
import { inventoryMovements, batches, products, users } from "../../drizzle/schema";
import { eq, desc, sql, and, gte, lte, isNull } from "drizzle-orm";

export const inventoryMovementsRouter = router({
  // Record a manual inventory movement
  record: protectedProcedure.use(requirePermission("inventory:update"))
    .input(z.object({
      batchId: z.number(),
      movementType: z.enum(["INTAKE", "SALE", "REFUND_RETURN", "ADJUSTMENT", "QUARANTINE", "RELEASE_FROM_QUARANTINE", "DISPOSAL", "TRANSFER", "SAMPLE"]),
      quantityChange: z.string(),
      quantityBefore: z.string(),
      quantityAfter: z.string(),
      referenceType: z.string().optional(),
      referenceId: z.number().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      
      return await inventoryMovementsDb.recordInventoryMovement({
        batchId: input.batchId,
        inventoryMovementType: input.movementType,
        quantityChange: input.quantityChange,
        quantityBefore: input.quantityBefore,
        quantityAfter: input.quantityAfter,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        notes: input.reason,
        performedBy: ctx.user.id
      });
    }),

  // Decrease inventory (for sales)
  decrease: protectedProcedure.use(requirePermission("inventory:update"))
    .input(z.object({
      batchId: z.number(),
      quantity: z.string(),
      referenceType: z.string(),
      referenceId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      
      return await inventoryMovementsDb.decreaseInventory(
        input.batchId,
        input.quantity,
        input.referenceType,
        input.referenceId,
        ctx.user.id,
        input.reason
      );
    }),

  // Increase inventory (for refunds)
  increase: protectedProcedure.use(requirePermission("inventory:update"))
    .input(z.object({
      batchId: z.number(),
      quantity: z.string(),
      referenceType: z.string(),
      referenceId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      
      return await inventoryMovementsDb.increaseInventory(
        input.batchId,
        input.quantity,
        input.referenceType,
        input.referenceId,
        ctx.user.id,
        input.reason
      );
    }),

  // Adjust inventory (manual adjustment)
  adjust: protectedProcedure.use(requirePermission("inventory:update"))
    .input(z.object({
      batchId: z.number(),
      newQuantity: z.string(),
      reason: z.string(),
      notes: z.string().optional(),
      // Optional structured adjustment reason (DATA-010: maps to adjustmentReason enum column)
      adjustmentReason: z.enum([
        "DAMAGED", "EXPIRED", "LOST", "THEFT",
        "COUNT_DISCREPANCY", "QUALITY_ISSUE", "REWEIGH", "OTHER"
      ]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await inventoryMovementsDb.adjustInventory(
        input.batchId,
        input.newQuantity,
        input.reason,
        ctx.user.id,
        input.notes,
        input.adjustmentReason
      );
    }),

  // Get movements for a batch
  getByBatch: protectedProcedure.use(requirePermission("inventory:read"))
    .input(z.object({
      batchId: z.number(),
      limit: z.number().optional().default(100),
    }))
    .query(async ({ input }) => {
      return await inventoryMovementsDb.getBatchMovements(input.batchId, input.limit);
    }),

  // Get movements by reference
  getByReference: protectedProcedure.use(requirePermission("inventory:read"))
    .input(z.object({
      referenceType: z.string(),
      referenceId: z.number(),
    }))
    .query(async ({ input }) => {
      return await inventoryMovementsDb.getMovementsByReference(
        input.referenceType,
        input.referenceId
      );
    }),

  // Validate inventory availability
  validateAvailability: protectedProcedure.use(requirePermission("inventory:read"))
    .input(z.object({
      batchId: z.number(),
      requestedQuantity: z.string(),
    }))
    .query(async ({ input }) => {
      return await inventoryMovementsDb.validateInventoryAvailability(
        input.batchId,
        input.requestedQuantity
      );
    }),

  // Get movement summary for a batch
  getSummary: protectedProcedure.use(requirePermission("inventory:read"))
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      return await inventoryMovementsDb.getBatchMovementSummary(input.batchId);
    }),

  // Reverse a movement
  reverse: protectedProcedure.use(requirePermission("inventory:update"))
    .input(z.object({
      movementId: z.number(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await inventoryMovementsDb.reverseInventoryMovement(
        input.movementId,
        input.reason,
        ctx.user.id
      );
    }),

  /**
   * Sprint 4 Track A: 4.A.8 WS-009 - Movement Analytics
   * Get movement analytics for a time period
   */
  getAnalytics: adminProcedure
    .input(z.object({
      startDate: z.string().optional(), // ISO date string
      endDate: z.string().optional(),
      batchId: z.number().optional(),
      movementTypes: z.array(z.string()).optional(),
      groupBy: z.enum(["day", "week", "month", "type"]).default("day"),
    }))
    .query(async ({ input }) => {
      const conditions = [isNull(inventoryMovements.deletedAt)];

      if (input.startDate) {
        conditions.push(gte(inventoryMovements.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(inventoryMovements.createdAt, new Date(input.endDate)));
      }
      if (input.batchId) {
        conditions.push(eq(inventoryMovements.batchId, input.batchId));
      }

      // Get all movements in the period
      const movements = await db
        .select({
          id: inventoryMovements.id,
          batchId: inventoryMovements.batchId,
          movementType: inventoryMovements.inventoryMovementType,
          quantityChange: inventoryMovements.quantityChange,
          referenceType: inventoryMovements.referenceType,
          adjustmentReason: inventoryMovements.adjustmentReason,
          createdAt: inventoryMovements.createdAt,
          productName: products.nameCanonical,
          sku: batches.sku,
        })
        .from(inventoryMovements)
        .leftJoin(batches, eq(inventoryMovements.batchId, batches.id))
        .leftJoin(products, eq(batches.productId, products.id))
        .where(and(...conditions))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(1000);

      // Calculate totals by type
      const byType: Record<string, { count: number; totalQuantity: number }> = {};
      let totalMovements = 0;
      let totalInbound = 0;
      let totalOutbound = 0;

      for (const mov of movements) {
        const qty = parseFloat(mov.quantityChange || "0");
        const type = mov.movementType || "UNKNOWN";

        if (!byType[type]) {
          byType[type] = { count: 0, totalQuantity: 0 };
        }
        byType[type].count++;
        byType[type].totalQuantity += Math.abs(qty);
        totalMovements++;

        if (qty > 0) {
          totalInbound += qty;
        } else {
          totalOutbound += Math.abs(qty);
        }
      }

      // Group by time period
      const timeGroups: Record<string, { count: number; inbound: number; outbound: number }> = {};

      for (const mov of movements) {
        if (!mov.createdAt) continue;
        const date = new Date(mov.createdAt);
        let key: string;

        if (input.groupBy === "day") {
          key = date.toISOString().split("T")[0];
        } else if (input.groupBy === "week") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
        } else if (input.groupBy === "month") {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        } else {
          key = mov.movementType || "UNKNOWN";
        }

        if (!timeGroups[key]) {
          timeGroups[key] = { count: 0, inbound: 0, outbound: 0 };
        }

        const qty = parseFloat(mov.quantityChange || "0");
        timeGroups[key].count++;
        if (qty > 0) {
          timeGroups[key].inbound += qty;
        } else {
          timeGroups[key].outbound += Math.abs(qty);
        }
      }

      return {
        summary: {
          totalMovements,
          totalInbound,
          totalOutbound,
          netChange: totalInbound - totalOutbound,
        },
        byType,
        byTimePeriod: Object.entries(timeGroups).map(([period, data]) => ({
          period,
          ...data,
        })).sort((a, b) => a.period.localeCompare(b.period)),
      };
    }),

  /**
   * Sprint 4 Track A: 4.A.8 WS-009 - Shrinkage Report
   * Detect and report unexplained inventory losses
   */
  getShrinkageReport: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      category: z.string().optional(),
      minShrinkage: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [
        isNull(inventoryMovements.deletedAt),
        eq(inventoryMovements.inventoryMovementType, "ADJUSTMENT"),
      ];

      if (input.startDate) {
        conditions.push(gte(inventoryMovements.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(inventoryMovements.createdAt, new Date(input.endDate)));
      }

      // Get adjustment movements (potential shrinkage)
      const adjustments = await db
        .select({
          id: inventoryMovements.id,
          batchId: inventoryMovements.batchId,
          quantityChange: inventoryMovements.quantityChange,
          quantityBefore: inventoryMovements.quantityBefore,
          quantityAfter: inventoryMovements.quantityAfter,
          adjustmentReason: inventoryMovements.adjustmentReason,
          notes: inventoryMovements.notes,
          createdAt: inventoryMovements.createdAt,
          performedById: inventoryMovements.performedBy,
          performedByName: users.name,
          productName: products.nameCanonical,
          category: products.category,
          sku: batches.sku,
          code: batches.code,
        })
        .from(inventoryMovements)
        .leftJoin(batches, eq(inventoryMovements.batchId, batches.id))
        .leftJoin(products, eq(batches.productId, products.id))
        .leftJoin(users, eq(inventoryMovements.performedBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(500);

      // Identify shrinkage (negative adjustments)
      // Valid shrinkage reasons for reference
      const _shrinkageReasons = ["DAMAGED", "EXPIRED", "LOST", "THEFT", "COUNT_DISCREPANCY"];

      const shrinkageItems: Array<{
        id: number;
        batchId: number;
        sku: string;
        code: string;
        productName: string;
        category: string | null;
        shrinkageQty: number;
        reason: string;
        notes: string | null;
        date: Date;
        performedBy: string | null;
        isSuspicious: boolean;
      }> = [];

      let totalShrinkage = 0;
      let suspiciousCount = 0;

      for (const adj of adjustments) {
        const qtyChange = parseFloat(adj.quantityChange || "0");

        // Only include negative adjustments (shrinkage)
        if (qtyChange < 0 && Math.abs(qtyChange) >= input.minShrinkage) {
          // Filter by category if specified
          if (input.category && adj.category !== input.category) {
            continue;
          }

          const isSuspicious =
            adj.adjustmentReason === "THEFT" ||
            adj.adjustmentReason === "LOST" ||
            (Math.abs(qtyChange) > 100 && !adj.adjustmentReason);

          totalShrinkage += Math.abs(qtyChange);
          if (isSuspicious) suspiciousCount++;

          shrinkageItems.push({
            id: adj.id,
            batchId: adj.batchId,
            sku: adj.sku || "Unknown",
            code: adj.code || "Unknown",
            productName: adj.productName || "Unknown",
            category: adj.category,
            shrinkageQty: Math.abs(qtyChange),
            reason: adj.adjustmentReason || "Not specified",
            notes: adj.notes,
            date: adj.createdAt || new Date(),
            performedBy: adj.performedByName,
            isSuspicious,
          });
        }
      }

      // Group by reason
      const byReason: Record<string, { count: number; totalQty: number }> = {};
      for (const item of shrinkageItems) {
        if (!byReason[item.reason]) {
          byReason[item.reason] = { count: 0, totalQty: 0 };
        }
        byReason[item.reason].count++;
        byReason[item.reason].totalQty += item.shrinkageQty;
      }

      // Group by category
      const byCategory: Record<string, { count: number; totalQty: number }> = {};
      for (const item of shrinkageItems) {
        const cat = item.category || "Uncategorized";
        if (!byCategory[cat]) {
          byCategory[cat] = { count: 0, totalQty: 0 };
        }
        byCategory[cat].count++;
        byCategory[cat].totalQty += item.shrinkageQty;
      }

      return {
        summary: {
          totalShrinkageEvents: shrinkageItems.length,
          totalShrinkageQty: totalShrinkage,
          suspiciousEvents: suspiciousCount,
        },
        byReason: Object.entries(byReason).map(([reason, data]) => ({
          reason,
          ...data,
        })).sort((a, b) => b.totalQty - a.totalQty),
        byCategory: Object.entries(byCategory).map(([category, data]) => ({
          category,
          ...data,
        })).sort((a, b) => b.totalQty - a.totalQty),
        items: shrinkageItems.sort((a, b) =>
          b.shrinkageQty - a.shrinkageQty || new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      };
    }),

  /**
   * Sprint 4 Track A: 4.A.8 WS-009 - Movement History
   * Get paginated movement history with filtering
   */
  getHistory: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(50),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      batchId: z.number().optional(),
      movementType: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [isNull(inventoryMovements.deletedAt)];

      if (input.startDate) {
        conditions.push(gte(inventoryMovements.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(inventoryMovements.createdAt, new Date(input.endDate)));
      }
      if (input.batchId) {
        conditions.push(eq(inventoryMovements.batchId, input.batchId));
      }
      if (input.movementType) {
        conditions.push(eq(inventoryMovements.inventoryMovementType, input.movementType as 'INTAKE' | 'SALE' | 'REFUND_RETURN' | 'ADJUSTMENT' | 'QUARANTINE' | 'RELEASE_FROM_QUARANTINE' | 'DISPOSAL' | 'TRANSFER' | 'SAMPLE'));
      }

      const offset = (input.page - 1) * input.pageSize;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(inventoryMovements)
        .where(and(...conditions));

      const totalCount = Number(countResult[0]?.count || 0);

      // Get paginated movements
      const movements = await db
        .select({
          id: inventoryMovements.id,
          batchId: inventoryMovements.batchId,
          movementType: inventoryMovements.inventoryMovementType,
          quantityChange: inventoryMovements.quantityChange,
          quantityBefore: inventoryMovements.quantityBefore,
          quantityAfter: inventoryMovements.quantityAfter,
          referenceType: inventoryMovements.referenceType,
          referenceId: inventoryMovements.referenceId,
          adjustmentReason: inventoryMovements.adjustmentReason,
          notes: inventoryMovements.notes,
          createdAt: inventoryMovements.createdAt,
          performedById: inventoryMovements.performedBy,
          performedByName: users.name,
          productName: products.nameCanonical,
          category: products.category,
          sku: batches.sku,
          code: batches.code,
        })
        .from(inventoryMovements)
        .leftJoin(batches, eq(inventoryMovements.batchId, batches.id))
        .leftJoin(products, eq(batches.productId, products.id))
        .leftJoin(users, eq(inventoryMovements.performedBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      return {
        items: movements.map(mov => ({
          ...mov,
          quantityChange: parseFloat(mov.quantityChange || "0"),
          quantityBefore: parseFloat(mov.quantityBefore || "0"),
          quantityAfter: parseFloat(mov.quantityAfter || "0"),
        })),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / input.pageSize),
          hasMore: offset + input.pageSize < totalCount,
        },
      };
    }),
});

