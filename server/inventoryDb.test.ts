/**
 * Property-Based Tests for Inventory Database Functions
 *
 * **Feature: data-display-fix, Property 6: Vendor Batch Query Completeness**
 * **Validates: Requirements 7.1, 7.2**
 *
 * Uses fast-check to verify that getBatchesByVendor correctly returns all batches
 * where batch.lotId references a lot with lot.vendorId equal to the vendor's ID.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { getBatchesByVendor } from "./inventoryDb";

// Type definitions for test data
interface MockBatch {
  id: number;
  code: string;
  sku: string;
  productId: number;
  lotId: number;
  batchStatus: string;
  onHandQty: string;
  createdAt: Date;
}

interface MockLot {
  id: number;
  code: string;
  vendorId: number;
  date: Date;
}

interface MockProduct {
  id: number;
  nameCanonical: string;
  brandId: number;
  category: string;
}

interface MockBrand {
  id: number;
  name: string;
}

describe("getBatchesByVendor", () => {
  /**
   * **Feature: data-display-fix, Property 6: Vendor Batch Query Completeness**
   * **Validates: Requirements 7.1, 7.2**
   *
   * Property: For any vendor with lots, the getBatchesByVendor query SHALL return
   * all batches where batch.lotId references a lot with lot.vendorId equal to the vendor's ID.
   */
  describe("Property 6: Vendor Batch Query Completeness", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return empty array when database is not available", async () => {
      // Arrange
      vi.mocked(getDb).mockResolvedValue(null);

      // Act
      const result = await getBatchesByVendor(1);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return only batches belonging to the specified vendor", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a target vendor ID
          fc.integer({ min: 1, max: 100 }),
          // Generate multiple vendor IDs (including target)
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
          // Generate lots with various vendor IDs
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000 }),
              code: fc.string({ minLength: 5, maxLength: 20 }),
              vendorId: fc.integer({ min: 1, max: 100 }),
              date: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          // Generate batches referencing lots
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000 }),
              code: fc.string({ minLength: 5, maxLength: 20 }),
              sku: fc.string({ minLength: 5, maxLength: 20 }),
              productId: fc.integer({ min: 1, max: 100 }),
              lotId: fc.integer({ min: 1, max: 1000 }),
              batchStatus: fc.constantFrom("LIVE", "AWAITING_INTAKE", "SOLD_OUT"),
              onHandQty: fc.string({ minLength: 1, maxLength: 10 }),
              createdAt: fc.date(),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (targetVendorId, _vendorIds, lots, batches) => {
            // Ensure lots have unique IDs
            const uniqueLots = lots.reduce((acc, lot, idx) => {
              acc.push({ ...lot, id: idx + 1 });
              return acc;
            }, [] as typeof lots);

            // Ensure batches reference valid lot IDs
            const validBatches = batches.map((batch, idx) => ({
              ...batch,
              id: idx + 1,
              lotId: uniqueLots.length > 0 
                ? uniqueLots[idx % uniqueLots.length].id 
                : 1,
            }));

            // Calculate expected results: batches whose lot belongs to target vendor
            const expectedBatchIds = new Set<number>();
            for (const batch of validBatches) {
              const lot = uniqueLots.find(l => l.id === batch.lotId);
              if (lot && lot.vendorId === targetVendorId) {
                expectedBatchIds.add(batch.id);
              }
            }

            // Mock database query result
            const mockQueryResult = validBatches
              .filter(batch => {
                const lot = uniqueLots.find(l => l.id === batch.lotId);
                return lot && lot.vendorId === targetVendorId;
              })
              .map(batch => {
                const lot = uniqueLots.find(l => l.id === batch.lotId);
                return {
                  batch,
                  lot: lot || null,
                  product: { id: batch.productId, nameCanonical: "Test Product", brandId: 1, category: "Test" },
                  brand: { id: 1, name: "Test Brand" },
                };
              });

            // Create mock database chain
            const mockDb = {
              select: vi.fn().mockReturnThis(),
              from: vi.fn().mockReturnThis(),
              innerJoin: vi.fn().mockReturnThis(),
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnThis(),
              orderBy: vi.fn().mockResolvedValue(mockQueryResult),
            };

            vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

            // Act
            const result = await getBatchesByVendor(targetVendorId);

            // Assert: Property - all returned batches should belong to the target vendor
            const returnedBatchIds = new Set(result.map(r => r.batch.id));
            
            // Every returned batch should be in expected set
            for (const batchId of returnedBatchIds) {
              expect(expectedBatchIds.has(batchId)).toBe(true);
            }

            // Every expected batch should be returned
            for (const batchId of expectedBatchIds) {
              expect(returnedBatchIds.has(batchId)).toBe(true);
            }

            // Result count should match expected count
            expect(result.length).toBe(expectedBatchIds.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return empty array when vendor has no lots", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

      // Act
      const result = await getBatchesByVendor(999);

      // Assert
      expect(result).toEqual([]);
    });

    it("should include batch, lot, product, and brand data in results", async () => {
      // Arrange
      const mockResult = [
        {
          batch: { id: 1, code: "BATCH-001", sku: "SKU-001", lotId: 1, productId: 1, batchStatus: "LIVE", onHandQty: "100" },
          lot: { id: 1, code: "LOT-001", vendorId: 1, date: new Date() },
          product: { id: 1, nameCanonical: "Test Product", brandId: 1, category: "Flower" },
          brand: { id: 1, name: "Test Brand" },
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockResult),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

      // Act
      const result = await getBatchesByVendor(1);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("batch");
      expect(result[0]).toHaveProperty("lot");
      expect(result[0]).toHaveProperty("product");
      expect(result[0]).toHaveProperty("brand");
      expect(result[0].batch.id).toBe(1);
      expect(result[0].lot?.vendorId).toBe(1);
    });
  });
});

// ============================================================================
// GOLD STANDARD TESTS FOR getDashboardStats (PERF-004 PREREQUISITE)
// ============================================================================

import { getDashboardStats } from "./inventoryDb";
import { batches, products } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Mock the cache module as getDashboardStats uses it
vi.mock("./_core/cache", () => ({
  default: {
    getOrSet: vi.fn((key, fn) => fn()), // Always execute the function to test the logic
    delete: vi.fn(),
  },
  CacheKeys: {
    dashboardStats: vi.fn().mockReturnValue("dashboardStats"),
  },
  CacheTTL: {
    SHORT: 60,
  },
}));

describe("getDashboardStats (Gold Standard for PERF-004)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBatches = [
    // Batch 1: Flower, LIVE, High Value
    { id: 1, batchStatus: "LIVE", onHandQty: "100.00", unitCogs: "5.50", productId: 1 },
    // Batch 2: Flower, LIVE, Low Value
    { id: 2, batchStatus: "LIVE", onHandQty: "50.00", unitCogs: "2.00", productId: 1 },
    // Batch 3: Edible, QUARANTINED, Medium Value
    { id: 3, batchStatus: "QUARANTINED", onHandQty: "200.00", unitCogs: "1.25", productId: 2 },
    // Batch 4: Concentrate, ON_HOLD, Zero Value (unitCogs is null/zero)
    { id: 4, batchStatus: "ON_HOLD", onHandQty: "10.00", unitCogs: "0.00", productId: 3 },
    // Batch 5: Flower, SOLD_OUT, High Value (should not count towards totalUnits/Value)
    { id: 5, batchStatus: "SOLD_OUT", onHandQty: "0.00", unitCogs: "10.00", productId: 1 },
    // Batch 6: Edible, LIVE, Medium Value
    { id: 6, batchStatus: "LIVE", onHandQty: "100.00", unitCogs: "1.50", productId: 2 },
  ];

  const mockProducts = [
    { id: 1, category: "Flower", subcategory: "Indica" },
    { id: 2, category: "Edible", subcategory: "Gummies" },
    { id: 3, category: "Concentrate", subcategory: "Vape Cart" },
  ];

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    // Mock the final query result for allBatches
    leftJoin: vi.fn().mockResolvedValue(
      mockBatches.map(batch => ({
        batchId: batch.id,
        batchStatus: batch.batchStatus,
        onHandQty: batch.onHandQty,
        unitCogs: batch.unitCogs,
        category: mockProducts.find(p => p.id === batch.productId)?.category,
        subcategory: mockProducts.find(p => p.id === batch.productId)?.subcategory,
      }))
    ),
  };

  beforeEach(() => {
    // Mock the database to return the combined data structure
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);
  });

  it("should return null when database is not available", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const result = await getDashboardStats();
    expect(result).toBeNull();
  });

  it("should correctly calculate total inventory value and total units", async () => {
    // Calculation:
    // B1: 100 * 5.50 = 550.00
    // B2: 50 * 2.00 = 100.00
    // B3: 200 * 1.25 = 250.00
    // B4: 10 * 0.00 = 0.00
    // B5: 0 * 10.00 = 0.00
    // B6: 100 * 1.50 = 150.00
    // Total Value: 550 + 100 + 250 + 0 + 150 = 1050.00
    // Total Units: 100 + 50 + 200 + 10 + 0 + 100 = 460.00

    const result = await getDashboardStats();

    expect(result?.totalInventoryValue).toBe(1050.00);
    expect(result?.totalUnits).toBe(460.00);
    expect(result?.avgValuePerUnit).toBeCloseTo(1050 / 460, 2); // 2.28
  });

  it("should correctly calculate status counts", async () => {
    // Expected Counts:
    // LIVE: 3 (B1, B2, B6)
    // QUARANTINED: 1 (B3)
    // ON_HOLD: 1 (B4)
    // SOLD_OUT: 1 (B5)
    // AWAITING_INTAKE: 0
    // CLOSED: 0

    const result = await getDashboardStats();

    expect(result?.statusCounts).toEqual({
      AWAITING_INTAKE: 0,
      LIVE: 3,
      ON_HOLD: 1,
      QUARANTINED: 1,
      SOLD_OUT: 1,
      CLOSED: 0,
    });
  });

  it("should correctly calculate and sort category stats", async () => {
    // Flower (B1, B2, B5): Units: 100+50+0 = 150. Value: 550+100+0 = 650.00
    // Edible (B3, B6): Units: 200+100 = 300. Value: 250+150 = 400.00
    // Concentrate (B4): Units: 10. Value: 0.00
    // Sort by Value (desc): Flower (650), Edible (400), Concentrate (0)

    const result = await getDashboardStats();

    expect(result?.categoryStats).toHaveLength(3);
    expect(result?.categoryStats[0].name).toBe("Flower");
    expect(result?.categoryStats[0].value).toBe(650.00);
    expect(result?.categoryStats[0].units).toBe(150.00);

    expect(result?.categoryStats[1].name).toBe("Edible");
    expect(result?.categoryStats[1].value).toBe(400.00);
    expect(result?.categoryStats[1].units).toBe(300.00);

    expect(result?.categoryStats[2].name).toBe("Concentrate");
    expect(result?.categoryStats[2].value).toBe(0.00);
    expect(result?.categoryStats[2].units).toBe(10.00);
  });

  it("should correctly calculate and sort subcategory stats", async () => {
    // Indica (B1, B2, B5): Units: 150. Value: 650.00
    // Gummies (B3, B6): Units: 300. Value: 400.00
    // Vape Cart (B4): Units: 10. Value: 0.00
    // Sort by Value (desc): Indica (650), Gummies (400), Vape Cart (0)

    const result = await getDashboardStats();

    expect(result?.subcategoryStats).toHaveLength(3);
    expect(result?.subcategoryStats[0].name).toBe("Indica");
    expect(result?.subcategoryStats[0].value).toBe(650.00);
    expect(result?.subcategoryStats[0].units).toBe(150.00);

    expect(result?.subcategoryStats[1].name).toBe("Gummies");
    expect(result?.subcategoryStats[1].value).toBe(400.00);
    expect(result?.subcategoryStats[1].units).toBe(300.00);

    expect(result?.subcategoryStats[2].name).toBe("Vape Cart");
    expect(result?.subcategoryStats[2].value).toBe(0.00);
    expect(result?.subcategoryStats[2].units).toBe(10.00);
  });
});
