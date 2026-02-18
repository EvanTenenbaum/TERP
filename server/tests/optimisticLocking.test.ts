/**
 * ST-026: Optimistic Locking Tests
 *
 * Tests for concurrent edit detection functionality across critical entities:
 * - Orders
 * - Clients
 * - Batches
 * - Invoices
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  checkVersion,
  updateWithVersion,
  OptimisticLockError,
  incrementVersion,
} from "../_core/optimisticLocking";

type MockDb = Parameters<typeof checkVersion>[0];
type MockTable = Parameters<typeof checkVersion>[1];

// Mock database
const createMockDb = () => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
});

// Mock table with version column
const mockTable = {
  id: { name: "id" },
  version: { name: "version" },
};

describe("OptimisticLockError", () => {
  it("should create error with correct message format", () => {
    const error = new OptimisticLockError("Order", 123, 1, 2);

    expect(error.name).toBe("OptimisticLockError");
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toContain("Order #123");
    expect(error.message).toContain("Your version: 1");
    expect(error.message).toContain("Current version: 2");
    expect(error.message).toContain("has been modified by another user");
  });

  it("should be instance of TRPCError", () => {
    const error = new OptimisticLockError("Client", 1, 1, 2);
    expect(error).toBeInstanceOf(TRPCError);
  });
});

describe("checkVersion", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  it("should return record when version matches", async () => {
    const mockRecord = { id: 1, version: 5 };
    mockDb.limit.mockResolvedValue([mockRecord]);

    const result = await checkVersion(
      mockDb as unknown as MockDb,
      mockTable as unknown as MockTable,
      "Order",
      1,
      5
    );

    expect(result).toEqual(mockRecord);
  });

  it("should throw OptimisticLockError when version doesn't match", async () => {
    const mockRecord = { id: 1, version: 6 };
    mockDb.limit.mockResolvedValue([mockRecord]);

    await expect(
      checkVersion(
        mockDb as unknown as MockDb,
        mockTable as unknown as MockTable,
        "Order",
        1,
        5
      )
    ).rejects.toThrow(OptimisticLockError);

    try {
      await checkVersion(
        mockDb as unknown as MockDb,
        mockTable as unknown as MockTable,
        "Order",
        1,
        5
      );
    } catch (error) {
      expect(error).toBeInstanceOf(OptimisticLockError);
      expect((error as OptimisticLockError).code).toBe("CONFLICT");
    }
  });

  it("should throw NOT_FOUND when record doesn't exist", async () => {
    mockDb.limit.mockResolvedValue([]);

    await expect(
      checkVersion(
        mockDb as unknown as MockDb,
        mockTable as unknown as MockTable,
        "Order",
        999,
        1
      )
    ).rejects.toThrow(TRPCError);

    try {
      await checkVersion(
        mockDb as unknown as MockDb,
        mockTable as unknown as MockTable,
        "Order",
        999,
        1
      );
    } catch (error) {
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    }
  });
});

describe("updateWithVersion", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  it("should succeed when version matches", async () => {
    // Mock successful update
    mockDb.where.mockResolvedValue([{ affectedRows: 1 }]);

    const result = await updateWithVersion(
      mockDb as unknown as MockDb,
      mockTable as unknown as MockTable,
      "Client",
      1,
      5,
      { name: "Updated Name" }
    );

    expect(result.affectedRows).toBe(1);
  });

  it("should throw OptimisticLockError when version doesn't match (no rows affected)", async () => {
    // Mock update with no affected rows (version mismatch)
    mockDb.where.mockReturnValue({ limit: mockDb.limit });
    // Mock the follow-up query to get current version
    mockDb.limit.mockResolvedValueOnce([{ version: 6 }]);

    await expect(
      updateWithVersion(
        mockDb as unknown as MockDb,
        mockTable as unknown as MockTable,
        "Client",
        1,
        5,
        { name: "Updated Name" }
      )
    ).rejects.toThrow(OptimisticLockError);
  });

  it("should throw NOT_FOUND when record doesn't exist during version mismatch check", async () => {
    // Mock update with no affected rows
    mockDb.where.mockReturnValue({ limit: mockDb.limit });
    // Mock the follow-up query returning no record
    mockDb.limit.mockResolvedValueOnce([]);

    await expect(
      updateWithVersion(
        mockDb as unknown as MockDb,
        mockTable as unknown as MockTable,
        "Batch",
        999,
        1,
        { notes: "test" }
      )
    ).rejects.toThrow(TRPCError);

    try {
      // Reset mocks for second attempt
      mockDb.where.mockReturnValue({ limit: mockDb.limit });
      mockDb.limit.mockResolvedValueOnce([]);

      await updateWithVersion(
        mockDb as unknown as MockDb,
        mockTable as unknown as MockTable,
        "Batch",
        999,
        1,
        { notes: "test" }
      );
    } catch (error) {
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    }
  });
});

describe("Concurrent Edit Scenarios", () => {
  it("should detect conflict when User B saves after User A", async () => {
    // Simulate: User A and B both load record with version 1
    // User A saves (version becomes 2)
    // User B tries to save with version 1 - should fail

    const mockDb = createMockDb();

    // User B's check: record now has version 2, but User B has version 1
    mockDb.limit.mockResolvedValue([{ id: 1, version: 2 }]);
    mockDb.where.mockReturnValue({ limit: mockDb.limit });

    await expect(
      checkVersion(
        mockDb as unknown as MockDb,
        mockTable as unknown as MockTable,
        "Order",
        1,
        1
      ) // User B's version is 1
    ).rejects.toThrow(OptimisticLockError);
  });

  it("should allow rapid sequential edits from same user when version is tracked", async () => {
    const mockDb = createMockDb();

    // First edit: version 1 -> 2
    mockDb.limit.mockResolvedValueOnce([{ id: 1, version: 1 }]);
    const first = await checkVersion(
      mockDb as unknown as MockDb,
      mockTable as unknown as MockTable,
      "Order",
      1,
      1
    );
    expect(first.version).toBe(1);

    // After save, version is now 2
    // Second edit: version 2 -> 3
    mockDb.limit.mockResolvedValueOnce([{ id: 1, version: 2 }]);
    const second = await checkVersion(
      mockDb as unknown as MockDb,
      mockTable as unknown as MockTable,
      "Order",
      1,
      2
    );
    expect(second.version).toBe(2);

    // Both should succeed when using updated version
  });

  it("should handle version increment correctly", () => {
    const table = { version: { name: "version" } };
    const result = incrementVersion(table);

    // incrementVersion returns SQL template, just verify it exists
    expect(result).toBeDefined();
  });
});

describe("Entity-specific Tests", () => {
  describe("Orders", () => {
    it("should reject order update with stale version", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([
        { id: 1, version: 3, orderNumber: "ORD-001" },
      ]);

      await expect(
        checkVersion(
          mockDb as unknown as MockDb,
          mockTable as unknown as MockTable,
          "Order",
          1,
          2
        )
      ).rejects.toThrow("Order #1 has been modified by another user");
    });
  });

  describe("Clients", () => {
    it("should reject client update with stale version", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([
        { id: 5, version: 10, name: "Test Client" },
      ]);

      await expect(
        checkVersion(
          mockDb as unknown as MockDb,
          mockTable as unknown as MockTable,
          "Client",
          5,
          9
        )
      ).rejects.toThrow("Client #5 has been modified by another user");
    });
  });

  describe("Batches", () => {
    it("should reject batch update with stale version", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([
        { id: 100, version: 5, sku: "BATCH-001" },
      ]);

      await expect(
        checkVersion(
          mockDb as unknown as MockDb,
          mockTable as unknown as MockTable,
          "Batch",
          100,
          4
        )
      ).rejects.toThrow("Batch #100 has been modified by another user");
    });
  });

  describe("Invoices", () => {
    it("should reject invoice update with stale version", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([
        { id: 50, version: 2, invoiceNumber: "INV-001" },
      ]);

      await expect(
        checkVersion(
          mockDb as unknown as MockDb,
          mockTable as unknown as MockTable,
          "Invoice",
          50,
          1
        )
      ).rejects.toThrow("Invoice #50 has been modified by another user");
    });
  });
});

describe("Edge Cases", () => {
  it("should handle version 0", async () => {
    const mockDb = createMockDb();
    mockDb.limit.mockResolvedValue([{ id: 1, version: 0 }]);

    const result = await checkVersion(
      mockDb as unknown as MockDb,
      mockTable as unknown as MockTable,
      "Order",
      1,
      0
    );
    expect(result.version).toBe(0);
  });

  it("should handle very large version numbers", async () => {
    const mockDb = createMockDb();
    const largeVersion = 999999999;
    mockDb.limit.mockResolvedValue([{ id: 1, version: largeVersion }]);

    const result = await checkVersion(
      mockDb as unknown as MockDb,
      mockTable as unknown as MockTable,
      "Order",
      1,
      largeVersion
    );
    expect(result.version).toBe(largeVersion);
  });

  it("should handle negative version mismatch", async () => {
    const mockDb = createMockDb();
    mockDb.limit.mockResolvedValue([{ id: 1, version: 5 }]);

    // Attempting to update with lower version should fail
    await expect(
      checkVersion(
        mockDb as unknown as MockDb,
        mockTable as unknown as MockTable,
        "Order",
        1,
        3
      )
    ).rejects.toThrow(OptimisticLockError);
  });
});
