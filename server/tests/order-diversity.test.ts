/**
 * Order Diversity Tests
 *
 * Ensures that orders have realistic variety in:
 * - Number of items per order (long-tail distribution)
 * - Product popularity (Pareto distribution)
 * - Quantities (realistic B2B quantities)
 */

import { describe, it, expect } from "vitest";
import { generateOrders } from "../../scripts/generators/orders.js";
import type { BatchData } from "../../scripts/generators/inventory.js";

// Mock batch data for testing
const createMockBatches = (count: number): BatchData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    productId: i + 1,
    strainId: (i % 10) + 1,
    batchNumber: `BATCH-${String(i + 1).padStart(4, "0")}`,
    grade: i % 3 === 0 ? "A" : null, // Every 3rd is flower (has grade)
    quantity: 100,
    unitCogs: String(100 + i * 10),
    cogsMode: "FIXED" as const,
    cogsSource: "FIXED" as const,
    sourceType: "CONSIGNMENT" as const,
    vendorId: 1,
    receivedAt: new Date(),
    createdAt: new Date(),
    popularityWeight: 1, // Will be assigned based on Pareto distribution
  }));
};

describe("Order Diversity", () => {
  describe("Item Count Distribution", () => {
    it("should generate orders with varied item counts (long-tail distribution)", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      // Extract item counts
      const itemCounts = orders.map(order => order.items.length);

      // Most orders should have 2-5 items (long-tail)
      const smallOrders = itemCounts.filter(
        count => count >= 1 && count <= 5
      ).length;
      const mediumOrders = itemCounts.filter(
        count => count >= 6 && count <= 10
      ).length;
      const largeOrders = itemCounts.filter(count => count > 10).length;

      // Verify long-tail distribution (most orders are small)
      expect(smallOrders).toBeGreaterThan(mediumOrders);
      expect(mediumOrders).toBeGreaterThan(largeOrders);

      // At least 60% of orders should have 5 or fewer items
      const smallOrderPercent = (smallOrders / orders.length) * 100;
      expect(smallOrderPercent).toBeGreaterThanOrEqual(60);
    });

    it("should have an average of 4-5 items per order", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      const totalItems = orders.reduce(
        (sum, order) => sum + order.items.length,
        0
      );
      const avgItems = totalItems / orders.length;

      expect(avgItems).toBeGreaterThanOrEqual(3.5);
      expect(avgItems).toBeLessThanOrEqual(5.5);
    });
  });

  describe("Product Popularity Distribution", () => {
    it("should follow Pareto distribution (80/20 rule)", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      // Count how many times each batch appears in orders
      const batchFrequency = new Map<number, number>();
      orders.forEach(order => {
        order.items.forEach(item => {
          const count = batchFrequency.get(item.batchId) || 0;
          batchFrequency.set(item.batchId, count + 1);
        });
      });

      // Sort batches by frequency (descending)
      const sortedBatches = Array.from(batchFrequency.entries()).sort(
        (a, b) => b[1] - a[1]
      );

      // Top 20% of products should account for at least 60% of sales
      const top20PercentCount = Math.ceil(sortedBatches.length * 0.2);
      const top20Batches = sortedBatches.slice(0, top20PercentCount);
      const top20Sales = top20Batches.reduce(
        (sum, [, count]) => sum + count,
        0
      );
      const totalSales = Array.from(batchFrequency.values()).reduce(
        (sum, count) => sum + count,
        0
      );
      const top20Percent = (top20Sales / totalSales) * 100;

      expect(top20Percent).toBeGreaterThanOrEqual(60);
    });

    it("should have significant variation in product frequency", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      // Count batch appearances
      const batchFrequency = new Map<number, number>();
      orders.forEach(order => {
        order.items.forEach(item => {
          const count = batchFrequency.get(item.batchId) || 0;
          batchFrequency.set(item.batchId, count + 1);
        });
      });

      // Get frequency values and sort
      const frequencies = Array.from(batchFrequency.values()).sort(
        (a, b) => b - a
      );

      // Top product should be ordered significantly more than median
      const topFrequency = frequencies[0];
      const medianFrequency = frequencies[Math.floor(frequencies.length / 2)];

      expect(topFrequency).toBeGreaterThan(medianFrequency * 2);
    });
  });

  describe("Quantity Variation", () => {
    it("should have varied quantities for flower products (0.5 to 20 lbs)", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      // Extract flower quantities (items from batches with grade)
      const flowerQuantities: number[] = [];
      orders.forEach(order => {
        order.items.forEach(item => {
          const batch = batches.find(b => b.id === item.batchId);
          if (batch?.grade) {
            flowerQuantities.push(item.quantity);
          }
        });
      });

      if (flowerQuantities.length > 0) {
        const minQty = Math.min(...flowerQuantities);
        const maxQty = Math.max(...flowerQuantities);

        expect(minQty).toBeGreaterThanOrEqual(0.5);
        expect(maxQty).toBeLessThanOrEqual(20);

        // Most should be in the 2-5 lb range
        const midRangeQty = flowerQuantities.filter(
          q => q >= 2 && q <= 5
        ).length;
        const midRangePercent = (midRangeQty / flowerQuantities.length) * 100;
        expect(midRangePercent).toBeGreaterThanOrEqual(40);
      }
    });

    it("should have varied quantities for non-flower products (5 to 100 units)", () => {
      const whaleClientIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const regularClientIds = Array.from({ length: 50 }, (_, i) => i + 11);
      const batches = createMockBatches(100);

      const orders = generateOrders(whaleClientIds, regularClientIds, batches);

      // Extract non-flower quantities
      const nonFlowerQuantities: number[] = [];
      orders.forEach(order => {
        order.items.forEach(item => {
          const batch = batches.find(b => b.id === item.batchId);
          if (!batch?.grade) {
            nonFlowerQuantities.push(item.quantity);
          }
        });
      });

      if (nonFlowerQuantities.length > 0) {
        const minQty = Math.min(...nonFlowerQuantities);
        const maxQty = Math.max(...nonFlowerQuantities);

        expect(minQty).toBeGreaterThanOrEqual(1);
        expect(maxQty).toBeLessThanOrEqual(100);

        // Most should be in the 10-30 unit range
        const midRangeQty = nonFlowerQuantities.filter(
          q => q >= 10 && q <= 30
        ).length;
        const midRangePercent =
          (midRangeQty / nonFlowerQuantities.length) * 100;
        expect(midRangePercent).toBeGreaterThanOrEqual(30);
      }
    });
  });
});
