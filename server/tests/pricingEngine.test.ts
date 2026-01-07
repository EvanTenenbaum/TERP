import { describe, it, expect, vi } from "vitest";
import { calculateRetailPrice, calculateRetailPrices } from "../pricingEngine";
import type { InventoryItem, PricingRule } from "../pricingEngine";

// Mock console methods to prevent output during tests
vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});

describe("Pricing Engine", () => {
  describe("calculateRetailPrice", () => {
    it("should return base price when no rules apply", async () => {
      const item: InventoryItem = {
        id: 1,
        name: "Test Item",
        basePrice: 100.0,
      };

      const rules: PricingRule[] = [];

      const result = await calculateRetailPrice(item, rules);

      expect(result.retailPrice).toBe(100.0);
      expect(result.appliedRules).toHaveLength(0);
    });

    it("should apply percentage markup", async () => {
      const item: InventoryItem = {
        id: 1,
        name: "Test Item",
        basePrice: 100.0,
        category: "flower",
      };

      const rules: PricingRule[] = [
        {
          id: 1,
          name: "Flower Markup",
          adjustmentType: "PERCENT_MARKUP",
          adjustmentValue: "20", // 20% markup
          conditions: { category: "flower" },
          logicType: "AND",
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];

      const result = await calculateRetailPrice(item, rules);

      // 100 * 1.20 = 120
      expect(result.retailPrice).toBe(120.0);
      expect(result.appliedRules).toHaveLength(1);
      expect(result.appliedRules[0].ruleName).toBe("Flower Markup");
    });

    it("should apply percentage markdown", async () => {
      const item: InventoryItem = {
        id: 1,
        name: "Test Item",
        basePrice: 100.0,
        category: "clearance",
      };

      const rules: PricingRule[] = [
        {
          id: 1,
          name: "Clearance Discount",
          adjustmentType: "PERCENT_MARKDOWN",
          adjustmentValue: "25", // 25% discount
          conditions: { category: "clearance" },
          logicType: "AND",
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];

      const result = await calculateRetailPrice(item, rules);

      // 100 * 0.75 = 75
      expect(result.retailPrice).toBe(75.0);
      expect(result.appliedRules).toHaveLength(1);
    });

    it("should apply dollar markup", async () => {
      const item: InventoryItem = {
        id: 1,
        name: "Test Item",
        basePrice: 100.0,
        grade: "premium",
      };

      const rules: PricingRule[] = [
        {
          id: 1,
          name: "Premium Markup",
          adjustmentType: "DOLLAR_MARKUP",
          adjustmentValue: "15.00", // $15 markup
          conditions: { grade: "premium" },
          logicType: "AND",
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];

      const result = await calculateRetailPrice(item, rules);

      // 100 + 15 = 115
      expect(result.retailPrice).toBe(115.0);
    });

    it("should apply dollar markdown", async () => {
      const item: InventoryItem = {
        id: 1,
        name: "Test Item",
        basePrice: 100.0,
        tags: ["sale"],
      };

      const rules: PricingRule[] = [
        {
          id: 1,
          name: "Sale Discount",
          adjustmentType: "DOLLAR_MARKDOWN",
          adjustmentValue: "10.00", // $10 discount
          conditions: { tag: "sale" },
          logicType: "AND",
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];

      const result = await calculateRetailPrice(item, rules);

      // 100 - 10 = 90
      expect(result.retailPrice).toBe(90.0);
    });

    it("should apply highest priority rule when multiple rules match", async () => {
      const item: InventoryItem = {
        id: 1,
        name: "Test Item",
        basePrice: 100.0,
        category: "flower",
        grade: "premium",
      };

      const rules: PricingRule[] = [
        {
          id: 1,
          name: "Flower Markup",
          adjustmentType: "PERCENT_MARKUP",
          adjustmentValue: "20", // 20% markup
          conditions: { category: "flower" },
          logicType: "AND",
          priority: 2, // Lower priority
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
        {
          id: 2,
          name: "Premium Markup",
          adjustmentType: "DOLLAR_MARKUP",
          adjustmentValue: "30.00", // $30 markup
          conditions: { grade: "premium" },
          logicType: "AND",
          priority: 10, // Higher priority
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];

      const result = await calculateRetailPrice(item, rules);

      // Should apply premium rule first: 100 + 30 = 130
      // Then flower rule: 130 * 1.20 = 156
      expect(result.retailPrice).toBe(156.0);
      expect(result.appliedRules).toHaveLength(2);
    });

    it("should not apply rules that do not match conditions", async () => {
      const item: InventoryItem = {
        id: 1,
        name: "Test Item",
        basePrice: 100.0,
        category: "flower",
      };

      const rules: PricingRule[] = [
        {
          id: 1,
          name: "Edibles Markup",
          adjustmentType: "PERCENT_MARKUP",
          adjustmentValue: "50",
          conditions: { category: "edibles" }, // Does not match
          logicType: "AND",
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];

      const result = await calculateRetailPrice(item, rules);

      // No rules applied, should be base price
      expect(result.retailPrice).toBe(100.0);
      expect(result.appliedRules).toHaveLength(0);
    });

    it("should handle price range conditions", async () => {
      const item: InventoryItem = {
        id: 1,
        name: "Test Item",
        basePrice: 50.0,
      };

      const rules: PricingRule[] = [
        {
          id: 1,
          name: "Budget Markup",
          adjustmentType: "PERCENT_MARKUP",
          adjustmentValue: "30",
          conditions: { priceMin: 0, priceMax: 100 }, // Matches
          logicType: "AND",
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];

      const result = await calculateRetailPrice(item, rules);

      // 50 * 1.30 = 65
      expect(result.retailPrice).toBe(65.0);
    });

    it("should calculate price markup correctly", async () => {
      const item: InventoryItem = {
        id: 1,
        name: "Test Item",
        basePrice: 100.0,
        category: "all",
      };

      const rules: PricingRule[] = [
        {
          id: 1,
          name: "Standard Markup",
          adjustmentType: "PERCENT_MARKUP",
          adjustmentValue: "50", // 50% markup
          conditions: { category: "all" }, // Match all items in 'all' category
          logicType: "AND",
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];

      const result = await calculateRetailPrice(item, rules);

      expect(result.priceMarkup).toBe(50.0); // 50% markup
      expect(result.retailPrice).toBe(150.0);
    });
  });

  // BUG-040: Tests for empty rules handling
  describe("calculateRetailPrices with empty rules (BUG-040)", () => {
    it("should return base prices for all items when rules array is empty", async () => {
      const items: InventoryItem[] = [
        { id: 1, name: "Item 1", basePrice: 100.0 },
        { id: 2, name: "Item 2", basePrice: 200.0 },
        { id: 3, name: "Item 3", basePrice: 50.0 },
      ];

      const rules: PricingRule[] = [];

      const results = await calculateRetailPrices(items, rules);

      expect(results).toHaveLength(3);
      expect(results[0].retailPrice).toBe(100.0);
      expect(results[0].appliedRules).toHaveLength(0);
      expect(results[1].retailPrice).toBe(200.0);
      expect(results[1].appliedRules).toHaveLength(0);
      expect(results[2].retailPrice).toBe(50.0);
      expect(results[2].appliedRules).toHaveLength(0);
    });

    it("should return base price for single item when rules array is empty", async () => {
      const item: InventoryItem = {
        id: 1,
        name: "Test Item",
        basePrice: 150.0,
        category: "flower",
        grade: "premium",
      };

      const rules: PricingRule[] = [];

      const result = await calculateRetailPrice(item, rules);

      expect(result.retailPrice).toBe(150.0);
      expect(result.appliedRules).toHaveLength(0);
      expect(result.priceMarkup).toBe(0);
    });

    it("should handle empty items array with empty rules", async () => {
      const items: InventoryItem[] = [];
      const rules: PricingRule[] = [];

      const results = await calculateRetailPrices(items, rules);

      expect(results).toHaveLength(0);
    });

    it("should handle items with zero base price and empty rules", async () => {
      const item: InventoryItem = {
        id: 1,
        name: "Free Item",
        basePrice: 0,
      };

      const rules: PricingRule[] = [];

      const result = await calculateRetailPrice(item, rules);

      expect(result.retailPrice).toBe(0);
      expect(result.priceMarkup).toBeNaN(); // Division by zero results in NaN
    });
  });

  // BUG-040: Tests for rules that don't match any items
  describe("calculateRetailPrices with non-matching rules (BUG-040)", () => {
    it("should return base prices when rules exist but none match", async () => {
      const items: InventoryItem[] = [
        { id: 1, name: "Item 1", basePrice: 100.0, category: "edibles" },
        { id: 2, name: "Item 2", basePrice: 200.0, category: "edibles" },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: "Flower Markup",
          adjustmentType: "PERCENT_MARKUP",
          adjustmentValue: "20",
          conditions: { category: "flower" }, // Does not match 'edibles'
          logicType: "AND",
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];

      const results = await calculateRetailPrices(items, rules);

      expect(results).toHaveLength(2);
      expect(results[0].retailPrice).toBe(100.0);
      expect(results[0].appliedRules).toHaveLength(0);
      expect(results[1].retailPrice).toBe(200.0);
      expect(results[1].appliedRules).toHaveLength(0);
    });

    it("should handle mixed matching - some items get rules, some do not", async () => {
      const items: InventoryItem[] = [
        { id: 1, name: "Flower Item", basePrice: 100.0, category: "flower" },
        { id: 2, name: "Edible Item", basePrice: 100.0, category: "edibles" },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: "Flower Markup",
          adjustmentType: "PERCENT_MARKUP",
          adjustmentValue: "50",
          conditions: { category: "flower" },
          logicType: "AND",
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];

      const results = await calculateRetailPrices(items, rules);

      expect(results).toHaveLength(2);
      // Flower item should get 50% markup
      expect(results[0].retailPrice).toBe(150.0);
      expect(results[0].appliedRules).toHaveLength(1);
      // Edible item should stay at base price
      expect(results[1].retailPrice).toBe(100.0);
      expect(results[1].appliedRules).toHaveLength(0);
    });
  });
});
