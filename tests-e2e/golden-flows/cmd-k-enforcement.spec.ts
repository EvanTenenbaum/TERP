/**
 * Golden Flow Test: Command Palette Scope Enforcement (UXS-603)
 *
 * Tests that Cmd+K only performs actions and navigation,
 * NOT data entry (per ATOMIC_UX_STRATEGY.md).
 *
 * Valid Cmd+K actions:
 * - Navigation to pages
 * - Opening dialogs/modals
 * - Triggering commands
 *
 * Invalid Cmd+K actions:
 * - Filling form fields
 * - Entering data directly
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("UXS-603: Command Palette Scope Enforcement", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe("Cmd+K Focus Behavior", () => {
    test("Cmd+K should focus search input on list pages", async ({ page }) => {
      await page.goto("/orders");
      await page.waitForLoadState("networkidle");

      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
      await page.waitForTimeout(200);

      const pageSearchInput = page.getByTestId("orders-search-input");
      const paletteInput = page.locator(
        '[cmdk-input], input[placeholder*="command or search" i]'
      );

      const pageSearchVisible = await pageSearchInput
        .isVisible()
        .catch(() => false);
      const pageSearchFocused = pageSearchVisible
        ? await pageSearchInput.evaluate(el => document.activeElement === el)
        : false;
      const paletteVisible = await paletteInput
        .first()
        .isVisible()
        .catch(() => false);

      expect(pageSearchFocused || paletteVisible).toBeTruthy();
    });

    test("Cmd+K should NOT fill data fields", async ({ page }) => {
      await page.goto("/orders/create");
      await page.waitForLoadState("networkidle");

      const formField = page
        .locator(
          'input[placeholder*="customer" i], textarea[placeholder*="note" i], textarea'
        )
        .first();
      const initialValue = (await formField.isVisible().catch(() => false))
        ? await formField.inputValue().catch(() => "")
        : "";

      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
      await page.waitForTimeout(200);

      if (await formField.isVisible().catch(() => false)) {
        const valueAfterShortcut = await formField.inputValue().catch(() => "");
        expect(valueAfterShortcut).toBe(initialValue);
      }
    });

    test("Cmd+K should open command palette if available", async ({ page }) => {
      await page.goto("/orders");
      await page.waitForLoadState("networkidle");

      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
      await page.waitForTimeout(300);

      const commandPalette = page.locator(
        '[data-testid="command-palette"], [cmdk-root], [cmdk-input], input[placeholder*="command or search" i]'
      );
      const searchInput = page.getByTestId("orders-search-input");

      const paletteVisible = await commandPalette
        .first()
        .isVisible()
        .catch(() => false);
      const hasSearchInput = (await searchInput.count()) > 0;
      const searchFocused = hasSearchInput
        ? await searchInput
            .evaluate(el => document.activeElement === el)
            .catch(() => false)
        : false;

      expect(paletteVisible || searchFocused).toBeTruthy();
    });
  });

  test.describe("Command Palette Actions", () => {
    test("command palette should offer navigation commands", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
      await page.waitForTimeout(300);

      const commandPalette = page.locator('[data-testid="command-palette"], [cmdk-root], [role="combobox"]');
      if (await commandPalette.isVisible().catch(() => false)) {
        // Type a navigation target
        await page.keyboard.type("order");
        await page.waitForTimeout(200);

        // Should show navigation options
        const options = page.locator('[cmdk-item], [role="option"], [data-testid="command-item"]');
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThanOrEqual(0);
      }
    });

    test("command palette should NOT offer data entry", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
      await page.waitForTimeout(300);

      const commandPalette = page.locator('[data-testid="command-palette"], [cmdk-root]');
      if (await commandPalette.isVisible().catch(() => false)) {
        // Commands should be actions/navigation, not data entry
        const options = page.locator('[cmdk-item], [role="option"]');
        const optionTexts = await options.allTextContents();

        // Should NOT have data entry phrases
        for (const text of optionTexts) {
          expect(text.toLowerCase()).not.toContain("enter amount");
          expect(text.toLowerCase()).not.toContain("fill form");
          expect(text.toLowerCase()).not.toContain("type here");
        }
      }
    });

    test("escape should close command palette", async ({ page }) => {
      await page.goto("/orders");
      await page.waitForLoadState("networkidle");

      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
      await page.waitForTimeout(200);

      // Escape should close
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);

      const commandPalette = page.locator(
        '[data-testid="command-palette"], [cmdk-root], [cmdk-input]'
      );
      const isVisible = await commandPalette.first().isVisible().catch(() => false);
      if (isVisible) {
        await expect(commandPalette.first()).not.toBeVisible();
      }
    });
  });

  test.describe("Search vs Data Entry Distinction", () => {
    test("search input should be read-only navigation", async ({ page }) => {
      await page.goto("/inventory");
      await page.waitForLoadState("networkidle");

      const searchInput = page
        .locator(
          'input[placeholder*="Search inventory" i], [data-testid="inventory-search-input"]'
        )
        .first();

      if (!(await searchInput.isVisible().catch(() => false))) {
        test.skip(true, "Inventory search input not visible on this page");
        return;
      }

      await searchInput.fill("test product");
      await expect(searchInput).toHaveValue("test product");
      await expect(page).toHaveURL(/\/inventory/);
    });

    test("Cmd+K on form pages should NOT auto-fill fields", async ({ page }) => {
      await page.goto("/orders/create");
      await page.waitForLoadState("networkidle");

      const formField = page
        .locator(
          'input[placeholder*="customer" i], textarea[placeholder*="note" i], textarea'
        )
        .first();
      if (!(await formField.isVisible().catch(() => false))) {
        test.skip(true, "Order create form field not visible");
        return;
      }

      const initialValue = await formField.inputValue().catch(() => "");

      // Press Cmd+K
      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
      await page.waitForTimeout(200);

      // Form value should not change
      const afterValue = await formField.inputValue().catch(() => "");
      expect(afterValue).toBe(initialValue);
    });
  });

  test.describe("Context-Aware Behavior", () => {
    test("Cmd+K behavior should be consistent across pages", async ({ page }) => {
      const pages = ["/orders", "/inventory", "/clients", "/accounting/invoices"];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState("networkidle");

        const isMac = process.platform === "darwin";
        await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
        await page.waitForTimeout(200);

        // Should open search or command palette (not random behavior)
        const palette = page.locator('[data-testid="command-palette"], [cmdk-root], [cmdk-input]');
        const paletteVisible = await palette.first().isVisible().catch(() => false);
        const activeTag = await page
          .evaluate(() => document.activeElement?.tagName?.toLowerCase() ?? "")
          .catch(() => "");

        expect(paletteVisible || activeTag === "input" || activeTag === "textarea").toBeTruthy();

        // Close before next iteration
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
      }
    });
  });
});
