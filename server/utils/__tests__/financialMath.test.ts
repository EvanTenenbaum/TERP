/**
 * REL-004: Financial Math Precision Tests
 *
 * Tests for decimal.js-based financial calculations to prevent
 * floating-point precision errors in money calculations.
 */

import { describe, it, expect } from "vitest";
import { financialMath } from "../financialMath";

describe("financialMath", () => {
  describe("add", () => {
    it("should add two positive numbers correctly", () => {
      expect(financialMath.add(10.5, 20.25)).toBe("30.75");
    });

    it("should handle the classic 0.1 + 0.2 precision error", () => {
      // JavaScript: 0.1 + 0.2 = 0.30000000000000004
      // financialMath: 0.1 + 0.2 = 0.30
      expect(financialMath.add(0.1, 0.2)).toBe("0.30");
    });

    it("should add negative numbers", () => {
      expect(financialMath.add(-10.5, -20.25)).toBe("-30.75");
    });

    it("should add mixed positive and negative", () => {
      expect(financialMath.add(100, -25.5)).toBe("74.50");
    });

    it("should handle zero", () => {
      expect(financialMath.add(0, 0)).toBe("0.00");
      expect(financialMath.add(10.5, 0)).toBe("10.50");
    });

    it("should handle string inputs", () => {
      expect(financialMath.add("10.50", "20.25")).toBe("30.75");
    });

    it("should round to 2 decimal places", () => {
      // 10.555 + 20.444 = 30.999, rounds to 31.00 with ROUND_HALF_UP
      expect(financialMath.add(10.555, 20.444)).toBe("31.00");
    });
  });

  describe("subtract", () => {
    it("should subtract two positive numbers", () => {
      expect(financialMath.subtract(50.75, 20.25)).toBe("30.50");
    });

    it("should handle precision errors", () => {
      // JavaScript: 0.3 - 0.1 = 0.19999999999999998
      expect(financialMath.subtract(0.3, 0.1)).toBe("0.20");
    });

    it("should subtract negative numbers", () => {
      expect(financialMath.subtract(-10.5, -20.25)).toBe("9.75");
    });

    it("should handle mixed signs", () => {
      expect(financialMath.subtract(100, -25.5)).toBe("125.50");
    });

    it("should handle zero", () => {
      expect(financialMath.subtract(10.5, 0)).toBe("10.50");
      expect(financialMath.subtract(0, 10.5)).toBe("-10.50");
    });

    it("should handle string inputs", () => {
      expect(financialMath.subtract("50.75", "20.25")).toBe("30.50");
    });

    it("should round to 2 decimal places", () => {
      // 50.999 - 20.001 = 30.998, rounds to 31.00 with ROUND_HALF_UP
      expect(financialMath.subtract(50.999, 20.001)).toBe("31.00");
    });
  });

  describe("multiply", () => {
    it("should multiply two positive numbers", () => {
      // Note: multiply returns full precision, not auto-rounded to 2 decimals
      const result = financialMath.multiply(10.5, 2);
      expect(result).toBe("21");
    });

    it("should handle precision errors", () => {
      // JavaScript: 0.1 * 0.2 = 0.020000000000000004
      const result = financialMath.multiply(0.1, 0.2);
      expect(result).toBe("0.02");
    });

    it("should multiply with quantities", () => {
      // Common use case: unitPrice * quantity
      const result = financialMath.multiply(12.99, 5);
      expect(result).toBe("64.95");
    });

    it("should handle negative numbers", () => {
      expect(financialMath.multiply(-10.5, 2)).toBe("-21");
      expect(financialMath.multiply(10.5, -2)).toBe("-21");
      expect(financialMath.multiply(-10.5, -2)).toBe("21");
    });

    it("should handle zero", () => {
      expect(financialMath.multiply(10.5, 0)).toBe("0");
      expect(financialMath.multiply(0, 10.5)).toBe("0");
    });

    it("should handle string inputs", () => {
      expect(financialMath.multiply("10.50", "2")).toBe("21");
    });

    it("should preserve precision for intermediate calculations", () => {
      // unitPrice * quantity might need more than 2 decimals for intermediate calc
      const result = financialMath.multiply(12.999, 3);
      expect(result).toBe("38.997");
    });
  });

  describe("divide", () => {
    it("should divide two positive numbers", () => {
      const result = financialMath.divide(100, 4);
      expect(result).toBe("25");
    });

    it("should handle precision errors", () => {
      // JavaScript: 0.3 / 0.1 = 2.9999999999999996
      const result = financialMath.divide(0.3, 0.1);
      expect(result).toBe("3");
    });

    it("should handle division by zero", () => {
      expect(() => financialMath.divide(100, 0)).toThrow(
        "Division by zero in financial calculation"
      );
    });

    it("should calculate weighted averages", () => {
      // Common use case: totalCost / totalQuantity
      const result = financialMath.divide(150.75, 12);
      expect(result).toBe("12.5625");
    });

    it("should handle negative numbers", () => {
      expect(financialMath.divide(-100, 4)).toBe("-25");
      expect(financialMath.divide(100, -4)).toBe("-25");
      expect(financialMath.divide(-100, -4)).toBe("25");
    });

    it("should handle string inputs", () => {
      expect(financialMath.divide("100", "4")).toBe("25");
    });
  });

  describe("toFixed", () => {
    it("should round to 2 decimal places by default", () => {
      expect(financialMath.toFixed(12.999)).toBe("13.00");
      expect(financialMath.toFixed(12.5)).toBe("12.50");
    });

    it("should support custom decimal places", () => {
      expect(financialMath.toFixed(12.99999, 4)).toBe("13.0000");
      expect(financialMath.toFixed(12.5, 0)).toBe("13");
    });

    it("should handle string inputs", () => {
      expect(financialMath.toFixed("12.999")).toBe("13.00");
    });

    it("should use banker's rounding (ROUND_HALF_UP)", () => {
      // With ROUND_HALF_UP: 0.5 rounds up
      expect(financialMath.toFixed(12.5, 0)).toBe("13");
      expect(financialMath.toFixed(12.125, 2)).toBe("12.13");
    });
  });

  describe("calculateMarginPrice", () => {
    it("should calculate price from cost and margin percent", () => {
      // Cost: $100, Margin: 25% -> Price: $133.33
      // Formula: 100 / (1 - 0.25) = 100 / 0.75 = 133.33
      expect(financialMath.calculateMarginPrice(100, 25)).toBe("133.33");
    });

    it("should handle 30% margin (common default)", () => {
      // Cost: $10, Margin: 30% -> Price: $14.29
      expect(financialMath.calculateMarginPrice(10, 30)).toBe("14.29");
    });

    it("should throw on 100% margin (infinite price)", () => {
      expect(() => financialMath.calculateMarginPrice(100, 100)).toThrow(
        "Margin cannot be 100% or greater"
      );
    });

    it("should throw on >100% margin", () => {
      expect(() => financialMath.calculateMarginPrice(100, 150)).toThrow(
        "Margin cannot be 100% or greater"
      );
    });

    it("should handle string inputs", () => {
      expect(financialMath.calculateMarginPrice("100", "25")).toBe("133.33");
    });

    it("should handle negative margins (loss scenario)", () => {
      // Cost: $100, Margin: -10% -> Price: $90.91
      expect(financialMath.calculateMarginPrice(100, -10)).toBe("90.91");
    });
  });

  describe("comparison functions", () => {
    describe("gt (greater than)", () => {
      it("should return true when a > b", () => {
        expect(financialMath.gt(10.5, 10.49)).toBe(true);
      });

      it("should return false when a <= b", () => {
        expect(financialMath.gt(10.5, 10.5)).toBe(false);
        expect(financialMath.gt(10.49, 10.5)).toBe(false);
      });
    });

    describe("gte (greater than or equal)", () => {
      it("should return true when a >= b", () => {
        expect(financialMath.gte(10.5, 10.5)).toBe(true);
        expect(financialMath.gte(10.5, 10.49)).toBe(true);
      });

      it("should return false when a < b", () => {
        expect(financialMath.gte(10.49, 10.5)).toBe(false);
      });
    });

    describe("lt (less than)", () => {
      it("should return true when a < b", () => {
        expect(financialMath.lt(10.49, 10.5)).toBe(true);
      });

      it("should return false when a >= b", () => {
        expect(financialMath.lt(10.5, 10.5)).toBe(false);
        expect(financialMath.lt(10.5, 10.49)).toBe(false);
      });
    });

    describe("eq (equals)", () => {
      it("should return true when a == b", () => {
        expect(financialMath.eq(10.5, 10.5)).toBe(true);
        expect(financialMath.eq("10.50", 10.5)).toBe(true);
      });

      it("should return false when a != b", () => {
        expect(financialMath.eq(10.5, 10.51)).toBe(false);
      });

      it("should handle precision correctly", () => {
        // JavaScript: 0.1 + 0.2 != 0.3
        // But financialMath should handle this
        const sum = financialMath.add(0.1, 0.2);
        expect(financialMath.eq(sum, 0.3)).toBe(true);
      });
    });
  });

  describe("zero", () => {
    it("should return 0.00", () => {
      expect(financialMath.zero()).toBe("0.00");
    });
  });

  describe("REL-004: Real-world precision scenarios", () => {
    it("should calculate order line total correctly", () => {
      // Scenario: 3 items at $12.99 each
      const unitPrice = 12.99;
      const quantity = 3;
      const lineTotal = financialMath.multiply(unitPrice, quantity);
      expect(lineTotal).toBe("38.97");
    });

    it("should calculate weighted average COGS correctly", () => {
      // Scenario: totalCost / totalAllocated
      const totalCost = 150.75;
      const totalAllocated = 12;
      const avgCost = financialMath.divide(totalCost, totalAllocated);
      expect(financialMath.toFixed(avgCost)).toBe("12.56");
    });

    it("should calculate new payment balance correctly", () => {
      // Scenario: currentPaid + effectiveAmount
      const currentPaid = 150.5;
      const effectiveAmount = 75.25;
      const newPaid = financialMath.add(currentPaid, effectiveAmount);
      expect(newPaid).toBe("225.75");
    });

    it("should calculate remaining balance correctly", () => {
      // Scenario: totalAmount - newPaid
      const totalAmount = 500;
      const newPaid = 225.75;
      const remaining = financialMath.subtract(totalAmount, newPaid);
      expect(remaining).toBe("274.25");
    });

    it("should sum 100 line items without accumulating error", () => {
      // Scenario: Create order with 100 line items
      // Each item: $0.10 * 1 quantity
      let total = "0";
      for (let i = 0; i < 100; i++) {
        const lineTotal = financialMath.multiply(0.1, 1);
        total = financialMath.add(total, lineTotal);
      }
      expect(total).toBe("10.00");

      // Contrast with JavaScript float arithmetic
      let floatTotal = 0;
      for (let i = 0; i < 100; i++) {
        floatTotal += 0.1 * 1;
      }
      // This would likely be 9.999999999999998 or similar
      expect(floatTotal).not.toBe(10.0); // Demonstrates the problem
    });

    it("should calculate percentage discount correctly", () => {
      // Scenario: $100 subtotal with 15% discount
      const subtotal = 100;
      const discountPercent = 15;
      const discountAmount = financialMath.divide(
        financialMath.multiply(subtotal, discountPercent),
        100
      );
      expect(financialMath.toFixed(discountAmount)).toBe("15.00");
    });

    it("should calculate margin dollar correctly", () => {
      // Scenario: pricePerUnit - cogsPerUnit
      const pricePerUnit = 14.29;
      const cogsPerUnit = 10.0;
      const marginDollar = financialMath.subtract(pricePerUnit, cogsPerUnit);
      expect(marginDollar).toBe("4.29");
    });

    it("should calculate margin percent correctly", () => {
      // Scenario: (marginDollar / pricePerUnit) * 100
      const marginDollar = 4.29;
      const pricePerUnit = 14.29;
      const marginPercent = financialMath.multiply(
        financialMath.divide(marginDollar, pricePerUnit),
        100
      );
      expect(financialMath.toFixed(marginPercent)).toBe("30.02");
    });
  });
});
