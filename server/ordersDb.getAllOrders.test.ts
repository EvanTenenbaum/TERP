/**
 * Regression tests for ordersDb.getAllOrders.
 *
 * TER-1146: /orders returned 500 whenever a single row had corrupted/legacy
 * items JSON. The list endpoint now tolerates per-row parse failures — it
 * logs and returns that row with items=[] so the rest of the list still
 * renders. Single-order reads (getOrderById) remain strict on purpose.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./db", () => {
  const mockDb = {
    select: vi.fn(),
  };
  return {
    getDb: vi.fn().mockResolvedValue(mockDb),
    db: mockDb,
  };
});

import * as dbModule from "./db";
import { getAllOrders } from "./ordersDb";

type MockRow = Record<string, unknown>;

function buildChainResolvingTo(rows: MockRow[]) {
  const chain: Record<string, unknown> = {};
  const passthrough = () => chain;
  chain.from = vi.fn(passthrough);
  chain.leftJoin = vi.fn(passthrough);
  chain.where = vi.fn(passthrough);
  chain.orderBy = vi.fn(passthrough);
  chain.limit = vi.fn(passthrough);
  chain.offset = vi.fn((): Promise<MockRow[]> => Promise.resolve(rows));
  return chain;
}

describe("ordersDb.getAllOrders", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("returns an empty array when no orders match (never 500)", async () => {
    const db = await dbModule.getDb();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (db!.select as ReturnType<typeof vi.fn>).mockReturnValue(
      buildChainResolvingTo([])
    );

    const result = await getAllOrders();
    expect(result).toEqual([]);
  });

  it("does NOT throw when a row has corrupted items JSON; returns that row with empty items", async () => {
    const db = await dbModule.getDb();

    const healthyRow = {
      orders: {
        id: 1,
        orderNumber: "S-2026-001",
        orderType: "SALE",
        clientId: 10,
        items: JSON.stringify([
          {
            batchId: 1,
            displayName: "OG Kush",
            quantity: 2,
            unitPrice: 100,
            isSample: false,
            unitCogs: 40,
            cogsMode: "FIXED",
          },
        ]),
        fulfillmentStatus: "CONFIRMED",
        isDraft: false,
      },
      clients: { id: 10, name: "Acme" },
    };

    const corruptedRow = {
      orders: {
        id: 2,
        orderNumber: "S-2026-002",
        orderType: "SALE",
        clientId: 11,
        items: "{not valid json",
        fulfillmentStatus: "CONFIRMED",
        isDraft: false,
      },
      clients: { id: 11, name: "Beta Co" },
    };

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (db!.select as ReturnType<typeof vi.fn>).mockReturnValue(
      buildChainResolvingTo([healthyRow, corruptedRow])
    );

    const result = await getAllOrders();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[0].items).toHaveLength(1);
    expect(result[1].id).toBe(2);
    expect(result[1].items).toEqual([]);
    expect(result[1].lineItemCount).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("handles null items without throwing", async () => {
    const db = await dbModule.getDb();

    const rowEmpty = {
      orders: {
        id: 3,
        orderNumber: "Q-2026-003",
        orderType: "QUOTE",
        clientId: 12,
        items: null,
        isDraft: true,
      },
      clients: { id: 12, name: "Gamma" },
    };

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (db!.select as ReturnType<typeof vi.fn>).mockReturnValue(
      buildChainResolvingTo([rowEmpty])
    );

    const result = await getAllOrders();
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([]);
  });
});
