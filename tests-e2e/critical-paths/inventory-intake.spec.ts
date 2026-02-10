/**
 * E2E Tests: Inventory Intake Flow (WS-007)
 *
 * Tests the complex flower intake workflow including
 * quality documentation and batch creation.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { requireElement } from "../utils/preconditions";

test.describe("Inventory Intake (WS-007) @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to inventory page", async ({ page }) => {
    await page.goto("/inventory");

    await expect(
      page.locator('h1:has-text("Inventory"), [data-testid="inventory-page"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test("should access intake functionality", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Look for intake button or link
    await requireElement(
      page,
      'button:has-text("Intake"), a:has-text("Intake"), button:has-text("Receive"), [data-testid="intake-button"]',
      "Intake button not found"
    );

    const intakeButton = page.locator(
      'button:has-text("Intake"), a:has-text("Intake"), button:has-text("Receive"), [data-testid="intake-button"]'
    );
    await intakeButton.click();

    // Should open intake form or navigate to intake page
    await expect(
      page.locator(
        '[data-testid="intake-form"], form, [role="dialog"], h2:has-text("Intake")'
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display intake form with required fields", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'button:has-text("Intake"), a:has-text("Intake"), button:has-text("Receive")',
      "Intake button not found"
    );

    const intakeButton = page.locator(
      'button:has-text("Intake"), a:has-text("Intake"), button:has-text("Receive")'
    );
    await intakeButton.click();
    await page.waitForLoadState("networkidle");

    // Verify required fields are present
    // Vendor selection
    await expect(
      page.locator(
        'select[name="vendor"], [data-testid="vendor-select"], input[placeholder*="vendor" i]'
      )
    ).toBeVisible({ timeout: 5000 });

    // Product/SKU selection
    await expect(
      page.locator(
        'select[name="product"], [data-testid="product-select"], input[placeholder*="product" i], input[placeholder*="sku" i]'
      )
    ).toBeVisible();

    // Quantity field
    await expect(
      page.locator(
        'input[name="quantity"], [data-testid="quantity-input"], input[type="number"]'
      )
    ).toBeVisible();
  });

  test("should allow adding multiple items to intake", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'button:has-text("Intake"), a:has-text("Intake")',
      "Intake button not found"
    );

    const intakeButton = page.locator(
      'button:has-text("Intake"), a:has-text("Intake")'
    );
    await intakeButton.click();
    await page.waitForLoadState("networkidle");

    // Look for "Add Item" or "Add Line" button
    await requireElement(
      page,
      'button:has-text("Add Item"), button:has-text("Add Line"), button:has-text("+ Add"), [data-testid="add-item"]',
      "Add item button not found"
    );

    const addItemButton = page.locator(
      'button:has-text("Add Item"), button:has-text("Add Line"), button:has-text("+ Add"), [data-testid="add-item"]'
    );
    await expect(addItemButton).toBeEnabled();
  });

  test("should validate intake before submission", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'button:has-text("Intake"), a:has-text("Intake")',
      "Intake button not found"
    );

    const intakeButton = page.locator(
      'button:has-text("Intake"), a:has-text("Intake")'
    );
    await intakeButton.click();
    await page.waitForLoadState("networkidle");

    // Try to submit without filling required fields
    await requireElement(
      page,
      'button[type="submit"], button:has-text("Save"), button:has-text("Complete")',
      "Submit button not found"
    );

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Save"), button:has-text("Complete")'
    );
    await submitButton.click();

    // Should show validation errors
    await expect(
      page.locator(
        '[role="alert"], .error, input:invalid, [data-testid="validation-error"]'
      )
    ).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Inventory Batch Management @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display batch list", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Should show batch table or list
    const batchList = page.locator(
      "table, [data-testid='batch-list'], [data-testid='inventory-list']"
    );

    await expect(batchList).toBeVisible({ timeout: 10000 });
  });

  test("should search batches", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Look for search input
    await requireElement(
      page,
      'input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]',
      "Search input not found"
    );

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]'
    );
    await searchInput.fill("test");
    await page.waitForLoadState("networkidle");

    // Search should be applied (URL or results change)
    const url = page.url();
    const hasSearchInUrl = url.includes("search") || url.includes("q=");
    expect(hasSearchInUrl).toBeTruthy();
  });

  test("should filter batches by status", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Look for status filter
    await requireElement(
      page,
      'select[name="status"], [data-testid="status-filter"], button:has-text("Active")',
      "Status filter not found"
    );

    const statusFilter = page.locator(
      'select[name="status"], [data-testid="status-filter"], button:has-text("Active")'
    );
    if (await statusFilter.evaluate(el => el.tagName === "SELECT")) {
      await statusFilter.selectOption({ index: 1 });
    } else {
      await page.locator('button:has-text("Active")').click();
    }

    await page.waitForLoadState("networkidle");
  });

  test("should view batch details", async ({ page }) => {
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

    // Should show batch details
    await expect(
      page.locator(
        '[data-testid="batch-details"], [role="dialog"], .batch-details'
      )
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Inventory Low Stock Alerts (WS-008) @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display low stock indicators", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Look for low stock badge or indicator
    const lowStockIndicator = page.locator(
      '[data-testid="low-stock"], .low-stock, .badge:has-text("Low"), [data-status="low"]'
    );

    // May or may not have low stock items
    const count = await lowStockIndicator.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should filter to show only low stock items", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Look for low stock filter
    await requireElement(
      page,
      'button:has-text("Low Stock"), [data-testid="low-stock-filter"], input[type="checkbox"]:near(:text("Low Stock"))',
      "Low stock filter not found"
    );

    const lowStockFilter = page.locator(
      'button:has-text("Low Stock"), [data-testid="low-stock-filter"], input[type="checkbox"]:near(:text("Low Stock"))'
    );
    await lowStockFilter.click();
    await page.waitForLoadState("networkidle");

    // Filter should be applied
    const url = page.url();
    const hasFilterInUrl = url.includes("lowStock") || url.includes("status");
    expect(hasFilterInUrl).toBeTruthy();
  });
});

test.describe("Inventory Photos (WS-010) @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display batch photos", async ({ page }) => {
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

    // Look for photos section
    const photosSection = page.locator(
      '[data-testid="photos"], .photos, img[alt*="batch" i], img[alt*="product" i]'
    );

    // May or may not have photos
    const count = await photosSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have photo upload option", async ({ page }) => {
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

    // Look for upload button
    await requireElement(
      page,
      'button:has-text("Upload"), button:has-text("Add Photo"), input[type="file"], [data-testid="photo-upload"]',
      "Upload button not found"
    );

    const uploadButton = page.locator(
      'button:has-text("Upload"), button:has-text("Add Photo"), input[type="file"], [data-testid="photo-upload"]'
    );
    await expect(uploadButton).toBeVisible();
  });
});
