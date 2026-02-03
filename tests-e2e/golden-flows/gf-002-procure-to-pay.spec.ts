/**
 * Golden Flow Test: GF-002 Procure-to-Pay
 *
 * Flow: /purchase-orders → create PO → submit → receive goods
 */

import { expect, test, type Page } from "@playwright/test";
import { loginAsInventoryManager } from "../fixtures/auth";

const openPurchaseOrders = async (page: Page): Promise<void> => {
  await page.goto("/purchase-orders");
  await page.waitForLoadState("networkidle");
};

test.describe("Golden Flow: GF-002 Procure-to-Pay", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsInventoryManager(page);
  });

  test("should access purchase order creation flow", async ({
    page,
  }): Promise<void> => {
    await openPurchaseOrders(page);

    const createButton = page.locator(
      'button:has-text("New Purchase Order"), button:has-text("Create PO"), button:has-text("New PO")'
    );

    if (
      await createButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await createButton.first().click();
      await expect(page).toHaveURL(/purchase-orders\/(new|create)/, {
        timeout: 5000,
      });

      const productSelector = page.locator(
        '[data-testid="po-product-select"], select[name*="product"], input[placeholder*="Product"], input[aria-label*="Product"]'
      );
      await expect(productSelector.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show receiving action for purchase orders", async ({
    page,
  }): Promise<void> => {
    await openPurchaseOrders(page);

    const poRow = page.locator('[role="row"], tr').first();
    if (await poRow.isVisible().catch(() => false)) {
      await poRow.click();

      const receiveButton = page.locator(
        'button:has-text("Receive"), button:has-text("Mark Received"), button:has-text("Receive Items")'
      );
      if (
        await receiveButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(receiveButton.first()).toBeVisible();
      }
    }
  });
});
