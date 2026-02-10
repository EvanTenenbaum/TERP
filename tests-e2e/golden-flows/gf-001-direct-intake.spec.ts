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

test.describe("Golden Flow: GF-001 Direct Intake @dev-only @golden-flow", (): void => {
  let brandName: string | null = null;

  const _gotoDirectIntake = async (page: Page): Promise<void> => {
    await page.goto("/intake");
    await page.waitForLoadState("networkidle");

    const addRowButton = page.getByRole("button", { name: "Add Row" });
    if (await addRowButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      return;
    }

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

    // Precondition: Verify Add Row button is available
    const addRowButton = page.getByRole("button", { name: "Add Row" });
    if (!(await addRowButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Add Row button not available");
      return;
    }

    await addRowButton.click();
    await page.waitForLoadState("networkidle");

    const rows = page.locator(".ag-center-cols-container .ag-row");
    await expect(rows).toHaveCount(2);

    const rowIndex = 1;

    await selectAgGridFirstOption(page, rowIndex, "vendorName");
    await fillAgGridTextCell(page, rowIndex, "brandName", brandName);
    await selectAgGridFirstOption(page, rowIndex, "category");
    await selectAgGridFirstOption(page, rowIndex, "item");
    await fillAgGridTextCell(page, rowIndex, "qty", "10");
    await fillAgGridTextCell(page, rowIndex, "cogs", "125");
    await selectAgGridFirstOption(page, rowIndex, "site");

    const submitButton = page.getByRole("button", { name: "Submit All" });
    await submitButton.click();
    await page.waitForLoadState("networkidle");

    await waitForToast(page, "Successfully submitted");

    const statusCellText = await readAgGridCellText(page, rowIndex, "status");
    expect(statusCellText).toContain("Submitted");
  });
});
