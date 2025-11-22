/**
 * COGS Calculator
 * Simplified COGS calculation with client-level adjustments
 * Part of Quote/Sales Module - Refined Approach
 */

import type { Batch } from "../drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface CogsCalculationInput {
  batch: {
    id: number;
    cogsMode: 'FIXED' | 'RANGE';
    unitCogs?: string | null;
    unitCogsMin?: string | null;
    unitCogsMax?: string | null;
  };
  client: {
    id: number;
    cogsAdjustmentType: 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT';
    cogsAdjustmentValue: string;
  };
  context: {
    quantity: number;
    salePrice: number;
    paymentTerms?: string;
  };
}

export interface CogsCalculationResult {
  unitCogs: number;
  cogsSource: 'FIXED' | 'MIDPOINT' | 'CLIENT_ADJUSTMENT' | 'RULE' | 'MANUAL';
  appliedRule?: string;
  unitMargin: number;
  marginPercent: number;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate COGS for a batch item
 * Simplified approach: base COGS + optional client adjustment
 */
export function calculateCogs(input: CogsCalculationInput): CogsCalculationResult {
  const { batch, client, context } = input;
  
  // 1. Get base COGS
  let baseCogs: number;
  let cogsSource: CogsCalculationResult['cogsSource'];
  
  if (batch.cogsMode === 'FIXED') {
    baseCogs = parseFloat(batch.unitCogs || '0');
    cogsSource = 'FIXED';
  } else {
    // RANGE mode - use midpoint
    const min = parseFloat(batch.unitCogsMin || '0');
    const max = parseFloat(batch.unitCogsMax || '0');
    baseCogs = (min + max) / 2;
    cogsSource = 'MIDPOINT';
  }
  
  let finalCogs = baseCogs;
  
  // 2. Apply client adjustment if configured
  if (client.cogsAdjustmentType === 'PERCENTAGE') {
    const adjustmentPercent = parseFloat(client.cogsAdjustmentValue);
    finalCogs = baseCogs * (1 - adjustmentPercent / 100);
    cogsSource = 'CLIENT_ADJUSTMENT';
  } else if (client.cogsAdjustmentType === 'FIXED_AMOUNT') {
    const adjustmentAmount = parseFloat(client.cogsAdjustmentValue);
    finalCogs = baseCogs - adjustmentAmount;
    cogsSource = 'CLIENT_ADJUSTMENT';
  }
  
  // 3. Ensure within range (if RANGE mode)
  if (batch.cogsMode === 'RANGE') {
    const min = parseFloat(batch.unitCogsMin || '0');
    const max = parseFloat(batch.unitCogsMax || '0');
    finalCogs = Math.max(min, Math.min(max, finalCogs));
  }
  
  // 4. Ensure non-negative
  finalCogs = Math.max(0, finalCogs);
  
  // 5. Calculate margin (with division by zero check)
  const unitMargin = context.salePrice - finalCogs;
  const marginPercent = context.salePrice > 0 && Math.abs(context.salePrice) > 0.01
    ? (unitMargin / context.salePrice) * 100 
    : 0;
  
  return {
    unitCogs: finalCogs,
    cogsSource,
    unitMargin,
    marginPercent,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get base COGS from batch (without adjustments)
 */
export function getBaseCogs(batch: Pick<Batch, 'cogsMode' | 'unitCogs' | 'unitCogsMin' | 'unitCogsMax'>): number {
  if (batch.cogsMode === 'FIXED') {
    return parseFloat(batch.unitCogs || '0');
  } else {
    const min = parseFloat(batch.unitCogsMin || '0');
    const max = parseFloat(batch.unitCogsMax || '0');
    return (min + max) / 2;
  }
}

/**
 * Apply client adjustment to base COGS
 */
export function applyClientAdjustment(
  baseCogs: number,
  adjustmentType: 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT',
  adjustmentValue: string
): number {
  if (adjustmentType === 'PERCENTAGE') {
    const percent = parseFloat(adjustmentValue);
    return baseCogs * (1 - percent / 100);
  } else if (adjustmentType === 'FIXED_AMOUNT') {
    const amount = parseFloat(adjustmentValue);
    return baseCogs - amount;
  }
  return baseCogs;
}

/**
 * Calculate margin color category for UI
 */
export function getMarginCategory(marginPercent: number): 'excellent' | 'good' | 'fair' | 'low' | 'negative' {
  if (marginPercent >= 70) return 'excellent';
  if (marginPercent >= 50) return 'good';
  if (marginPercent >= 30) return 'fair';
  if (marginPercent >= 15) return 'low';
  return 'negative';
}

/**
 * Calculate due date based on payment terms
 */
export function calculateDueDate(paymentTerms: string, saleDate: Date = new Date()): Date {
  const dueDate = new Date(saleDate);
  
  switch (paymentTerms) {
    case 'NET_7':
      dueDate.setDate(dueDate.getDate() + 7);
      break;
    case 'NET_15':
      dueDate.setDate(dueDate.getDate() + 15);
      break;
    case 'NET_30':
      dueDate.setDate(dueDate.getDate() + 30);
      break;
    case 'COD':
      // Due immediately
      break;
    case 'PARTIAL':
    case 'CONSIGNMENT':
      // Custom due date, return 30 days as default
      dueDate.setDate(dueDate.getDate() + 30);
      break;
  }
  
  return dueDate;
}

