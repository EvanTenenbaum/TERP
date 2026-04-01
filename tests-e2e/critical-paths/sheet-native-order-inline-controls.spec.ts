import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

async function readCommandOption(option: Locator): Promise<{
  id: string;
  label: string;
}> {
  await expect(option).toBeVisible();

  const id = await option.getAttribute("data-value");
  const text = (await option.textContent()) ?? "";
  const nameText = await option
    .locator("span.font-medium")
    .first()
    .textContent()
    .catch(() => null);
  const label =
    nameText?.trim() ||
    text
      .split("\n")
      .map(part => part.trim())
      .find(Boolean);

  if (!id || !label) {
    throw new Error("Expected command option to expose a value and label");
  }

  return { id, label };
}

async function findClientRouteCandidate(page: Page): Promise<{
  id: string;
  label: string;
}> {
  await page.goto("/sales?tab=create-order");
  await page.getByRole("tab", { name: /^Create Order$/i }).click();
  await page.getByRole("combobox", { name: /select a client/i }).click();

  const options = page.locator("[cmdk-item][data-value]");
  const optionCount = Math.min(await options.count(), 8);
  const candidates: Array<{ id: string; label: string }> = [];

  for (let index = 0; index < optionCount; index += 1) {
    candidates.push(await readCommandOption(options.nth(index)));
  }

  const firstCandidate = candidates[0];
  if (!firstCandidate) {
    throw new Error("Could not find a client route candidate for SO testing");
  }

  return firstCandidate;
}

test.describe("Sheet-native order inline controls", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("hydrates the selected customer and renders inline price controls on the SO grid", async ({
    page,
  }) => {
    const selectedClient = await findClientRouteCandidate(page);
    await page.goto(`/sales?tab=create-order&clientId=${selectedClient.id}`);
    await page.getByRole("tab", { name: /^Create Order$/i }).click();
    const hydratedClientTrigger = page.getByRole("combobox", {
      name: /select a client/i,
    });
    await expect(hydratedClientTrigger).toBeVisible();

    await expect(hydratedClientTrigger).toContainText(selectedClient.label);

    const quantityInputs = page.locator('input[aria-label^="Quantity for "]');
    const priceInputs = page.locator('input[aria-label^="Price for "]');
    const markupInputs = page.locator('input[aria-label^="Markup for "]');

    await expect(quantityInputs.first()).toBeVisible();
    await expect(priceInputs.first()).toBeVisible();
    await expect(markupInputs.first()).toBeVisible();

    const quantityInput = page
      .locator('input[aria-label^="Quantity for "]:not([disabled])')
      .first();
    if ((await quantityInput.count()) === 0) {
      return;
    }

    await expect(quantityInput).toBeVisible();
    const quantityLabel = await quantityInput.getAttribute("aria-label");
    if (!quantityLabel) {
      throw new Error("Expected the SO row quantity input to expose a label");
    }
    const itemName = quantityLabel.replace(/^Quantity for /, "");
    const priceInput = page.getByLabel(`Price for ${itemName}`);
    const markupInput = page.getByLabel(`Markup for ${itemName}`);
    const addButton = page
      .locator("div.flex.items-center.gap-1.py-1")
      .filter({ has: page.getByLabel(quantityLabel) })
      .getByRole("button", { name: /^\+ Add$/ });

    await expect(priceInput).toBeVisible();
    await expect(markupInput).toBeVisible();

    await quantityInput.fill("3");
    await priceInput.fill("123.45");
    await markupInput.fill("15");
    await addButton.click();

    await expect(page.getByLabel(quantityLabel)).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /^Added$/ }).first()
    ).toBeVisible();
  });

  test("stages quantity inline before adding a PO catalog row", async ({
    page,
  }) => {
    await page.goto("/purchase-orders?poView=create");

    const supplierTrigger = page.getByRole("combobox", {
      name: /select a supplier/i,
    });
    await supplierTrigger.click();

    const firstSupplierOption = page.locator("[cmdk-item][data-value]").first();
    await expect(firstSupplierOption).toBeVisible();
    await firstSupplierOption.click();

    await page.getByRole("button", { name: /^Catalog$/i }).click();

    const quantityInput = page
      .locator('input[aria-label^="Quantity for "]:not([disabled])')
      .first();
    await expect(quantityInput).toBeVisible();
    const quantityLabel = await quantityInput.getAttribute("aria-label");
    if (!quantityLabel) {
      throw new Error("Expected the PO row quantity input to expose a label");
    }
    const addButton = page
      .locator("div.flex.items-center.gap-1.py-1")
      .filter({ has: page.getByLabel(quantityLabel) })
      .getByRole("button", { name: /^\+ Add$/ });

    await quantityInput.fill("6");
    await addButton.click();

    await expect(page.getByLabel(quantityLabel)).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /^Added$/ }).first()
    ).toBeVisible();
  });
});
