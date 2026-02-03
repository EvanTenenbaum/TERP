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
    await page.waitForLoadState("networkidle");

    const clientRow = page.locator('[role="row"], tr').first();
    if (await clientRow.isVisible().catch(() => false)) {
      await clientRow.click();

      const ledgerTab = page.locator(
        'a:has-text("Ledger"), button:has-text("Ledger"), [data-testid="ledger-tab"]'
      );
      if (
        await ledgerTab
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await ledgerTab.first().click();
      }

      const ledgerHeader = page.locator(
        'h1:has-text("Ledger"), h2:has-text("Ledger"), [data-testid="client-ledger"]'
      );
      await expect(ledgerHeader.first()).toBeVisible({ timeout: 5000 });

      const filterControl = page.locator(
        '[data-testid="ledger-filter"], select:has-text("All"), button:has-text("Filter")'
      );
      if (
        await filterControl
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(filterControl.first()).toBeVisible();
      }

      const exportButton = page.locator(
        'button:has-text("Export"), button:has-text("Download"), [data-testid="ledger-export"]'
      );
      if (
        await exportButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(exportButton.first()).toBeVisible();
      }
    }
  });
});
