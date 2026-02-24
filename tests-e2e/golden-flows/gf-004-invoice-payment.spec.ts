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
  invoiceNumber?: string | null;
  status?: string | null;
  totalAmount?: string | number | null;
  amountPaid?: string | number | null;
  amountDue?: string | number | null;
};

type InvoicePaymentHistory = Array<{
  paymentNumber?: string | null;
  allocatedAmount?: string | number | null;
}>;

test.describe("Golden Flow: GF-004 Invoice & Payment", () => {
  test.describe.configure({ tag: "@tier1" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("marks invoice sent, records partial payment, then completes invoice payment", async ({
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
      {
        id: invoice.id,
      }
    );
    expect(sentInvoice.status).toBe("SENT");

    const totalAmount = toNumber(sentInvoice.totalAmount);
    expect(totalAmount).toBeGreaterThan(0);

    const partialAmount = Number((totalAmount / 2).toFixed(2));
    await trpcMutation(page, "payments.recordPayment", {
      invoiceId: invoice.id,
      amount: partialAmount,
      paymentMethod: "CASH",
      referenceNumber: `GF-004-P1-${Date.now()}`,
    });

    const partiallyPaid = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      {
        id: invoice.id,
      }
    );
    expect(partiallyPaid.status).toBe("PARTIAL");
    expect(toNumber(partiallyPaid.amountPaid)).toBeGreaterThan(0);
    const remainingDue = toNumber(partiallyPaid.amountDue);
    expect(remainingDue).toBeGreaterThan(0);

    await trpcMutation(page, "payments.recordPayment", {
      invoiceId: invoice.id,
      amount: remainingDue,
      paymentMethod: "ACH",
      referenceNumber: `GF-004-P2-${Date.now()}`,
    });

    const paidInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      {
        id: invoice.id,
      }
    );
    expect(paidInvoice.status).toBe("PAID");
    expect(toNumber(paidInvoice.amountDue)).toBeLessThanOrEqual(0.01);

    const history = await trpcQuery<InvoicePaymentHistory>(
      page,
      "payments.getInvoicePaymentHistory",
      { invoiceId: invoice.id }
    );
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(
      history.every(entry => typeof entry.paymentNumber === "string")
    ).toBe(true);

    await page.goto("/accounting/invoices", { waitUntil: "networkidle" });
    const invoiceSurface = page
      .locator('[data-testid="invoices-table"]')
      .or(page.getByRole("heading", { name: /invoice/i }).first());
    await expect(invoiceSurface.first()).toBeVisible({ timeout: 15000 });
  });
});
