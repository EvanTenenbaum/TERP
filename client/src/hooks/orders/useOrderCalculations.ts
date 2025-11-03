/**
 * useOrderCalculations Hook
 * Real-time order calculations (totals, margins, prices)
 * v2.0 Sales Order Enhancements
 */

import { useMemo } from "react";

export interface LineItem {
  batchId: number;
  quantity: number;
  cogsPerUnit: number;
  marginPercent?: number;
  marginDollar?: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderAdjustment {
  amount: number;
  type: "PERCENT" | "DOLLAR";
  mode: "DISCOUNT" | "MARKUP";
}

export interface OrderTotals {
  subtotal: number;
  totalCogs: number;
  totalMargin: number;
  avgMarginPercent: number;
  adjustmentAmount: number;
  total: number;
}

/**
 * Calculate price from COGS and margin percent
 */
function calculatePriceFromMargin(cogs: number, marginPercent: number): number {
  if (marginPercent >= 100) {
    return cogs;
  }
  return cogs / (1 - marginPercent / 100);
}

/**
 * Calculate margin dollar from COGS and price
 */
function calculateMarginDollar(cogs: number, price: number): number {
  return price - cogs;
}

/**
 * Round to 2 decimal places
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate line item with price and margin
 */
export function calculateLineItem(
  batchId: number,
  quantity: number,
  cogsPerUnit: number,
  marginPercent: number
): LineItem {
  const unitPrice = round(calculatePriceFromMargin(cogsPerUnit, marginPercent));
  const marginDollar = round(calculateMarginDollar(cogsPerUnit, unitPrice));
  const lineTotal = round(quantity * unitPrice);

  return {
    batchId,
    quantity,
    cogsPerUnit,
    marginPercent,
    marginDollar,
    unitPrice,
    lineTotal,
  };
}

/**
 * Calculate order totals from line items
 */
export function calculateOrderTotals(
  lineItems: LineItem[],
  adjustment: OrderAdjustment | null
): OrderTotals {
  // Calculate subtotal
  const subtotal = round(
    lineItems.reduce((sum, item) => sum + item.lineTotal, 0)
  );

  // Calculate total COGS
  const totalCogs = round(
    lineItems.reduce((sum, item) => sum + item.cogsPerUnit * item.quantity, 0)
  );

  // Calculate total margin
  const totalMargin = round(subtotal - totalCogs);

  // Calculate average margin percent
  const avgMarginPercent =
    subtotal > 0 ? round((totalMargin / subtotal) * 100) : 0;

  // Calculate adjustment amount
  let adjustmentAmount = 0;
  if (adjustment) {
    if (adjustment.type === "PERCENT") {
      adjustmentAmount = (subtotal * adjustment.amount) / 100;
    } else {
      adjustmentAmount = adjustment.amount;
    }

    // Apply mode (discount is negative, markup is positive)
    if (adjustment.mode === "DISCOUNT") {
      adjustmentAmount = -Math.abs(adjustmentAmount);
    } else {
      adjustmentAmount = Math.abs(adjustmentAmount);
    }

    adjustmentAmount = round(adjustmentAmount);
  }

  // Calculate final total
  const total = round(subtotal + adjustmentAmount);

  return {
    subtotal,
    totalCogs,
    totalMargin,
    avgMarginPercent,
    adjustmentAmount,
    total,
  };
}

/**
 * Hook for order calculations
 * Automatically recalculates when line items or adjustment changes
 */
export function useOrderCalculations(
  lineItems: LineItem[],
  adjustment: OrderAdjustment | null
) {
  const totals = useMemo(() => {
    return calculateOrderTotals(lineItems, adjustment);
  }, [lineItems, adjustment]);

  const warnings = useMemo(() => {
    const warns: string[] = [];

    // Check for negative margin
    lineItems.forEach((item, index) => {
      const marginPercent = item.marginPercent || 0;
      if (marginPercent < 0) {
        warns.push(`Line ${index + 1}: Negative margin (loss leader)`);
      } else if (marginPercent < 5) {
        warns.push(`Line ${index + 1}: Very low margin (${marginPercent.toFixed(1)}%)`);
      }
    });

    // Check for negative total
    if (totals.total < 0) {
      warns.push("Order total is negative");
    }

    // Check for large adjustment
    if (adjustment && Math.abs(totals.adjustmentAmount) > totals.subtotal * 0.5) {
      warns.push(
        `Large ${adjustment.mode.toLowerCase()} (${Math.abs(totals.adjustmentAmount / totals.subtotal * 100).toFixed(0)}% of subtotal)`
      );
    }

    return warns;
  }, [lineItems, adjustment, totals]);

  const isValid = useMemo(() => {
    // Order is valid if total is non-negative and we have line items
    return totals.total >= 0 && lineItems.length > 0;
  }, [totals.total, lineItems.length]);

  return {
    totals,
    warnings,
    isValid,
    calculateLineItem,
  };
}

