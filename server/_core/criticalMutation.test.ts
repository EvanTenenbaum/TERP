/**
 * REL-004: Critical Mutation Wrapper Tests
 * @module server/_core/criticalMutation.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  criticalMutation,
  clearIdempotencyCache,
  stopCacheCleanup,
  startCacheCleanup,
} from "./criticalMutation";
import { TRPCError } from "@trpc/server";

// Mock the dependencies
vi.mock("./dbTransaction", () => ({
  withRetryableTransaction: vi.fn(fn => fn({})),
}));

vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("criticalMutation", () => {
  beforeEach(() => {
    clearIdempotencyCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopCacheCleanup();
  });

  describe("basic execution", () => {
    it("should execute mutation and return result with metadata", async () => {
      const mockResult = { id: 1, status: "created" };
      const fn = vi.fn().mockResolvedValue(mockResult);

      const result = await criticalMutation(fn, {
        domain: "test",
        operation: "create",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.attempts).toBe(1);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should pass transaction context to mutation function", async () => {
      const fn = vi.fn().mockResolvedValue({ ok: true });

      await criticalMutation(fn, { domain: "test", operation: "op" });

      expect(fn).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe("idempotency", () => {
    it("should return cached result for duplicate idempotency key", async () => {
      const mockResult = { id: 1 };
      const fn = vi.fn().mockResolvedValue(mockResult);
      const idempotencyKey = "test-key-123";

      // First call - should execute
      const result1 = await criticalMutation(fn, {
        idempotencyKey,
        domain: "test",
        operation: "op",
      });

      // Second call - should return cached
      const result2 = await criticalMutation(fn, {
        idempotencyKey,
        domain: "test",
        operation: "op",
      });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(result1.data).toEqual(mockResult);
      expect(result2.data).toEqual(mockResult);
      expect(result2.idempotent).toBe(true);
      expect(result2.attempts).toBe(0);
    });

    it("should execute separately for different idempotency keys", async () => {
      const fn = vi.fn().mockResolvedValue({ ok: true });

      await criticalMutation(fn, {
        idempotencyKey: "key-1",
        domain: "test",
        operation: "op",
      });
      await criticalMutation(fn, {
        idempotencyKey: "key-2",
        domain: "test",
        operation: "op",
      });

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should execute without idempotency when key not provided", async () => {
      const fn = vi.fn().mockResolvedValue({ ok: true });

      await criticalMutation(fn, { domain: "test", operation: "op" });
      await criticalMutation(fn, { domain: "test", operation: "op" });

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("should throw TRPCError on non-retryable failure", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Validation failed"));

      await expect(
        criticalMutation(fn, { domain: "test", operation: "op" })
      ).rejects.toThrow(TRPCError);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should include attempt count in error message", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Some error"));

      try {
        await criticalMutation(fn, {
          domain: "test",
          operation: "op",
          maxRetries: 2,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).message).toContain("1 attempts");
      }
    });
  });

  describe("retry behavior", () => {
    it("should retry on deadlock error", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Deadlock found"))
        .mockResolvedValue({ ok: true });

      const result = await criticalMutation(fn, {
        domain: "test",
        operation: "op",
        maxRetries: 3,
      });

      expect(fn).toHaveBeenCalledTimes(2);
      expect(result.attempts).toBe(2);
      expect(result.success).toBe(true);
    });

    it("should retry on lock wait timeout", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Lock wait timeout exceeded"))
        .mockResolvedValue({ ok: true });

      const result = await criticalMutation(fn, {
        domain: "test",
        operation: "op",
        maxRetries: 3,
      });

      expect(fn).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it("should respect maxRetries limit", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Deadlock found"));

      await expect(
        criticalMutation(fn, {
          domain: "test",
          operation: "op",
          maxRetries: 2,
        })
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe("cache cleanup", () => {
    it("should allow stopping and starting cache cleanup", () => {
      // Should not throw
      stopCacheCleanup();
      startCacheCleanup();
      stopCacheCleanup();
    });

    it("should clear cache on clearIdempotencyCache", async () => {
      const fn = vi.fn().mockResolvedValue({ ok: true });
      const key = "clear-test";

      await criticalMutation(fn, {
        idempotencyKey: key,
        domain: "t",
        operation: "o",
      });
      clearIdempotencyCache();
      await criticalMutation(fn, {
        idempotencyKey: key,
        domain: "t",
        operation: "o",
      });

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
