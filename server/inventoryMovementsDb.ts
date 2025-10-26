/**
 * Inventory Movements Database Access Layer
 * Handles all inventory movement tracking and automatic updates
 * 
 * This module implements:
 * - Automatic inventory updates on sales/refunds
 * - Inventory movement logging
 * - Real-time inventory validation
 * - Batch quantity tracking
 */

import { getDb } from "./db";
import { 
  inventoryMovements,
  batches,
  type InventoryMovement,
  type InsertInventoryMovement,
  type Batch
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Record an inventory movement
 * @param movement Inventory movement data
 * @returns The created inventory movement record
 */
export async function recordInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const [created] = await db.insert(inventoryMovements).values(movement).$returningId();
    
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
    console.error("Error recording inventory movement:", error);
    throw new Error(`Failed to record inventory movement: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrease inventory for a sale
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
    // Get current batch quantity
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId));
    
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    const onHandQty = parseFloat(batch.onHandQty || "0");
    const decreaseQty = parseFloat(quantity);
    
    if (isNaN(decreaseQty) || decreaseQty <= 0) {
      throw new Error("Invalid quantity");
    }
    
    if (decreaseQty > onHandQty) {
      throw new Error(`Insufficient inventory. Available: ${onHandQty}, Requested: ${decreaseQty}`);
    }
    
    const newQty = onHandQty - decreaseQty;
    
    // Update batch quantity
    await db
      .update(batches)
      .set({ onHandQty: newQty.toString() })
      .where(eq(batches.id, batchId));
    
    // Record movement
    return await recordInventoryMovement({
      batchId,
      movementType: "SALE",
      quantityChange: `-${quantity}`,
      quantityBefore: onHandQty.toString(),
      quantityAfter: newQty.toString(),
      referenceType,
      referenceId,
      reason,
      performedBy: userId
    });
  } catch (error) {
    console.error("Error decreasing inventory:", error);
    throw new Error(`Failed to decrease inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Increase inventory for a refund return
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
    // Get current batch quantity
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId));
    
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
    await db
      .update(batches)
      .set({ onHandQty: newQty.toString() })
      .where(eq(batches.id, batchId));
    
    // Record movement
    return await recordInventoryMovement({
      batchId,
      movementType: "REFUND_RETURN",
      quantityChange: `+${quantity}`,
      quantityBefore: onHandQty.toString(),
      quantityAfter: newQty.toString(),
      referenceType,
      referenceId,
      reason,
      performedBy: userId
    });
  } catch (error) {
    console.error("Error increasing inventory:", error);
    throw new Error(`Failed to increase inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Adjust inventory (manual adjustment)
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
  userId: number
): Promise<InventoryMovement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Get current batch quantity
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId));
    
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
    await db
      .update(batches)
      .set({ onHandQty: newQty.toString() })
      .where(eq(batches.id, batchId));
    
    // Record movement
    return await recordInventoryMovement({
      batchId,
      movementType: "ADJUSTMENT",
      quantityChange: changeStr,
      quantityBefore: onHandQty.toString(),
      quantityAfter: newQty.toString(),
      referenceType: "MANUAL_ADJUSTMENT",
      referenceId: null,
      reason,
      performedBy: userId
    });
  } catch (error) {
    console.error("Error adjusting inventory:", error);
    throw new Error(`Failed to adjust inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get inventory movements for a batch
 * @param batchId Batch ID
 * @param limit Maximum number of results
 * @returns Array of inventory movements
 */
export async function getBatchMovements(batchId: number, limit: number = 100): Promise<InventoryMovement[]> {
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
    console.error("Error fetching batch movements:", error);
    throw new Error(`Failed to fetch batch movements: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    console.error("Error fetching movements by reference:", error);
    throw new Error(`Failed to fetch movements by reference: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      shortfall
    };
  } catch (error) {
    console.error("Error validating inventory availability:", error);
    throw new Error(`Failed to validate inventory availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get inventory movement summary for a batch
 * @param batchId Batch ID
 * @returns Summary of movements by type
 */
export async function getBatchMovementSummary(batchId: number): Promise<{
  totalIntake: number;
  totalSales: number;
  totalRefunds: number;
  totalAdjustments: number;
  currentQuantity: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const movements = await getBatchMovements(batchId, 10000); // Get all movements
    
    const summary = movements.reduce((acc, movement) => {
      const change = parseFloat(movement.quantityChange);
      
      switch (movement.movementType) {
        case "INTAKE":
          acc.totalIntake += change;
          break;
        case "SALE":
          acc.totalSales += Math.abs(change);
          break;
        case "REFUND_RETURN":
          acc.totalRefunds += change;
          break;
        case "ADJUSTMENT":
          acc.totalAdjustments += change;
          break;
      }
      
      return acc;
    }, {
      totalIntake: 0,
      totalSales: 0,
      totalRefunds: 0,
      totalAdjustments: 0,
      currentQuantity: 0
    });
    
    // Get current quantity from batch
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId));
    
    if (batch) {
      summary.currentQuantity = parseFloat(batch.onHandQty || "0");
    }
    
    return summary;
  } catch (error) {
    console.error("Error getting batch movement summary:", error);
    throw new Error(`Failed to get batch movement summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reverse an inventory movement (for corrections)
 * @param movementId Movement ID to reverse
 * @param reason Reason for reversal
 * @param userId User ID performing the reversal
 * @returns The reversal movement record
 */
export async function reverseInventoryMovement(
  movementId: number,
  reason: string,
  userId: number
): Promise<InventoryMovement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Get the original movement
    const [originalMovement] = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.id, movementId));
    
    if (!originalMovement) {
      throw new Error("Original movement not found");
    }
    
    // Get current batch quantity
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, originalMovement.batchId));
    
    if (!batch) {
      throw new Error("Batch not found");
    }
    
    const onHandQty = parseFloat(batch.onHandQty || "0");
    const originalChange = parseFloat(originalMovement.quantityChange);
    const reversalChange = -originalChange;
    const newQty = onHandQty + reversalChange;
    
    if (newQty < 0) {
      throw new Error("Reversal would result in negative inventory");
    }
    
    // Update batch quantity
    await db
      .update(batches)
      .set({ onHandQty: newQty.toString() })
      .where(eq(batches.id, originalMovement.batchId));
    
    // Create reversal movement
    return await recordInventoryMovement({
      batchId: originalMovement.batchId,
      movementType: "ADJUSTMENT",
      quantityChange: reversalChange >= 0 ? `+${reversalChange}` : reversalChange.toString(),
      quantityBefore: onHandQty.toString(),
      quantityAfter: newQty.toString(),
      referenceType: "MOVEMENT_REVERSAL",
      referenceId: movementId,
      reason: `Reversal of movement #${movementId}: ${reason}`,
      performedBy: userId
    });
  } catch (error) {
    console.error("Error reversing inventory movement:", error);
    throw new Error(`Failed to reverse inventory movement: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

