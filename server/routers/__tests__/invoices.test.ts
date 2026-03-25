import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "../../test-utils/testDb";
import { setupPermissionMock } from "../../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../../services/permissionService", () => setupPermissionMock());

// Mock services that invoices router depends on
vi.mock("../../services/orderAccountingService", () => ({
  createInvoiceFromOrderTx: vi.fn().mockResolvedValue(42),
}));

vi.mock("../../services/clientBalanceService", () => ({
  syncClientBalance: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../accountingHooks", () => ({
  reverseGLEntries: vi.fn().mockResolvedValue(undefined),
  GLPostingError: class GLPostingError extends Error {},
}));

vi.mock("../../services/pdfGenerator", () => ({
  generateInvoicePdf: vi
    .fn()
    .mockResolvedValue({ url: "http://example.com/invoice.pdf" }),
}));

import { appRouter } from "../../routers";
import { createContext } from "../../_core/context";
import { createMockDb } from "../../test-utils/testDb";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = async () => {
  const ctx = await createContext({
    req: { headers: {} } as Record<string, unknown>,
    res: {} as Record<string, unknown>,
  });

  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

// Helper: build a minimal valid SALE order in SHIPPED status
function makeShippedSaleOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    orderNumber: "ORD-001",
    orderType: "SALE",
    fulfillmentStatus: "SHIPPED",
    clientId: 1,
    subtotal: "1000.00",
    tax: "0.00",
    total: "1000.00",
    paymentTerms: "NET_30",
    items: JSON.stringify([{ batchId: 1, quantity: 10, unitPrice: 100 }]),
    invoiceId: null,
    deletedAt: null,
    isDraft: false,
    ...overrides,
  };
}

// Helper: build a select builder that resolves to `rows` immediately
function makeSelectBuilder(
  db: ReturnType<typeof createMockDb>,
  rows: unknown[]
) {
  const builder = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    then: (resolve: (v: unknown[]) => unknown) => resolve(rows),
  };
  return builder as unknown as ReturnType<typeof db.select>;
}

describe("invoices.generateFromOrder", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  it("happy path: generates invoice when order is SHIPPED SALE with no existing invoice", async () => {
    const { getDb } = await import("../../db");
    const db = (await getDb()) as ReturnType<typeof createMockDb>;
    const { createInvoiceFromOrderTx } =
      await import("../../services/orderAccountingService");

    const invoiceRow = { id: 42, invoiceNumber: "INV-001", status: "DRAFT" };

    const selectSpy = vi
      .spyOn(db, "select")
      // First select: orders lookup
      .mockImplementationOnce(() =>
        makeSelectBuilder(db, [makeShippedSaleOrder()])
      )
      // Second select: invoice existence check — no existing invoice
      .mockImplementationOnce(() => makeSelectBuilder(db, []))
      // Third select: fetch the newly created invoice by ID
      .mockImplementationOnce(() => makeSelectBuilder(db, [invoiceRow]));

    const result = await caller.invoices.generateFromOrder({ orderId: 100 });

    expect(result).toBeDefined();
    expect(result?.id).toBe(42);
    expect(createInvoiceFromOrderTx).toHaveBeenCalled();

    selectSpy.mockRestore();
  });

  it("duplicate guard: throws BAD_REQUEST when invoice already exists for the order", async () => {
    const { getDb } = await import("../../db");
    const db = (await getDb()) as ReturnType<typeof createMockDb>;

    const existingInvoice = { id: 99, invoiceNumber: "INV-EXISTING" };

    const selectSpy = vi
      .spyOn(db, "select")
      // First select: orders lookup
      .mockImplementationOnce(() =>
        makeSelectBuilder(db, [makeShippedSaleOrder()])
      )
      // Second select: invoice existence check — already exists
      .mockImplementationOnce(() => makeSelectBuilder(db, [existingInvoice]));

    await expect(
      caller.invoices.generateFromOrder({ orderId: 100 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("Invoice already exists"),
    });

    selectSpy.mockRestore();
  });

  it("invalid status: throws BAD_REQUEST when order has CONFIRMED fulfillmentStatus", async () => {
    const { getDb } = await import("../../db");
    const db = (await getDb()) as ReturnType<typeof createMockDb>;

    const selectSpy = vi
      .spyOn(db, "select")
      // Order is a SALE but not yet in an invoiceable fulfillment status
      .mockImplementationOnce(() =>
        makeSelectBuilder(db, [
          makeShippedSaleOrder({ fulfillmentStatus: "CONFIRMED" }),
        ])
      );

    await expect(
      caller.invoices.generateFromOrder({ orderId: 100 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("Order must be in status"),
    });

    selectSpy.mockRestore();
  });
});
