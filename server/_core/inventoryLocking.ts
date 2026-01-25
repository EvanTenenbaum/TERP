/**
 * REL-006: Inventory Concurrency Hardening
 * Provides row-level locking for inventory operations to prevent race conditions
 *
 * This module implements pessimistic locking patterns for:
 * - Batch quantity updates (allocation, fulfillment, returns)
 * - Lot updates
 * - Multi-batch atomic operations
 *
 * Uses MySQL's SELECT ... FOR UPDATE for row-level locks within transactions
 *
 * @see TRUTH_MODEL.md for inventory invariants that must be maintained
 */

import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { batches, inventoryMovements } from "../../drizzle/schema";
import { logger } from "./logger";

// Type for transaction context passed from Drizzle
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleTx = any;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Batch data returned from locked queries
 */
export interface LockedBatch {
  id: number;
  lotId: number;
  sku: string;
  onHandQty: number;
  allocatedQty: number;
  unitCogs: number | null;
  status: string;
}

/**
 * Allocation request for a single batch
 */
export interface BatchAllocationRequest {
  batchId: number;
  quantity: number;
}

/**
 * Result of a batch allocation operation
 */
export interface AllocationResult {
  batchId: number;
  quantityAllocated: number;
  unitCogs: number;
  previousQty: number;
  newQty: number;
}

/**
 * Options for locking operations
 */
export interface LockOptions {
  /**
   * Timeout in seconds to wait for lock acquisition
   * Default: 10 seconds
   */
  lockTimeout?: number;

  /**
   * Whether to throw on insufficient quantity
   * Default: true
   */
  throwOnInsufficient?: boolean;
}

// ============================================================================
// SINGLE BATCH LOCKING
// ============================================================================

/**
 * Lock a single batch row for update and execute a callback
 * The batch remains locked until the transaction commits/rollbacks
 *
 * @example
 * ```typescript
 * await withBatchLock(tx, batchId, async (batch) => {
 *   if (batch.onHandQty < quantityNeeded) {
 *     throw new Error("Insufficient quantity");
 *   }
 *   // Update the batch...
 * });
 * ```
 */
export async function withBatchLock<T>(
  tx: DrizzleTx,
  batchId: number,
  callback: (batch: LockedBatch) => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const { lockTimeout = 10 } = options;
  const db = tx;

  try {
    // Set lock timeout for this transaction
    await db.execute(
      sql.raw(`SET SESSION innodb_lock_wait_timeout = ${lockTimeout}`)
    );

    // Lock the batch row using FOR UPDATE
    // This prevents other transactions from modifying this row until we commit
    const [batch] = (await db.execute(sql`
      SELECT
        id,
        lot_id as lotId,
        sku,
        on_hand_qty as onHandQty,
        allocated_qty as allocatedQty,
        unit_cogs as unitCogs,
        status
      FROM batches
      WHERE id = ${batchId}
      AND deleted_at IS NULL
      FOR UPDATE
    `)) as unknown as LockedBatch[];

    if (!batch) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Batch ${batchId} not found or has been deleted`,
      });
    }

    logger.debug(
      { batchId, onHandQty: batch.onHandQty, allocatedQty: batch.allocatedQty },
      "REL-006: Acquired lock on batch"
    );

    return await callback(batch);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("lock wait timeout")) {
      logger.warn(
        { batchId, lockTimeout },
        "REL-006: Lock wait timeout on batch"
      );
      throw new TRPCError({
        code: "CONFLICT",
        message: `Batch ${batchId} is currently being modified by another operation. Please retry.`,
      });
    }

    throw error;
  }
}

// ============================================================================
// MULTI-BATCH LOCKING
// ============================================================================

/**
 * Lock multiple batch rows for update atomically
 * All batches are locked in ID order to prevent deadlocks
 *
 * @example
 * ```typescript
 * await withMultiBatchLock(tx, [1, 2, 3], async (batches) => {
 *   // All three batches are now locked
 *   // Perform atomic updates...
 * });
 * ```
 */
export async function withMultiBatchLock<T>(
  tx: DrizzleTx,
  batchIds: number[],
  callback: (batches: Map<number, LockedBatch>) => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const { lockTimeout = 10 } = options;
  const db = tx;

  if (batchIds.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No batch IDs provided for locking",
    });
  }

  // Sort IDs to prevent deadlocks (always acquire locks in same order)
  const sortedIds = [...batchIds].sort((a, b) => a - b);

  try {
    await db.execute(
      sql.raw(`SET SESSION innodb_lock_wait_timeout = ${lockTimeout}`)
    );

    // Lock all batches in sorted order
    const lockedBatches = (await db.execute(sql`
      SELECT
        id,
        lot_id as lotId,
        sku,
        on_hand_qty as onHandQty,
        allocated_qty as allocatedQty,
        unit_cogs as unitCogs,
        status
      FROM batches
      WHERE id IN (${sql.join(
        sortedIds.map(id => sql`${id}`),
        sql`, `
      )})
      AND deleted_at IS NULL
      ORDER BY id
      FOR UPDATE
    `)) as unknown as LockedBatch[];

    // Build map for easy access
    const batchMap = new Map<number, LockedBatch>();
    for (const batch of lockedBatches) {
      batchMap.set(batch.id, batch);
    }

    // Verify all requested batches were found
    for (const id of batchIds) {
      if (!batchMap.has(id)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Batch ${id} not found or has been deleted`,
        });
      }
    }

    logger.debug(
      { batchIds: sortedIds, count: lockedBatches.length },
      "REL-006: Acquired locks on multiple batches"
    );

    return await callback(batchMap);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("lock wait timeout")) {
      logger.warn(
        { batchIds, lockTimeout },
        "REL-006: Lock wait timeout on batch set"
      );
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "One or more batches are currently being modified. Please retry.",
      });
    }

    throw error;
  }
}

// ============================================================================
// ALLOCATION OPERATIONS
// ============================================================================

/**
 * Allocate quantity from a batch with proper locking
 * Validates sufficient quantity and updates atomically
 *
 * @example
 * ```typescript
 * const result = await allocateFromBatch(tx, {
 *   batchId: 123,
 *   quantity: 10,
 *   orderId: 456,
 *   userId: 1,
 * });
 * ```
 */
export async function allocateFromBatch(
  tx: DrizzleTx,
  request: {
    batchId: number;
    quantity: number;
    orderId?: number;
    orderLineItemId?: number;
    userId: number;
  },
  options: LockOptions = {}
): Promise<AllocationResult> {
  const { batchId, quantity, orderId, orderLineItemId, userId } = request;
  const { throwOnInsufficient = true } = options;
  const db = tx;

  return await withBatchLock(
    tx,
    batchId,
    async batch => {
      // Validate available quantity
      const availableQty = batch.onHandQty - (batch.allocatedQty || 0);
      if (availableQty < quantity) {
        if (throwOnInsufficient) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Insufficient quantity in batch ${batchId}. Available: ${availableQty}, Requested: ${quantity}`,
          });
        }
        // Return partial allocation if allowed
        return {
          batchId,
          quantityAllocated: 0,
          unitCogs: batch.unitCogs || 0,
          previousQty: batch.onHandQty,
          newQty: batch.onHandQty,
        };
      }

      // Calculate before/after quantities
      const quantityBefore = batch.onHandQty;
      const quantityAfter = batch.onHandQty - quantity;

      // Update batch quantities
      await db
        .update(batches)
        .set({
          onHandQty: sql`on_hand_qty - ${quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batchId));

      // Record inventory movement (using correct schema column names)
      await db.insert(inventoryMovements).values({
        batchId,
        inventoryMovementType: "SALE", // SALE is the correct type for allocations
        quantityChange: (-quantity).toString(),
        quantityBefore: quantityBefore.toString(),
        quantityAfter: quantityAfter.toString(),
        referenceType: orderId
          ? "ORDER"
          : orderLineItemId
            ? "ORDER_LINE_ITEM"
            : null,
        referenceId: orderId || orderLineItemId || null,
        notes: orderId ? `Allocated for order #${orderId}` : "Allocated",
        performedBy: userId,
      });

      logger.info(
        {
          batchId,
          quantity,
          previousQty: batch.onHandQty,
          newQty: batch.onHandQty - quantity,
          orderId,
          orderLineItemId,
          userId,
        },
        "REL-006: Batch allocation completed"
      );

      return {
        batchId,
        quantityAllocated: quantity,
        unitCogs: batch.unitCogs || 0,
        previousQty: batch.onHandQty,
        newQty: batch.onHandQty - quantity,
      };
    },
    options
  );
}

/**
 * Return quantity to a batch with proper locking (for returns/restocks)
 */
export async function returnToBatch(
  tx: DrizzleTx,
  request: {
    batchId: number;
    quantity: number;
    orderId?: number;
    reason?: string;
    userId: number;
  }
): Promise<AllocationResult> {
  const { batchId, quantity, orderId, reason, userId } = request;
  const db = tx;

  return await withBatchLock(tx, batchId, async batch => {
    // Calculate before/after quantities
    const quantityBefore = batch.onHandQty;
    const quantityAfter = batch.onHandQty + quantity;

    // Update batch quantity (increase)
    await db
      .update(batches)
      .set({
        onHandQty: sql`on_hand_qty + ${quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(batches.id, batchId));

    // Record inventory movement (using correct schema column names)
    await db.insert(inventoryMovements).values({
      batchId,
      inventoryMovementType: "RETURN",
      quantityChange: quantity.toString(), // Positive for returns
      quantityBefore: quantityBefore.toString(),
      quantityAfter: quantityAfter.toString(),
      referenceType: orderId ? "RETURN" : null,
      referenceId: orderId || null,
      notes:
        reason ||
        (orderId ? `Returned from order #${orderId}` : "Returned to inventory"),
      performedBy: userId,
    });

    logger.info(
      {
        batchId,
        quantity,
        previousQty: batch.onHandQty,
        newQty: batch.onHandQty + quantity,
        orderId,
        reason,
        userId,
      },
      "REL-006: Batch return completed"
    );

    return {
      batchId,
      quantityAllocated: -quantity, // Negative indicates return
      unitCogs: batch.unitCogs || 0,
      previousQty: batch.onHandQty,
      newQty: batch.onHandQty + quantity,
    };
  });
}

/**
 * Allocate from multiple batches atomically (for order fulfillment)
 */
export async function allocateFromMultipleBatches(
  tx: DrizzleTx,
  allocations: BatchAllocationRequest[],
  context: {
    orderId?: number;
    orderLineItemId?: number;
    userId: number;
  }
): Promise<AllocationResult[]> {
  const batchIds = allocations.map(a => a.batchId);

  return await withMultiBatchLock(tx, batchIds, async batchMap => {
    const results: AllocationResult[] = [];

    for (const alloc of allocations) {
      const batch = batchMap.get(alloc.batchId);
      if (!batch) continue;

      // Validate quantity
      if (batch.onHandQty < alloc.quantity) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Insufficient quantity in batch ${alloc.batchId}. Available: ${batch.onHandQty}, Requested: ${alloc.quantity}`,
        });
      }

      // Perform allocation
      const result = await allocateFromBatch(
        tx,
        {
          batchId: alloc.batchId,
          quantity: alloc.quantity,
          ...context,
        },
        { throwOnInsufficient: true }
      );

      results.push(result);
    }

    return results;
  });
}

export default {
  withBatchLock,
  withMultiBatchLock,
  allocateFromBatch,
  returnToBatch,
  allocateFromMultipleBatches,
};
