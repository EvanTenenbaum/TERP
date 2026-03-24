/**
 * Financial Integrity E2E Tests
 *
 * Comprehensive end-to-end tests verifying financial correctness across the
 * full order-to-cash lifecycle, including invoice integrity, partial payments,
 * inventory adjustments, credit issuance, and bad debt write-offs.
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
// Shared types
// ---------------------------------------------------------------------------

type InvoiceRecord = {
  id: number;
  invoiceNumber?: string | null;
  referenceId?: number | null;
  status?: string | null;
  totalAmount?: string | number | null;
  amountPaid?: string | number | null;
  amountDue?: string | number | null;
};

type PaymentMutationResponse = {
  success: boolean;
  invoiceStatus?: string;
  paymentId?: number;
};

type LedgerTransaction = {
  type: string;
  referenceType?: string;
  referenceId?: number;
};

type LedgerResponse = {
  transactions: LedgerTransaction[];
  summary?: {
    totalDebits: number;
    totalCredits: number;
    netChange: number;
  };
};

type InvoicePaymentEntry = {
  paymentNumber?: string | null;
  allocatedAmount?: string | number | null;
};

type BatchRecord = {
  id?: number;
  onHandQty?: string | number | null;
};

type InventoryListResponse = {
  items?: Array<{ batch?: BatchRecord }>;
};

type CreditRecord = {
  id: number;
  creditNumber?: string | null;
  creditStatus?: string | null;
  creditAmount?: string | number | null;
  amountRemaining?: string | number | null;
};

type BadDebtWriteOffResult = {
  success: boolean;
  writeOffId?: number;
  transactionId?: number;
  amount?: string;
  glEntryCreated?: boolean;
};

type BadDebtClientResult = Array<{
  id: number;
  amount?: string | number | null;
  reason?: string | null;
}>;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe("Financial Integrity", () => {
  test.describe.configure({ tag: "@deep" });

  const createdOrderIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    for (const orderId of createdOrderIds) {
      try {
        await cleanupOrder(page, orderId);
      } catch {
        // Best-effort cleanup — do not fail the test on cleanup errors.
      }
    }
    createdOrderIds.length = 0;
  });

  // -------------------------------------------------------------------------
  // 1. Full Order-to-Cash with GL Verification
  // -------------------------------------------------------------------------

  test("full order-to-cash: GL ledger shows SALE and PAYMENT_RECEIVED after payment", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const unitPrice = Math.max(toNumber(batch.unitCogs) * 1.4, 1);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 2,
      unitPrice,
    });
    createdOrderIds.push(order.id);

    const confirmed = await confirmSaleOrder(page, order.id);
    expect(confirmed.success).toBe(true);
    expect(confirmed.orderId).toBe(order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    expect(invoice.id).toBeGreaterThan(0);
    expect(invoice.referenceId).toBe(order.id);

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(sentInvoice.status).toBe("SENT");

    const totalAmount = toNumber(sentInvoice.totalAmount);
    expect(totalAmount).toBeGreaterThan(0);

    const payment = await trpcMutation<PaymentMutationResponse>(
      page,
      "payments.recordPayment",
      {
        invoiceId: invoice.id,
        amount: totalAmount,
        paymentMethod: "ACH",
        referenceNumber: `FI-001-${Date.now()}`,
      }
    );
    expect(payment.success).toBe(true);
    expect(payment.invoiceStatus).toBe("PAID");
    expect(typeof payment.paymentId).toBe("number");

    const paidInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(paidInvoice.status).toBe("PAID");
    expect(toNumber(paidInvoice.amountDue)).toBeLessThanOrEqual(0.01);

    const ledger = await trpcQuery<LedgerResponse>(
      page,
      "clientLedger.getLedger",
      { clientId: client.id, limit: 50 }
    );

    const hasSaleTx = ledger.transactions.some(
      tx =>
        tx.type === "SALE" &&
        ((tx.referenceType === "ORDER" && tx.referenceId === order.id) ||
          (tx.referenceType === "INVOICE" && tx.referenceId === invoice.id))
    );
    expect(hasSaleTx).toBe(true);

    const hasPaymentTx = ledger.transactions.some(
      tx => tx.type === "PAYMENT_RECEIVED"
    );
    expect(hasPaymentTx).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. Partial Payment Tracking
  // -------------------------------------------------------------------------

  test("partial payments: three instalments accumulate correctly and reach PAID", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const unitPrice = Math.max(toNumber(batch.unitCogs) * 1.5, 10);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 4,
      unitPrice,
    });
    createdOrderIds.push(order.id);

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    expect(invoice.id).toBeGreaterThan(0);

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(sentInvoice.status).toBe("SENT");

    const totalAmount = toNumber(sentInvoice.totalAmount);
    expect(totalAmount).toBeGreaterThan(0);

    // --- Payment 1: 25% ---
    const payment1 = Number((totalAmount * 0.25).toFixed(2));
    await trpcMutation<PaymentMutationResponse>(
      page,
      "payments.recordPayment",
      {
        invoiceId: invoice.id,
        amount: payment1,
        paymentMethod: "CASH",
        referenceNumber: `FI-002-P1-${Date.now()}`,
      }
    );

    const afterP1 = await trpcQuery<InvoiceRecord>(page, "invoices.getById", {
      id: invoice.id,
    });
    expect(afterP1.status).toBe("PARTIAL");
    // amountPaid should be approximately 25% of total
    expect(toNumber(afterP1.amountPaid)).toBeCloseTo(payment1, 1);

    // --- Payment 2: another 25% ---
    const payment2 = Number((totalAmount * 0.25).toFixed(2));
    await trpcMutation<PaymentMutationResponse>(
      page,
      "payments.recordPayment",
      {
        invoiceId: invoice.id,
        amount: payment2,
        paymentMethod: "CASH",
        referenceNumber: `FI-002-P2-${Date.now()}`,
      }
    );

    const afterP2 = await trpcQuery<InvoiceRecord>(page, "invoices.getById", {
      id: invoice.id,
    });
    expect(afterP2.status).toBe("PARTIAL");
    // amountPaid should now be approximately 50% of total
    const expectedAfterP2 = Number((payment1 + payment2).toFixed(2));
    expect(toNumber(afterP2.amountPaid)).toBeCloseTo(expectedAfterP2, 1);

    // --- Payment 3: remaining balance ---
    const remainingDue = toNumber(afterP2.amountDue);
    expect(remainingDue).toBeGreaterThan(0);

    await trpcMutation<PaymentMutationResponse>(
      page,
      "payments.recordPayment",
      {
        invoiceId: invoice.id,
        amount: remainingDue,
        paymentMethod: "ACH",
        referenceNumber: `FI-002-P3-${Date.now()}`,
      }
    );

    const fullyPaid = await trpcQuery<InvoiceRecord>(page, "invoices.getById", {
      id: invoice.id,
    });
    expect(fullyPaid.status).toBe("PAID");
    expect(toNumber(fullyPaid.amountDue)).toBeLessThanOrEqual(0.01);

    // Verify payment history contains all 3 entries
    const history = await trpcQuery<InvoicePaymentEntry[]>(
      page,
      "payments.getInvoicePaymentHistory",
      { invoiceId: invoice.id }
    );
    expect(history.length).toBeGreaterThanOrEqual(3);
  });

  // -------------------------------------------------------------------------
  // 3. Invoice Amount Integrity
  // -------------------------------------------------------------------------

  test("invoice amount integrity: totalAmount matches quantity * unitPrice", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const quantity = 3;
    const unitPrice = Math.max(toNumber(batch.unitCogs) * 1.6, 5);
    const expectedTotal = Number((quantity * unitPrice).toFixed(2));

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity,
      unitPrice,
    });
    createdOrderIds.push(order.id);

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    expect(invoice.id).toBeGreaterThan(0);

    const fetchedInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );

    const actualTotal = toNumber(fetchedInvoice.totalAmount);
    expect(actualTotal).toBeGreaterThan(0);
    // totalAmount should match quantity * unitPrice within $0.01
    expect(Math.abs(actualTotal - expectedTotal)).toBeLessThanOrEqual(0.01);

    // Initially amountDue should equal totalAmount
    const actualDue = toNumber(fetchedInvoice.amountDue);
    expect(actualDue).toBeCloseTo(actualTotal, 1);
  });

  // -------------------------------------------------------------------------
  // 4. Inventory Adjustment Audit Trail
  // -------------------------------------------------------------------------

  test("inventory adjustment: onHandQty changes by adjustment delta and reverts correctly", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const batch = await findBatchWithStock(page);

    // Get initial onHandQty from inventory.list
    const initialList = await trpcQuery<InventoryListResponse>(
      page,
      "inventory.list",
      { limit: 200 }
    );
    const initialItems = Array.isArray(initialList.items)
      ? initialList.items
      : [];
    const initialItem = initialItems.find(item => item.batch?.id === batch.id);
    const initialQty = toNumber(
      initialItem?.batch?.onHandQty ?? batch.onHandQty
    );
    expect(initialQty).toBeGreaterThan(0);

    // Adjust +5 using inventoryMovements.adjust (newQuantity = current + 5)
    const newQtyAfterIncrease = String(Number((initialQty + 5).toFixed(4)));
    await trpcMutation<{ success?: boolean }>(
      page,
      "inventoryMovements.adjust",
      {
        batchId: batch.id,
        newQuantity: newQtyAfterIncrease,
        reason: "E2E COUNT_DISCREPANCY +5",
        adjustmentReason: "COUNT_DISCREPANCY",
      }
    );

    // Verify onHandQty increased by 5
    const afterIncreaseList = await trpcQuery<InventoryListResponse>(
      page,
      "inventory.list",
      { limit: 200 }
    );
    const afterIncreaseItems = Array.isArray(afterIncreaseList.items)
      ? afterIncreaseList.items
      : [];
    const afterIncreaseItem = afterIncreaseItems.find(
      item => item.batch?.id === batch.id
    );
    const qtyAfterIncrease = toNumber(afterIncreaseItem?.batch?.onHandQty);
    expect(qtyAfterIncrease).toBeCloseTo(initialQty + 5, 1);

    // Adjust -5 to restore (newQuantity = original)
    const newQtyAfterDecrease = String(Number(initialQty.toFixed(4)));
    await trpcMutation<{ success?: boolean }>(
      page,
      "inventoryMovements.adjust",
      {
        batchId: batch.id,
        newQuantity: newQtyAfterDecrease,
        reason: "E2E COUNT_DISCREPANCY -5 revert",
        adjustmentReason: "COUNT_DISCREPANCY",
      }
    );

    // Verify onHandQty returned to original value
    const afterRevertList = await trpcQuery<InventoryListResponse>(
      page,
      "inventory.list",
      { limit: 200 }
    );
    const afterRevertItems = Array.isArray(afterRevertList.items)
      ? afterRevertList.items
      : [];
    const afterRevertItem = afterRevertItems.find(
      item => item.batch?.id === batch.id
    );
    const qtyAfterRevert = toNumber(afterRevertItem?.batch?.onHandQty);
    expect(qtyAfterRevert).toBeCloseTo(initialQty, 1);
  });

  // -------------------------------------------------------------------------
  // 5. Credit Issuance and Application
  // -------------------------------------------------------------------------

  test("credit issuance: credit appears in client credits list with correct amount and ACTIVE status", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    // Create a completed order/invoice/payment baseline
    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(toNumber(batch.unitCogs) * 1.4, 1),
    });
    createdOrderIds.push(order.id);

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    expect(invoice.id).toBeGreaterThan(0);

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    const totalAmount = toNumber(sentInvoice.totalAmount);

    await trpcMutation<PaymentMutationResponse>(
      page,
      "payments.recordPayment",
      {
        invoiceId: invoice.id,
        amount: totalAmount,
        paymentMethod: "ACH",
        referenceNumber: `FI-005-${Date.now()}`,
      }
    );

    const paidInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(paidInvoice.status).toBe("PAID");

    // Issue a $50 goodwill credit using credits.create (legacy compatible endpoint)
    const creditAmount = "50.00";
    const credit = await trpcMutation<CreditRecord>(page, "credits.create", {
      clientId: client.id,
      creditAmount,
      creditReason: "GOODWILL",
      notes: "E2E test credit - financial integrity suite",
    });
    expect(credit.id).toBeGreaterThan(0);
    expect(credit.creditStatus).toBe("ACTIVE");

    // Query credits for this client and verify the credit appears
    const clientCredits = await trpcQuery<CreditRecord[]>(
      page,
      "credits.getByClient",
      { clientId: client.id }
    );
    const isArray = Array.isArray(clientCredits);
    expect(isArray).toBe(true);

    const found = isArray
      ? clientCredits.find(c => c.id === credit.id)
      : undefined;
    expect(found).toBeDefined();
    if (found) {
      expect(toNumber(found.creditAmount)).toBeCloseTo(50, 1);
      expect(found.creditStatus).toBe("ACTIVE");
    }
  });

  // -------------------------------------------------------------------------
  // 6. Bad Debt Write-Off
  // -------------------------------------------------------------------------

  test("bad debt write-off: write-off persists in client bad debt records", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const unitPrice = Math.max(toNumber(batch.unitCogs) * 1.4, 5);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice,
    });
    createdOrderIds.push(order.id);

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    expect(invoice.id).toBeGreaterThan(0);

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(sentInvoice.status).toBe("SENT");

    const writeOffAmount = toNumber(sentInvoice.totalAmount);
    expect(writeOffAmount).toBeGreaterThan(0);

    // Query client ledger to find the SALE transaction ID for this order.
    // badDebt.writeOff operates on a ledger transactionId, not an invoiceId.
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

    // Extract numeric transactionId from the ledger entry id (format: "source_type:id")
    // Fall back to the invoice id if no matching SALE transaction can be parsed.
    let transactionId = invoice.id;
    if (saleTx) {
      const ledgerEntry = saleTx as LedgerTransaction & { id?: string };
      if (typeof ledgerEntry.id === "string") {
        const parts = ledgerEntry.id.split(":");
        const parsed = Number(parts[parts.length - 1]);
        if (Number.isFinite(parsed) && parsed > 0) {
          transactionId = parsed;
        }
      }
    }

    const writeOff = await trpcMutation<BadDebtWriteOffResult>(
      page,
      "badDebt.writeOff",
      {
        transactionId,
        writeOffAmount: writeOffAmount.toFixed(2),
        reason: "Uncollectable - E2E test financial integrity suite",
        createGLEntry: true,
      }
    );
    expect(writeOff.success).toBe(true);
    expect(writeOff.writeOffId).toBeGreaterThan(0);

    // Verify write-off is retrievable via badDebt.getByClient
    const clientWriteOffs = await trpcQuery<BadDebtClientResult>(
      page,
      "badDebt.getByClient",
      { clientId: client.id }
    );
    expect(Array.isArray(clientWriteOffs)).toBe(true);

    const foundWriteOff = (clientWriteOffs as BadDebtClientResult).find(
      entry => entry.id === writeOff.writeOffId
    );
    expect(foundWriteOff).toBeDefined();
  });
});
