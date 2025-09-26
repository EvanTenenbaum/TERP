/**
 * COGS (Cost of Goods Sold) Utility Functions
 * 
 * This module provides utilities for calculating COGS based on BatchCost
 * records with effective dates, as specified in CONTEXT.md.
 * 
 * Key Business Rule: COGS = BatchCost active at allocationDate for each OrderItem
 */

import prisma from '@/lib/prisma';

/**
 * Get the active BatchCost for a given batch at a specific date
 * 
 * @param batchId - The ID of the batch
 * @param atDate - The date to check for active cost (typically allocationDate)
 * @returns The active BatchCost record or null if none found
 */
export async function getActiveBatchCostDb(db: Pick<typeof prisma, 'batchCost'> | any, batchId: string, atDate: Date) {
  try {
    const activeCost = await db.batchCost.findFirst({
      where: { batchId, effectiveFrom: { lte: atDate } },
      orderBy: { effectiveFrom: 'desc' },
    })
    return activeCost
  } catch (error) {
    console.error('Error fetching active batch cost:', error)
    throw new Error(`Failed to get active batch cost for batch ${batchId}`)
  }
}

export async function getActiveBatchCost(batchId: string, atDate: Date) {
  return getActiveBatchCostDb(prisma, batchId, atDate)
}

/**
 * Get the current active BatchCost for a batch (as of today)
 * 
 * @param batchId - The ID of the batch
 * @returns The current active BatchCost record or null if none found
 */
export async function getCurrentBatchCost(batchId: string) {
  return getActiveBatchCost(batchId, new Date());
}

/**
 * Calculate COGS for an OrderItem based on its allocation date
 * 
 * @param orderItemId - The ID of the order item
 * @returns Object containing COGS calculation details
 */
export async function calculateOrderItemCOGS(orderItemId: string) {
  try {
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        batch: true
      }
    });

    if (!orderItem) {
      throw new Error(`OrderItem ${orderItemId} not found`);
    }

    if (!orderItem.batchId || !orderItem.allocationDate) {
      return {
        orderItemId,
        cogs: null,
        error: 'OrderItem not allocated to batch'
      };
    }

    const activeCost = await getActiveBatchCost(
      orderItem.batchId,
      orderItem.allocationDate
    );

    if (!activeCost) {
      return {
        orderItemId,
        cogs: null,
        error: 'No active batch cost found for allocation date'
      };
    }

    const totalCOGS = activeCost.unitCost * orderItem.quantity;

    return {
      orderItemId,
      batchId: orderItem.batchId,
      allocationDate: orderItem.allocationDate,
      quantity: orderItem.quantity,
      unitCost: activeCost.unitCost,
      cogs: totalCOGS,
      batchCostId: activeCost.id,
      effectiveFrom: activeCost.effectiveFrom
    };
  } catch (error) {
    console.error('Error calculating COGS:', error);
    throw new Error(`Failed to calculate COGS for OrderItem ${orderItemId}`);
  }
}

/**
 * Get cost history for a batch
 * 
 * @param batchId - The ID of the batch
 * @returns Array of BatchCost records ordered by effectiveFrom date
 */
export async function getBatchCostHistory(batchId: string) {
  try {
    const costHistory = await prisma.batchCost.findMany({
      where: {
        batchId: batchId
      },
      orderBy: {
        effectiveFrom: 'desc'
      }
    });

    return costHistory;
  } catch (error) {
    console.error('Error fetching batch cost history:', error);
    throw new Error(`Failed to get cost history for batch ${batchId}`);
  }
}

/**
 * Create a new BatchCost record
 * 
 * @param batchId - The ID of the batch
 * @param unitCost - The unit cost in cents (integer)
 * @param effectiveFrom - The date this cost becomes effective
 * @returns The created BatchCost record
 */
export async function createBatchCost(
  batchId: string,
  unitCost: number,
  effectiveFrom: Date = new Date()
) {
  try {
    // Validate that unitCost is an integer (cents)
    if (!Number.isInteger(unitCost)) {
      throw new Error('Unit cost must be an integer (cents)');
    }

    const newCost = await prisma.batchCost.create({
      data: {
        batchId,
        unitCost,
        effectiveFrom
      }
    });

    return newCost;
  } catch (error) {
    console.error('Error creating batch cost:', error);
    throw new Error(`Failed to create batch cost for batch ${batchId}`);
  }
}

/**
 * Format cost from cents to dollars for display
 * 
 * @param cents - Cost in cents (integer)
 * @returns Formatted dollar amount as string
 */
export function formatCostForDisplay(cents: number): string {
  if (cents === null || cents === undefined) return '$0.00'
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Parse dollar amount to cents for storage
 * 
 * @param dollarAmount - Dollar amount as string or number
 * @returns Cost in cents (integer)
 */
export function parseCostToCents(dollarAmount: string | number): number {
  const amount = typeof dollarAmount === 'string' 
    ? parseFloat(dollarAmount.replace(/[$,]/g, ''))
    : dollarAmount;
  
  if (isNaN(amount)) {
    throw new Error('Invalid dollar amount');
  }
  
  return Math.round(amount * 100);
}
