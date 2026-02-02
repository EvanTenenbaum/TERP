/**
 * REL-001: Money Parsing Utilities Tests
 */
import { describe, it, expect } from "vitest";
import {
  parseMoneyOrNull,
  parseMoneyOrZero,
  formatMoney,
  formatDecimal,
} from "../money";

describe("parseMoneyOrNull", () => {
  describe("valid numbers", () => {
    it("should parse positive numbers", () => {
      expect(parseMoneyOrNull(42)).toBe(42);
      expect(parseMoneyOrNull(42.5)).toBe(42.5);
    });

    it("should parse negative numbers", () => {
      expect(parseMoneyOrNull(-42)).toBe(-42);
      expect(parseMoneyOrNull(-42.5)).toBe(-42.5);
    });

    it("should parse zero", () => {
      expect(parseMoneyOrNull(0)).toBe(0);
    });

    it("should parse numeric strings", () => {
      expect(parseMoneyOrNull("42")).toBe(42);
      expect(parseMoneyOrNull("42.5")).toBe(42.5);
      expect(parseMoneyOrNull("-42.5")).toBe(-42.5);
    });
  });

  describe("null/undefined handling", () => {
    it("should return null for null", () => {
      expect(parseMoneyOrNull(null)).toBeNull();
    });

    it("should return null for undefined", () => {
      expect(parseMoneyOrNull(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(parseMoneyOrNull("")).toBeNull();
    });
  });

  describe("NaN/Infinity handling", () => {
    it("should return null for NaN", () => {
      expect(parseMoneyOrNull(NaN)).toBeNull();
    });

    it("should return null for Infinity", () => {
      expect(parseMoneyOrNull(Infinity)).toBeNull();
      expect(parseMoneyOrNull(-Infinity)).toBeNull();
    });

    it("should return null for invalid strings", () => {
      expect(parseMoneyOrNull("invalid")).toBeNull();
      expect(parseMoneyOrNull("abc123")).toBeNull();
    });
  });
});

describe("parseMoneyOrZero", () => {
  describe("valid numbers", () => {
    it("should parse positive numbers", () => {
      expect(parseMoneyOrZero(42)).toBe(42);
      expect(parseMoneyOrZero(42.5)).toBe(42.5);
    });

    it("should parse zero", () => {
      expect(parseMoneyOrZero(0)).toBe(0);
    });

    it("should parse numeric strings", () => {
      expect(parseMoneyOrZero("42")).toBe(42);
    });
  });

  describe("null/undefined returns zero", () => {
    it("should return 0 for null", () => {
      expect(parseMoneyOrZero(null)).toBe(0);
    });

    it("should return 0 for undefined", () => {
      expect(parseMoneyOrZero(undefined)).toBe(0);
    });

    it("should return 0 for empty string", () => {
      expect(parseMoneyOrZero("")).toBe(0);
    });
  });

  describe("NaN/Infinity returns zero", () => {
    it("should return 0 for NaN", () => {
      expect(parseMoneyOrZero(NaN)).toBe(0);
    });

    it("should return 0 for Infinity", () => {
      expect(parseMoneyOrZero(Infinity)).toBe(0);
    });

    it("should return 0 for invalid strings", () => {
      expect(parseMoneyOrZero("invalid")).toBe(0);
    });
  });
});

describe("formatMoney", () => {
  describe("valid numbers", () => {
    it("should format with $ prefix", () => {
      expect(formatMoney(42)).toBe("$42.00");
      expect(formatMoney(42.5)).toBe("$42.50");
      expect(formatMoney(1234.56)).toBe("$1234.56");
    });

    it("should format zero", () => {
      expect(formatMoney(0)).toBe("$0.00");
    });

    it("should format negative amounts", () => {
      expect(formatMoney(-42)).toBe("$-42.00");
    });

    it("should handle strings", () => {
      expect(formatMoney("42.5")).toBe("$42.50");
    });
  });

  describe("null/undefined returns fallback", () => {
    it("should return default fallback for null", () => {
      expect(formatMoney(null)).toBe("—");
    });

    it("should return default fallback for undefined", () => {
      expect(formatMoney(undefined)).toBe("—");
    });

    it("should use custom fallback", () => {
      expect(formatMoney(null, "$0.00")).toBe("$0.00");
      expect(formatMoney(null, "N/A")).toBe("N/A");
    });
  });

  describe("NaN returns fallback", () => {
    it("should return fallback for NaN", () => {
      expect(formatMoney(NaN)).toBe("—");
    });

    it("should return fallback for invalid strings", () => {
      expect(formatMoney("invalid")).toBe("—");
    });
  });
});

describe("formatDecimal", () => {
  describe("valid numbers", () => {
    it("should format with default 2 decimals", () => {
      expect(formatDecimal(42)).toBe("42.00");
      expect(formatDecimal(42.567)).toBe("42.57");
    });

    it("should format with custom decimals", () => {
      expect(formatDecimal(42.5678, 3)).toBe("42.568");
      expect(formatDecimal(42.5, 0)).toBe("43");
    });
  });

  describe("null/undefined returns fallback", () => {
    it("should return default fallback for null", () => {
      expect(formatDecimal(null)).toBe("—");
    });

    it("should return default fallback for undefined", () => {
      expect(formatDecimal(undefined)).toBe("—");
    });

    it("should use custom fallback", () => {
      expect(formatDecimal(null, 2, "0.00")).toBe("0.00");
    });
  });
});
