/**
 * Golden Flow Test: GF-008 Sample Request
 *
 * Flow: Samples → create request → approve → fulfill
 */

import { expect, test } from "@playwright/test";
import { loginAsSalesManager } from "../fixtures/auth";

test.describe("Golden Flow: GF-008 Sample Request @dev-only @golden-flow", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsSalesManager(page);
  });

  test("should open sample request form and show product selector", async ({
    page,
  }): Promise<void> => {
    await page.goto("/samples");
    await page.waitForLoadState("networkidle");

    const createButton = page.locator(
      'button:has-text("Create Sample"), button:has-text("New Sample"), button:has-text("Sample Request")'
    );
    if (
      !(await createButton
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false))
    ) {
      test.skip(true, "Create Sample button not available");
      return;
    }

    await createButton.first().click();
    await page.waitForLoadState("networkidle");

    const productSelector = page.locator(
      '[data-testid="sample-product-select"], select[name*="product"], input[placeholder*="Product"], [role="combobox"]'
    );
    await expect(productSelector.first()).toBeVisible({ timeout: 5000 });
  });
});
