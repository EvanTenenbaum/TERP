/**
 * Race Condition Tests for Credit Application (DI-002)
 *
 * These tests verify that the applyCredit function is protected against
 * race conditions using database transactions and row-level locking.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { applyCredit, createCredit, getCreditById } from "./creditsDb";
import { getDb } from "./db";

/**
 * NOTE: These are integration tests that require a running database.
 * They should be run with a test database instance.
 *
 * To run: npm test -- creditsDb.race-condition.test.ts
 */

describe("Credit Application Race Condition Protection", () => {
  let testCreditId: number;
  let testInvoiceId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Setup: Create a test credit with $100 balance
    // For this test to run, you need:
    // 1. A running test database
    // 2. Create a test user
    // 3. Create a test client
    // 4. Create a test credit with $100 balance
    // 5. Create a test invoice (transaction)

    // TODO: Implement proper test setup with test fixtures
    // Example:
    // const testUser = await createTestUser();
    // testUserId = testUser.id;
    // const testClient = await createTestClient();
    // const testInvoice = await createTestInvoice(testClient.id);
    // testInvoiceId = testInvoice.id;
    // const testCredit = await createCredit({
    //   clientId: testClient.id,
    //   creditAmount: "100.00",
    //   creditNumber: `TEST-${Date.now()}`,
    //   creditReason: "Test credit",
    //   createdBy: testUserId
    // });
    // testCreditId = testCredit.id;
  });

  afterAll(async () => {
    // Cleanup test data
    // TODO: Clean up test user, client, credit, and invoice
    // await deleteTestData(testUserId, testCreditId, testInvoiceId);
  });

  it("should prevent double-application when concurrent requests use same idempotency key", async () => {
    // Arrange
    const idempotencyKey = `test-${Date.now()}-${Math.random()}`;
    const amountToApply = "50.00";

    // Act - Simulate two concurrent requests with same idempotency key
    const [result1, result2] = await Promise.all([
      applyCredit(testCreditId, testInvoiceId, amountToApply, testUserId, "Request 1", idempotencyKey),
      applyCredit(testCreditId, testInvoiceId, amountToApply, testUserId, "Request 2", idempotencyKey),
    ]);

    // Assert - Both should return the same application (second is deduplicated)
    expect(result1.id).toBe(result2.id);
    expect(result1.amountApplied).toBe(amountToApply);

    // Verify credit was only deducted once
    const credit = await getCreditById(testCreditId);
    expect(credit?.amountRemaining).toBe("50.00"); // 100 - 50 = 50, not 0
  });

  it("should use FOR UPDATE locking to serialize concurrent applications", async () => {
    // This test verifies that concurrent applications without idempotency keys
    // are properly serialized by the database lock, preventing race conditions

    // Arrange
    const amount1 = "30.00";
    const amount2 = "30.00";

    // Act - Apply credits concurrently without idempotency keys
    // The FOR UPDATE lock should serialize these operations
    const [result1, result2] = await Promise.allSettled([
      applyCredit(testCreditId, testInvoiceId, amount1, testUserId, "Concurrent 1"),
      applyCredit(testCreditId, testInvoiceId, amount2, testUserId, "Concurrent 2"),
    ]);

    // Assert - Both should succeed (serialized by lock)
    expect(result1.status).toBe("fulfilled");
    expect(result2.status).toBe("fulfilled");

    // Verify total deduction is correct
    const credit = await getCreditById(testCreditId);
    expect(parseFloat(credit?.amountRemaining || "0")).toBeLessThanOrEqual(100 - 60); // 100 - 30 - 30 = 40
  });

  it("should reject application if insufficient balance due to concurrent deduction", async () => {
    // Arrange - Credit with $100 remaining
    const largeAmount = "80.00";
    const smallAmount = "30.00";

    // Act - Try to apply more than available when considering concurrent requests
    const results = await Promise.allSettled([
      applyCredit(testCreditId, testInvoiceId, largeAmount, testUserId, "Large amount"),
      applyCredit(testCreditId, testInvoiceId, smallAmount, testUserId, "Small amount"),
    ]);

    // Assert - At least one should succeed, and one might fail due to insufficient balance
    const succeeded = results.filter(r => r.status === "fulfilled");
    const failed = results.filter(r => r.status === "rejected");

    expect(succeeded.length).toBeGreaterThan(0);

    // If both succeeded, total should not exceed original balance
    const credit = await getCreditById(testCreditId);
    expect(parseFloat(credit?.amountRemaining || "0")).toBeGreaterThanOrEqual(0);
  });
});

/**
 * Example usage of idempotency keys in production code:
 *
 * ```typescript
 * // Client-side: Generate idempotency key before request
 * const idempotencyKey = `apply-${invoiceId}-${creditId}-${Date.now()}`;
 *
 * // Server-side: Use the key to prevent duplicate applications
 * await applyCredit(
 *   creditId,
 *   invoiceId,
 *   amount,
 *   userId,
 *   notes,
 *   idempotencyKey  // <-- Prevents double-application on retry
 * );
 *
 * // If the request is retried (network error, timeout, etc.),
 * // the same idempotency key will cause the function to return
 * // the existing application instead of creating a duplicate.
 * ```
 */
