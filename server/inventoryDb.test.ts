import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import {
  getBatchesBySupplier,
  getBatchesWithDetails,
  getDashboardStats,
  searchBatches,
  SELLABLE_BATCH_STATUSES,
} from "./inventoryDb";
import { products } from "../drizzle/schema";

// Type definitions for test data
type QueryRow = Record<string, string | number | null>;
type QueryResult = QueryRow[];

type QueryBuilder = {
  from: () => QueryBuilder;
  leftJoin: () => QueryBuilder;
  groupBy: () => QueryBuilder;
  orderBy: () => QueryBuilder;
  where: () => QueryBuilder;
  then: (resolve: (value: QueryResult) => void) => void;
};

describe("getBatchesBySupplier", () => {
  describe("Property 6: Supplier Batch Query Completeness", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return empty array when database is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      const result = await getBatchesBySupplier(1);
      expect(result).toEqual([]);
    });

    it("should return only batches belonging to the specified supplier", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.array(fc.integer({ min: 1, max: 100 }), {
            minLength: 1,
            maxLength: 5,
          }),
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000 }),
              code: fc.string({ minLength: 5, maxLength: 20 }),
              supplierClientId: fc.integer({ min: 1, max: 100 }),
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
          async (targetSupplierId, _supplierIds, lots, batches) => {
            const uniqueLots = lots.reduce(
              (acc, lot, idx) => {
                acc.push({ ...lot, id: idx + 1 });
                return acc;
              },
              [] as typeof lots
            );

            const validBatches = batches.map((batch, idx) => ({
              ...batch,
              id: idx + 1,
              lotId:
                uniqueLots.length > 0
                  ? uniqueLots[idx % uniqueLots.length].id
                  : 1,
            }));

            const expectedBatchIds = new Set<number>();
            for (const batch of validBatches) {
              const lot = uniqueLots.find(l => l.id === batch.lotId);
              if (lot && lot.supplierClientId === targetSupplierId) {
                expectedBatchIds.add(batch.id);
              }
            }

            const mockQueryResult = validBatches
              .filter(batch => {
                const lot = uniqueLots.find(l => l.id === batch.lotId);
                return lot && lot.supplierClientId === targetSupplierId;
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
                  supplierClient: lot
                    ? { id: lot.supplierClientId, name: "Test Supplier" }
                    : null,
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

            vi.mocked(getDb).mockResolvedValue(
              mockDb as unknown as Awaited<ReturnType<typeof getDb>>
            );

            const result = await getBatchesBySupplier(targetSupplierId);

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

    it("should return empty array when supplier has no lots", async () => {
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

      const result = await getBatchesBySupplier(999);

      expect(result).toEqual([]);
    });

    it("should include batch, lot, product, brand, and supplierClient data in results", async () => {
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
          lot: {
            id: 1,
            code: "LOT-001",
            supplierClientId: 1,
            date: new Date(),
          },
          product: {
            id: 1,
            nameCanonical: "Test Product",
            brandId: 1,
            category: "Flower",
          },
          brand: { id: 1, name: "Test Brand" },
          supplierClient: { id: 1, name: "Test Supplier" },
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

      const result = await getBatchesBySupplier(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("batch");
      expect(result[0]).toHaveProperty("lot");
      expect(result[0]).toHaveProperty("product");
      expect(result[0]).toHaveProperty("brand");
      expect(result[0]).toHaveProperty("supplierClient");
      expect(result[0].batch.id).toBe(1);
      expect(result[0].lot?.supplierClientId).toBe(1);
    });
  });
});

describe("getBatchesWithDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should select product fields with real strainId column", async () => {
    const mockResult = [
      {
        batch: { id: 1 },
        product: { id: 1 },
        brand: { id: 1 },
        lot: { id: 1 },
        supplierClient: { id: 1 },
      },
    ];

    const mockQuery = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockResult),
    };

    const mockDb = {
      select: vi.fn().mockReturnValue(mockQuery),
    };

    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    await getBatchesWithDetails(10, 5);

    const selectArgs = mockDb.select.mock.calls[0][0];
    expect(selectArgs.product.strainId).toBeDefined();
    expect(selectArgs.product.strainId).toEqual(products.strainId);
  });
});

describe("searchBatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should select product fields with real strainId column", async () => {
    const mockResult = [
      {
        batch: { id: 1 },
        product: { id: 1 },
        brand: { id: 1 },
        lot: { id: 1 },
        supplierClient: { id: 1 },
      },
    ];

    const mockQuery = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockResult),
    };

    const mockDb = {
      select: vi.fn().mockReturnValue(mockQuery),
    };

    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    await searchBatches("search", 10, 5);

    const selectArgs = mockDb.select.mock.calls[0][0];
    expect(selectArgs.product.strainId).toBeDefined();
    expect(selectArgs.product.strainId).toEqual(products.strainId);
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
        const builder: QueryBuilder = {
          from: () => builder,
          leftJoin: () => builder,
          groupBy: () => builder,
          orderBy: () => builder,
          where: () => builder,
          then: (resolve: (value: QueryResult) => void) =>
            resolve([
              {
                totalBatches: 100,
                liveBatches: 50,
                totalValue: "1000000",
                totalOnHand: "5000",
              },
            ]),
        };
        return builder;
      }),
    };

    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    // Should not throw
    await expect(getDashboardStats()).resolves.toBeDefined();
  });

  it("SELLABLE_BATCH_STATUSES should be a non-empty array", () => {
    expect(Array.isArray(SELLABLE_BATCH_STATUSES)).toBe(true);
    expect(SELLABLE_BATCH_STATUSES.length).toBeGreaterThan(0);
  });
});
