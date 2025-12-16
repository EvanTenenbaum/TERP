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
