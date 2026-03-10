import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { pricingService } from "./pricingService";

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

type MockQueryChain = {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

function createSelectChain(result: unknown): MockQueryChain {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  } as MockQueryChain;

  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValue(result);

  return chain;
}

describe("pricingService range pricing defaults", () => {
  const mockedGetDb = vi.mocked(getDb);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fills missing channels with MID defaults", async () => {
    const from = vi.fn().mockResolvedValue([
      {
        channel: "LIVE_SHOPPING",
        defaultBasis: "HIGH",
      },
    ]);
    const mockDb = {
      select: vi.fn(() => ({ from })),
    };

    mockedGetDb.mockResolvedValue(mockDb as never);

    const result = await pricingService.getRangePricingDefaults();

    expect(result).toEqual([
      { channel: "SALES_SHEET", defaultBasis: "MID" },
      { channel: "LIVE_SHOPPING", defaultBasis: "HIGH" },
      { channel: "VIP_SHOPPING", defaultBasis: "MID" },
    ]);
  });

  it("updates an existing range pricing channel setting", async () => {
    const selectChain = createSelectChain([
      { id: 42, channel: "VIP_SHOPPING", defaultBasis: "LOW" },
    ]);
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });

    mockedGetDb.mockResolvedValue({
      select: vi.fn(() => selectChain),
      update,
      insert: vi.fn(),
    } as never);

    await pricingService.setRangePricingDefault("VIP_SHOPPING", "HIGH");

    expect(update).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith({
      defaultBasis: "HIGH",
      deletedAt: null,
    });
    expect(where).toHaveBeenCalledOnce();
  });

  it("inserts a new range pricing channel setting when one does not exist", async () => {
    const selectChain = createSelectChain([]);
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });

    mockedGetDb.mockResolvedValue({
      select: vi.fn(() => selectChain),
      update: vi.fn(),
      insert,
    } as never);

    await pricingService.setRangePricingDefault("SALES_SHEET", "LOW");

    expect(insert).toHaveBeenCalledOnce();
    expect(values).toHaveBeenCalledWith({
      channel: "SALES_SHEET",
      defaultBasis: "LOW",
    });
  });
});
