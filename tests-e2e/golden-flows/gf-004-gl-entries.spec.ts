import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { trpcMutation, trpcQuery } from "../utils/golden-flow-helpers";
import {
  cleanupOrder,
  confirmSaleOrder,
  createPaidInvoice,
  createSaleOrder,
  findBatchWithStock,
  findBuyerClient,
} from "../utils/e2e-business-helpers";

type InvoiceRecord = {
  id: number;
};

type LedgerListResponse = {
  items: Array<{
    id: number;
    referenceType?: string | null;
    referenceId?: number | null;
    debit?: string | number | null;
    credit?: string | number | null;
  }>;
};

test.describe("GF-004: GL Entry Verification", () => {
  test.describe.configure({ tag: "@tier1" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("invoice creation generates GL entries", async ({ page }) => {
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

    await expect
      .poll(
        async () => {
          const ledger = await trpcQuery<LedgerListResponse>(
            page,
            "accounting.ledger.list",
            {
              referenceType: "INVOICE",
              referenceId: invoice.id,
              limit: 20,
            }
          );
          return ledger.items.length;
        },
        {
          timeout: 15000,
          message: `expected GL entries for invoice ${invoice.id}`,
        }
      )
      .toBeGreaterThan(0);

    await page.goto("/accounting/invoices", { waitUntil: "networkidle" });
    await expect(
      page.locator('[data-powersheet-surface-id="invoices-unified"]').first()
    ).toBeVisible({ timeout: 15000 });

    await page.goto("/accounting/general-ledger", { waitUntil: "networkidle" });
    await expect(
      page.locator('[data-powersheet-surface-id="general-ledger"]').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("payment recording generates GL entries", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const paidInvoice = await createPaidInvoice(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.6, 1),
    });
    createdOrderId = paidInvoice.orderId;

    expect(paidInvoice.paymentId).toBeGreaterThan(0);

    await expect
      .poll(
        async () => {
          const ledger = await trpcQuery<LedgerListResponse>(
            page,
            "accounting.ledger.list",
            {
              referenceType: "PAYMENT",
              referenceId: paidInvoice.paymentId,
              limit: 20,
            }
          );
          return ledger.items.length;
        },
        {
          timeout: 15000,
          message: `expected GL entries for payment ${paidInvoice.paymentId}`,
        }
      )
      .toBeGreaterThan(0);

    await page.goto("/accounting", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: /accounting dashboard/i }).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: /receive payment/i }).first()
    ).toBeVisible({ timeout: 15000 });

    await page.goto("/accounting/general-ledger", { waitUntil: "networkidle" });
    await expect(
      page.locator('[data-powersheet-surface-id="general-ledger"]').first()
    ).toBeVisible({ timeout: 15000 });
  });
});
