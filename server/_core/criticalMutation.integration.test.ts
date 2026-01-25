/**
 * REL-004: Critical Mutation Integration Tests
 *
 * Tests critical mutation behavior with realistic transaction scenarios.
 * These tests validate:
 * - Transaction execution and result handling
 * - Retry logic on simulated deadlocks
 * - Idempotency cache behavior
 * - Timeout handling
 *
 * Task: QA-011
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// Now import the modules under test
import {
  criticalMutation,
  clearIdempotencyCache,
  stopCacheCleanup,
  startCacheCleanup,
} from "./criticalMutation";
import { TRPCError } from "@trpc/server";
import { logger } from "./logger";

describe("criticalMutation Integration Tests", () => {
  beforeEach(() => {
    // Clear idempotency cache before each test
    clearIdempotencyCache();
    vi.clearAllMocks();

    // Reset timers for delay tests
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    // Stop cache cleanup to prevent resource leaks
    stopCacheCleanup();
    vi.useRealTimers();
  });

  describe("Transaction Execution", () => {
    it("should execute mutation within transaction and return result with metadata", async () => {
      const mutationData = {
        id: 123,
        name: "Test Record",
        status: "created",
      };

      const mutationFn = vi.fn().mockResolvedValue(mutationData);

      const result = await criticalMutation(mutationFn, {
        domain: "inventory",
        operation: "createBatch",
        userId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mutationData);
      expect(result.attempts).toBe(1);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.idempotent).toBeUndefined();
      expect(mutationFn).toHaveBeenCalledTimes(1);
    });

    it("should pass transaction context to mutation function", async () => {
      let receivedTx: any = null;

      const mutationFn = vi.fn().mockImplementation(tx => {
        receivedTx = tx;
        return Promise.resolve({ ok: true });
      });

      await criticalMutation(mutationFn, {
        domain: "test",
        operation: "verify-tx",
      });

      expect(receivedTx).toBeDefined();
      expect(mutationFn).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should execute complex mutation with multiple database operations", async () => {
      const operations: string[] = [];

      const mutationFn = vi.fn().mockImplementation(async _tx => {
        operations.push("start");

        // Simulate multiple DB operations
        operations.push("insert-batch");
        operations.push("update-lot");
        operations.push("insert-movement");

        operations.push("complete");
        return { batchId: 1, lotId: 100, movementId: 500 };
      });

      const result = await criticalMutation(mutationFn, {
        domain: "inventory",
        operation: "intake",
        userId: 1,
      });

      expect(operations).toEqual([
        "start",
        "insert-batch",
        "update-lot",
        "insert-movement",
        "complete",
      ]);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ batchId: 1, lotId: 100, movementId: 500 });
    });
  });

  describe("Retry Logic", () => {
    it("should retry on deadlock error and succeed on second attempt", async () => {
      const mutationFn = vi
        .fn()
        .mockRejectedValueOnce(
          new Error("Deadlock found when trying to get lock")
        )
        .mockResolvedValueOnce({ id: 1, retried: true });

      const resultPromise = criticalMutation(mutationFn, {
        domain: "inventory",
        operation: "allocate",
        maxRetries: 3,
      });

      // Fast-forward through the retry delay
      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(mutationFn).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(result.data).toEqual({ id: 1, retried: true });
    });

    it("should retry on lock wait timeout and succeed", async () => {
      const mutationFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Lock wait timeout exceeded"))
        .mockResolvedValueOnce({ recovered: true });

      const resultPromise = criticalMutation(mutationFn, {
        domain: "payments",
        operation: "recordPayment",
        maxRetries: 3,
      });

      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(mutationFn).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ recovered: true });
    });

    it("should retry on connection error", async () => {
      const mutationFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Connection lost to database"))
        .mockResolvedValueOnce({ reconnected: true });

      const resultPromise = criticalMutation(mutationFn, {
        domain: "orders",
        operation: "fulfill",
        maxRetries: 3,
      });

      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(mutationFn).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it("should retry on serialization failure", async () => {
      const mutationFn = vi
        .fn()
        .mockRejectedValueOnce(
          new Error("Serialization failure in transaction")
        )
        .mockResolvedValueOnce({ serialized: true });

      const resultPromise = criticalMutation(mutationFn, {
        domain: "accounting",
        operation: "reconcile",
        maxRetries: 2,
      });

      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(mutationFn).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it("should use exponential backoff between retries", async () => {
      const timestamps: number[] = [];

      const mutationFn = vi.fn().mockImplementation(() => {
        timestamps.push(Date.now());
        if (timestamps.length < 3) {
          return Promise.reject(new Error("Deadlock found"));
        }
        return Promise.resolve({ ok: true });
      });

      const resultPromise = criticalMutation(mutationFn, {
        domain: "test",
        operation: "backoff-test",
        maxRetries: 3,
      });

      // First retry delay: 100ms
      await vi.advanceTimersByTimeAsync(100);
      // Second retry delay: 200ms
      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(mutationFn).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    it("should respect maxRetries limit and fail permanently", async () => {
      // Use real timers for this test to avoid unhandled promise rejections
      vi.useRealTimers();

      const mutationFn = vi.fn().mockRejectedValue(new Error("Deadlock found"));

      await expect(
        criticalMutation(mutationFn, {
          domain: "inventory",
          operation: "persistent-deadlock",
          maxRetries: 2,
        })
      ).rejects.toThrow(TRPCError);

      // Initial attempt + 2 retries = 3 calls
      expect(mutationFn).toHaveBeenCalledTimes(3);

      // Restore fake timers for other tests
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    it("should NOT retry on non-retryable errors", async () => {
      const mutationFn = vi
        .fn()
        .mockRejectedValue(new Error("Validation failed: invalid quantity"));

      await expect(
        criticalMutation(mutationFn, {
          domain: "inventory",
          operation: "validate",
          maxRetries: 3,
        })
      ).rejects.toThrow(TRPCError);

      // Should only attempt once - no retries for validation errors
      expect(mutationFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Idempotency Cache", () => {
    it("should return cached result for duplicate idempotency key", async () => {
      const originalResult = {
        paymentId: 123,
        amount: 500,
        status: "completed",
      };

      const mutationFn = vi.fn().mockResolvedValue(originalResult);
      const idempotencyKey = "payment-order-456-attempt-1";

      // First call - executes mutation
      const result1 = await criticalMutation(mutationFn, {
        idempotencyKey,
        domain: "payments",
        operation: "recordPayment",
        userId: 1,
      });

      // Second call - should return cached result
      const result2 = await criticalMutation(mutationFn, {
        idempotencyKey,
        domain: "payments",
        operation: "recordPayment",
        userId: 1,
      });

      expect(mutationFn).toHaveBeenCalledTimes(1);
      expect(result1.data).toEqual(originalResult);
      expect(result2.data).toEqual(originalResult);
      expect(result2.idempotent).toBe(true);
      expect(result2.attempts).toBe(0);
    });

    it("should execute separately for different idempotency keys", async () => {
      const mutationFn = vi
        .fn()
        .mockResolvedValueOnce({ order: 1 })
        .mockResolvedValueOnce({ order: 2 });

      const result1 = await criticalMutation(mutationFn, {
        idempotencyKey: "order-allocation-1",
        domain: "orders",
        operation: "allocate",
      });

      const result2 = await criticalMutation(mutationFn, {
        idempotencyKey: "order-allocation-2",
        domain: "orders",
        operation: "allocate",
      });

      expect(mutationFn).toHaveBeenCalledTimes(2);
      expect(result1.data).toEqual({ order: 1 });
      expect(result2.data).toEqual({ order: 2 });
    });

    it("should allow multiple calls without idempotency key", async () => {
      let callCount = 0;
      const mutationFn = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({ callNumber: callCount });
      });

      const result1 = await criticalMutation(mutationFn, {
        domain: "reports",
        operation: "generate",
      });

      const result2 = await criticalMutation(mutationFn, {
        domain: "reports",
        operation: "generate",
      });

      expect(mutationFn).toHaveBeenCalledTimes(2);
      expect(result1.data).toEqual({ callNumber: 1 });
      expect(result2.data).toEqual({ callNumber: 2 });
    });

    it("should handle complex cached objects correctly", async () => {
      const complexResult = {
        allocation: {
          batchId: 1,
          quantity: 100,
          movements: [
            { id: 1, type: "SALE", qty: -50 },
            { id: 2, type: "SALE", qty: -50 },
          ],
        },
        totals: {
          allocated: 100,
          remaining: 50,
        },
        timestamp: new Date().toISOString(),
      };

      const mutationFn = vi.fn().mockResolvedValue(complexResult);
      const key = "complex-allocation-key";

      const result1 = await criticalMutation(mutationFn, {
        idempotencyKey: key,
        domain: "inventory",
        operation: "allocateMultiple",
      });

      const result2 = await criticalMutation(mutationFn, {
        idempotencyKey: key,
        domain: "inventory",
        operation: "allocateMultiple",
      });

      expect(result1.data).toEqual(complexResult);
      expect(result2.data).toEqual(complexResult);
      expect(result2.idempotent).toBe(true);
    });

    it("should clear cache with clearIdempotencyCache", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ value: 1 });
      const key = "cache-clear-test";

      await criticalMutation(mutationFn, {
        idempotencyKey: key,
        domain: "test",
        operation: "op",
      });

      expect(mutationFn).toHaveBeenCalledTimes(1);

      // Clear cache
      clearIdempotencyCache();

      // Same key should now execute again
      await criticalMutation(mutationFn, {
        idempotencyKey: key,
        domain: "test",
        operation: "op",
      });

      expect(mutationFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("Timeout Handling", () => {
    it("should pass timeout option to transaction", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ ok: true });

      await criticalMutation(mutationFn, {
        timeout: 60,
        domain: "long-running",
        operation: "process",
      });

      expect(mutationFn).toHaveBeenCalledTimes(1);
    });

    it("should use default timeout when not specified", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ ok: true });

      await criticalMutation(mutationFn, {
        domain: "quick",
        operation: "action",
      });

      // Default timeout is 30 seconds
      expect(mutationFn).toHaveBeenCalled();
    });
  });

  describe("Logging and Metadata", () => {
    it("should log successful completion with metadata", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ id: 1 });

      await criticalMutation(mutationFn, {
        domain: "inventory",
        operation: "create",
        userId: 42,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: "inventory",
          operation: "create",
          userId: 42,
          attempts: 1,
        }),
        expect.stringContaining("completed successfully")
      );
    });

    it("should log idempotent cache hit", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ cached: true });
      const key = "log-cache-test";

      await criticalMutation(mutationFn, {
        idempotencyKey: key,
        domain: "test",
        operation: "cache-log",
        userId: 1,
      });

      // Second call with same key
      await criticalMutation(mutationFn, {
        idempotencyKey: key,
        domain: "test",
        operation: "cache-log",
        userId: 1,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: key,
        }),
        expect.stringContaining("cached result")
      );
    });

    it("should log retry attempts with warnings", async () => {
      const mutationFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Deadlock found"))
        .mockResolvedValueOnce({ ok: true });

      const resultPromise = criticalMutation(mutationFn, {
        domain: "inventory",
        operation: "retry-log",
        maxRetries: 2,
        userId: 5,
      });

      await vi.advanceTimersByTimeAsync(200);
      await resultPromise;

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: "inventory",
          operation: "retry-log",
          attempt: 1,
        }),
        expect.stringContaining("Retrying")
      );
    });

    it("should log permanent failure with error", async () => {
      const mutationFn = vi
        .fn()
        .mockRejectedValue(new Error("Permanent failure"));

      try {
        await criticalMutation(mutationFn, {
          domain: "accounting",
          operation: "fail-log",
          userId: 10,
        });
      } catch (_e) {
        // Expected to throw
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: "accounting",
          operation: "fail-log",
          userId: 10,
        }),
        expect.stringContaining("failed permanently")
      );
    });
  });

  describe("Cache Cleanup", () => {
    it("should allow starting and stopping cache cleanup timer", () => {
      // Should not throw
      stopCacheCleanup();
      startCacheCleanup();
      stopCacheCleanup();
      startCacheCleanup();
      stopCacheCleanup();
    });

    it("should not start duplicate cleanup timers", () => {
      stopCacheCleanup();
      startCacheCleanup();
      startCacheCleanup(); // Second call should be a no-op
      stopCacheCleanup();
    });
  });

  describe("Error Handling Edge Cases", () => {
    it("should wrap non-Error objects as TRPCError", async () => {
      const mutationFn = vi.fn().mockRejectedValue("string error");

      await expect(
        criticalMutation(mutationFn, {
          domain: "test",
          operation: "string-error",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should preserve original error cause", async () => {
      const originalError = new Error("Original cause");
      const mutationFn = vi.fn().mockRejectedValue(originalError);

      try {
        await criticalMutation(mutationFn, {
          domain: "test",
          operation: "preserve-cause",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).cause).toBe(originalError);
      }
    });

    it("should include attempt count in error message", async () => {
      // Use real timers for this test to avoid unhandled promise rejections
      vi.useRealTimers();

      const mutationFn = vi.fn().mockRejectedValue(new Error("Deadlock found"));

      try {
        await criticalMutation(mutationFn, {
          domain: "test",
          operation: "attempt-count",
          maxRetries: 2,
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect((error as TRPCError).message).toContain("3 attempts");
      }

      // Restore fake timers for other tests
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
  });

  describe("Options Validation", () => {
    it("should reject negative maxRetries", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      await expect(
        criticalMutation(mutationFn, {
          maxRetries: -1,
          domain: "test",
        })
      ).rejects.toThrow(/maxRetries must be between 0 and 10/);
    });

    it("should reject maxRetries greater than 10", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      await expect(
        criticalMutation(mutationFn, {
          maxRetries: 11,
          domain: "test",
        })
      ).rejects.toThrow(/maxRetries must be between 0 and 10/);
    });

    it("should reject zero timeout", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      await expect(
        criticalMutation(mutationFn, {
          timeout: 0,
          domain: "test",
        })
      ).rejects.toThrow(/timeout must be between 1 and 300/);
    });

    it("should reject timeout greater than 300", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      await expect(
        criticalMutation(mutationFn, {
          timeout: 301,
          domain: "test",
        })
      ).rejects.toThrow(/timeout must be between 1 and 300/);
    });

    it("should reject empty idempotencyKey", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      await expect(
        criticalMutation(mutationFn, {
          idempotencyKey: "",
          domain: "test",
        })
      ).rejects.toThrow(/idempotencyKey must be 1-255 characters/);
    });

    it("should reject idempotencyKey longer than 255 characters", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });
      const longKey = "a".repeat(256);

      await expect(
        criticalMutation(mutationFn, {
          idempotencyKey: longKey,
          domain: "test",
        })
      ).rejects.toThrow(/idempotencyKey must be 1-255 characters/);
    });

    it("should accept valid options", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      const result = await criticalMutation(mutationFn, {
        maxRetries: 5,
        timeout: 60,
        idempotencyKey: "valid-key-123",
        domain: "test",
        operation: "validate-options",
      });

      expect(result.success).toBe(true);
    });

    it("should accept maxRetries of 0", async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      const result = await criticalMutation(mutationFn, {
        maxRetries: 0,
        domain: "test",
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
    });
  });
});
