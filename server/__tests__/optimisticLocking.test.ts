/**
 * ST-026: Concurrent Edit Detection Tests
 *
 * Tests to verify optimistic locking prevents lost updates when multiple
 * users edit the same record simultaneously.
 *
 * Unit tests using mocked database for CI environments.
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from "vitest";

// Mock database before imports
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db";
import { clients, orders, batches } from "../../drizzle/schema";
import {
  updateWithVersion,
  checkVersion,
  OptimisticLockError,
} from "../_core/optimisticLocking";

describe("Optimistic Locking - ST-026", () => {
  let mockDb: Record<string, MockedFunction>;
  let mockClientData: Record<string, unknown>;
  let mockOrderData: Record<string, unknown>;
  let mockBatchData: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize mock data
    mockClientData = {
      id: 1,
      teriCode: "TEST-OL-001",
      name: "Test Client for Optimistic Locking",
      email: "test@example.com",
      phone: null,
      address: null,
      version: 1,
    };

    mockOrderData = {
      id: 1,
      orderNumber: "ORD-OL-001",
      clientId: 1,
      orderType: "QUOTE",
      status: "DRAFT",
      notes: null,
      version: 1,
    };

    mockBatchData = {
      id: 1,
      code: "BATCH-OL-001",
      version: 1,
    };

    // Create mock database with chaining support
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        // Default returns the mock client data
        return Promise.resolve([mockClientData]);
      }),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
        })),
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      })),
      delete: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
      })),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as ReturnType<typeof getDb>);
  });

  describe("checkVersion", () => {
    it("should pass when version matches", async () => {
      // Arrange - mock returns client with version 1
      mockDb.limit.mockResolvedValue([mockClientData]);

      // Act & Assert - should not throw when version matches
      await expect(
        checkVersion(mockDb, clients, "Client", 1, 1)
      ).resolves.toBeDefined();
    });

    it("should throw OptimisticLockError when version does not match", async () => {
      // Arrange - mock returns client with version 1, but we check for version 999
      mockDb.limit.mockResolvedValue([mockClientData]);

      // Act & Assert
      await expect(
        checkVersion(mockDb, clients, "Client", 1, 999)
      ).rejects.toThrow(OptimisticLockError);
    });

    it("should throw NOT_FOUND when record doesn't exist", async () => {
      // Arrange - mock returns empty array (record not found)
      mockDb.limit.mockResolvedValue([]);

      // Act & Assert
      await expect(
        checkVersion(mockDb, clients, "Client", 999999, 1)
      ).rejects.toThrow("Client #999999 not found");
    });
  });

  describe("updateWithVersion - Client", () => {
    it("should update and increment version when version matches", async () => {
      // Arrange
      mockDb.limit.mockResolvedValue([mockClientData]);

      mockDb.update.mockImplementation(() => ({
        set: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
        })),
      }));

      // Act
      await updateWithVersion(mockDb, clients, "Client", 1, 1, {
        name: "Updated Name",
      });

      // Assert - verify update was called
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should throw OptimisticLockError when version mismatch (concurrent edit scenario)", async () => {
      // Arrange - Simulate User A already updated (version now 2)
      const clientAfterUpdate = { ...mockClientData, version: 2, name: "User A's Update" };
      mockDb.limit.mockResolvedValue([clientAfterUpdate]);

      // Act & Assert - User B tries to update with stale version 1
      await expect(
        updateWithVersion(mockDb, clients, "Client", 1, 1, {
          name: "User B's Update",
        })
      ).rejects.toThrow(OptimisticLockError);
    });

    it("should allow sequential updates with correct versions", async () => {
      // Track version changes - version increments on successful update
      let currentVersion = 1;

      // Mock limit to always return current version state
      mockDb.limit.mockImplementation(() =>
        Promise.resolve([{ ...mockClientData, version: currentVersion }])
      );

      // Mock update to return affectedRows=1 (success) when version matches
      // and increment version on success
      mockDb.update.mockImplementation(() => ({
        set: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            // Simulate successful update
            const result = [{ affectedRows: 1 }];
            currentVersion++; // Increment version after successful update
            return Promise.resolve(result);
          }),
        })),
      }));

      // Act - Sequential updates with incrementing versions
      await updateWithVersion(mockDb, clients, "Client", 1, 1, { name: "First Update" });
      await updateWithVersion(mockDb, clients, "Client", 1, 2, { name: "Second Update" });
      await updateWithVersion(mockDb, clients, "Client", 1, 3, { email: "updated@example.com" });

      // Assert - update was called 3 times
      expect(mockDb.update).toHaveBeenCalledTimes(3);
    });
  });

  describe("updateWithVersion - Order", () => {
    it("should prevent concurrent edits on orders", async () => {
      // Arrange - Order already updated (version now 2)
      const orderAfterUpdate = { ...mockOrderData, version: 2, notes: "User A's notes" };
      mockDb.limit.mockResolvedValue([orderAfterUpdate]);

      // Act & Assert - User B tries to update with stale version 1
      await expect(
        updateWithVersion(mockDb, orders, "Order", 1, 1, {
          notes: "User B's notes",
        })
      ).rejects.toThrow(OptimisticLockError);
    });
  });

  describe("updateWithVersion - Batch", () => {
    it("should prevent concurrent edits on batches", async () => {
      // Arrange - Batch already updated (version now 2)
      const batchAfterUpdate = { ...mockBatchData, version: 2, code: "UPDATED-BATCH-A" };
      mockDb.limit.mockResolvedValue([batchAfterUpdate]);

      // Act & Assert - User B tries to update with stale version 1
      await expect(
        updateWithVersion(mockDb, batches, "Batch", 1, 1, {
          code: "UPDATED-BATCH-B",
        })
      ).rejects.toThrow(OptimisticLockError);
    });
  });

  describe("Real-world concurrent edit scenarios", () => {
    it("should handle scenario: Two users editing same client simultaneously", async () => {
      // Arrange - Client already updated by User A (version now 2)
      const clientAfterUserA = { ...mockClientData, version: 2, phone: "111-222-3333" };
      mockDb.limit.mockResolvedValue([clientAfterUserA]);

      // Act - User B tries to save with stale version 1
      const userBUpdatePromise = updateWithVersion(
        mockDb,
        clients,
        "Client",
        1,
        1, // Stale version!
        { address: "123 New Street" }
      );

      // Assert
      await expect(userBUpdatePromise).rejects.toThrow(OptimisticLockError);
      await expect(userBUpdatePromise).rejects.toThrow(/has been modified by another user/i);
    });

    it("should handle scenario: User B refreshes and applies their changes", async () => {
      // Track version and data changes
      const clientData = { ...mockClientData, version: 1 };

      mockDb.limit.mockImplementation(() => Promise.resolve([{ ...clientData }]));

      mockDb.update.mockImplementation(() => ({
        set: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            // Simulate successful update and increment version
            const result = [{ affectedRows: 1 }];
            clientData.version++;
            return Promise.resolve(result);
          }),
        })),
      }));

      // Act - User A updates (version 1 -> 2)
      await updateWithVersion(mockDb, clients, "Client", 1, 1, {
        phone: "111-222-3333",
      });

      // User B refreshes and gets version 2, then updates (version 2 -> 3)
      await updateWithVersion(mockDb, clients, "Client", 1, 2, {
        address: "123 New Street",
      });

      // Assert - both updates succeeded
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });
  });
});
