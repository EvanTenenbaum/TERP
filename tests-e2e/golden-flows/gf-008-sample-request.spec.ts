/**
 * Golden Flow Test: GF-008 Sample Request
 *
 * Flow: Samples → create request → approve → fulfill
 */

import { expect, test } from "@playwright/test";
import { loginAsSalesManager } from "../fixtures/auth";

test.describe("Golden Flow: GF-008 Sample Request", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsSalesManager(page);
  });

  test("should open sample request form and show product selector", async ({
    page,
  }): Promise<void> => {
    await page.goto("/samples");
    await expect(
      page.getByRole("heading", { name: "Sample Management" })
    ).toBeVisible({ timeout: 15000 });

    const createFromEmptyState = page.getByRole("button", {
      name: "Create Sample Request",
    });
    const newSample = page.getByRole("button", { name: "New Sample" });

    // The empty state button only appears after the samples query resolves.
    // Wait for either control, then click whichever is available.
    await Promise.race([
      createFromEmptyState
        .waitFor({ state: "visible", timeout: 15000 })
        .catch(() => {}),
      newSample.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    ]);

    if (await createFromEmptyState.isVisible().catch(() => false)) {
      await createFromEmptyState.click();
    } else {
      await newSample.click();
    }

    await expect(
      page.locator('[data-slot="dialog-title"]:has-text("Create Sample Request")')
    ).toBeVisible({ timeout: 10000 });

    // "Product" appears in multiple aria-labels across the nav; scope to the dialog.
    const dialog = page.getByRole("dialog").filter({
      has: page.locator(
        '[data-slot="dialog-title"]:has-text("Create Sample Request")'
      ),
    });
    await expect(dialog.getByRole("combobox", { name: "Product" })).toBeVisible({
      timeout: 5000,
    });
  });
});
