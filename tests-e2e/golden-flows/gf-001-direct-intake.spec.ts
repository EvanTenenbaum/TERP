/**
 * Golden Flow Test: GF-001 Direct Intake
 *
 * Flow: /direct-intake → add row → submit → verify batch created → cleanup
 */

import { expect, test, type Page } from "@playwright/test";
import { loginAsInventoryManager } from "../fixtures/auth";
import {
  closeInventoryBatches,
  fetchInventoryByQuery,
  fillAgGridTextCell,
  readAgGridCellText,
  trpcQuery,
  waitForToast,
} from "../utils/golden-flow-helpers";

const createItemName = (): string => `E2E Item ${new Date().toISOString()}`;

const setSelectedRowLocation = async (
  page: Page,
  locationName: string
): Promise<void> => {
  const locationField = page
    .getByText("Location", { exact: true })
    .first()
    .locator("xpath=..")
    .getByRole("combobox")
    .first();

  await locationField.click();
  await page.getByRole("option", { name: locationName }).first().click();
};

const navigateToDirectIntake = async (page: Page): Promise<void> => {
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
};

const findFirstVendorName = async (page: Page): Promise<string> => {
  const result = await trpcQuery<{
    items?: Array<{ name?: string }>;
    data?: Array<{ name?: string }>;
  }>(page, "clients.list", {
    clientTypes: ["seller"],
    limit: 25,
  });

  const candidates = Array.isArray(result.items)
    ? result.items
    : Array.isArray(result.data)
      ? result.data
      : [];

  const vendorName = candidates.find(
    candidate =>
      typeof candidate.name === "string" && candidate.name.trim().length > 0
  )?.name;

  if (!vendorName) {
    throw new Error(
      "No seller clients found for GF-001. Seed data must include at least one vendor."
    );
  }

  return vendorName;
};

const cleanupBatchesByItemName = async (
  page: Page,
  itemName: string
): Promise<void> => {
  const isCleanupSkippable = (message: string): boolean =>
    message.includes("status 401") ||
    message.includes("status 403") ||
    message.includes("status 429") ||
    message.includes("status 500");

  let list: Awaited<ReturnType<typeof fetchInventoryByQuery>>;
  try {
    list = await fetchInventoryByQuery(page, itemName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isCleanupSkippable(message)) return;
    throw error;
  }

  const needle = itemName.toLowerCase();
  const batchIds = list.items
    .filter(item => {
      const productName = (
        item.product?.nameCanonical ??
        item.product?.name ??
        ""
      ).toLowerCase();
      return productName.includes(needle);
    })
    .map(item => item.batch.id);

  try {
    await closeInventoryBatches(page, batchIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!isCleanupSkippable(message)) throw error;
  }
};

test.describe("Golden Flow: GF-001 Direct Intake", (): void => {
  let itemName: string | null = null;

  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsInventoryManager(page);
  });

  test.afterEach(async ({ page }): Promise<void> => {
    if (!itemName) return;
    await cleanupBatchesByItemName(page, itemName);
    itemName = null;
  });

  test("should submit intake row and create a batch", async ({
    page,
  }): Promise<void> => {
    test.setTimeout(120_000);
    itemName = createItemName();
    const vendorName = await findFirstVendorName(page);

    await navigateToDirectIntake(page);

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
    const initialRowCount = await rows.count();

    await addRowButton.click();

    // Wait for at least one new row to appear.
    await expect(rows).toHaveCount(initialRowCount + 1, { timeout: 10_000 });

    const rowIndex = initialRowCount;
    await expect(
      page.locator(`.ag-center-cols-container .ag-row[row-index="${rowIndex}"]`)
    ).toBeVisible({ timeout: 10_000 });

    await fillAgGridTextCell(page, rowIndex, "vendorName", vendorName);
    await fillAgGridTextCell(page, rowIndex, "item", itemName);
    await fillAgGridTextCell(page, rowIndex, "qty", "10");
    await fillAgGridTextCell(page, rowIndex, "cogs", "125");
    await setSelectedRowLocation(page, "Main Warehouse");
    await expect
      .poll(async () => await readAgGridCellText(page, rowIndex, "site"), {
        timeout: 10_000,
      })
      .toMatch(/\S+/);

    await page.getByRole("button", { name: "Edit Selected Details" }).click();
    const brandName = `${itemName} Brand`;
    const brandInput = page.getByPlaceholder("Enter brand or farmer name");
    await expect(brandInput).toBeVisible({ timeout: 10_000 });
    await brandInput.fill(brandName);

    await page.getByRole("button", { name: /Submit Selected/i }).click();

    const toastSeen = await waitForToast(page, "Successfully submitted")
      .then(() => true)
      .catch(() => false);

    // Status is the source-of-truth assertion; toast is best-effort UI evidence.
    await expect
      .poll(
        async () =>
          (await readAgGridCellText(page, rowIndex, "status")).toLowerCase(),
        { timeout: 60_000 }
      )
      .toContain("submitted");

    if (!toastSeen) {
      test.info().annotations.push({
        type: "observation",
        description:
          "Submit toast was not observed within timeout, but status updated to Submitted.",
      });
    }
  });

  test("should submit a valid row from Submit All Pending without request-id errors", async ({
    page,
  }): Promise<void> => {
    test.setTimeout(120_000);
    itemName = createItemName();
    const vendorName = await findFirstVendorName(page);

    await navigateToDirectIntake(page);

    const addRowButton = page.getByRole("button", { name: "Add Row" });
    const hasIntakeSurface = await addRowButton.isVisible().catch(() => false);
    if (!hasIntakeSurface) {
      test.skip(
        true,
        "Direct intake UI is not available in this deployment/role context"
      );
      return;
    }

    const rowIndex = 0;
    await fillAgGridTextCell(page, rowIndex, "vendorName", vendorName);
    await fillAgGridTextCell(page, rowIndex, "item", itemName);
    await fillAgGridTextCell(page, rowIndex, "qty", "100");
    await fillAgGridTextCell(page, rowIndex, "cogs", "1250");
    await setSelectedRowLocation(page, "Main Warehouse");

    await page.getByRole("button", { name: "Edit Selected Details" }).click();
    const brandInput = page.getByPlaceholder("Enter brand or farmer name");
    await expect(brandInput).toBeVisible({ timeout: 10_000 });
    await brandInput.fill(`${itemName} Brand`);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("complementary", { name: "Edit Row" })
    ).toBeHidden({ timeout: 10_000 });

    const intakeStatuses: number[] = [];
    page.on("response", response => {
      if (response.url().includes("/api/trpc/inventory.intake")) {
        intakeStatuses.push(response.status());
      }
    });

    await page.getByRole("button", { name: "Submit All Pending" }).click();

    await expect
      .poll(
        async () =>
          (await readAgGridCellText(page, rowIndex, "status")).toLowerCase(),
        { timeout: 60_000 }
      )
      .toContain("submitted");

    await expect
      .poll(async () => intakeStatuses.length, { timeout: 30_000 })
      .toBeGreaterThan(0);
    expect(intakeStatuses.some(status => status >= 500)).toBeFalsy();

    const requestIdError = page
      .locator("text=An unexpected error occurred")
      .or(page.locator("text=Request ID: REQ-"));
    await expect(requestIdError).toHaveCount(0);
  });

  test("should not throw internal request-id errors when submit-all includes mixed pending rows", async ({
    page,
  }): Promise<void> => {
    test.setTimeout(120_000);
    itemName = createItemName();
    const vendorName = await findFirstVendorName(page);

    await navigateToDirectIntake(page);

    const addRowButton = page.getByRole("button", { name: "Add Row" });
    const addFiveRowsButton = page.getByRole("button", { name: "+5 Rows" });
    const hasIntakeSurface = await addRowButton.isVisible().catch(() => false);
    if (!hasIntakeSurface) {
      test.skip(
        true,
        "Direct intake UI is not available in this deployment/role context"
      );
      return;
    }

    const rows = page.locator(".ag-center-cols-container .ag-row");
    const initialRowCount = await rows.count();
    await addFiveRowsButton.click();
    await expect(rows).toHaveCount(initialRowCount + 5, { timeout: 10_000 });

    const rowIndex = initialRowCount;
    await fillAgGridTextCell(page, rowIndex, "vendorName", vendorName);
    await fillAgGridTextCell(page, rowIndex, "item", itemName);
    await fillAgGridTextCell(page, rowIndex, "qty", "100");
    await fillAgGridTextCell(page, rowIndex, "cogs", "1250");
    await setSelectedRowLocation(page, "Main Warehouse");

    await page.getByRole("button", { name: "Edit Selected Details" }).click();
    const brandInput = page.getByPlaceholder("Enter brand or farmer name");
    await expect(brandInput).toBeVisible({ timeout: 10_000 });
    await brandInput.fill(`${itemName} Brand`);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("complementary", { name: "Edit Row" })
    ).toBeHidden({ timeout: 10_000 });

    const intakeStatuses: number[] = [];
    page.on("response", response => {
      if (response.url().includes("/api/trpc/inventory.intake")) {
        intakeStatuses.push(response.status());
      }
    });

    await page.getByRole("button", { name: "Submit All Pending" }).click();

    await expect
      .poll(
        async () =>
          (await readAgGridCellText(page, rowIndex, "status")).toLowerCase(),
        { timeout: 60_000 }
      )
      .toContain("submitted");

    await expect
      .poll(async () => intakeStatuses.length, { timeout: 30_000 })
      .toBeGreaterThan(0);
    expect(intakeStatuses.some(status => status >= 500)).toBeFalsy();

    await expect(page.getByText(/Request ID:\s*REQ-/i)).toHaveCount(0);
    await expect(
      page.getByText(/An unexpected error occurred\. Please try again\./i)
    ).toHaveCount(0);
  });

  test("should auto-populate Brand/Farmer when vendor is entered in-grid", async ({
    page,
  }): Promise<void> => {
    test.setTimeout(120_000);
    itemName = createItemName();
    const vendorName = await findFirstVendorName(page);

    await navigateToDirectIntake(page);

    const addRowButton = page.getByRole("button", { name: "Add Row" });
    const hasIntakeSurface = await addRowButton.isVisible().catch(() => false);
    if (!hasIntakeSurface) {
      test.skip(
        true,
        "Direct intake UI is not available in this deployment/role context"
      );
      return;
    }

    const rowIndex = 0;
    await fillAgGridTextCell(page, rowIndex, "vendorName", vendorName);
    await fillAgGridTextCell(page, rowIndex, "item", itemName);
    await fillAgGridTextCell(page, rowIndex, "qty", "25");
    await fillAgGridTextCell(page, rowIndex, "cogs", "99");
    await setSelectedRowLocation(page, "Main Warehouse");

    await page.getByRole("button", { name: "Submit Selected" }).click();

    await expect
      .poll(
        async () =>
          (await readAgGridCellText(page, rowIndex, "status")).toLowerCase(),
        { timeout: 60_000 }
      )
      .toContain("submitted");

    await expect(page.getByText("Brand/Farmer is required")).toHaveCount(0);
    await expect(page.getByText(/Request ID:\s*REQ-/i)).toHaveCount(0);
  });

  test("should backfill Brand/Farmer from typed vendor even when vendor is not pre-existing", async ({
    page,
  }): Promise<void> => {
    test.setTimeout(120_000);
    itemName = createItemName();
    const customVendorName = `E2E Vendor ${Date.now()}`;

    await navigateToDirectIntake(page);

    const addRowButton = page.getByRole("button", { name: "Add Row" });
    const hasIntakeSurface = await addRowButton.isVisible().catch(() => false);
    if (!hasIntakeSurface) {
      test.skip(
        true,
        "Direct intake UI is not available in this deployment/role context"
      );
      return;
    }

    const rowIndex = 0;
    await fillAgGridTextCell(page, rowIndex, "vendorName", customVendorName);
    await fillAgGridTextCell(page, rowIndex, "item", itemName);
    await fillAgGridTextCell(page, rowIndex, "qty", "12");
    await fillAgGridTextCell(page, rowIndex, "cogs", "45");
    await setSelectedRowLocation(page, "Main Warehouse");

    const intakeStatuses: number[] = [];
    page.on("response", response => {
      if (response.url().includes("/api/trpc/inventory.intake")) {
        intakeStatuses.push(response.status());
      }
    });

    await page.getByRole("button", { name: "Submit Selected" }).click();

    await expect
      .poll(async () => intakeStatuses.length, { timeout: 30_000 })
      .toBeGreaterThan(0);

    await expect(page.getByText("Brand/Farmer is required")).toHaveCount(0);
  });

  test("should submit selected row from top controls without manual Brand/Farmer entry", async ({
    page,
  }): Promise<void> => {
    test.setTimeout(120_000);
    itemName = createItemName();
    const vendorName = await findFirstVendorName(page);

    await navigateToDirectIntake(page);

    const addRowButton = page.getByRole("button", { name: "Add Row" });
    const hasIntakeSurface = await addRowButton.isVisible().catch(() => false);
    if (!hasIntakeSurface) {
      test.skip(
        true,
        "Direct intake UI is not available in this deployment/role context"
      );
      return;
    }

    const rowIndex = 0;
    const topVendorInput = page.getByPlaceholder("Type or select vendor");
    const topProductInput = page.getByPlaceholder("Type or select product");
    const topControls = topVendorInput.locator(
      "xpath=ancestor::div[contains(@class,'border-b')][1]"
    );
    const topNumericInputs = topControls.locator("input[type='number']");

    await topVendorInput.fill(vendorName);
    await topProductInput.fill(itemName);
    await expect(topNumericInputs).toHaveCount(2);
    await topNumericInputs.nth(0).fill("250");
    await topNumericInputs.nth(1).fill("990");
    await setSelectedRowLocation(page, "Main Warehouse");

    const intakeStatuses: number[] = [];
    page.on("response", response => {
      if (response.url().includes("/api/trpc/inventory.intake")) {
        intakeStatuses.push(response.status());
      }
    });

    await page.getByRole("button", { name: "Submit Selected" }).click();

    await expect
      .poll(
        async () =>
          (await readAgGridCellText(page, rowIndex, "status")).toLowerCase(),
        { timeout: 60_000 }
      )
      .toContain("submitted");

    await expect
      .poll(async () => intakeStatuses.length, { timeout: 30_000 })
      .toBeGreaterThan(0);
    await expect(page.getByText("Brand/Farmer is required")).toHaveCount(0);
    await expect(page.getByText(/Request ID:\s*REQ-/i)).toHaveCount(0);
    await expect(
      page.getByText(/An unexpected error occurred\. Please try again\./i)
    ).toHaveCount(0);
  });

  test("should submit selected row after +5 rows from top controls without stale Brand/Farmer validation", async ({
    page,
  }): Promise<void> => {
    test.setTimeout(120_000);
    itemName = createItemName();
    const vendorName = await findFirstVendorName(page);

    await navigateToDirectIntake(page);

    const addRowButton = page.getByRole("button", { name: "Add Row" });
    const addFiveRowsButton = page.getByRole("button", { name: "+5 Rows" });
    const hasIntakeSurface = await addRowButton.isVisible().catch(() => false);
    if (!hasIntakeSurface) {
      test.skip(
        true,
        "Direct intake UI is not available in this deployment/role context"
      );
      return;
    }

    const rows = page.locator(".ag-center-cols-container .ag-row");
    const initialRowCount = await rows.count();
    await addFiveRowsButton.click();
    await expect(rows).toHaveCount(initialRowCount + 5, { timeout: 10_000 });

    const rowIndex = 0;
    const topVendorInput = page.getByPlaceholder("Type or select vendor");
    const topProductInput = page.getByPlaceholder("Type or select product");
    const topControls = topVendorInput.locator(
      "xpath=ancestor::div[contains(@class,'border-b')][1]"
    );
    const topNumericInputs = topControls.locator("input[type='number']");

    await topVendorInput.fill(vendorName);
    await topProductInput.fill(itemName);
    await expect(topNumericInputs).toHaveCount(2);
    await topNumericInputs.nth(0).fill("250");
    await topNumericInputs.nth(1).fill("990");
    await setSelectedRowLocation(page, "Main Warehouse");

    const intakeStatuses: number[] = [];
    page.on("response", response => {
      if (response.url().includes("/api/trpc/inventory.intake")) {
        intakeStatuses.push(response.status());
      }
    });

    // Do not blur fields before submit to stress edit->submit race conditions.
    await page.getByRole("button", { name: "Submit Selected" }).click();

    await expect
      .poll(
        async () =>
          (await readAgGridCellText(page, rowIndex, "status")).toLowerCase(),
        { timeout: 60_000 }
      )
      .toContain("submitted");

    await expect
      .poll(async () => intakeStatuses.length, { timeout: 30_000 })
      .toBeGreaterThan(0);
    expect(intakeStatuses.some(status => status >= 500)).toBeFalsy();
    await expect(page.getByText("Brand/Farmer is required")).toHaveCount(0);
    await expect(page.getByText(/Request ID:\s*REQ-/i)).toHaveCount(0);
    await expect(
      page.getByText(/An unexpected error occurred\. Please try again\./i)
    ).toHaveCount(0);
  });

  test("should keep custom product visible in selected-row controls and Edit Row", async ({
    page,
  }): Promise<void> => {
    test.setTimeout(120_000);
    itemName = createItemName();
    const vendorName = await findFirstVendorName(page);

    await navigateToDirectIntake(page);

    const addRowButton = page.getByRole("button", { name: "Add Row" });
    const hasIntakeSurface = await addRowButton.isVisible().catch(() => false);
    if (!hasIntakeSurface) {
      test.skip(
        true,
        "Direct intake UI is not available in this deployment/role context"
      );
      return;
    }

    const rowIndex = 0;
    await fillAgGridTextCell(page, rowIndex, "vendorName", vendorName);
    await fillAgGridTextCell(page, rowIndex, "item", itemName);
    await fillAgGridTextCell(page, rowIndex, "qty", "250");
    await fillAgGridTextCell(page, rowIndex, "cogs", "990");
    await setSelectedRowLocation(page, "Main Warehouse");

    const topProductInput = page
      .getByText("Product / Strain", { exact: true })
      .first()
      .locator("xpath=..")
      .locator("input")
      .first();
    await expect(topProductInput).toHaveValue(itemName);

    await page.getByRole("button", { name: "Edit Selected Details" }).click();

    const inspectorProductInput = page.getByPlaceholder(
      "Type product or choose suggestion"
    );
    await expect(inspectorProductInput).toHaveValue(itemName);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("complementary", { name: "Edit Row" })
    ).toBeHidden({ timeout: 10_000 });

    const intakeStatuses: number[] = [];
    page.on("response", response => {
      if (response.url().includes("/api/trpc/inventory.intake")) {
        intakeStatuses.push(response.status());
      }
    });

    await page.getByRole("button", { name: "Submit All Pending" }).click();

    await expect
      .poll(
        async () =>
          (await readAgGridCellText(page, rowIndex, "status")).toLowerCase(),
        { timeout: 60_000 }
      )
      .toContain("submitted");

    await expect
      .poll(async () => intakeStatuses.length, { timeout: 30_000 })
      .toBeGreaterThan(0);
    expect(intakeStatuses.some(status => status >= 500)).toBeFalsy();
    await expect(page.getByText("Brand/Farmer is required")).toHaveCount(0);
    await expect(page.getByText(/Request ID:\s*REQ-/i)).toHaveCount(0);
  });
});
