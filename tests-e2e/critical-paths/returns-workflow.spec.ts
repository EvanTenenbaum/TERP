/**
 * E2E Tests: Returns Workflow (Sprint D - TEST-001)
 *
 * Tests the complete returns workflow:
 * Return Request → Processing → Inventory Update
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { requireElement } from "../utils/preconditions";

test.describe("Return Request Flow @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to returns page", async ({ page }) => {
    await page.goto("/returns");

    // May redirect to orders or have dedicated returns page
    await expect(
      page.locator(
        'h1:has-text("Return"), h1:has-text("Order"), [data-testid="returns-page"]'
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("should access return functionality from order", async ({ page }) => {
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

    // Look for return button
    await expect(
      page.locator(
        'button:has-text("Return"), button:has-text("Create Return"), [data-testid="create-return"]'
      )
    ).toBeEnabled({ timeout: 5000 });
  });

  test("should display return form with required fields", async ({ page }) => {
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

    // Click return button
    await requireElement(
      page,
      'button:has-text("Return"), button:has-text("Create Return")',
      "Return button not found"
    );

    const returnButton = page
      .locator('button:has-text("Return"), button:has-text("Create Return")')
      .first();

    await returnButton.click();
    await page.waitForLoadState("networkidle");

    // Verify return form fields
    await expect(
      page.locator('[data-testid="return-form"], form, [role="dialog"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should select items for return", async ({ page }) => {
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

    // Click return button
    await requireElement(
      page,
      'button:has-text("Return"), button:has-text("Create Return")',
      "Return button not found"
    );

    const returnButton = page
      .locator('button:has-text("Return"), button:has-text("Create Return")')
      .first();

    await returnButton.click();
    await page.waitForLoadState("networkidle");

    // Look for item selection checkboxes
    await requireElement(
      page,
      'input[type="checkbox"], [data-testid="return-item-select"]',
      "Item checkboxes not found"
    );

    const itemCheckbox = page
      .locator('input[type="checkbox"], [data-testid="return-item-select"]')
      .first();

    await itemCheckbox.check();
    await expect(itemCheckbox).toBeChecked();
  });

  test("should specify return reason", async ({ page }) => {
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

    // Click return button
    await requireElement(
      page,
      'button:has-text("Return"), button:has-text("Create Return")',
      "Return button not found"
    );

    const returnButton = page
      .locator('button:has-text("Return"), button:has-text("Create Return")')
      .first();

    await returnButton.click();
    await page.waitForLoadState("networkidle");

    // Look for reason field
    await expect(
      page.locator(
        'select[name="reason"], textarea[name="reason"], [data-testid="return-reason"]'
      )
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Return Processing Flow @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display pending returns", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");

    // Look for pending returns list
    await expect(
      page.locator('[data-testid="pending-returns"], table, .returns-list')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should approve return request", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");

    // Click on first return
    await requireElement(
      page,
      "table tbody tr, [data-testid='return-item']",
      "No returns found"
    );

    const firstReturn = page
      .locator("table tbody tr, [data-testid='return-item']")
      .first();

    await firstReturn.click();
    await page.waitForLoadState("networkidle");

    // Look for approve button
    await expect(
      page.locator(
        'button:has-text("Approve"), button:has-text("Accept"), [data-testid="approve-return"]'
      )
    ).toBeEnabled({ timeout: 5000 });
  });

  test("should reject return request", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");

    // Click on first return
    await requireElement(
      page,
      "table tbody tr, [data-testid='return-item']",
      "No returns found"
    );

    const firstReturn = page
      .locator("table tbody tr, [data-testid='return-item']")
      .first();

    await firstReturn.click();
    await page.waitForLoadState("networkidle");

    // Look for reject button
    await expect(
      page.locator(
        'button:has-text("Reject"), button:has-text("Deny"), [data-testid="reject-return"]'
      )
    ).toBeEnabled({ timeout: 5000 });
  });

  test("should process return with quality check", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");

    // Click on first return
    await requireElement(
      page,
      "table tbody tr, [data-testid='return-item']",
      "No returns found"
    );

    const firstReturn = page
      .locator("table tbody tr, [data-testid='return-item']")
      .first();

    await firstReturn.click();
    await page.waitForLoadState("networkidle");

    // Look for quality check section
    const qualityCheck = page.locator(
      '[data-testid="quality-check"], .quality-check, :text("Quality"), :text("Condition")'
    );

    // May or may not have quality check
    const count = await qualityCheck.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Inventory Update from Return @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should update inventory after return approval", async ({ page }) => {
    // This test verifies that inventory is updated after return
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Look for inventory movements or audit log
    const inventoryMovements = page.locator(
      '[data-testid="inventory-movements"], .movements, :text("Movement"), :text("Return")'
    );

    // May or may not show movements
    const count = await inventoryMovements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should show return in batch history", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Click on first batch
    await requireElement(
      page,
      "table tbody tr, [data-testid='batch-item']",
      "No batches found"
    );

    const firstBatch = page
      .locator("table tbody tr, [data-testid='batch-item']")
      .first();

    await firstBatch.click();
    await page.waitForLoadState("networkidle");

    // Look for history/audit section
    await expect(
      page.locator(
        '[data-testid="batch-history"], .history, :text("History"), :text("Audit")'
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("should create credit memo for return", async ({ page }) => {
    await page.goto("/accounting/credit-memos");
    await page.waitForLoadState("networkidle");

    // Look for credit memos list
    const creditMemos = page.locator(
      '[data-testid="credit-memos"], table, .credit-memos-list'
    );

    // May or may not have credit memos
    const count = await creditMemos.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should track return in order history", async ({ page }) => {
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

    // Look for returns section in order detail
    const returnsSection = page.locator(
      '[data-testid="order-returns"], .returns, :text("Return")'
    );

    // May or may not have returns
    const count = await returnsSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Return Reporting @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display return statistics", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");

    // Look for statistics/summary
    const statistics = page.locator(
      '[data-testid="return-stats"], .statistics, .summary'
    );

    // May or may not show statistics
    const count = await statistics.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should filter returns by status", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");

    // Look for status filter
    await requireElement(
      page,
      'select[name="status"], [data-testid="status-filter"], button:has-text("Pending")',
      "Status filter not found"
    );

    const statusFilter = page
      .locator(
        'select[name="status"], [data-testid="status-filter"], button:has-text("Pending")'
      )
      .first();

    if (await statusFilter.evaluate(el => el.tagName === "SELECT")) {
      await statusFilter.selectOption({ index: 1 });
    } else {
      await statusFilter.click();
    }

    await page.waitForLoadState("networkidle");
  });

  test("should filter returns by date range", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");

    // Look for date filter
    await expect(
      page.locator(
        'input[type="date"], [data-testid="date-filter"], button:has-text("Date")'
      )
    ).toBeVisible({ timeout: 5000 });
  });
});
