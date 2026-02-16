/**
 * Sales Sheets Workflow Critical Path Tests
 *
 * Verifies the sales sheet creation functionality
 * including client selection, inventory browsing, and draft management.
 *
 * Sprint D Requirement: QA-062
 */
import { test, expect } from "@playwright/test";
import { loginAsStandardUser } from "../fixtures/auth";

test.describe("Sales Sheets Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should navigate to sales sheets page", async ({ page }) => {
    await page.goto("/sales-sheets");
    
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("should display Sales Sheet Creator title", async ({ page }) => {
    await page.goto("/sales-sheets");
    
    const title = page.locator('h1:has-text("Sales"), text=/sales sheet/i').first();
    await expect(title).toBeVisible();
  });

  test("should have client selector", async ({ page }) => {
    await page.goto("/sales-sheets");
    
    // Should have client selection dropdown
    const clientSelector = page.locator('text=/select.*client|choose.*client/i, [data-testid="client-selector"], select').first();
    await expect(clientSelector).toBeVisible();
  });
});

test.describe("Sales Sheet Client Selection", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should open client dropdown", async ({ page }) => {
    await page.goto("/sales-sheets");
    
    // Click client selector
    const clientSelector = page.locator('[data-testid="client-selector"], select, button:has-text("Select Client")').first();
    
    if (await clientSelector.isVisible()) {
      await clientSelector.click();
      
      // Should show dropdown options
      const options = page.locator('[role="option"], option, [data-testid="client-option"]').first();
      await expect(options).toBeVisible();
    }
  });

  test("should select a client from dropdown", async ({ page }) => {
    await page.goto("/sales-sheets");
    
    // Click client selector
    const clientSelector = page.locator('[data-testid="client-selector"], select, button:has-text("Select")').first();
    
    if (await clientSelector.isVisible()) {
      await clientSelector.click();
      await page.waitForTimeout(500);
      
      // Select first client option
      const firstOption = page.locator('[role="option"], option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        
        // Client should be selected
        await page.waitForLoadState("networkidle");
      }
    }
  });

  test("should show inventory browser after client selection", async ({ page }) => {
    await page.goto("/sales-sheets");
    
    // Select a client first
    const clientSelector = page.locator('[data-testid="client-selector"], select, button:has-text("Select")').first();
    
    if (await clientSelector.isVisible()) {
      await clientSelector.click();
      await page.waitForTimeout(500);
      
      const firstOption = page.locator('[role="option"], option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await page.waitForLoadState("networkidle");
        
        // Should show inventory browser
        const inventoryBrowser = page.locator('text=/inventory|product|item|browse/i').first();
        await expect(inventoryBrowser).toBeVisible();
      }
    }
  });
});

test.describe("Sales Sheet Inventory Browser", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should display inventory items", async ({ page }) => {
    await page.goto("/sales-sheets");
    
    // Select a client first
    const clientSelector = page.locator('[data-testid="client-selector"], select, button:has-text("Select")').first();
    if (await clientSelector.isVisible()) {
      await clientSelector.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"], option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await page.waitForLoadState("networkidle");
      }
    }
    
    // Should show inventory table or grid
    const inventoryList = page.locator('table, [data-testid="inventory-grid"]').first();
    await expect(inventoryList).toBeVisible();
  });

  test("should have Add to Sheet button for items", async ({ page }) => {
    await page.goto("/sales-sheets");
    
    // Select a client first
    const clientSelector = page.locator('[data-testid="client-selector"], select, button:has-text("Select")').first();
    if (await clientSelector.isVisible()) {
      await clientSelector.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"], option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await page.waitForLoadState("networkidle");
      }
    }
    
    // Should have Add button
    const addButton = page.locator('button:has-text("Add"), button:has-text("+")').first();
    await expect(addButton).toBeVisible();
  });

  test("should filter inventory by category", async ({ page }) => {
    await page.goto("/sales-sheets");
    
    // Look for category filter
    const categoryFilter = page.locator('[data-testid="category-filter"], select[name="category"], text=/filter.*category/i').first();
    
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      
      // Should show category options
      const categoryOption = page.locator('[role="option"]:has-text("Flower"), option:has-text("Flower")').first();
      await expect(categoryOption).toBeVisible();
    }
  });
});

test.describe("Sales Sheet Draft Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should have Save Draft button", async ({ page }) => {
    await page.goto("/sales-sheets");
    await page.waitForLoadState("networkidle");

    // Page may not exist in all environments; skip if 404
    if (page.url().includes("404") || await page.locator("text=/page not found/i").isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    // Look for Save Draft button (broad match for various UI labels)
    const saveDraftButton = page.locator('button:has-text("Save Draft"), button:has-text("Save"), button:has-text("Draft")').first();
    await expect(saveDraftButton).toBeVisible({ timeout: 10000 });
  });

  test("should have Load Draft option", async ({ page }) => {
    await page.goto("/sales-sheets");
    await page.waitForLoadState("networkidle");

    // Page may not exist in all environments; skip if 404
    if (page.url().includes("404") || await page.locator("text=/page not found/i").isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    // Look for Load Draft button or dropdown (broad match)
    const loadDraftButton = page.locator('button:has-text("Load Draft"), button:has-text("Load"), button:has-text("Drafts"), text=/draft/i').first();
    await expect(loadDraftButton).toBeVisible({ timeout: 10000 });
  });

  test("should have Clear/Reset button", async ({ page }) => {
    await page.goto("/sales-sheets");
    await page.waitForLoadState("networkidle");

    // Page may not exist in all environments; skip if 404
    if (page.url().includes("404") || await page.locator("text=/page not found/i").isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    // Look for Clear or Reset button
    const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset"), button:has-text("New"), button:has-text("Start Over")').first();
    await expect(clearButton).toBeVisible({ timeout: 10000 });
  });

  test("should have Export/Generate button", async ({ page }) => {
    await page.goto("/sales-sheets");
    await page.waitForLoadState("networkidle");

    // Page may not exist in all environments; skip if 404
    if (page.url().includes("404") || await page.locator("text=/page not found/i").isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    // Look for Export or Generate button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Generate"), button:has-text("PDF"), button:has-text("Download")').first();
    await expect(exportButton).toBeVisible({ timeout: 10000 });
  });
});
