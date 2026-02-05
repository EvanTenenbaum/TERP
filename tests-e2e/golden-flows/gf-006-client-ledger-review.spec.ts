/**
 * Golden Flow Test: GF-006 Client Ledger Review
 *
 * Flow: Client → ledger → filter → export
 */

import { expect, test } from "@playwright/test";
import { loginAsAccountant } from "../fixtures/auth";

test.describe("Golden Flow: GF-006 Client Ledger Review", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsAccountant(page);
  });

  test("should navigate to client ledger and show ledger tools", async ({
    page,
  }): Promise<void> => {
    await page.goto("/clients");
    await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible({
      timeout: 15000,
    });

    // Select the first client row (skip header row).
    const firstClientRow = page.getByRole("row").nth(1);
    await expect(firstClientRow).toBeVisible({ timeout: 10000 });
    await firstClientRow.click();

    // Open full profile from inspector.
    const viewProfile = page.getByRole("button", { name: "View Full Profile" });
    await expect(viewProfile).toBeVisible({ timeout: 5000 });
    await viewProfile.click();

    await expect(page).toHaveURL(/\/clients\/\d+$/i, { timeout: 10000 });

    // Navigate to ledger from profile.
    const viewLedger = page.getByRole("button", { name: "View Ledger" });
    await expect(viewLedger).toBeVisible({ timeout: 5000 });
    await viewLedger.click();

    await expect(page.getByRole("heading", { name: "Client Ledger" })).toBeVisible(
      { timeout: 10000 }
    );
    await expect(page.getByRole("button", { name: /Export/i })).toBeVisible();
  });
});
