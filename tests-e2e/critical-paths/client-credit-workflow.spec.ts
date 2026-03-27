/**
 * E2E Tests: Client Credit Workflow
 *
 * Route-accurate smoke coverage for the relationships and credits workspaces.
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

const LEGACY_CLIENTS_ROUTE = "/clients";
const CLIENTS_ROUTE = "/relationships?tab=clients";
const LEGACY_CREDIT_SETTINGS_ROUTE = "/credit-settings";
const CREDIT_CAPACITY_ROUTE = "/credits?tab=capacity";
const ORDER_CREATOR_ROUTE = "/orders/new";

async function waitForAppShell(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).not.toContainText(
    /Loading TERP\.\.\.|Loading page\.\.\./,
    {
      timeout: 30000,
    }
  );
}

async function gotoClientsWorkspace(page: Page) {
  await page.goto(CLIENTS_ROUTE);
  await waitForAppShell(page);
  await expect(page).toHaveURL(/\/relationships\?tab=clients/);
  await expect(
    page.getByRole("heading", { name: "Relationships" })
  ).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("clients-search-input")).toBeVisible({
    timeout: 10000,
  });
}

async function gotoCreditCapacity(page: Page) {
  await page.goto(CREDIT_CAPACITY_ROUTE);
  await waitForAppShell(page);
  await expect(page).toHaveURL(/\/credits\?tab=capacity/);
  await expect(
    page.getByRole("heading", { name: "Credit Capacity Settings" })
  ).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Client Creation Flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should redirect the legacy clients route into the relationships workspace", async ({
    page,
  }) => {
    await page.goto(LEGACY_CLIENTS_ROUTE);
    await waitForAppShell(page);

    await expect(page).toHaveURL(/\/relationships\?tab=clients/);
    await expect(
      page.getByRole("heading", { name: "Relationships" })
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("should load the clients workspace shell", async ({ page }) => {
    await gotoClientsWorkspace(page);

    await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
    await expect(page.getByTestId("clients-table")).toBeVisible();
    await expect(page.getByRole("button", { name: "Quick Add" })).toBeVisible();
  });

  test("should open the quick add relationship dialog", async ({ page }) => {
    await gotoClientsWorkspace(page);

    await page.getByRole("button", { name: "Quick Add" }).click();

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("heading", { name: "Quick Add Relationship" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Relationship" })
    ).toBeVisible();
  });
});

test.describe("Credit Setup Flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should redirect the legacy credit settings route into the credits workspace", async ({
    page,
  }) => {
    await page.goto(LEGACY_CREDIT_SETTINGS_ROUTE);
    await waitForAppShell(page);

    await expect(page).toHaveURL(/\/credits\?tab=capacity/);
    await expect(
      page.getByRole("heading", { name: "Credit Capacity Settings" })
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("should display credit capacity controls", async ({ page }) => {
    await gotoCreditCapacity(page);

    await expect(
      page.getByRole("tab", { name: "Capacity Model" })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Visibility & Guardrails" })
    ).toBeVisible();
    await expect(page.getByText("Capacity Signal Weights")).toBeVisible();
  });
});

test.describe("Order with Credit Flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should load order creation with the customer credit drawer placeholder", async ({
    page,
  }) => {
    await page.goto(ORDER_CREATOR_ROUTE);
    await waitForAppShell(page);

    await expect(page).toHaveURL(/\/sales\?tab=create-order/);
    await expect(
      page.getByRole("heading", { name: "Create Sales Order" })
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Select a customer to begin")).toBeVisible();
    await expect(
      page.getByText("Choose a customer from the dropdown above")
    ).toBeVisible();
  });
});
