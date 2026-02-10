/**
 * Golden Flow Test: GF-005 Pick & Pack
 *
 * Flow: Pick list → pick items → pack → ship
 */

import { expect, test } from "@playwright/test";
import { loginAsFulfillment } from "../fixtures/auth";
import { requireElement, requireOneOf } from "../utils/preconditions";

test.describe("Golden Flow: GF-005 Pick & Pack", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsFulfillment(page);
  });

  test("should load pick & pack work surface", async ({
    page,
  }): Promise<void> => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    const header = page.locator('h1:has-text("Pick"), h1:has-text("Pack")');
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test("should expose pack and ship actions", async ({
    page,
  }): Promise<void> => {
    await page.goto("/pick-pack");
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      '[data-testid="order-queue-row"]',
      "No orders in queue"
    );

    const orderRow = page.locator('[data-testid="order-queue-row"]').first();
    await orderRow.click();
    await page.waitForLoadState("networkidle");

    // At least one action should be available
    await requireOneOf(
      page,
      [
        'button:has-text("Pack"), button:has-text("Ready")',
        'button:has-text("Ship"), button:has-text("Mark Shipped")',
      ],
      "Expected pack or ship action button"
    );
  });
});
