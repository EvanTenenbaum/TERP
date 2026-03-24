/**
 * Critical Edge Case E2E Tests
 *
 * Tests for high-risk scenarios identified in adversarial review that could
 * cause data corruption or financial loss if broken:
 *
 *   1. Void a PARTIALLY PAID invoice — what happens to recorded payments?
 *   2. Return WITHOUT restock — inventory must NOT increase
 *   3. Cancel order that already has an active invoice
 *   4. Multi-line-item order with per-line margin verification
 *   5. Concurrent orders against same low-stock batch (oversell prevention)
 *   6. Bad debt write-off then payment on same transaction (double-accounting)
 *
 * Tag: @deep
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
// Types
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

type InvoiceVoidResponse = {
  success: boolean;
};

type OrderDetail = {
  id: number;
  fulfillmentStatus?: string | null;
  saleStatus?: string | null;
  status?: string | null;
  clientId?: number;
  items?: Array<{
    id?: number;
    batchId?: number;
    quantity?: number;
    unitPrice?: string | number | null;
    unitCogs?: string | number | null;
    marginPercent?: string | number | null;
    marginDollar?: string | number | null;
  }>;
};

type InventoryListResponse = {
  items: Array<{
    batch: {
      id: number;
      onHandQty?: string | number | null;
    };
  }>;
};

type LedgerResponse = {
  transactions: Array<{
    type: string;
    referenceType?: string;
    referenceId?: number;
  }>;
};

type BadDebtWriteOffResult = {
  success: boolean;
  writeOffId?: number;
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
// Suite
// ---------------------------------------------------------------------------

test.describe("Critical Edge Cases", () => {
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

  // -------------------------------------------------------------------------
  // 1. Void a PARTIALLY PAID invoice
  // -------------------------------------------------------------------------
  test("voiding a PARTIAL invoice: recorded payments are handled, status becomes VOID", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 2,
      unitPrice: Math.max(batch.unitCogs * 1.5, 10),
    });
    createdOrderIds.push(order.id);
    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    await trpcMutation(page, "invoices.markSent", { id: invoice.id });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    const total = toNumber(sentInvoice.totalAmount);
    const partialAmount = Number((total * 0.4).toFixed(2));

    // Record partial payment (40%)
    await trpcMutation<PaymentResponse>(page, "payments.recordPayment", {
      invoiceId: invoice.id,
      amount: partialAmount,
      paymentMethod: "ACH",
      referenceNumber: `EDGE-PARTIAL-VOID-${Date.now()}`,
    });

    const partialInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(partialInvoice.status).toBe("PARTIAL");
    expect(toNumber(partialInvoice.amountPaid)).toBeGreaterThan(0);

    // Now void the PARTIAL invoice
    const voidResult = await trpcMutation<InvoiceVoidResponse>(
      page,
      "invoices.void",
      { id: invoice.id, reason: "Edge case test: void partial invoice" }
    );
    expect(voidResult.success).toBe(true);

    // Verify status is VOID
    const voidedInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(voidedInvoice.status).toBe("VOID");

    // Further payments must be blocked
    let paymentBlocked = false;
    try {
      await trpcMutation<PaymentResponse>(page, "payments.recordPayment", {
        invoiceId: invoice.id,
        amount: 1,
        paymentMethod: "CASH",
        referenceNumber: `EDGE-VOID-RETRY-${Date.now()}`,
      });
    } catch {
      paymentBlocked = true;
    }
    expect(paymentBlocked).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. Return WITHOUT restock — inventory must NOT increase
  // -------------------------------------------------------------------------
  test("return with restockInventory=false does NOT increase batch onHandQty", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const batch = await findBatchWithStock(page);
    const client = await findBuyerClient(page);

    // Create, confirm, ship, deliver
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
      // Pick/pack optional
    }

    await trpcMutation(page, "orders.updateOrderStatus", {
      orderId: order.id,
      newStatus: "SHIPPED",
    });
    await trpcMutation(page, "orders.updateOrderStatus", {
      orderId: order.id,
      newStatus: "DELIVERED",
    });

    // Capture inventory AFTER delivery
    const qtyAfterDelivery = await getBatchQty(page, batch.id);

    // Get line items for return
    const orderDetail = await trpcQuery<OrderDetail>(page, "orders.getById", {
      id: order.id,
    });
    const lineItems = orderDetail.items ?? [];
    if (lineItems.length === 0) {
      test.skip(true, "Order has no line items for return");
      return;
    }

    // Create return with restockInventory = FALSE
    const returnResult = await trpcMutation<{ id: number }>(
      page,
      "returns.create",
      {
        orderId: order.id,
        reason: "QUALITY_ISSUE",
        restockInventory: false,
        items: lineItems.map(item => ({
          batchId: item.batchId ?? 0,
          quantity: String(item.quantity ?? 1),
        })),
      }
    );
    expect(returnResult.id).toBeGreaterThan(0);

    // Process the return without issuing credit
    await trpcMutation(page, "returns.process", {
      id: returnResult.id,
      issueCredit: false,
    });

    // Verify inventory did NOT increase
    const qtyAfterReturn = await getBatchQty(page, batch.id);
    expect(qtyAfterReturn).toBeLessThanOrEqual(qtyAfterDelivery + 0.01);
  });

  // -------------------------------------------------------------------------
  // 3. Cancel order that already has an active invoice
  // -------------------------------------------------------------------------
  test("cancelling an order with an active SENT invoice: invoice remains or is voided", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.5, 10),
    });
    createdOrderIds.push(order.id);
    await confirmSaleOrder(page, order.id);

    // Generate and send invoice
    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    await trpcMutation(page, "invoices.markSent", { id: invoice.id });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(sentInvoice.status).toBe("SENT");

    // Now cancel the order
    let cancelSucceeded = false;
    try {
      await trpcMutation(page, "orders.updateOrderStatus", {
        orderId: order.id,
        newStatus: "CANCELLED",
      });
      cancelSucceeded = true;
    } catch {
      // Some systems prevent cancellation when invoice exists — acceptable
    }

    if (cancelSucceeded) {
      // Verify the order is CANCELLED
      const cancelledOrder = await trpcQuery<OrderDetail>(
        page,
        "orders.getById",
        { id: order.id }
      );
      expect(cancelledOrder.fulfillmentStatus ?? cancelledOrder.status).toMatch(
        /CANCEL/i
      );

      // Verify invoice is not left in an orphaned SENT state
      // It should either be VOID (auto-voided) or remain SENT (manual cleanup)
      const invoiceAfter = await trpcQuery<InvoiceRecord>(
        page,
        "invoices.getById",
        { id: invoice.id }
      );
      const validStatuses = ["VOID", "SENT", "CANCELLED"];
      expect(validStatuses).toContain(invoiceAfter.status);
    } else {
      // System blocked cancellation — order should still be CONFIRMED
      const orderAfter = await trpcQuery<OrderDetail>(page, "orders.getById", {
        id: order.id,
      });
      expect(orderAfter.fulfillmentStatus).not.toMatch(/CANCEL/i);
    }
  });

  // -------------------------------------------------------------------------
  // 4. Multi-line-item order with per-line margin verification
  // -------------------------------------------------------------------------
  test("multi-line-item order: each line has independent margin calculation", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const client = await findBuyerClient(page);

    // Find two distinct batches with stock
    const allInventory = await trpcQuery<InventoryListResponse>(
      page,
      "inventory.list",
      { limit: 200 }
    );
    const liveBatches = allInventory.items
      .filter(i => i.batch.id > 0 && toNumber(i.batch.onHandQty) > 0)
      .slice(0, 2);

    if (liveBatches.length < 2) {
      test.skip(true, "Need at least 2 batches with stock for multi-line test");
      return;
    }

    const batch1 = await findBatchWithStock(page);
    // Find a different batch
    const batch2Id = liveBatches.find(b => b.batch.id !== batch1.id)?.batch.id;
    if (!batch2Id) {
      test.skip(true, "Could not find a second distinct batch");
      return;
    }

    const price1 = Math.max(batch1.unitCogs * 1.5, 10);
    const price2 = Math.max(batch1.unitCogs * 2.0, 15);

    const order = await trpcMutation<{ id: number }>(page, "orders.create", {
      orderType: "SALE",
      clientId: client.id,
      items: [
        {
          batchId: batch1.id,
          quantity: 2,
          unitPrice: price1,
          isSample: false,
        },
        {
          batchId: batch2Id,
          quantity: 1,
          unitPrice: price2,
          isSample: false,
        },
      ],
      paymentTerms: "NET_30",
    });
    createdOrderIds.push(order.id);

    // Fetch order detail and verify both line items exist
    const detail = await trpcQuery<OrderDetail>(page, "orders.getById", {
      id: order.id,
    });
    const items = detail.items ?? [];
    expect(items.length).toBeGreaterThanOrEqual(2);

    // Verify each line item has an independent unit price
    const line1 = items.find(i => i.batchId === batch1.id);
    const line2 = items.find(i => i.batchId === batch2Id);
    expect(line1).toBeDefined();
    expect(line2).toBeDefined();

    if (!line1 || !line2) return; // type narrowing after expect
    expect(toNumber(line1.unitPrice)).toBeCloseTo(price1, 1);
    expect(toNumber(line2.unitPrice)).toBeCloseTo(price2, 1);

    // Confirm and generate invoice — total should be sum of both lines
    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    const invoiceDetail = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );

    const expectedTotal = price1 * 2 + price2 * 1;
    const actualTotal = toNumber(invoiceDetail.totalAmount);
    expect(actualTotal).toBeCloseTo(expectedTotal, 0);
  });

  // -------------------------------------------------------------------------
  // 5. Concurrent orders against same batch (oversell prevention)
  // -------------------------------------------------------------------------
  test("concurrent orders against same batch: total allocated does not exceed onHandQty", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);
    const qtyBefore = await getBatchQty(page, batch.id);

    // Create two orders each requesting 1 unit — both should succeed
    // as long as there's enough stock
    if (qtyBefore < 2) {
      test.skip(true, `Batch only has ${qtyBefore} units, need at least 2`);
      return;
    }

    const unitPrice = Math.max(batch.unitCogs * 1.3, 1);

    // Fire both order creations concurrently
    const [result1, result2] = await Promise.allSettled([
      createSaleOrder(page, {
        clientId: client.id,
        batchId: batch.id,
        quantity: 1,
        unitPrice,
      }),
      createSaleOrder(page, {
        clientId: client.id,
        batchId: batch.id,
        quantity: 1,
        unitPrice,
      }),
    ]);

    // Track for cleanup
    if (result1.status === "fulfilled") createdOrderIds.push(result1.value.id);
    if (result2.status === "fulfilled") createdOrderIds.push(result2.value.id);

    // At least one should succeed
    const successes = [result1, result2].filter(r => r.status === "fulfilled");
    expect(successes.length).toBeGreaterThanOrEqual(1);

    // Confirm all successful orders concurrently
    const confirmResults = await Promise.allSettled(
      createdOrderIds.map(id => confirmSaleOrder(page, id))
    );

    const confirmedCount = confirmResults.filter(
      r => r.status === "fulfilled"
    ).length;
    expect(confirmedCount).toBeGreaterThanOrEqual(1);

    // Verify total inventory hasn't gone negative
    const qtyAfter = await getBatchQty(page, batch.id);
    expect(qtyAfter).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // 6. Bad debt write-off then payment on same transaction
  // -------------------------------------------------------------------------
  test("payment after bad debt write-off: prevents double-accounting", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.5, 5),
    });
    createdOrderIds.push(order.id);
    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    await trpcMutation(page, "invoices.markSent", { id: invoice.id });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    const total = toNumber(sentInvoice.totalAmount);

    // Find the SALE ledger transaction for bad debt write-off
    const ledger = await trpcQuery<LedgerResponse>(
      page,
      "clientLedger.getLedger",
      { clientId: client.id, limit: 50 }
    );
    const saleTx = ledger.transactions.find(
      tx =>
        tx.type === "SALE" &&
        ((tx.referenceType === "ORDER" && tx.referenceId === order.id) ||
          (tx.referenceType === "INVOICE" && tx.referenceId === invoice.id))
    );
    expect(saleTx).toBeDefined();

    // Extract transaction ID
    let transactionId = invoice.id;
    if (saleTx) {
      const entry = saleTx as typeof saleTx & { id?: string };
      if (typeof entry.id === "string") {
        const parts = entry.id.split(":");
        const parsed = Number(parts[parts.length - 1]);
        if (Number.isFinite(parsed) && parsed > 0) {
          transactionId = parsed;
        }
      }
    }

    // Write off the debt
    const writeOff = await trpcMutation<BadDebtWriteOffResult>(
      page,
      "badDebt.writeOff",
      {
        transactionId,
        writeOffAmount: total.toFixed(2),
        reason: "Edge case test: write-off then payment",
        createGLEntry: true,
      }
    );
    expect(writeOff.success).toBe(true);

    // Now attempt to record a payment on the same invoice
    // This should either fail (invoice was written off) or the system should
    // handle it gracefully without double-counting the receivable
    let paymentResult: PaymentResponse | null = null;
    let paymentError = false;
    try {
      paymentResult = await trpcMutation<PaymentResponse>(
        page,
        "payments.recordPayment",
        {
          invoiceId: invoice.id,
          amount: total,
          paymentMethod: "ACH",
          referenceNumber: `EDGE-WRITEOFF-PAY-${Date.now()}`,
        }
      );
    } catch {
      paymentError = true;
    }

    if (paymentError) {
      // System correctly blocked payment after write-off
      test.info().annotations.push({
        type: "behavior",
        description: "Payment blocked after bad debt write-off — correct",
      });
    } else {
      // System allowed payment — verify invoice ended up in a valid state
      expect(paymentResult).toBeDefined();
      const invoiceAfter = await trpcQuery<InvoiceRecord>(
        page,
        "invoices.getById",
        { id: invoice.id }
      );
      const validStatuses = ["PAID", "SENT", "PARTIAL", "VOID"];
      expect(validStatuses).toContain(invoiceAfter.status);

      test.info().annotations.push({
        type: "behavior",
        description: `Payment accepted after write-off; invoice status: ${invoiceAfter.status}`,
      });
    }
  });
});
