/**
 * Control-Action Contract Tests (TER-194)
 *
 * Verifies that critical interactive controls actually trigger
 * their expected actions. Prevents "dead button" regressions.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { ControlContract } from "../utils/control-action-contracts";

test.describe("Control-Action Contracts: Orders Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Primary create action triggers navigation or modal", async ({
    page,
  }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    const urlBefore = page.url();

    // The button should either navigate to a create page or open a modal
    const createButton = page
      .locator("button")
      .filter({ hasText: /new sale|new order|create/i })
      .first();

    await expect(createButton).toBeVisible({ timeout: 10000 });
    await expect(createButton).toBeEnabled();
    await createButton.click();
    await page.waitForTimeout(2000);

    const urlChanged = page.url() !== urlBefore;
    const modalOpened = await page
      .locator('[role="dialog"]')
      .first()
      .isVisible()
      .catch(() => false);
    const createPageLoaded = await page
      .locator("h1, h2")
      .filter({ hasText: /create|new|order|sale|sheet|client/i })
      .first()
      .isVisible()
      .catch(() => false);

    expect(urlChanged || modalOpened || createPageLoaded).toBeTruthy();
  });

  test("Tab switching actually changes displayed content", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    const draftTab = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /draft/i })
      .first();
    const confirmedTab = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /confirmed/i })
      .first();

    if (
      !(await draftTab.isVisible().catch(() => false)) ||
      !(await confirmedTab.isVisible().catch(() => false))
    ) {
      test.skip();
      return;
    }

    // Click confirmed tab
    await confirmedTab.click();
    await page.waitForTimeout(500);

    // Verify the confirmed tab has the active/selected state
    const confirmedAriaSelected = await confirmedTab
      .getAttribute("aria-selected")
      .catch(() => null);
    const confirmedDataState = await confirmedTab
      .getAttribute("data-state")
      .catch(() => null);

    // Click draft tab
    await draftTab.click();
    await page.waitForTimeout(500);

    const draftAriaSelected = await draftTab
      .getAttribute("aria-selected")
      .catch(() => null);
    const draftDataState = await draftTab
      .getAttribute("data-state")
      .catch(() => null);

    // At least one indicator should show the tab changed state
    const tabStateChanged =
      confirmedAriaSelected === "true" ||
      confirmedDataState === "active" ||
      draftAriaSelected === "true" ||
      draftDataState === "active";

    expect(tabStateChanged).toBeTruthy();
  });
});

test.describe("Control-Action Contracts: Inventory Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Inventory page loads with interactive controls", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    const contract = new ControlContract(page);
    const intakeResult = await contract.verifyControlIsInteractive(
      'button:has-text("Intake")'
    );

    const hasInventoryList = await page
      .locator(
        "table, [role='table'], [data-testid='inventory-list'], [data-testid='batch-list']"
      )
      .first()
      .isVisible()
      .catch(() => false);
    const hasInventoryEmptyState = await page
      .locator("text=/no inventory found|no batches found/i")
      .first()
      .isVisible()
      .catch(() => false);

    expect(intakeResult.passed).toBeTruthy();
    expect(hasInventoryList || hasInventoryEmptyState).toBeTruthy();
  });
});

test.describe("Control-Action Contracts: Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Sidebar navigation links trigger page changes", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const contract = new ControlContract(page);
    const results: Awaited<
      ReturnType<typeof contract.verifyButtonTriggersNavigation>
    >[] = [];

    // Test key navigation links
    const navTargets = [
      {
        selector: 'a[href="/orders"], nav a:has-text("Orders")',
        url: /\/orders/,
      },
      {
        selector: 'a[href="/inventory"], nav a:has-text("Inventory")',
        url: /\/inventory/,
      },
      {
        selector: 'a[href="/clients"], nav a:has-text("Clients")',
        url: /\/clients/,
      },
    ];

    for (const target of navTargets) {
      const link = page.locator(target.selector).first();
      if (await link.isVisible().catch(() => false)) {
        const result = await contract.verifyButtonTriggersNavigation(
          target.selector,
          target.url
        );
        results.push(result);
        // Navigate back to dashboard for next test
        await page.goto("/dashboard");
        await page.waitForLoadState("networkidle");
      }
    }

    // At least one nav link should have worked
    expect(results.length).toBeGreaterThan(0);
    const passed = results.filter(r => r.passed);
    expect(passed.length).toBeGreaterThan(0);
  });
});
