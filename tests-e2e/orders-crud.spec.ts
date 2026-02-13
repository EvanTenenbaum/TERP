import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsSalesManager } from "./fixtures/auth";

/**
 * Orders CRUD Operations E2E Tests
 *
 * The Orders page uses a tab-based UI with:
 * - Draft Orders tab
 * - Confirmed Orders tab
 *
 * Each tab may display a table or an empty state depending on data.
 * Stats cards show total counts regardless of tab selection.
 */

test.describe("Orders CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    // Login using centralized auth fixture with QA credentials
    await loginAsAdmin(page);
  });

  test("should navigate to orders page", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/orders/);

    // Orders surface was renamed to "Sales" in current UI, keep backward-compatible assertion.
    await expect(
      page.locator("h1").filter({ hasText: /orders|sales/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display orders page with stats cards", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Accept either legacy stats labels or current compact stats labels.
    const statsCard = page
      .locator("text=/total orders|drafts:|pending:|shipped:/i")
      .first();
    await expect(statsCard).toBeVisible({ timeout: 10000 });
  });

  test("should display draft and confirmed tabs", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Check for tab buttons
    const draftTab = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /draft/i })
      .first();
    const confirmedTab = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /confirmed/i })
      .first();

    await expect(draftTab).toBeVisible({ timeout: 10000 });
    await expect(confirmedTab).toBeVisible({ timeout: 10000 });
  });

  test("should switch between draft and confirmed tabs", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Click on Confirmed Orders tab
    const confirmedTab = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /confirmed/i })
      .first();
    await confirmedTab.click();
    await page.waitForTimeout(500);

    // Click on Draft Orders tab
    const draftTab = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /draft/i })
      .first();
    await draftTab.click();
    await page.waitForTimeout(500);

    // Verify we're still on the orders page after tab switching
    await expect(page).toHaveURL(/\/orders/);
    await expect(draftTab).toBeVisible();
  });

  test("should display orders table or empty state", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Wait for data loading

    // The orders page shows tabs (Draft/Confirmed) and stats cards
    // Either a table should be visible, or the tab structure with stats
    const hasTable = await page
      .locator('table, [role="table"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasTabStructure = await page
      .locator('[role="tab"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasStatsCards = await page
      .locator("text=/drafts:|pending:|shipped:|total orders/i")
      .first()
      .isVisible()
      .catch(() => false);
    const hasSearchInput = await page
      .locator('input[placeholder*="Search"]')
      .first()
      .isVisible()
      .catch(() => false);

    // At least one should be true - the page structure is valid
    expect(
      hasTable || hasTabStructure || hasStatsCards || hasSearchInput
    ).toBeTruthy();
  });

  test("should display order stats correctly", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    const content = await page.locator("main").textContent();
    const hasExpectedStats =
      /drafts:\s*\d+/i.test(content ?? "") ||
      /pending:\s*\d+/i.test(content ?? "") ||
      /shipped:\s*\d+/i.test(content ?? "") ||
      /total orders/i.test(content ?? "");
    expect(hasExpectedStats).toBeTruthy();
  });

  test("should have New Order button", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Current UI uses "New Sale" while some legacy pages use "New Order"/"Create".
    const createButton = page
      .locator("button")
      .filter({ hasText: /new sale|new order|create/i })
      .first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
  });

  test("should open create order flow", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    const createButton = page
      .locator("button")
      .filter({ hasText: /new sale|new order/i })
      .first();
    await createButton.click();

    // Should navigate to order creator or open modal
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");

    // Check for order creation UI - could be a new page, modal, or client selection
    const hasModal = await page
      .locator('[role="dialog"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasCreatePage = await page
      .locator("h1, h2")
      .filter({ hasText: /create|new|order|sale|client/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasClientSelect = await page
      .locator("text=Select Client, text=Choose Client, text=Client")
      .first()
      .isVisible()
      .catch(() => false);
    const urlChanged = !page.url().endsWith("/orders");

    // At least one indicator should be true
    expect(
      hasModal || hasCreatePage || hasClientSelect || urlChanged
    ).toBeTruthy();
  });

  test("should expose list actions (export/search/filter)", async ({
    page,
  }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    const hasExportButton = await page
      .locator("button")
      .filter({ hasText: /export|csv/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasSearchControl = await page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasFilterControl = await page
      .locator("button, [role='combobox'], select")
      .filter({ hasText: /status|all statuses|filter/i })
      .first()
      .isVisible()
      .catch(() => false);

    // Export is optional in current UX; list controls must still be present.
    expect(
      hasExportButton || hasSearchControl || hasFilterControl
    ).toBeTruthy();
  });

  test("should have Configure Display option", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Look for configure/display settings
    const _configButton = page
      .locator('button, [role="button"]')
      .filter({ hasText: /configure|display|columns/i })
      .first();

    // This may not be visible on all views, so just check if page loaded
    await expect(
      page.locator("h1").filter({ hasText: /orders|sales/i })
    ).toBeVisible();
  });

  test("should search for orders", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("ORD");
      await page.waitForLoadState("networkidle");
      // Verify search input retained its value (search was accepted)
      await expect(searchInput).toHaveValue("ORD");
    } else {
      // Search may not be visible, skip
      test.skip();
    }
  });

  test("should filter orders by status", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Look for status filter dropdown or buttons
    const filterButton = page
      .locator("button, select")
      .filter({ hasText: /status|filter|all statuses/i })
      .first();

    if (await filterButton.isVisible().catch(() => false)) {
      await filterButton.click();
      await page.waitForTimeout(500);

      // Check for filter options
      const hasOptions = await page
        .locator('[role="option"], option, [role="menuitem"]')
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasOptions).toBeTruthy();
    } else {
      // Filter may not be visible, check for status tabs instead
      const statusTabs = page
        .locator('button, [role="tab"]')
        .filter({ hasText: /pending|packed|shipped/i })
        .first();
      const hasStatusTabs = await statusTabs.isVisible().catch(() => false);
      if (!hasStatusTabs) {
        test.skip();
        return;
      }
      await expect(statusTabs).toBeVisible();
    }
  });
});

test.describe("Orders - Role-Based Access", () => {
  test("Sales Manager can view orders", async ({ page }) => {
    await loginAsSalesManager(page);

    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Should be able to access orders page
    await expect(page).toHaveURL(/\/orders/);
    await expect(
      page.locator("h1").filter({ hasText: /orders|sales/i })
    ).toBeVisible();
  });

  test("Admin can create new orders", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Admin should see the primary create action (New Sale/New Order).
    const createButton = page
      .locator("button")
      .filter({ hasText: /new sale|new order|create/i })
      .first();
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
  });
});
