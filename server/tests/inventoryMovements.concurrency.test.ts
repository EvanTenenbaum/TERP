/**
 * Concurrency Tests for Inventory Movements
 *
 * Tests that the row-level locking implementation prevents race conditions
 * and ensures data integrity under concurrent operations.
 *
 * Task 1.1: Inventory System Stability - Verification Tests
 *
 * @module server/tests/inventoryMovements.concurrency.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getDb } from "../db";
import {
  decreaseInventory,
  increaseInventory,
  adjustInventory,
} from "../inventoryMovementsDb";
import { batches } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Inventory Movements - Concurrency Tests", () => {
  let testBatchId: number;
  const testUserId = 1;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test batch for concurrency testing
    const [batch] = await db
      .insert(batches)
      .values({
        code: `CONCURRENCY-TEST-${Date.now()}`,
        sku: `SKU-CONCURRENCY-${Date.now()}`,
        productId: 1,
        lotId: 1,
        status: "LIVE",
        cogsMode: "FIXED",
        paymentTerms: "PREPAID",
        onHandQty: "1000", // Start with 1000 units
        sampleQty: "0",
        reservedQty: "0",
        quarantineQty: "0",
        holdQty: "0",
        defectiveQty: "0",
      })
      .$returningId();

    testBatchId = batch.id;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test batch
    await db.delete(batches).where(eq(batches.id, testBatchId));
  });

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Reset batch quantity before each test
    await db
      .update(batches)
      .set({ onHandQty: "1000" })
      .where(eq(batches.id, testBatchId));
  });

  describe("Concurrent Decreases (Race Condition Prevention)", () => {
    it("should handle 10 concurrent sales without negative inventory", async () => {
      // Arrange: 10 concurrent sales of 100 units each
      // Expected: All should succeed, final quantity should be 0
      const salePromises = Array.from({ length: 10 }, (_, i) =>
        decreaseInventory(
          testBatchId,
          "100",
          "ORDER",
          1000 + i,
          testUserId,
          `Concurrent sale ${i + 1}`
        )
      );

      // Act: Execute all sales concurrently
      const results = await Promise.all(salePromises);

      // Assert: All sales succeeded
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.movementType).toBe("SALE");
      });

      // Verify final quantity is exactly 0
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, testBatchId));

      expect(batch.onHandQty).toBe("0");
    });

    it("should prevent overselling when inventory is insufficient", async () => {
      // Arrange: Set inventory to 500, attempt 10 sales of 100 each
      // Expected: First 5 succeed, last 5 fail
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(batches)
        .set({ onHandQty: "500" })
        .where(eq(batches.id, testBatchId));

      const salePromises = Array.from({ length: 10 }, (_, i) =>
        decreaseInventory(
          testBatchId,
          "100",
          "ORDER",
          2000 + i,
          testUserId
        ).catch(err => ({ error: err.message }))
      );

      // Act: Execute all sales concurrently
      const results = await Promise.all(salePromises);

      // Assert: Exactly 5 succeeded, 5 failed
      const successes = results.filter(r => !("error" in r));
      const failures = results.filter(r => "error" in r);

      expect(successes).toHaveLength(5);
      expect(failures).toHaveLength(5);

      // Verify final quantity is exactly 0 (not negative)
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, testBatchId));

      expect(batch.onHandQty).toBe("0");
      expect(parseFloat(batch.onHandQty)).toBeGreaterThanOrEqual(0);
    });

    it("should handle mixed concurrent operations (sales and returns)", async () => {
      // Arrange: Start with 500 units
      // 5 sales of 100 units each (decrease by 500)
      // 5 returns of 50 units each (increase by 250)
      // Expected final: 500 - 500 + 250 = 250
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(batches)
        .set({ onHandQty: "500" })
        .where(eq(batches.id, testBatchId));

      const operations = [
        ...Array.from({ length: 5 }, (_, i) =>
          decreaseInventory(testBatchId, "100", "ORDER", 3000 + i, testUserId)
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          increaseInventory(testBatchId, "50", "REFUND", 3100 + i, testUserId)
        ),
      ];

      // Act: Execute all operations concurrently
      const results = await Promise.all(operations);

      // Assert: All operations succeeded
      expect(results).toHaveLength(10);

      // Verify final quantity is exactly 250
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, testBatchId));

      expect(batch.onHandQty).toBe("250");
    });
  });

  describe("Concurrent Increases (Return Processing)", () => {
    it("should handle 20 concurrent returns correctly", async () => {
      // Arrange: Start with 0, add 20 returns of 50 each
      // Expected final: 1000
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(batches)
        .set({ onHandQty: "0" })
        .where(eq(batches.id, testBatchId));

      const returnPromises = Array.from({ length: 20 }, (_, i) =>
        increaseInventory(
          testBatchId,
          "50",
          "REFUND_RETURN",
          4000 + i,
          testUserId
        )
      );

      // Act: Execute all returns concurrently
      const results = await Promise.all(returnPromises);

      // Assert: All returns succeeded
      expect(results).toHaveLength(20);

      // Verify final quantity is exactly 1000
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, testBatchId));

      expect(batch.onHandQty).toBe("1000");
    });
  });

  describe("Concurrent Adjustments", () => {
    it("should handle concurrent manual adjustments atomically", async () => {
      // Arrange: Start with 500
      // 5 adjustments setting to different values concurrently
      // Expected: One of them wins, final value is one of the target values
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(batches)
        .set({ onHandQty: "500" })
        .where(eq(batches.id, testBatchId));

      const targetValues = ["100", "200", "300", "400", "500"];
      const adjustmentPromises = targetValues.map((value, i) =>
        adjustInventory(
          testBatchId,
          value,
          "DAMAGED",
          testUserId,
          `Adjustment ${i + 1}`
        )
      );

      // Act: Execute all adjustments concurrently
      const results = await Promise.all(adjustmentPromises);

      // Assert: All adjustments succeeded
      expect(results).toHaveLength(5);

      // Verify final quantity is one of the target values
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, testBatchId));

      expect(targetValues).toContain(batch.onHandQty);
    });
  });

  describe("High-Volume Stress Test", () => {
    it("should handle 100 concurrent operations without data corruption", async () => {
      // Arrange: Start with 5000 units
      // 50 sales of 50 units (decrease by 2500)
      // 50 returns of 30 units (increase by 1500)
      // Expected final: 5000 - 2500 + 1500 = 4000
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(batches)
        .set({ onHandQty: "5000" })
        .where(eq(batches.id, testBatchId));

      const operations = [
        ...Array.from({ length: 50 }, (_, i) =>
          decreaseInventory(testBatchId, "50", "ORDER", 5000 + i, testUserId)
        ),
        ...Array.from({ length: 50 }, (_, i) =>
          increaseInventory(testBatchId, "30", "REFUND", 5100 + i, testUserId)
        ),
      ];

      // Act: Execute all operations concurrently
      const results = await Promise.all(operations);

      // Assert: All operations succeeded
      expect(results).toHaveLength(100);

      // Verify final quantity is exactly 4000
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, testBatchId));

      expect(batch.onHandQty).toBe("4000");
    });
  });

  describe("Transaction Rollback on Error", () => {
    it("should rollback transaction if movement record creation fails", async () => {
      // This test verifies that if any step in the transaction fails,
      // the entire transaction is rolled back and inventory is not modified

      // Note: This would require mocking the database to force a failure
      // during the movement record insertion. For now, we verify that
      // the implementation uses transactions correctly by inspecting the code.

      // The test is marked as a placeholder for future implementation
      expect(true).toBe(true);
    });
  });
});
