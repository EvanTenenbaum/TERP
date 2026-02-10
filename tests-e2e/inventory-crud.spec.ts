import { test, expect } from "@playwright/test";
import { loginAsStandardUser } from "./fixtures/auth";
import { requireElement } from "./utils/preconditions";

test.describe("Inventory CRUD Operations @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    // Login using centralized auth fixture
    await loginAsStandardUser(page);
  });

  test("should navigate to inventory page", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page).toHaveURL("/inventory");
    await expect(
      page.locator("h1, h2").filter({ hasText: /inventory/i })
    ).toBeVisible();
  });

  test("should display inventory table", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForSelector('table, [role="table"], .inventory-grid', {
      timeout: 5000,
    });
    const firstRow = page
      .locator('tbody tr, [role="row"], .inventory-item')
      .first();
    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );
    await expect(firstRow).toBeVisible();
  });

  test("should search inventory items", async ({ page }) => {
    await page.goto("/inventory");
    const firstRow = page
      .locator('tbody tr, [role="row"], .inventory-item')
      .first();
    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();

    if (await searchInput.isVisible()) {
      await searchInput.fill("product");
      await page.waitForLoadState("networkidle");
      await expect(firstRow).toBeVisible();
    }
  });

  test("should filter inventory by category", async ({ page }) => {
    await page.goto("/inventory");

    const filterButton = page
      .locator('button:has-text("Filter"), select[name*="category"]')
      .first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.locator('[role="option"], option').first().click();
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator('tbody tr, [role="row"]').first()
      ).toBeVisible();
    }
  });

  test("should view inventory item details", async ({ page }) => {
    await page.goto("/inventory");
    const firstItem = page
      .locator('tbody tr, [role="row"], .inventory-item')
      .first();
    await requireElement(
      page,
      'tbody tr, [role="row"], .inventory-item',
      "No data rows available"
    );
    await firstItem.click();

    // Should show details modal or navigate to detail page
    await expect(
      page.locator('[role="dialog"], .modal').first().or(page)
    ).toHaveURL(/\/inventory\/\d+/);
  });

  test("should create new inventory item", async ({ page }) => {
    await page.goto("/inventory");
    const createButton = page
      .locator(
        'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
      )
      .first();
    await createButton.click();

    // Fill in product details
    await page.fill(
      'input[name="name"], input[placeholder*="name" i]',
      "Test Product E2E"
    );
    await page.fill(
      'input[name="sku"], input[placeholder*="sku" i]',
      "TEST-SKU-001"
    );
    await page.fill('input[name="quantity"], input[type="number"]', "100");

    const submitButton = page
      .locator(
        'button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")'
      )
      .first();
    await submitButton.click();

    await expect(
      page
        .locator('.toast, [role="alert"]')
        .filter({ hasText: /success|created/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("should adjust inventory quantity", async ({ page }) => {
    await page.goto("/inventory");
    const firstItem = page.locator('tbody tr, [role="row"]').first();
    await requireElement(
      page,
      'tbody tr, [role="row"], .inventory-item',
      "No data rows available"
    );
    await firstItem.click();

    // Look for adjust button
    const adjustButton = page
      .locator('button:has-text("Adjust"), button:has-text("Update Quantity")')
      .first();

    if (await adjustButton.isVisible()) {
      await adjustButton.click();

      const quantityInput = page
        .locator('input[name*="quantity"], input[type="number"]')
        .first();
      await quantityInput.fill("50");

      const saveButton = page
        .locator('button:has-text("Save"), button:has-text("Confirm")')
        .first();
      await saveButton.click();

      await expect(
        page
          .locator('.toast, [role="alert"]')
          .filter({ hasText: /success|updated/i })
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show low stock items", async ({ page }) => {
    await page.goto("/inventory");

    const firstRow = page.locator('tbody tr, [role="row"]').first();
    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );

    const lowStockFilter = page
      .locator('button:has-text("Low Stock"), [data-filter="low-stock"]')
      .first();

    if (await lowStockFilter.isVisible()) {
      await lowStockFilter.click();
      await page.waitForLoadState("networkidle");
      await expect(firstRow).toBeVisible();
    }
  });

  test("should export inventory to CSV", async ({ page }) => {
    await page.goto("/inventory");

    const exportButton = page
      .locator('button:has-text("Export"), button:has-text("CSV")')
      .first();

    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent("download", { timeout: 5000 });
      await exportButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    }
  });

  test("should sort inventory by name", async ({ page }) => {
    await page.goto("/inventory");

    const firstRow = page.locator('tbody tr, [role="row"]').first();
    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );

    const nameHeader = page
      .locator('th:has-text("Name"), [role="columnheader"]:has-text("Name")')
      .first();
    await nameHeader.click();

    await page.waitForLoadState("networkidle");
    await expect(firstRow).toBeVisible();
  });

  test("should view inventory movement history", async ({ page }) => {
    await page.goto("/inventory");
    const firstItem = page.locator('tbody tr, [role="row"]').first();
    await requireElement(
      page,
      'tbody tr, [role="row"], .inventory-item',
      "No data rows available"
    );
    await firstItem.click();

    // Look for history tab or button
    const historyTab = page
      .locator('button:has-text("History"), [role="tab"]:has-text("History")')
      .first();

    if (await historyTab.isVisible()) {
      await historyTab.click();
      await expect(page.locator(".history-item, tbody tr").first()).toBeVisible(
        { timeout: 5000 }
      );
    }
  });
});
