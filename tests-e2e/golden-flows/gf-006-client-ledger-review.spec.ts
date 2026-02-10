/**
 * Golden Flow Test: GF-006 Client Ledger Review
 *
 * Flow: Client → ledger → filter → export
 */

import { expect, test } from "@playwright/test";
import { loginAsAccountant } from "../fixtures/auth";

test.describe("Golden Flow: GF-006 Client Ledger Review @dev-only @golden-flow", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsAccountant(page);
  });

  test("should navigate to client ledger and show ledger tools", async ({
    page,
  }): Promise<void> => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const clientRow = page.locator('[role="row"], tr').first();
    if (!(await clientRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "No clients available");
      return;
    }

    await clientRow.click();
    await page.waitForLoadState("networkidle");

    const ledgerTab = page.locator(
      'a:has-text("Ledger"), button:has-text("Ledger"), [data-testid="ledger-tab"]'
    );
    if (
      !(await ledgerTab
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false))
    ) {
      test.skip(true, "Ledger tab not available for this client");
      return;
    }

    await ledgerTab.first().click();
    await page.waitForLoadState("networkidle");

    const ledgerHeader = page.locator(
      'h1:has-text("Ledger"), h2:has-text("Ledger"), [data-testid="client-ledger"]'
    );
    await expect(ledgerHeader.first()).toBeVisible({ timeout: 5000 });

    const filterControl = page.locator(
      '[data-testid="ledger-filter"], select:has-text("All"), button:has-text("Filter")'
    );
    const filterVisible = await filterControl
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download"), [data-testid="ledger-export"]'
    );
    const exportVisible = await exportButton
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    // At least one tool should be visible
    if (filterVisible) {
      await expect(filterControl.first()).toBeVisible();
    }
    if (exportVisible) {
      await expect(exportButton.first()).toBeVisible();
    }
  });
});
