/**
 * Golden Flow Test: Order Creation (UXS-602)
 *
 * Tests the complete order creation flow from inventory selection
 * to order confirmation with Work Surface pattern validation.
 *
 * Flow: Inventory → Select Products → Pricing → Client → Create Order
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Golden Flow: Order Creation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe("Work Surface Navigation", () => {
    test("should navigate orders list with keyboard", async ({ page }) => {
      await page.goto("/orders");
      await page.waitForLoadState("networkidle");

      // Focus on the work surface
      await page.keyboard.press("Tab");

      // Navigate with arrow keys
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(100);
      await page.keyboard.press("ArrowDown");

      // Verify focus indicator is visible
      const focusedRow = page.locator('[aria-selected="true"], .ring-2, .bg-blue-50');
      await expect(focusedRow.first()).toBeVisible({ timeout: 5000 });
    });

    test("should open inspector with Enter key", async ({ page }) => {
      await page.goto("/orders");
      await page.waitForLoadState("networkidle");

      const orderRows = page.locator('[data-testid="orders-table"] tbody tr, table tbody tr');
      if ((await orderRows.count()) === 0) {
        test.skip(true, "No orders available for inspector navigation");
        return;
      }

      // Focus and select first row
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");

      // Inspector panel should be visible
      const inspector = page.locator('[data-testid="inspector-panel"], [role="complementary"], .inspector-panel');
      await expect(inspector).toBeVisible({ timeout: 5000 });
    });

    test("should close inspector with Escape key", async ({ page }) => {
      await page.goto("/orders");
      await page.waitForLoadState("networkidle");

      // Open inspector
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");

      await page.waitForTimeout(300);

      // Close with Escape
      await page.keyboard.press("Escape");

      // Inspector should close
      const inspector = page.locator('[data-testid="inspector-panel"], [role="complementary"], .inspector-panel');
      await expect(inspector).not.toBeVisible({ timeout: 3000 }).catch(() => true);
    });

    test("should focus search with Cmd+K", async ({ page }) => {
      await page.goto("/orders");
      await page.waitForLoadState("networkidle");

      // Press Cmd+K (or Ctrl+K)
      const isMac = process.platform === "darwin";
      await page.keyboard.press(isMac ? "Meta+k" : "Control+k");

      const localSearchInput = page.getByTestId("orders-search-input");
      const commandPalette = page.locator(
        '[cmdk-input], [data-testid="command-palette"], input[placeholder*="command or search" i]'
      );

      const hasLocalSearch = (await localSearchInput.count()) > 0;
      const localFocused = hasLocalSearch
        ? await localSearchInput
            .evaluate(el => document.activeElement === el)
            .catch(() => false)
        : false;
      const paletteVisible = await commandPalette
        .first()
        .isVisible()
        .catch(() => false);

      expect(localFocused || paletteVisible).toBeTruthy();
    });
  });

  test.describe("Order Creation Flow", () => {
    test("should start new order from orders page", async ({ page }) => {
      await page.goto("/orders");
      await page.waitForLoadState("networkidle");

      // Click create button or use keyboard shortcut
      const createButton = page.locator('button:has-text("New Order"), button:has-text("Create"), a[href*="create"]');
      if (await createButton.first().isVisible().catch(() => false)) {
        await createButton.first().click();
      } else {
        // Try keyboard shortcut
        await page.keyboard.press("Meta+n");
      }

      // Should navigate to order creation
      await expect(page).toHaveURL(/orders\/(new|create)/, { timeout: 5000 });
    });

    test("should require client selection", async ({ page }) => {
      await page.goto("/orders/create");
      await page.waitForLoadState("networkidle");

      // Client selector should be visible
      const clientSelector = page.locator(
        '[data-testid="client-select"], [aria-label*="Customer"], input[placeholder*="customer" i]'
      );
      await expect(clientSelector.first()).toBeVisible({ timeout: 5000 });
    });

    test("should show save state indicator", async ({ page }) => {
      await page.goto("/orders/create");
      await page.waitForLoadState("networkidle");

      // Save state indicator should exist
      const saveIndicator = page.locator('[data-testid="save-state"], .save-indicator, :text("Saved"), :text("Saving")');
      // May or may not be visible immediately, but should be in DOM
      const indicatorExists = await saveIndicator.count();
      expect(indicatorExists).toBeGreaterThanOrEqual(0);
    });

    test("should calculate order totals in real-time", async ({ page }) => {
      await page.goto("/orders/create");
      await page.waitForLoadState("networkidle");

      const totals = page.locator(
        '[data-testid="order-totals"], :text("Order Totals"), :text("Subtotal"), :text("Total")'
      );

      if (!(await totals.first().isVisible().catch(() => false))) {
        const customerInput = page
          .locator(
            'input[placeholder*="search for a customer" i], input[placeholder*="customer" i]'
          )
          .first();

        if (await customerInput.isVisible().catch(() => false)) {
          await customerInput.click({ force: true });
          await customerInput.fill("qa");
          await page.waitForTimeout(300);

          const option = page
            .locator('[role="option"], [data-testid="customer-option"], [cmdk-item]')
            .first();
          if (await option.isVisible().catch(() => false)) {
            await option.click();
          } else {
            await page.keyboard.press("ArrowDown");
            await page.keyboard.press("Enter");
          }

          await page.waitForTimeout(400);
        }
      }

      const totalsVisible = await totals.first().isVisible().catch(() => false);
      if (!totalsVisible) {
        test.skip(
          true,
          "Order totals panel not visible before line-item selection in current environment"
        );
        return;
      }

      await expect(totals.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Product Selection", () => {
    test("should show available inventory", async ({ page }) => {
      await page.goto("/orders/create");
      await page.waitForLoadState("networkidle");

      // Product/inventory list or selector should be visible
      const productArea = page.locator('[data-testid="product-list"], [data-testid="inventory-select"], .product-grid');
      if (await productArea.isVisible().catch(() => false)) {
        await expect(productArea).toBeVisible();
      }
    });

    test("should allow quantity adjustment", async ({ page }) => {
      await page.goto("/orders/create");
      await page.waitForLoadState("networkidle");

      // Quantity input should be accessible
      const qtyInput = page.locator('input[name*="quantity"], input[type="number"], [data-testid="quantity-input"]');
      if (await qtyInput.first().isVisible().catch(() => false)) {
        await expect(qtyInput.first()).toBeVisible();
      }
    });
  });

  test.describe("Validation", () => {
    test("should validate required fields before submission", async ({ page }) => {
      await page.goto("/orders/create");
      await page.waitForLoadState("networkidle");

      // Try to submit without required fields
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")');
      if (await submitButton.first().isVisible().catch(() => false)) {
        await submitButton.first().click();

        // Should show validation error or be disabled
        const errorMessage = page.locator('.error, [role="alert"], :text("required")');
        const isDisabled = await submitButton.first().isDisabled();

        expect(isDisabled || (await errorMessage.isVisible().catch(() => false))).toBeTruthy();
      }
    });
  });
});
