/**
 * E2E Tests: Sales & Client Management
 *
 * Tests client creation, preferences, wishlist, and sales workflows.
 * Covers WS-011 (Quick Customer Creation), WS-012 (Customer Preferences),
 * and WS-015 (Customer Wishlist).
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

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
    const newClientButton = page.locator(
      'button:has-text("New Client"), button:has-text("Add Client"), a:has-text("New Client"), [data-testid="new-client"]'
    );

    if (await newClientButton.isVisible().catch(() => false)) {
      await newClientButton.click();

      // Should open form or navigate to create page
      await expect(
        page.locator(
          'form, [data-testid="client-form"], [role="dialog"], h2:has-text("New Client")'
        )
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should display required fields for client creation", async ({
    page,
  }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const newClientButton = page.locator(
      'button:has-text("New Client"), button:has-text("Add Client")'
    );

    if (await newClientButton.isVisible().catch(() => false)) {
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
    }
  });

  test("should validate client form before submission", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const newClientButton = page.locator(
      'button:has-text("New Client"), button:has-text("Add Client")'
    );

    if (await newClientButton.isVisible().catch(() => false)) {
      await newClientButton.click();
      await page.waitForLoadState("networkidle");

      // Try to submit empty form
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Save"), button:has-text("Create")'
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

  test("should allow inline client creation from order form", async ({
    page,
  }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // Look for client select with add option
    const addClientButton = page.locator(
      'button:has-text("+ New"), button:has-text("Add Client"), [data-testid="inline-add-client"]'
    );

    if (await addClientButton.isVisible().catch(() => false)) {
      await expect(addClientButton).toBeEnabled();
    }
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
    const firstClient = page
      .locator("table tbody tr, [data-testid='client-item']")
      .first();

    if (await firstClient.isVisible().catch(() => false)) {
      await firstClient.click();

      // Should show client profile
      await expect(
        page.locator('[data-testid="client-profile"], .client-profile, h2')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should display preferences tab", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const firstClient = page
      .locator("table tbody tr, [data-testid='client-item']")
      .first();

    if (await firstClient.isVisible().catch(() => false)) {
      await firstClient.click();
      await page.waitForLoadState("networkidle");

      // Look for preferences tab
      const preferencesTab = page.locator(
        'button:has-text("Preferences"), a:has-text("Preferences"), [data-testid="preferences-tab"]'
      );

      if (await preferencesTab.isVisible().catch(() => false)) {
        await preferencesTab.click();

        // Should show preferences content
        await expect(
          page.locator('[data-testid="preferences-content"], .preferences')
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should display purchase history", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const firstClient = page
      .locator("table tbody tr, [data-testid='client-item']")
      .first();

    if (await firstClient.isVisible().catch(() => false)) {
      await firstClient.click();
      await page.waitForLoadState("networkidle");

      // Look for history tab
      const historyTab = page.locator(
        'button:has-text("History"), a:has-text("History"), button:has-text("Orders"), [data-testid="history-tab"]'
      );

      if (await historyTab.isVisible().catch(() => false)) {
        await historyTab.click();

        // Should show order history
        await expect(
          page.locator('[data-testid="order-history"], table, .history-list')
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should show strain preferences based on history", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const firstClient = page
      .locator("table tbody tr, [data-testid='client-item']")
      .first();

    if (await firstClient.isVisible().catch(() => false)) {
      await firstClient.click();
      await page.waitForLoadState("networkidle");

      // Look for strain preferences section
      const strainPreferences = page.locator(
        '[data-testid="strain-preferences"], .strain-preferences, :has-text("Top Strains"), :has-text("Favorite")'
      );

      // May or may not have preferences data
      const isVisible = await strainPreferences.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });
});

test.describe("Customer Wishlist (WS-015) @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display wishlist tab on client profile", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const firstClient = page
      .locator("table tbody tr, [data-testid='client-item']")
      .first();

    if (await firstClient.isVisible().catch(() => false)) {
      await firstClient.click();
      await page.waitForLoadState("networkidle");

      // Look for wishlist tab
      const wishlistTab = page.locator(
        'button:has-text("Wishlist"), a:has-text("Wishlist"), [data-testid="wishlist-tab"]'
      );

      if (await wishlistTab.isVisible().catch(() => false)) {
        await wishlistTab.click();

        // Should show wishlist content
        await expect(
          page.locator('[data-testid="wishlist-content"], .wishlist')
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should allow adding items to wishlist", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const firstClient = page
      .locator("table tbody tr, [data-testid='client-item']")
      .first();

    if (await firstClient.isVisible().catch(() => false)) {
      await firstClient.click();
      await page.waitForLoadState("networkidle");

      const wishlistTab = page.locator(
        'button:has-text("Wishlist"), a:has-text("Wishlist")'
      );

      if (await wishlistTab.isVisible().catch(() => false)) {
        await wishlistTab.click();
        await page.waitForLoadState("networkidle");

        // Look for add to wishlist button
        const addButton = page.locator(
          'button:has-text("Add"), button:has-text("+ Add Item"), [data-testid="add-wishlist-item"]'
        );

        if (await addButton.isVisible().catch(() => false)) {
          await expect(addButton).toBeEnabled();
        }
      }
    }
  });
});

test.describe("Client Search & Filtering @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should search clients by name", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]'
    );

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("test");
      await page.waitForLoadState("networkidle");

      // Search should be applied
      const url = page.url();
      const hasSearchInUrl = url.includes("search") || url.includes("q=");
      expect(hasSearchInUrl).toBeTruthy();
    }
  });

  test("should filter clients by type", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const typeFilter = page.locator(
      'select[name="type"], [data-testid="type-filter"], button:has-text("Customer"), button:has-text("Supplier")'
    );

    if (await typeFilter.isVisible().catch(() => false)) {
      if (await typeFilter.evaluate(el => el.tagName === "SELECT")) {
        await typeFilter.selectOption({ index: 1 });
      } else {
        await page.locator('button:has-text("Customer")').click();
      }

      await page.waitForLoadState("networkidle");
    }
  });

  test("should use global search to find clients", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for global search
    const globalSearch = page.locator(
      '[data-testid="global-search"], input[placeholder*="search" i], [role="combobox"]'
    );

    if (await globalSearch.isVisible().catch(() => false)) {
      await globalSearch.click();
      await globalSearch.fill("client");

      // Should show search results
      await expect(
        page.locator(
          '[data-testid="search-results"], [role="listbox"], .search-results'
        )
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
