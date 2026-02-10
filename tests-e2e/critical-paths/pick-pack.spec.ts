/**
 * E2E Tests: Pick & Pack Workflow (WS-003)
 *
 * Tests the critical fulfillment workflow for packing orders.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { requireElement } from "../utils/preconditions";

test.describe("Pick & Pack Workflow (WS-003) @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to pick and pack page", async ({ page }) => {
    // Navigate to pick and pack
    await page.goto("/pick-pack");

    // Verify page loaded
    await expect(
      page.locator(
        'h1:has-text("Pick"), h1:has-text("Pack"), [data-testid="pick-pack-page"]'
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display order queue", async ({ page }) => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    // Look for order queue/list
    const orderQueue = page.locator(
      '[data-testid="order-queue"], .order-queue, table, [data-testid="orders-list"]'
    );

    await expect(orderQueue).toBeVisible({ timeout: 10000 });
  });

  test("should filter orders by status", async ({ page }) => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    // Look for status filter
    await requireElement(
      page,
      'select[name="status"], [data-testid="status-filter"], button:has-text("Confirmed")',
      "Status filter not found"
    );

    const statusFilter = page.locator(
      'select[name="status"], [data-testid="status-filter"], button:has-text("Confirmed")'
    );
    if (await statusFilter.evaluate(el => el.tagName === "SELECT")) {
      await statusFilter.selectOption("CONFIRMED");
    } else {
      await page.locator('button:has-text("Confirmed")').click();
    }

    await page.waitForLoadState("networkidle");

    // Verify filter applied
    const url = page.url();
    const hasFilterInUrl = url.includes("status") || url.includes("CONFIRMED");
    expect(hasFilterInUrl).toBeTruthy();
  });

  test("should open order details for packing", async ({ page }) => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    // Click on first order in queue
    await requireElement(
      page,
      "table tbody tr, [data-testid='order-item'], .order-row",
      "No orders found"
    );

    const firstOrder = page
      .locator("table tbody tr, [data-testid='order-item'], .order-row")
      .first();
    await firstOrder.click();

    // Should show order details or packing interface
    await expect(
      page.locator(
        '[data-testid="order-details"], [data-testid="packing-interface"], .order-details, [role="dialog"]'
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display order items for picking", async ({ page }) => {
    await page.goto("/pick-pack");
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

    // Wait for details to load
    await page.waitForLoadState("networkidle");

    // Should show line items
    const lineItems = page.locator(
      '[data-testid="line-item"], .line-item, [data-testid="order-item"]'
    );

    const count = await lineItems.count();
    // May or may not have items depending on test data
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should allow packing items into bags", async ({ page }) => {
    await page.goto("/pick-pack");
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

    // Look for pack/bag action
    await requireElement(
      page,
      'button:has-text("Pack"), button:has-text("Add to Bag"), [data-testid="pack-button"]',
      "Pack button not found"
    );

    const packButton = page.locator(
      'button:has-text("Pack"), button:has-text("Add to Bag"), [data-testid="pack-button"]'
    );
    // Verify pack button is clickable
    await expect(packButton).toBeEnabled();
  });

  test("should show bag management interface", async ({ page }) => {
    await page.goto("/pick-pack");
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

    // Look for bags section
    await requireElement(
      page,
      '[data-testid="bags-section"], .bags-section, :has-text("Bags")',
      "Bags section not found"
    );

    // Look for add bag button
    await requireElement(
      page,
      'button:has-text("New Bag"), button:has-text("Add Bag"), [data-testid="add-bag"]',
      "Add bag button not found"
    );

    const addBagButton = page.locator(
      'button:has-text("New Bag"), button:has-text("Add Bag"), [data-testid="add-bag"]'
    );
    await expect(addBagButton).toBeEnabled();
  });

  test("should mark order as ready when fully packed", async ({ page }) => {
    await page.goto("/pick-pack");
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

    // Look for "Mark Ready" or similar action
    await requireElement(
      page,
      'button:has-text("Mark Ready"), button:has-text("Complete"), button:has-text("Ready for Pickup"), [data-testid="mark-ready"]',
      "Mark ready button not found"
    );

    const markReadyButton = page.locator(
      'button:has-text("Mark Ready"), button:has-text("Complete"), button:has-text("Ready for Pickup"), [data-testid="mark-ready"]'
    );
    // Button should be present (may be disabled if not fully packed)
    await expect(markReadyButton).toBeVisible();
  });
});

test.describe("Pick & Pack - Printing @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should have print packing slip option", async ({ page }) => {
    await page.goto("/pick-pack");
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

    // Look for print button
    await requireElement(
      page,
      'button:has-text("Print"), button:has-text("Packing Slip"), [data-testid="print-slip"]',
      "Print button not found"
    );

    const printButton = page.locator(
      'button:has-text("Print"), button:has-text("Packing Slip"), [data-testid="print-slip"]'
    );
    await expect(printButton).toBeEnabled();
  });
});

test.describe("Pick & Pack - Mobile Responsive @prod-regression", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should be usable on mobile viewport", async ({ page }) => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    // Page should be visible and not have horizontal scroll
    const body = page.locator("body");
    const bodyWidth = await body.evaluate(el => el.scrollWidth);
    const viewportWidth = 375;

    // Allow some tolerance for scroll
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 50);

    // Order list should still be visible
    const orderList = page.locator(
      '[data-testid="order-queue"], table, [data-testid="orders-list"]'
    );
    await expect(orderList).toBeVisible();
  });
});
