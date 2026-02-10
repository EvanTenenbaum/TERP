/**
 * Golden Flow Test: GF-008 Sample Request
 *
 * Flow: Samples → create request → approve → fulfill
 */

import { expect, test } from "@playwright/test";
import { loginAsSalesManager } from "../fixtures/auth";
import { requireElement } from "../utils/preconditions";

test.describe("Golden Flow: GF-008 Sample Request @dev-only @golden-flow", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsSalesManager(page);
  });

  test("should open sample request form and show product selector", async ({
    page,
  }): Promise<void> => {
    await page.goto("/samples");
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'button:has-text("Create Sample"), button:has-text("New Sample"), button:has-text("Sample Request")',
      "Create Sample button not available"
    );

    const createButton = page.locator(
      'button:has-text("Create Sample"), button:has-text("New Sample"), button:has-text("Sample Request")'
    );
    await createButton.first().click();
    await page.waitForLoadState("networkidle");

    const productSelector = page.locator(
      '[data-testid="sample-product-select"], select[name*="product"], input[placeholder*="Product"], [role="combobox"]'
    );
    await expect(productSelector.first()).toBeVisible({ timeout: 5000 });
  });
});
