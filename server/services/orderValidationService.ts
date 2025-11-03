/**
 * Order Validation Service
 * Multi-layer validation with warnings for negative margins
 * v2.0 Sales Order Enhancements
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LineItemValidation {
  batchId: number;
  quantity: number;
  cogsPerUnit: number;
  pricePerUnit: number;
  marginPercent: number;
  isSample: boolean;
}

export interface OrderValidation {
  orderType: "QUOTE" | "SALE";
  clientId: number;
  lineItems: LineItemValidation[];
  finalTotal: number;
  overallMarginPercent: number;
}

export const orderValidationService = {
  /**
   * Validate line item data
   */
  validateLineItem(lineItem: LineItemValidation): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!lineItem.batchId) {
      errors.push("Batch ID is required");
    }

    if (lineItem.quantity <= 0) {
      errors.push("Quantity must be greater than 0");
    }

    if (lineItem.cogsPerUnit < 0) {
      errors.push("COGS per unit cannot be negative");
    }

    if (lineItem.pricePerUnit < 0) {
      errors.push("Price per unit cannot be negative");
    }

    // Warnings for negative margins
    if (lineItem.marginPercent < 0) {
      warnings.push(
        `Negative margin: ${lineItem.marginPercent.toFixed(2)}% (Batch ${lineItem.batchId})`
      );
    }

    // Warnings for very low margins (< 5%)
    if (lineItem.marginPercent >= 0 && lineItem.marginPercent < 5) {
      warnings.push(
        `Low margin: ${lineItem.marginPercent.toFixed(2)}% (Batch ${lineItem.batchId})`
      );
    }

    // Warnings for samples with price
    if (lineItem.isSample && lineItem.pricePerUnit > 0) {
      warnings.push(
        `Sample item has non-zero price: $${lineItem.pricePerUnit.toFixed(2)} (Batch ${lineItem.batchId})`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Validate entire order
   */
  validateOrder(order: OrderValidation): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!order.clientId) {
      errors.push("Client ID is required");
    }

    if (!order.lineItems || order.lineItems.length === 0) {
      errors.push("Order must have at least one line item");
    }

    // Validate each line item
    if (order.lineItems) {
      for (const lineItem of order.lineItems) {
        const lineItemResult = this.validateLineItem(lineItem);
        errors.push(...lineItemResult.errors);
        warnings.push(...lineItemResult.warnings);
      }
    }

    // Warnings for overall negative margin
    if (order.overallMarginPercent < 0) {
      warnings.push(
        `Overall order margin is negative: ${order.overallMarginPercent.toFixed(2)}%`
      );
    }

    // Warnings for overall low margin (< 10%)
    if (order.overallMarginPercent >= 0 && order.overallMarginPercent < 10) {
      warnings.push(
        `Overall order margin is low: ${order.overallMarginPercent.toFixed(2)}%`
      );
    }

    // Warnings for zero total
    if (order.finalTotal === 0) {
      warnings.push("Order total is $0.00");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Validate COGS override
   */
  validateCOGSOverride(
    originalCOGS: number,
    overriddenCOGS: number,
    reason?: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (overriddenCOGS < 0) {
      errors.push("Overridden COGS cannot be negative");
    }

    if (!reason || reason.trim() === "") {
      warnings.push("COGS override reason is recommended");
    }

    const percentChange =
      originalCOGS > 0
        ? Math.abs((overriddenCOGS - originalCOGS) / originalCOGS) * 100
        : 0;

    if (percentChange > 50) {
      warnings.push(
        `Large COGS change: ${percentChange.toFixed(0)}% from original`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Validate margin override
   */
  validateMarginOverride(marginPercent: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (marginPercent >= 100) {
      errors.push("Margin percent must be less than 100%");
    }

    if (marginPercent <= -100) {
      errors.push("Margin percent must be greater than -100%");
    }

    if (marginPercent < 0) {
      warnings.push(`Negative margin: ${marginPercent.toFixed(2)}%`);
    }

    if (marginPercent >= 0 && marginPercent < 5) {
      warnings.push(`Low margin: ${marginPercent.toFixed(2)}%`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Validate order adjustment
   */
  validateOrderAdjustment(
    adjustmentAmount: number,
    adjustmentType: "PERCENT" | "DOLLAR",
    subtotalPrice: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (adjustmentType === "PERCENT") {
      if (adjustmentAmount < -100) {
        errors.push("Discount percent cannot exceed 100%");
      }

      if (adjustmentAmount > 100) {
        warnings.push(
          `Large markup: ${adjustmentAmount.toFixed(0)}% - verify this is intentional`
        );
      }
    } else {
      // DOLLAR type
      if (Math.abs(adjustmentAmount) > subtotalPrice) {
        warnings.push(
          `Adjustment amount ($${Math.abs(adjustmentAmount).toFixed(2)}) exceeds subtotal ($${subtotalPrice.toFixed(2)})`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Validate finalization (converting draft to finalized)
   */
  validateFinalization(order: OrderValidation): ValidationResult {
    const orderResult = this.validateOrder(order);

    // Finalization requires stricter validation
    const errors = [...orderResult.errors];
    const warnings = [...orderResult.warnings];

    // Add finalization-specific checks
    if (order.finalTotal <= 0 && order.orderType === "SALE") {
      errors.push("Cannot finalize sale with zero or negative total");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};
