/**
 * E2E Tests: Sales Sheet Workflow (Sprint D - TEST-001)
 *
 * Tests the complete sales sheet workflow:
 * Sales Sheet Creation → Quote → Order Conversion
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Sales Sheet Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to sales sheet creator", async ({ page }) => {
    await page.goto("/sales-sheets");

    await expect(
      page
        .locator('[data-testid="sales-sheet-page"], main')
        .filter({ hasText: /sales sheet creator|sales sheets/i })
        .first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("should render sales sheet creator controls", async ({ page }) => {
    await page.goto("/sales-sheets");
    await page.waitForLoadState("networkidle");

    // Current flow lands directly on the creator; validate core creation controls.
    await expect(
      page.locator("text=/sales sheet creator|select client/i").first()
    ).toBeVisible({ timeout: 10000 });

    const clientSelector = page.locator(
      '[role="combobox"]:has-text("Choose a client"), [role="combobox"][aria-label*="client" i], [data-testid="client-select"]'
    );
    await expect(clientSelector.first()).toBeVisible({ timeout: 5000 });
    await expect(clientSelector.first()).toBeEnabled();

    await expect(page.locator('button:has-text("Load")')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('button:has-text("Save Draft")')).toBeVisible({
      timeout: 5000,
    });
  });

  test.skip("should save sales sheet as draft", async ({ page }) => {
    // TODO: This test requires a pre-created sales sheet with data.
    // Skipping until we have proper test data setup or can create a sheet programmatically.
    await page.goto("/sales-sheets");
    await page.waitForLoadState("networkidle");

    // Look for save draft button
    const saveDraftButton = page.locator(
      'button:has-text("Save Draft"), button:has-text("Save"), [data-testid="save-draft"]'
    );

    await expect(saveDraftButton).toBeVisible({ timeout: 10000 });
    await saveDraftButton.click();

    // Should show success message or draft indicator
    await expect(
      page.locator(
        '[data-testid="draft-saved"], .toast:has-text("saved"), [role="alert"]:has-text("saved")'
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test.skip("should load existing draft", async ({ page }) => {
    // TODO: This test requires pre-existing draft data.
    // Skipping until we have proper test data setup.
    await page.goto("/sales-sheets");
    await page.waitForLoadState("networkidle");

    // Look for drafts list or load draft button
    const loadDraftButton = page.locator(
      'button:has-text("Load Draft"), button:has-text("Drafts"), [data-testid="load-draft"]'
    );

    await expect(loadDraftButton).toBeVisible({ timeout: 10000 });
    await loadDraftButton.click();
    await page.waitForLoadState("networkidle");

    // Should show draft list or load draft
    await expect(
      page.locator('[data-testid="draft-list"], [role="dialog"], .draft-item')
    ).toBeVisible({ timeout: 5000 });
  });

  test.skip("should add items to sales sheet", async ({ page }) => {
    // TODO: This test requires a sales sheet creation flow to be completed first.
    // Skipping until we have proper test data setup.
    await page.goto("/sales-sheets");
    await page.waitForLoadState("networkidle");

    // Look for add item button
    const addItemButton = page.locator(
      'button:has-text("Add Item"), button:has-text("Add Product"), [data-testid="add-item"]'
    );

    await expect(addItemButton).toBeVisible({ timeout: 10000 });
    await addItemButton.click();

    // Should show item selection or form
    await expect(
      page.locator(
        '[data-testid="item-selector"], [role="dialog"], select, input[placeholder*="product" i]'
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test.skip("should convert sales sheet to quote", async ({ page }) => {
    // TODO: This test requires a completed sales sheet with items.
    // Skipping until we have proper test data setup.
    await page.goto("/sales-sheets");
    await page.waitForLoadState("networkidle");

    // Look for convert to quote button
    const convertButton = page.locator(
      'button:has-text("Convert to Quote"), button:has-text("Create Quote"), [data-testid="convert-quote"]'
    );

    await expect(convertButton).toBeVisible({ timeout: 10000 });
    await expect(convertButton).toBeEnabled();
  });
});

test.describe("Quote Creation from Sales Sheet", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to quotes page", async ({ page }) => {
    await page.goto("/quotes");

    await expect(
      page.locator('h1:has-text("Quote"), [data-testid="quotes-page"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test.skip("should display quote with discount", async ({ page }) => {
    // TODO: This test requires existing quote data with discount information.
    // Skipping until we have proper test data seeding.
    await page.goto("/quotes");
    await page.waitForLoadState("networkidle");

    // Click on first quote
    const firstQuote = page
      .locator("table tbody tr, [data-testid='quote-item']")
      .first();

    await expect(firstQuote).toBeVisible({ timeout: 10000 });
    await firstQuote.click();
    await page.waitForLoadState("networkidle");

    // Verify quote details page loaded
    await expect(
      page.locator('h1, h2, [data-testid="quote-details"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test.skip("should display quote notes", async ({ page }) => {
    // TODO: This test requires existing quote data.
    // Skipping until we have proper test data seeding.
    await page.goto("/quotes");
    await page.waitForLoadState("networkidle");

    // Click on first quote
    const firstQuote = page
      .locator("table tbody tr, [data-testid='quote-item']")
      .first();

    await expect(firstQuote).toBeVisible({ timeout: 10000 });
    await firstQuote.click();
    await page.waitForLoadState("networkidle");

    // Verify quote details page loaded
    await expect(
      page.locator('h1, h2, [data-testid="quote-details"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test.skip("should convert quote to order", async ({ page }) => {
    // TODO: This test requires existing quote data with convert functionality.
    // Skipping until we have proper test data seeding.
    await page.goto("/quotes");
    await page.waitForLoadState("networkidle");

    // Click on first quote
    const firstQuote = page
      .locator("table tbody tr, [data-testid='quote-item']")
      .first();

    await expect(firstQuote).toBeVisible({ timeout: 10000 });
    await firstQuote.click();
    await page.waitForLoadState("networkidle");

    // Look for convert to order button
    const convertButton = page.locator(
      'button:has-text("Convert to Order"), button:has-text("Create Order"), [data-testid="convert-order"]'
    );

    await expect(convertButton).toBeVisible({ timeout: 10000 });
    await expect(convertButton).toBeEnabled();
  });
});

test.describe("Sales Sheet Version Control", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.skip("should display version number", async ({ page }) => {
    // TODO: Version control feature may not be implemented yet.
    // Skipping until version control UI is available.
    await page.goto("/sales-sheets");
    await page.waitForLoadState("networkidle");

    // Look for version indicator
    const versionIndicator = page.locator(
      '[data-testid="version"], .version, :text("Version"), :text("v")'
    );

    await expect(versionIndicator).toBeVisible({ timeout: 10000 });
  });

  test.skip("should have clone functionality", async ({ page }) => {
    // TODO: Clone functionality may not be implemented yet.
    // Skipping until clone feature is available.
    await page.goto("/sales-sheets");
    await page.waitForLoadState("networkidle");

    // Look for clone button
    const cloneButton = page.locator(
      'button:has-text("Clone"), button:has-text("Duplicate"), [data-testid="clone"]'
    );

    await expect(cloneButton).toBeVisible({ timeout: 10000 });
    await expect(cloneButton).toBeEnabled();
  });
});
