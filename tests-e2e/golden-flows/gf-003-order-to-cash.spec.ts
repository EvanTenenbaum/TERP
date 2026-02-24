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

type InvoiceRecord = {
  id: number;
  referenceId?: number | null;
  status?: string | null;
  totalAmount?: string | number | null;
  amountDue?: string | number | null;
};

type PaymentMutationResponse = {
  success: boolean;
  invoiceStatus?: string;
  paymentId?: number;
};

type LedgerResponse = {
  transactions: Array<{
    type: string;
    referenceType: string;
    referenceId: number;
  }>;
};

test.describe("GF-003: Order-to-Cash Flow", () => {
  test.describe.configure({ tag: "@tier1" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("creates order, generates invoice, records payment, and posts ledger evidence", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const created = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.4, 1),
    });
    createdOrderId = created.id;

    const confirmed = await confirmSaleOrder(page, created.id);
    expect(confirmed.success).toBe(true);
    expect(confirmed.orderId).toBe(created.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      {
        orderId: created.id,
      }
    );
    expect(invoice.id).toBeGreaterThan(0);
    expect(invoice.referenceId).toBe(created.id);

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      {
        id: invoice.id,
      }
    );
    expect(sentInvoice.status).toBe("SENT");

    const paymentAmount = toNumber(sentInvoice.totalAmount);
    expect(paymentAmount).toBeGreaterThan(0);

    const payment = await trpcMutation<PaymentMutationResponse>(
      page,
      "payments.recordPayment",
      {
        invoiceId: invoice.id,
        amount: paymentAmount,
        paymentMethod: "ACH",
        referenceNumber: `GF-003-${Date.now()}`,
      }
    );
    expect(payment.success).toBe(true);
    expect(payment.invoiceStatus).toBe("PAID");
    expect(typeof payment.paymentId).toBe("number");

    const paidInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      {
        id: invoice.id,
      }
    );
    expect(paidInvoice.status).toBe("PAID");
    expect(toNumber(paidInvoice.amountDue)).toBeLessThanOrEqual(0.01);

    const ledger = await trpcQuery<LedgerResponse>(
      page,
      "clientLedger.getLedger",
      {
        clientId: client.id,
        limit: 150,
        transactionTypes: ["SALE", "PAYMENT_RECEIVED"],
      }
    );
    const hasSaleTrace = ledger.transactions.some(
      transaction =>
        transaction.type === "SALE" &&
        ((transaction.referenceType === "ORDER" &&
          transaction.referenceId === created.id) ||
          (transaction.referenceType === "INVOICE" &&
            transaction.referenceId === invoice.id))
    );
    expect(hasSaleTrace).toBe(true);
    expect(
      ledger.transactions.some(
        transaction =>
          transaction.referenceType === "PAYMENT" &&
          transaction.type === "PAYMENT_RECEIVED"
      )
    ).toBe(true);

    await page.goto("/accounting/invoices", { waitUntil: "networkidle" });
    const invoiceSurface = page
      .locator('[data-testid="invoices-table"]')
      .or(page.getByRole("heading", { name: /invoice/i }).first());
    await expect(invoiceSurface.first()).toBeVisible({ timeout: 15000 });
  });
});
