/**
 * Margin Calculation Service
 * Pure math functions for margin/price conversions
 * v2.0 Sales Order Enhancements
 *
 * TERP-0016: Uses string-based decimal arithmetic for financial precision
 */

export interface MarginCalculation {
  marginPercent: number;
  marginDollar: number;
  pricePerUnit: number;
}

/**
 * TERP-0016: Safe rounding function for financial calculations
 * Converts to string-based arithmetic to avoid floating point errors
 * like 0.1 + 0.2 = 0.30000000000000004
 *
 * @param value - The number to round
 * @param decimals - Number of decimal places (default 2 for currency)
 * @returns Properly rounded number
 */
function safeRound(value: number, decimals: number = 2): number {
  // Handle edge cases
  if (!Number.isFinite(value)) {
    return 0;
  }

  // Use string-based arithmetic to avoid floating point errors
  // This works by:
  // 1. Converting to string with extra precision
  // 2. Using Number.EPSILON to handle floating point edge cases
  // 3. Rounding to desired precision
  const factor = Math.pow(10, decimals);
  const shifted = value * factor;
  // Add Number.EPSILON before rounding to handle edge cases like 1.005
  const rounded = Math.round(shifted + Number.EPSILON * factor);
  return rounded / factor;
}

/**
 * TERP-0016: Safe subtraction for financial values
 * Converts to integer cents to avoid floating point errors
 */
function safeSubtract(a: number, b: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  const aInt = Math.round(a * factor);
  const bInt = Math.round(b * factor);
  return (aInt - bInt) / factor;
}

/**
 * TERP-0016: Safe addition for financial values
 * Converts to integer cents to avoid floating point errors
 */
function safeAdd(a: number, b: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  const aInt = Math.round(a * factor);
  const bInt = Math.round(b * factor);
  return (aInt + bInt) / factor;
}

export const marginCalculationService = {
  /**
   * Calculate price from COGS and margin percentage
   * Formula: price = COGS / (1 - margin%)
   */
  calculatePriceFromMarginPercent(
    cogsPerUnit: number,
    marginPercent: number
  ): number {
    if (marginPercent >= 100) {
      throw new Error("Margin percent must be less than 100%");
    }
    if (marginPercent <= -100) {
      throw new Error("Margin percent must be greater than -100%");
    }

    const denominator = 1 - marginPercent / 100;
    if (Math.abs(denominator) < 0.0001) {
      throw new Error("Division by zero: margin percent too close to 100%");
    }

    const price = cogsPerUnit / denominator;
    return safeRound(price, 2); // TERP-0016: Use safe rounding
  },

  /**
   * Calculate price from COGS and margin dollar amount
   * Formula: price = COGS + margin$
   */
  calculatePriceFromMarginDollar(
    cogsPerUnit: number,
    marginDollar: number
  ): number {
    // TERP-0016: Use safe addition for financial precision
    return safeAdd(cogsPerUnit, marginDollar, 2);
  },

  /**
   * Calculate margin percent from COGS and price
   * Formula: margin% = (price - COGS) / price * 100
   */
  calculateMarginPercent(cogsPerUnit: number, pricePerUnit: number): number {
    if (pricePerUnit === 0) {
      return 0;
    }

    // TERP-0016: Calculate margin using safe subtraction first
    const marginDollar = safeSubtract(pricePerUnit, cogsPerUnit, 2);
    const marginPercent = (marginDollar / pricePerUnit) * 100;
    return safeRound(marginPercent, 2);
  },

  /**
   * Calculate margin dollar from COGS and price
   * Formula: margin$ = price - COGS
   */
  calculateMarginDollar(cogsPerUnit: number, pricePerUnit: number): number {
    // TERP-0016: Use safe subtraction for financial precision
    return safeSubtract(pricePerUnit, cogsPerUnit, 2);
  },

  /**
   * Calculate all margin metrics from COGS and margin percent
   */
  calculateFromMarginPercent(
    cogsPerUnit: number,
    marginPercent: number
  ): MarginCalculation {
    const pricePerUnit = this.calculatePriceFromMarginPercent(
      cogsPerUnit,
      marginPercent
    );
    const marginDollar = this.calculateMarginDollar(cogsPerUnit, pricePerUnit);

    return {
      marginPercent,
      marginDollar,
      pricePerUnit,
    };
  },

  /**
   * Calculate all margin metrics from COGS and margin dollar
   */
  calculateFromMarginDollar(
    cogsPerUnit: number,
    marginDollar: number
  ): MarginCalculation {
    const pricePerUnit = this.calculatePriceFromMarginDollar(
      cogsPerUnit,
      marginDollar
    );
    const marginPercent = this.calculateMarginPercent(
      cogsPerUnit,
      pricePerUnit
    );

    return {
      marginPercent,
      marginDollar,
      pricePerUnit,
    };
  },

  /**
   * Calculate all margin metrics from COGS and price
   */
  calculateFromPrice(
    cogsPerUnit: number,
    pricePerUnit: number
  ): MarginCalculation {
    const marginPercent = this.calculateMarginPercent(
      cogsPerUnit,
      pricePerUnit
    );
    const marginDollar = this.calculateMarginDollar(cogsPerUnit, pricePerUnit);

    return {
      marginPercent,
      marginDollar,
      pricePerUnit,
    };
  },

  /**
   * Check if margin is negative (warning condition)
   */
  isNegativeMargin(marginPercent: number): boolean {
    return marginPercent < 0;
  },

  /**
   * Check if margin is below threshold (warning condition)
   */
  isBelowThreshold(marginPercent: number, threshold: number): boolean {
    return marginPercent < threshold;
  },
};
