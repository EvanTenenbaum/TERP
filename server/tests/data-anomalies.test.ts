/**
 * Data Anomalies and Edge Cases Tests
 *
 * Ensures that seeded data includes realistic business edge cases:
 * - Partial/incomplete data
 * - Zero-value orders
 * - High-margin outliers
 * - Unusual order patterns
 */

import { describe, it, expect, beforeEach } from "vitest";
import { generateOrders } from "../../scripts/generators/orders.js";
import { setSeed } from "../../scripts/generators/utils.js";
import type { BatchData } from "../../scripts/generators/inventory.js";

// Use deterministic seed for reproducible tests
const TEST_SEED = 12345;

// Mock batch data for testing
const createMockBatches = (count: number): BatchData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    productId: i + 1,
    strainId: (i % 10) + 1,
    batchNumber: `BATCH-${String(i + 1).padStart(4, "0")}`,
    grade: i % 3 === 0 ? "A" : null,
    quantity: 100,
    unitCogs: String(100 + i * 10),
    cogsMode: "FIXED" as const,
    cogsSource: "FIXED" as const,
    sourceType: "CONSIGNMENT" as const,
    vendorId: 1,
    receivedAt: new Date(),
    createdAt: new Date(),
  }));
};

describe("Data Anomalies and Edge Cases", () => {
  // Reset seed before each test for deterministic results
  beforeEach(() => {
    setSeed(TEST_SEED);
  });

  describe("Margin Variation", () => {
    it("should have some high-margin outliers (>50%)", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      // Check for high-margin orders
      const highMarginOrders = orders.filter(order => {
        const marginPercent = parseFloat(order.avgMarginPercent);
        return marginPercent > 50;
      });

      // At least 5% of orders should have high margins
      const highMarginPercent = (highMarginOrders.length / orders.length) * 100;
      expect(highMarginPercent).toBeGreaterThanOrEqual(5);
    });

    it("should have some low-margin outliers (<10%)", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      // Check for low-margin orders
      const lowMarginOrders = orders.filter(order => {
        const marginPercent = parseFloat(order.avgMarginPercent);
        return marginPercent < 10;
      });

      // At least 4% of orders should have low margins (allowing for randomness)
      const lowMarginPercent = (lowMarginOrders.length / orders.length) * 100;
      expect(lowMarginPercent).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Order Size Variation", () => {
    it("should have some very small orders (<$2000)", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      // Check for small orders (B2B wholesale context)
      const smallOrders = orders.filter(order => {
        const total = parseFloat(order.total);
        return total < 2000;
      });

      // At least 8% of orders should be small (deterministic with seed=12345)
      const smallOrderPercent = (smallOrders.length / orders.length) * 100;
      expect(smallOrderPercent).toBeGreaterThanOrEqual(8);
    });

    it("should have some very large orders (>$50,000)", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      // Check for large orders
      const largeOrders = orders.filter(order => {
        const total = parseFloat(order.total);
        return total > 50000;
      });

      // At least 5% of orders should be large
      const largeOrderPercent = (largeOrders.length / orders.length) * 100;
      expect(largeOrderPercent).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Payment Terms Distribution", () => {
    it("should have approximately 50% consignment orders", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      const consignmentOrders = orders.filter(
        order => order.paymentTerms === "CONSIGNMENT"
      );

      const consignmentPercent =
        (consignmentOrders.length / orders.length) * 100;

      // Should be between 45% and 55% (allowing for randomness)
      expect(consignmentPercent).toBeGreaterThanOrEqual(45);
      expect(consignmentPercent).toBeLessThanOrEqual(55);
    });
  });

  describe("Temporal Distribution", () => {
    it("should have orders spread across the entire time period", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      // Get order dates
      const dates = orders.map(order => order.createdAt.getTime());
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);

      // Orders should span at least 18 months (CONFIG.totalMonths = 22)
      const monthsDiff = (maxDate - minDate) / (1000 * 60 * 60 * 24 * 30);
      expect(monthsDiff).toBeGreaterThanOrEqual(18);
    });
  });
});
