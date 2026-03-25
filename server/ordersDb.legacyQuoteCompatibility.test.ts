import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

import { convertQuoteToSale, getOrderById } from "./ordersDb";
import { getDb } from "./db";
import {
  buildCompatibleOrderInsertEntries,
  resetOrderColumnCompatibilityCacheForTests,
} from "./lib/orderInsertCompatibility";

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
  const execute = vi.fn().mockResolvedValue([{ insertId: 88 }]);

  const tx = {
    select: vi.fn(() => createSelectChain(selectResults[selectIndex++] ?? [])),
    execute,
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

  return { tx, execute, insertValues, updateWhere };
}

describe("ordersDb legacy quote compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOrderColumnCompatibilityCacheForTests();
  });

  it("omits modern order columns when the live schema has not caught up yet", () => {
    const entries = buildCompatibleOrderInsertEntries(
      new Set([
        "order_number",
        "orderType",
        "is_draft",
        "client_id",
        "items",
        "subtotal",
        "tax",
        "discount",
        "total",
        "total_cogs",
        "total_margin",
        "avg_margin_percent",
        "paymentTerms",
        "cash_payment",
        "due_date",
        "saleStatus",
        "fulfillmentStatus",
        "notes",
        "created_by",
        "created_at",
        "updated_at",
      ]),
      {
        orderNumber: "S-TEST-1",
        orderType: "SALE",
        isDraft: false,
        clientId: 12,
        items: "[]",
        subtotal: "25",
        tax: "0",
        discount: "0",
        total: "25",
        totalCogs: "0",
        totalMargin: "25",
        avgMarginPercent: "100",
        paymentTerms: "NET_30",
        cashPayment: "0",
        dueDate: new Date("2026-03-11T19:00:00.000Z"),
        saleStatus: "PENDING",
        fulfillmentStatus: "READY_FOR_PACKING",
        confirmedAt: new Date("2026-03-11T19:00:00.000Z"),
        notes: "legacy-safe",
        createdBy: 5,
        convertedFromOrderId: 77,
      }
    );

    const columnNames = entries.map(([column]) => column);
    expect(columnNames).not.toContain("confirmed_at");
    expect(columnNames).not.toContain("converted_from_order_id");
    expect(columnNames).toContain("order_number");
    expect(columnNames).toContain("fulfillmentStatus");
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

    const { tx, execute, insertValues, updateWhere } = createTransactionMock([
      [legacyQuote],
      [createdSale],
      [],
      [batch],
    ]);

    const schemaExecute = vi
      .fn()
      .mockResolvedValue([
        [
          { Field: "order_number" },
          { Field: "orderType" },
          { Field: "is_draft" },
          { Field: "client_id" },
          { Field: "items" },
          { Field: "subtotal" },
          { Field: "tax" },
          { Field: "discount" },
          { Field: "total" },
          { Field: "total_cogs" },
          { Field: "total_margin" },
          { Field: "avg_margin_percent" },
          { Field: "paymentTerms" },
          { Field: "cash_payment" },
          { Field: "due_date" },
          { Field: "saleStatus" },
          { Field: "fulfillmentStatus" },
          { Field: "notes" },
          { Field: "created_by" },
          { Field: "created_at" },
          { Field: "updated_at" },
        ],
      ]);

    vi.mocked(getDb).mockResolvedValue({
      execute: schemaExecute,
      transaction: async (callback: (txArg: typeof tx) => Promise<unknown>) =>
        callback(tx),
    } as Awaited<ReturnType<typeof getDb>>);

    const result = await convertQuoteToSale({
      quoteId: 77,
      paymentTerms: "NET_30",
    });

    expect(result).toBe(createdSale);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(schemaExecute).toHaveBeenCalled();

    const [lineItemInsert] = insertValues.mock.calls.map(call => call[0]);

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

  it("filters soft-deleted quotes out of the convert-to-sale lookup", async () => {
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

    const { tx } = createTransactionMock([
      [legacyQuote],
      [createdSale],
      [],
      [batch],
    ]);

    vi.mocked(getDb).mockResolvedValue({
      execute: vi
        .fn()
        .mockResolvedValue([
          [
            { Field: "order_number" },
            { Field: "orderType" },
            { Field: "is_draft" },
            { Field: "client_id" },
            { Field: "items" },
            { Field: "subtotal" },
            { Field: "tax" },
            { Field: "discount" },
            { Field: "total" },
            { Field: "total_cogs" },
            { Field: "total_margin" },
            { Field: "avg_margin_percent" },
            { Field: "paymentTerms" },
            { Field: "cash_payment" },
            { Field: "due_date" },
            { Field: "saleStatus" },
            { Field: "fulfillmentStatus" },
            { Field: "notes" },
            { Field: "created_by" },
            { Field: "created_at" },
            { Field: "updated_at" },
          ],
        ]),
      transaction: async (callback: (txArg: typeof tx) => Promise<unknown>) =>
        callback(tx),
    } as Awaited<ReturnType<typeof getDb>>);

    await convertQuoteToSale({
      quoteId: 77,
      paymentTerms: "NET_30",
    });

    const quoteLookup = tx.select.mock.results[0]?.value as {
      where: ReturnType<typeof vi.fn>;
    };
    const whereClause = quoteLookup.where.mock.calls[0]?.[0];
    const rendered = new MySqlDialect().sqlToQuery(whereClause);

    expect(rendered.sql).toContain("`orders`.`deleted_at` is null");

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
