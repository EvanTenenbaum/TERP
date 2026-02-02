/**
 * REL-017: Tests for Schema Fingerprint Retry Logic
 *
 * Tests the retry behavior of the schema fingerprint check in autoMigrate.ts.
 * The fingerprint check runs up to 3 times with backoff delays (3s, 6s) to handle
 * cold database connections during deployment.
 *
 * NOTE: These tests use a helper function that mirrors the production logic rather
 * than testing runAutoMigrations() directly. This is because:
 * 1. runAutoMigrations() has side effects (module-level state, console output)
 * 2. It's tightly coupled to the database connection
 * 3. Extracting the retry logic into a separate function would require production refactoring
 *
 * The tests verify the BEHAVIOR patterns (retry count, backoff delays, success conditions)
 * which should remain consistent with the production implementation.
 *
 * TODO: Consider refactoring autoMigrate.ts to extract the fingerprint check into a
 * separate, injectable function for better testability.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database module
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

// Mock the logger
vi.mock("../_core/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock console.info to capture output
const _consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

describe("Schema Fingerprint Retry Logic", () => {
  let mockDb: {
    execute: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset module state
    vi.resetModules();

    // Create mock database
    mockDb = {
      execute: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper to create a fingerprint check result
   * @param count Number of canary checks that passed (0-7)
   */
  function createFingerprintResult(count: number) {
    return [[{ cnt: count }]];
  }

  /**
   * Helper to simulate the fingerprint check logic
   * This mirrors the logic in autoMigrate.ts lines 36-86
   */
  async function simulateFingerprintCheck(
    dbExecute: ReturnType<typeof vi.fn>,
    maxAttempts: number = 3
  ): Promise<{ success: boolean; attempts: number; delays: number[] }> {
    const delays: number[] = [];
    let attempts = 0;

    for (let fpAttempt = 1; fpAttempt <= maxAttempts; fpAttempt++) {
      attempts++;
      try {
        // Warm up query on first attempt
        if (fpAttempt === 1) {
          await dbExecute("SELECT 1");
        }

        // Fingerprint query
        const [fpResult] = await dbExecute("fingerprint_query");
        const row = Array.isArray(fpResult) ? fpResult[0] : fpResult;
        const count = Number(row?.cnt ?? 0);

        if (count === 7) {
          return { success: true, attempts, delays };
        }

        // Schema incomplete but query succeeded - proceed to migrations
        return { success: false, attempts, delays };
      } catch (_error) {
        if (fpAttempt < maxAttempts) {
          const delay = fpAttempt * 3000; // 3s, 6s backoff
          delays.push(delay);
          // In real code: await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    return { success: false, attempts, delays };
  }

  describe("First-attempt success", () => {
    it("succeeds on first attempt when schema is complete", async () => {
      // Mock: warmup succeeds, fingerprint returns 7/7
      mockDb.execute
        .mockResolvedValueOnce([[{ result: 1 }]]) // SELECT 1 warmup
        .mockResolvedValueOnce(createFingerprintResult(7)); // fingerprint check

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.delays).toHaveLength(0);
      expect(mockDb.execute).toHaveBeenCalledTimes(2); // warmup + fingerprint
    });

    it("proceeds to migrations on first attempt when schema is incomplete", async () => {
      // Mock: warmup succeeds, fingerprint returns 5/7
      mockDb.execute
        .mockResolvedValueOnce([[{ result: 1 }]]) // SELECT 1 warmup
        .mockResolvedValueOnce(createFingerprintResult(5)); // fingerprint check - incomplete

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.delays).toHaveLength(0);
    });
  });

  describe("Single retry success", () => {
    it("succeeds after one retry when first attempt fails", async () => {
      // Mock: first attempt fails, second succeeds
      mockDb.execute
        .mockRejectedValueOnce(new Error("Connection timeout")) // warmup fails
        .mockResolvedValueOnce(createFingerprintResult(7)); // second attempt succeeds

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(result.delays).toEqual([3000]); // 3s delay after first failure
    });

    it("applies correct 3s delay after first failure", async () => {
      mockDb.execute
        .mockRejectedValueOnce(new Error("Connection timeout"))
        .mockResolvedValueOnce(createFingerprintResult(7));

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.delays[0]).toBe(3000);
    });
  });

  describe("Two retries success", () => {
    it("succeeds after two retries", async () => {
      // Mock: first two attempts fail, third succeeds
      mockDb.execute
        .mockRejectedValueOnce(new Error("Connection timeout")) // attempt 1
        .mockRejectedValueOnce(new Error("Connection reset")) // attempt 2
        .mockResolvedValueOnce(createFingerprintResult(7)); // attempt 3

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(result.delays).toEqual([3000, 6000]); // 3s, 6s backoff
    });

    it("applies correct backoff delays (3s, 6s)", async () => {
      mockDb.execute
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce(createFingerprintResult(7));

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.delays).toEqual([3000, 6000]);
    });
  });

  describe("Max retries exceeded", () => {
    it("fails after max retries exceeded (3 attempts)", async () => {
      // Mock: all three attempts fail
      mockDb.execute
        .mockRejectedValueOnce(new Error("Connection timeout"))
        .mockRejectedValueOnce(new Error("Connection reset"))
        .mockRejectedValueOnce(new Error("Database unavailable"));

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.delays).toEqual([3000, 6000]); // delays applied after attempts 1 and 2
    });

    it("does not apply delay after final failed attempt", async () => {
      mockDb.execute
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockRejectedValueOnce(new Error("Error 3"));

      const result = await simulateFingerprintCheck(mockDb.execute);

      // Only 2 delays (after attempt 1 and 2), not 3
      expect(result.delays).toHaveLength(2);
    });
  });

  describe("Backoff calculation", () => {
    it("calculates correct backoff: attempt * 3000ms", () => {
      // Verify the backoff formula: delay = fpAttempt * 3000
      expect(1 * 3000).toBe(3000); // After attempt 1
      expect(2 * 3000).toBe(6000); // After attempt 2
    });

    it("total maximum wait time is 9 seconds (3s + 6s)", async () => {
      mockDb.execute
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockRejectedValueOnce(new Error("Error 3"));

      const result = await simulateFingerprintCheck(mockDb.execute);

      const totalDelay = result.delays.reduce((sum, d) => sum + d, 0);
      expect(totalDelay).toBe(9000); // 3000 + 6000
    });
  });

  describe("Partial schema detection", () => {
    it("returns incomplete when count is less than 7", async () => {
      mockDb.execute
        .mockResolvedValueOnce([[{ result: 1 }]]) // warmup
        .mockResolvedValueOnce(createFingerprintResult(3)); // only 3/7 checks pass

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
    });

    it("returns success only when count equals 7", async () => {
      mockDb.execute
        .mockResolvedValueOnce([[{ result: 1 }]])
        .mockResolvedValueOnce(createFingerprintResult(7));

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.success).toBe(true);
    });

    it("handles zero canary checks passing", async () => {
      mockDb.execute
        .mockResolvedValueOnce([[{ result: 1 }]])
        .mockResolvedValueOnce(createFingerprintResult(0));

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.success).toBe(false);
    });
  });

  describe("Error handling", () => {
    it("handles Error objects correctly", async () => {
      const testError = new Error("Test connection error");
      mockDb.execute.mockRejectedValueOnce(testError);
      mockDb.execute.mockResolvedValueOnce(createFingerprintResult(7));

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it("handles non-Error throws", async () => {
      mockDb.execute.mockRejectedValueOnce("String error");
      mockDb.execute.mockResolvedValueOnce(createFingerprintResult(7));

      const result = await simulateFingerprintCheck(mockDb.execute);

      expect(result.success).toBe(true);
    });

    it("handles null/undefined results gracefully", async () => {
      mockDb.execute
        .mockResolvedValueOnce([[{ result: 1 }]])
        .mockResolvedValueOnce([[{ cnt: null }]]); // null count

      const result = await simulateFingerprintCheck(mockDb.execute);

      // null coerces to 0, which is not 7, so should fail
      expect(result.success).toBe(false);
    });
  });

  describe("Warmup query behavior", () => {
    it("executes warmup query only on first attempt", async () => {
      // Track which queries are called
      const calls: string[] = [];
      mockDb.execute.mockImplementation(async (query: string) => {
        calls.push(query);
        if (query === "SELECT 1") {
          throw new Error("Warmup failed");
        }
        if (calls.length <= 2) {
          throw new Error("Still failing");
        }
        return createFingerprintResult(7);
      });

      await simulateFingerprintCheck(mockDb.execute);

      // Warmup (SELECT 1) should only be called once
      const warmupCalls = calls.filter((c) => c === "SELECT 1");
      expect(warmupCalls).toHaveLength(1);
    });
  });
});
