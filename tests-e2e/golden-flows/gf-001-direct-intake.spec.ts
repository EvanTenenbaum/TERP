/**
 * Golden Flow Test: GF-001 Direct Intake
 *
 * Flow: /intake → add row → submit → verify batch created → cleanup
 */

import { expect, test } from "@playwright/test";
import { loginAsInventoryManager } from "../fixtures/auth";
import {
  cleanupBatchesByBrandName,
  fillAgGridTextCell,
  readAgGridCellText,
  selectAgGridFirstOption,
  waitForToast,
} from "../utils/golden-flow-helpers";

const createBrandName = (): string => {
  // Server validation only allows letters, numbers, spaces, hyphens and underscores.
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", " ")
    .replace("Z", "");
  return `E2E Brand ${ts}`;
};

test.describe("Golden Flow: GF-001 Direct Intake", (): void => {
  // Ensure the grid has enough horizontal space so we can interact with all columns.
  test.use({ viewport: { width: 1920, height: 1080 } });

  let brandName: string | null = null;

  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsInventoryManager(page);
  });

  test.afterEach(async ({ page }): Promise<void> => {
    if (!brandName) return;
    await cleanupBatchesByBrandName(page, brandName);
    brandName = null;
  });

  test(
    "should submit intake row and create a batch",
    { timeout: 90000 },
    async ({ page }): Promise<void> => {
    brandName = createBrandName();

    await page.goto("/intake", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.getByRole("heading", { name: "Direct Intake" })).toBeVisible(
      { timeout: 15000 }
    );
    await expect(page.getByText("Unable to load reference data")).toBeHidden();

    const rows = page.locator(".ag-center-cols-container .ag-row");
    // The grid initializes with a single empty row; wait for it to render
    // before we snapshot counts.
    await expect(rows).toHaveCount(1, { timeout: 15000 });
    const initialCount = await rows.count();
    await page.getByRole("button", { name: "Add Row" }).click();
    await expect(rows).toHaveCount(initialCount + 1, { timeout: 10000 });

    // New rows are appended; AG Grid row-index is 0-based.
    const rowIndex = initialCount;

    // Fill the required columns in-grid. Submit All only submits *valid* rows,
    // so leaving the original placeholder row empty is fine.
    await selectAgGridFirstOption(page, rowIndex, "vendorName");
    await fillAgGridTextCell(page, rowIndex, "brandName", brandName);
    await selectAgGridFirstOption(page, rowIndex, "item");
    await fillAgGridTextCell(page, rowIndex, "qty", "10");
    await fillAgGridTextCell(page, rowIndex, "cogs", "125");

    // Location + Status columns are toward the right; scroll horizontally so
    // AG Grid renders the DOM for those virtualized columns.
    const horizontalScroll = page.locator(".ag-body-horizontal-scroll-viewport").first();
    if (await horizontalScroll.isVisible().catch(() => false)) {
      await horizontalScroll.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
    }
    await selectAgGridFirstOption(page, rowIndex, "site");

    await page.getByRole("button", { name: "Submit All" }).click();
    await waitForToast(page, "Successfully submitted 1 intake record(s)");

    const statusCellText = await readAgGridCellText(page, rowIndex, "status");
    expect(statusCellText).toContain("Submitted");
    }
  );
});
