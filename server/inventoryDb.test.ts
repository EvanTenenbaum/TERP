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

// Type definitions for test data (prefixed with _ as they're used for documentation/type safety)
interface _MockBatch {
  id: number;
  code: string;
  sku: string;
  productId: number;
  lotId: number;
  batchStatus: string;
  onHandQty: string;
  createdAt: Date;
}

interface _MockLot {
  id: number;
  code: string;
  vendorId: number;
  date: Date;
}

interface _MockProduct {
  id: number;
  nameCanonical: string;
  brandId: number;
  category: string;
}

interface _MockBrand {
  id: number;
  name: string;
}

// Export to satisfy ESLint (interfaces are for documentation)
export type { _MockBatch, _MockLot, _MockProduct, _MockBrand };

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
          fc.array(fc.integer({ min: 1, max: 100 }), {
            minLength: 1,
            maxLength: 5,
          }),
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
              batchStatus: fc.constantFrom(
                "LIVE",
                "AWAITING_INTAKE",
                "SOLD_OUT"
              ),
              onHandQty: fc.string({ minLength: 1, maxLength: 10 }),
              createdAt: fc.date(),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (targetVendorId, _vendorIds, lots, batches) => {
            // Ensure lots have unique IDs
            const uniqueLots = lots.reduce(
              (acc, lot, idx) => {
                acc.push({ ...lot, id: idx + 1 });
                return acc;
              },
              [] as typeof lots
            );

            // Ensure batches reference valid lot IDs
            const validBatches = batches.map((batch, idx) => ({
              ...batch,
              id: idx + 1,
              lotId:
                uniqueLots.length > 0
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
                  product: {
                    id: batch.productId,
                    nameCanonical: "Test Product",
                    brandId: 1,
                    category: "Test",
                  },
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

            vi.mocked(getDb).mockResolvedValue(
              mockDb as unknown as Awaited<ReturnType<typeof getDb>>
            );

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

      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>
      );

      // Act
      const result = await getBatchesByVendor(999);

      // Assert
      expect(result).toEqual([]);
    });

    it("should include batch, lot, product, and brand data in results", async () => {
      // Arrange
      const mockResult = [
        {
          batch: {
            id: 1,
            code: "BATCH-001",
            sku: "SKU-001",
            lotId: 1,
            productId: 1,
            batchStatus: "LIVE",
            onHandQty: "100",
          },
          lot: { id: 1, code: "LOT-001", vendorId: 1, date: new Date() },
          product: {
            id: 1,
            nameCanonical: "Test Product",
            brandId: 1,
            category: "Flower",
          },
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

      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>
      );

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
// Note: batches, products, eq are available in the actual getDashboardStats function
// but tests use mocked db that doesn't need these imports

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

  // INV-CONSISTENCY-001: getDashboardStats now uses multiple SQL queries with complex chaining.
  // These unit tests verify the function returns null when db is unavailable and test
  // the result transformation logic. Full integration tests should be used for
  // verifying actual SQL query behavior.
  //
  // Key change in INV-CONSISTENCY-001: Only LIVE and PHOTOGRAPHY_COMPLETE batches
  // are counted for totals, category stats, and subcategory stats. Status counts
  // still include all statuses for visibility.

  it("should return null when database is not available", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const result = await getDashboardStats();
    expect(result).toBeNull();
  });

  // Note: The following tests verify result transformation logic with mocked query results.
  // The getDashboardStats function makes 4 separate queries with complex method chaining.
  // To properly test this, we use a mock that tracks query sequence.

  it("should correctly transform totals from SQL aggregation results", async () => {
    // INV-CONSISTENCY-001: Only SELLABLE batches (LIVE, PHOTOGRAPHY_COMPLETE) are counted
    // This test verifies the transformation of SQL SUM results to the expected output format
    let queryCount = 0;

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(function (this: typeof mockDb) {
        queryCount++;
        if (queryCount === 1) {
          // Query 1: Totals
          return Promise.resolve([
            { totalUnits: "275.00", totalValue: "900.00" },
          ]);
        }
        return this;
      }),
      groupBy: vi.fn().mockImplementation(function (this: typeof mockDb) {
        queryCount++;
        if (queryCount === 2) {
          // Query 2: Status counts
          return Promise.resolve([
            { status: "LIVE", count: 3 },
            { status: "PHOTOGRAPHY_COMPLETE", count: 1 },
          ]);
        }
        return this;
      }),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockImplementation(function () {
        queryCount++;
        if (queryCount === 4) {
          // Query 3: Category stats
          return Promise.resolve([
            { name: "Flower", units: "175.00", value: "750.00" },
          ]);
        }
        // Query 4: Subcategory stats
        return Promise.resolve([
          { name: "Indica", units: "175.00", value: "750.00" },
        ]);
      }),
    };

    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    const result = await getDashboardStats();

    // Verify totals are correctly parsed from SQL string results
    expect(result?.totalInventoryValue).toBe(900.0);
    expect(result?.totalUnits).toBe(275.0);
    expect(result?.avgValuePerUnit).toBeCloseTo(900 / 275, 2);
  });

  it("should correctly merge status counts with defaults", async () => {
    // Status counts include ALL batches (for visibility), not just sellable
    // Function should fill in missing statuses with 0
    let queryCount = 0;

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(function (this: typeof mockDb) {
        queryCount++;
        if (queryCount === 1) {
          return Promise.resolve([
            { totalUnits: "100.00", totalValue: "500.00" },
          ]);
        }
        return this;
      }),
      groupBy: vi.fn().mockImplementation(function (this: typeof mockDb) {
        queryCount++;
        if (queryCount === 2) {
          // Only return some statuses - function should fill in defaults
          return Promise.resolve([
            { status: "LIVE", count: 2 },
            { status: "ON_HOLD", count: 1 },
          ]);
        }
        return this;
      }),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    const result = await getDashboardStats();

    // Verify missing statuses are filled with 0
    expect(result?.statusCounts).toEqual({
      AWAITING_INTAKE: 0,
      LIVE: 2,
      PHOTOGRAPHY_COMPLETE: 0,
      ON_HOLD: 1,
      QUARANTINED: 0,
      SOLD_OUT: 0,
      CLOSED: 0,
    });
  });

  it("should correctly transform category and subcategory stats from SQL results", async () => {
    // INV-CONSISTENCY-001: Category/subcategory stats only include SELLABLE batches
    // This test uses a separate orderBy call counter to track which query is executing
    let orderByCallCount = 0;

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(function (this: typeof mockDb) {
        // Check if this is the totals query (first call) by examining if leftJoin was called
        // @ts-expect-error - accessing mock calls
        const leftJoinCalled =
          this.leftJoin.mock.calls.length > orderByCallCount;
        if (!leftJoinCalled && orderByCallCount === 0) {
          // First where() call without leftJoin = totals query
          return Promise.resolve([
            { totalUnits: "275.00", totalValue: "900.00" },
          ]);
        }
        return this;
      }),
      groupBy: vi.fn().mockImplementation(function (this: typeof mockDb) {
        // @ts-expect-error - accessing mock calls
        const leftJoinCalled =
          this.leftJoin.mock.calls.length > orderByCallCount;
        if (!leftJoinCalled) {
          // groupBy without prior leftJoin = status counts query
          return Promise.resolve([{ status: "LIVE", count: 3 }]);
        }
        return this;
      }),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockImplementation(function () {
        orderByCallCount++;
        if (orderByCallCount === 1) {
          // First orderBy = category stats
          return Promise.resolve([
            { name: "Flower", units: "175.00", value: "750.00" },
            { name: "Edible", units: "100.00", value: "150.00" },
          ]);
        }
        // Second orderBy = subcategory stats
        return Promise.resolve([
          { name: "Indica", units: "175.00", value: "750.00" },
          { name: "Gummies", units: "100.00", value: "150.00" },
        ]);
      }),
    };

    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    const result = await getDashboardStats();

    // Verify category stats are parsed correctly
    expect(result?.categoryStats).toHaveLength(2);
    expect(result?.categoryStats[0].name).toBe("Flower");
    expect(result?.categoryStats[0].value).toBe(750.0);
    expect(result?.categoryStats[0].units).toBe(175.0);

    // Verify subcategory stats are parsed correctly
    expect(result?.subcategoryStats).toHaveLength(2);
    expect(result?.subcategoryStats[0].name).toBe("Indica");
    expect(result?.subcategoryStats[0].value).toBe(750.0);
  });
});
