/**
 * Margin Calculation Service
 * Pure math functions for margin/price conversions
 * v2.0 Sales Order Enhancements
 */

export interface MarginCalculation {
  marginPercent: number;
  marginDollar: number;
  pricePerUnit: number;
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

    const price = cogsPerUnit / (1 - marginPercent / 100);
    return Math.round(price * 100) / 100; // Round to 2 decimals
  },

  /**
   * Calculate price from COGS and margin dollar amount
   * Formula: price = COGS + margin$
   */
  calculatePriceFromMarginDollar(
    cogsPerUnit: number,
    marginDollar: number
  ): number {
    const price = cogsPerUnit + marginDollar;
    return Math.round(price * 100) / 100; // Round to 2 decimals
  },

  /**
   * Calculate margin percent from COGS and price
   * Formula: margin% = (price - COGS) / price * 100
   */
  calculateMarginPercent(cogsPerUnit: number, pricePerUnit: number): number {
    if (pricePerUnit === 0) {
      return 0;
    }

    const marginPercent = ((pricePerUnit - cogsPerUnit) / pricePerUnit) * 100;
    return Math.round(marginPercent * 100) / 100; // Round to 2 decimals
  },

  /**
   * Calculate margin dollar from COGS and price
   * Formula: margin$ = price - COGS
   */
  calculateMarginDollar(cogsPerUnit: number, pricePerUnit: number): number {
    const marginDollar = pricePerUnit - cogsPerUnit;
    return Math.round(marginDollar * 100) / 100; // Round to 2 decimals
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
