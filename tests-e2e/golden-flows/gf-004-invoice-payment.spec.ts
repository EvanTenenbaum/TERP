/**
 * Golden Flow Test: GF-004 Invoice & Payment
 *
 * Flow: Invoice generation → send → receive payment
 */

import { expect, test } from "@playwright/test";
import { loginAsAccountant } from "../fixtures/auth";
import { requireElement, requireOneOf } from "../utils/preconditions";

test.describe("Golden Flow: GF-004 Invoice & Payment @dev-only @golden-flow", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsAccountant(page);
  });

  test("should access invoice list and payment actions", async ({
    page,
  }): Promise<void> => {
    await page.goto("/accounting/invoices");
    await page.waitForLoadState("networkidle");

    const invoiceHeader = page.locator(
      'h1:has-text("Invoice"), h1:has-text("Invoices")'
    );
    await expect(invoiceHeader).toBeVisible({ timeout: 5000 });

    await requireElement(page, '[role="row"], tr', "No invoices available");

    const invoiceRow = page.locator('[role="row"], tr').first();
    await invoiceRow.click();
    await page.waitForLoadState("networkidle");

    await requireOneOf(
      page,
      [
        'button:has-text("Send"), button:has-text("Email")',
        'button:has-text("Record Payment"), button:has-text("Payment")',
      ],
      "No invoice actions available for selected invoice"
    );
  });
});
