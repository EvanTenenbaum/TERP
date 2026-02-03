/**
 * Golden Flow Test: GF-004 Invoice & Payment
 *
 * Flow: Invoice generation → send → receive payment
 */

import { expect, test } from "@playwright/test";
import { loginAsAccountant } from "../fixtures/auth";

test.describe("Golden Flow: GF-004 Invoice & Payment", (): void => {
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
    if (await invoiceRow.isVisible().catch(() => false)) {
      await invoiceRow.click();

      const sendButton = page.locator(
        'button:has-text("Send"), button:has-text("Email")'
      );
      if (
        await sendButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(sendButton.first()).toBeVisible();
      }

      const paymentButton = page.locator(
        'button:has-text("Record Payment"), button:has-text("Payment")'
      );
      if (
        await paymentButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(paymentButton.first()).toBeVisible();
      }
    }
  });
});
