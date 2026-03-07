import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../db", () => ({
  getDb: mocks.mockGetDb,
}));

vi.mock("../_core/logger", () => ({
  logger: mocks.logger,
}));

describe("hasPhotographyCompleteFlagColumn", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.mockGetDb.mockReset();
    mocks.logger.info.mockReset();
    mocks.logger.warn.mockReset();
  });

  it("returns true when the photography flag column exists", async () => {
    mocks.mockGetDb.mockResolvedValue({
      execute: vi.fn().mockResolvedValue([[{ present: 1 }]]),
    });

    const { hasPhotographyCompleteFlagColumn } = await import(
      "./photographyCompleteCompatibility"
    );

    await expect(hasPhotographyCompleteFlagColumn()).resolves.toBe(true);
    expect(mocks.logger.info).not.toHaveBeenCalled();
  });

  it("returns false when running against a legacy batches schema", async () => {
    mocks.mockGetDb.mockResolvedValue({
      execute: vi.fn().mockResolvedValue([[]]),
    });

    const { hasPhotographyCompleteFlagColumn } = await import(
      "./photographyCompleteCompatibility"
    );

    await expect(hasPhotographyCompleteFlagColumn()).resolves.toBe(false);
    expect(mocks.logger.info).toHaveBeenCalledTimes(1);
  });
});
