/**
 * Golden Flow Test: GF-006 Client Ledger Review
 *
 * Flow: Client → ledger → filter → export
 */

import { expect, test } from "@playwright/test";
import { loginAsAccountant } from "../fixtures/auth";
import { requireElement, requireOneOf } from "../utils/preconditions";

test.describe("Golden Flow: GF-006 Client Ledger Review @dev-only @golden-flow", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsAccountant(page);
  });

  test("should navigate to client ledger and show ledger tools", async ({
    page,
  }): Promise<void> => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    await requireElement(page, '[role="row"], tr', "No clients available");
    const clientRow = page.locator('[role="row"], tr').first();
    await clientRow.click();
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'a:has-text("Ledger"), button:has-text("Ledger"), [data-testid="ledger-tab"]',
      "Ledger tab not available for this client"
    );
    const ledgerTab = page.locator(
      'a:has-text("Ledger"), button:has-text("Ledger"), [data-testid="ledger-tab"]'
    );
    await ledgerTab.first().click();
    await page.waitForLoadState("networkidle");

    const ledgerHeader = page.locator(
      'h1:has-text("Ledger"), h2:has-text("Ledger"), [data-testid="client-ledger"]'
    );
    await expect(ledgerHeader.first()).toBeVisible({ timeout: 5000 });

    // At least one tool should be visible
    await requireOneOf(
      page,
      [
        '[data-testid="ledger-filter"], select:has-text("All"), button:has-text("Filter")',
        'button:has-text("Export"), button:has-text("Download"), [data-testid="ledger-export"]',
      ],
      "Expected ledger filter or export button"
    );
  });
});
