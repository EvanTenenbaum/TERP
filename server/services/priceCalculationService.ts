/**
 * Price Calculation Service
 * Handles order totals, adjustments, and distributions
 * v2.0 Sales Order Enhancements
 */

export interface LineItemTotals {
  subtotalCOGS: number;
  subtotalPrice: number;
  subtotalMargin: number;
}

export interface OrderTotals extends LineItemTotals {
  adjustmentAmount: number;
  finalTotal: number;
  overallMarginPercent: number;
  avgMarginPercent: number;
  avgMarginDollar: number;
  subtotal: number;
}

export interface OrderAdjustment {
  amount: number;
  type: "PERCENT" | "DOLLAR";
  mode: "DISCOUNT" | "MARKUP";
}

export interface LineItemWithPrice {
  quantity: number;
  cogsPerUnit: number;
  pricePerUnit: number;
}

export const priceCalculationService = {
  /**
   * Calculate line item totals (COGS, price, margin)
   */
  calculateLineItemTotals(lineItems: LineItemWithPrice[]): LineItemTotals {
    let subtotalCOGS = 0;
    let subtotalPrice = 0;

    for (const item of lineItems) {
      subtotalCOGS += item.quantity * item.cogsPerUnit;
      subtotalPrice += item.quantity * item.pricePerUnit;
    }

    const subtotalMargin = subtotalPrice - subtotalCOGS;

    return {
      subtotalCOGS: Math.round(subtotalCOGS * 100) / 100,
      subtotalPrice: Math.round(subtotalPrice * 100) / 100,
      subtotalMargin: Math.round(subtotalMargin * 100) / 100,
    };
  },

  /**
   * Calculate adjustment amount based on type and mode
   */
  calculateAdjustmentAmount(
    subtotalPrice: number,
    adjustment: OrderAdjustment
  ): number {
    let adjustmentAmount = 0;

    if (adjustment.type === "PERCENT") {
      adjustmentAmount = (subtotalPrice * adjustment.amount) / 100;
    } else {
      adjustmentAmount = adjustment.amount;
    }

    // Apply mode (discount = negative, markup = positive)
    if (adjustment.mode === "DISCOUNT") {
      adjustmentAmount = -Math.abs(adjustmentAmount);
    } else {
      adjustmentAmount = Math.abs(adjustmentAmount);
    }

    return Math.round(adjustmentAmount * 100) / 100;
  },

  /**
   * Calculate order totals with optional adjustment
   */
  calculateOrderTotals(
    lineItems: LineItemWithPrice[],
    adjustment?: OrderAdjustment
  ): OrderTotals {
    const lineItemTotals = this.calculateLineItemTotals(lineItems);

    let adjustmentAmount = 0;
    if (adjustment) {
      adjustmentAmount = this.calculateAdjustmentAmount(
        lineItemTotals.subtotalPrice,
        adjustment
      );
    }

    const finalTotal = lineItemTotals.subtotalPrice + adjustmentAmount;
    const finalMargin = finalTotal - lineItemTotals.subtotalCOGS;
    const overallMarginPercent =
      finalTotal > 0 ? (finalMargin / finalTotal) * 100 : 0;

    const avgMarginPercent = Math.round(overallMarginPercent * 100) / 100;
    const avgMarginDollar = Math.round(finalMargin * 100) / 100;

    return {
      subtotalCOGS: lineItemTotals.subtotalCOGS,
      subtotalPrice: lineItemTotals.subtotalPrice,
      subtotalMargin: lineItemTotals.subtotalMargin,
      adjustmentAmount,
      finalTotal: Math.round(finalTotal * 100) / 100,
      overallMarginPercent: avgMarginPercent,
      avgMarginPercent,
      avgMarginDollar,
      subtotal: lineItemTotals.subtotalPrice,
    };
  },

  /**
   * Distribute adjustment amount across line items proportionally
   * Used when converting adjustment to per-item price changes
   */
  distributeAdjustment(
    lineItems: LineItemWithPrice[],
    adjustmentAmount: number
  ): number[] {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.pricePerUnit,
      0
    );

    if (subtotal === 0) {
      return lineItems.map(() => 0);
    }

    return lineItems.map(item => {
      const itemTotal = item.quantity * item.pricePerUnit;
      const itemProportion = itemTotal / subtotal;
      const itemAdjustment = adjustmentAmount * itemProportion;
      return Math.round(itemAdjustment * 100) / 100;
    });
  },

  /**
   * Calculate final price per unit after distributing adjustment
   */
  calculateAdjustedPrices(
    lineItems: LineItemWithPrice[],
    adjustment: OrderAdjustment
  ): number[] {
    const lineItemTotals = this.calculateLineItemTotals(lineItems);
    const adjustmentAmount = this.calculateAdjustmentAmount(
      lineItemTotals.subtotalPrice,
      adjustment
    );

    const distributedAdjustments = this.distributeAdjustment(
      lineItems,
      adjustmentAmount
    );

    return lineItems.map((item, index) => {
      const itemTotal = item.quantity * item.pricePerUnit;
      const adjustedTotal = itemTotal + distributedAdjustments[index];
      const adjustedPricePerUnit = adjustedTotal / item.quantity;
      return Math.round(adjustedPricePerUnit * 100) / 100;
    });
  },

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  },

  /**
   * Format percentage for display
   */
  formatPercent(percent: number): string {
    return `${percent.toFixed(2)}%`;
  },
};
