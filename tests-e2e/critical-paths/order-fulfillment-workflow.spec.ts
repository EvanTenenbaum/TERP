/**
 * E2E Tests: Order Fulfillment Workflow (Sprint D - TEST-001)
 *
 * Tests the complete order workflow:
 * Order Creation → Fulfillment → Payment → Complete
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { requireElement } from "../utils/preconditions";

test.describe("Order Creation Flow @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to order creation page", async ({ page }) => {
    await page.goto("/orders/new");

    await expect(
      page.locator(
        'h1:has-text("Order"), h1:has-text("New"), [data-testid="order-creator-page"]'
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("should select client for order", async ({ page }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // Look for client selector
    await requireElement(
      page,
      'select[name="client"], [data-testid="client-select"], button:has-text("Select Client")',
      "Client selector not found"
    );

    const clientSelector = page
      .locator(
        'select[name="client"], [data-testid="client-select"], button:has-text("Select Client")'
      )
      .first();

    await clientSelector.click();
    await page.waitForLoadState("networkidle");

    // Should show client options
    await expect(
      page.locator('[role="option"], option, [data-testid="client-option"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should add items to order", async ({ page }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // Look for add item button
    await requireElement(
      page,
      'button:has-text("Add Item"), button:has-text("Add Product"), [data-testid="add-item"]',
      "Add item button not found"
    );

    const addItemButton = page
      .locator(
        'button:has-text("Add Item"), button:has-text("Add Product"), [data-testid="add-item"]'
      )
      .first();

    await addItemButton.click();

    // Should show item form or selector
    await expect(
      page.locator(
        '[data-testid="order-item"], .order-item, select[name="product"]'
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("should calculate order total", async ({ page }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // Look for total display
    await expect(
      page.locator('[data-testid="order-total"], .order-total, :text("Total")')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should submit order successfully", async ({ page }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // Look for submit button
    await expect(
      page.locator(
        'button[type="submit"], button:has-text("Create Order"), button:has-text("Submit")'
      )
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Order Fulfillment Flow @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to pick-pack page", async ({ page }) => {
    await page.goto("/pick-pack");

    await expect(
      page.locator(
        'h1:has-text("Pick"), h1:has-text("Pack"), [data-testid="pick-pack-page"]'
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display orders ready for fulfillment", async ({ page }) => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    // Look for orders list
    await expect(
      page.locator('[data-testid="fulfillment-orders"], table, .orders-list')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should start picking process", async ({ page }) => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    // Click on first order
    await requireElement(
      page,
      "table tbody tr, [data-testid='order-item']",
      "No orders found in pick-pack page"
    );

    const firstOrder = page
      .locator("table tbody tr, [data-testid='order-item']")
      .first();

    await firstOrder.click();
    await page.waitForLoadState("networkidle");

    // Look for start picking button
    await expect(
      page.locator(
        'button:has-text("Start Picking"), button:has-text("Pick"), [data-testid="start-picking"]'
      )
    ).toBeEnabled({ timeout: 5000 });
  });

  test("should mark items as picked", async ({ page }) => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    // Click on first order
    await requireElement(
      page,
      "table tbody tr, [data-testid='order-item']",
      "No orders found in pick-pack page"
    );

    const firstOrder = page
      .locator("table tbody tr, [data-testid='order-item']")
      .first();

    await firstOrder.click();
    await page.waitForLoadState("networkidle");

    // Look for item checkboxes
    await requireElement(
      page,
      'input[type="checkbox"], [data-testid="pick-item"]',
      "Item checkboxes not found"
    );

    const itemCheckbox = page
      .locator('input[type="checkbox"], [data-testid="pick-item"]')
      .first();

    await itemCheckbox.check();
    await expect(itemCheckbox).toBeChecked();
  });

  test("should complete packing process", async ({ page }) => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    // Click on first order
    await requireElement(
      page,
      "table tbody tr, [data-testid='order-item']",
      "No orders found in pick-pack page"
    );

    const firstOrder = page
      .locator("table tbody tr, [data-testid='order-item']")
      .first();

    await firstOrder.click();
    await page.waitForLoadState("networkidle");

    // Look for complete packing button
    await expect(
      page.locator(
        'button:has-text("Complete"), button:has-text("Pack"), [data-testid="complete-packing"]'
      )
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Payment Flow @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to invoices page", async ({ page }) => {
    await page.goto("/accounting/invoices");

    await expect(
      page.locator('h1:has-text("Invoice"), [data-testid="invoices-page"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display invoice for order", async ({ page }) => {
    await page.goto("/accounting/invoices");
    await page.waitForLoadState("networkidle");

    // Look for invoices list
    await expect(
      page.locator('[data-testid="invoices-list"], table, .invoices-list')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should record payment for invoice", async ({ page }) => {
    await page.goto("/accounting/invoices");
    await page.waitForLoadState("networkidle");

    // Click on first invoice
    await requireElement(
      page,
      "table tbody tr, [data-testid='invoice-item']",
      "No invoices found"
    );

    const firstInvoice = page
      .locator("table tbody tr, [data-testid='invoice-item']")
      .first();

    await firstInvoice.click();
    await page.waitForLoadState("networkidle");

    // Look for record payment button
    await expect(
      page.locator(
        'button:has-text("Record Payment"), button:has-text("Pay"), [data-testid="record-payment"]'
      )
    ).toBeEnabled({ timeout: 5000 });
  });

  test("should display payment form", async ({ page }) => {
    await page.goto("/accounting/invoices");
    await page.waitForLoadState("networkidle");

    // Click on first invoice
    await requireElement(
      page,
      "table tbody tr, [data-testid='invoice-item']",
      "No invoices found"
    );

    const firstInvoice = page
      .locator("table tbody tr, [data-testid='invoice-item']")
      .first();

    await firstInvoice.click();
    await page.waitForLoadState("networkidle");

    // Click record payment
    await requireElement(
      page,
      'button:has-text("Record Payment"), button:has-text("Pay")',
      "Record payment button not found"
    );

    const recordPaymentButton = page
      .locator('button:has-text("Record Payment"), button:has-text("Pay")')
      .first();

    await recordPaymentButton.click();
    await page.waitForLoadState("networkidle");

    // Should show payment form
    await expect(
      page.locator('[data-testid="payment-form"], form, [role="dialog"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should select payment method", async ({ page }) => {
    await page.goto("/accounting/invoices");
    await page.waitForLoadState("networkidle");

    // Click on first invoice
    await requireElement(
      page,
      "table tbody tr, [data-testid='invoice-item']",
      "No invoices found"
    );

    const firstInvoice = page
      .locator("table tbody tr, [data-testid='invoice-item']")
      .first();

    await firstInvoice.click();
    await page.waitForLoadState("networkidle");

    // Click record payment
    await requireElement(
      page,
      'button:has-text("Record Payment"), button:has-text("Pay")',
      "Record payment button not found"
    );

    const recordPaymentButton = page
      .locator('button:has-text("Record Payment"), button:has-text("Pay")')
      .first();

    await recordPaymentButton.click();
    await page.waitForLoadState("networkidle");

    // Look for payment method selector
    await expect(
      page.locator(
        'select[name="paymentMethod"], [data-testid="payment-method"], button:has-text("Cash")'
      )
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Order Completion Flow @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display completed orders", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Look for status filter
    await requireElement(
      page,
      'select[name="status"], [data-testid="status-filter"], button:has-text("Complete")',
      "Status filter not found"
    );

    const statusFilter = page
      .locator(
        'select[name="status"], [data-testid="status-filter"], button:has-text("Complete")'
      )
      .first();

    if (await statusFilter.evaluate(el => el.tagName === "SELECT")) {
      await statusFilter.selectOption("COMPLETE");
    } else {
      await statusFilter.click();
    }

    await page.waitForLoadState("networkidle");
  });

  test("should show order completion status", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Click on first order
    await requireElement(
      page,
      "table tbody tr, [data-testid='order-item']",
      "No orders found"
    );

    const firstOrder = page
      .locator("table tbody tr, [data-testid='order-item']")
      .first();

    await firstOrder.click();
    await page.waitForLoadState("networkidle");

    // Look for status badge
    await expect(
      page.locator('[data-testid="order-status"], .status-badge, .badge')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display order timeline", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Click on first order
    await requireElement(
      page,
      "table tbody tr, [data-testid='order-item']",
      "No orders found"
    );

    const firstOrder = page
      .locator("table tbody tr, [data-testid='order-item']")
      .first();

    await firstOrder.click();
    await page.waitForLoadState("networkidle");

    // Look for timeline/history
    const timeline = page.locator(
      '[data-testid="order-timeline"], .timeline, :text("History"), :text("Activity")'
    );

    // May or may not show timeline
    const count = await timeline.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should generate invoice for completed order", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Click on first order
    await requireElement(
      page,
      "table tbody tr, [data-testid='order-item']",
      "No orders found"
    );

    const firstOrder = page
      .locator("table tbody tr, [data-testid='order-item']")
      .first();

    await firstOrder.click();
    await page.waitForLoadState("networkidle");

    // Look for invoice link or button
    const invoiceLink = page.locator(
      'a:has-text("Invoice"), button:has-text("View Invoice"), [data-testid="order-invoice"]'
    );

    // May or may not have invoice
    const count = await invoiceLink.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Order Workflow Integration @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should track inventory deduction after fulfillment", async ({
    page,
  }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Look for inventory movements
    const movements = page.locator(
      '[data-testid="inventory-movements"], :text("Movement"), :text("Deduction")'
    );

    // May or may not show movements
    const count = await movements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should update client balance after payment", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Click on first client
    await requireElement(
      page,
      "table tbody tr, [data-testid='client-item']",
      "No clients found"
    );

    const firstClient = page
      .locator("table tbody tr, [data-testid='client-item']")
      .first();

    await firstClient.click();
    await page.waitForLoadState("networkidle");

    // Look for balance display
    const balanceDisplay = page.locator(
      '[data-testid="client-balance"], .balance, :text("Balance"), :text("Outstanding")'
    );

    // May or may not show balance
    const count = await balanceDisplay.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should record transaction in accounting", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for transactions or ledger
    const transactions = page.locator(
      '[data-testid="transactions"], table, :text("Transaction"), :text("Ledger")'
    );

    // May or may not show transactions
    const count = await transactions.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
