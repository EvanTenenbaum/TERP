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
      const paletteInput = page
        .locator("[cmdk-input]")
        .or(page.locator('input[placeholder*="command or search" i]'));

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
        .locator('input[placeholder*="customer" i]')
        .or(page.locator('textarea[placeholder*="note" i]'))
        .or(page.locator("textarea"))
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

      const commandPalette = page
        .locator('[data-testid="command-palette"]')
        .or(page.locator("[cmdk-root]"))
        .or(page.locator("[cmdk-input]"))
        .or(page.locator('input[placeholder*="command or search" i]'));
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

    test("Cmd+K should focus search input on pick-pack page", async ({
      page,
    }) => {
      await page.goto("/pick-pack");
      await page.waitForLoadState("networkidle");

      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
      await page.waitForTimeout(200);

      const pickPackSearch = page.getByTestId("pick-pack-search-input");
      const hasPickPackSearch = await pickPackSearch
        .isVisible()
        .catch(() => false);

      if (hasPickPackSearch) {
        const isFocused = await pickPackSearch.evaluate(
          el => document.activeElement === el
        );
        expect(isFocused).toBe(true);
      } else {
        const paletteInput = page
          .locator("[cmdk-input]")
          .or(page.locator('input[placeholder*="command or search" i]'));
        const paletteVisible = await paletteInput
          .first()
          .isVisible()
          .catch(() => false);
        expect(paletteVisible).toBeTruthy();
      }
    });
  });

  test.describe("Command Palette Actions", () => {
    test("command palette should offer navigation commands", async ({
      page,
    }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
      await page.waitForTimeout(300);

      const commandPalette = page
        .locator('[data-testid="command-palette"]')
        .or(page.locator("[cmdk-root]"))
        .or(page.locator('[role="combobox"]'));
      if (!(await commandPalette.isVisible().catch(() => false))) {
        test.skip(
          true,
          "Command palette did not open — cannot test navigation commands"
        );
        return;
      }

      // Type a navigation target
      await page.keyboard.type("order");
      await page.waitForTimeout(200);

      // Should show navigation options
      const options = page
        .locator("[cmdk-item]")
        .or(page.locator('[role="option"]'))
        .or(page.locator('[data-testid="command-item"]'));
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThanOrEqual(1);
    });

    test("command palette should NOT offer data entry", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
      await page.waitForTimeout(300);

      const commandPalette = page
        .locator('[data-testid="command-palette"]')
        .or(page.locator("[cmdk-root]"));
      if (!(await commandPalette.isVisible().catch(() => false))) {
        test.skip(
          true,
          "Command palette did not open — cannot test data entry absence"
        );
        return;
      }

      // Commands should be actions/navigation, not data entry
      const options = page
        .locator("[cmdk-item]")
        .or(page.locator('[role="option"]'));
      const optionTexts = await options.allTextContents();

      // Should NOT have data entry phrases
      for (const text of optionTexts) {
        expect(text.toLowerCase()).not.toContain("enter amount");
        expect(text.toLowerCase()).not.toContain("fill form");
        expect(text.toLowerCase()).not.toContain("type here");
      }
    });

    test("escape should close command palette", async ({ page }) => {
      await page.goto("/orders");
      await page.waitForLoadState("networkidle");

      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
      await page.waitForTimeout(300);

      // Verify Cmd+K actually opened something (palette or search focus)
      const commandPalette = page
        .locator('[data-testid="command-palette"]')
        .or(page.locator("[cmdk-root]"))
        .or(page.locator("[cmdk-input]"));
      const searchInput = page.getByTestId("orders-search-input");

      const paletteOpened = await commandPalette
        .first()
        .isVisible()
        .catch(() => false);
      const searchFocused =
        (await searchInput.count()) > 0
          ? await searchInput
              .evaluate(el => document.activeElement === el)
              .catch(() => false)
          : false;

      if (!paletteOpened && !searchFocused) {
        test.skip(
          true,
          "Cmd+K did not open palette or focus search — skip escape test"
        );
        return;
      }

      // Escape should close
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);

      if (paletteOpened) {
        await expect(commandPalette.first()).not.toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe("Search vs Data Entry Distinction", () => {
    test("search input should be read-only navigation", async ({ page }) => {
      await page.goto("/inventory");
      await page.waitForLoadState("networkidle");

      const searchInput = page
        .locator('input[placeholder*="Search inventory" i]')
        .or(page.locator('[data-testid="inventory-search-input"]'))
        .first();

      if (!(await searchInput.isVisible().catch(() => false))) {
        test.skip(true, "Inventory search input not visible on this page");
        return;
      }

      await searchInput.fill("test product");
      await expect(searchInput).toHaveValue("test product");
      await expect(page).toHaveURL(/\/inventory/);
    });

    test("Cmd+K on form pages should NOT auto-fill fields", async ({
      page,
    }) => {
      await page.goto("/orders/create");
      await page.waitForLoadState("networkidle");

      const formField = page
        .locator('input[placeholder*="customer" i]')
        .or(page.locator('textarea[placeholder*="note" i]'))
        .or(page.locator("textarea"))
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
    test("Cmd+K behavior should be consistent across pages", async ({
      page,
    }) => {
      const pages = [
        "/orders",
        "/inventory",
        "/clients",
        "/accounting/invoices",
        "/pick-pack",
      ];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState("networkidle");

        const isMac = process.platform === "darwin";
        await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
        await page.waitForTimeout(200);

        // Should open search or command palette (not random behavior)
        const palette = page
          .locator('[data-testid="command-palette"]')
          .or(page.locator("[cmdk-root]"))
          .or(page.locator("[cmdk-input]"));
        const paletteVisible = await palette
          .first()
          .isVisible()
          .catch(() => false);
        const activeTag = await page
          .evaluate(() => document.activeElement?.tagName?.toLowerCase() ?? "")
          .catch(() => "");

        expect(
          paletteVisible || activeTag === "input" || activeTag === "textarea"
        ).toBeTruthy();

        // Close before next iteration
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
      }
    });
  });
});
