import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { updatePayableOnSale } from "./payablesService";

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./notificationService", () => ({
  sendBulkNotification: vi.fn(),
}));

type MockSelectChain = {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
};

function createSelectChain(result: unknown): MockSelectChain {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
    offset: vi.fn(),
  } as MockSelectChain;

  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  chain.where.mockResolvedValue(result);
  chain.limit.mockResolvedValue(result);

  return chain;
}

describe("payablesService.updatePayableOnSale", () => {
  const mockedGetDb = vi.mocked(getDb);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recalculates payable totals from allocation and unallocated sale rows", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(
        createSelectChain([
          {
            ownershipType: "CONSIGNED",
            onHandQty: "10.00",
            unitCogs: "12.00",
          },
        ])
      )
      .mockReturnValueOnce(
        createSelectChain([
          {
            id: 17,
            amountPaid: "15.00",
          },
        ])
      )
      .mockReturnValueOnce(
        createSelectChain([
          {
            orderLineItemId: 501,
            quantityAllocated: "2.00",
            unitCost: "11.00",
          },
        ])
      )
      .mockReturnValueOnce(
        createSelectChain([
          {
            quantity: "3.00",
            unitCost: "13.00",
          },
        ])
      );

    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });

    mockedGetDb.mockResolvedValue({
      select,
      update,
    } as never);

    await updatePayableOnSale(99, 5);

    expect(update).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith({
      unitsSold: "5.00",
      cogsPerUnit: "12.20",
      totalAmount: "61.00",
      amountDue: "46.00",
    });
    expect(where).toHaveBeenCalledOnce();
  });

  it("skips payable updates for non-consigned inventory", async () => {
    const select = vi.fn().mockReturnValueOnce(
      createSelectChain([
        {
          ownershipType: "OFFICE_OWNED",
          onHandQty: "10.00",
          unitCogs: "12.00",
        },
      ])
    );
    const update = vi.fn();

    mockedGetDb.mockResolvedValue({
      select,
      update,
    } as never);

    await updatePayableOnSale(99, 2);

    expect(update).not.toHaveBeenCalled();
  });
});
