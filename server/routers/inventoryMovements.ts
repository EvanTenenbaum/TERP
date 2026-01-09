/**
 * Inventory Movements Router
 * API endpoints for inventory movement tracking and management
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as inventoryMovementsDb from "../inventoryMovementsDb";
import { requirePermission } from "../_core/permissionMiddleware";

export const inventoryMovementsRouter = router({
  // Record a manual inventory movement
  record: protectedProcedure.use(requirePermission("inventory:read"))
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
  decrease: protectedProcedure.use(requirePermission("inventory:read"))
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
  increase: protectedProcedure.use(requirePermission("inventory:read"))
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
  adjust: protectedProcedure.use(requirePermission("inventory:read"))
    .input(z.object({
      batchId: z.number(),
      newQuantity: z.string(),
      reason: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      
      return await inventoryMovementsDb.adjustInventory(
        input.batchId,
        input.newQuantity,
        input.reason,
        ctx.user.id,
        input.notes
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
  reverse: protectedProcedure.use(requirePermission("inventory:read"))
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

