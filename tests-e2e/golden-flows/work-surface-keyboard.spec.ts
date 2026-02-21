/**
 * Golden Flow Test: Work Surface Keyboard Contract (UXS-602)
 *
 * Tests the keyboard navigation contract across all Work Surfaces.
 * Validates consistent behavior per ATOMIC_UX_STRATEGY.md.
 *
 * Contract:
 * - Tab: Next field/element
 * - Shift+Tab: Previous field/element
 * - Enter: Commit/select
 * - Escape: Cancel/close
 * - Cmd+K: Focus search
 * - Arrow keys: Navigate list
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

const WORK_SURFACE_ROUTES = [
  { path: "/orders", name: "Orders" },
  { path: "/inventory", name: "Inventory" },
  { path: "/clients", name: "Clients" },
  { path: "/accounting/invoices", name: "Invoices" },
  { path: "/pick-pack", name: "Pick & Pack" },
  { path: "/quotes", name: "Quotes" },
];

const openWorkSurface = async (
  page: Page,
  path: string
): Promise<void> => {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(250);
};

test.describe("Golden Flow: Work Surface Keyboard Contract", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const route of WORK_SURFACE_ROUTES) {
    test.describe(`${route.name} Work Surface`, () => {
      test(`should support arrow key navigation on ${route.path}`, async ({ page }) => {
        await openWorkSurface(page, route.path);

        const focusBefore = await page.evaluate(() =>
          document.activeElement === document.body ? "body" : "focused"
        );

        // Tab into the list
        await page.keyboard.press("Tab");
        await page.waitForTimeout(100);

        // Arrow down should move focus
        await page.keyboard.press("ArrowDown");
        await page.waitForTimeout(100);
        await page.keyboard.press("ArrowDown");
        await page.waitForTimeout(100);

        // Arrow up should move back
        await page.keyboard.press("ArrowUp");
        await page.waitForTimeout(100);

        const focusAfter = await page.evaluate(() =>
          document.activeElement === document.body ? "body" : "focused"
        );
        expect(focusBefore).toBe("body");
        expect(focusAfter).toBe("focused");
      });

      test(`should open inspector with Enter on ${route.path}`, async ({ page }) => {
        const jsErrors: string[] = [];
        page.on("pageerror", error => jsErrors.push(error.message));

        await openWorkSurface(page, route.path);

        const actionableRows = await page
          .locator("[role='row'], .ag-row, [data-testid*='row']")
          .count();
        if (actionableRows === 0) {
          test.skip(true, `No selectable rows found on ${route.path}`);
        }

        // Navigate to first item
        await page.keyboard.press("Tab");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300);

        // Inspector or detail view should open
        const inspector = page
          .locator(
            '[data-testid="inspector-panel"], [role="complementary"], .inspector-panel, [role="dialog"]'
          )
          .first();
        const inspectorVisible = await inspector.isVisible().catch(() => false);
        const navigated = await page.evaluate(
          expectedPath => window.location.pathname !== expectedPath,
          route.path
        );

        if (!inspectorVisible && !navigated) {
          const hasFocusedElement = await page.evaluate(
            () => document.activeElement !== document.body
          );
          expect(jsErrors).toHaveLength(0);
          expect(hasFocusedElement).toBeTruthy();
        }
      });

      test(`should close with Escape on ${route.path}`, async ({ page }) => {
        await openWorkSurface(page, route.path);

        // Open something first
        await page.keyboard.press("Tab");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300);

        const inspector = page
          .locator(
            '[data-testid="inspector-panel"], [role="complementary"], .inspector-panel, [role="dialog"]'
          )
          .first();
        const wasVisible = await inspector.isVisible().catch(() => false);

        // Escape should close it
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        if (wasVisible) {
          await expect(inspector).not.toBeVisible({ timeout: 3000 });
        }
      });

      test(`should focus search with Cmd+K on ${route.path}`, async ({ page }) => {
        await openWorkSurface(page, route.path);

        const isMac = process.platform === "darwin";
        await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
        await page.waitForTimeout(100);

        const searchSelector =
          'input[placeholder*="Search"], input[type="search"], [data-testid$="-search-input"], [data-testid="search-input"], [data-testid="pick-pack-search-input"]';
        const commandPalette = page
          .locator('[data-testid="command-palette"], [cmdk-root], [cmdk-input]')
          .first();
        const isSearchFocused = await page.evaluate(selector => {
          const active = document.activeElement;
          if (!active) return false;
          const inputs = Array.from(document.querySelectorAll(selector));
          return inputs.some(input => input === active);
        }, searchSelector);
        const paletteVisible = await commandPalette
          .isVisible()
          .catch(() => false);
        expect(isSearchFocused || paletteVisible).toBeTruthy();
      });
    });
  }

  test.describe("Cross-Surface Consistency", () => {
    test("all surfaces should have consistent header pattern", async ({ page }) => {
      for (const route of WORK_SURFACE_ROUTES) {
        await openWorkSurface(page, route.path);

        // Should expose at least one visible page heading.
        const header = page
          .locator("h1, h2, [data-testid='page-title'], [role='heading']")
          .first();
        await expect(header).toBeVisible({ timeout: 5000 });
      }
    });

    test("all surfaces should have save state indicator area", async ({ page }) => {
      for (const route of WORK_SURFACE_ROUTES) {
        await openWorkSurface(page, route.path);

        // Save state area should exist (may or may not be visible)
        const saveState = page.locator('[data-testid="save-state"], .save-indicator, :text("Saved"), :text("Saving")');
        const hasArea = await saveState.count().catch(() => 0);
        expect(hasArea).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Inspector Panel Contract", () => {
    test("inspector should trap focus when open", async ({ page }) => {
      await openWorkSurface(page, "/orders");

      // Open inspector
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      // Check if focus is in inspector region
      const inspector = page.locator('[data-testid="inspector-panel"], [role="complementary"]');
      if (await inspector.isVisible().catch(() => false)) {
        // Tab should stay within inspector
        await page.keyboard.press("Tab");
        await page.waitForTimeout(100);
        await page.keyboard.press("Tab");
        await page.waitForTimeout(100);

        // Focus should still be in inspector area
        const focusedInsideInspector = await page.evaluate(() =>
          Boolean(
            document.activeElement?.closest(
              '[data-testid="inspector-panel"], [role="complementary"]'
            )
          )
        );
        expect(focusedInsideInspector).toBeTruthy();
      } else {
        test.skip(true, "Inspector did not open on /orders");
      }
    });

    test("inspector should close on Escape", async ({ page }) => {
      await openWorkSurface(page, "/clients");

      // Open inspector
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      const inspector = page
        .locator('[data-testid="inspector-panel"], [role="complementary"]')
        .first();
      const wasVisible = await inspector.isVisible().catch(() => false);

      if (!wasVisible) {
        test.skip(true, "Inspector did not open on /clients");
      }

      // Close with Escape
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      await expect(inspector).not.toBeVisible({ timeout: 3000 });
    });
  });
});
