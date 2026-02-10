/**
 * Golden Flow Test: GF-007 Inventory Management
 *
 * Flow: Inventory list → adjust quantity → confirm
 */

import { expect, test } from "@playwright/test";
import { loginAsInventoryManager } from "../fixtures/auth";
import { requireElement } from "../utils/preconditions";

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

    await requireElement(
      page,
      '[role="row"], tr',
      "No inventory batches available"
    );

    const batchRow = page.locator('[role="row"], tr').first();
    await batchRow.click();
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'button:has-text("Adjust"), button:has-text("Edit"), button:has-text("Update Qty")',
      "Adjust button not available for this batch"
    );

    const adjustButton = page.locator(
      'button:has-text("Adjust"), button:has-text("Edit"), button:has-text("Update Qty")'
    );
    await expect(adjustButton.first()).toBeVisible();
  });
});
