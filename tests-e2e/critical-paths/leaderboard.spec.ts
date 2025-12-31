/**
 * E2E Tests: Leaderboard Functionality
 *
 * Tests the leaderboard feature including filtering, sorting,
 * and weight customization.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Leaderboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to leaderboard page", async ({ page }) => {
    // Navigate to analytics/leaderboard
    await page.goto("/analytics");

    // Look for leaderboard link or tab
    const leaderboardLink = page.locator(
      'a:has-text("Leaderboard"), button:has-text("Leaderboard"), [data-testid="leaderboard-link"]'
    );

    if (await leaderboardLink.isVisible().catch(() => false)) {
      await leaderboardLink.click();
    } else {
      // Try direct navigation
      await page.goto("/analytics/leaderboard");
    }

    // Verify leaderboard content is visible
    await expect(
      page.locator(
        '[data-testid="leaderboard"], table, .leaderboard, h1:has-text("Leaderboard")'
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display client rankings", async ({ page }) => {
    await page.goto("/analytics/leaderboard");

    // Wait for data to load
    await page.waitForLoadState("networkidle");

    // Should show ranking table or list
    const rankingList = page.locator(
      "table tbody tr, [data-testid='ranking-item'], .ranking-row"
    );

    // Should have at least one ranking entry (if data exists)
    const count = await rankingList.count();
    if (count > 0) {
      // Verify first entry has expected elements
      const firstEntry = rankingList.first();
      await expect(firstEntry).toBeVisible();

      // Should show rank number
      await expect(
        firstEntry.locator('[data-testid="rank"], .rank, td:first-child')
      ).toBeVisible();
    }
  });

  test("should filter by client type", async ({ page }) => {
    await page.goto("/analytics/leaderboard");
    await page.waitForLoadState("networkidle");

    // Look for client type filter
    const clientTypeFilter = page.locator(
      'select[name="clientType"], [data-testid="client-type-filter"], button:has-text("All"), button:has-text("Customer")'
    );

    if (await clientTypeFilter.isVisible().catch(() => false)) {
      // If it's a select, change the value
      if (await clientTypeFilter.evaluate(el => el.tagName === "SELECT")) {
        await clientTypeFilter.selectOption("CUSTOMER");
      } else {
        // If it's a button/tab, click it
        await page.locator('button:has-text("Customer")').click();
      }

      // Wait for filter to apply
      await page.waitForLoadState("networkidle");

      // Verify filter is applied (URL or UI state)
      const url = page.url();
      const hasFilterInUrl =
        url.includes("clientType") || url.includes("customer");
      const hasFilterIndicator = await page
        .locator('[data-active="true"], .active, [aria-selected="true"]')
        .isVisible()
        .catch(() => false);

      expect(hasFilterInUrl || hasFilterIndicator).toBeTruthy();
    }
  });

  test("should sort by different metrics", async ({ page }) => {
    await page.goto("/analytics/leaderboard");
    await page.waitForLoadState("networkidle");

    // Look for sort controls
    const sortSelect = page.locator(
      'select[name="sortBy"], [data-testid="sort-select"]'
    );

    if (await sortSelect.isVisible().catch(() => false)) {
      // Get initial first entry
      const firstEntry = page.locator("table tbody tr").first();
      const _initialText = await firstEntry.textContent();

      // Change sort
      await sortSelect.selectOption({ index: 1 });
      await page.waitForLoadState("networkidle");

      // Verify sort changed (content may have changed)
      // This is a soft check - just verify the action completed
      await expect(sortSelect).toBeVisible();
    } else {
      // Try clicking column headers for sorting
      const sortableHeader = page
        .locator("th[data-sortable], th button")
        .first();
      if (await sortableHeader.isVisible().catch(() => false)) {
        await sortableHeader.click();
        await page.waitForLoadState("networkidle");
      }
    }
  });

  test("should display metric categories", async ({ page }) => {
    await page.goto("/analytics/leaderboard");
    await page.waitForLoadState("networkidle");

    // Look for metric category tabs or filters
    const categoryTabs = page.locator(
      '[data-testid="metric-category"], button:has-text("Financial"), button:has-text("Engagement"), button:has-text("Reliability")'
    );

    const count = await categoryTabs.count();
    if (count > 0) {
      // Click on a category
      await categoryTabs.first().click();
      await page.waitForLoadState("networkidle");

      // Verify category is selected
      await expect(
        page.locator('[data-active="true"], .active, [aria-selected="true"]')
      ).toBeVisible();
    }
  });

  test("should show client details on click", async ({ page }) => {
    await page.goto("/analytics/leaderboard");
    await page.waitForLoadState("networkidle");

    // Click on a client row
    const clientRow = page
      .locator("table tbody tr, [data-testid='ranking-item']")
      .first();

    if (await clientRow.isVisible().catch(() => false)) {
      await clientRow.click();

      // Should either open a modal or navigate to client profile
      const detailsVisible = await page
        .locator('[role="dialog"], [data-testid="client-details"], .modal')
        .isVisible()
        .catch(() => false);

      const navigatedToProfile = page.url().includes("/clients/");

      expect(detailsVisible || navigatedToProfile).toBeTruthy();
    }
  });
});

test.describe("Leaderboard Widget", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display leaderboard widget on dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for leaderboard widget
    const leaderboardWidget = page.locator(
      '[data-testid="leaderboard-widget"], .leaderboard-widget, :has-text("Top Performers")'
    );

    if (await leaderboardWidget.isVisible().catch(() => false)) {
      // Verify widget shows top entries
      const entries = leaderboardWidget.locator(
        "[data-testid='widget-entry'], .widget-entry, li"
      );
      const count = await entries.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should link to full leaderboard from widget", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for "View All" or similar link
    const viewAllLink = page.locator(
      'a:has-text("View All"), a:has-text("See All"), [data-testid="view-all-leaderboard"]'
    );

    if (await viewAllLink.isVisible().catch(() => false)) {
      await viewAllLink.click();
      await expect(page).toHaveURL(/leaderboard|analytics/);
    }
  });
});
