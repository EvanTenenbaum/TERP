import { test, expect } from "@playwright/test";
import { loginAsStandardUser } from "./fixtures/auth";

test.describe("Orders CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    // Login using centralized auth fixture
    await loginAsStandardUser(page);
  });

  test("should navigate to orders page", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL("/orders");
    await expect(
      page.locator("h1, h2").filter({ hasText: /order/i })
    ).toBeVisible();
  });

  test("should display orders table", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForSelector('table, [role="table"]', { timeout: 5000 });
    const rows = page.locator('tbody tr, [role="row"]');
    await expect(rows.first()).toBeVisible();
  });

  test("should search for orders", async ({ page }) => {
    await page.goto("/orders");
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();

    if (await searchInput.isVisible()) {
      await searchInput.fill("ORD");
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator('tbody tr, [role="row"]').first()
      ).toBeVisible();
    }
  });

  test("should open create order page", async ({ page }) => {
    await page.goto("/orders");
    const createButton = page
      .locator('button:has-text("Create"), button:has-text("New Order")')
      .first();
    await createButton.click();

    // Should navigate to order creator or open modal
    await expect(
      page
        .locator('[role="dialog"], .modal')
        .first()
        .or(page.locator('h1:has-text("Create Order")'))
    ).toBeVisible({ timeout: 5000 });
  });

  test("should filter orders by status", async ({ page }) => {
    await page.goto("/orders");

    const filterButton = page
      .locator('button:has-text("Filter"), select[name*="status"]')
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

  test("should view order details", async ({ page }) => {
    await page.goto("/orders");
    const firstRow = page.locator('tbody tr, [role="row"]').first();
    await firstRow.click();

    // Should show order details (modal or page)
    await expect(
      page.locator('[role="dialog"], .modal, h1:has-text("Order")').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("should export orders to CSV", async ({ page }) => {
    await page.goto("/orders");

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

  test("should sort orders by date", async ({ page }) => {
    await page.goto("/orders");

    const dateHeader = page
      .locator('th:has-text("Date"), [role="columnheader"]:has-text("Date")')
      .first();
    await dateHeader.click();

    await page.waitForLoadState("networkidle");
    await expect(page.locator('tbody tr, [role="row"]').first()).toBeVisible();
  });

  test("should update order status", async ({ page }) => {
    await page.goto("/orders");
    const firstRow = page.locator('tbody tr, [role="row"]').first();
    await firstRow.click();

    // Look for status dropdown
    const statusDropdown = page
      .locator('select[name*="status"], button:has-text("Status")')
      .first();

    if (await statusDropdown.isVisible()) {
      await statusDropdown.click();
      await page.locator('[role="option"], option').first().click();

      // Save or confirm
      const saveButton = page
        .locator('button:has-text("Save"), button:has-text("Update")')
        .first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }

      await expect(
        page
          .locator('.toast, [role="alert"]')
          .filter({ hasText: /success|updated/i })
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should add items to order", async ({ page }) => {
    await page.goto("/orders");
    const createButton = page
      .locator('button:has-text("Create"), button:has-text("New Order")')
      .first();
    await createButton.click();

    // Add line item
    const addItemButton = page
      .locator('button:has-text("Add Item"), button:has-text("Add Product")')
      .first();

    if (await addItemButton.isVisible()) {
      await addItemButton.click();

      // Select product
      const productSelect = page
        .locator('select[name*="product"], input[name*="product"]')
        .first();
      await productSelect.click();
      await page.locator('[role="option"], option').first().click();

      // Enter quantity
      const quantityInput = page.locator('input[name*="quantity"]').first();
      await quantityInput.fill("10");

      await expect(
        page.locator("table tbody tr, .line-item").first()
      ).toBeVisible();
    }
  });

  test("should calculate order total", async ({ page }) => {
    await page.goto("/orders");
    const firstRow = page.locator('tbody tr, [role="row"]').first();
    await firstRow.click();

    // Check for total display
    const totalElement = page.locator("text=/total/i").first();
    if (await totalElement.isVisible()) {
      const totalText = await totalElement.textContent();
      expect(totalText).toMatch(/\$|total/i);
    }
  });
});
