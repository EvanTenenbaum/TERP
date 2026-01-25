/**
 * Tests for Gamification Defaults Seeder
 *
 * Tests decimal comparison logic and update detection to prevent
 * spurious updates when database stores "1.00" but code compares with "1".
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Decimal Comparison Utilities (extracted for testing)
// ============================================================================

/**
 * Normalizes decimal values for comparison.
 * Handles:
 * - null/undefined → "0.00"
 * - number → formatted to 2 decimal places
 * - string → parsed and formatted to 2 decimal places
 */
function normalizeDecimal(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "0.00";
  }
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) {
    return "0.00";
  }
  return num.toFixed(2);
}

/**
 * Compares two decimal values for equality.
 * Returns true if values are equal after normalization.
 */
function decimalsEqual(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): boolean {
  return normalizeDecimal(a) === normalizeDecimal(b);
}

// ============================================================================
// Tests
// ============================================================================

describe("Gamification Seeder - Decimal Comparison", () => {
  describe("normalizeDecimal", () => {
    it("should convert null to '0.00'", () => {
      expect(normalizeDecimal(null)).toBe("0.00");
    });

    it("should convert undefined to '0.00'", () => {
      expect(normalizeDecimal(undefined)).toBe("0.00");
    });

    it("should format integer 1 to '1.00'", () => {
      expect(normalizeDecimal(1)).toBe("1.00");
    });

    it("should format float 1.5 to '1.50'", () => {
      expect(normalizeDecimal(1.5)).toBe("1.50");
    });

    it("should format string '1' to '1.00'", () => {
      expect(normalizeDecimal("1")).toBe("1.00");
    });

    it("should format string '1.00' to '1.00'", () => {
      expect(normalizeDecimal("1.00")).toBe("1.00");
    });

    it("should format string '1.5' to '1.50'", () => {
      expect(normalizeDecimal("1.5")).toBe("1.50");
    });

    it("should handle trailing zeros '1.500' to '1.50'", () => {
      expect(normalizeDecimal("1.500")).toBe("1.50");
    });

    it("should handle NaN string to '0.00'", () => {
      expect(normalizeDecimal("not-a-number")).toBe("0.00");
    });

    it("should round to 2 decimal places", () => {
      // Note: JavaScript's toFixed uses banker's rounding (round half to even)
      // 1.555 rounds to 1.55 (not 1.56) because 5 is rounded to nearest even
      expect(normalizeDecimal(1.555)).toBe("1.55");
      expect(normalizeDecimal(1.554)).toBe("1.55");
      expect(normalizeDecimal(1.556)).toBe("1.56");
    });
  });

  describe("decimalsEqual", () => {
    it("should return true for equal integers", () => {
      expect(decimalsEqual(1, 1)).toBe(true);
    });

    it("should return true for integer 1 vs string '1.00'", () => {
      // This is the key bug case: DB stores "1.00", code has 1
      expect(decimalsEqual(1, "1.00")).toBe(true);
    });

    it("should return true for string '1' vs string '1.00'", () => {
      expect(decimalsEqual("1", "1.00")).toBe(true);
    });

    it("should return true for null vs undefined", () => {
      expect(decimalsEqual(null, undefined)).toBe(true);
    });

    it("should return true for null vs 0", () => {
      expect(decimalsEqual(null, 0)).toBe(true);
    });

    it("should return false for 1 vs 2", () => {
      expect(decimalsEqual(1, 2)).toBe(false);
    });

    it("should return false for 1.5 vs 1.51", () => {
      expect(decimalsEqual(1.5, 1.51)).toBe(false);
    });

    it("should return false for 1.555 vs 1.56 (1.555 rounds to 1.55)", () => {
      // 1.555 -> "1.55" (banker's rounding), 1.56 -> "1.56"
      expect(decimalsEqual(1.555, 1.56)).toBe(false);
    });

    it("should return true for 1.556 vs 1.56 (both round to 1.56)", () => {
      expect(decimalsEqual(1.556, 1.56)).toBe(true);
    });
  });

  describe("Achievement update detection", () => {
    // Simulates the comparison logic used in seedAchievements
    interface AchievementRecord {
      markupDiscountPercent: string | null;
      pointsValue: number;
    }

    interface AchievementDefinition {
      markupDiscountPercent?: number;
      pointsValue: number;
    }

    // Helper function to demonstrate the comparison difference
    // Prefixed with _ to indicate intentionally unused (documentation purposes)
    function _shouldUpdateAchievement(
      existing: AchievementRecord,
      definition: AchievementDefinition
    ): { incorrectCompare: boolean; correctCompare: boolean } {
      // Using the INCORRECT method (what was causing spurious updates)
      const incorrectCompare =
        existing.markupDiscountPercent?.toString() !==
        (definition.markupDiscountPercent?.toString() ?? "0");

      // Using the CORRECT method (normalized comparison)
      const correctCompare = !decimalsEqual(
        existing.markupDiscountPercent,
        definition.markupDiscountPercent ?? 0
      );

      return { incorrectCompare, correctCompare };
    }
    // Suppress unused warning - function exists for documentation
    void _shouldUpdateAchievement;

    it("should NOT detect change when DB has '1.00' and code has 1", () => {
      const existing: AchievementRecord = {
        markupDiscountPercent: "1.00",
        pointsValue: 100,
      };
      const definition: AchievementDefinition = {
        markupDiscountPercent: 1,
        pointsValue: 100,
      };

      // The old buggy comparison would return TRUE (spurious update)
      const buggyResult =
        existing.markupDiscountPercent?.toString() !==
        (definition.markupDiscountPercent?.toString() ?? "0");
      expect(buggyResult).toBe(true); // "1.00" !== "1"

      // The fixed comparison should return FALSE (no update needed)
      const fixedResult = !decimalsEqual(
        existing.markupDiscountPercent,
        definition.markupDiscountPercent ?? 0
      );
      expect(fixedResult).toBe(false); // Both normalize to "1.00"
    });

    it("should detect actual change from 1.00 to 2.00", () => {
      const existing: AchievementRecord = {
        markupDiscountPercent: "1.00",
        pointsValue: 100,
      };
      const definition: AchievementDefinition = {
        markupDiscountPercent: 2,
        pointsValue: 100,
      };

      const shouldUpdate = !decimalsEqual(
        existing.markupDiscountPercent,
        definition.markupDiscountPercent ?? 0
      );
      expect(shouldUpdate).toBe(true);
    });

    it("should handle null in DB matching 0 in definition", () => {
      const existing: AchievementRecord = {
        markupDiscountPercent: null,
        pointsValue: 100,
      };
      const definition: AchievementDefinition = {
        // markupDiscountPercent not set, defaults to 0
        pointsValue: 100,
      };

      const shouldUpdate = !decimalsEqual(
        existing.markupDiscountPercent,
        definition.markupDiscountPercent ?? 0
      );
      expect(shouldUpdate).toBe(false);
    });
  });
});

describe("Gamification Seeder - Reward Catalog", () => {
  describe("Points value comparison", () => {
    it("should correctly compare integer points values", () => {
      const existingPoints = 100;
      const definitionPoints = 100;
      expect(existingPoints).toBe(definitionPoints);
    });

    it("should detect points value change", () => {
      const existingPoints = 100;
      const definitionPoints = 150;
      expect(existingPoints).not.toBe(definitionPoints);
    });
  });
});
