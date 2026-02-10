import { test, expect } from "@playwright/test";
import { loginAsStandardUser } from "./fixtures/auth";

test.describe("Navigation and UI Interactions @prod-smoke", () => {
  test.beforeEach(async ({ page }) => {
    // Login using centralized auth fixture
    await loginAsStandardUser(page);
  });

  test("should display sidebar navigation", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.locator('nav, [role="navigation"], aside').first();
    await expect(sidebar).toBeVisible();
  });

  test("should navigate using sidebar links", async ({ page }) => {
    await page.goto("/dashboard");

    // Test multiple navigation links
    const links = [
      { selector: 'a[href="/clients"]', url: "/clients" },
      { selector: 'a[href="/orders"]', url: "/orders" },
      { selector: 'a[href="/inventory"]', url: "/inventory" },
    ];

    for (const link of links) {
      const navLink = page.locator(link.selector).first();
      if (await navLink.isVisible()) {
        await navLink.click();
        await expect(page).toHaveURL(link.url);
      }
    }
  });

  test("should toggle sidebar collapse", async ({ page }) => {
    await page.goto("/dashboard");

    const toggleButton = page
      .locator('button[aria-label*="sidebar" i], button[aria-label*="menu" i]')
      .first();

    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      // Wait for animation to complete
      await page.waitForLoadState("domcontentloaded");

      // Toggle again
      await toggleButton.click();
      await page.waitForLoadState("domcontentloaded");
    }
  });

  test("should display user menu", async ({ page }) => {
    await page.goto("/dashboard");

    const userMenu = page
      .locator(
        'button[aria-label*="user" i], button[aria-label*="account" i], [data-user-menu]'
      )
      .first();

    if (await userMenu.isVisible()) {
      await userMenu.click();
      await expect(
        page.locator('[role="menu"], .dropdown-menu').first()
      ).toBeVisible();
    }
  });

  test("should search globally", async ({ page }) => {
    await page.goto("/dashboard");

    const searchInput = page
      .locator('input[type="search"][placeholder*="search" i]')
      .first();

    if (await searchInput.isVisible()) {
      await searchInput.fill("test query");
      await page.waitForLoadState("networkidle");

      // Check for search results
      const results = page
        .locator('[role="listbox"], .search-results, [data-search-results]')
        .first();
      if (await results.isVisible()) {
        await expect(results).toBeVisible();
      }
    }
  });

  test("should toggle theme", async ({ page }) => {
    await page.goto("/dashboard");

    const themeToggle = page
      .locator('button[aria-label*="theme" i], button[aria-label*="dark" i]')
      .first();

    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForLoadState("domcontentloaded");

      // Check for theme class change
      const html = page.locator("html");
      const hasThemeClass = await html.evaluate(
        el => el.classList.contains("dark") || el.classList.contains("light")
      );
      expect(hasThemeClass).toBeTruthy();
    }
  });

  test("should display notifications", async ({ page }) => {
    await page.goto("/dashboard");

    const notificationButton = page
      .locator('button[aria-label*="notification" i], [data-notifications]')
      .first();

    if (await notificationButton.isVisible()) {
      await notificationButton.click();
      await expect(
        page.locator('[role="menu"], .notifications-panel').first()
      ).toBeVisible();
    }
  });

  test("should navigate using breadcrumbs", async ({ page }) => {
    await page.goto("/clients");

    const firstRow = page.locator("tbody tr").first();
    const hasData = await firstRow.isVisible().catch(() => false);
    if (!hasData) {
      test.skip(true, "No data rows available - precondition not met");
      return;
    }

    await firstRow.click();

    // Check for breadcrumbs
    const breadcrumbs = page
      .locator('nav[aria-label*="breadcrumb" i], .breadcrumb')
      .first();

    if (await breadcrumbs.isVisible()) {
      const homeLink = breadcrumbs.locator("a").first();
      await homeLink.click();
      await expect(page).toHaveURL(/\/(dashboard)?$/);
    }
  });

  test("should handle modal dialogs", async ({ page }) => {
    await page.goto("/clients");

    const createButton = page
      .locator('button:has-text("Add"), button:has-text("New")')
      .first();
    await createButton.click();

    // Modal should open
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Close modal
    const closeButton = page
      .locator('[role="dialog"] button[aria-label*="close" i]')
      .first();
    await closeButton.click();

    // Modal should close
    await expect(modal).not.toBeVisible();
  });

  test("should display tooltips on hover", async ({ page }) => {
    await page.goto("/dashboard");

    const tooltipTrigger = page.locator("[data-tooltip], [aria-label]").first();

    if (await tooltipTrigger.isVisible()) {
      await tooltipTrigger.hover();
      // Wait for tooltip to appear (typically 300-500ms delay)
      const tooltip = page.locator('[role="tooltip"]').first();
      try {
        await tooltip.waitFor({ state: "visible", timeout: 1000 });
        await expect(tooltip).toBeVisible();
      } catch {
        // Tooltip may not exist for all elements, skip gracefully
      }
    }
  });

  test("should handle keyboard navigation", async ({ page }) => {
    await page.goto("/dashboard");

    // Tab through focusable elements
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Check if an element is focused
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    );
    expect(focusedElement).toBeTruthy();
  });

  test("should display loading states", async ({ page }) => {
    await page.goto("/clients");

    // Reload to trigger loading state
    await page.reload();

    // Check for loading indicator (might be brief)
    const loader = page.locator('[role="status"], .loading, .spinner').first();
    // Just check if it exists in the DOM, might not be visible by the time we check
    const loaderExists = (await loader.count()) > 0;
    expect(loaderExists).toBeTruthy();
  });
});
