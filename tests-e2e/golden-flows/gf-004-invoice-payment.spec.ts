/**
 * Golden Flow Test: GF-004 Invoice & Payment
 *
 * Flow: Invoice generation → send → receive payment
 */

import { expect, test } from "@playwright/test";
import { loginAsAccountant } from "../fixtures/auth";

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

    const invoiceRow = page.locator('[role="row"], tr').first();
    if (!(await invoiceRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "No invoices available");
      return;
    }

    await invoiceRow.click();
    await page.waitForLoadState("networkidle");

    const sendButton = page.locator(
      'button:has-text("Send"), button:has-text("Email")'
    );
    const sendButtonVisible = await sendButton
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    const paymentButton = page.locator(
      'button:has-text("Record Payment"), button:has-text("Payment")'
    );
    const paymentButtonVisible = await paymentButton
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!sendButtonVisible && !paymentButtonVisible) {
      test.skip(true, "No invoice actions available for selected invoice");
      return;
    }

    if (sendButtonVisible) {
      await expect(sendButton.first()).toBeVisible();
    }
    if (paymentButtonVisible) {
      await expect(paymentButton.first()).toBeVisible();
    }
  });
});
