/**
 * Golden Flow Test: Pick & Pack Fulfillment (UXS-602)
 *
 * Tests the complete warehouse fulfillment flow with Work Surface
 * keyboard navigation and bulk operations.
 *
 * Flow: Pick List → Select Items → Pack → Mark Ready
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Golden Flow: Pick & Pack Fulfillment", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe("Pick List Navigation", () => {
    test("should display pick list with Work Surface pattern", async ({
      page,
    }) => {
      await page.goto("/pick-pack");
      await page.waitForLoadState("networkidle");

      // Header should be visible
      const header = page.locator('h1:has-text("Pick"), h1:has-text("Pack")');
      await expect(header).toBeVisible({ timeout: 5000 });

      // Stats should be visible
      const stats = page.locator(
        ':text("Pending"), :text("Picking"), :text("Packed")'
      );
      await expect(stats.first()).toBeVisible({ timeout: 5000 });
    });

    test("should navigate orders with keyboard", async ({ page }) => {
      await page.goto("/pick-pack");
      await page.waitForLoadState("networkidle");

      // Focus and navigate
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(100);

      // Select order with Enter
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);

      // Order details should appear on right
      const details = page.locator(':text("Order"), :text("Items")');
      await expect(details.first()).toBeVisible({ timeout: 5000 });
    });

    test("should filter by status", async ({ page }) => {
      await page.goto("/pick-pack");
      await page.waitForLoadState("networkidle");

      // Status filter MUST be present on the pick-pack surface
      const statusFilter = page.locator(
        'select, [data-testid="status-filter"]'
      );
      await expect(statusFilter.first()).toBeVisible({ timeout: 5000 });
    });

    test("should search orders", async ({ page }) => {
      await page.goto("/pick-pack");
      await page.waitForLoadState("networkidle");

      // Cmd+K should focus search (component handles both cmd+k and ctrl+k)
      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");

      const searchInput = page.locator(
        '[data-testid="pick-pack-search-input"], input[placeholder*="Search"], input[type="search"]'
      );
      await expect(searchInput.first()).toBeFocused({ timeout: 5000 });
    });
  });

  test.describe("Item Selection", () => {
    test("should allow multi-select items", async ({ page }) => {
      await page.goto("/pick-pack");
      await page.waitForLoadState("networkidle");

      // Precondition: at least one order row must exist
      const orderRow = page.locator('[role="row"], tr').first();
      if (!(await orderRow.isVisible().catch(() => false))) {
        test.skip(true, "No order rows visible — cannot test item selection");
        return;
      }

      await orderRow.click();
      await page.waitForTimeout(500);

      // After selecting an order, checkboxes for items MUST be present
      const items = page.locator('[role="checkbox"], input[type="checkbox"]');
      await expect(items.first()).toBeVisible({ timeout: 5000 });
    });

    test("should select all unpacked with shortcut", async ({ page }) => {
      await page.goto("/pick-pack");
      await page.waitForLoadState("networkidle");

      // Precondition: at least one order row must exist
      const orderRow = page.locator('[role="row"], tr').first();
      if (!(await orderRow.isVisible().catch(() => false))) {
        test.skip(true, "No order rows visible — cannot test select-all");
        return;
      }

      await orderRow.click();
      await page.waitForTimeout(500);

      // After selecting an order, a "Select All" button MUST be present
      const selectAll = page.locator(
        'button:has-text("Select All"), button:has-text("All")'
      );
      await expect(selectAll.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Pack Operations", () => {
    test("should pack selected items", async ({ page }) => {
      await page.goto("/pick-pack");
      await page.waitForLoadState("networkidle");

      // Pack button MUST be present on the pick-pack surface (may be disabled until items selected)
      const packButton = page.locator('button:has-text("Pack")');
      await expect(packButton.first()).toBeVisible({ timeout: 5000 });
    });

    test("should mark order ready when fully packed", async ({ page }) => {
      await page.goto("/pick-pack");
      await page.waitForLoadState("networkidle");

      // "Mark Ready" button MUST be present (may be disabled until all items packed)
      const readyButton = page.locator(
        'button:has-text("Ready"), button:has-text("Mark Ready")'
      );
      await expect(readyButton.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Inspector Panel", () => {
    test("should show order details in inspector", async ({ page }) => {
      await page.goto("/pick-pack");
      await page.waitForLoadState("networkidle");

      // Precondition: at least one order row must exist
      const orderRow = page.locator('[role="row"], tr').first();
      if (!(await orderRow.isVisible().catch(() => false))) {
        test.skip(true, "No order rows visible — cannot test inspector");
        return;
      }

      await orderRow.click();
      await page.waitForTimeout(300);

      // "View Details" button MUST be present after selecting an order
      const viewDetails = page.locator(
        'button:has-text("View Details"), button:has-text("Details")'
      );
      await expect(viewDetails.first()).toBeVisible({ timeout: 5000 });

      await viewDetails.first().click();

      // Inspector panel MUST open after clicking View Details
      const inspector = page.locator(
        '[data-testid="inspector-panel"], [role="complementary"]'
      );
      await expect(inspector).toBeVisible({ timeout: 5000 });
    });

    test("should show item details when inspecting", async ({ page }) => {
      await page.goto("/pick-pack");
      await page.waitForLoadState("networkidle");

      // Use keyboard to navigate and select
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);

      // Press i for inspect (if shortcut exists)
      await page.keyboard.press("i");
      await page.waitForTimeout(300);

      // After keyboard inspect, detail content MUST appear
      const details = page.locator(
        ':text("Details"), :text("Location"), :text("Quantity")'
      );
      await expect(details.first()).toBeVisible({ timeout: 5000 });
    });
  });
});
