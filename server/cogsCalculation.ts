/**
 * COGS Calculation Module
 * Calculates Cost of Goods Sold for sales transactions
 * 
 * Supports:
 * - FIXED cost mode (single unit cost)
 * - RANGE cost mode (min/max with calculation)
 * - Client-specific COGS adjustments (percentage or fixed amount)
 */

import { getDb } from "./db";
import { batches, clients, type Batch, type Client } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { logger } from "./_core/logger";

/**
 * COGS calculation result
 */
export interface COGSResult {
  totalCOGS: number;
  lineItems: Array<{
    batchId: number;
    quantity: number;
    unitCost: number;
    lineTotal: number;
    adjustedUnitCost?: number;
    adjustmentAmount?: number;
  }>;
}

/**
 * Calculate COGS for a sale
 * @param saleData Sale data with line items
 * @param clientId Client ID (for client-specific adjustments)
 * @returns COGS calculation result
 */
export async function calculateSaleCOGS(
  saleData: {
    lineItems: Array<{
      batchId: number;
      quantity: string;
    }>;
  },
  clientId: number
): Promise<COGSResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Get client for COGS adjustments
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));
    
    const result: COGSResult = {
      totalCOGS: 0,
      lineItems: []
    };
    
    for (const item of saleData.lineItems) {
      // Get batch for cost information
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, item.batchId));
      
      if (!batch) {
        throw new Error(`Batch ${item.batchId} not found`);
      }
      
      const quantity = parseFloat(item.quantity);
      
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for batch ${item.batchId}`);
      }
      
      // Calculate base unit cost
      const unitCost = calculateBatchUnitCost(batch);
      
      // Apply client-specific adjustments
      const adjustedCost = applyClientCOGSAdjustment(unitCost, client);
      
      const lineTotal = adjustedCost * quantity;
      
      result.lineItems.push({
        batchId: item.batchId,
        quantity,
        unitCost,
        lineTotal,
        adjustedUnitCost: adjustedCost !== unitCost ? adjustedCost : undefined,
        adjustmentAmount: adjustedCost !== unitCost ? (adjustedCost - unitCost) * quantity : undefined
      });
      
      result.totalCOGS += lineTotal;
    }
    
    return result;
  } catch (error) {
    logger.error({
      msg: "Error calculating COGS",
      clientId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to calculate COGS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate unit cost for a batch
 * @param batch Batch record
 * @returns Unit cost
 */
function calculateBatchUnitCost(batch: Batch): number {
  if (batch.cogsMode === "FIXED") {
    // Use fixed unit cost
    const unitCogs = parseFloat(batch.unitCogs || "0");
    return isNaN(unitCogs) ? 0 : unitCogs;
  } else if (batch.cogsMode === "RANGE") {
    // Use average of min and max
    const minCogs = parseFloat(batch.unitCogsMin || "0");
    const maxCogs = parseFloat(batch.unitCogsMax || "0");
    
    if (isNaN(minCogs) || isNaN(maxCogs)) {
      return 0;
    }
    
    return (minCogs + maxCogs) / 2;
  }
  
  return 0;
}

/**
 * Apply client-specific COGS adjustments
 * @param baseCost Base unit cost
 * @param client Client record
 * @returns Adjusted unit cost
 */
function applyClientCOGSAdjustment(baseCost: number, client: Client | undefined): number {
  if (!client || !client.cogsAdjustmentType || client.cogsAdjustmentType === "NONE") {
    return baseCost;
  }
  
  const adjustmentValue = parseFloat(client.cogsAdjustmentValue || "0");
  
  if (isNaN(adjustmentValue) || adjustmentValue === 0) {
    return baseCost;
  }
  
  if (client.cogsAdjustmentType === "PERCENTAGE") {
    // Apply percentage adjustment
    return baseCost * (1 + adjustmentValue / 100);
  } else if (client.cogsAdjustmentType === "FIXED_AMOUNT") {
    // Apply fixed amount adjustment
    return baseCost + adjustmentValue;
  }
  
  return baseCost;
}

/**
 * Calculate COGS for multiple batches with weighted average
 * Useful for inventory valuation
 * 
 * @param batchIds Array of batch IDs
 * @returns Weighted average COGS
 */
export async function calculateWeightedAverageCOGS(batchIds: number[]): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    let totalCost = 0;
    let totalQuantity = 0;
    
    for (const batchId of batchIds) {
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, batchId));
      
      if (!batch) continue;
      
      const unitCost = calculateBatchUnitCost(batch);
      const quantity = parseFloat(batch.onHandQty || "0");
      
      if (!isNaN(quantity) && quantity > 0) {
        totalCost += unitCost * quantity;
        totalQuantity += quantity;
      }
    }
    
    return totalQuantity > 0 ? totalCost / totalQuantity : 0;
  } catch (error) {
    logger.error({
      msg: "Error calculating weighted average COGS",
      batchIds,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to calculate weighted average COGS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate total inventory value
 * Sum of (unit cost × on-hand quantity) for all active batches
 * 
 * @returns Total inventory value
 */
export async function calculateTotalInventoryValue(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const allBatches = await db
      .select()
      .from(batches)
      .where(eq(batches.batchStatus, "LIVE"));
    
    let totalValue = 0;
    
    for (const batch of allBatches) {
      const unitCost = calculateBatchUnitCost(batch);
      const quantity = parseFloat(batch.onHandQty || "0");
      
      if (!isNaN(quantity) && quantity > 0) {
        totalValue += unitCost * quantity;
      }
    }
    
    return totalValue;
  } catch (error) {
    logger.error({
      msg: "Error calculating total inventory value",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to calculate total inventory value: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get COGS breakdown by product
 * Useful for profitability analysis
 * 
 * @param productId Product ID
 * @returns COGS breakdown
 */
export async function getCOGSBreakdownByProduct(productId: number): Promise<{
  averageCOGS: number;
  minCOGS: number;
  maxCOGS: number;
  totalQuantity: number;
  totalValue: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const productBatches = await db
      .select()
      .from(batches)
      .where(eq(batches.productId, productId));
    
    let totalCost = 0;
    let totalQuantity = 0;
    let minCOGS = Infinity;
    let maxCOGS = 0;
    
    for (const batch of productBatches) {
      const unitCost = calculateBatchUnitCost(batch);
      const quantity = parseFloat(batch.onHandQty || "0");
      
      if (!isNaN(quantity) && quantity > 0) {
        totalCost += unitCost * quantity;
        totalQuantity += quantity;
        minCOGS = Math.min(minCOGS, unitCost);
        maxCOGS = Math.max(maxCOGS, unitCost);
      }
    }
    
    return {
      averageCOGS: totalQuantity > 0 ? totalCost / totalQuantity : 0,
      minCOGS: minCOGS === Infinity ? 0 : minCOGS,
      maxCOGS,
      totalQuantity,
      totalValue: totalCost
    };
  } catch (error) {
    logger.error({
      msg: "Error getting COGS breakdown by product",
      productId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to get COGS breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

