import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

vi.mock("../db", () => setupDbMock());
vi.mock("../services/permissionService", () => setupPermissionMock());
vi.mock("../_core/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { getDb } from "../db";

const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

function createRangeComplianceDb(
  rows: Array<Record<string, unknown>>
): Awaited<ReturnType<typeof getDb>> {
  const builder = {
    from: vi.fn(() => builder),
    leftJoin: vi.fn(() => builder),
    where: vi.fn(() => builder),
    groupBy: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    then: (resolve: (value: typeof rows) => unknown) =>
      Promise.resolve(resolve(rows)),
  };

  return {
    select: vi.fn(() => builder),
  } as unknown as Awaited<ReturnType<typeof getDb>>;
}

const createCaller = async () => {
  const ctx = await createContext({
    req: { headers: {} } as unknown as Request,
    res: {} as unknown as Response,
  });

  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

describe("vendorPayables.getRangeCompliance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty payload for a vendor with no payables", async () => {
    vi.mocked(getDb).mockResolvedValue(createRangeComplianceDb([]));
    const caller = await createCaller();

    const result = await caller.vendorPayables.getRangeCompliance({
      vendorClientId: 42,
    });

    expect(result.items).toEqual([]);
    expect(result.summary).toEqual({
      totalBatchCount: 0,
      inRangeCount: 0,
      outOfRangeCount: 0,
      belowRangeCount: 0,
      totalUnitsSold: 0,
      inRangeUnitsSold: 0,
      outOfRangeUnitsSold: 0,
      belowRangeUnitsSold: 0,
    });
  });

  it("correctly identifies below-range batches and preserves the captured reason", async () => {
    vi.mocked(getDb).mockResolvedValue(
      createRangeComplianceDb([
        {
          batchId: 101,
          productName: "Blue Dream",
          batchCode: "BD-101",
          payableCogsPerUnit: "8.50",
          payableAmountDue: "120.00",
          agreedRangeMinFromLines: "9.00",
          agreedRangeMaxFromLines: "12.00",
          actualAvgSalePrice: "8.75",
          unitsSold: "14.00",
          belowRangeFlagCount: 1,
          belowRangeReason: "Approved to move aging inventory",
        },
      ])
    );
    const caller = await createCaller();

    const result = await caller.vendorPayables.getRangeCompliance({
      vendorClientId: 9,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      batchId: 101,
      productName: "Blue Dream",
      batchCode: "BD-101",
      agreedRangeMin: 9,
      agreedRangeMax: 12,
      actualAvgSalePrice: 8.75,
      unitsSold: 14,
      isBelowVendorRange: true,
      belowRangeReason: "Approved to move aging inventory",
      payableAmountDue: 120,
      rangeComplianceStatus: "BELOW_RANGE",
    });
  });

  it("computes summary counts and units accurately", async () => {
    vi.mocked(getDb).mockResolvedValue(
      createRangeComplianceDb([
        {
          batchId: 201,
          productName: "Batch One",
          batchCode: "B-201",
          payableCogsPerUnit: "9.00",
          payableAmountDue: "50.00",
          agreedRangeMinFromLines: "9.00",
          agreedRangeMaxFromLines: "12.00",
          actualAvgSalePrice: "10.00",
          unitsSold: "5.00",
          belowRangeFlagCount: 0,
          belowRangeReason: null,
        },
        {
          batchId: 202,
          productName: "Batch Two",
          batchCode: "B-202",
          payableCogsPerUnit: "9.00",
          payableAmountDue: "60.00",
          agreedRangeMinFromLines: "9.00",
          agreedRangeMaxFromLines: "12.00",
          actualAvgSalePrice: "8.50",
          unitsSold: "3.00",
          belowRangeFlagCount: 1,
          belowRangeReason: "Vendor-approved exception",
        },
        {
          batchId: 203,
          productName: "Batch Three",
          batchCode: "B-203",
          payableCogsPerUnit: "7.50",
          payableAmountDue: "80.00",
          agreedRangeMinFromLines: "7.50",
          agreedRangeMaxFromLines: "10.00",
          actualAvgSalePrice: "10.75",
          unitsSold: "2.00",
          belowRangeFlagCount: 0,
          belowRangeReason: null,
        },
      ])
    );
    const caller = await createCaller();

    const result = await caller.vendorPayables.getRangeCompliance({
      vendorClientId: 9,
    });

    expect(result.summary).toEqual({
      totalBatchCount: 3,
      inRangeCount: 1,
      outOfRangeCount: 2,
      belowRangeCount: 1,
      totalUnitsSold: 10,
      inRangeUnitsSold: 5,
      outOfRangeUnitsSold: 5,
      belowRangeUnitsSold: 3,
    });
    expect(result.items.map(item => item.rangeComplianceStatus)).toEqual([
      "IN_RANGE",
      "BELOW_RANGE",
      "ABOVE_RANGE",
    ]);
  });
});
