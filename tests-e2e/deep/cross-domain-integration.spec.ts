/**
 * Cross-Domain Integration E2E Tests
 *
 * Verifies that mutations in one domain cascade correctly to related domains:
 *   1. Full Order-to-Cash chain with GL ledger verification
 *   2. Order → Pick/Pack → Ship → Deliver chain
 *   3. Returns with inventory restoration
 *   4. Multi-entity referential integrity
 *   5. AR dashboard data consistency before/after payment
 *   6. Inventory movement traceability (adjust → verify → reverse)
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
// Response types
// ---------------------------------------------------------------------------

type InvoiceRecord = {
  id: number;
  referenceId?: number | null;
  status?: string | null;
  totalAmount?: string | number | null;
  amountDue?: string | number | null;
  amountPaid?: string | number | null;
};

type PaymentResponse = {
  success: boolean;
  invoiceStatus?: string;
  paymentId?: number;
};

type LedgerTransaction = {
  type: string;
  referenceType: string;
  referenceId: number;
  amount?: string | number | null;
};

type LedgerResponse = {
  transactions: LedgerTransaction[];
};

type PickPackListItem = {
  orderId: number;
  orderNumber?: string;
  pickPackStatus?: string;
};

type OrderDetail = {
  id: number;
  fulfillmentStatus?: string;
  status?: string;
  clientId?: number;
  items?: Array<{
    id?: number;
    batchId?: number;
    quantity?: number;
  }>;
};

type StatusUpdateResponse = {
  success: boolean;
};

type ARSummary = {
  current?: number | string;
  thirtyDay?: number | string;
  sixtyDay?: number | string;
  ninetyDay?: number | string;
  total?: number | string;
  totalOutstanding?: number | string;
};

type InventoryListResponse = {
  items: Array<{
    batch: {
      id: number;
      onHandQty?: string | number | null;
      totalQty?: string | number | null;
      batchStatus?: string | null;
    };
  }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getBatchQty(
  page: import("@playwright/test").Page,
  batchId: number
): Promise<number> {
  const result = await trpcQuery<InventoryListResponse>(
    page,
    "inventory.list",
    { limit: 200 }
  );
  const match = result.items.find(i => i.batch.id === batchId);
  return toNumber(match?.batch.onHandQty);
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe("Cross-Domain Integration", () => {
  test.describe.configure({ tag: "@deep" });

  const createdOrderIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    for (const id of createdOrderIds) {
      await cleanupOrder(page, id);
    }
    createdOrderIds.length = 0;
  });

  // -----------------------------------------------------------------------
  // 1. Full Order-to-Cash with GL verification
  // -----------------------------------------------------------------------
  test("order-to-cash: order → invoice → payment → ledger entries verified", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);
    const unitPrice = Math.max(batch.unitCogs * 1.4, 1);

    // Create & confirm order
    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice,
    });
    createdOrderIds.push(order.id);
    await confirmSaleOrder(page, order.id);

    // Generate invoice
    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    expect(invoice.id).toBeGreaterThan(0);
    expect(invoice.referenceId).toBe(order.id);

    // Mark SENT
    await trpcMutation(page, "invoices.markSent", { id: invoice.id });
    const sent = await trpcQuery<InvoiceRecord>(page, "invoices.getById", {
      id: invoice.id,
    });
    expect(sent.status).toBe("SENT");

    // Record full payment
    const total = toNumber(sent.totalAmount);
    expect(total).toBeGreaterThan(0);

    const payment = await trpcMutation<PaymentResponse>(
      page,
      "payments.recordPayment",
      {
        invoiceId: invoice.id,
        amount: total,
        paymentMethod: "ACH",
        referenceNumber: `CDI-OTC-${Date.now()}`,
      }
    );
    expect(payment.success).toBe(true);
    expect(payment.invoiceStatus).toBe("PAID");

    // Verify invoice is PAID
    const paid = await trpcQuery<InvoiceRecord>(page, "invoices.getById", {
      id: invoice.id,
    });
    expect(paid.status).toBe("PAID");
    expect(toNumber(paid.amountDue)).toBeLessThanOrEqual(0.01);

    // Verify client ledger has SALE + PAYMENT_RECEIVED
    const ledger = await trpcQuery<LedgerResponse>(
      page,
      "clientLedger.getLedger",
      {
        clientId: client.id,
        limit: 150,
        transactionTypes: ["SALE", "PAYMENT_RECEIVED"],
      }
    );

    const hasSale = ledger.transactions.some(
      t =>
        t.type === "SALE" &&
        ((t.referenceType === "ORDER" && t.referenceId === order.id) ||
          (t.referenceType === "INVOICE" && t.referenceId === invoice.id))
    );
    expect(hasSale).toBe(true);

    const hasPayment = ledger.transactions.some(
      t =>
        t.type === "PAYMENT_RECEIVED" &&
        (t.referenceId === invoice.id || t.referenceId === order.id)
    );
    expect(hasPayment).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 2. Order → Pick/Pack → Ship → Deliver
  // -----------------------------------------------------------------------
  test("fulfillment chain: confirm → pack → ready → ship → deliver", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.3, 1),
    });
    createdOrderIds.push(order.id);
    await confirmSaleOrder(page, order.id);

    // Pick list should contain this order
    const pendingList = await trpcQuery<PickPackListItem[]>(
      page,
      "pickPack.getPickList",
      { filters: { status: "PENDING" }, limit: 100, offset: 0 }
    );
    expect(pendingList.some(item => item.orderId === order.id)).toBe(true);

    // Pack all items
    const packed = await trpcMutation<{ packedItemCount: number }>(
      page,
      "pickPack.markAllPacked",
      { orderId: order.id }
    );
    expect(packed.packedItemCount).toBeGreaterThan(0);

    // Mark READY
    const ready = await trpcMutation<StatusUpdateResponse>(
      page,
      "pickPack.markOrderReady",
      { orderId: order.id }
    );
    expect(ready.success).toBe(true);

    // Ship
    const shipped = await trpcMutation<StatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      { orderId: order.id, newStatus: "SHIPPED" }
    );
    expect(shipped.success).toBe(true);

    // Deliver
    const delivered = await trpcMutation<StatusUpdateResponse>(
      page,
      "orders.updateOrderStatus",
      { orderId: order.id, newStatus: "DELIVERED" }
    );
    expect(delivered.success).toBe(true);

    // Verify final state
    const detail = await trpcQuery<OrderDetail>(page, "orders.getById", {
      id: order.id,
    });
    expect(detail.fulfillmentStatus ?? detail.status).toMatch(/DELIVERED/i);

    // Generate invoice from delivered order
    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    expect(invoice.id).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // 3. Returns with inventory restoration
  // -----------------------------------------------------------------------
  test("return restocks inventory after delivery", async ({ page }) => {
    test.setTimeout(180_000);

    const batch = await findBatchWithStock(page);
    const client = await findBuyerClient(page);
    const qtyBefore = await getBatchQty(page, batch.id);

    // Create order → confirm → ship → deliver
    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.3, 1),
    });
    createdOrderIds.push(order.id);
    await confirmSaleOrder(page, order.id);

    try {
      await trpcMutation(page, "pickPack.markAllPacked", {
        orderId: order.id,
      });
      await trpcMutation(page, "pickPack.markOrderReady", {
        orderId: order.id,
      });
    } catch {
      // Best effort — pick/pack may not be required
    }

    await trpcMutation(page, "orders.updateOrderStatus", {
      orderId: order.id,
      newStatus: "SHIPPED",
    });
    await trpcMutation(page, "orders.updateOrderStatus", {
      orderId: order.id,
      newStatus: "DELIVERED",
    });

    // Check inventory was reduced
    const qtyAfterSale = await getBatchQty(page, batch.id);
    expect(
      qtyAfterSale,
      `Inventory should decrease after sale: before=${qtyBefore}, after=${qtyAfterSale}`
    ).toBeLessThan(qtyBefore);

    // Get order line items for return
    const orderDetail = await trpcQuery<OrderDetail>(page, "orders.getById", {
      id: order.id,
    });

    // Create return
    const lineItems = orderDetail.items ?? [];
    if (lineItems.length === 0) {
      test.skip(true, "Order has no line items for return");
      return;
    }

    const returnResult = await trpcMutation<{
      id: number;
      status?: string;
    }>(page, "returns.create", {
      orderId: order.id,
      reason: "QUALITY_ISSUE",
      restockInventory: true,
      items: lineItems.map(item => ({
        batchId: item.batchId ?? 0,
        quantity: String(item.quantity ?? 1),
      })),
    });
    expect(returnResult.id).toBeGreaterThan(0);

    // Process the return (issues credit and restocks)
    await trpcMutation(page, "returns.process", {
      id: returnResult.id,
      issueCredit: true,
    });

    // Verify inventory restored
    const qtyAfterReturn = await getBatchQty(page, batch.id);
    // After restock, qty should be >= what it was after sale
    expect(qtyAfterReturn).toBeGreaterThanOrEqual(qtyAfterSale);
    // Qty should be restored to original (within tolerance for rounding)
    expect(qtyAfterReturn).toBeCloseTo(qtyBefore, 0);
  });

  // -----------------------------------------------------------------------
  // 4. Referential integrity across entities
  // -----------------------------------------------------------------------
  test("order, invoice, and payment are correctly linked", async ({ page }) => {
    test.setTimeout(180_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.5, 2),
    });
    createdOrderIds.push(order.id);
    await confirmSaleOrder(page, order.id);

    // Generate invoice
    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    // Invoice references order
    expect(invoice.referenceId).toBe(order.id);

    await trpcMutation(page, "invoices.markSent", { id: invoice.id });

    // Partial payment
    const total = toNumber(
      (
        await trpcQuery<InvoiceRecord>(page, "invoices.getById", {
          id: invoice.id,
        })
      ).totalAmount
    );
    const partialAmount = Number((total * 0.5).toFixed(2));

    await trpcMutation<PaymentResponse>(page, "payments.recordPayment", {
      invoiceId: invoice.id,
      amount: partialAmount,
      paymentMethod: "CASH",
      referenceNumber: `CDI-REF-${Date.now()}`,
    });

    // Verify payment history links to invoice
    const history = await trpcQuery<
      Array<{
        paymentNumber?: string;
        allocatedAmount?: string | number;
        invoiceId?: number;
      }>
    >(page, "payments.getInvoicePaymentHistory", { invoiceId: invoice.id });

    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].paymentNumber).toBeTruthy();

    // Verify order still references client
    const orderDetail = await trpcQuery<OrderDetail>(page, "orders.getById", {
      id: order.id,
    });
    expect(orderDetail.clientId).toBe(client.id);

    // Verify invoice still references order
    const invoiceDetail = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(invoiceDetail.referenceId).toBe(order.id);
    expect(invoiceDetail.status).toBe("PARTIAL");
  });

  // -----------------------------------------------------------------------
  // 5. AR dashboard consistency
  // -----------------------------------------------------------------------
  test("AR dashboard reflects payment changes", async ({ page }) => {
    test.setTimeout(180_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.4, 1),
    });
    createdOrderIds.push(order.id);
    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    await trpcMutation(page, "invoices.markSent", { id: invoice.id });

    // Query AR summary before payment
    const arBefore = await trpcQuery<ARSummary>(
      page,
      "accounting.arApDashboard.getARSummary",
      {}
    );
    expect(arBefore).toBeTruthy();

    // Record full payment
    const total = toNumber(
      (
        await trpcQuery<InvoiceRecord>(page, "invoices.getById", {
          id: invoice.id,
        })
      ).totalAmount
    );
    await trpcMutation<PaymentResponse>(page, "payments.recordPayment", {
      invoiceId: invoice.id,
      amount: total,
      paymentMethod: "ACH",
      referenceNumber: `CDI-AR-${Date.now()}`,
    });

    // Query AR summary after payment
    const arAfter = await trpcQuery<ARSummary>(
      page,
      "accounting.arApDashboard.getARSummary",
      {}
    );
    expect(arAfter).toBeTruthy();

    // Outstanding should have decreased by at least the invoice amount
    const outstandingBefore = toNumber(
      arBefore.totalOutstanding ?? arBefore.total
    );
    const outstandingAfter = toNumber(
      arAfter.totalOutstanding ?? arAfter.total
    );
    // Payment of `total` should reduce outstanding
    expect(outstandingAfter).toBeLessThanOrEqual(outstandingBefore);
    if (outstandingBefore > 0) {
      const decrease = outstandingBefore - outstandingAfter;
      expect(
        decrease,
        `AR outstanding should decrease by payment amount (${total}), decreased by ${decrease}`
      ).toBeGreaterThanOrEqual(total * 0.9);
    }

    // Verify invoice is PAID
    const paidInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(paidInvoice.status).toBe("PAID");
  });

  // -----------------------------------------------------------------------
  // 6. Inventory movement traceability
  // -----------------------------------------------------------------------
  test("inventory adjustments are traceable and reversible", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const batch = await findBatchWithStock(page);
    const qtyBefore = await getBatchQty(page, batch.id);
    expect(qtyBefore).toBeGreaterThan(0);

    // Adjust +3
    await trpcMutation(page, "inventory.adjustQty", {
      id: batch.id,
      field: "onHandQty",
      adjustment: 3,
      adjustmentReason: "COUNT_DISCREPANCY",
    });

    const qtyAfterAdd = await getBatchQty(page, batch.id);
    expect(qtyAfterAdd).toBeCloseTo(qtyBefore + 3, 1);

    // Reverse: adjust -3
    await trpcMutation(page, "inventory.adjustQty", {
      id: batch.id,
      field: "onHandQty",
      adjustment: -3,
      adjustmentReason: "COUNT_DISCREPANCY",
    });

    const qtyAfterReverse = await getBatchQty(page, batch.id);
    expect(qtyAfterReverse).toBeCloseTo(qtyBefore, 1);
  });
});
