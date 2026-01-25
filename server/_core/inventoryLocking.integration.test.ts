/**
 * REL-006: Inventory Locking Integration Tests
 *
 * Tests inventory locking behavior with realistic transaction scenarios.
 * These tests validate:
 * - Row-level locking with withBatchLock
 * - Multi-batch locking with proper ordering to prevent deadlocks
 * - Allocation and return operations with quantity tracking
 * - Lock timeout behavior
 *
 * Task: QA-012
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupDbMock } from "../test-utils/testDb";

// Mock the database module (MUST be before other imports that use it)
vi.mock("../db", () => setupDbMock());

// Mock the logger
vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock schema imports for update/insert operations
vi.mock("../../drizzle/schema", () => ({
  batches: { id: "id", onHandQty: "on_hand_qty" },
  inventoryMovements: {},
}));

import { TRPCError } from "@trpc/server";
import {
  withBatchLock,
  withMultiBatchLock,
  allocateFromBatch,
  returnToBatch,
  allocateFromMultipleBatches,
  type LockedBatch,
} from "./inventoryLocking";
import { logger } from "./logger";

/**
 * Create a mock transaction that simulates MySQL FOR UPDATE locking behavior
 * Tracks the order of SQL operations for verification
 */
function createMockTransaction(batchData: LockedBatch | LockedBatch[] | null) {
  const sqlOperations: string[] = [];
  let executeCallCount = 0;

  const mockExecute = vi.fn().mockImplementation((query: any) => {
    executeCallCount++;
    // Store query for potential debugging (prefixed with _ to indicate intentionally unused)
    const _queryStr = query?.toString?.() || JSON.stringify(query);

    // First call is SET SESSION (timeout configuration)
    if (executeCallCount === 1) {
      sqlOperations.push("SET_TIMEOUT");
      return Promise.resolve([]);
    }

    // Second call is SELECT ... FOR UPDATE
    sqlOperations.push("SELECT_FOR_UPDATE");

    if (batchData === null) {
      return Promise.resolve([]);
    }

    if (Array.isArray(batchData)) {
      return Promise.resolve(batchData);
    }

    return Promise.resolve([batchData]);
  });

  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => {
        sqlOperations.push("UPDATE");
        return Promise.resolve([]);
      }),
    }),
  });

  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockImplementation(() => {
      sqlOperations.push("INSERT");
      return Promise.resolve([{ insertId: 1 }]);
    }),
  });

  return {
    execute: mockExecute,
    update: mockUpdate,
    insert: mockInsert,
    getSqlOperations: () => sqlOperations,
    resetCallCount: () => {
      executeCallCount = 0;
    },
  };
}

/**
 * Create a sample batch for testing
 */
function createTestBatch(overrides: Partial<LockedBatch> = {}): LockedBatch {
  return {
    id: 1,
    lotId: 100,
    sku: "TEST-SKU-001",
    onHandQty: 100,
    allocatedQty: 0,
    unitCogs: 25.5,
    status: "LIVE",
    ...overrides,
  };
}

describe("inventoryLocking Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("withBatchLock", () => {
    it("should acquire lock and execute callback with batch data", async () => {
      const testBatch = createTestBatch({
        id: 42,
        sku: "LOCK-TEST-001",
        onHandQty: 200,
      });
      const tx = createMockTransaction(testBatch);
      const callbackResult = { processed: true, timestamp: Date.now() };
      const callback = vi.fn().mockResolvedValue(callbackResult);

      const result = await withBatchLock(tx as any, 42, callback);

      expect(callback).toHaveBeenCalledWith(testBatch);
      expect(result).toEqual(callbackResult);
      expect(tx.getSqlOperations()).toContain("SET_TIMEOUT");
      expect(tx.getSqlOperations()).toContain("SELECT_FOR_UPDATE");
    });

    it("should set lock timeout before acquiring lock", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await withBatchLock(tx as any, 1, async () => ({ ok: true }), {
        lockTimeout: 30,
      });

      const operations = tx.getSqlOperations();
      expect(operations[0]).toBe("SET_TIMEOUT");
      expect(operations[1]).toBe("SELECT_FOR_UPDATE");
    });

    it("should throw NOT_FOUND when batch does not exist", async () => {
      const tx = createMockTransaction(null);

      await expect(
        withBatchLock(tx as any, 999, async () => ({}))
      ).rejects.toThrow(TRPCError);

      try {
        tx.resetCallCount();
        await withBatchLock(tx as any, 999, async () => ({}));
      } catch (error) {
        expect((error as TRPCError).code).toBe("NOT_FOUND");
        expect((error as TRPCError).message).toContain("999");
        expect((error as TRPCError).message).toContain("not found");
      }
    });

    it("should throw CONFLICT on lock wait timeout", async () => {
      const tx = {
        execute: vi
          .fn()
          .mockRejectedValue(
            new Error("lock wait timeout exceeded trying to acquire lock")
          ),
      };

      await expect(
        withBatchLock(tx as any, 1, async () => ({}))
      ).rejects.toThrow(TRPCError);

      try {
        await withBatchLock(tx as any, 1, async () => ({}));
      } catch (error) {
        expect((error as TRPCError).code).toBe("CONFLICT");
        expect((error as TRPCError).message).toContain(
          "currently being modified"
        );
        expect((error as TRPCError).message).toContain("retry");
      }
    });

    it("should log lock acquisition with batch details", async () => {
      const testBatch = createTestBatch({
        id: 5,
        onHandQty: 50,
        allocatedQty: 10,
      });
      const tx = createMockTransaction(testBatch);

      await withBatchLock(tx as any, 5, async () => ({ done: true }));

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 5,
          onHandQty: 50,
          allocatedQty: 10,
        }),
        expect.stringContaining("Acquired lock")
      );
    });

    it("should log warning on lock timeout", async () => {
      const tx = {
        execute: vi
          .fn()
          .mockRejectedValue(new Error("lock wait timeout exceeded")),
      };

      try {
        await withBatchLock(tx as any, 1, async () => ({}), {
          lockTimeout: 15,
        });
      } catch (_e) {
        // Expected
      }

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 1,
          lockTimeout: 15,
        }),
        expect.stringContaining("timeout")
      );
    });

    it("should respect custom lock timeout option", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await withBatchLock(tx as any, 1, async () => ({}), { lockTimeout: 60 });

      // The execute should be called with timeout configuration
      expect(tx.execute).toHaveBeenCalledTimes(2);
    });

    it("should propagate callback errors correctly", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);
      const callbackError = new Error("Callback processing failed");

      await expect(
        withBatchLock(tx as any, 1, async () => {
          throw callbackError;
        })
      ).rejects.toThrow("Callback processing failed");
    });
  });

  describe("withMultiBatchLock", () => {
    it("should lock multiple batches and return as Map", async () => {
      const batches: LockedBatch[] = [
        createTestBatch({ id: 1, sku: "A" }),
        createTestBatch({ id: 2, sku: "B" }),
        createTestBatch({ id: 3, sku: "C" }),
      ];
      const tx = createMockTransaction(batches);

      const result = await withMultiBatchLock(
        tx as any,
        [1, 2, 3],
        async batchMap => {
          expect(batchMap).toBeInstanceOf(Map);
          expect(batchMap.size).toBe(3);
          expect(batchMap.get(1)?.sku).toBe("A");
          expect(batchMap.get(2)?.sku).toBe("B");
          expect(batchMap.get(3)?.sku).toBe("C");
          return { locked: true, count: batchMap.size };
        }
      );

      expect(result).toEqual({ locked: true, count: 3 });
    });

    it("should sort batch IDs to prevent deadlocks", async () => {
      const batches: LockedBatch[] = [
        createTestBatch({ id: 1 }),
        createTestBatch({ id: 5 }),
        createTestBatch({ id: 10 }),
      ];
      const tx = createMockTransaction(batches);

      // Provide IDs in unsorted order
      await withMultiBatchLock(tx as any, [10, 1, 5], async batchMap => {
        // All batches should be accessible
        expect(batchMap.has(1)).toBe(true);
        expect(batchMap.has(5)).toBe(true);
        expect(batchMap.has(10)).toBe(true);
        return { sorted: true };
      });

      // The locks should have been acquired in sorted order (1, 5, 10)
      expect(tx.getSqlOperations()).toContain("SELECT_FOR_UPDATE");
    });

    it("should throw BAD_REQUEST when no batch IDs provided", async () => {
      const tx = createMockTransaction([]);

      await expect(
        withMultiBatchLock(tx as any, [], async () => ({}))
      ).rejects.toThrow(TRPCError);

      try {
        await withMultiBatchLock(tx as any, [], async () => ({}));
      } catch (error) {
        expect((error as TRPCError).code).toBe("BAD_REQUEST");
        expect((error as TRPCError).message).toContain("No batch IDs");
      }
    });

    it("should throw NOT_FOUND when any batch is missing", async () => {
      const batches: LockedBatch[] = [
        createTestBatch({ id: 1 }),
        // Batch 2 is missing
        createTestBatch({ id: 3 }),
      ];
      const tx = createMockTransaction(batches);

      await expect(
        withMultiBatchLock(tx as any, [1, 2, 3], async () => ({}))
      ).rejects.toThrow(TRPCError);

      try {
        tx.resetCallCount();
        await withMultiBatchLock(tx as any, [1, 2, 3], async () => ({}));
      } catch (error) {
        expect((error as TRPCError).code).toBe("NOT_FOUND");
        expect((error as TRPCError).message).toContain("2");
      }
    });

    it("should throw CONFLICT on lock wait timeout for batch set", async () => {
      const tx = {
        execute: vi
          .fn()
          .mockRejectedValue(new Error("lock wait timeout exceeded")),
      };

      await expect(
        withMultiBatchLock(tx as any, [1, 2, 3], async () => ({}))
      ).rejects.toThrow(TRPCError);

      try {
        await withMultiBatchLock(tx as any, [1, 2, 3], async () => ({}));
      } catch (error) {
        expect((error as TRPCError).code).toBe("CONFLICT");
        expect((error as TRPCError).message).toContain("being modified");
      }
    });

    it("should log multi-batch lock acquisition", async () => {
      const batches: LockedBatch[] = [
        createTestBatch({ id: 1 }),
        createTestBatch({ id: 2 }),
      ];
      const tx = createMockTransaction(batches);

      await withMultiBatchLock(tx as any, [2, 1], async () => ({ ok: true }));

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          batchIds: [1, 2], // Should be sorted
          count: 2,
        }),
        expect.stringContaining("multiple batches")
      );
    });
  });

  describe("allocateFromBatch", () => {
    it("should decrease quantity and record inventory movement", async () => {
      const testBatch = createTestBatch({
        id: 10,
        onHandQty: 100,
        allocatedQty: 0,
        unitCogs: 50,
      });
      const tx = createMockTransaction(testBatch);

      const result = await allocateFromBatch(tx as any, {
        batchId: 10,
        quantity: 25,
        orderId: 500,
        userId: 1,
      });

      expect(result.batchId).toBe(10);
      expect(result.quantityAllocated).toBe(25);
      expect(result.unitCogs).toBe(50);
      expect(result.previousQty).toBe(100);
      expect(result.newQty).toBe(75);

      // Verify database operations
      expect(tx.update).toHaveBeenCalled();
      expect(tx.insert).toHaveBeenCalled();
      expect(tx.getSqlOperations()).toContain("UPDATE");
      expect(tx.getSqlOperations()).toContain("INSERT");
    });

    it("should track correct quantity before and after allocation", async () => {
      const testBatch = createTestBatch({
        id: 1,
        onHandQty: 200,
        allocatedQty: 50,
        unitCogs: 30,
      });
      const tx = createMockTransaction(testBatch);

      const result = await allocateFromBatch(tx as any, {
        batchId: 1,
        quantity: 100,
        userId: 1,
      });

      expect(result.previousQty).toBe(200);
      expect(result.newQty).toBe(100); // 200 - 100
      expect(result.quantityAllocated).toBe(100);
    });

    it("should throw CONFLICT when insufficient quantity available", async () => {
      const testBatch = createTestBatch({
        id: 1,
        onHandQty: 10,
        allocatedQty: 5, // Only 5 available (10 - 5)
      });
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: 10, // Requesting more than available
          userId: 1,
        })
      ).rejects.toThrow(TRPCError);

      try {
        tx.resetCallCount();
        await allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: 10,
          userId: 1,
        });
      } catch (error) {
        expect((error as TRPCError).code).toBe("CONFLICT");
        expect((error as TRPCError).message).toContain("Insufficient");
        expect((error as TRPCError).message).toContain("Available: 5");
        expect((error as TRPCError).message).toContain("Requested: 10");
      }
    });

    it("should return zero allocation when throwOnInsufficient is false", async () => {
      const testBatch = createTestBatch({
        id: 1,
        onHandQty: 5,
        allocatedQty: 3,
        unitCogs: 20,
      });
      const tx = createMockTransaction(testBatch);

      const result = await allocateFromBatch(
        tx as any,
        {
          batchId: 1,
          quantity: 10,
          userId: 1,
        },
        { throwOnInsufficient: false }
      );

      expect(result.quantityAllocated).toBe(0);
      expect(result.previousQty).toBe(5);
      expect(result.newQty).toBe(5);
      expect(result.unitCogs).toBe(20);
    });

    it("should record order reference in inventory movement", async () => {
      const testBatch = createTestBatch({ onHandQty: 100 });
      const tx = createMockTransaction(testBatch);

      await allocateFromBatch(tx as any, {
        batchId: 1,
        quantity: 10,
        orderId: 999,
        orderLineItemId: 1001,
        userId: 5,
      });

      // Verify insert was called with order reference
      expect(tx.insert).toHaveBeenCalled();
    });

    it("should log allocation completion with details", async () => {
      const testBatch = createTestBatch({
        id: 7,
        onHandQty: 50,
        unitCogs: 15,
      });
      const tx = createMockTransaction(testBatch);

      await allocateFromBatch(tx as any, {
        batchId: 7,
        quantity: 20,
        orderId: 123,
        userId: 3,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 7,
          quantity: 20,
          previousQty: 50,
          newQty: 30,
          orderId: 123,
          userId: 3,
        }),
        expect.stringContaining("allocation completed")
      );
    });
  });

  describe("returnToBatch", () => {
    it("should increase quantity and record return movement", async () => {
      const testBatch = createTestBatch({
        id: 15,
        onHandQty: 50,
        unitCogs: 35,
      });
      const tx = createMockTransaction(testBatch);

      // Note: validateReturnQuantity=false in integration tests that don't mock select
      const result = await returnToBatch(
        tx as any,
        {
          batchId: 15,
          quantity: 10,
          orderId: 600,
          reason: "Customer return - damaged in shipping",
          userId: 2,
        },
        { validateReturnQuantity: false }
      );

      expect(result.batchId).toBe(15);
      expect(result.quantityAllocated).toBe(-10); // Negative indicates return
      expect(result.unitCogs).toBe(35);
      expect(result.previousQty).toBe(50);
      expect(result.newQty).toBe(60); // 50 + 10

      // Verify database operations
      expect(tx.update).toHaveBeenCalled();
      expect(tx.insert).toHaveBeenCalled();
    });

    it("should track correct quantity before and after return", async () => {
      const testBatch = createTestBatch({
        onHandQty: 30,
      });
      const tx = createMockTransaction(testBatch);

      const result = await returnToBatch(
        tx as any,
        {
          batchId: 1,
          quantity: 25,
          userId: 1,
        },
        { validateReturnQuantity: false }
      );

      expect(result.previousQty).toBe(30);
      expect(result.newQty).toBe(55); // 30 + 25
    });

    it("should record return with custom reason", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await returnToBatch(
        tx as any,
        {
          batchId: 1,
          quantity: 5,
          reason: "Quality control rejection",
          userId: 1,
        },
        { validateReturnQuantity: false }
      );

      expect(tx.insert).toHaveBeenCalled();
    });

    it("should log return completion with details", async () => {
      const testBatch = createTestBatch({
        id: 20,
        onHandQty: 100,
      });
      const tx = createMockTransaction(testBatch);

      await returnToBatch(
        tx as any,
        {
          batchId: 20,
          quantity: 15,
          orderId: 789,
          reason: "Overshipment",
          userId: 4,
        },
        { validateReturnQuantity: false }
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 20,
          quantity: 15,
          previousQty: 100,
          newQty: 115,
          orderId: 789,
          userId: 4,
        }),
        expect.stringContaining("return completed")
      );
    });
  });

  describe("allocateFromMultipleBatches", () => {
    it("should allocate from multiple batches atomically", async () => {
      const batches: LockedBatch[] = [
        createTestBatch({ id: 1, onHandQty: 50, unitCogs: 10 }),
        createTestBatch({ id: 2, onHandQty: 100, unitCogs: 15 }),
      ];

      // Need to create a more sophisticated mock for multi-batch
      let executeCallCount = 0;
      const tx = {
        execute: vi.fn().mockImplementation(() => {
          executeCallCount++;
          // First two calls are for withMultiBatchLock (SET + SELECT)
          if (executeCallCount <= 2) {
            if (executeCallCount === 1) return Promise.resolve([]);
            return Promise.resolve(batches);
          }
          // Subsequent calls are for individual batch locks in allocateFromBatch
          if (executeCallCount === 3) return Promise.resolve([]);
          if (executeCallCount === 4) return Promise.resolve([batches[0]]);
          if (executeCallCount === 5) return Promise.resolve([]);
          return Promise.resolve([batches[1]]);
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
        }),
      };

      const allocations = [
        { batchId: 1, quantity: 10 },
        { batchId: 2, quantity: 20 },
      ];

      const results = await allocateFromMultipleBatches(
        tx as any,
        allocations,
        { orderId: 100, userId: 1 }
      );

      expect(results).toHaveLength(2);
      expect(results[0].batchId).toBe(1);
      expect(results[0].quantityAllocated).toBe(10);
      expect(results[1].batchId).toBe(2);
      expect(results[1].quantityAllocated).toBe(20);
    });

    it("should throw CONFLICT if any batch has insufficient quantity", async () => {
      const batches: LockedBatch[] = [
        createTestBatch({ id: 1, onHandQty: 5 }), // Not enough
        createTestBatch({ id: 2, onHandQty: 100 }),
      ];

      const tx = {
        execute: vi
          .fn()
          .mockResolvedValueOnce([]) // SET timeout for multi
          .mockResolvedValueOnce(batches), // SELECT FOR UPDATE for multi
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
        }),
      };

      const allocations = [
        { batchId: 1, quantity: 10 }, // More than available (5)
        { batchId: 2, quantity: 20 },
      ];

      await expect(
        allocateFromMultipleBatches(tx as any, allocations, { userId: 1 })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("Lock Timeout Behavior", () => {
    it("should convert MySQL lock timeout to CONFLICT error", async () => {
      const tx = {
        execute: vi
          .fn()
          .mockRejectedValue(
            new Error("lock wait timeout exceeded; try restarting transaction")
          ),
      };

      await expect(
        withBatchLock(tx as any, 1, async () => ({}))
      ).rejects.toThrow(TRPCError);

      // Verify it's specifically a CONFLICT error
      try {
        await withBatchLock(tx as any, 1, async () => ({}));
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("CONFLICT");
      }
    });

    it("should log lock timeout warning with context", async () => {
      const tx = {
        execute: vi
          .fn()
          .mockRejectedValue(new Error("lock wait timeout exceeded")),
      };

      try {
        await withBatchLock(tx as any, 42, async () => ({}), {
          lockTimeout: 5,
        });
      } catch (_e) {
        // Expected
      }

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 42,
          lockTimeout: 5,
        }),
        expect.any(String)
      );
    });

    it("should allow retry after lock timeout", async () => {
      let callCount = 0;
      const testBatch = createTestBatch();

      const tx = {
        execute: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error("lock wait timeout exceeded"));
          }
          if (callCount === 2) return Promise.resolve([]);
          return Promise.resolve([testBatch]);
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
        }),
      };

      // First attempt fails
      await expect(
        withBatchLock(tx as any, 1, async () => ({}))
      ).rejects.toThrow(TRPCError);

      // Second attempt succeeds
      const result = await withBatchLock(tx as any, 1, async batch => ({
        success: true,
        batchId: batch.id,
      }));

      expect(result).toEqual({ success: true, batchId: 1 });
    });
  });

  describe("Edge Cases", () => {
    it("should handle batch with null unitCogs", async () => {
      const testBatch = createTestBatch({
        unitCogs: null,
        onHandQty: 100,
      });
      const tx = createMockTransaction(testBatch);

      const result = await allocateFromBatch(tx as any, {
        batchId: 1,
        quantity: 10,
        userId: 1,
      });

      expect(result.unitCogs).toBe(0); // Should default to 0
    });

    it("should handle batch with null allocatedQty", async () => {
      const testBatch: LockedBatch = {
        id: 1,
        lotId: 100,
        sku: "TEST",
        onHandQty: 100,
        allocatedQty: null as any, // Simulating null from DB
        unitCogs: 25,
        status: "LIVE",
      };
      const tx = createMockTransaction(testBatch);

      const result = await allocateFromBatch(tx as any, {
        batchId: 1,
        quantity: 10,
        userId: 1,
      });

      // Should treat null allocatedQty as 0
      expect(result.quantityAllocated).toBe(10);
    });

    it("should handle exactly zero available quantity", async () => {
      const testBatch = createTestBatch({
        onHandQty: 50,
        allocatedQty: 50, // All allocated, 0 available
      });
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: 1,
          userId: 1,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should handle very large quantities", async () => {
      const testBatch = createTestBatch({
        onHandQty: 1000000,
        allocatedQty: 0,
      });
      const tx = createMockTransaction(testBatch);

      const result = await allocateFromBatch(tx as any, {
        batchId: 1,
        quantity: 500000,
        userId: 1,
      });

      expect(result.quantityAllocated).toBe(500000);
      expect(result.newQty).toBe(500000);
    });

    it("should handle deleted batch (returns not found)", async () => {
      // Empty result simulates deleted batch (deleted_at IS NOT NULL excluded it)
      const tx = createMockTransaction(null);

      await expect(
        withBatchLock(tx as any, 1, async () => ({}))
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("Input Validation", () => {
    it("should reject negative quantity for allocation", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: -10,
          userId: 1,
        })
      ).rejects.toThrow(/quantity must be positive/);
    });

    it("should reject zero quantity for allocation", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: 0,
          userId: 1,
        })
      ).rejects.toThrow(/quantity must be positive/);
    });

    it("should reject negative batchId", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: -1,
          quantity: 10,
          userId: 1,
        })
      ).rejects.toThrow(/batchId must be a positive integer/);
    });

    it("should reject non-integer batchId", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1.5,
          quantity: 10,
          userId: 1,
        })
      ).rejects.toThrow(/batchId must be a positive integer/);
    });

    it("should reject negative quantity for return", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await expect(
        returnToBatch(
          tx as any,
          {
            batchId: 1,
            quantity: -5,
            userId: 1,
          },
          { validateReturnQuantity: false }
        )
      ).rejects.toThrow(/quantity must be positive/);
    });

    it("should reject Infinity quantity", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: Infinity,
          userId: 1,
        })
      ).rejects.toThrow(/quantity must be finite/);
    });

    it("should reject NaN quantity", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: NaN,
          userId: 1,
        })
      ).rejects.toThrow(/quantity must be a valid number/);
    });

    it("should reject quantity exceeding maximum", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: 10_000_001, // Exceeds MAX_QUANTITY of 10_000_000
          userId: 1,
        })
      ).rejects.toThrow(/quantity exceeds maximum allowed/);
    });

    it("should reject invalid userId (zero)", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: 10,
          userId: 0,
        })
      ).rejects.toThrow(/userId must be a positive integer/);
    });

    it("should reject invalid userId (negative)", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: 10,
          userId: -1,
        })
      ).rejects.toThrow(/userId must be a positive integer/);
    });

    it("should reject invalid userId (non-integer)", async () => {
      const testBatch = createTestBatch();
      const tx = createMockTransaction(testBatch);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: 10,
          userId: 1.5,
        })
      ).rejects.toThrow(/userId must be a positive integer/);
    });
  });

  describe("Multi-batch Validation", () => {
    it("should reject duplicate batchIds in allocateFromMultipleBatches", async () => {
      const batches: LockedBatch[] = [
        createTestBatch({ id: 1, onHandQty: 50 }),
        createTestBatch({ id: 2, onHandQty: 100 }),
      ];

      let executeCallCount = 0;
      const tx = {
        execute: vi.fn().mockImplementation(() => {
          executeCallCount++;
          if (executeCallCount <= 2) {
            if (executeCallCount === 1) return Promise.resolve([]);
            return Promise.resolve(batches);
          }
          return Promise.resolve([]);
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
        }),
      };

      // Try to allocate from batch 1 twice
      await expect(
        allocateFromMultipleBatches(
          tx as any,
          [
            { batchId: 1, quantity: 10 },
            { batchId: 1, quantity: 20 }, // Duplicate!
          ],
          { orderId: 100, userId: 1 }
        )
      ).rejects.toThrow(/duplicate batchIds not allowed/);
    });

    it("should reject empty allocations array", async () => {
      const tx = createMockTransaction(null);

      await expect(
        allocateFromMultipleBatches(tx as any, [], { orderId: 100, userId: 1 })
      ).rejects.toThrow(/allocations array cannot be empty/);
    });
  });

  describe("Return Quantity Validation", () => {
    it("should validate return quantity with validateReturnQuantity=true", async () => {
      const testBatch = createTestBatch({
        id: 1,
        onHandQty: 50,
      });

      // Create mock that returns proper allocation/return data
      // Execute calls: 1=SET TIMEOUT, 2=SELECT batch FOR UPDATE, 3=movement totals query
      let executeCallCount = 0;
      const tx = {
        execute: vi.fn().mockImplementation(() => {
          executeCallCount++;
          if (executeCallCount === 1) return Promise.resolve([]); // SET TIMEOUT
          if (executeCallCount === 2) return Promise.resolve([testBatch]); // SELECT FOR UPDATE
          // Movement totals query - returns 100 allocated, 50 returned (50 returnable)
          return Promise.resolve([
            { totalAllocated: "100", totalReturned: "50" },
          ]);
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
        }),
      };

      // Attempting to return 60 when only 50 is returnable (100 allocated - 50 already returned)
      await expect(
        returnToBatch(
          tx as any,
          {
            batchId: 1,
            quantity: 60,
            userId: 1,
          },
          { validateReturnQuantity: true }
        )
      ).rejects.toThrow(/Cannot return 60 units/);
    });

    it("should allow valid return quantity within limits", async () => {
      const testBatch = createTestBatch({
        id: 1,
        onHandQty: 50,
      });

      // Create mock that returns proper allocation/return data
      // Execute calls: 1=SET TIMEOUT, 2=SELECT batch FOR UPDATE, 3=movement totals query
      let executeCallCount = 0;
      const tx = {
        execute: vi.fn().mockImplementation(() => {
          executeCallCount++;
          if (executeCallCount === 1) return Promise.resolve([]); // SET TIMEOUT
          if (executeCallCount === 2) return Promise.resolve([testBatch]); // SELECT FOR UPDATE
          // Movement totals query - returns 100 allocated, 40 returned (60 returnable)
          return Promise.resolve([
            { totalAllocated: "100", totalReturned: "40" },
          ]);
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
        }),
      };

      // Returning 50 when 60 is returnable (100 allocated - 40 already returned)
      const result = await returnToBatch(
        tx as any,
        {
          batchId: 1,
          quantity: 50,
          userId: 1,
        },
        { validateReturnQuantity: true }
      );

      expect(result.quantityAllocated).toBe(-50);
    });
  });
});
