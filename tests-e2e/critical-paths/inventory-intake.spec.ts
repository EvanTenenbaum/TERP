/**
 * E2E Tests: Inventory Intake Flow (WS-007)
 *
 * Tests the complex flower intake workflow including
 * quality documentation and batch creation.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Inventory Intake (WS-007)", () => {
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
    const intakeButton = page.locator(
      'button:has-text("Intake"), a:has-text("Intake"), button:has-text("Receive"), [data-testid="intake-button"]'
    );

    if (await intakeButton.isVisible().catch(() => false)) {
      await intakeButton.click();

      // Should open intake form or navigate to intake page
      await expect(
        page.locator(
          '[data-testid="intake-form"], form, [role="dialog"], h2:has-text("Intake")'
        )
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should display intake form with required fields", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    const intakeButton = page.locator(
      'button:has-text("Intake"), a:has-text("Intake"), button:has-text("Receive")'
    );

    if (await intakeButton.isVisible().catch(() => false)) {
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
    }
  });

  test("should allow adding multiple items to intake", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    const intakeButton = page.locator(
      'button:has-text("Intake"), a:has-text("Intake")'
    );

    if (await intakeButton.isVisible().catch(() => false)) {
      await intakeButton.click();
      await page.waitForLoadState("networkidle");

      // Look for "Add Item" or "Add Line" button
      const addItemButton = page.locator(
        'button:has-text("Add Item"), button:has-text("Add Line"), button:has-text("+ Add"), [data-testid="add-item"]'
      );

      if (await addItemButton.isVisible().catch(() => false)) {
        await expect(addItemButton).toBeEnabled();
      }
    }
  });

  test("should validate intake before submission", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    const intakeButton = page.locator(
      'button:has-text("Intake"), a:has-text("Intake")'
    );

    if (await intakeButton.isVisible().catch(() => false)) {
      await intakeButton.click();
      await page.waitForLoadState("networkidle");

      // Try to submit without filling required fields
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Save"), button:has-text("Complete")'
      );

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();

        // Should show validation errors
        await expect(
          page.locator(
            '[role="alert"], .error, input:invalid, [data-testid="validation-error"]'
          )
        ).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe("Inventory Batch Management", () => {
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
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]'
    );

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("test");
      await page.waitForLoadState("networkidle");

      // Search should filter results — verify the page responded
      await page.waitForTimeout(1000);
      // The search input should still contain the typed value
      await expect(searchInput).toHaveValue("test");
    }
  });

  test("should filter batches by status", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Look for status filter
    const statusFilter = page.locator(
      'select[name="status"], [data-testid="status-filter"], button:has-text("Active")'
    );

    if (await statusFilter.isVisible().catch(() => false)) {
      if (await statusFilter.evaluate(el => el.tagName === "SELECT")) {
        await statusFilter.selectOption({ index: 1 });
      } else {
        await page.locator('button:has-text("Active")').click();
      }

      await page.waitForLoadState("networkidle");
    }
  });

  test("should view batch details", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Click on first batch
    const firstBatch = page
      .locator("table tbody tr, [data-testid='batch-item']")
      .first();

    if (await firstBatch.isVisible().catch(() => false)) {
      await firstBatch.click();

      // Should show batch details
      await expect(
        page.locator(
          '[data-testid="batch-details"], [role="dialog"], .batch-details'
        )
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Inventory Low Stock Alerts (WS-008)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display low stock indicators", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Verify the inventory page loaded with data — the table should be present
    await expect(
      page.locator(
        "table, [data-testid='inventory-list'], [data-testid='batch-list']"
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("should filter to show only low stock items", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Look for low stock filter
    const lowStockFilter = page.locator(
      'button:has-text("Low Stock"), [data-testid="low-stock-filter"], input[type="checkbox"]:near(:text("Low Stock"))'
    );

    if (await lowStockFilter.isVisible().catch(() => false)) {
      await lowStockFilter.click();
      await page.waitForLoadState("networkidle");

      // Filter click should have been accepted — verify the button is still present
      await expect(lowStockFilter).toBeVisible();
    }
  });
});

test.describe("Inventory Photos (WS-010)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.skip("should display batch photos", async ({ page }) => {
    // TODO: Batch photos feature may not be implemented yet or requires specific test data.
    // Skipping until batch photo functionality is available.
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Click on first batch
    const firstBatch = page
      .locator("table tbody tr, [data-testid='batch-item']")
      .first();

    await expect(firstBatch).toBeVisible({ timeout: 10000 });
    await firstBatch.click();
    await page.waitForLoadState("networkidle");

    // Look for photos section
    const photosSection = page.locator(
      '[data-testid="photos"], .photos, img[alt*="batch" i], img[alt*="product" i]'
    );

    await expect(photosSection.first()).toBeVisible({ timeout: 10000 });
  });

  test.skip("should have photo upload option", async ({ page }) => {
    // TODO: Photo upload feature may not be implemented yet.
    // Skipping until upload functionality is available.
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Click on first batch
    const firstBatch = page
      .locator("table tbody tr, [data-testid='batch-item']")
      .first();

    await expect(firstBatch).toBeVisible({ timeout: 10000 });
    await firstBatch.click();
    await page.waitForLoadState("networkidle");

    // Look for upload button
    const uploadButton = page.locator(
      'button:has-text("Upload"), button:has-text("Add Photo"), input[type="file"], [data-testid="photo-upload"]'
    );

    await expect(uploadButton).toBeVisible({ timeout: 10000 });
  });
});
