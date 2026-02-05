/**
 * Golden Flow Test: Command Palette Scope Enforcement (UXS-603)
 *
 * Cmd/Ctrl+K opens the global command palette. It should support navigation and
 * actions, and must never result in "typing" into underlying forms.
 */

import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

const openCommandPalette = async (page: Page): Promise<Locator> => {
  const isMac = process.platform === "darwin";
  await page.keyboard.press(isMac ? "Meta+k" : "Control+k");

  const dialog = page
    .locator('[role="dialog"]')
    .filter({ has: page.locator('[data-slot="command"]') })
    .first();

  await expect(dialog).toBeVisible({ timeout: 10000 });
  return dialog;
};

test.describe("UXS-603: Command Palette Scope Enforcement", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Cmd+K should open command palette on work surfaces", async ({
    page,
  }) => {
    await page.goto("/orders", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible({
      timeout: 20000,
    });

    const dialog = await openCommandPalette(page);
    const input = dialog.locator('[data-slot="command-input"]').first();

    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test("command palette should offer navigation commands", async ({ page }) => {
    await page.goto("/orders", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible({
      timeout: 20000,
    });

    const dialog = await openCommandPalette(page);
    const input = dialog.locator('[data-slot="command-input"]').first();
    await expect(input).toBeFocused();

    await page.keyboard.type("order");

    const items = dialog.locator('[data-slot="command-item"]');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  test("escape should close command palette", async ({ page }) => {
    await page.goto("/orders", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible({
      timeout: 20000,
    });

    const dialog = await openCommandPalette(page);
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("command palette should not type into underlying forms", async ({
    page,
  }) => {
    await page.goto("/orders/create", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(page.getByText("Select Customer")).toBeVisible({
      timeout: 20000,
    });

    const headerSearch = page
      .locator(
        'input[placeholder^="Search quotes"], input[placeholder*="Search quotes, customers, products"]'
      )
      .first();
    const initialValue = (await headerSearch.inputValue().catch(() => "")) || "";

    const dialog = await openCommandPalette(page);
    await page.keyboard.type("inventory");

    // Ensure we typed into the palette, not the page search input.
    await expect(
      dialog.locator('[data-slot="command-input"]').first()
    ).toHaveValue(/inventory/i);

    const afterValue = (await headerSearch.inputValue().catch(() => "")) || "";
    expect(afterValue).toBe(initialValue);
  });

  test("command palette should not offer data entry actions", async ({
    page,
  }) => {
    await page.goto("/orders", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible({
      timeout: 20000,
    });

    const dialog = await openCommandPalette(page);
    await page.keyboard.type("enter");

    const items = dialog.locator('[data-slot="command-item"]');
    const itemTexts = await items.allTextContents();

    for (const text of itemTexts) {
      const lower = text.toLowerCase();
      expect(lower).not.toContain("enter amount");
      expect(lower).not.toContain("fill form");
      expect(lower).not.toContain("type here");
    }
  });
});
