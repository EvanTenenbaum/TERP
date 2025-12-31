/**
 * WS-009: Inventory Shrinkage Router
 * Handles inventory movement tracking and shrinkage logging
 */

import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { db } from "../db";
import { batches, inventoryMovements, users, locations } from "../../drizzle/schema";
import { eq, and, desc, sql, between } from "drizzle-orm";

// Movement type enum
const movementTypeEnum = z.enum([
  'TRANSFER',      // Location to location
  'SHRINKAGE',     // Loss due to drying, processing, etc.
  'ADJUSTMENT',    // Manual correction
  'SPLIT',         // Split batch into smaller units
  'MERGE',         // Merge batches
  'SAMPLE',        // Sample taken
  'DAMAGE',        // Damaged product
  'THEFT',         // Theft/loss
  'OTHER'
]);

// Shrinkage reason enum
const shrinkageReasonEnum = z.enum([
  'DRYING',
  'PROCESSING',
  'TRIMMING',
  'PACKAGING_LOSS',
  'QUALITY_CONTROL',
  'SAMPLE',
  'DAMAGE',
  'THEFT',
  'CORRECTION',
  'OTHER'
]);

export const inventoryShrinkageRouter = router({
  /**
   * Record inventory movement/shrinkage
   */
  recordMovement: adminProcedure
    .input(z.object({
      batchId: z.number(),
      movementType: movementTypeEnum,
      quantityChange: z.number(), // Negative for shrinkage
      reason: shrinkageReasonEnum.optional(),
      reasonNotes: z.string().optional(),
      fromLocationId: z.number().optional(),
      toLocationId: z.number().optional(),
      expectedShrinkagePercent: z.number().optional(), // For comparison
    }))
    .mutation(async ({ input, ctx }) => {
      // Get current batch details
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, input.batchId));

      if (!batch) {
        throw new Error('Batch not found');
      }

      const currentQuantity = parseFloat(batch.quantity as string);
      const newQuantity = currentQuantity + input.quantityChange;

      if (newQuantity < 0) {
        throw new Error('Cannot reduce quantity below zero');
      }

      // Calculate shrinkage percentage
      const shrinkagePercent = input.quantityChange < 0
        ? Math.abs(input.quantityChange / currentQuantity) * 100
        : 0;

      // Record the movement
      const [movement] = await db.insert(inventoryMovements).values({
        batchId: input.batchId,
        movementType: input.movementType,
        quantityBefore: String(currentQuantity),
        quantityChange: String(input.quantityChange),
        quantityAfter: String(newQuantity),
        reason: input.reason,
        reasonNotes: input.reasonNotes,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        shrinkagePercent: String(shrinkagePercent),
        expectedShrinkagePercent: input.expectedShrinkagePercent ? String(input.expectedShrinkagePercent) : null,
        createdBy: ctx.user.id,
        createdAt: new Date(),
      });

      // Update batch quantity
      await db
        .update(batches)
        .set({
          quantity: String(newQuantity),
          locationId: input.toLocationId || batch.locationId,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, input.batchId));

      return {
        movementId: movement.insertId,
        previousQuantity: currentQuantity,
        newQuantity,
        shrinkagePercent,
        isWithinExpected: input.expectedShrinkagePercent
          ? shrinkagePercent <= input.expectedShrinkagePercent
          : true,
      };
    }),

  /**
   * Get movement history for a batch
   */
  getBatchHistory: adminProcedure
    .input(z.object({
      batchId: z.number(),
    }))
    .query(async ({ input }) => {
      const movements = await db
        .select({
          id: inventoryMovements.id,
          movementType: inventoryMovements.movementType,
          quantityBefore: inventoryMovements.quantityBefore,
          quantityChange: inventoryMovements.quantityChange,
          quantityAfter: inventoryMovements.quantityAfter,
          reason: inventoryMovements.reason,
          reasonNotes: inventoryMovements.reasonNotes,
          shrinkagePercent: inventoryMovements.shrinkagePercent,
          createdAt: inventoryMovements.createdAt,
          createdByName: users.name,
          fromLocationName: sql<string>`fl.name`,
          toLocationName: sql<string>`tl.name`,
        })
        .from(inventoryMovements)
        .leftJoin(users, eq(inventoryMovements.createdBy, users.id))
        .leftJoin(sql`${locations} fl`, eq(inventoryMovements.fromLocationId, sql`fl.id`))
        .leftJoin(sql`${locations} tl`, eq(inventoryMovements.toLocationId, sql`tl.id`))
        .where(eq(inventoryMovements.batchId, input.batchId))
        .orderBy(desc(inventoryMovements.createdAt));

      return movements.map(m => ({
        id: m.id,
        movementType: m.movementType,
        quantityBefore: parseFloat(m.quantityBefore as string),
        quantityChange: parseFloat(m.quantityChange as string),
        quantityAfter: parseFloat(m.quantityAfter as string),
        reason: m.reason,
        reasonNotes: m.reasonNotes,
        shrinkagePercent: parseFloat(m.shrinkagePercent as string || '0'),
        createdAt: m.createdAt,
        createdByName: m.createdByName || 'System',
        fromLocationName: m.fromLocationName,
        toLocationName: m.toLocationName,
      }));
    }),

  /**
   * Get shrinkage report
   */
  getShrinkageReport: adminProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      reason: shrinkageReasonEnum.optional(),
    }))
    .query(async ({ input }) => {
      let query = db
        .select({
          reason: inventoryMovements.reason,
          totalShrinkage: sql<number>`SUM(ABS(CAST(${inventoryMovements.quantityChange} AS DECIMAL)))`,
          movementCount: sql<number>`COUNT(*)`,
          avgShrinkagePercent: sql<number>`AVG(CAST(${inventoryMovements.shrinkagePercent} AS DECIMAL))`,
        })
        .from(inventoryMovements)
        .where(sql`${inventoryMovements.quantityChange} < 0`)
        .groupBy(inventoryMovements.reason);

      const results = await query;

      return results.map(r => ({
        reason: r.reason || 'UNSPECIFIED',
        totalShrinkage: r.totalShrinkage || 0,
        movementCount: r.movementCount || 0,
        avgShrinkagePercent: r.avgShrinkagePercent || 0,
      }));
    }),

  /**
   * Transfer inventory between locations
   */
  transfer: adminProcedure
    .input(z.object({
      batchId: z.number(),
      fromLocationId: z.number(),
      toLocationId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get current batch
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, input.batchId));

      if (!batch) {
        throw new Error('Batch not found');
      }

      const quantity = parseFloat(batch.quantity as string);

      // Record the transfer movement
      const [movement] = await db.insert(inventoryMovements).values({
        batchId: input.batchId,
        movementType: 'TRANSFER',
        quantityBefore: String(quantity),
        quantityChange: '0', // No quantity change for transfers
        quantityAfter: String(quantity),
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        reasonNotes: input.notes,
        createdBy: ctx.user.id,
        createdAt: new Date(),
      });

      // Update batch location
      await db
        .update(batches)
        .set({
          locationId: input.toLocationId,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, input.batchId));

      return {
        movementId: movement.insertId,
        success: true,
      };
    }),

  /**
   * Get shrinkage stats for dashboard
   */
  getStats: adminProcedure
    .input(z.object({
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const stats = await db
        .select({
          totalShrinkage: sql<number>`SUM(ABS(CAST(${inventoryMovements.quantityChange} AS DECIMAL)))`,
          movementCount: sql<number>`COUNT(*)`,
          avgShrinkagePercent: sql<number>`AVG(CAST(${inventoryMovements.shrinkagePercent} AS DECIMAL))`,
        })
        .from(inventoryMovements)
        .where(and(
          sql`${inventoryMovements.quantityChange} < 0`,
          sql`${inventoryMovements.createdAt} >= ${startDate}`
        ));

      // Get top shrinkage reasons
      const topReasons = await db
        .select({
          reason: inventoryMovements.reason,
          total: sql<number>`SUM(ABS(CAST(${inventoryMovements.quantityChange} AS DECIMAL)))`,
        })
        .from(inventoryMovements)
        .where(and(
          sql`${inventoryMovements.quantityChange} < 0`,
          sql`${inventoryMovements.createdAt} >= ${startDate}`
        ))
        .groupBy(inventoryMovements.reason)
        .orderBy(desc(sql`SUM(ABS(CAST(${inventoryMovements.quantityChange} AS DECIMAL)))`))
        .limit(5);

      return {
        totalShrinkage: stats[0]?.totalShrinkage || 0,
        movementCount: stats[0]?.movementCount || 0,
        avgShrinkagePercent: stats[0]?.avgShrinkagePercent || 0,
        topReasons: topReasons.map(r => ({
          reason: r.reason || 'UNSPECIFIED',
          total: r.total || 0,
        })),
        periodDays: input.days,
      };
    }),
});
