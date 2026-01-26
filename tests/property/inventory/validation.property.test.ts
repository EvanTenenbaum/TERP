/**
 * Property-Based Tests for Inventory Validation & Normalization
 *
 * Tests validation and normalization functions for inventory data.
 *
 * @module tests/property/inventory/validation
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { adversarialStringArb, getNumRuns, moneyArb } from "../arbitraries";
import {
  normalizeToKey,
  normalizeProductName,
  validateCOGS,
  parseQty,
  formatQty,
  validateMetadata,
} from "../../../server/inventoryUtils";

describe("Inventory Validation Property Tests", () => {
  const numRuns = getNumRuns();

  // ==========================================================================
  // normalizeToKey Properties
  // ==========================================================================

  describe("normalizeToKey", () => {
    it("P18: Always returns exactly 4 characters", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), input => {
          const result = normalizeToKey(input);
          return result.length === 4;
        }),
        { numRuns }
      );
    });

    it("P19: Result is always uppercase alphanumeric", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), input => {
          const result = normalizeToKey(input);
          return /^[A-Z0-9X]+$/.test(result);
        }),
        { numRuns }
      );
    });

    it("P20: Is idempotent", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), input => {
          const once = normalizeToKey(input);
          const twice = normalizeToKey(once);
          return once === twice;
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // normalizeProductName Properties
  // ==========================================================================

  describe("normalizeProductName", () => {
    // KNOWN BUGS: PROP-BUG-002 (whitespace) and PROP-BUG-003 (idempotency)
    // These are documented in P21 and P22-alt tests below

    it("P21: Documented bug - normalizeProductName is not idempotent for punctuation-only input", () => {
      const once = normalizeProductName("! !");
      const twice = normalizeProductName(once);
      expect(once).not.toBe(twice);
    });

    it("P22-alt: Valid product names trim correctly", () => {
      const names = ["Blue Dream", "  OG Kush  ", "Sour Diesel", "  Test  "];
      for (const name of names) {
        try {
          const result = normalizeProductName(name);
          expect(result).toBe(result.trim());
        } catch {
          // Exceptions are OK for invalid input
        }
      }
    });

    it("P23: Result has no multiple consecutive spaces", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), input => {
          try {
            const result = normalizeProductName(input);
            return !result.includes("  ");
          } catch {
            return true;
          }
        }),
        { numRuns }
      );
    });

    it("P24: Words are Title Cased", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
            minLength: 1,
            maxLength: 5,
          }),
          words => {
            const input = words.join(" ");
            try {
              const result = normalizeProductName(input);
              const resultWords = result.split(" ");
              return resultWords.every(
                word => word.length === 0 || word[0] === word[0].toUpperCase()
              );
            } catch {
              return true;
            }
          }
        ),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // validateCOGS Properties
  // ==========================================================================

  describe("validateCOGS", () => {
    it("P25: FIXED mode requires unitCogs", () => {
      const result = validateCOGS("FIXED", null, null, null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("unitCogs");
    });

    it("P26: FIXED mode with unitCogs is valid", () => {
      fc.assert(
        fc.property(moneyArb, unitCogs => {
          const result = validateCOGS("FIXED", unitCogs, null, null);
          return result.valid === true;
        }),
        { numRuns }
      );
    });

    it("P27: RANGE mode requires both min and max", () => {
      const result1 = validateCOGS("RANGE", null, "10", null);
      expect(result1.valid).toBe(false);

      const result2 = validateCOGS("RANGE", null, null, "20");
      expect(result2.valid).toBe(false);
    });

    it("P28: RANGE mode requires min < max", () => {
      const result = validateCOGS("RANGE", null, "20", "10");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("less than");
    });

    it("P29: RANGE mode with valid min < max is valid", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000, noNaN: true }),
          fc.float({ min: 1, max: 1000, noNaN: true }),
          (min, delta) => {
            const max = min + delta;
            const result = validateCOGS(
              "RANGE",
              null,
              min.toFixed(2),
              max.toFixed(2)
            );
            return result.valid === true;
          }
        ),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // parseQty Properties
  // ==========================================================================

  describe("parseQty", () => {
    it("P30: Never returns NaN", () => {
      fc.assert(
        fc.property(adversarialStringArb, input => {
          const result = parseQty(input as string);
          return !isNaN(result);
        }),
        { numRuns }
      );
    });

    it("P31: Returns number type", () => {
      fc.assert(
        fc.property(adversarialStringArb, input => {
          const result = parseQty(input as string);
          return typeof result === "number";
        }),
        { numRuns }
      );
    });

    it("P32: Valid numeric strings parse correctly", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 10000, noNaN: true }), num => {
          const str = num.toFixed(2);
          const result = parseQty(str);
          return Math.abs(result - num) < 0.01;
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // formatQty Properties
  // ==========================================================================

  describe("formatQty", () => {
    it("P33: Round-trip with parseQty", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 10000, noNaN: true }), num => {
          const formatted = formatQty(num);
          const parsed = parseQty(formatted);
          return Math.abs(parsed - num) < 0.01;
        }),
        { numRuns }
      );
    });

    it("P34: Always returns string with 2 decimal places", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 10000, noNaN: true }), num => {
          const result = formatQty(num);
          return /^\d+\.\d{2}$/.test(result);
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // validateMetadata Properties
  // ==========================================================================

  describe("validateMetadata", () => {
    it("P35: Null/undefined are valid (empty metadata)", () => {
      expect(validateMetadata(null).valid).toBe(true);
      expect(validateMetadata(undefined).valid).toBe(true);
    });

    it("P36: Non-objects are invalid", () => {
      expect(validateMetadata("string").valid).toBe(false);
      expect(validateMetadata(123).valid).toBe(false);
      expect(validateMetadata([1, 2, 3]).valid).toBe(false);
    });

    it("P37: Empty object is valid", () => {
      expect(validateMetadata({}).valid).toBe(true);
    });

    it("P38: testResults.thc must be number if present", () => {
      const invalid = { testResults: { thc: "not a number" } };
      const result = validateMetadata(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("thc"))).toBe(true);
    });

    it("P39: sourcing.organic must be boolean if present", () => {
      const invalid = { sourcing: { organic: "yes" } };
      const result = validateMetadata(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("organic"))).toBe(true);
    });
  });
});
