/**
 * Inventory Movements Database Access Layer
 * Handles all inventory movement tracking and automatic updates
 *
 * This module implements:
 * - Automatic inventory updates on sales/refunds
 * - Inventory movement logging
 * - Real-time inventory validation
 * - Batch quantity tracking
 * - Database transactions with row-level locking (Phase 1 improvements)
 *
 * TERP-INIT-005 Phase 1: Critical Fixes
 * - All multi-step operations wrapped in transactions
 * - Row-level locking using SELECT ... FOR UPDATE
 * - Atomic operations to prevent race conditions
 */

import { getDb } from "./db";
import {
  inventoryMovements,
  batches,
  type InventoryMovement,
  type InsertInventoryMovement,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "./_core/logger";

/**
 * Record an inventory movement
 * @param movement Inventory movement data
 * @returns The created inventory movement record
 */
export async function recordInventoryMovement(
  movement: InsertInventoryMovement
): Promise<InventoryMovement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [created] = await db
      .insert(inventoryMovements)
      .values(movement)
      .$returningId();

    if (!created) {
      throw new Error("Failed to create inventory movement");
    }

    const [record] = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.id, created.id));

    if (!record) {
      throw new Error("Inventory movement created but not found");
    }

    return record;
  } catch (error) {
    logger.error({
      msg: "Error recording inventory movement",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to record inventory movement: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrease inventory for a sale
 *
 * ✅ FIXED: Wrapped in transaction with row-level locking (TERP-INIT-005 Phase 1)
 * Uses SELECT ... FOR UPDATE to prevent race conditions
 *
 * @param batchId Batch ID
 * @param quantity Quantity to decrease
 * @param referenceType Reference type (e.g., "ORDER", "SALE")
 * @param referenceId Reference ID
 * @param userId User ID performing the action
 * @param reason Optional reason
 * @returns The created inventory movement
 */
export async function decreaseInventory(
  batchId: number,
  quantity: string,
  referenceType: string,
  referenceId: number,
  userId: number,
  reason?: string
): Promise<InventoryMovement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Wrap entire operation in transaction
    const movement = await db.transaction(async tx => {
      // Get current batch quantity with row-level lock
      const [batch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, batchId))
        .for("update"); // Row-level lock - prevents concurrent modifications

      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const onHandQty = parseFloat(batch.onHandQty || "0");
      const decreaseQty = parseFloat(quantity);

      if (isNaN(decreaseQty) || decreaseQty <= 0) {
        throw new Error("Invalid quantity");
      }

      if (decreaseQty > onHandQty) {
        throw new Error(
          `Insufficient inventory. Available: ${onHandQty}, Requested: ${decreaseQty}`
        );
      }

      const newQty = onHandQty - decreaseQty;

      // Update batch quantity
      await tx
        .update(batches)
        .set({ onHandQty: newQty.toString() })
        .where(eq(batches.id, batchId));

      // Record movement
      const [created] = await tx
        .insert(inventoryMovements)
        .values({
          batchId,
          inventoryMovementType: "SALE",
          quantityChange: `-${quantity}`,
          quantityBefore: onHandQty.toString(),
          quantityAfter: newQty.toString(),
          referenceType,
          referenceId,
          reason,
          performedBy: userId,
        })
        .$returningId();

      if (!created) {
        throw new Error("Failed to create inventory movement");
      }

      const [record] = await tx
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.id, created.id));

      if (!record) {
        throw new Error("Inventory movement created but not found");
      }

      return record;
    });

    return movement;
  } catch (error) {
    logger.error({
      msg: "Error decreasing inventory",
      batchId,
      quantity,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to decrease inventory: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Increase inventory for a refund return
 *
 * ✅ FIXED: Wrapped in transaction with row-level locking (TERP-INIT-005 Phase 1)
 *
 * @param batchId Batch ID
 * @param quantity Quantity to increase
 * @param referenceType Reference type (e.g., "REFUND")
 * @param referenceId Reference ID
 * @param userId User ID performing the action
 * @param reason Optional reason
 * @returns The created inventory movement
 */
export async function increaseInventory(
  batchId: number,
  quantity: string,
  referenceType: string,
  referenceId: number,
  userId: number,
  reason?: string
): Promise<InventoryMovement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Wrap entire operation in transaction
    const movement = await db.transaction(async tx => {
      // Get current batch quantity with row-level lock
      const [batch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, batchId))
        .for("update"); // Row-level lock

      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const onHandQty = parseFloat(batch.onHandQty || "0");
      const increaseQty = parseFloat(quantity);

      if (isNaN(increaseQty) || increaseQty <= 0) {
        throw new Error("Invalid quantity");
      }

      const newQty = onHandQty + increaseQty;

      // Update batch quantity
      await tx
        .update(batches)
        .set({ onHandQty: newQty.toString() })
        .where(eq(batches.id, batchId));

      // Record movement
      const [created] = await tx
        .insert(inventoryMovements)
        .values({
          batchId,
          inventoryMovementType: "REFUND_RETURN",
          quantityChange: `+${quantity}`,
          quantityBefore: onHandQty.toString(),
          quantityAfter: newQty.toString(),
          referenceType,
          referenceId,
          reason,
          performedBy: userId,
        })
        .$returningId();

      if (!created) {
        throw new Error("Failed to create inventory movement");
      }

      const [record] = await tx
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.id, created.id));

      if (!record) {
        throw new Error("Inventory movement created but not found");
      }

      return record;
    });

    return movement;
  } catch (error) {
    logger.error({
      msg: "Error increasing inventory",
      batchId,
      quantity,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to increase inventory: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Adjust inventory (manual adjustment)
 *
 * ✅ FIXED: Wrapped in transaction with row-level locking (TERP-INIT-005 Phase 1)
 *
 * @param batchId Batch ID
 * @param newQuantity New quantity
 * @param reason Reason for adjustment
 * @param userId User ID performing the action
 * @returns The created inventory movement
 */
export async function adjustInventory(
  batchId: number,
  newQuantity: string,
  reason: string,
  userId: number,
  notes?: string
): Promise<InventoryMovement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Wrap entire operation in transaction
    const movement = await db.transaction(async tx => {
      // Get current batch quantity with row-level lock
      const [batch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, batchId))
        .for("update"); // Row-level lock

      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const onHandQty = parseFloat(batch.onHandQty || "0");
      const newQty = parseFloat(newQuantity);

      if (isNaN(newQty) || newQty < 0) {
        throw new Error("Invalid quantity");
      }

      const change = newQty - onHandQty;
      const changeStr = change >= 0 ? `+${change}` : change.toString();

      // Update batch quantity
      await tx
        .update(batches)
        .set({ onHandQty: newQty.toString() })
        .where(eq(batches.id, batchId));

      // Record movement
      const [created] = await tx
        .insert(inventoryMovements)
        .values({
          batchId,
          inventoryMovementType: "ADJUSTMENT",
          quantityChange: changeStr,
          quantityBefore: onHandQty.toString(),
          quantityAfter: newQty.toString(),
          referenceType: "MANUAL_ADJUSTMENT",
          referenceId: null,
          reason: notes ? `${reason} - ${notes}` : reason,
          performedBy: userId,
        })
        .$returningId();

      if (!created) {
        throw new Error("Failed to create inventory movement");
      }

      const [record] = await tx
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.id, created.id));

      if (!record) {
        throw new Error("Inventory movement created but not found");
      }

      return record;
    });

    return movement;
  } catch (error) {
    logger.error({
      msg: "Error adjusting inventory",
      batchId,
      newQuantity,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to adjust inventory: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get inventory movements for a batch
 * @param batchId Batch ID
 * @param limit Maximum number of results
 * @returns Array of inventory movements
 */
export async function getBatchMovements(
  batchId: number,
  limit: number = 100
): Promise<InventoryMovement[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const movements = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.batchId, batchId))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(limit);

    return movements;
  } catch (error) {
    logger.error({
      msg: "Error fetching batch movements",
      batchId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to fetch batch movements: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get inventory movements by reference
 * @param referenceType Reference type
 * @param referenceId Reference ID
 * @returns Array of inventory movements
 */
export async function getMovementsByReference(
  referenceType: string,
  referenceId: number
): Promise<InventoryMovement[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const movements = await db
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.referenceType, referenceType),
          eq(inventoryMovements.referenceId, referenceId)
        )
      )
      .orderBy(desc(inventoryMovements.createdAt));

    return movements;
  } catch (error) {
    logger.error({
      msg: "Error fetching movements by reference",
      referenceType,
      referenceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to fetch movements by reference: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validate inventory availability
 * @param batchId Batch ID
 * @param requestedQuantity Requested quantity
 * @returns Object with availability status and details
 */
export async function validateInventoryAvailability(
  batchId: number,
  requestedQuantity: string
): Promise<{
  available: boolean;
  currentQuantity: number;
  requestedQuantity: number;
  shortfall?: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId));

    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    const onHandQty = parseFloat(batch.onHandQty || "0");
    const requestedQty = parseFloat(requestedQuantity);

    if (isNaN(requestedQty) || requestedQty <= 0) {
      throw new Error("Invalid requested quantity");
    }

    const available = onHandQty >= requestedQty;
    const shortfall = available ? undefined : requestedQty - onHandQty;

    return {
      available,
      currentQuantity: onHandQty,
      requestedQuantity: requestedQty,
      shortfall,
    };
  } catch (error) {
    logger.error({
      msg: "Error validating inventory availability",
      batchId,
      requestedQuantity,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to validate inventory availability: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Reverse an inventory movement (for rollback scenarios)
 * ✅ FIXED: Wrapped in transaction with row-level locking (TERP-INIT-005 Phase 1)
 *
 * @param movementId Original movement ID to reverse
 * @param reason Reason for reversal
 * @param userId User ID performing the reversal
 * @returns The created reversal movement
 */
export async function reverseInventoryMovement(
  movementId: number,
  reason: string,
  userId: number
): Promise<InventoryMovement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Wrap entire operation in transaction
    const movement = await db.transaction(async tx => {
      // Get the original movement
      const [originalMovement] = await tx
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.id, movementId));

      if (!originalMovement) {
        throw new Error(`Movement ${movementId} not found`);
      }

      // Get current batch quantity with row-level lock
      const [batch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, originalMovement.batchId))
        .for("update"); // Row-level lock

      if (!batch) {
        throw new Error(`Batch ${originalMovement.batchId} not found`);
      }

      const onHandQty = parseFloat(batch.onHandQty || "0");
      const originalChange = parseFloat(originalMovement.quantityChange);

      if (isNaN(originalChange)) {
        throw new Error("Invalid original quantity change");
      }

      // Reverse the change (negate it)
      const reversalChange = -originalChange;
      const newQty = onHandQty + reversalChange;

      if (newQty < 0) {
        throw new Error(
          `Cannot reverse movement: would result in negative inventory (${newQty})`
        );
      }

      // Update batch quantity
      await tx
        .update(batches)
        .set({ onHandQty: newQty.toString() })
        .where(eq(batches.id, originalMovement.batchId));

      // Record reversal movement
      const [created] = await tx
        .insert(inventoryMovements)
        .values({
          batchId: originalMovement.batchId,
          inventoryMovementType: "ADJUSTMENT",
          quantityChange:
            reversalChange >= 0
              ? `+${reversalChange}`
              : reversalChange.toString(),
          quantityBefore: onHandQty.toString(),
          quantityAfter: newQty.toString(),
          referenceType: "REVERSAL",
          referenceId: movementId,
          reason,
          performedBy: userId,
        })
        .$returningId();

      if (!created) {
        throw new Error("Failed to create reversal movement");
      }

      const [record] = await tx
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.id, created.id));

      if (!record) {
        throw new Error("Reversal movement created but not found");
      }

      return record;
    });

    return movement;
  } catch (error) {
    logger.error({
      msg: "Error reversing inventory movement",
      movementId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to reverse inventory movement: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get movement summary for a batch
 * Aggregates all movements by type
 *
 * @param batchId Batch ID
 * @returns Summary of movements by type
 */
export async function getBatchMovementSummary(batchId: number): Promise<{
  batchId: number;
  totalSales: number;
  totalRefunds: number;
  totalAdjustments: number;
  totalMovements: number;
  currentQuantity: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all movements for the batch
    const movements = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.batchId, batchId))
      .orderBy(desc(inventoryMovements.createdAt));

    // Get current batch quantity
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId));

    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    // Aggregate by movement type
    let totalSales = 0;
    let totalRefunds = 0;
    let totalAdjustments = 0;

    for (const movement of movements) {
      const change = parseFloat(movement.quantityChange);

      switch (movement.inventoryMovementType) {
        case "SALE":
          totalSales += Math.abs(change);
          break;
        case "REFUND_RETURN":
          totalRefunds += Math.abs(change);
          break;
        case "ADJUSTMENT":
          totalAdjustments += Math.abs(change);
          break;
      }
    }

    return {
      batchId,
      totalSales,
      totalRefunds,
      totalAdjustments,
      totalMovements: movements.length,
      currentQuantity: batch.onHandQty || "0",
    };
  } catch (error) {
    logger.error({
      msg: "Error fetching batch movement summary",
      batchId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to fetch batch movement summary: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
