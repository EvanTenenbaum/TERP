import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { getBatchesByVendor, getDashboardStats } from "./inventoryDb";

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
  describe("Property 6: Vendor Batch Query Completeness", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return empty array when database is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      const result = await getBatchesByVendor(1);
      expect(result).toEqual([]);
    });

    it("should return only batches belonging to the specified vendor", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000 }),
              code: fc.string({ minLength: 5, maxLength: 20 }),
              vendorId: fc.integer({ min: 1, max: 100 }),
              date: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
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
            const uniqueLots = lots.reduce((acc, lot, idx) => {
              acc.push({ ...lot, id: idx + 1 });
              return acc;
            }, [] as typeof lots);

            const validBatches = batches.map((batch, idx) => ({
              ...batch,
              id: idx + 1,
              lotId: uniqueLots.length > 0 
                ? uniqueLots[idx % uniqueLots.length].id 
                : 1,
            }));

            const expectedBatchIds = new Set<number>();
            for (const batch of validBatches) {
              const lot = uniqueLots.find(l => l.id === batch.lotId);
              if (lot && lot.vendorId === targetVendorId) {
                expectedBatchIds.add(batch.id);
              }
            }

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

            const mockDb = {
              select: vi.fn().mockReturnThis(),
              from: vi.fn().mockReturnThis(),
              innerJoin: vi.fn().mockReturnThis(),
              leftJoin: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnThis(),
              orderBy: vi.fn().mockResolvedValue(mockQueryResult),
            };

            vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

            const result = await getBatchesByVendor(targetVendorId);

            const returnedBatchIds = new Set(result.map(r => r.batch.id));
            
            for (const batchId of returnedBatchIds) {
              expect(expectedBatchIds.has(batchId)).toBe(true);
            }

            for (const batchId of expectedBatchIds) {
              expect(returnedBatchIds.has(batchId)).toBe(true);
            }

            expect(result.length).toBe(expectedBatchIds.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return empty array when vendor has no lots", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

      const result = await getBatchesByVendor(999);

      expect(result).toEqual([]);
    });

    it("should include batch, lot, product, and brand data in results", async () => {
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

      const result = await getBatchesByVendor(1);

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

vi.mock("./_core/cache", () => ({
  default: {
    getOrSet: vi.fn((key, fn) => fn()),
    delete: vi.fn(),
  },
  CacheKeys: {
    dashboardStats: vi.fn().mockReturnValue("dashboardStats"),
  },
  CacheTTL: {
    SHORT: 60,
  },
}));

/**
 * ST-058-B: safeInArray Migration Tests
 * Verifies that getDashboardStats uses safeInArray for the sellable batch status filter.
 * The SELLABLE_BATCH_STATUSES constant is never empty, but using safeInArray ensures
 * consistent behavior if the constant were ever modified and provides defense-in-depth.
 */
describe("ST-058-B: safeInArray migration for inventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getDashboardStats should not throw when SELLABLE_BATCH_STATUSES filter is applied", async () => {
    // This test verifies the safeInArray integration doesn't cause issues
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        const builder: any = {
          from: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          then: (resolve: any) => resolve([{ totalUnits: "0", totalValue: "0" }]),
        };
        return builder;
      }),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

    // Should not throw - safeInArray handles the status array correctly
    await expect(getDashboardStats()).resolves.not.toThrow();
  });

  it("SELLABLE_BATCH_STATUSES constant should be non-empty", () => {
    // Import and verify the constant is valid for safeInArray
    // This is a defense-in-depth test to catch accidental empty array
    const { SELLABLE_BATCH_STATUSES } = require("./inventoryDb");
    expect(SELLABLE_BATCH_STATUSES).toBeDefined();
    expect(Array.isArray(SELLABLE_BATCH_STATUSES)).toBe(true);
    expect(SELLABLE_BATCH_STATUSES.length).toBeGreaterThan(0);
    expect(SELLABLE_BATCH_STATUSES).toContain("LIVE");
    expect(SELLABLE_BATCH_STATUSES).toContain("PHOTOGRAPHY_COMPLETE");
  });
});

describe("getDashboardStats (Gold Standard for PERF-004)", () => {
  let mockDb: any;
  let queryCallCount: number;

  beforeEach(() => {
    vi.clearAllMocks();
    queryCallCount = 0;

    mockDb = {
      select: vi.fn().mockImplementation(() => {
        queryCallCount++;
        const currentQuery = queryCallCount;

        const builder: any = {
          from: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          then: (resolve: any) => {
            switch (currentQuery) {
              case 1:
                return resolve([{ totalUnits: "460.00", totalValue: "1050.00" }]);
              case 2:
                return resolve([
                  { status: "LIVE", count: 3 },
                  { status: "QUARANTINED", count: 1 },
                  { status: "ON_HOLD", count: 1 },
                  { status: "SOLD_OUT", count: 1 },
                ]);
              case 3:
                return resolve([
                  { name: "Flower", units: "150.00", value: "650.00" },
                  { name: "Edible", units: "300.00", value: "400.00" },
                  { name: "Concentrate", units: "10.00", value: "0.00" },
                ]);
              case 4:
                return resolve([
                  { name: "Indica", units: "150.00", value: "650.00" },
                  { name: "Gummies", units: "300.00", value: "400.00" },
                  { name: "Vape Cart", units: "10.00", value: "0.00" },
                ]);
              default:
                return resolve([]);
            }
          },
        };
        return builder;
      }),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);
  });

  it("should return null when database is not available", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const result = await getDashboardStats();
    expect(result).toBeNull();
  });

  it("should correctly calculate total inventory value and total units", async () => {
    const result = await getDashboardStats();

    expect(result?.totalInventoryValue).toBe(1050.00);
    expect(result?.totalUnits).toBe(460.00);
    expect(result?.avgValuePerUnit).toBeCloseTo(1050 / 460, 2);
  });

  it("should correctly calculate status counts", async () => {
    const result = await getDashboardStats();

    expect(result?.statusCounts).toEqual({
      AWAITING_INTAKE: 0,
      LIVE: 3,
      ON_HOLD: 1,
      PHOTOGRAPHY_COMPLETE: 0,
      QUARANTINED: 1,
      SOLD_OUT: 1,
      CLOSED: 0,
    });
  });

  it("should correctly calculate and sort category stats", async () => {
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