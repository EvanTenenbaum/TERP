/**
 * Strain Variety Tests
 *
 * Ensures that strain data has sufficient variety and realism:
 * - At least 75 unique strains
 * - Balanced distribution across categories
 * - Creative and realistic naming
 * - Proper normalization
 */

import { describe, it, expect } from "vitest";
import { generateStrains } from "../../scripts/generators/strains.js";

describe("Strain Variety", () => {
  describe("Quantity and Uniqueness", () => {
    it("should generate at least 75 unique strains", () => {
      const strains = generateStrains();

      expect(strains.length).toBeGreaterThanOrEqual(75);

      // All names should be unique
      const uniqueNames = new Set(strains.map(s => s.name));
      expect(uniqueNames.size).toBe(strains.length);
    });

    it("should have unique standardized names", () => {
      const strains = generateStrains();

      const uniqueStandardized = new Set(strains.map(s => s.standardizedName));
      expect(uniqueStandardized.size).toBe(strains.length);
    });
  });

  describe("Category Distribution", () => {
    it("should have balanced distribution across categories", () => {
      const strains = generateStrains();

      const categoryCounts = strains.reduce(
        (acc, strain) => {
          acc[strain.category] = (acc[strain.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Should have all three categories
      expect(categoryCounts["Indica"]).toBeGreaterThan(0);
      expect(categoryCounts["Sativa"]).toBeGreaterThan(0);
      expect(categoryCounts["Hybrid"]).toBeGreaterThan(0);

      // Hybrid should be most common (realistic)
      expect(categoryCounts["Hybrid"]).toBeGreaterThan(
        categoryCounts["Indica"]
      );
      expect(categoryCounts["Hybrid"]).toBeGreaterThan(
        categoryCounts["Sativa"]
      );
    });

    it("should have at least 20 indica strains", () => {
      const strains = generateStrains();
      const indicaCount = strains.filter(s => s.category === "Indica").length;
      expect(indicaCount).toBeGreaterThanOrEqual(20);
    });

    it("should have at least 20 sativa strains", () => {
      const strains = generateStrains();
      const sativaCount = strains.filter(s => s.category === "Sativa").length;
      expect(sativaCount).toBeGreaterThanOrEqual(20);
    });

    it("should have at least 30 hybrid strains", () => {
      const strains = generateStrains();
      const hybridCount = strains.filter(s => s.category === "Hybrid").length;
      expect(hybridCount).toBeGreaterThanOrEqual(30);
    });
  });

  describe("Naming Quality", () => {
    it("should have creative and varied naming patterns", () => {
      const strains = generateStrains();

      // Check for variety in naming patterns
      const hasColorNames = strains.some(s =>
        /purple|blue|green|white|pink|red|golden/i.test(s.name)
      );
      const hasFruitNames = strains.some(s =>
        /berry|cherry|grape|lemon|orange|apple|banana/i.test(s.name)
      );
      const hasDessertNames = strains.some(s =>
        /cake|cookie|cream|gelato|sherbet|pie/i.test(s.name)
      );

      expect(hasColorNames).toBe(true);
      expect(hasFruitNames).toBe(true);
      expect(hasDessertNames).toBe(true);
    });

    it("should have proper title case formatting", () => {
      const strains = generateStrains();

      strains.forEach(strain => {
        // Name should not be all lowercase (except special cases like acronyms)
        const isAcronym = /^[A-Z0-9-]+$/.test(strain.name);
        if (!isAcronym) {
          expect(strain.name).not.toBe(strain.name.toLowerCase());
        }

        // Standardized name should exist and be properly formatted
        expect(strain.standardizedName).toBeTruthy();
        expect(strain.standardizedName.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Data Completeness", () => {
    it("should have descriptions for all strains", () => {
      const strains = generateStrains();

      strains.forEach(strain => {
        expect(strain.description).toBeTruthy();
        expect(strain.description.length).toBeGreaterThan(10);
      });
    });

    it("should have valid aliases in JSON format", () => {
      const strains = generateStrains();

      strains.forEach(strain => {
        expect(() => JSON.parse(strain.aliases)).not.toThrow();
        const aliases = JSON.parse(strain.aliases);
        expect(Array.isArray(aliases)).toBe(true);
        expect(aliases.length).toBeGreaterThan(0);
      });
    });
  });
});
