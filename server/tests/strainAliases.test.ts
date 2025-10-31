import { describe, it, expect } from "vitest";
import {
  normalizeStrainName,
  getCanonicalStrainName,
  strainsMatch,
  strainsPartiallyMatch,
  getStrainAliases,
  normalizeGrade,
  normalizeCategory,
  normalizeUnit,
  getBaseStrainName,
  getStrainVariant,
  strainsMatchWithVariants,
} from "../utils/strainAliases";

describe("strainAliases", () => {
  describe("normalizeStrainName", () => {
    it("should lowercase strain names", () => {
      expect(normalizeStrainName("Blue Dream")).toBe("blue dream");
      expect(normalizeStrainName("OG KUSH")).toBe("og kush");
    });

    it("should trim whitespace", () => {
      expect(normalizeStrainName("  Blue Dream  ")).toBe("blue dream");
      expect(normalizeStrainName("Blue Dream ")).toBe("blue dream");
    });

    it("should normalize multiple spaces", () => {
      expect(normalizeStrainName("Blue  Dream")).toBe("blue dream");
      expect(normalizeStrainName("Blue   Dream")).toBe("blue dream");
    });

    it("should handle empty/null values", () => {
      expect(normalizeStrainName(null)).toBe("");
      expect(normalizeStrainName(undefined)).toBe("");
      expect(normalizeStrainName("")).toBe("");
    });

    it("should preserve # symbols", () => {
      expect(normalizeStrainName("Gelato #41")).toBe("gelato #41");
      expect(normalizeStrainName("Blue Dream #5")).toBe("blue dream #5");
    });
  });

  describe("getCanonicalStrainName", () => {
    it("should return canonical name for known aliases", () => {
      expect(getCanonicalStrainName("GSC")).toBe("girl scout cookies");
      expect(getCanonicalStrainName("gsc")).toBe("girl scout cookies");
      expect(getCanonicalStrainName("GDP")).toBe("granddaddy purple");
      expect(getCanonicalStrainName("GG4")).toBe("gorilla glue");
    });

    it("should return normalized name for unknown strains", () => {
      expect(getCanonicalStrainName("Unknown Strain")).toBe("unknown strain");
      expect(getCanonicalStrainName("New  Strain")).toBe("new strain");
    });

    it("should return canonical name if already canonical", () => {
      expect(getCanonicalStrainName("Girl Scout Cookies")).toBe(
        "girl scout cookies"
      );
      expect(getCanonicalStrainName("Blue Dream")).toBe("blue dream");
    });
  });

  describe("strainsMatch", () => {
    it("should match exact strain names", () => {
      expect(strainsMatch("Blue Dream", "Blue Dream")).toBe(true);
      expect(strainsMatch("blue dream", "Blue Dream")).toBe(true);
      expect(strainsMatch("  Blue Dream  ", "Blue Dream")).toBe(true);
    });

    it("should match strain aliases", () => {
      expect(strainsMatch("GSC", "Girl Scout Cookies")).toBe(true);
      expect(strainsMatch("Girl Scout Cookies", "GSC")).toBe(true);
      expect(strainsMatch("GDP", "Granddaddy Purple")).toBe(true);
      expect(strainsMatch("GG4", "Gorilla Glue")).toBe(true);
    });

    it("should not match different strains", () => {
      expect(strainsMatch("Blue Dream", "OG Kush")).toBe(false);
      expect(strainsMatch("GSC", "GDP")).toBe(false);
    });

    it("should handle null/undefined", () => {
      expect(strainsMatch(null, "Blue Dream")).toBe(false);
      expect(strainsMatch("Blue Dream", null)).toBe(false);
      expect(strainsMatch(null, null)).toBe(false);
    });

    // Numbered variant matching tests (Phase 3 Day 11)
    it("should match base strain with numbered variant", () => {
      expect(strainsMatch("Blue Dream", "Blue Dream #5")).toBe(true);
      expect(strainsMatch("Blue Dream #5", "Blue Dream")).toBe(true);
      expect(strainsMatch("Gorilla Glue", "Gorilla Glue #4")).toBe(true);
      expect(strainsMatch("Gelato", "Gelato #41")).toBe(true);
    });

    it("should match same numbered variants exactly", () => {
      expect(strainsMatch("Blue Dream #5", "Blue Dream #5")).toBe(true);
      expect(strainsMatch("Gorilla Glue #4", "Gorilla Glue #4")).toBe(true);
      expect(strainsMatch("Gelato #41", "Gelato #41")).toBe(true);
    });

    it("should NOT match different numbered variants", () => {
      expect(strainsMatch("Blue Dream #5", "Blue Dream #6")).toBe(false);
      expect(strainsMatch("Gorilla Glue #4", "Gorilla Glue #5")).toBe(false);
      expect(strainsMatch("Gelato #41", "Gelato #33")).toBe(false);
    });

    it("should match aliases with numbered variants", () => {
      expect(strainsMatch("GG4", "Gorilla Glue #4")).toBe(true);
      expect(strainsMatch("GSC", "Girl Scout Cookies #3")).toBe(true);
      expect(strainsMatch("GG4", "Gorilla Glue")).toBe(true);
    });
  });

  describe("getBaseStrainName", () => {
    it("should extract base name from numbered variants", () => {
      expect(getBaseStrainName("Blue Dream #5")).toBe("blue dream");
      expect(getBaseStrainName("Gorilla Glue #4")).toBe("gorilla glue");
      expect(getBaseStrainName("Gelato #41")).toBe("gelato");
    });

    it("should return original name for non-variants", () => {
      expect(getBaseStrainName("Blue Dream")).toBe("blue dream");
      expect(getBaseStrainName("OG Kush")).toBe("og kush");
    });

    it("should handle null/undefined", () => {
      expect(getBaseStrainName(null)).toBe("");
      expect(getBaseStrainName(undefined)).toBe("");
    });
  });

  describe("getStrainVariant", () => {
    it("should extract variant number", () => {
      expect(getStrainVariant("Blue Dream #5")).toBe("5");
      expect(getStrainVariant("Gorilla Glue #4")).toBe("4");
      expect(getStrainVariant("Gelato #41")).toBe("41");
    });

    it("should return null for non-variants", () => {
      expect(getStrainVariant("Blue Dream")).toBe(null);
      expect(getStrainVariant("OG Kush")).toBe(null);
    });

    it("should handle null/undefined", () => {
      expect(getStrainVariant(null)).toBe(null);
      expect(getStrainVariant(undefined)).toBe(null);
    });
  });

  describe("strainsMatchWithVariants", () => {
    it("should match base strain with variant (generic + specific)", () => {
      expect(strainsMatchWithVariants("Blue Dream", "Blue Dream #5")).toBe(
        true
      );
      expect(strainsMatchWithVariants("Gorilla Glue", "Gorilla Glue #4")).toBe(
        true
      );
    });

    it("should match same variants exactly", () => {
      expect(strainsMatchWithVariants("Blue Dream #5", "Blue Dream #5")).toBe(
        true
      );
      expect(
        strainsMatchWithVariants("Gorilla Glue #4", "Gorilla Glue #4")
      ).toBe(true);
    });

    it("should NOT match different variants", () => {
      expect(strainsMatchWithVariants("Blue Dream #5", "Blue Dream #6")).toBe(
        false
      );
      expect(
        strainsMatchWithVariants("Gorilla Glue #4", "Gorilla Glue #5")
      ).toBe(false);
    });

    it("should work with aliases and variants", () => {
      expect(strainsMatchWithVariants("GG4", "Gorilla Glue #4")).toBe(true);
      expect(strainsMatchWithVariants("GG4", "Gorilla Glue")).toBe(true);
      expect(strainsMatchWithVariants("GSC", "Girl Scout Cookies #3")).toBe(
        true
      );
    });
  });

  describe("strainsPartiallyMatch", () => {
    it("should match strain variants", () => {
      expect(strainsPartiallyMatch("Blue Dream", "Blue Dream #5")).toBe(true);
      expect(strainsPartiallyMatch("Gelato", "Gelato #41")).toBe(true);
      expect(strainsPartiallyMatch("OG Kush", "SFV OG Kush")).toBe(true);
    });

    it("should match in either direction", () => {
      expect(strainsPartiallyMatch("Blue Dream #5", "Blue Dream")).toBe(true);
      expect(strainsPartiallyMatch("Gelato #41", "Gelato")).toBe(true);
    });

    it("should not partially match unrelated strains", () => {
      expect(strainsPartiallyMatch("Blue Dream", "Green Crack")).toBe(false);
      expect(strainsPartiallyMatch("Gelato", "Wedding Cake")).toBe(false);
    });
  });

  describe("getStrainAliases", () => {
    it("should return all aliases for a strain", () => {
      const aliases = getStrainAliases("Girl Scout Cookies");
      expect(aliases).toContain("girl scout cookies");
      expect(aliases).toContain("gsc");
      expect(aliases.length).toBeGreaterThan(1);
    });

    it("should return aliases when given an alias", () => {
      const aliases = getStrainAliases("GSC");
      expect(aliases).toContain("girl scout cookies");
      expect(aliases).toContain("gsc");
    });

    it("should return array with normalized name for unknown strains", () => {
      const aliases = getStrainAliases("Unknown Strain");
      expect(aliases).toEqual(["unknown strain"]);
    });
  });

  describe("normalizeGrade", () => {
    it("should normalize grade formats", () => {
      expect(normalizeGrade("A+")).toBe("a+");
      expect(normalizeGrade("A Plus")).toBe("a+");
      expect(normalizeGrade("a plus")).toBe("a+");
    });

    it("should handle B grades", () => {
      expect(normalizeGrade("B")).toBe("b");
      expect(normalizeGrade("B+")).toBe("b+");
      expect(normalizeGrade("B-")).toBe("b-");
      expect(normalizeGrade("B Minus")).toBe("b-");
    });

    it("should remove 'Grade' word", () => {
      expect(normalizeGrade("A Grade")).toBe("a");
      expect(normalizeGrade("A+ Grade")).toBe("a+");
    });

    it("should handle null/undefined", () => {
      expect(normalizeGrade(null)).toBe("");
      expect(normalizeGrade(undefined)).toBe("");
    });
  });

  describe("normalizeCategory", () => {
    it("should normalize category names", () => {
      expect(normalizeCategory("Flower")).toBe("flower");
      expect(normalizeCategory("FLOWER")).toBe("flower");
      expect(normalizeCategory("  Flower  ")).toBe("flower");
    });

    it("should normalize multiple spaces", () => {
      expect(normalizeCategory("Pre  Roll")).toBe("pre roll");
    });

    it("should handle null/undefined", () => {
      expect(normalizeCategory(null)).toBe("");
      expect(normalizeCategory(undefined)).toBe("");
    });
  });

  describe("normalizeUnit", () => {
    it("should normalize pound variations", () => {
      expect(normalizeUnit("lb")).toBe("lb");
      expect(normalizeUnit("lbs")).toBe("lb");
      expect(normalizeUnit("pound")).toBe("lb");
      expect(normalizeUnit("pounds")).toBe("lb");
    });

    it("should normalize ounce variations", () => {
      expect(normalizeUnit("oz")).toBe("oz");
      expect(normalizeUnit("ounce")).toBe("oz");
      expect(normalizeUnit("ounces")).toBe("oz");
    });

    it("should normalize gram variations", () => {
      expect(normalizeUnit("g")).toBe("g");
      expect(normalizeUnit("gram")).toBe("g");
      expect(normalizeUnit("grams")).toBe("g");
    });

    it("should default to lb for null/undefined", () => {
      expect(normalizeUnit(null)).toBe("lb");
      expect(normalizeUnit(undefined)).toBe("lb");
    });
  });
});
