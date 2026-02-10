/**
 * E2E Tests: Sales & Client Management
 *
 * Tests client creation, preferences, wishlist, and sales workflows.
 * Covers WS-011 (Quick Customer Creation), WS-012 (Customer Preferences),
 * and WS-015 (Customer Wishlist).
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { requireElement } from "../utils/preconditions";

test.describe("Quick Customer Creation (WS-011) @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to clients page", async ({ page }) => {
    await page.goto("/clients");

    await expect(
      page.locator(
        'h1:has-text("Client"), h1:has-text("Customer"), [data-testid="clients-page"]'
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("should open new client form", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Look for new client button
    await requireElement(
      page,
      'button:has-text("New Client"), button:has-text("Add Client"), a:has-text("New Client"), [data-testid="new-client"]',
      "New client button not found"
    );

    const newClientButton = page
      .locator(
        'button:has-text("New Client"), button:has-text("Add Client"), a:has-text("New Client"), [data-testid="new-client"]'
      )
      .first();

    await newClientButton.click();

    // Should open form or navigate to create page
    await expect(
      page.locator(
        'form, [data-testid="client-form"], [role="dialog"], h2:has-text("New Client")'
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display required fields for client creation", async ({
    page,
  }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'button:has-text("New Client"), button:has-text("Add Client")',
      "New client button not found"
    );

    const newClientButton = page
      .locator('button:has-text("New Client"), button:has-text("Add Client")')
      .first();

    await newClientButton.click();
    await page.waitForLoadState("networkidle");

    // Name field
    await expect(
      page.locator(
        'input[name="name"], [data-testid="name-input"], input[placeholder*="name" i]'
      )
    ).toBeVisible({ timeout: 5000 });

    // Contact field (email or phone)
    await expect(
      page.locator(
        'input[name="email"], input[name="phone"], [data-testid="email-input"], [data-testid="phone-input"]'
      )
    ).toBeVisible();
  });

  test("should validate client form before submission", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'button:has-text("New Client"), button:has-text("Add Client")',
      "New client button not found"
    );

    const newClientButton = page
      .locator('button:has-text("New Client"), button:has-text("Add Client")')
      .first();

    await newClientButton.click();
    await page.waitForLoadState("networkidle");

    // Try to submit empty form
    await requireElement(
      page,
      'button[type="submit"], button:has-text("Save"), button:has-text("Create")',
      "Submit button not found"
    );

    const submitButton = page
      .locator(
        'button[type="submit"], button:has-text("Save"), button:has-text("Create")'
      )
      .first();

    await submitButton.click();

    // Should show validation errors
    await expect(
      page.locator(
        '[role="alert"], .error, input:invalid, [data-testid="validation-error"]'
      )
    ).toBeVisible({ timeout: 3000 });
  });

  test("should allow inline client creation from order form", async ({
    page,
  }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // Look for client select with add option
    await expect(
      page.locator(
        'button:has-text("+ New"), button:has-text("Add Client"), [data-testid="inline-add-client"]'
      )
    ).toBeEnabled({ timeout: 5000 });
  });
});

test.describe("Customer Preferences (WS-012) @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should view client profile", async ({ page }) => {
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

    // Should show client profile
    await expect(
      page.locator('[data-testid="client-profile"], .client-profile, h2')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display preferences tab", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

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

    // Look for preferences tab
    await requireElement(
      page,
      'button:has-text("Preferences"), a:has-text("Preferences"), [data-testid="preferences-tab"]',
      "Preferences tab not found"
    );

    const preferencesTab = page
      .locator(
        'button:has-text("Preferences"), a:has-text("Preferences"), [data-testid="preferences-tab"]'
      )
      .first();

    await preferencesTab.click();

    // Should show preferences content
    await expect(
      page.locator('[data-testid="preferences-content"], .preferences')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display purchase history", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

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

    // Look for history tab
    await requireElement(
      page,
      'button:has-text("History"), a:has-text("History"), button:has-text("Orders"), [data-testid="history-tab"]',
      "History tab not found"
    );

    const historyTab = page
      .locator(
        'button:has-text("History"), a:has-text("History"), button:has-text("Orders"), [data-testid="history-tab"]'
      )
      .first();

    await historyTab.click();

    // Should show order history
    await expect(
      page.locator('[data-testid="order-history"], table, .history-list')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show strain preferences based on history", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

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

    // Look for strain preferences section
    await expect(
      page.locator(
        '[data-testid="strain-preferences"], .strain-preferences, :has-text("Top Strains"), :has-text("Favorite")'
      )
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Customer Wishlist (WS-015) @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display wishlist tab on client profile", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

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

    // Look for wishlist tab
    await requireElement(
      page,
      'button:has-text("Wishlist"), a:has-text("Wishlist"), [data-testid="wishlist-tab"]',
      "Wishlist tab not found"
    );

    const wishlistTab = page
      .locator(
        'button:has-text("Wishlist"), a:has-text("Wishlist"), [data-testid="wishlist-tab"]'
      )
      .first();

    await wishlistTab.click();

    // Should show wishlist content
    await expect(
      page.locator('[data-testid="wishlist-content"], .wishlist')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should allow adding items to wishlist", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

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

    await requireElement(
      page,
      'button:has-text("Wishlist"), a:has-text("Wishlist")',
      "Wishlist tab not found"
    );

    const wishlistTab = page
      .locator('button:has-text("Wishlist"), a:has-text("Wishlist")')
      .first();

    await wishlistTab.click();
    await page.waitForLoadState("networkidle");

    // Look for add to wishlist button
    await expect(
      page.locator(
        'button:has-text("Add"), button:has-text("+ Add Item"), [data-testid="add-wishlist-item"]'
      )
    ).toBeEnabled({ timeout: 5000 });
  });
});

test.describe("Client Search & Filtering @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should search clients by name", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]',
      "Search input not found"
    );

    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]'
      )
      .first();

    await searchInput.fill("test");
    await page.waitForLoadState("networkidle");

    // Search should be applied
    const url = page.url();
    const hasSearchInUrl = url.includes("search") || url.includes("q=");
    expect(hasSearchInUrl).toBeTruthy();
  });

  test("should filter clients by type", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'select[name="type"], [data-testid="type-filter"], button:has-text("Customer"), button:has-text("Supplier")',
      "Type filter not found"
    );

    const typeFilter = page
      .locator(
        'select[name="type"], [data-testid="type-filter"], button:has-text("Customer"), button:has-text("Supplier")'
      )
      .first();

    if (await typeFilter.evaluate(el => el.tagName === "SELECT")) {
      await typeFilter.selectOption({ index: 1 });
    } else {
      await page.locator('button:has-text("Customer")').click();
    }

    await page.waitForLoadState("networkidle");
  });

  test("should use global search to find clients", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for global search
    await requireElement(
      page,
      '[data-testid="global-search"], input[placeholder*="search" i], [role="combobox"]',
      "Global search not found"
    );

    const globalSearch = page
      .locator(
        '[data-testid="global-search"], input[placeholder*="search" i], [role="combobox"]'
      )
      .first();

    await globalSearch.click();
    await globalSearch.fill("client");

    // Should show search results
    await expect(
      page.locator(
        '[data-testid="search-results"], [role="listbox"], .search-results'
      )
    ).toBeVisible({ timeout: 5000 });
  });
});
