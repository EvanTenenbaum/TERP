/**
 * Golden Flow Test: GF-002 Procure-to-Pay
 *
 * Flow: /purchase-orders → create PO → submit → receive goods
 */

import { expect, test, type Page } from "@playwright/test";
import { loginAsInventoryManager } from "../fixtures/auth";
import { requireElement } from "../utils/preconditions";

const openPurchaseOrders = async (page: Page): Promise<void> => {
  await page.goto("/purchase-orders");
  await page.waitForLoadState("networkidle");
};

test.describe("Golden Flow: GF-002 Procure-to-Pay @dev-only @golden-flow", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsInventoryManager(page);
  });

  test("should access purchase order creation flow", async ({
    page,
  }): Promise<void> => {
    await openPurchaseOrders(page);

    await requireElement(
      page,
      'button:has-text("New Purchase Order"), button:has-text("Create PO"), button:has-text("New PO")',
      "Create PO button not available"
    );

    const createButton = page.locator(
      'button:has-text("New Purchase Order"), button:has-text("Create PO"), button:has-text("New PO")'
    );
    await createButton.first().click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/purchase-orders\/(new|create)/, {
      timeout: 5000,
    });

    const productSelector = page.locator(
      '[data-testid="po-product-select"], select[name*="product"], input[placeholder*="Product"], input[aria-label*="Product"]'
    );
    await expect(productSelector.first()).toBeVisible({ timeout: 5000 });
  });

  test("should show receiving action for purchase orders", async ({
    page,
  }): Promise<void> => {
    await openPurchaseOrders(page);

    await requireElement(
      page,
      '[role="row"], tr',
      "No purchase orders available"
    );

    const poRow = page.locator('[role="row"], tr').first();
    await poRow.click();
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'button:has-text("Receive"), button:has-text("Mark Received"), button:has-text("Receive Items")',
      "Receive button not available for this PO"
    );

    const receiveButton = page.locator(
      'button:has-text("Receive"), button:has-text("Mark Received"), button:has-text("Receive Items")'
    );
    await expect(receiveButton.first()).toBeVisible();
  });
});
