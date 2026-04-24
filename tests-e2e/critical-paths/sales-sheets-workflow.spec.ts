/**
 * Sales Sheets Workflow Critical Path Tests
 *
 * Verifies the standardized sales catalogue workflow
 * including workspace navigation, client selection, inventory browsing,
 * and draft/output controls.
 *
 * Sprint D Requirement: QA-062
 */
import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsStandardUser } from "../fixtures/auth";

async function openSalesSheets(page: Page): Promise<void> {
  await page.goto("/sales-sheets");

  await expect(page).not.toHaveURL(/404/);
  await expect(page.locator("body")).not.toContainText("Page Not Found");
  await expect(page.getByRole("heading", { name: "Sales" })).toBeVisible();
}

async function getClientTrigger(page: Page): Promise<Locator> {
  const trigger = page.getByRole("combobox", { name: /select a client/i });
  await expect(trigger).toBeVisible();
  return trigger;
}

async function openClientPicker(page: Page): Promise<void> {
  const trigger = await getClientTrigger(page);
  await trigger.click();
  await expect(page.getByPlaceholder("Search clients...")).toBeVisible();
}

async function selectFirstClient(page: Page): Promise<string> {
  await openClientPicker(page);

  const firstOption = page
    .locator('[role="option"], [cmdk-item]')
    .filter({ hasText: /\S/ })
    .first();
  await expect(firstOption).toBeVisible();

  const clientName = (
    (await firstOption.locator("span").first().textContent()) ?? ""
  ).trim();

  await firstOption.click();
  await expect(page.getByText(/Client-priced inventory/i)).toBeVisible({
    timeout: 15000,
  });
  await expect(await getClientTrigger(page)).not.toContainText(
    /^Client\.\.\.$/
  );

  return clientName;
}

test.describe("Sales Sheets Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should navigate to sales sheets page", async ({ page }) => {
    await openSalesSheets(page);

    await expect(page).toHaveURL(
      /\/sales(?:\?.*tab=sales-sheets.*)?|\/sales-sheets/
    );
  });

  test("should display the unified sales workspace shell", async ({ page }) => {
    await openSalesSheets(page);

    await expect(page.getByText("Sales Catalogues")).toBeVisible();
    await expect(page.getByText("Sales Catalogue").first()).toBeVisible();
  });

  test("should have client selector and draft controls", async ({ page }) => {
    await openSalesSheets(page);

    await expect(await getClientTrigger(page)).toBeVisible();
    await expect(page.getByPlaceholder("Draft name...")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save draft/i })
    ).toBeVisible();
  });
});

test.describe("Sales Sheet Client Selection", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should open client dropdown", async ({ page }) => {
    await openSalesSheets(page);
    await openClientPicker(page);

    await expect(
      page
        .locator('[role="option"], [cmdk-item]')
        .filter({ hasText: /\S/ })
        .first()
    ).toBeVisible();
  });

  test("should select a client from dropdown", async ({ page }) => {
    await openSalesSheets(page);

    const clientName = await selectFirstClient(page);
    expect(clientName.length).toBeGreaterThan(0);
  });

  test("should show inventory browser after client selection", async ({
    page,
  }) => {
    await openSalesSheets(page);
    await selectFirstClient(page);

    await expect(page.getByText(/^Inventory$/)).toBeVisible();
    await expect(page.getByText(/Client-priced inventory/i)).toBeVisible();
    await expect(page.getByText(/^Preview$/)).toBeVisible();
    await expect(
      page.getByText(/Empty catalogue|Loading inventory/i)
    ).toBeVisible();
  });
});

test.describe("Sales Sheet Inventory Browser", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should replace the empty state with the inventory workspace after client selection", async ({
    page,
  }) => {
    await openSalesSheets(page);
    await selectFirstClient(page);

    await expect(
      page.getByText(/Select a client to start building a catalogue/i)
    ).not.toBeVisible();
    await expect(page.getByText(/Client-priced inventory/i)).toBeVisible();
  });

  test("should have row and pricing actions after client selection", async ({
    page,
  }) => {
    await openSalesSheets(page);
    await selectFirstClient(page);

    await expect(page.getByRole("button", { name: /add row/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /bulk add/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /select all/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /customer pricing/i })
    ).toBeVisible();
  });

  test("should show view and filter controls after client selection", async ({
    page,
  }) => {
    await openSalesSheets(page);
    await selectFirstClient(page);

    await expect(page.getByText(/Quick View/i).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save view/i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /filters/i })).toBeVisible();
  });
});

test.describe("Sales Sheet Draft Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should keep Save Draft available on the empty state", async ({
    page,
  }) => {
    await openSalesSheets(page);

    await expect(
      page.getByRole("button", { name: /save draft/i })
    ).toBeVisible();
    await expect(
      page.getByText(/Select a client to start building a catalogue/i)
    ).toBeVisible();
  });

  test("should reveal load draft options from the overflow menu after client selection", async ({
    page,
  }) => {
    await openSalesSheets(page);
    await selectFirstClient(page);

    const saveDraftButton = page.getByRole("button", { name: /save draft/i });
    const overflowMenuButton = saveDraftButton.locator(
      "xpath=following::button[@aria-haspopup='menu'][1]"
    );

    await expect(overflowMenuButton).toBeVisible();
    await overflowMenuButton.click();

    await expect(
      page.getByRole("menuitem", { name: /load draft/i })
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: /load saved sheet/i })
    ).toBeVisible();
  });

  test("should show next-step actions before a client is selected", async ({
    page,
  }) => {
    await openSalesSheets(page);

    await expect(
      page.getByRole("button", { name: /sales order/i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /quote/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^live$/i })).toBeVisible();
  });

  test("should show output actions after client selection", async ({
    page,
  }) => {
    await openSalesSheets(page);
    await selectFirstClient(page);

    await expect(
      page.getByRole("button", { name: /save sheet/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /share link/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /open shared view/i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^export$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /print/i })).toBeVisible();
  });
});
