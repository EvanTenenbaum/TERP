/**
 * REL-006: Inventory Locking Tests
 * @module server/_core/inventoryLocking.test
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  withBatchLock,
  withMultiBatchLock,
  allocateFromBatch,
  returnToBatch,
  type LockedBatch,
} from "./inventoryLocking";

// Mock logger
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
  batches: { id: "id" },
  inventoryMovements: {},
}));

// Create mock transaction
// The execute mock tracks call count:
// - 1st call: SET SESSION (timeout)
// - 2nd call: SELECT ... FOR UPDATE (returns batch data)
function createMockTx(batchData: Partial<LockedBatch>[] = []) {
  let executeCallCount = 0;

  const mockExecute = vi.fn().mockImplementation(() => {
    executeCallCount++;
    // First call is SET SESSION timeout, return empty
    if (executeCallCount === 1) {
      return Promise.resolve([]);
    }
    // Second call is SELECT FOR UPDATE, return batch data
    return Promise.resolve(batchData);
  });

  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  });

  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  });

  return {
    execute: mockExecute,
    update: mockUpdate,
    insert: mockInsert,
    // Reset execute count for reuse
    resetExecuteCount: () => {
      executeCallCount = 0;
    },
  };
}

describe("inventoryLocking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("withBatchLock", () => {
    it("should acquire lock and execute callback with batch data", async () => {
      const mockBatch: LockedBatch = {
        id: 1,
        lotId: 100,
        sku: "TEST-001",
        onHandQty: 50,
        allocatedQty: 10,
        unitCogs: 25.5,
        status: "LIVE",
      };

      const tx = createMockTx([mockBatch]);
      const callback = vi.fn().mockResolvedValue({ processed: true });

      const result = await withBatchLock(tx as any, 1, callback);

      expect(callback).toHaveBeenCalledWith(mockBatch);
      expect(result).toEqual({ processed: true });
    });

    it("should throw NOT_FOUND when batch does not exist", async () => {
      const tx = createMockTx([]); // Empty result

      await expect(
        withBatchLock(tx as any, 999, async () => ({}))
      ).rejects.toThrow(TRPCError);

      try {
        await withBatchLock(tx as any, 999, async () => ({}));
      } catch (error) {
        expect((error as TRPCError).code).toBe("NOT_FOUND");
        expect((error as TRPCError).message).toContain("999");
      }
    });

    it("should throw CONFLICT on lock wait timeout", async () => {
      const tx = {
        execute: vi
          .fn()
          .mockRejectedValue(new Error("lock wait timeout exceeded")),
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
      }
    });

    it("should respect custom lock timeout", async () => {
      const mockBatch: LockedBatch = {
        id: 1,
        lotId: 100,
        sku: "TEST",
        onHandQty: 10,
        allocatedQty: 0,
        unitCogs: 10,
        status: "LIVE",
      };

      const tx = createMockTx([mockBatch]);

      // Should not throw with custom timeout
      await expect(
        withBatchLock(tx as any, 1, async () => ({ done: true }), {
          lockTimeout: 30,
        })
      ).resolves.toEqual({ done: true });

      // Execute should be called (SET SESSION + SELECT)
      expect(tx.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe("withMultiBatchLock", () => {
    it("should lock multiple batches and return as Map", async () => {
      const mockBatches: LockedBatch[] = [
        {
          id: 1,
          lotId: 100,
          sku: "A",
          onHandQty: 10,
          allocatedQty: 0,
          unitCogs: 10,
          status: "LIVE",
        },
        {
          id: 2,
          lotId: 100,
          sku: "B",
          onHandQty: 20,
          allocatedQty: 5,
          unitCogs: 15,
          status: "LIVE",
        },
      ];

      const tx = createMockTx(mockBatches);
      const callback = vi
        .fn()
        .mockImplementation((batchMap: Map<number, LockedBatch>) => {
          return { count: batchMap.size };
        });

      const result = await withMultiBatchLock(tx as any, [1, 2], callback);

      expect(callback).toHaveBeenCalled();
      const callArg = callback.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(Map);
      expect(callArg.size).toBe(2);
      expect(result).toEqual({ count: 2 });
    });

    it("should throw BAD_REQUEST when no batch IDs provided", async () => {
      const tx = createMockTx([]);

      await expect(
        withMultiBatchLock(tx as any, [], async () => ({}))
      ).rejects.toThrow(TRPCError);

      try {
        await withMultiBatchLock(tx as any, [], async () => ({}));
      } catch (error) {
        expect((error as TRPCError).code).toBe("BAD_REQUEST");
      }
    });

    it("should throw NOT_FOUND when any batch is missing", async () => {
      const mockBatches: LockedBatch[] = [
        {
          id: 1,
          lotId: 100,
          sku: "A",
          onHandQty: 10,
          allocatedQty: 0,
          unitCogs: 10,
          status: "LIVE",
        },
        // Batch 2 is missing
      ];

      const tx = createMockTx(mockBatches);

      await expect(
        withMultiBatchLock(tx as any, [1, 2], async () => ({}))
      ).rejects.toThrow(TRPCError);
    });

    it("should sort batch IDs to prevent deadlocks", async () => {
      const mockBatches: LockedBatch[] = [
        {
          id: 1,
          lotId: 100,
          sku: "A",
          onHandQty: 10,
          allocatedQty: 0,
          unitCogs: 10,
          status: "LIVE",
        },
        {
          id: 3,
          lotId: 100,
          sku: "C",
          onHandQty: 10,
          allocatedQty: 0,
          unitCogs: 10,
          status: "LIVE",
        },
        {
          id: 5,
          lotId: 100,
          sku: "B",
          onHandQty: 10,
          allocatedQty: 0,
          unitCogs: 10,
          status: "LIVE",
        },
      ];

      const tx = createMockTx(mockBatches);

      // Provide IDs in unsorted order [5, 1, 3]
      // The function should sort them internally to [1, 3, 5]
      const callbackFn = vi
        .fn()
        .mockImplementation((batchMap: Map<number, LockedBatch>) => {
          // Verify all batches are present in the map
          expect(batchMap.has(1)).toBe(true);
          expect(batchMap.has(3)).toBe(true);
          expect(batchMap.has(5)).toBe(true);
          return { locked: true };
        });

      const result = await withMultiBatchLock(tx as any, [5, 1, 3], callbackFn);

      expect(result).toEqual({ locked: true });
      expect(callbackFn).toHaveBeenCalled();
    });
  });

  describe("allocateFromBatch", () => {
    it("should allocate quantity and record movement", async () => {
      const mockBatch: LockedBatch = {
        id: 1,
        lotId: 100,
        sku: "TEST",
        onHandQty: 100,
        allocatedQty: 0,
        unitCogs: 25,
        status: "LIVE",
      };

      const tx = createMockTx([mockBatch]);

      const result = await allocateFromBatch(tx as any, {
        batchId: 1,
        quantity: 10,
        orderId: 500,
        userId: 1,
      });

      expect(result.batchId).toBe(1);
      expect(result.quantityAllocated).toBe(10);
      expect(result.unitCogs).toBe(25);
      expect(result.previousQty).toBe(100);
      expect(result.newQty).toBe(90);

      // Verify update was called
      expect(tx.update).toHaveBeenCalled();
      // Verify movement was inserted
      expect(tx.insert).toHaveBeenCalled();
    });

    it("should throw CONFLICT when insufficient quantity", async () => {
      const mockBatch: LockedBatch = {
        id: 1,
        lotId: 100,
        sku: "TEST",
        onHandQty: 5,
        allocatedQty: 3,
        unitCogs: 25,
        status: "LIVE",
      };

      const tx = createMockTx([mockBatch]);

      await expect(
        allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: 10, // More than available (5 - 3 = 2)
          userId: 1,
        })
      ).rejects.toThrow(TRPCError);

      try {
        await allocateFromBatch(tx as any, {
          batchId: 1,
          quantity: 10,
          userId: 1,
        });
      } catch (error) {
        expect((error as TRPCError).code).toBe("CONFLICT");
        expect((error as TRPCError).message).toContain("Insufficient");
      }
    });

    it("should return zero allocation when throwOnInsufficient is false", async () => {
      const mockBatch: LockedBatch = {
        id: 1,
        lotId: 100,
        sku: "TEST",
        onHandQty: 5,
        allocatedQty: 3,
        unitCogs: 25,
        status: "LIVE",
      };

      const tx = createMockTx([mockBatch]);

      const result = await allocateFromBatch(
        tx as any,
        { batchId: 1, quantity: 10, userId: 1 },
        { throwOnInsufficient: false }
      );

      expect(result.quantityAllocated).toBe(0);
      expect(result.previousQty).toBe(5);
      expect(result.newQty).toBe(5);
    });
  });

  describe("returnToBatch", () => {
    it("should increase quantity and record return movement", async () => {
      const mockBatch: LockedBatch = {
        id: 1,
        lotId: 100,
        sku: "TEST",
        onHandQty: 50,
        allocatedQty: 0,
        unitCogs: 25,
        status: "LIVE",
      };

      const tx = createMockTx([mockBatch]);

      const result = await returnToBatch(tx as any, {
        batchId: 1,
        quantity: 10,
        orderId: 500,
        reason: "Customer return",
        userId: 1,
      });

      expect(result.batchId).toBe(1);
      expect(result.quantityAllocated).toBe(-10); // Negative indicates return
      expect(result.previousQty).toBe(50);
      expect(result.newQty).toBe(60);

      // Verify update was called (quantity increase)
      expect(tx.update).toHaveBeenCalled();
      // Verify movement was inserted
      expect(tx.insert).toHaveBeenCalled();
    });
  });
});
