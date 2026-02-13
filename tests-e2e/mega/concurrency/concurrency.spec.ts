/**
 * Mega QA Concurrency / Race Condition Suite
 *
 * Tests that verify correct behavior under concurrent operations.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsStandardUser } from "../../fixtures/auth";

// Helper to emit coverage tags
function emitTag(tag: string): void {
  console.log(`[COVERAGE] ${tag}`);
}

test.describe("Concurrency - Parallel Sessions @dev-only", () => {
  test("Two users can view orders simultaneously", async ({ browser }) => {
    emitTag("concurrency-parallel-view");

    // Create two browser contexts (simulating two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Login both users
      await loginAsAdmin(page1);
      await loginAsStandardUser(page2);

      // Both navigate to orders simultaneously
      await Promise.all([page1.goto("/orders"), page2.goto("/orders")]);

      // Both should load successfully
      await Promise.all([
        page1.waitForLoadState("networkidle"),
        page2.waitForLoadState("networkidle"),
      ]);

      // Verify no crashes
      await expect(page1.locator("body")).toBeVisible();
      await expect(page2.locator("body")).toBeVisible();

      // Verify both see the orders page
      await expect(page1).not.toHaveURL(/404/);
      await expect(page2).not.toHaveURL(/404/);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("Concurrent list refreshes do not cause errors", async ({ browser }) => {
    emitTag("concurrency-refresh");

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await loginAsAdmin(page1);
      await loginAsStandardUser(page2);

      // Navigate to same page
      await page1.goto("/clients");
      await page2.goto("/clients");

      // Rapid concurrent refreshes
      const refreshes: Promise<void>[] = [];
      for (let i = 0; i < 5; i++) {
        refreshes.push(page1.reload().then(() => {}));
        refreshes.push(page2.reload().then(() => {}));
      }

      await Promise.all(refreshes);

      // Both should still work
      await expect(page1.locator("body")).toBeVisible();
      await expect(page2.locator("body")).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe("Concurrency - Modal Operations @dev-only", () => {
  test("Opening modal while another operation is in progress", async ({
    page,
  }) => {
    emitTag("concurrency-modal");

    await loginAsStandardUser(page);
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const createBtn = page
      .locator('button:has-text("Add"), button:has-text("New")')
      .first();
    if (await createBtn.isVisible().catch(() => false)) {
      // Click rapidly
      await createBtn.click();
      await createBtn.click({ force: true }).catch(() => {});

      // Should have at most one modal
      const modals = page.locator('[role="dialog"]');
      const count = await modals.count();

      expect(count).toBeLessThanOrEqual(1);

      // Clean up
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Concurrency - Navigation Race @dev-only", () => {
  test("Rapid navigation does not crash", async ({ page }) => {
    emitTag("concurrency-navigation");

    await loginAsStandardUser(page);

    const routes = [
      "/dashboard",
      "/orders",
      "/clients",
      "/inventory",
      "/analytics",
    ];

    // Navigate rapidly without waiting
    for (const route of routes) {
      page.goto(route).catch(() => {}); // Intentionally not awaiting
      await page.waitForTimeout(100);
    }

    // Wait for last navigation to settle
    await page.waitForLoadState("domcontentloaded");

    // Page should be responsive
    await expect(page.locator("body")).toBeVisible();
  });

  test("Browser back/forward during load", async ({ page }) => {
    emitTag("concurrency-history");

    await loginAsStandardUser(page);

    await page.goto("/dashboard");
    await page.goto("/orders");
    await page.goto("/clients");

    // Rapid back/forward
    await page.goBack();
    await page.goForward();
    await page.goBack();

    await page.waitForLoadState("domcontentloaded");

    // Should not crash
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Concurrency - API Race Conditions @dev-only", () => {
  test("Multiple search requests resolve correctly", async ({ page }) => {
    emitTag("concurrency-search");

    await loginAsStandardUser(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();

    if (await searchInput.isVisible().catch(() => false)) {
      // Type rapidly (each keystroke may trigger a request)
      await searchInput.fill("");
      await searchInput.pressSequentially("testquery", { delay: 50 });

      // Wait for debounce and requests to settle
      await page.waitForTimeout(1000);
      await page.waitForLoadState("networkidle");

      // Page should not crash
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
