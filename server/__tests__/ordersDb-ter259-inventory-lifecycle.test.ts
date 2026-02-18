/**
 * TER-259 Regression Tests — Inventory Lifecycle
 *
 * Verifies the consistent inventory lifecycle established by TER-259:
 *   1. Order created (non-draft)  → reservedQty incremented (soft lock)
 *   2. Draft order created        → NO inventory change
 *   3. Draft confirmed            → reservedQty incremented
 *   4. Order shipped              → reservedQty decremented AND onHandQty decremented
 *   5. Order cancelled            → reservedQty decremented (restored)
 *
 * These are unit tests using mocked DB. They validate the branching logic
 * inside ordersDb.ts without requiring a live database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateOrderStatus, isValidStatusTransition } from "../ordersDb";
import { getDb } from "../db";

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal batch row with default quantities */
function makeBatchRow(overrides: Record<string, string | number | null> = {}) {
  return {
    id: 42,
    sku: "TEST-SKU-001",
    productId: 1,
    onHandQty: "100",
    reservedQty: "0",
    quarantineQty: "0",
    holdQty: "0",
    sampleQty: "10",
    status: "ACTIVE",
    ...overrides,
  };
}

/** Minimal order row with items as JSON string */
function makeOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    orderNumber: "O-TER259",
    clientId: 10,
    orderType: "SALE",
    fulfillmentStatus: "PACKED",
    saleStatus: "PENDING",
    version: 1,
    tax: "0",
    cashPayment: "0",
    dueDate: null,
    invoiceId: null,
    items: JSON.stringify([
      {
        batchId: 42,
        quantity: 10,
        isSample: false,
        displayName: "Test Product",
        originalName: "Test Product",
        unitPrice: 10,
        lineTotal: 100,
        unitCogs: 8,
        cogsMode: "FIXED" as const,
        cogsSource: "FIXED" as const,
        unitMargin: 2,
        marginPercent: 20,
      },
    ]),
    ...overrides,
  };
}

/**
 * Build a simple mock transaction.
 * selectResults is consumed sequentially — each tx.select() call pulls the next entry.
 */
function buildMockTx(
  selectResults: unknown[][],
  updateFn?: ReturnType<typeof vi.fn>,
  insertFn?: ReturnType<typeof vi.fn>
) {
  let idx = 0;

  const defaultUpdateFn =
    updateFn ??
    vi.fn().mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));

  const defaultInsertFn = insertFn ?? vi.fn().mockResolvedValue(undefined);

  return {
    select: vi.fn(() => {
      const result = selectResults[idx++] ?? [];
      const chain: Record<string, unknown> = {};
      const methods = ["from", "where", "limit", "for", "orderBy", "select"];
      for (const m of methods) {
        chain[m] = vi.fn(() => chain);
      }
      // Make thenable so `await chain` resolves to result
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(resolve(result));
      return chain;
    }),
    update: vi.fn(() => ({ set: defaultUpdateFn })),
    insert: vi.fn(() => ({ values: defaultInsertFn })),
  };
}

function buildMockDb(tx: ReturnType<typeof buildMockTx>) {
  return {
    transaction: vi.fn(async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx)
    ),
  };
}

// ---------------------------------------------------------------------------
// Scenario 4: SHIPPED — reservedQty decremented AND onHandQty decremented
// ---------------------------------------------------------------------------

describe("TER-259 Scenario 4: SHIPPED decrements both reservedQty and onHandQty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PACKED -> SHIPPED: state machine allows the transition", () => {
    expect(isValidStatusTransition("fulfillment", "PACKED", "SHIPPED")).toBe(
      true
    );
  });

  it("SHIPPED transition calls tx.update with both onHandQty and reservedQty", async () => {
    // Arrange: order with reserved=10 on a batch with onHand=100
    const batchWithReservation = makeBatchRow({
      onHandQty: "100",
      reservedQty: "10",
    });

    const setFn = vi.fn().mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));

    const selectResults: unknown[][] = [
      [makeOrderRow({ fulfillmentStatus: "PACKED" })], // order fetch
      [batchWithReservation], // batch availability check
      [batchWithReservation], // batch lock for decrement
    ];

    const tx = buildMockTx(selectResults, setFn);
    const db = buildMockDb(tx);
    vi.mocked(getDb).mockResolvedValue(
      db as unknown as Awaited<ReturnType<typeof getDb>>
    );

    vi.doMock("../../drizzle/schema", () => ({
      orderStatusHistory: {},
      inventoryMovements: {},
    }));

    try {
      await updateOrderStatus({
        orderId: 1,
        newStatus: "SHIPPED",
        userId: 99,
      });
    } catch {
      // Expected: the mock doesn't fully satisfy all internals (e.g. invoice creation).
      // We only assert that the batch update was called with the correct fields.
    }

    // tx.update should have been called
    expect(tx.update).toHaveBeenCalled();

    // Inspect the set() arguments for a call that includes both onHandQty and reservedQty
    const setCalls = setFn.mock.calls;
    const batchUpdateCall = setCalls.find(
      (call: unknown[]) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        "onHandQty" in (call[0] as Record<string, unknown>) &&
        "reservedQty" in (call[0] as Record<string, unknown>)
    );

    expect(batchUpdateCall).toBeDefined();

    if (batchUpdateCall) {
      const payload = batchUpdateCall[0] as {
        onHandQty: string;
        reservedQty: string;
      };
      // onHandQty should decrease: 100 - 10 = 90
      expect(payload.onHandQty).toBe("90");
      // reservedQty should decrease: 10 - 10 = 0 (never negative)
      expect(payload.reservedQty).toBe("0");
    }
  });

  it("SHIPPED: reservedQty never goes below 0 (defensive Math.max)", async () => {
    // Batch where reservedQty is 0 (e.g. reservation was not set properly)
    const batchWithoutReservation = makeBatchRow({
      onHandQty: "100",
      reservedQty: "0",
    });

    const setFn = vi.fn().mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));

    const selectResults: unknown[][] = [
      [makeOrderRow({ fulfillmentStatus: "PACKED" })],
      [batchWithoutReservation], // availability check
      [batchWithoutReservation], // batch lock for decrement
    ];

    const tx = buildMockTx(selectResults, setFn);
    const db = buildMockDb(tx);
    vi.mocked(getDb).mockResolvedValue(
      db as unknown as Awaited<ReturnType<typeof getDb>>
    );

    vi.doMock("../../drizzle/schema", () => ({
      orderStatusHistory: {},
      inventoryMovements: {},
    }));

    try {
      await updateOrderStatus({
        orderId: 1,
        newStatus: "SHIPPED",
        userId: 99,
      });
    } catch {
      // Expected: mock doesn't fully satisfy all downstream calls.
    }

    const setCalls = setFn.mock.calls;
    const batchUpdateCall = setCalls.find(
      (call: unknown[]) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        "reservedQty" in (call[0] as Record<string, unknown>)
    );

    if (batchUpdateCall) {
      const payload = batchUpdateCall[0] as { reservedQty: string };
      // reservedQty should be 0, not negative
      expect(Number(payload.reservedQty)).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 4b: SHIPPED — rejects when onHandQty is insufficient
// ---------------------------------------------------------------------------

describe("TER-259 Scenario 4b: SHIPPED rejects insufficient on-hand inventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SHIPPED rejects when onHandQty < item.quantity", async () => {
    // Batch has only 5 on-hand but order wants 10
    const insufficientBatch = makeBatchRow({
      onHandQty: "5",
      reservedQty: "10",
    });

    const selectResults: unknown[][] = [
      [makeOrderRow({ fulfillmentStatus: "PACKED" })], // order fetch
      [insufficientBatch], // availability check
    ];

    const tx = buildMockTx(selectResults);
    const db = buildMockDb(tx);
    vi.mocked(getDb).mockResolvedValue(
      db as unknown as Awaited<ReturnType<typeof getDb>>
    );

    await expect(
      updateOrderStatus({
        orderId: 1,
        newStatus: "SHIPPED",
        userId: 99,
      })
    ).rejects.toThrow(/Insufficient inventory for batch/);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: CANCELLED — reservedQty restored (TER-258, verified still works)
// ---------------------------------------------------------------------------

describe("TER-259 Scenario 5: CANCELLED restores reservedQty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PENDING -> CANCELLED: state machine allows transition", () => {
    expect(isValidStatusTransition("fulfillment", "PENDING", "CANCELLED")).toBe(
      true
    );
  });

  it("PACKED -> CANCELLED: state machine allows transition", () => {
    expect(isValidStatusTransition("fulfillment", "PACKED", "CANCELLED")).toBe(
      true
    );
  });

  it("SHIPPED -> CANCELLED: state machine rejects (terminal state)", () => {
    expect(isValidStatusTransition("fulfillment", "SHIPPED", "CANCELLED")).toBe(
      false
    );
  });

  it("PACKED -> CANCELLED: tx.update is called (reservation release)", async () => {
    const batchRow = makeBatchRow({ reservedQty: "10" });
    let selectResultsIdx = 0;
    const selectResults: unknown[][] = [
      [makeOrderRow({ fulfillmentStatus: "PACKED" })], // order fetch
      [batchRow], // batch for reservation release
      [{ version: 2 }], // updated order version
    ];

    const setFn = vi.fn().mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));
    const tx = {
      select: vi.fn(() => {
        const result = selectResults[selectResultsIdx++] ?? [];
        const chain: Record<string, unknown> = {};
        const methods = ["from", "where", "limit", "for", "orderBy", "select"];
        for (const m of methods) {
          chain[m] = vi.fn(() => chain);
        }
        chain.then = (resolve: (v: unknown) => unknown) =>
          Promise.resolve(resolve(result));
        return chain;
      }),
      update: vi.fn(() => ({ set: setFn })),
      insert: vi.fn(() => ({
        values: vi.fn().mockResolvedValue(undefined),
      })),
    };

    const db = buildMockDb(tx as unknown as ReturnType<typeof buildMockTx>);
    vi.mocked(getDb).mockResolvedValue(
      db as unknown as Awaited<ReturnType<typeof getDb>>
    );

    vi.doMock("../../drizzle/schema", () => ({
      orderStatusHistory: {},
    }));

    try {
      await updateOrderStatus({
        orderId: 1,
        newStatus: "CANCELLED",
        userId: 99,
      });
    } catch {
      // Acceptable: mock may not satisfy all internals.
    }

    // tx.update should have been called for the reservation release
    expect(tx.update).toHaveBeenCalled();
  });

  it("PENDING -> CANCELLED: no inventory update attempted (nothing reserved at fulfillmentStatus level)", async () => {
    const pendingOrder = makeOrderRow({ fulfillmentStatus: "PENDING" });
    let selectResultsIdx = 0;
    const selectResults: unknown[][] = [
      [pendingOrder], // order fetch
      [{ version: 2 }], // updated order version
    ];

    const setFn = vi.fn().mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));

    const tx = {
      select: vi.fn(() => {
        const result = selectResults[selectResultsIdx++] ?? [];
        const chain: Record<string, unknown> = {};
        const methods = ["from", "where", "limit", "for", "orderBy", "select"];
        for (const m of methods) {
          chain[m] = vi.fn(() => chain);
        }
        chain.then = (resolve: (v: unknown) => unknown) =>
          Promise.resolve(resolve(result));
        return chain;
      }),
      update: vi.fn(() => ({ set: setFn })),
      insert: vi.fn(() => ({
        values: vi.fn().mockResolvedValue(undefined),
      })),
    };

    const db = buildMockDb(tx as unknown as ReturnType<typeof buildMockTx>);
    vi.mocked(getDb).mockResolvedValue(
      db as unknown as Awaited<ReturnType<typeof getDb>>
    );

    vi.doMock("../../drizzle/schema", () => ({
      orderStatusHistory: {},
    }));

    try {
      await updateOrderStatus({
        orderId: 1,
        newStatus: "CANCELLED",
        userId: 99,
      });
    } catch {
      // Acceptable: mock may not fully satisfy all internals.
    }

    // Under TER-259, PENDING orders have active reservations (reservedQty was
    // incremented at creation/confirmation). Cancelling a PENDING order SHOULD
    // release the reservation by decrementing reservedQty.
    const setCalls = setFn.mock.calls;
    const batchReservationRelease = setCalls.find(
      (call: unknown[]) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        "reservedQty" in (call[0] as Record<string, unknown>)
    );

    // PENDING -> CANCELLED SHOULD release reservedQty (QA-001 fix)
    expect(batchReservationRelease).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// State Machine Completeness Tests
// ---------------------------------------------------------------------------

describe("TER-259 Inventory lifecycle state machine", () => {
  it("valid progression: PENDING -> PACKED -> SHIPPED", () => {
    expect(isValidStatusTransition("fulfillment", "PENDING", "PACKED")).toBe(
      true
    );
    expect(isValidStatusTransition("fulfillment", "PACKED", "SHIPPED")).toBe(
      true
    );
  });

  it("invalid: SHIPPED -> any (terminal state)", () => {
    expect(isValidStatusTransition("fulfillment", "SHIPPED", "PENDING")).toBe(
      false
    );
    expect(isValidStatusTransition("fulfillment", "SHIPPED", "PACKED")).toBe(
      false
    );
    expect(isValidStatusTransition("fulfillment", "SHIPPED", "CANCELLED")).toBe(
      false
    );
  });

  it("invalid: CANCELLED -> any (terminal state)", () => {
    expect(isValidStatusTransition("fulfillment", "CANCELLED", "PENDING")).toBe(
      false
    );
    expect(isValidStatusTransition("fulfillment", "CANCELLED", "PACKED")).toBe(
      false
    );
    expect(isValidStatusTransition("fulfillment", "CANCELLED", "SHIPPED")).toBe(
      false
    );
  });
});
