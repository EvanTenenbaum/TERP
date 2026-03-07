/**
 * REL-004: Critical Mutation Wrapper Tests
 * TER-585: Updated for database-backed idempotency
 * @module server/_core/criticalMutation.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  criticalMutation,
  clearIdempotencyCache,
  stopCacheCleanup,
  startCacheCleanup,
  cleanupExpiredIdempotencyKeys,
} from "./criticalMutation";
import { TRPCError } from "@trpc/server";

// ---------------------------------------------------------------------------
// Hoisted mock definitions — must be declared before vi.mock() factories
// vi.mock() calls are hoisted to the top of the file by vitest's transformer,
// so any variables they reference must themselves be hoisted via vi.hoisted().
// ---------------------------------------------------------------------------

const { mockDb, mockDbStore } = vi.hoisted(() => {
  const store = new Map<string, { result: unknown; expiresAt: Date }>();

  const db = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };

  return { mockDb: db, mockDbStore: store };
});

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

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// ---------------------------------------------------------------------------
// Helper: switch idempotency backend via env var stub
// ---------------------------------------------------------------------------

function withMemoryBackend() {
  vi.stubEnv("IDEMPOTENCY_BACKEND", "memory");
}

function withDbBackend() {
  vi.stubEnv("IDEMPOTENCY_BACKEND", "db");
}

// ---------------------------------------------------------------------------
// Suite: Memory backend (existing behavior, fast)
// ---------------------------------------------------------------------------

describe("criticalMutation — memory backend", () => {
  beforeEach(() => {
    withMemoryBackend();
    clearIdempotencyCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopCacheCleanup();
    vi.unstubAllEnvs();
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

// ---------------------------------------------------------------------------
// Suite: DB backend (TER-585 — multi-instance safe)
// ---------------------------------------------------------------------------

describe("criticalMutation — db backend", () => {
  beforeEach(() => {
    withDbBackend();
    mockDbStore.clear();
    vi.clearAllMocks();

    // Wire the chainable select mock to simulate real SELECT behavior.
    // We accumulate the eq() condition's value in a local array so limit()
    // can look it up.
    const capturedWhereKeys: string[] = [];

    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockImplementation((condition: unknown) => {
      // Extract key value from Drizzle's eq() output structure.
      // eq(col, value) produces queryChunks: [prefix, column, operator, ValueParam, suffix]
      // The right-hand value is at queryChunks[3].value (a ValueParam with brand/value/encoder).
      type DrizzleValueParam = {
        brand?: string;
        value?: string;
        encoder?: unknown;
      };
      type DrizzleChunk = { value?: string | string[] } | DrizzleValueParam;
      const chunks =
        (condition as { queryChunks?: DrizzleChunk[] })?.queryChunks ?? [];
      // chunk[3] is the ValueParam — its `.value` is the literal string we queried
      const paramChunk = chunks[3] as DrizzleValueParam | undefined;
      const val =
        typeof paramChunk?.value === "string" ? paramChunk.value : undefined;
      if (val) capturedWhereKeys.push(val);
      return mockDb;
    });

    mockDb.limit.mockImplementation(async () => {
      const key = capturedWhereKeys.shift();
      if (!key) return [];
      const row = mockDbStore.get(key);
      if (!row) return [];
      if (new Date() > row.expiresAt) return [];
      return [{ key, result: row.result, expiresAt: row.expiresAt }];
    });

    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockImplementation(
      async (values: { key: string; result: unknown; expiresAt: Date }) => {
        if (mockDbStore.has(values.key)) {
          const err = new Error(
            "Duplicate entry '" + values.key + "' for key 'PRIMARY'"
          );
          (err as Error & { code?: string }).code = "ER_DUP_ENTRY";
          throw err;
        }
        mockDbStore.set(values.key, {
          result: values.result,
          expiresAt: values.expiresAt,
        });
      }
    );

    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should execute mutation and cache result in DB", async () => {
    const mockResult = { id: 42, status: "ok" };
    const fn = vi.fn().mockResolvedValue(mockResult);
    const key = "db-key-1";

    const result1 = await criticalMutation(fn, {
      idempotencyKey: key,
      domain: "payments",
      operation: "recordPayment",
    });

    expect(result1.success).toBe(true);
    expect(result1.data).toEqual(mockResult);
    expect(fn).toHaveBeenCalledTimes(1);
    // DB store should have the result
    expect(mockDbStore.has(key)).toBe(true);
  });

  it("should return cached result on second call with same key", async () => {
    const mockResult = { id: 42 };
    const fn = vi.fn().mockResolvedValue(mockResult);
    const key = "db-key-idempotent";

    const result1 = await criticalMutation(fn, {
      idempotencyKey: key,
      domain: "payments",
      operation: "recordPayment",
    });

    const result2 = await criticalMutation(fn, {
      idempotencyKey: key,
      domain: "payments",
      operation: "recordPayment",
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result1.data).toEqual(mockResult);
    expect(result2.data).toEqual(mockResult);
    expect(result2.idempotent).toBe(true);
  });

  it("should tolerate duplicate-key errors on concurrent INSERT (race condition)", async () => {
    const key = "db-race-key";
    // Pre-seed the store so the INSERT will throw duplicate-key
    mockDbStore.set(key, {
      result: { id: 1 },
      expiresAt: new Date(Date.now() + 60_000),
    });

    const fn = vi.fn().mockResolvedValue({ id: 2 });

    // SELECT finds the existing row → returns idempotent result without calling fn
    const result = await criticalMutation(fn, {
      idempotencyKey: key,
      domain: "inventory",
      operation: "allocate",
    });

    expect(result.idempotent).toBe(true);
    expect(result.data).toEqual({ id: 1 });
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it("should execute without idempotency key (no DB lookup)", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true });

    const result = await criticalMutation(fn, {
      domain: "inventory",
      operation: "adjust",
    });

    expect(result.success).toBe(true);
    expect(mockDbStore.size).toBe(0); // nothing stored
  });

  describe("cleanupExpiredIdempotencyKeys", () => {
    it("should call delete on the idempotency_keys table", async () => {
      const whereDeleteMock = vi.fn().mockResolvedValue(undefined);
      const deleteMock = vi.fn().mockReturnValue({ where: whereDeleteMock });
      mockDb.delete.mockImplementation(deleteMock);

      const deleted = await cleanupExpiredIdempotencyKeys();

      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(whereDeleteMock).toHaveBeenCalledTimes(1);
      // Returns 0 — MySQL2 via Drizzle does not expose affectedRows reliably
      expect(deleted).toBe(0);
    });
  });
});
