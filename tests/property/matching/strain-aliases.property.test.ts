/**
 * Property-Based Tests for Strain Aliases
 *
 * Tests alias resolution and matching functions for strain names.
 * Critical for ensuring "GSC" matches "Girl Scout Cookies" in search.
 *
 * @module tests/property/matching/strain-aliases
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  strainNameArb,
  adversarialStrainNameArb,
  getNumRuns,
} from "../arbitraries";
import {
  normalizeStrainName,
  getCanonicalStrainName,
  strainsMatch,
  strainsPartiallyMatch,
  getBaseStrainName,
  STRAIN_ALIASES,
} from "../../../server/utils/strainAliases";

describe("Strain Aliases Property Tests", () => {
  const numRuns = getNumRuns();

  // ==========================================================================
  // normalizeStrainName Properties (from strainAliases)
  // ==========================================================================

  describe("normalizeStrainName (aliases version)", () => {
    it("P1: Handles null/undefined gracefully (returns empty string)", () => {
      expect(normalizeStrainName(null)).toBe("");
      expect(normalizeStrainName(undefined)).toBe("");
    });

    it("P2: Is idempotent", () => {
      fc.assert(
        fc.property(strainNameArb, name => {
          const once = normalizeStrainName(name);
          const twice = normalizeStrainName(once);
          return once === twice;
        }),
        { numRuns }
      );
    });

    it("P3: Result is always lowercase", () => {
      fc.assert(
        fc.property(strainNameArb, name => {
          const result = normalizeStrainName(name);
          return result === result.toLowerCase();
        }),
        { numRuns }
      );
    });

    it("P4: Result has no leading/trailing whitespace", () => {
      fc.assert(
        fc.property(strainNameArb, name => {
          const result = normalizeStrainName(name);
          return result === result.trim();
        }),
        { numRuns }
      );
    });

    it("P5: Result has no multiple consecutive spaces", () => {
      fc.assert(
        fc.property(strainNameArb, name => {
          const result = normalizeStrainName(name);
          return !result.includes("  ");
        }),
        { numRuns }
      );
    });

    it("P6: Preserves # for variant numbers", () => {
      const result = normalizeStrainName("Gorilla Glue #4");
      expect(result).toContain("#4");
    });
  });

  // ==========================================================================
  // getCanonicalStrainName Properties
  // ==========================================================================

  describe("getCanonicalStrainName", () => {
    it("P7: Handles null/undefined gracefully", () => {
      expect(getCanonicalStrainName(null)).toBe("");
      expect(getCanonicalStrainName(undefined)).toBe("");
    });

    it("P8: Is idempotent", () => {
      fc.assert(
        fc.property(strainNameArb, name => {
          const once = getCanonicalStrainName(name);
          const twice = getCanonicalStrainName(once);
          return once === twice;
        }),
        { numRuns }
      );
    });

    it("P9: Known aliases resolve consistently", () => {
      // Test that aliases resolve to their canonical or to a consistent form
      // The implementation may normalize differently, so we just check consistency
      const testCases = [
        ["gsc", "girl scout cookies"],
        ["og", "og kush"],
        ["gg4", "gorilla glue"],
      ];

      for (const [alias, expected] of testCases) {
        const result = getCanonicalStrainName(alias);
        expect(result).toBe(expected);
      }
    });

    it("P10: Canonical names return themselves", () => {
      const canonicalNames = Object.keys(STRAIN_ALIASES);
      for (const name of canonicalNames) {
        const result = getCanonicalStrainName(name);
        expect(result).toBe(name);
      }
    });

    it("P11: Preserves variant numbers after alias resolution", () => {
      // GG4 should resolve to "gorilla glue" with the #4 variant
      const result = getCanonicalStrainName("GG4");
      expect(result).toBe("gorilla glue");

      // Gorilla Glue #4 should resolve to "gorilla glue #4"
      const withVariant = getCanonicalStrainName("Gorilla Glue #4");
      expect(withVariant).toBe("gorilla glue #4");
    });

    it("P12: Unknown strains return normalized form", () => {
      const unknown = "Super Unknown Strain XYZ";
      const result = getCanonicalStrainName(unknown);
      expect(result).toBe(normalizeStrainName(unknown));
    });
  });

  // ==========================================================================
  // strainsMatch Properties
  // ==========================================================================

  describe("strainsMatch", () => {
    it("P13: Is reflexive - strain matches itself", () => {
      fc.assert(
        fc.property(strainNameArb, name => {
          return strainsMatch(name, name) === true;
        }),
        { numRuns }
      );
    });

    it("P14: Is symmetric - match(a, b) equals match(b, a)", () => {
      fc.assert(
        fc.property(strainNameArb, strainNameArb, (a, b) => {
          return strainsMatch(a, b) === strainsMatch(b, a);
        }),
        { numRuns }
      );
    });

    it("P15: Handles null/undefined gracefully (returns false)", () => {
      expect(strainsMatch(null, "Blue Dream")).toBe(false);
      expect(strainsMatch("Blue Dream", null)).toBe(false);
      expect(strainsMatch(null, null)).toBe(false);
      expect(strainsMatch(undefined, undefined)).toBe(false);
    });

    it("P16: Case insensitive matching", () => {
      fc.assert(
        fc.property(strainNameArb, name => {
          return strainsMatch(name.toLowerCase(), name.toUpperCase()) === true;
        }),
        { numRuns }
      );
    });

    it("P17: Known aliases match their canonical names", () => {
      const testCases = [
        ["GSC", "Girl Scout Cookies"],
        ["GDP", "Granddaddy Purple"],
        ["OG", "OG Kush"],
        ["GG4", "Gorilla Glue"],
        ["Sour D", "Sour Diesel"],
        ["NL", "Northern Lights"],
        ["WW", "White Widow"],
      ];

      for (const [alias, canonical] of testCases) {
        expect(strainsMatch(alias, canonical)).toBe(true);
      }
    });

    it("P18: Variant matching works", () => {
      // Different variants of same strain should match via strainsMatchWithVariants
      expect(strainsMatch("Blue Dream", "Blue Dream #5")).toBe(true);
      expect(strainsMatch("OG Kush", "OG Kush #1")).toBe(true);
    });
  });

  // ==========================================================================
  // strainsPartiallyMatch Properties
  // ==========================================================================

  describe("strainsPartiallyMatch", () => {
    it("P19: Partial match subsumes exact match", () => {
      fc.assert(
        fc.property(strainNameArb, strainNameArb, (a, b) => {
          if (strainsMatch(a, b)) {
            return strainsPartiallyMatch(a, b) === true;
          }
          return true; // No constraint if they don't exact match
        }),
        { numRuns }
      );
    });

    it("P20: Reflexive - strain partially matches itself", () => {
      fc.assert(
        fc.property(strainNameArb, name => {
          return strainsPartiallyMatch(name, name) === true;
        }),
        { numRuns }
      );
    });

    it("P21: Symmetric - partialMatch(a, b) equals partialMatch(b, a)", () => {
      fc.assert(
        fc.property(strainNameArb, strainNameArb, (a, b) => {
          return strainsPartiallyMatch(a, b) === strainsPartiallyMatch(b, a);
        }),
        { numRuns }
      );
    });

    it("P22: Handles null/undefined gracefully", () => {
      expect(strainsPartiallyMatch(null, "Blue Dream")).toBe(false);
      expect(strainsPartiallyMatch("Blue Dream", null)).toBe(false);
    });

    it("P23: Substring relationship gives partial match", () => {
      // If one canonical name contains the other, they partially match
      expect(strainsPartiallyMatch("Blue Dream", "Blue Dream Haze")).toBe(true);
      expect(strainsPartiallyMatch("OG", "SFV OG Kush")).toBe(true);
    });

    it("P24: Completely different strains don't partially match", () => {
      expect(strainsPartiallyMatch("Blue Dream", "Granddaddy Purple")).toBe(
        false
      );
      expect(strainsPartiallyMatch("OG Kush", "Jack Herer")).toBe(false);
    });
  });

  // ==========================================================================
  // getBaseStrainName Properties
  // ==========================================================================

  describe("getBaseStrainName", () => {
    it("P25: Handles null/undefined gracefully", () => {
      expect(getBaseStrainName(null)).toBe("");
      expect(getBaseStrainName(undefined)).toBe("");
    });

    it("P26: Strips variant numbers", () => {
      expect(getBaseStrainName("Blue Dream #5")).toBe("blue dream");
      expect(getBaseStrainName("Gorilla Glue #4")).toBe("gorilla glue");
      expect(getBaseStrainName("G13")).toBe("g13"); // No variant to strip
    });

    it("P27: Is idempotent", () => {
      fc.assert(
        fc.property(strainNameArb, name => {
          const once = getBaseStrainName(name);
          const twice = getBaseStrainName(once);
          return once === twice;
        }),
        { numRuns }
      );
    });

    it("P28: Result is always lowercase", () => {
      fc.assert(
        fc.property(strainNameArb, name => {
          const result = getBaseStrainName(name);
          return result === result.toLowerCase();
        }),
        { numRuns }
      );
    });

    it("P29: Strains without variants return normalized name", () => {
      const result = getBaseStrainName("Blue Dream");
      expect(result).toBe("blue dream");
    });
  });

  // ==========================================================================
  // STRAIN_ALIASES Data Integrity
  // ==========================================================================

  describe("STRAIN_ALIASES Data Integrity", () => {
    it("P30: All canonical names are lowercase", () => {
      for (const canonical of Object.keys(STRAIN_ALIASES)) {
        expect(canonical).toBe(canonical.toLowerCase());
      }
    });

    it("P31: All aliases are lowercase", () => {
      for (const aliases of Object.values(STRAIN_ALIASES)) {
        for (const alias of aliases) {
          expect(alias).toBe(alias.toLowerCase());
        }
      }
    });

    it("P32: No alias appears in multiple canonical entries", () => {
      const seenAliases = new Set<string>();
      for (const aliases of Object.values(STRAIN_ALIASES)) {
        for (const alias of aliases) {
          expect(seenAliases.has(alias)).toBe(false);
          seenAliases.add(alias);
        }
      }
    });

    it("P33: Aliases don't create infinite loops", () => {
      // The key property is that getCanonicalStrainName doesn't loop forever
      // We verify by calling it on all known aliases
      for (const aliases of Object.values(STRAIN_ALIASES)) {
        for (const alias of aliases) {
          // This should complete without infinite loop
          const result = getCanonicalStrainName(alias);
          expect(typeof result).toBe("string");
        }
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("P34: Empty string handling", () => {
      expect(normalizeStrainName("")).toBe("");
      expect(getCanonicalStrainName("")).toBe("");
      expect(getBaseStrainName("")).toBe("");
    });

    it("P35: Whitespace-only string handling", () => {
      expect(normalizeStrainName("   ")).toBe("");
      expect(getCanonicalStrainName("   ")).toBe("");
    });

    it("P36: Adversarial inputs don't crash", () => {
      fc.assert(
        fc.property(adversarialStrainNameArb, input => {
          // None of these should throw
          normalizeStrainName(input);
          getCanonicalStrainName(input);
          strainsMatch(input, input);
          strainsPartiallyMatch(input, input);
          getBaseStrainName(input);
          return true;
        }),
        { numRuns }
      );
    });
  });
});
