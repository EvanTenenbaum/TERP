import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkSchemaFingerprint,
  FINGERPRINT_CANARY_COUNT,
} from "../autoMigrate";
import { getDb } from "../db";

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../_core/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("checkSchemaFingerprint", () => {
  const mockedGetDb = vi.mocked(getDb);
  const mockExecute = vi.fn();
  const canaryCount = FINGERPRINT_CANARY_COUNT;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
    mockedGetDb.mockResolvedValue({
      execute: mockExecute,
    } as unknown as Awaited<ReturnType<typeof getDb>>);
  });

  it("returns complete when all canary checks pass", async () => {
    mockExecute.mockResolvedValueOnce([[{ result: 1 }]]); // warmup
    for (let i = 0; i < canaryCount; i++) {
      mockExecute.mockResolvedValueOnce([[{ passed: 1 }]]);
    }

    const result = await checkSchemaFingerprint({ retries: 1 });

    expect(result.complete).toBe(true);
    expect(result.count).toBe(canaryCount);
    expect(result.attempts).toBe(1);
    expect(result.missingChecks).toEqual([]);
    expect(result.checks).toHaveLength(canaryCount);
    expect(result.checks.every(check => check.passed)).toBe(true);
    expect(mockExecute).toHaveBeenCalledTimes(1 + canaryCount);
  });

  it("returns incomplete with named missing canary checks", async () => {
    mockExecute.mockResolvedValueOnce([[{ result: 1 }]]); // warmup
    for (let i = 0; i < canaryCount; i++) {
      mockExecute.mockResolvedValueOnce([[{ passed: i === 2 ? 0 : 1 }]]);
    }

    const result = await checkSchemaFingerprint({ retries: 1 });

    expect(result.complete).toBe(false);
    expect(result.count).toBe(canaryCount - 1);
    expect(result.attempts).toBe(1);
    expect(result.missingChecks).toEqual(["products.nameCanonical.column"]);
    expect(result.checks).toHaveLength(canaryCount);
  });

  it("returns non-complete result when db is unavailable", async () => {
    mockedGetDb.mockResolvedValue(null);

    const result = await checkSchemaFingerprint({ retries: 1 });

    expect(result.complete).toBe(false);
    expect(result.count).toBe(0);
    expect(result.checks).toEqual([]);
    expect(result.missingChecks).toEqual([]);
    expect(result.lastError).toContain("Database not available");
  });
});
