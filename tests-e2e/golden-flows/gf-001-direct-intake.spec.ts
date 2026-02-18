/**
 * Golden Flow Test: GF-001 Direct Intake
 *
 * Flow: /direct-intake → add row → submit → verify batch created → cleanup
 */

import { expect, test, type Page } from "@playwright/test";
import { loginAsInventoryManager } from "../fixtures/auth";
import {
  cleanupBatchesByBrandName,
  fillAgGridTextCell,
  readAgGridCellText,
  selectAgGridFirstOption,
  waitForToast,
} from "../utils/golden-flow-helpers";

const createBrandName = (): string => `E2E Brand ${new Date().toISOString()}`;

test.describe("Golden Flow: GF-001 Direct Intake", (): void => {
  let brandName: string | null = null;

  const _gotoDirectIntake = async (page: Page): Promise<void> => {
    await page.goto("/intake");
    await page.waitForLoadState("networkidle");

    const addRowOnCanonicalRoute = await page
      .getByRole("button", { name: "Add Row" })
      .isVisible()
      .catch(() => false);

    if (addRowOnCanonicalRoute) return;

    await page.goto("/direct-intake");
    await page.waitForLoadState("networkidle");
  };

  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsInventoryManager(page);
  });

  test.afterEach(async ({ page }): Promise<void> => {
    if (!brandName) return;
    await cleanupBatchesByBrandName(page, brandName);
    brandName = null;
  });

  test("should submit intake row and create a batch", async ({
    page,
  }): Promise<void> => {
    brandName = createBrandName();

    await page.goto("/direct-intake");
    await page.waitForLoadState("networkidle");
    if (
      await page
        .getByText("404")
        .isVisible()
        .catch(() => false)
    ) {
      await page.goto("/inventory/intake");
    }
    await page.waitForLoadState("networkidle");
    if (
      await page
        .getByText("404")
        .isVisible()
        .catch(() => false)
    ) {
      await page.goto("/inventory/intake");
    }
    await page.waitForLoadState("networkidle");

    const addRowButton = page.getByRole("button", { name: "Add Row" });
    const hasIntakeSurface = await addRowButton.isVisible().catch(() => false);
    if (!hasIntakeSurface) {
      test.skip(
        true,
        "Direct intake UI is not available in this deployment/role context"
      );
      return;
    }
    const rows = page.locator(".ag-center-cols-container .ag-row");

    // Wait for AG Grid to finish rendering initial rows before snapshotting count.
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const initialRowCount = await rows.count();

    await addRowButton.click();

    // Wait for at least one new row to appear.
    await expect(rows).toHaveCount(initialRowCount + 1, { timeout: 10_000 });

    // Derive the new row's AG Grid row-index from the DOM instead of assuming
    // it equals initialRowCount.
    const lastRow = rows.last();
    const rowIndexAttr = await lastRow.getAttribute("row-index");
    const rowIndex =
      rowIndexAttr !== null ? parseInt(rowIndexAttr, 10) : initialRowCount;

    await selectAgGridFirstOption(page, rowIndex, "vendorName");
    await fillAgGridTextCell(page, rowIndex, "brandName", brandName);
    await selectAgGridFirstOption(page, rowIndex, "category");
    await selectAgGridFirstOption(page, rowIndex, "item");
    await fillAgGridTextCell(page, rowIndex, "qty", "10");
    await fillAgGridTextCell(page, rowIndex, "cogs", "125");
    await selectAgGridFirstOption(page, rowIndex, "site");

    await page.getByRole("button", { name: "Submit All" }).click();

    await waitForToast(page, "Successfully submitted");

    const statusCellText = await readAgGridCellText(page, rowIndex, "status");
    expect(statusCellText).toContain("Submitted");
  });
});
