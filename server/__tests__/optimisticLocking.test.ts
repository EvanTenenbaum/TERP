/**
 * ST-026: Concurrent Edit Detection Tests
 *
 * Tests to verify optimistic locking prevents lost updates when multiple
 * users edit the same record simultaneously.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb } from "../db";
import { clients, orders, batches } from "../../drizzle/schema";
import {
  updateWithVersion,
  checkVersion,
  OptimisticLockError,
} from "../_core/optimisticLocking";
import { eq } from "drizzle-orm";

describe("Optimistic Locking - ST-026", () => {
  let testClientId: number;
  let testOrderId: number;
  let testBatchId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test client
    const [client] = await db
      .insert(clients)
      .values({
        teriCode: `TEST-OL-${Date.now()}`,
        name: "Test Client for Optimistic Locking",
        email: "test@example.com",
        version: 1,
      })
      .returning();
    testClientId = client.id;

    // Create test order
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber: `ORD-OL-${Date.now()}`,
        clientId: testClientId,
        orderType: "QUOTE",
        status: "DRAFT",
        version: 1,
      })
      .returning();
    testOrderId = order.id;

    // Create test batch
    const [batch] = await db
      .insert(batches)
      .values({
        code: `BATCH-OL-${Date.now()}`,
        version: 1,
      })
      .returning();
    testBatchId = batch.id;
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Cleanup test data
    if (testClientId) {
      await db.delete(clients).where(eq(clients.id, testClientId));
    }
    if (testOrderId) {
      await db.delete(orders).where(eq(orders.id, testOrderId));
    }
    if (testBatchId) {
      await db.delete(batches).where(eq(batches.id, testBatchId));
    }
  });

  describe("checkVersion", () => {
    it("should pass when version matches", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Should not throw when version is correct
      await expect(
        checkVersion(db, clients, "Client", testClientId, 1)
      ).resolves.toBeDefined();
    });

    it("should throw OptimisticLockError when version does not match", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Should throw when expected version is wrong
      await expect(
        checkVersion(db, clients, "Client", testClientId, 999)
      ).rejects.toThrow(OptimisticLockError);
    });

    it("should throw NOT_FOUND when record doesn't exist", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await expect(
        checkVersion(db, clients, "Client", 999999, 1)
      ).rejects.toThrow("Client #999999 not found");
    });
  });

  describe("updateWithVersion - Client", () => {
    it("should update and increment version when version matches", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Update with correct version
      await updateWithVersion(db, clients, "Client", testClientId, 1, {
        name: "Updated Name",
      });

      // Verify the update
      const [updated] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, testClientId));

      expect(updated.name).toBe("Updated Name");
      expect(updated.version).toBe(2); // Version should increment
    });

    it("should throw OptimisticLockError when version mismatch (concurrent edit scenario)", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Simulate User A updates first (version 1 -> 2)
      await updateWithVersion(db, clients, "Client", testClientId, 1, {
        name: "User A's Update",
      });

      // User B tries to update with stale version 1 (should fail)
      await expect(
        updateWithVersion(db, clients, "Client", testClientId, 1, {
          name: "User B's Update",
        })
      ).rejects.toThrow(OptimisticLockError);

      // Verify User A's update was preserved
      const [current] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, testClientId));

      expect(current.name).toBe("User A's Update");
      expect(current.version).toBe(2);
    });

    it("should allow sequential updates with correct versions", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // First update: version 1 -> 2
      await updateWithVersion(db, clients, "Client", testClientId, 1, {
        name: "First Update",
      });

      // Second update: version 2 -> 3
      await updateWithVersion(db, clients, "Client", testClientId, 2, {
        name: "Second Update",
      });

      // Third update: version 3 -> 4
      await updateWithVersion(db, clients, "Client", testClientId, 3, {
        email: "updated@example.com",
      });

      // Verify final state
      const [final] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, testClientId));

      expect(final.name).toBe("Second Update");
      expect(final.email).toBe("updated@example.com");
      expect(final.version).toBe(4);
    });
  });

  describe("updateWithVersion - Order", () => {
    it("should prevent concurrent edits on orders", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // User A updates
      await updateWithVersion(db, orders, "Order", testOrderId, 1, {
        notes: "User A's notes",
      });

      // User B tries to update with stale version
      await expect(
        updateWithVersion(db, orders, "Order", testOrderId, 1, {
          notes: "User B's notes",
        })
      ).rejects.toThrow(OptimisticLockError);
    });
  });

  describe("updateWithVersion - Batch", () => {
    it("should prevent concurrent edits on batches", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // User A updates
      await updateWithVersion(db, batches, "Batch", testBatchId, 1, {
        code: "UPDATED-BATCH-A",
      });

      // User B tries to update with stale version
      await expect(
        updateWithVersion(db, batches, "Batch", testBatchId, 1, {
          code: "UPDATED-BATCH-B",
        })
      ).rejects.toThrow(OptimisticLockError);
    });
  });

  describe("Real-world concurrent edit scenarios", () => {
    it("should handle scenario: Two users editing same client simultaneously", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Both users load the client (version 1)
      const [initialClient] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, testClientId));

      expect(initialClient.version).toBe(1);

      // User A saves first (success)
      await updateWithVersion(db, clients, "Client", testClientId, 1, {
        phone: "111-222-3333",
      });

      // User B tries to save (should fail with conflict)
      const userBUpdatePromise = updateWithVersion(
        db,
        clients,
        "Client",
        testClientId,
        1, // Stale version!
        {
          address: "123 New Street",
        }
      );

      await expect(userBUpdatePromise).rejects.toThrow(OptimisticLockError);
      await expect(userBUpdatePromise).rejects.toThrow(
        /has been modified by another user/i
      );

      // Verify only User A's change was applied
      const [finalClient] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, testClientId));

      expect(finalClient.phone).toBe("111-222-3333");
      expect(finalClient.address).not.toBe("123 New Street");
      expect(finalClient.version).toBe(2);
    });

    it("should handle scenario: User B refreshes and applies their changes", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // User A updates (version 1 -> 2)
      await updateWithVersion(db, clients, "Client", testClientId, 1, {
        phone: "111-222-3333",
      });

      // User B gets conflict error, refreshes to get version 2
      const [refreshedClient] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, testClientId));

      expect(refreshedClient.version).toBe(2);

      // User B retries with correct version (version 2 -> 3)
      await updateWithVersion(db, clients, "Client", testClientId, 2, {
        address: "123 New Street",
      });

      // Verify both changes are present
      const [finalClient] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, testClientId));

      expect(finalClient.phone).toBe("111-222-3333"); // User A's change
      expect(finalClient.address).toBe("123 New Street"); // User B's change
      expect(finalClient.version).toBe(3);
    });
  });
});
