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
 *
 * ## PRODUCTION DEPLOYMENT WARNING
 *
 * ⚠️  This module uses in-memory state for some operations.
 * ⚠️  In multi-instance deployments, ensure:
 *     - Sticky sessions OR
 *     - Redis-backed idempotency (see criticalMutation.ts)
 *
 * ## CALLER COMPOSITION GUIDE
 *
 * ### When to use each function:
 *
 * 1. **Simple single-batch allocation** (most common):
 *    ```typescript
 *    await allocateFromBatch(tx, { batchId, quantity, orderId, userId });
 *    ```
 *
 * 2. **Multi-batch order fulfillment** (atomic):
 *    ```typescript
 *    await allocateFromMultipleBatches(tx, allocations, { orderId, userId });
 *    ```
 *
 * 3. **Custom batch operations** (advanced):
 *    ```typescript
 *    await withBatchLock(tx, batchId, async (batch) => {
 *      // Custom logic with locked batch
 *    });
 *    ```
 *
 * 4. **Returns processing**:
 *    ```typescript
 *    await returnToBatch(tx, { batchId, quantity, orderId, reason, userId });
 *    ```
 *
 * ### Combining with criticalMutation:
 *
 * For critical operations that need retry + idempotency:
 * ```typescript
 * await criticalMutation(
 *   async (tx) => {
 *     return await allocateFromBatch(tx, { ... });
 *   },
 *   { idempotencyKey: `order-${orderId}-allocate` }
 * );
 * ```
 *
 * ### Lock timeouts:
 * - Single batch: 10s default (sufficient for most operations)
 * - Multi-batch: 30s default (allows for complex operations)
 * - Custom: Pass { lockTimeout: N } in options
 */

import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { batches, inventoryMovements } from "../../drizzle/schema";
import { logger } from "./logger";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default lock timeout for single batch operations (seconds) */
const DEFAULT_SINGLE_BATCH_LOCK_TIMEOUT = 10;

/** Default lock timeout for multi-batch operations (seconds) - longer for complex ops */
const DEFAULT_MULTI_BATCH_LOCK_TIMEOUT = 30;

/** Maximum allowed quantity for any single operation (prevents overflow) */
const MAX_QUANTITY = 10_000_000;

/**
 * Type for Drizzle transaction context
 * Uses MySql2Database as base type for better type safety while maintaining flexibility
 * The Record<string, unknown> schema allows any table operations within the transaction
 */
type DrizzleTx = MySql2Database<Record<string, unknown>>;

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
   * Default: 10 seconds for single batch, 30 seconds for multi-batch
   */
  lockTimeout?: number;

  /**
   * Whether to throw on insufficient quantity
   * Default: true
   */
  throwOnInsufficient?: boolean;

  /**
   * Whether to validate returns against original allocations
   * When true, returns will fail if quantity exceeds what was allocated
   * Default: true
   */
  validateReturnQuantity?: boolean;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validate that quantity is a positive number
 * @throws TRPCError with BAD_REQUEST if invalid
 */
function validateQuantity(quantity: number, operation: string): void {
  if (typeof quantity !== "number" || isNaN(quantity)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${operation}: quantity must be a valid number`,
    });
  }
  if (quantity <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${operation}: quantity must be positive, got ${quantity}`,
    });
  }
  if (!Number.isFinite(quantity)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${operation}: quantity must be finite`,
    });
  }
  if (quantity > MAX_QUANTITY) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${operation}: quantity exceeds maximum allowed (${MAX_QUANTITY}), got ${quantity}`,
    });
  }
}

/**
 * Validate that userId is a positive integer
 * @throws TRPCError with BAD_REQUEST if invalid
 */
function validateUserId(userId: number, operation: string): void {
  if (typeof userId !== "number" || isNaN(userId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${operation}: userId must be a valid number`,
    });
  }
  if (userId <= 0 || !Number.isInteger(userId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${operation}: userId must be a positive integer, got ${userId}`,
    });
  }
}

/**
 * Validate that batchId is a positive integer
 * @throws TRPCError with BAD_REQUEST if invalid
 */
function validateBatchId(batchId: number, operation: string): void {
  if (typeof batchId !== "number" || isNaN(batchId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${operation}: batchId must be a valid number`,
    });
  }
  if (batchId <= 0 || !Number.isInteger(batchId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${operation}: batchId must be a positive integer, got ${batchId}`,
    });
  }
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
  const { lockTimeout = DEFAULT_SINGLE_BATCH_LOCK_TIMEOUT } = options;
  const db = tx;

  // Input validation
  validateBatchId(batchId, "withBatchLock");

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
  // Use longer timeout for multi-batch operations
  const { lockTimeout = DEFAULT_MULTI_BATCH_LOCK_TIMEOUT } = options;
  const db = tx;

  if (batchIds.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No batch IDs provided for locking",
    });
  }

  // Validate all batch IDs
  for (const batchId of batchIds) {
    validateBatchId(batchId, "withMultiBatchLock");
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
 * Internal helper: Allocate from an already-locked batch directly
 * This function does NOT acquire a lock - the caller must ensure the batch is already locked.
 * Used by allocateFromMultipleBatches to avoid double-locking.
 *
 * @internal
 */
async function _allocateBatchDirect(
  tx: DrizzleTx,
  batch: LockedBatch,
  request: {
    quantity: number;
    orderId?: number;
    orderLineItemId?: number;
    userId: number;
  },
  options: { throwOnInsufficient?: boolean } = {}
): Promise<AllocationResult> {
  const { quantity, orderId, orderLineItemId, userId } = request;
  const { throwOnInsufficient = true } = options;
  const db = tx;
  const batchId = batch.id;

  // Input validation (batch already validated by caller, just validate quantity and userId)
  validateQuantity(quantity, "_allocateBatchDirect");
  validateUserId(userId, "_allocateBatchDirect");

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
}

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

  // Input validation
  validateBatchId(batchId, "allocateFromBatch");
  validateQuantity(quantity, "allocateFromBatch");
  validateUserId(userId, "allocateFromBatch");

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
 *
 * @param options.validateReturnQuantity - When true (default), validates that
 *   the return quantity doesn't exceed what was originally allocated from this batch.
 *   This prevents returning more inventory than was ever taken.
 */
export async function returnToBatch(
  tx: DrizzleTx,
  request: {
    batchId: number;
    quantity: number;
    orderId?: number;
    reason?: string;
    userId: number;
  },
  options: LockOptions = {}
): Promise<AllocationResult> {
  const { batchId, quantity, orderId, reason, userId } = request;
  const { validateReturnQuantity = true } = options;
  const db = tx;

  // Input validation
  validateBatchId(batchId, "returnToBatch");
  validateQuantity(quantity, "returnToBatch");
  validateUserId(userId, "returnToBatch");

  return await withBatchLock(tx, batchId, async batch => {
    // Validate return quantity against historical allocations
    if (validateReturnQuantity) {
      // Single atomic query to get both allocated and returned totals
      // This prevents race conditions between separate queries
      const movementTotals = (await db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN inventory_movement_type = 'SALE' THEN ABS(CAST(quantity_change AS DECIMAL(20,4))) ELSE 0 END), 0) as totalAllocated,
          COALESCE(SUM(CASE WHEN inventory_movement_type = 'RETURN' THEN CAST(quantity_change AS DECIMAL(20,4)) ELSE 0 END), 0) as totalReturned
        FROM inventory_movements
        WHERE batch_id = ${batchId}
        AND inventory_movement_type IN ('SALE', 'RETURN')
      `)) as unknown as { totalAllocated: string; totalReturned: string }[];

      // Use string comparison to avoid floating point precision issues
      const totalAllocatedStr = movementTotals[0]?.totalAllocated || "0";
      const totalReturnedStr = movementTotals[0]?.totalReturned || "0";

      // Parse with high precision - multiply by 10000 to work with integers
      const totalAllocated = Math.round(parseFloat(totalAllocatedStr) * 10000);
      const totalReturned = Math.round(parseFloat(totalReturnedStr) * 10000);
      const quantityScaled = Math.round(quantity * 10000);
      const maxReturnableScaled = totalAllocated - totalReturned;

      if (quantityScaled > maxReturnableScaled) {
        // Convert back to human-readable numbers for the error message
        const maxReturnable = maxReturnableScaled / 10000;
        const totalAllocatedDisplay = totalAllocated / 10000;
        const totalReturnedDisplay = totalReturned / 10000;

        logger.warn(
          {
            batchId,
            requestedReturn: quantity,
            totalAllocated: totalAllocatedDisplay,
            totalReturned: totalReturnedDisplay,
            maxReturnable,
          },
          "REL-006: Return quantity exceeds available for return"
        );
        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot return ${quantity} units to batch ${batchId}. Maximum returnable: ${maxReturnable} (allocated: ${totalAllocatedDisplay}, already returned: ${totalReturnedDisplay})`,
        });
      }
    }

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
 *
 * Uses _allocateBatchDirect internally to avoid double-locking.
 * The batches are locked once via withMultiBatchLock, then allocations
 * are performed directly on the locked batches.
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
  // Validate inputs
  validateUserId(context.userId, "allocateFromMultipleBatches");

  if (allocations.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "allocateFromMultipleBatches: allocations array cannot be empty",
    });
  }

  // Check for duplicate batchIds - these would cause stale data issues
  const batchIds = allocations.map(a => a.batchId);
  const uniqueBatchIds = new Set(batchIds);
  if (uniqueBatchIds.size !== batchIds.length) {
    const duplicates = batchIds.filter((id, i) => batchIds.indexOf(id) !== i);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `allocateFromMultipleBatches: duplicate batchIds not allowed (found: ${[...new Set(duplicates)].join(", ")}). Combine quantities for the same batch.`,
    });
  }

  // Validate each allocation
  for (const alloc of allocations) {
    validateBatchId(alloc.batchId, "allocateFromMultipleBatches");
    validateQuantity(alloc.quantity, "allocateFromMultipleBatches");
  }

  return await withMultiBatchLock(tx, batchIds, async batchMap => {
    const results: AllocationResult[] = [];

    for (const alloc of allocations) {
      const batch = batchMap.get(alloc.batchId);
      if (!batch) continue;

      // Use _allocateBatchDirect to avoid double-locking
      // The batch is already locked by withMultiBatchLock
      const result = await _allocateBatchDirect(
        tx,
        batch,
        {
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
