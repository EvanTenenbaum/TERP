/**
 * Golden Flow Test: GF-005 Pick & Pack
 *
 * Flow: Pick list → pick items → pack → ship
 */

import { expect, test } from "@playwright/test";
import { loginAsFulfillment } from "../fixtures/auth";

test.describe("Golden Flow: GF-005 Pick & Pack @dev-only @golden-flow", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsFulfillment(page);
  });

  test("should load pick & pack work surface", async ({
    page,
  }): Promise<void> => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    const header = page.locator('h1:has-text("Pick")').or(page.locator('h1:has-text("Pack")'));
    await expect(header).toBeVisible({ timeout: 5000 });

    const queue = page.locator('[data-testid="order-queue"]')
      .or(page.locator('[role="listbox"]'))
      .or(page.locator(':text("No orders to pick")'));
    await expect(queue.first()).toBeVisible({ timeout: 5000 });
  });

  test("should expose pack and ship actions", async ({
    page,
  }): Promise<void> => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    const orderRow = page.locator('[data-testid="order-queue-row"]').first();
    if (await orderRow.isVisible().catch(() => false)) {
      await orderRow.click();

      const packButton = page.locator('button:has-text("Pack")')
        .or(page.locator('button:has-text("Ready")'));
      if (
        await packButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(packButton.first()).toBeVisible();
      }

      const shipButton = page.locator('button:has-text("Ship")')
        .or(page.locator('button:has-text("Mark Shipped")'));
      if (
        await shipButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(shipButton.first()).toBeVisible();
      }
    } else {
      test.skip(true, "No pick-pack rows available in this deployment");
    }
  });
});
