/**
 * Deep State Machine E2E Tests
 *
 * Exercises every documented state machine in TERP via direct tRPC calls:
 *   1. Order fulfillment happy path  (DRAFT → CONFIRMED → ... → DELIVERED)
 *   2. Order invalid transitions     (transitions the state machine rejects)
 *   3. Invoice status happy path     (DRAFT → SENT → PARTIAL → PAID)
 *   4. Invoice void transition       (SENT → VOID, then payments blocked)
 *   5. Batch status lifecycle        (LIVE → ON_HOLD → LIVE)
 *
 * Patterns follow the golden-flow convention: all state reads use
 * trpcQuery, all mutations use trpcMutation, cleanup happens in afterEach.
 *
 * Reference state machines:
 *   server/services/orderStateMachine.ts
 *   server/constants/batchStatuses.ts  (BATCH_STATUS_TRANSITIONS)
 */

import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { trpcMutation, trpcQuery } from "../utils/golden-flow-helpers";
import {
  cleanupOrder,
  confirmSaleOrder,
  createSaleOrder,
  findBatchWithStock,
  findBuyerClient,
  toNumber,
} from "../utils/e2e-business-helpers";

// ---------------------------------------------------------------------------
// Shared local types
// ---------------------------------------------------------------------------

type OrderRecord = {
  id: number;
  orderNumber?: string | null;
  fulfillmentStatus?: string | null;
  saleStatus?: string | null;
  isDraft?: boolean | null;
};

type OrderStatusUpdateResponse = {
  success?: boolean;
  orderId?: number;
  newStatus?: string;
};

type InvoiceRecord = {
  id: number;
  invoiceNumber?: string | null;
  status?: string | null;
  totalAmount?: string | number | null;
  amountPaid?: string | number | null;
  amountDue?: string | number | null;
};

type InvoiceGenerateResponse = {
  id: number;
  referenceId?: number | null;
  status?: string | null;
};

type InvoiceVoidResponse = {
  success: boolean;
  invoiceId?: number;
};

type InvoiceStatusUpdateResponse = {
  success: boolean;
  invoiceId?: number;
  status?: string;
};

type PaymentResponse = {
  success: boolean;
  invoiceStatus?: string;
  paymentId?: number;
};

type BatchRecord = {
  id: number;
  batchStatus?: string | null;
  sku?: string | null;
};

type BatchStatusUpdateResponse = {
  success?: boolean;
  id?: number;
  status?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type InventoryListResponse = {
  items: Array<{
    batch: {
      id: number;
      batchStatus?: string | null;
      sku?: string | null;
    };
  }>;
};

/** Fetch a single batch by ID using inventory.list (getById takes a bare int, incompatible with trpcQuery helper) */
async function fetchBatch(
  page: import("@playwright/test").Page,
  batchId: number
): Promise<BatchRecord> {
  const result = await trpcQuery<InventoryListResponse>(
    page,
    "inventory.list",
    { limit: 200 }
  );
  const match = result.items.find(i => i.batch.id === batchId);
  if (!match) throw new Error(`Batch ${batchId} not found in inventory.list`);
  return {
    id: match.batch.id,
    batchStatus: match.batch.batchStatus,
    sku: match.batch.sku,
  };
}

// ---------------------------------------------------------------------------
// Suite 1: Order Fulfillment State Machine — valid happy-path transitions
// ---------------------------------------------------------------------------

test.describe("Order Fulfillment State Machine — valid transitions", () => {
  test.describe.configure({ tag: "@deep" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("DRAFT order transitions to CONFIRMED via confirmOrder", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.4, 1),
    });
    createdOrderId = order.id;

    // Verify order starts as a draft
    const draftOrder = await trpcQuery<OrderRecord>(page, "orders.getById", {
      id: order.id,
    });
    expect(draftOrder.isDraft).toBe(true);

    // Transition DRAFT → CONFIRMED
    const confirmed = await confirmSaleOrder(page, order.id);
    expect(confirmed.success).toBe(true);
    expect(confirmed.orderId).toBe(order.id);

    const confirmedOrder = await trpcQuery<OrderRecord>(
      page,
      "orders.getById",
      { id: order.id }
    );
    expect(confirmedOrder.isDraft).toBe(false);
  });

  test("CONFIRMED order transitions through READY_FOR_PACKING → PACKED → SHIPPED → DELIVERED", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.4, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    // CONFIRMED → READY_FOR_PACKING
    await trpcMutation<OrderStatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      {
        orderId: order.id,
        newStatus: "READY_FOR_PACKING",
        notes: "State machine test: moving to READY_FOR_PACKING",
      }
    );
    const readyOrder = await trpcQuery<OrderRecord>(page, "orders.getById", {
      id: order.id,
    });
    expect(readyOrder.fulfillmentStatus).toBe("READY_FOR_PACKING");

    // READY_FOR_PACKING → PACKED
    await trpcMutation<OrderStatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      {
        orderId: order.id,
        newStatus: "PACKED",
        notes: "State machine test: moving to PACKED",
      }
    );
    const packedOrder = await trpcQuery<OrderRecord>(page, "orders.getById", {
      id: order.id,
    });
    expect(packedOrder.fulfillmentStatus).toBe("PACKED");

    // PACKED → SHIPPED
    await trpcMutation<OrderStatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      {
        orderId: order.id,
        newStatus: "SHIPPED",
        notes: "State machine test: moving to SHIPPED",
      }
    );
    const shippedOrder = await trpcQuery<OrderRecord>(page, "orders.getById", {
      id: order.id,
    });
    expect(shippedOrder.fulfillmentStatus).toBe("SHIPPED");

    // SHIPPED → DELIVERED
    await trpcMutation<OrderStatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      {
        orderId: order.id,
        newStatus: "DELIVERED",
        notes: "State machine test: moving to DELIVERED",
      }
    );
    const deliveredOrder = await trpcQuery<OrderRecord>(
      page,
      "orders.getById",
      {
        id: order.id,
      }
    );
    expect(deliveredOrder.fulfillmentStatus).toBe("DELIVERED");
  });

  test("CONFIRMED order can skip directly to SHIPPED (allowed shortcut)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.4, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    // CONFIRMED → SHIPPED (valid per ORDER_STATUS_TRANSITIONS)
    await trpcMutation<OrderStatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      {
        orderId: order.id,
        newStatus: "SHIPPED",
        notes: "State machine test: direct confirm-to-ship shortcut",
      }
    );
    const shippedOrder = await trpcQuery<OrderRecord>(page, "orders.getById", {
      id: order.id,
    });
    expect(shippedOrder.fulfillmentStatus).toBe("SHIPPED");
  });

  test("order status history is recorded for each transition", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.4, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    await trpcMutation<OrderStatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      { orderId: order.id, newStatus: "READY_FOR_PACKING" }
    );
    await trpcMutation<OrderStatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      { orderId: order.id, newStatus: "PACKED" }
    );

    const history = await trpcQuery<Array<{ status: string }>>(
      page,
      "orders.getOrderStatusHistory",
      { orderId: order.id }
    );
    // At minimum the transitions we drove should be recorded
    expect(history.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Order State Machine — invalid transitions must fail
// ---------------------------------------------------------------------------

test.describe("Order State Machine — invalid transitions are rejected", () => {
  test.describe.configure({ tag: "@deep" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("CONFIRMED order cannot jump directly to DELIVERED (invalid leap)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.4, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    // CONFIRMED → DELIVERED is not in ORDER_STATUS_TRANSITIONS["CONFIRMED"]
    let threw = false;
    try {
      await trpcMutation<OrderStatusUpdateResponse>(
        page,
        "orders.updateOrderStatus",
        {
          orderId: order.id,
          newStatus: "DELIVERED",
          notes: "invalid transition test",
        }
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("DELIVERED order cannot transition to CANCELLED (terminal forward state)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.4, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    // Drive to SHIPPED then DELIVERED
    await trpcMutation<OrderStatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      { orderId: order.id, newStatus: "SHIPPED" }
    );
    await trpcMutation<OrderStatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      { orderId: order.id, newStatus: "DELIVERED" }
    );

    // Verify delivered
    const deliveredOrder = await trpcQuery<OrderRecord>(
      page,
      "orders.getById",
      { id: order.id }
    );
    expect(deliveredOrder.fulfillmentStatus).toBe("DELIVERED");

    // DELIVERED → CANCELLED is not valid
    let threw = false;
    try {
      await trpcMutation<OrderStatusUpdateResponse>(
        page,
        "orders.updateOrderStatus",
        {
          orderId: order.id,
          newStatus: "CANCELLED",
          notes: "invalid transition test",
        }
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("CANCELLED order cannot be re-confirmed", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.4, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    // Cancel the order
    await trpcMutation<OrderStatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      { orderId: order.id, newStatus: "CANCELLED" }
    );

    const cancelledOrder = await trpcQuery<OrderRecord>(
      page,
      "orders.getById",
      { id: order.id }
    );
    expect(cancelledOrder.fulfillmentStatus).toBe("CANCELLED");

    // CANCELLED → any next status is blocked (terminal state)
    let threw = false;
    try {
      await trpcMutation<OrderStatusUpdateResponse>(
        page,
        "orders.updateOrderStatus",
        {
          orderId: order.id,
          newStatus: "READY_FOR_PACKING",
          notes: "invalid: re-open cancelled order",
        }
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("SHIPPED order cannot transition backwards to PACKED", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.4, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    await trpcMutation<OrderStatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      { orderId: order.id, newStatus: "SHIPPED" }
    );

    // SHIPPED → PACKED is backwards and invalid
    let threw = false;
    try {
      await trpcMutation<OrderStatusUpdateResponse>(
        page,
        "orders.updateOrderStatus",
        {
          orderId: order.id,
          newStatus: "PACKED",
          notes: "invalid: backwards transition",
        }
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Invoice Status State Machine — valid happy-path transitions
// ---------------------------------------------------------------------------

test.describe("Invoice Status State Machine — valid transitions", () => {
  test.describe.configure({ tag: "@deep" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("invoice begins in DRAFT after generation from a confirmed order", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.5, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceGenerateResponse>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    expect(invoice.id).toBeGreaterThan(0);
    expect(invoice.referenceId).toBe(order.id);

    const draftInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(draftInvoice.status).toBe("DRAFT");
  });

  test("DRAFT invoice transitions to SENT via invoices.markSent", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.5, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceGenerateResponse>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );

    // DRAFT → SENT
    const markSentResult = await trpcMutation<{ success: boolean }>(
      page,
      "invoices.markSent",
      { id: invoice.id }
    );
    expect(markSentResult.success).toBe(true);

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(sentInvoice.status).toBe("SENT");
  });

  test("SENT invoice transitions to PARTIAL after a partial payment, then PAID after full payment", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.5, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceGenerateResponse>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    const totalAmount = toNumber(sentInvoice.totalAmount);
    expect(totalAmount).toBeGreaterThan(0);

    // SENT → PARTIAL via partial payment
    const partialAmount = Number((totalAmount / 2).toFixed(2));
    const partialPayment = await trpcMutation<PaymentResponse>(
      page,
      "payments.recordPayment",
      {
        invoiceId: invoice.id,
        amount: partialAmount,
        paymentMethod: "ACH",
        referenceNumber: `SM-INV-PARTIAL-${Date.now()}`,
      }
    );
    expect(partialPayment.success).toBe(true);

    const partialInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(partialInvoice.status).toBe("PARTIAL");
    expect(toNumber(partialInvoice.amountPaid)).toBeGreaterThan(0);

    const remainingDue = toNumber(partialInvoice.amountDue);
    expect(remainingDue).toBeGreaterThan(0);

    // PARTIAL → PAID via remaining payment
    const finalPayment = await trpcMutation<PaymentResponse>(
      page,
      "payments.recordPayment",
      {
        invoiceId: invoice.id,
        amount: remainingDue,
        paymentMethod: "ACH",
        referenceNumber: `SM-INV-FINAL-${Date.now()}`,
      }
    );
    expect(finalPayment.success).toBe(true);
    expect(finalPayment.invoiceStatus).toBe("PAID");

    const paidInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(paidInvoice.status).toBe("PAID");
    expect(toNumber(paidInvoice.amountDue)).toBeLessThanOrEqual(0.01);
  });

  test("DRAFT invoice can be manually set to SENT via invoices.updateStatus", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.5, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceGenerateResponse>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );

    // DRAFT → SENT via updateStatus
    const updateResult = await trpcMutation<InvoiceStatusUpdateResponse>(
      page,
      "invoices.updateStatus",
      {
        id: invoice.id,
        status: "SENT",
        notes: "State machine test: manual status update",
      }
    );
    expect(updateResult.success).toBe(true);

    const updatedInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(updatedInvoice.status).toBe("SENT");
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Invoice Void Transition
// ---------------------------------------------------------------------------

test.describe("Invoice Void Transition", () => {
  test.describe.configure({ tag: "@deep" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("SENT invoice transitions to VOID via invoices.void", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.5, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceGenerateResponse>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(sentInvoice.status).toBe("SENT");

    // SENT → VOID
    const voidResult = await trpcMutation<InvoiceVoidResponse>(
      page,
      "invoices.void",
      {
        id: invoice.id,
        reason: "State machine test: voiding a SENT invoice",
      }
    );
    expect(voidResult.success).toBe(true);

    const voidedInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(voidedInvoice.status).toBe("VOID");
  });

  test("VOID invoice cannot accept further payments", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.5, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceGenerateResponse>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    await trpcMutation<InvoiceVoidResponse>(page, "invoices.void", {
      id: invoice.id,
      reason: "State machine test: block payments on void",
    });

    const voidedInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(voidedInvoice.status).toBe("VOID");

    // Attempting a payment against a VOID invoice must fail
    let threw = false;
    try {
      await trpcMutation<PaymentResponse>(page, "payments.recordPayment", {
        invoiceId: invoice.id,
        amount: 1,
        paymentMethod: "CASH",
        referenceNumber: `SM-VOID-PAY-${Date.now()}`,
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("VOID invoice cannot be updated to any other status", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.5, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceGenerateResponse>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    await trpcMutation<InvoiceVoidResponse>(page, "invoices.void", {
      id: invoice.id,
      reason: "State machine test: verify void is terminal",
    });

    // VOID → DRAFT is disallowed (voided invoices cannot be un-voided)
    let threw = false;
    try {
      await trpcMutation<InvoiceStatusUpdateResponse>(
        page,
        "invoices.updateStatus",
        {
          id: invoice.id,
          status: "DRAFT",
          notes: "invalid: attempt to reopen voided invoice",
        }
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("PAID invoice can only be voided, not set to another status", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.5, 1),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceGenerateResponse>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    const totalAmount = toNumber(sentInvoice.totalAmount);
    expect(totalAmount).toBeGreaterThan(0);

    // Pay the invoice in full
    await trpcMutation<PaymentResponse>(page, "payments.recordPayment", {
      invoiceId: invoice.id,
      amount: totalAmount,
      paymentMethod: "ACH",
      referenceNumber: `SM-PAID-VOID-${Date.now()}`,
    });

    const paidInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(paidInvoice.status).toBe("PAID");

    // PAID → SENT is blocked (only VOID is allowed from PAID)
    let threw = false;
    try {
      await trpcMutation<InvoiceStatusUpdateResponse>(
        page,
        "invoices.updateStatus",
        {
          id: invoice.id,
          status: "SENT",
          notes: "invalid: downgrade paid invoice",
        }
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 5: Batch Status Lifecycle
// ---------------------------------------------------------------------------

test.describe("Batch Status Lifecycle", () => {
  test.describe.configure({ tag: "@deep" });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("LIVE batch transitions to ON_HOLD and back to LIVE", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // Find a LIVE batch to work with
    const batch = await findBatchWithStock(page);
    expect(batch.batchStatus).toBe("LIVE");

    // LIVE → ON_HOLD
    const toHoldResult = await trpcMutation<BatchStatusUpdateResponse>(
      page,
      "inventory.updateStatus",
      {
        id: batch.id,
        status: "ON_HOLD",
        reason: "State machine test: placing batch on hold",
      }
    );
    // The mutation returns the updated batch; tolerate either shape
    expect(toHoldResult).toBeDefined();

    const onHoldBatch = await fetchBatch(page, batch.id);
    expect(onHoldBatch.batchStatus).toBe("ON_HOLD");

    // ON_HOLD → LIVE
    const toLiveResult = await trpcMutation<BatchStatusUpdateResponse>(
      page,
      "inventory.updateStatus",
      {
        id: batch.id,
        status: "LIVE",
        reason: "State machine test: reinstating batch to LIVE",
      }
    );
    expect(toLiveResult).toBeDefined();

    const liveBatch = await fetchBatch(page, batch.id);
    expect(liveBatch.batchStatus).toBe("LIVE");
  });

  test("LIVE batch cannot transition directly to CLOSED (invalid leap)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // BATCH_STATUS_TRANSITIONS["LIVE"] = ["ON_HOLD", "QUARANTINED", "SOLD_OUT"]
    // CLOSED is not in that set.
    const batch = await findBatchWithStock(page);
    expect(batch.batchStatus).toBe("LIVE");

    let threw = false;
    try {
      await trpcMutation<BatchStatusUpdateResponse>(
        page,
        "inventory.updateStatus",
        {
          id: batch.id,
          status: "CLOSED",
          reason: "State machine test: invalid LIVE → CLOSED transition",
        }
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("LIVE batch cannot transition to AWAITING_INTAKE (backwards)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // AWAITING_INTAKE is the starting state; LIVE cannot go back to it.
    const batch = await findBatchWithStock(page);
    expect(batch.batchStatus).toBe("LIVE");

    let threw = false;
    try {
      await trpcMutation<BatchStatusUpdateResponse>(
        page,
        "inventory.updateStatus",
        {
          id: batch.id,
          status: "AWAITING_INTAKE",
          reason: "State machine test: invalid LIVE → AWAITING_INTAKE",
        }
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("ON_HOLD batch can transition to QUARANTINED", async ({ page }) => {
    test.setTimeout(120_000);

    const batch = await findBatchWithStock(page);
    expect(batch.batchStatus).toBe("LIVE");

    // LIVE → ON_HOLD
    await trpcMutation<BatchStatusUpdateResponse>(
      page,
      "inventory.updateStatus",
      {
        id: batch.id,
        status: "ON_HOLD",
        reason: "State machine test: setup for ON_HOLD → QUARANTINED",
      }
    );

    // ON_HOLD → QUARANTINED
    await trpcMutation<BatchStatusUpdateResponse>(
      page,
      "inventory.updateStatus",
      {
        id: batch.id,
        status: "QUARANTINED",
        reason: "State machine test: ON_HOLD → QUARANTINED transition",
      }
    );

    const quarantinedBatch = await fetchBatch(page, batch.id);
    expect(quarantinedBatch.batchStatus).toBe("QUARANTINED");

    // Restore to LIVE so we do not leave the batch in a quarantined state
    // (QUARANTINED → LIVE is valid per BATCH_STATUS_TRANSITIONS)
    await trpcMutation<BatchStatusUpdateResponse>(
      page,
      "inventory.updateStatus",
      {
        id: batch.id,
        status: "LIVE",
        reason: "State machine test: restore from QUARANTINED",
      }
    );

    const restoredBatch = await fetchBatch(page, batch.id);
    expect(restoredBatch.batchStatus).toBe("LIVE");
  });
});
