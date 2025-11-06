/**
 * Inventory Movements Router
 * API endpoints for inventory movement tracking and management
 */

import { z } from "zod";
import { publicProcedure as protectedProcedure, router } from "../_core/trpc";
import * as inventoryMovementsDb from "../inventoryMovementsDb";

export const inventoryMovementsRouter = router({
  // Record a manual inventory movement
  record: protectedProcedure
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
        movementType: input.movementType,
        quantityChange: input.quantityChange,
        quantityBefore: input.quantityBefore,
        quantityAfter: input.quantityAfter,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        reason: input.reason,
        performedBy: ctx.user.id
      });
    }),

  // Decrease inventory (for sales)
  decrease: protectedProcedure
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
  increase: protectedProcedure
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
  adjust: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      newQuantity: z.string(),
      adjustmentReason: z.enum(["DAMAGED", "EXPIRED", "LOST", "THEFT", "COUNT_DISCREPANCY", "QUALITY_ISSUE", "REWEIGH", "OTHER"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      
      return await inventoryMovementsDb.adjustInventory(
        input.batchId,
        input.newQuantity,
        input.adjustmentReason,
        ctx.user.id,
        input.notes
      );
    }),

  // Get movements for a batch
  getByBatch: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      limit: z.number().optional().default(100),
    }))
    .query(async ({ input }) => {
      return await inventoryMovementsDb.getBatchMovements(input.batchId, input.limit);
    }),

  // Get movements by reference
  getByReference: protectedProcedure
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
  validateAvailability: protectedProcedure
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
  getSummary: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      return await inventoryMovementsDb.getBatchMovementSummary(input.batchId);
    }),

  // Reverse a movement
  reverse: protectedProcedure
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
});

