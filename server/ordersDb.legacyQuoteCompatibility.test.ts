import { beforeEach, describe, expect, it, vi } from "vitest";

import { convertQuoteToSale, getOrderById } from "./ordersDb";
import { getDb } from "./db";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

function createSelectChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "where", "limit", "for", "orderBy"];

  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }

  chain.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(resolve(result));

  return chain;
}

function createTransactionMock(selectResults: unknown[]) {
  let selectIndex = 0;
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const updateWhere = vi.fn().mockResolvedValue(undefined);

  const tx = {
    select: vi.fn(() => createSelectChain(selectResults[selectIndex++] ?? [])),
    insert: vi.fn(() => ({
      values: insertValues,
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: updateWhere,
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
  };

  return { tx, insertValues, updateWhere };
}

describe("ordersDb legacy quote compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts a legacy quote with price-only items into a normalized sale", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T19:00:00.000Z"));

    const legacyQuote = {
      id: 77,
      orderNumber: "Q-LEGACY-001",
      orderType: "QUOTE",
      quoteStatus: null,
      clientId: 12,
      items: JSON.stringify([
        {
          batchId: 42,
          displayName: "Legacy Flower",
          quantity: 2,
          price: "12.50",
        },
      ]),
      subtotal: "25.00",
      tax: "0",
      discount: "0",
      total: "25.00",
      totalCogs: null,
      totalMargin: null,
      avgMarginPercent: null,
      validUntil: null,
      notes: "legacy quote",
      createdBy: 5,
    };

    const createdSale = {
      id: 88,
      orderNumber: "S-1741729200000",
      orderType: "SALE",
      clientId: 12,
      items: "[]",
      tax: "0",
      subtotal: "25.00",
      total: "25.00",
    };

    const batch = {
      id: 42,
      sku: "LEG-42",
      sampleQty: "0",
      reservedQty: "0",
      onHandQty: "100",
      quarantineQty: "0",
      holdQty: "0",
    };

    const { tx, insertValues, updateWhere } = createTransactionMock([
      [legacyQuote],
      [createdSale],
      [],
      [batch],
    ]);

    vi.mocked(getDb).mockResolvedValue({
      transaction: async (callback: (txArg: typeof tx) => Promise<unknown>) =>
        callback(tx),
    } as Awaited<ReturnType<typeof getDb>>);

    const result = await convertQuoteToSale({
      quoteId: 77,
      paymentTerms: "NET_30",
    });

    expect(result).toBe(createdSale);

    const [saleInsert, lineItemInsert] = insertValues.mock.calls.map(
      call => call[0]
    );

    expect(saleInsert).toEqual(
      expect.objectContaining({
        orderType: "SALE",
        isDraft: false,
        fulfillmentStatus: "READY_FOR_PACKING",
        saleStatus: "PENDING",
        subtotal: "25",
        total: "25",
        confirmedAt: expect.any(Date),
      })
    );

    const normalizedItems = JSON.parse(saleInsert.items as string) as Array<{
      unitPrice: number;
      lineTotal: number;
      unitCogs: number;
    }>;
    expect(normalizedItems).toEqual([
      expect.objectContaining({
        unitPrice: 12.5,
        lineTotal: 25,
        unitCogs: 0,
      }),
    ]);

    expect(lineItemInsert).toEqual([
      expect.objectContaining({
        productDisplayName: "Legacy Flower",
        unitPrice: "12.50",
        lineTotal: "25.00",
        cogsPerUnit: "0.0000",
      }),
    ]);

    expect(updateWhere).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("normalizes legacy price-only items when reading an order", async () => {
    const legacyOrder = {
      id: 91,
      orderNumber: "Q-LEGACY-READ",
      orderType: "QUOTE",
      quoteStatus: null,
      fulfillmentStatus: null,
      items: JSON.stringify([
        {
          batchId: 7,
          productName: "Legacy Extract",
          quantity: 3,
          price: "9.25",
        },
      ]),
    };

    const db = {
      select: vi.fn(() => createSelectChain([legacyOrder])),
    };

    vi.mocked(getDb).mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);

    const order = await getOrderById(91);

    expect(order?.quoteStatus).toBe("UNSENT");
    expect(order?.items).toEqual([
      expect.objectContaining({
        displayName: "Legacy Extract",
        unitPrice: 9.25,
        lineTotal: 27.75,
      }),
    ]);
  });
});
