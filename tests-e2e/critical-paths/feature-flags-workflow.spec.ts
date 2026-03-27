/**
 * Feature Flags Workflow Critical Path Tests
 *
 * Lean workspace smoke coverage for feature controls and VIP access.
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

const FEATURE_FLAGS_ROUTE = "/settings/feature-flags";
const VIP_ACCESS_ROUTE = "/settings?tab=vip-impersonation";

async function waitForAppShell(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).not.toContainText(
    /Loading TERP\.\.\.|Loading page\.\.\./,
    {
      timeout: 30000,
    }
  );
}

async function gotoFeatureFlags(page: Page) {
  await page.goto(FEATURE_FLAGS_ROUTE);
  await waitForAppShell(page);
  await expect(page).toHaveURL(/\/settings\?tab=feature-flags/);
  await expect(
    page.getByRole("heading", { name: "Feature Controls" })
  ).toBeVisible({
    timeout: 10000,
  });
}

async function gotoVipAccess(page: Page) {
  await page.goto(VIP_ACCESS_ROUTE);
  await waitForAppShell(page);
  await expect(page).toHaveURL(/\/settings\?tab=vip-impersonation/);
  await expect(page.getByText("VIP Portal Impersonation Manager")).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Feature Flags Settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should redirect the legacy feature flags route into the settings workspace", async ({
    page,
  }) => {
    await gotoFeatureFlags(page);

    await expect(
      page.getByText("Control which features are active for your team")
    ).toBeVisible();
  });

  test("should display the feature controls surface", async ({ page }) => {
    await gotoFeatureFlags(page);

    await expect(
      page.getByRole("button", { name: "Add Control" })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Controls \(\d+\)/ })
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Change Log" })).toBeVisible();
  });

  test("should display feature flag switches", async ({ page }) => {
    await gotoFeatureFlags(page);

    await expect(
      page
        .getByRole("switch")
        .first()
        .or(page.getByText("No feature controls defined yet"))
    ).toBeVisible();
  });
});

test.describe("VIP Access Settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should load the VIP access surface and tabs", async ({ page }) => {
    await gotoVipAccess(page);

    await expect(page.getByRole("tab", { name: "VIP Clients" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Active Sessions/ })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Audit History" })
    ).toBeVisible();
  });

  test("should show the active sessions state", async ({ page }) => {
    await gotoVipAccess(page);

    await page.getByRole("tab", { name: /Active Sessions/ }).click();

    await expect(
      page
        .locator("table")
        .or(page.getByText("No active impersonation sessions"))
    ).toBeVisible();
  });

  test("should show the audit history state", async ({ page }) => {
    await gotoVipAccess(page);

    await page.getByRole("tab", { name: "Audit History" }).click();

    await expect(
      page.locator("table").or(page.getByText("No session history found"))
    ).toBeVisible();
  });
});
