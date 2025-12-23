import Decimal from "decimal.js";

// Configure Decimal for financial precision
// 20 digits of precision is sufficient for currency; ROUND_HALF_UP is standard for currency
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = string | number | Decimal;

/**
 * Financial Math Utility
 * Wrapper around decimal.js to ensure precision in currency calculations.
 * Prevents IEEE 754 floating point errors common in JS math.
 */
export const financialMath = {
  /**
   * Add two values
   */
  add(a: MoneyInput, b: MoneyInput): string {
    return new Decimal(a).plus(new Decimal(b)).toFixed(2);
  },

  /**
   * Subtract b from a
   */
  subtract(a: MoneyInput, b: MoneyInput): string {
    return new Decimal(a).minus(new Decimal(b)).toFixed(2);
  },

  /**
   * Multiply a by b
   * Result is NOT automatically rounded to 2 decimals to allow for intermediate calculations
   * Use toFixed(2) or round() on the result if it's a final currency value
   */
  multiply(a: MoneyInput, b: MoneyInput): string {
    return new Decimal(a).times(new Decimal(b)).toString();
  },

  /**
   * Divide a by b
   */
  divide(a: MoneyInput, b: MoneyInput): string {
    if (new Decimal(b).isZero()) {
      throw new Error("Division by zero in financial calculation");
    }
    return new Decimal(a).dividedBy(new Decimal(b)).toString();
  },

  /**
   * Calculate Price based on Cost and Margin %
   * Formula: Price = Cost / (1 - (Margin / 100))
   */
  calculateMarginPrice(cost: MoneyInput, marginPercent: MoneyInput): string {
    const costDec = new Decimal(cost);
    const marginDec = new Decimal(marginPercent);
    
    // Safety check: Margin cannot be 100% or more (infinite price)
    if (marginDec.greaterThanOrEqualTo(100)) {
      throw new Error("Margin cannot be 100% or greater");
    }

    const divisor = new Decimal(1).minus(marginDec.dividedBy(100));
    return costDec.dividedBy(divisor).toFixed(2);
  },

  /**
   * Convert to fixed decimal string (usually 2 for currency, 4 for high-precision qty)
   */
  toFixed(value: MoneyInput, decimals: number = 2): string {
    return new Decimal(value).toFixed(decimals);
  },

  /**
   * Compare if a > b
   */
  gt(a: MoneyInput, b: MoneyInput): boolean {
    return new Decimal(a).greaterThan(new Decimal(b));
  },

  /**
   * Compare if a >= b
   */
  gte(a: MoneyInput, b: MoneyInput): boolean {
    return new Decimal(a).greaterThanOrEqualTo(new Decimal(b));
  },

  /**
   * Compare if a < b
   */
  lt(a: MoneyInput, b: MoneyInput): boolean {
    return new Decimal(a).lessThan(new Decimal(b));
  },

  /**
   * Compare if a == b
   */
  eq(a: MoneyInput, b: MoneyInput): boolean {
    return new Decimal(a).equals(new Decimal(b));
  },

  /**
   * Return 0.00
   */
  zero(): string {
    return "0.00";
  }
};
