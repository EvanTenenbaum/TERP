/**
 * REL-002: Safe Number Formatting Tests
 */
import { describe, it, expect } from "vitest";
import {
  formatDecimal,
  formatCurrency,
  formatPercent,
  formatInteger,
} from "./formatters";

describe("formatDecimal", () => {
  describe("valid numbers", () => {
    it("should format positive numbers", () => {
      expect(formatDecimal(42)).toBe("42.00");
      expect(formatDecimal(42.5)).toBe("42.50");
      expect(formatDecimal(42.567)).toBe("42.57");
    });

    it("should format negative numbers", () => {
      expect(formatDecimal(-42)).toBe("-42.00");
      expect(formatDecimal(-42.567)).toBe("-42.57");
    });

    it("should format zero", () => {
      expect(formatDecimal(0)).toBe("0.00");
    });

    it("should handle numeric strings", () => {
      expect(formatDecimal("42")).toBe("42.00");
      expect(formatDecimal("42.567")).toBe("42.57");
    });
  });

  describe("custom decimals", () => {
    it("should format with 0 decimals", () => {
      expect(formatDecimal(42.567, 0)).toBe("43");
    });

    it("should format with 3 decimals", () => {
      expect(formatDecimal(42.5678, 3)).toBe("42.568");
    });
  });

  describe("null/undefined handling", () => {
    it("should return fallback for null", () => {
      expect(formatDecimal(null)).toBe("—");
    });

    it("should return fallback for undefined", () => {
      expect(formatDecimal(undefined)).toBe("—");
    });

    it("should use custom fallback", () => {
      expect(formatDecimal(null, 2, "N/A")).toBe("N/A");
      expect(formatDecimal(undefined, 2, "")).toBe("");
    });
  });

  describe("NaN/Infinity handling", () => {
    it("should return fallback for NaN", () => {
      expect(formatDecimal(NaN)).toBe("—");
    });

    it("should return fallback for Infinity", () => {
      expect(formatDecimal(Infinity)).toBe("—");
      expect(formatDecimal(-Infinity)).toBe("—");
    });

    it("should return fallback for invalid strings", () => {
      expect(formatDecimal("invalid")).toBe("—");
      expect(formatDecimal("")).toBe("—");
    });
  });
});

describe("formatCurrency", () => {
  describe("valid numbers", () => {
    it("should format with $ prefix", () => {
      expect(formatCurrency(42)).toBe("$42.00");
      expect(formatCurrency(42.5)).toBe("$42.50");
      expect(formatCurrency(1234.56)).toBe("$1234.56");
    });

    it("should format negative amounts", () => {
      expect(formatCurrency(-42)).toBe("$-42.00");
    });

    it("should format zero", () => {
      expect(formatCurrency(0)).toBe("$0.00");
    });
  });

  describe("null/undefined handling", () => {
    it("should return fallback for null", () => {
      expect(formatCurrency(null)).toBe("—");
    });

    it("should return fallback for undefined", () => {
      expect(formatCurrency(undefined)).toBe("—");
    });

    it("should use custom fallback", () => {
      expect(formatCurrency(null, "$0.00")).toBe("$0.00");
    });
  });

  describe("NaN/Infinity handling", () => {
    it("should return fallback for NaN", () => {
      expect(formatCurrency(NaN)).toBe("—");
    });

    it("should return fallback for invalid strings", () => {
      expect(formatCurrency("invalid")).toBe("—");
    });
  });
});

describe("formatPercent", () => {
  describe("valid numbers", () => {
    it("should format as percentage", () => {
      expect(formatPercent(0.15)).toBe("15.0%");
      expect(formatPercent(0.5)).toBe("50.0%");
      expect(formatPercent(1)).toBe("100.0%");
    });

    it("should handle custom decimals", () => {
      expect(formatPercent(0.1567, 2)).toBe("15.67%");
      expect(formatPercent(0.15, 0)).toBe("15%");
    });
  });

  describe("null/undefined handling", () => {
    it("should return fallback for null", () => {
      expect(formatPercent(null)).toBe("—");
    });

    it("should return fallback for undefined", () => {
      expect(formatPercent(undefined)).toBe("—");
    });
  });
});

describe("formatInteger", () => {
  describe("valid numbers", () => {
    it("should format integers", () => {
      expect(formatInteger(42)).toBe("42");
      expect(formatInteger(42.4)).toBe("42");
      expect(formatInteger(42.6)).toBe("43");
    });

    it("should handle strings", () => {
      expect(formatInteger("42.5")).toBe("43");
    });
  });

  describe("null/undefined handling", () => {
    it("should return fallback for null", () => {
      expect(formatInteger(null)).toBe("—");
    });

    it("should return fallback for undefined", () => {
      expect(formatInteger(undefined)).toBe("—");
    });
  });
});
