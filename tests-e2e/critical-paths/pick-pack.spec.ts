/**
 * E2E Tests: Shipping Workflow (WS-003)
 *
 * Lean workspace smoke coverage for the shipping queue.
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

const LEGACY_SHIPPING_ROUTE = "/operations?tab=shipping";
const SHIPPING_ROUTE = "/inventory?tab=shipping";

async function waitForAppShell(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).not.toContainText(
    /Loading TERP\.\.\.|Loading page\.\.\./,
    {
      timeout: 30000,
    }
  );
}

async function gotoShippingWorkspace(page: Page) {
  await page.goto(SHIPPING_ROUTE);
  await waitForAppShell(page);
  await expect(page).toHaveURL(/\/inventory\?tab=shipping/);
  await expect(page.getByTestId("pick-pack-header")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("order-queue")).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Shipping Workflow (WS-003)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should redirect the legacy shipping route into the inventory workspace", async ({
    page,
  }) => {
    await page.goto(LEGACY_SHIPPING_ROUTE);
    await waitForAppShell(page);

    await expect(page).toHaveURL(/\/inventory\?tab=shipping/);
    await expect(page.getByTestId("pick-pack-header")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should load the shipping queue and primary controls", async ({
    page,
  }) => {
    await gotoShippingWorkspace(page);

    await expect(
      page.getByRole("button", { name: "Refresh Queue" })
    ).toBeVisible();
    await expect(page.getByTestId("pick-pack-search-input")).toBeVisible();
    await expect(page.getByTestId("status-filter")).toBeVisible();
  });

  test("should filter orders by status", async ({ page }) => {
    await gotoShippingWorkspace(page);

    await page.getByTestId("status-filter").click();
    await page.getByRole("option", { name: "Partial" }).click();

    await expect(page.getByTestId("pick-pack-reset-filters")).toBeEnabled();
  });

  test("should open order details for packing when queue rows exist", async ({
    page,
  }) => {
    await gotoShippingWorkspace(page);

    const firstOrder = page.getByTestId("order-queue-row").first();
    if (await firstOrder.isVisible().catch(() => false)) {
      await firstOrder.click();

      await expect(
        page.locator(
          '[data-testid="order-details"], [data-testid="packing-interface"], .order-details, [role="dialog"]'
        )
      ).toBeVisible({ timeout: 5000 });
    } else {
      await expect(
        page.getByText("Select an order to prepare for shipping")
      ).toBeVisible();
    }
  });
});

test.describe("Shipping - Mobile Responsive", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should remain usable on a mobile viewport", async ({ page }) => {
    await gotoShippingWorkspace(page);

    const body = page.locator("body");
    const bodyWidth = await body.evaluate(el => el.scrollWidth);

    expect(bodyWidth).toBeLessThanOrEqual(425);
    await expect(page.getByTestId("order-queue")).toBeVisible();
  });
});
