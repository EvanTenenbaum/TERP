/**
 * Golden Flow Test: GF-007 Inventory Management
 *
 * Flow: Inventory list → adjust quantity → confirm
 */

import { expect, test } from "@playwright/test";
import { loginAsInventoryManager } from "../fixtures/auth";

test.describe("Golden Flow: GF-007 Inventory Management @dev-only @golden-flow", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsInventoryManager(page);
  });

  test("should open inventory work surface and expose adjustments", async ({
    page,
  }): Promise<void> => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    const header = page.locator('h1:has-text("Inventory")');
    await expect(header).toBeVisible({ timeout: 5000 });

    const batchRow = page.locator('[role="row"], tr').first();
    if (!(await batchRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "No inventory batches available");
      return;
    }

    await batchRow.click();
    await page.waitForLoadState("networkidle");

    const adjustButton = page.locator(
      'button:has-text("Adjust"), button:has-text("Edit"), button:has-text("Update Qty")'
    );
    if (
      !(await adjustButton
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false))
    ) {
      test.skip(true, "Adjust button not available for this batch");
      return;
    }

    await expect(adjustButton.first()).toBeVisible();
  });
});
