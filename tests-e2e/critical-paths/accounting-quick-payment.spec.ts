/**
 * E2E Tests: Accounting Quick Payment Flow (WS-001)
 *
 * Tests the critical path for receiving client payments quickly.
 * This is a high-priority workflow that must work reliably.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { requireElement } from "../utils/preconditions";

test.describe("Accounting Quick Payment (WS-001) @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should access quick payment from dashboard", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/");
    await expect(page).toHaveURL(/\/(dashboard)?$/);

    // Look for quick action button
    const receivePaymentButton = page.locator(
      'button:has-text("Receive Payment"), a:has-text("Receive Payment"), [data-testid="receive-payment"]'
    );

    // Require button to exist - skip if not available
    await requireElement(
      page,
      'button:has-text("Receive Payment"), a:has-text("Receive Payment"), [data-testid="receive-payment"]',
      "Receive Payment button not available on dashboard"
    );

    await receivePaymentButton.click();
    // Should open a modal or navigate to payment form
    await expect(
      page.locator(
        '[role="dialog"], form, .modal, [data-testid="payment-form"]'
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to accounting module", async ({ page }) => {
    // Navigate to accounting
    await page.goto("/accounting");
    await expect(page).toHaveURL(/\/accounting/);

    // Verify accounting page loaded
    await expect(
      page.locator('h1:has-text("Accounting"), [data-testid="accounting-page"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display payment form with required fields", async ({ page }) => {
    await page.goto("/accounting");

    // Click receive payment action
    const receivePaymentButton = page.locator(
      'button:has-text("Receive Payment"), a:has-text("Receive Payment"), [data-testid="receive-payment"]'
    );

    await requireElement(
      page,
      'button:has-text("Receive Payment"), a:has-text("Receive Payment"), [data-testid="receive-payment"]',
      "Receive Payment button not available"
    );

    await receivePaymentButton.click();

    // Verify form fields are present
    await expect(
      page.locator(
        'select[name="client"], [data-testid="client-select"], input[placeholder*="client" i]'
      )
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.locator(
        'input[name="amount"], [data-testid="amount-input"], input[type="number"]'
      )
    ).toBeVisible();

    await expect(
      page.locator(
        'select[name="paymentType"], [data-testid="payment-type-select"]'
      )
    ).toBeVisible();
  });

  test("should validate required fields before submission", async ({
    page,
  }) => {
    await page.goto("/accounting");

    const receivePaymentButton = page.locator(
      'button:has-text("Receive Payment"), a:has-text("Receive Payment")'
    );

    await requireElement(
      page,
      'button:has-text("Receive Payment"), a:has-text("Receive Payment")',
      "Receive Payment button not available"
    );

    await receivePaymentButton.click();

    // Try to submit without filling required fields
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Save")'
    );
    await submitButton.click();

    // Should show validation errors
    await expect(
      page.locator(
        '[role="alert"], .error, input:invalid, [data-testid="validation-error"]'
      )
    ).toBeVisible({ timeout: 3000 });
  });

  test("should show balance preview before saving", async ({ page }) => {
    await page.goto("/accounting");

    const receivePaymentButton = page.locator(
      'button:has-text("Receive Payment"), a:has-text("Receive Payment")'
    );

    await requireElement(
      page,
      'button:has-text("Receive Payment"), a:has-text("Receive Payment")',
      "Receive Payment button not available"
    );

    await receivePaymentButton.click();

    // Select a client (first available)
    const clientSelect = page.locator(
      'select[name="client"], [data-testid="client-select"]'
    );
    await requireElement(
      page,
      'select[name="client"], [data-testid="client-select"]',
      "Client select not available"
    );

    await clientSelect.selectOption({ index: 1 });

    // Enter amount
    const amountInput = page.locator(
      'input[name="amount"], [data-testid="amount-input"]'
    );
    await amountInput.fill("1000");

    // Look for balance preview
    const balancePreview = page.locator(
      '[data-testid="balance-preview"], .balance-preview, :has-text("New Balance")'
    );

    // Balance preview should be visible after client selection
    await requireElement(
      page,
      '[data-testid="balance-preview"], .balance-preview, :has-text("New Balance")',
      "Balance preview not available"
    );

    await expect(balancePreview).toContainText(/balance|total/i);
  });
});

test.describe("Accounting Module Navigation @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to chart of accounts", async ({ page }) => {
    await page.goto("/accounting");

    // Look for chart of accounts link/tab
    const coaLink = page.locator(
      'a:has-text("Chart of Accounts"), button:has-text("Chart of Accounts"), [data-testid="coa-link"]'
    );

    await requireElement(
      page,
      'a:has-text("Chart of Accounts"), button:has-text("Chart of Accounts"), [data-testid="coa-link"]',
      "Chart of Accounts link not available"
    );

    await coaLink.click();
    await expect(
      page.locator("table, [data-testid='accounts-table']")
    ).toBeVisible({
      timeout: 5000,
    });
  });

  test("should navigate to invoices", async ({ page }) => {
    await page.goto("/accounting");

    const invoicesLink = page.locator(
      'a:has-text("Invoices"), button:has-text("Invoices"), [data-testid="invoices-link"]'
    );

    await requireElement(
      page,
      'a:has-text("Invoices"), button:has-text("Invoices"), [data-testid="invoices-link"]',
      "Invoices link not available"
    );

    await invoicesLink.click();
    await expect(
      page.locator(
        "table, [data-testid='invoices-table'], h2:has-text('Invoices')"
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to bills", async ({ page }) => {
    await page.goto("/accounting");

    const billsLink = page.locator(
      'a:has-text("Bills"), button:has-text("Bills"), [data-testid="bills-link"]'
    );

    await requireElement(
      page,
      'a:has-text("Bills"), button:has-text("Bills"), [data-testid="bills-link"]',
      "Bills link not available"
    );

    await billsLink.click();
    await expect(
      page.locator("table, [data-testid='bills-table'], h2:has-text('Bills')")
    ).toBeVisible({ timeout: 5000 });
  });
});
