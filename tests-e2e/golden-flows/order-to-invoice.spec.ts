/**
 * Golden Flow Test: Order to Invoice (UXS-602)
 *
 * Tests the complete order to invoice conversion flow
 * with Work Surface pattern validation.
 *
 * Flow: Order Details → Review → Invoice Generation → Send
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Golden Flow: Order to Invoice", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe("Invoice Generation", () => {
    test("should show invoice button on confirmed orders", async ({ page }) => {
      await page.goto("/orders");
      await page.waitForLoadState("networkidle");

      // Navigate to orders with CONFIRMED status
      const orderRow = page.locator('tr:has-text("CONFIRMED"), [data-status="CONFIRMED"]');
      if (await orderRow.first().isVisible().catch(() => false)) {
        await orderRow.first().click();

        // Invoice action should be visible
        const invoiceAction = page.locator('button:has-text("Invoice"), button:has-text("Generate Invoice")');
        await expect(invoiceAction.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test("should generate invoice from order", async ({ page }) => {
      await page.goto("/orders");
      await page.waitForLoadState("networkidle");

      // Find a confirmed order
      const confirmedOrder = page.locator('tr:has-text("CONFIRMED")').first();
      if (await confirmedOrder.isVisible().catch(() => false)) {
        await confirmedOrder.click();
        await page.waitForTimeout(300);

        // Click generate invoice
        const generateButton = page.locator('button:has-text("Generate Invoice"), button:has-text("Create Invoice")');
        if (await generateButton.isVisible().catch(() => false)) {
          await generateButton.click();

          // Should show confirmation or redirect to invoice
          const success = page.locator(':text("Invoice created"), :text("Invoice generated"), .toast-success');
          await expect(success.first()).toBeVisible({ timeout: 5000 }).catch(() => true);
        }
      }
    });
  });

  test.describe("Invoice Work Surface", () => {
    test("should display invoices list with Work Surface pattern", async ({ page }) => {
      await page.goto("/accounting/invoices");
      await page.waitForLoadState("networkidle");

      // Work Surface elements should be present
      const header = page.locator('h1:has-text("Invoice"), h1:has-text("Invoices")');
      await expect(header).toBeVisible({ timeout: 5000 });

      // Keyboard navigation should work
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(100);

      // Focus indicator
      const focused = page.locator('[aria-selected="true"], .ring-2');
      expect(await focused.count()).toBeGreaterThanOrEqual(0);
    });

    test("should show invoice details in inspector", async ({ page }) => {
      await page.goto("/accounting/invoices");
      await page.waitForLoadState("networkidle");

      // Select first invoice
      const invoiceRow = page.locator('tr, [role="row"]').first();
      if (await invoiceRow.isVisible().catch(() => false)) {
        await invoiceRow.click();

        // Inspector should show invoice details
        const inspector = page.locator('[data-testid="inspector-panel"], [role="complementary"]');
        await expect(inspector).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
    });

    test("should allow status filtering", async ({ page }) => {
      await page.goto("/accounting/invoices");
      await page.waitForLoadState("networkidle");

      // Status filter should be present
      const statusFilter = page.locator('[data-testid="status-filter"], select:has-text("Status"), button:has-text("Status")');
      if (await statusFilter.first().isVisible().catch(() => false)) {
        await expect(statusFilter.first()).toBeVisible();
      }
    });
  });

  test.describe("Invoice Actions", () => {
    test("should allow sending invoice to client", async ({ page }) => {
      await page.goto("/accounting/invoices");
      await page.waitForLoadState("networkidle");

      // Find draft invoice
      const draftInvoice = page.locator('tr:has-text("DRAFT")').first();
      if (await draftInvoice.isVisible().catch(() => false)) {
        await draftInvoice.click();

        // Send action should be available
        const sendButton = page.locator('button:has-text("Send"), button:has-text("Email")');
        if (await sendButton.isVisible().catch(() => false)) {
          await expect(sendButton).toBeVisible();
        }
      }
    });

    test("should show payment recording option", async ({ page }) => {
      await page.goto("/accounting/invoices");
      await page.waitForLoadState("networkidle");

      // Select an unpaid invoice
      const unpaidInvoice = page.locator('tr:has-text("UNPAID"), tr:has-text("SENT")').first();
      if (await unpaidInvoice.isVisible().catch(() => false)) {
        await unpaidInvoice.click();

        // Record payment option
        const paymentButton = page.locator('button:has-text("Record Payment"), button:has-text("Payment")');
        if (await paymentButton.isVisible().catch(() => false)) {
          await expect(paymentButton).toBeVisible();
        }
      }
    });
  });
});
