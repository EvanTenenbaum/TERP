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
    // Phase 1: Navigate to clients list
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Phase 2: Check if we have client data to test with
    const clientRow = page
      .locator('[role="row"]')
      .or(page.locator("tr"))
      .first();
    const hasClients = await clientRow.isVisible().catch(() => false);
    if (!hasClients) {
      test.skip(true, "No client data available — seed clients first");
      return;
    }

    // Phase 3: Navigate to a client's ledger
    await clientRow.click();
    await page.waitForLoadState("networkidle");

    // Try direct ledger tab first
    const ledgerTab = page
      .locator('[data-testid="ledger-tab"]')
      .or(page.locator('a:has-text("Ledger")'))
      .or(page.locator('button:has-text("Ledger")'));

    if (await ledgerTab.first().isVisible().catch(() => false)) {
      await ledgerTab.first().click();
      await page.waitForLoadState("networkidle");
    } else {
      // Try the open-client button then the profile ledger button
      const openClientButton = page
        .locator('[aria-label*="View"]')
        .or(page.locator('button[aria-label*="Open"]'))
        .or(page.locator("td button"))
        .first();

      if (await openClientButton.isVisible().catch(() => false)) {
        await openClientButton.click();
        await page.waitForLoadState("networkidle");

        const profileLedgerButton = page
          .locator('button:has-text("View Ledger")')
          .or(page.locator('a:has-text("View Ledger")'))
          .first();

        if (await profileLedgerButton.isVisible().catch(() => false)) {
          await profileLedgerButton.click();
          await page.waitForLoadState("networkidle");
        }
      } else {
        // Fall back to direct URL
        await page.goto("/client-ledger");
        await page.waitForLoadState("networkidle");
      }
    }

    // Phase 4: ASSERT the ledger is visible — test FAILS if ledger is unreachable
    const ledgerHeader = page
      .locator('[data-testid="client-ledger"]')
      .or(page.locator('h1:has-text("Ledger")'))
      .or(page.locator('h2:has-text("Ledger")'))
      .or(page.locator(':text("Client Ledger")'));

    await expect(ledgerHeader.first()).toBeVisible({ timeout: 10000 });

    // Phase 5: Verify ledger tools exist (filter + export)
    const filterControl = page
      .locator('[data-testid="ledger-filter"]')
      .or(page.locator('select:has-text("All")'))
      .or(page.locator('button:has-text("Filter")'));

    const exportButton = page
      .locator('[data-testid="ledger-export"]')
      .or(page.locator('button:has-text("Export")'))
      .or(page.locator('button:has-text("Download")'));

    // At least one of filter or export must be present
    const hasFilter = await filterControl.first().isVisible().catch(() => false);
    const hasExport = await exportButton.first().isVisible().catch(() => false);
    expect(hasFilter || hasExport).toBeTruthy();
  });
});
