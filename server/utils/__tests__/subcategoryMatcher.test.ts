/**
 * Tests for Subcategory Matching Utility (FEAT-020)
 */

import { describe, it, expect } from "vitest";
import {
  calculateSubcategoryScore,
  getRelatedSubcategories,
  areSubcategoriesRelated,
  getSubcategoryMatchReason,
  SUBCATEGORY_RELATIONSHIPS,
} from "../subcategoryMatcher";

describe("Subcategory Matcher", () => {
  describe("calculateSubcategoryScore", () => {
    it("should return 100 for exact match", () => {
      expect(calculateSubcategoryScore("Smalls", "Smalls")).toBe(100);
      expect(calculateSubcategoryScore("Trim", "Trim")).toBe(100);
    });

    it("should be case-insensitive for exact matches", () => {
      expect(calculateSubcategoryScore("smalls", "SMALLS")).toBe(100);
      expect(calculateSubcategoryScore("Trim", "trim")).toBe(100);
    });

    it("should return 50 for related subcategories", () => {
      expect(calculateSubcategoryScore("Smalls", "Trim")).toBe(50);
      expect(calculateSubcategoryScore("Smalls", "Shake")).toBe(50);
      expect(calculateSubcategoryScore("Trim", "Shake")).toBe(50);
    });

    it("should handle reverse relationships", () => {
      expect(calculateSubcategoryScore("Trim", "Smalls")).toBe(50);
      expect(calculateSubcategoryScore("Shake", "Smalls")).toBe(50);
    });

    it("should return 0 for unrelated subcategories", () => {
      expect(calculateSubcategoryScore("Smalls", "Gummies")).toBe(0);
      expect(calculateSubcategoryScore("Trim", "Cream")).toBe(0);
    });

    it("should return 0 for null or undefined inputs", () => {
      expect(calculateSubcategoryScore(null, "Smalls")).toBe(0);
      expect(calculateSubcategoryScore("Smalls", null)).toBe(0);
      expect(calculateSubcategoryScore(undefined, "Trim")).toBe(0);
      expect(calculateSubcategoryScore("Trim", undefined)).toBe(0);
    });

    it("should handle concentrates relationships", () => {
      expect(calculateSubcategoryScore("Shatter", "Wax")).toBe(50);
      expect(calculateSubcategoryScore("Wax", "Crumble")).toBe(50);
      expect(calculateSubcategoryScore("Live Resin", "Sauce")).toBe(50);
    });

    it("should handle edibles relationships", () => {
      expect(calculateSubcategoryScore("Gummies", "Candies")).toBe(50);
      expect(calculateSubcategoryScore("Beverages", "Drinks")).toBe(50);
    });

    it("should return 30 for partial string matches", () => {
      expect(calculateSubcategoryScore("Live Resin", "Resin")).toBe(30);
    });
  });

  describe("getRelatedSubcategories", () => {
    it("should return related subcategories", () => {
      const related = getRelatedSubcategories("Smalls");
      expect(related).toContain("Trim");
      expect(related).toContain("Shake");
      expect(related).toContain("Popcorn");
    });

    it("should include reverse relationships", () => {
      const related = getRelatedSubcategories("Trim");
      expect(related).toContain("Shake");
      expect(related).toContain("Smalls"); // Reverse relationship
      expect(related).toContain("Popcorn"); // Reverse relationship
    });

    it("should return empty array for unknown subcategory", () => {
      const related = getRelatedSubcategories("UnknownCategory");
      expect(related).toEqual([]);
    });

    it("should not duplicate entries", () => {
      const related = getRelatedSubcategories("Smalls");
      const unique = [...new Set(related)];
      expect(related.length).toBe(unique.length);
    });
  });

  describe("areSubcategoriesRelated", () => {
    it("should return true for exact matches", () => {
      expect(areSubcategoriesRelated("Smalls", "Smalls")).toBe(true);
    });

    it("should return true for related subcategories", () => {
      expect(areSubcategoriesRelated("Smalls", "Trim")).toBe(true);
      expect(areSubcategoriesRelated("Trim", "Smalls")).toBe(true);
    });

    it("should return false for unrelated subcategories", () => {
      expect(areSubcategoriesRelated("Smalls", "Gummies")).toBe(false);
    });

    it("should return false for null or undefined", () => {
      expect(areSubcategoriesRelated(null, "Smalls")).toBe(false);
      expect(areSubcategoriesRelated("Smalls", null)).toBe(false);
    });
  });

  describe("getSubcategoryMatchReason", () => {
    it("should return reason for exact match", () => {
      const reason = getSubcategoryMatchReason("Smalls", "Smalls");
      expect(reason).toBe("Exact subcategory match");
    });

    it("should return reason for related match", () => {
      const reason = getSubcategoryMatchReason("Smalls", "Trim");
      expect(reason).toContain("Related subcategory");
      expect(reason).toContain("Trim");
      expect(reason).toContain("Smalls");
    });

    it("should return reason for partial match", () => {
      const reason = getSubcategoryMatchReason("Live Resin", "Resin");
      expect(reason).toContain("Partial subcategory match");
    });

    it("should return null for no match", () => {
      const reason = getSubcategoryMatchReason("Smalls", "Gummies");
      expect(reason).toBeNull();
    });
  });

  describe("SUBCATEGORY_RELATIONSHIPS", () => {
    it("should have defined relationships for common subcategories", () => {
      expect(SUBCATEGORY_RELATIONSHIPS["Smalls"]).toBeDefined();
      expect(SUBCATEGORY_RELATIONSHIPS["Trim"]).toBeDefined();
      expect(SUBCATEGORY_RELATIONSHIPS["Shake"]).toBeDefined();
      expect(SUBCATEGORY_RELATIONSHIPS["Shatter"]).toBeDefined();
      expect(SUBCATEGORY_RELATIONSHIPS["Gummies"]).toBeDefined();
    });

    it("should have array values", () => {
      Object.values(SUBCATEGORY_RELATIONSHIPS).forEach(value => {
        expect(Array.isArray(value)).toBe(true);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle whitespace in subcategory names", () => {
      expect(calculateSubcategoryScore("  Smalls  ", "Smalls")).toBe(100);
      expect(calculateSubcategoryScore("Smalls", "  Trim  ")).toBe(50);
    });

    it("should handle empty strings", () => {
      expect(calculateSubcategoryScore("", "Smalls")).toBe(0);
      expect(calculateSubcategoryScore("Smalls", "")).toBe(0);
    });

    it("should handle mixed case in relationships", () => {
      expect(calculateSubcategoryScore("SMALLS", "trim")).toBe(50);
      expect(calculateSubcategoryScore("shatter", "WAX")).toBe(50);
    });
  });

  describe("Real-world Scenarios", () => {
    it("should match flower trim products correctly", () => {
      // A buyer looking for Smalls should also see Trim and Shake as alternatives
      expect(calculateSubcategoryScore("Smalls", "Trim")).toBe(50);
      expect(calculateSubcategoryScore("Smalls", "Shake")).toBe(50);
      expect(calculateSubcategoryScore("Smalls", "Popcorn")).toBe(50);
    });

    it("should match concentrate products correctly", () => {
      // A buyer looking for Shatter should see other concentrates
      expect(calculateSubcategoryScore("Shatter", "Wax")).toBe(50);
      expect(calculateSubcategoryScore("Shatter", "Crumble")).toBe(50);
      expect(calculateSubcategoryScore("Live Resin", "Sauce")).toBe(50);
    });

    it("should not cross-match unrelated categories", () => {
      // Flower products shouldn't match concentrates
      expect(calculateSubcategoryScore("Smalls", "Shatter")).toBe(0);
      // Concentrates shouldn't match edibles
      expect(calculateSubcategoryScore("Shatter", "Gummies")).toBe(0);
      // Edibles shouldn't match topicals
      expect(calculateSubcategoryScore("Gummies", "Cream")).toBe(0);
    });
  });
});
