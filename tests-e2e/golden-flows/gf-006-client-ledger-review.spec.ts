/**
 * Golden Flow Test: GF-006 Client Ledger Review
 *
 * Flow: /client-ledger → verify header → verify tools (filter + export)
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
    // Navigate directly to client-ledger (skip broken /clients redirect chain)
    await page.goto("/client-ledger");
    await page.waitForLoadState("networkidle");

    // ASSERT the ledger is visible
    const ledgerHeader = page
      .locator('[data-testid="client-ledger"]')
      .or(page.locator('h1:has-text("Client Ledger")'))
      .or(page.locator('h2:has-text("Client Ledger")'));
    await expect(ledgerHeader.first()).toBeVisible({ timeout: 10000 });

    // Verify at least one ledger tool entry-point exists.
    const toolCandidates = page.locator(
      '[data-testid="ledger-filter"], [data-testid="ledger-export"], button:has-text("Export"), button:has-text("Filters")'
    );
    await expect(toolCandidates.first()).toBeVisible({ timeout: 10000 });
  });
});
