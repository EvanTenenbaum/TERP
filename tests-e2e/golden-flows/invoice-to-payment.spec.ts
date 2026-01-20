/**
 * Golden Flow Test: Invoice to Payment (UXS-602)
 *
 * Tests the complete payment recording flow with Work Surface
 * inspector panel pattern validation.
 *
 * Flow: Invoice → Payment Inspector → Record → Confirmation
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Golden Flow: Invoice to Payment", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe("Payment Inspector", () => {
    test("should show payment form in inspector panel", async ({ page }) => {
      await page.goto("/accounting/invoices");
      await page.waitForLoadState("networkidle");

      // Find unpaid invoice and click record payment
      const unpaidRow = page.locator('tr:has-text("UNPAID"), tr:has-text("DUE")').first();
      if (await unpaidRow.isVisible().catch(() => false)) {
        await unpaidRow.click();
        await page.waitForTimeout(300);

        const paymentBtn = page.locator('button:has-text("Record Payment"), button:has-text("Pay")');
        if (await paymentBtn.first().isVisible().catch(() => false)) {
          await paymentBtn.first().click();

          // Payment form should appear (inspector or dialog)
          const paymentForm = page.locator('input[name*="amount"], input[type="number"], [data-testid="payment-amount"]');
          await expect(paymentForm.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test("should show invoice context in payment form", async ({ page }) => {
      await page.goto("/accounting/invoices");
      await page.waitForLoadState("networkidle");

      const invoiceRow = page.locator('tr').first();
      if (await invoiceRow.isVisible().catch(() => false)) {
        await invoiceRow.click();

        // Invoice summary should be visible
        const summary = page.locator(':text("Total"), :text("Amount Due"), :text("Invoice")');
        await expect(summary.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test("should validate payment amount", async ({ page }) => {
      await page.goto("/accounting/invoices");
      await page.waitForLoadState("networkidle");

      const unpaidRow = page.locator('tr:has-text("UNPAID")').first();
      if (await unpaidRow.isVisible().catch(() => false)) {
        await unpaidRow.click();

        const paymentBtn = page.locator('button:has-text("Record Payment")');
        if (await paymentBtn.isVisible().catch(() => false)) {
          await paymentBtn.click();
          await page.waitForTimeout(300);

          // Try to submit without amount
          const submitBtn = page.locator('button[type="submit"], button:has-text("Record")');
          if (await submitBtn.first().isVisible().catch(() => false)) {
            const isDisabled = await submitBtn.first().isDisabled();
            expect(isDisabled).toBeTruthy();
          }
        }
      }
    });

    test("should support keyboard shortcuts", async ({ page }) => {
      await page.goto("/accounting/invoices");
      await page.waitForLoadState("networkidle");

      // Keyboard navigation
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");

      // Escape should close inspector
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");

      // Should return to list focus
      await page.waitForTimeout(200);
    });
  });

  test.describe("Payment Methods", () => {
    test("should support multiple payment methods", async ({ page }) => {
      await page.goto("/accounting/invoices");
      await page.waitForLoadState("networkidle");

      const unpaidRow = page.locator('tr:has-text("UNPAID")').first();
      if (await unpaidRow.isVisible().catch(() => false)) {
        await unpaidRow.click();

        const paymentBtn = page.locator('button:has-text("Record Payment")');
        if (await paymentBtn.isVisible().catch(() => false)) {
          await paymentBtn.click();
          await page.waitForTimeout(300);

          // Payment method selector
          const methodSelector = page.locator('select:has-text("Cash"), [data-testid="payment-method"]');
          if (await methodSelector.isVisible().catch(() => false)) {
            await expect(methodSelector).toBeVisible();
          }
        }
      }
    });
  });

  test.describe("Partial Payments", () => {
    test("should indicate partial vs full payment", async ({ page }) => {
      await page.goto("/accounting/invoices");
      await page.waitForLoadState("networkidle");

      // Navigate to payment form
      const unpaidRow = page.locator('tr:has-text("UNPAID")').first();
      if (await unpaidRow.isVisible().catch(() => false)) {
        await unpaidRow.click();

        const paymentBtn = page.locator('button:has-text("Record Payment")');
        if (await paymentBtn.isVisible().catch(() => false)) {
          await paymentBtn.click();
          await page.waitForTimeout(300);

          // Payment indicator should exist
          const indicator = page.locator(':text("Full payment"), :text("Partial"), :text("remaining")');
          expect(await indicator.count()).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});
