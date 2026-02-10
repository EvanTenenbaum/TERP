import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSchemaFingerprint } from "../autoMigrate";
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
    mockedGetDb.mockResolvedValue({
      execute: mockExecute,
    } as unknown as Awaited<ReturnType<typeof getDb>>);
  });

  it("returns complete when all canary checks pass", async () => {
    mockExecute
      .mockResolvedValueOnce([[{ result: 1 }]]) // warmup
      .mockResolvedValueOnce([[{ cnt: 7 }]]); // fingerprint

    const result = await checkSchemaFingerprint({ retries: 1 });

    expect(result.complete).toBe(true);
    expect(result.count).toBe(7);
    expect(result.attempts).toBe(1);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("returns incomplete when canary checks are missing", async () => {
    mockExecute
      .mockResolvedValueOnce([[{ result: 1 }]]) // warmup
      .mockResolvedValueOnce([[{ cnt: 4 }]]); // fingerprint

    const result = await checkSchemaFingerprint({ retries: 1 });

    expect(result.complete).toBe(false);
    expect(result.count).toBe(4);
    expect(result.attempts).toBe(1);
  });

  it("returns non-complete result when db is unavailable", async () => {
    mockedGetDb.mockResolvedValue(null);

    const result = await checkSchemaFingerprint({ retries: 1 });

    expect(result.complete).toBe(false);
    expect(result.count).toBe(0);
    expect(result.lastError).toContain("Database not available");
  });
});
