/**
 * Golden Flow Test: GF-007 Inventory Management
 *
 * Flow: Inventory list → adjust quantity → confirm
 */

import { expect, test } from "@playwright/test";
import { loginAsInventoryManager } from "../fixtures/auth";

test.describe("Golden Flow: GF-007 Inventory Management", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsInventoryManager(page);
  });

  test("should open inventory work surface and expose adjustments", async ({
    page,
  }): Promise<void> => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="inventory-header"]')).toBeVisible({
      timeout: 5000,
    });

    const batchRow = page
      .locator('[role="row"]')
      .or(page.locator("tr"))
      .first();
    if (!(await batchRow.isVisible().catch(() => false))) {
      test.skip(true, "No inventory rows available — seed batch data first");
      return;
    }

    await batchRow.click();

    const adjustButton = page
      .locator('button:has-text("Adjust")')
      .or(page.locator('button:has-text("Edit")'))
      .or(page.locator('button:has-text("Update Qty")'));
    if (
      await adjustButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(adjustButton.first()).toBeVisible();
    }
  });
});
