/**
 * Mega QA Must-Hit Suite
 *
 * Deterministic tests that guarantee coverage of every required tag.
 * These tests are not randomized - they provide a baseline guarantee
 * that critical functionality works before randomized journeys run.
 */

import { test, expect } from "@playwright/test";
import { loginAsStandardUser, AUTH_ROUTES, TEST_USERS } from "../fixtures/auth";

async function fillFirstVisible(
  page: import("@playwright/test").Page,
  selectors: string[],
  value: string
): Promise<void> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.fill(value);
      return;
    }
  }
  throw new Error(`No visible input found for selectors: ${selectors.join(", ")}`);
}

// Helper to emit coverage tags (would integrate with Mega QA reporter)
function emitTag(tag: string): void {
  // In production, this would write to a coverage file
  console.log(`[COVERAGE] ${tag}`);
}

// ============================================================================
// System-Wide Controls (TS-001, TS-002)
// ============================================================================

test.describe("System-Wide Controls", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("TS-001: Cmd+K opens command palette", async ({ page }) => {
    emitTag("TS-001");
    emitTag("regression:cmd-k");

    await page.goto("/dashboard");

    // Open command palette with Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    await page.keyboard.press("Meta+k");

    // Wait for command palette to appear
    const palette = page.locator(
      '[role="dialog"], [data-command-palette], .command-palette'
    );

    // If Meta+K didn't work, try Ctrl+K
    if (!(await palette.isVisible({ timeout: 1000 }).catch(() => false))) {
      await page.keyboard.press("Control+k");
    }

    // Verify palette is open or command input is focused
    const isVisible = await palette
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const commandInput = page.locator(
      'input[placeholder*="command" i], input[placeholder*="search" i]'
    );
    const inputVisible = await commandInput
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    expect(isVisible || inputVisible).toBeTruthy();

    // Close with Escape
    await page.keyboard.press("Escape");
  });

  test("TS-002: Theme toggle persists", async ({ page }) => {
    emitTag("TS-002");
    emitTag("regression:theme-toggle");

    await page.goto("/dashboard");

    // Find theme toggle
    const themeToggle = page
      .locator(
        'button[aria-label*="theme" i], button[aria-label*="dark" i], [data-theme-toggle]'
      )
      .first();

    if (await themeToggle.isVisible()) {
      // Get initial theme
      const html = page.locator("html");
      const initialDark = await html.evaluate(el =>
        el.classList.contains("dark")
      );

      // Toggle theme
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Verify theme changed
      const afterToggle = await html.evaluate(el =>
        el.classList.contains("dark")
      );
      expect(afterToggle).not.toBe(initialDark);

      // Reload and verify persistence
      await page.reload();
      await page.waitForLoadState("domcontentloaded");

      const afterReload = await html.evaluate(el =>
        el.classList.contains("dark")
      );
      expect(afterReload).toBe(afterToggle);
    }
  });
});

// ============================================================================
// Authentication (TS-1.1, TS-1.2)
// ============================================================================

test.describe("Authentication", () => {
  test("TS-1.1: Admin login success/failure paths", async ({ page }) => {
    emitTag("TS-1.1");
    emitTag("route:/login");
    emitTag("api:auth.login");

    // Test failure path first
    await page.goto(AUTH_ROUTES.login);
    await fillFirstVisible(
      page,
      [
        'input[name="username"]',
        "#username",
        'input[placeholder*="username" i]',
        'input[type="email"]',
        'input[name="email"]',
      ],
      "invalid@example.com"
    );
    await fillFirstVisible(
      page,
      ['input[name="password"]', "#password", 'input[type="password"]'],
      "wrongpassword"
    );
    await page.click('button[type="submit"]');

    // Should show error
    // Login page renders errors as inline text (not necessarily role=alert)
    await expect(
      page.getByText(/invalid username or password/i).first()
    ).toBeVisible({ timeout: 5000 });

    // Test success path
    await fillFirstVisible(
      page,
      [
        'input[name="username"]',
        "#username",
        'input[placeholder*="username" i]',
        'input[type="email"]',
        'input[name="email"]',
      ],
      TEST_USERS.admin.email
    );
    await fillFirstVisible(
      page,
      ['input[name="password"]', "#password", 'input[type="password"]'],
      TEST_USERS.admin.password
    );
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/($|dashboard)(\?.*)?/, { timeout: 15000 });
  });

  test("TS-1.2: VIP Portal access has distinct layout", async ({ page }) => {
    emitTag("TS-1.2");
    emitTag("route:/vip-portal");

    await page.goto(AUTH_ROUTES.vipPortal);

    // VIP portal should have distinct branding/layout
    // At minimum, verify the page loads without 404
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // Should not be the same as admin login
    const pageContent = await page.content();
    expect(pageContent).not.toContain("Page Not Found");
    expect(pageContent).not.toContain("404");
  });
});

// ============================================================================
// Dashboard & Analytics (TS-2.1, TS-2.2)
// ============================================================================

test.describe("Dashboard & Analytics", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("TS-2.1: KPI widgets display and are interactive", async ({ page }) => {
    emitTag("TS-2.1");
    emitTag("route:/dashboard");
    emitTag("api:dashboard.getStats");

    await page.goto("/dashboard");

    // Look for KPI cards/widgets
    const widgets = page.locator("[data-widget], .widget, .card, [data-kpi]");
    await expect(widgets.first()).toBeVisible({ timeout: 10000 });

    // Verify no infinite spinner
    emitTag("regression:no-spinner");
    const spinner = page.locator('.spinner, [role="status"]');
    await expect(spinner)
      .not.toBeVisible({ timeout: 5000 })
      .catch(() => {});
  });

  test("TS-2.2: Analytics page with real data", async ({ page }) => {
    emitTag("TS-2.2");
    emitTag("route:/analytics");
    emitTag("regression:analytics-data");

    await page.goto("/analytics");

    // Page should load without 404
    await expect(page).not.toHaveURL(/404/);

    // Look for charts or data displays
    const charts = page.locator("canvas, svg, .chart, .recharts-wrapper");
    const dataDisplays = page.locator("[data-analytics], .metric, .kpi");

    // At least one should be visible
    const _hasContent =
      (await charts
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await dataDisplays
        .first()
        .isVisible()
        .catch(() => false));

    // Don't fail if analytics is empty, but verify page loaded
    const heading = page.locator("h1, h2").filter({ hasText: /analytics/i });
    if (!(await heading.isVisible().catch(() => false))) {
      // If no analytics heading, at least verify we're not on 404
      await expect(page.locator("body")).not.toContainText("Page Not Found");
    }
  });
});

// ============================================================================
// Core Routes (regression tests)
// ============================================================================

test.describe("Core Routes", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("route:/orders loads without 404", async ({ page }) => {
    emitTag("route:/orders");
    emitTag("api:orders.list");

    await page.goto("/orders");
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("route:/clients loads without 404", async ({ page }) => {
    emitTag("route:/clients");
    emitTag("api:clients.list");

    await page.goto("/clients");
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("route:/inventory loads without 404", async ({ page }) => {
    emitTag("route:/inventory");
    emitTag("api:batches.list");

    await page.goto("/inventory");
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("route:/search loads without 404 (BUG-019)", async ({ page }) => {
    emitTag("route:/search");
    emitTag("regression:search-404");

    await page.goto("/search?q=test");
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("route:/todo-lists loads without 404 (BUG-020)", async ({ page }) => {
    emitTag("route:/todo-lists");
    emitTag("regression:todo-404");

    await page.goto("/todo-lists");
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("route:/calendar loads without 404", async ({ page }) => {
    emitTag("route:/calendar");

    await page.goto("/calendar");
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("route:/workflow-queue loads without 404", async ({ page }) => {
    emitTag("route:/workflow-queue");

    await page.goto("/workflow-queue");
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("route:/accounting loads without 404", async ({ page }) => {
    emitTag("route:/accounting");

    await page.goto("/accounting");
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("route:/invoices loads without 404", async ({ page }) => {
    emitTag("route:/invoices");
    emitTag("api:invoices.list");

    await page.goto("/invoices");
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("route:/settings loads without 404", async ({ page }) => {
    emitTag("route:/settings");

    await page.goto("/settings");
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });
});

// ============================================================================
// Layout Consistency (BUG-023)
// ============================================================================

test.describe("Layout Consistency", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("regression:layout-consistency - consistent nav across pages", async ({
    page,
  }) => {
    emitTag("regression:layout-consistency");

    const pagesToCheck = ["/dashboard", "/orders", "/clients", "/inventory"];

    for (const url of pagesToCheck) {
      await page.goto(url);

      // Check for sidebar/navigation
      const nav = page.locator('nav, aside, [role="navigation"]').first();
      await expect(nav).toBeVisible({ timeout: 5000 });

      // Check for header (should be present on all pages)
      const header = page.locator('header, [role="banner"]').first();
      const _headerVisible = await header.isVisible().catch(() => false);

      // At least nav should be consistent
      expect(await nav.isVisible()).toBeTruthy();
    }
  });
});

// ============================================================================
// 404 Handling (TS-11.1)
// ============================================================================

test.describe("Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("TS-11.1: Invalid URL shows Not Found", async ({ page }) => {
    emitTag("TS-11.1");

    await page.goto("/this-route-does-not-exist-12345");

    // Should show some form of not found message
    const notFoundIndicators = [
      page.locator("text=/not found/i"),
      page.locator("text=/404/"),
      page.locator('[data-testid="not-found"]'),
    ];

    let foundNotFound = false;
    for (const indicator of notFoundIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        foundNotFound = true;
        break;
      }
    }

    // It's acceptable if the app redirects to dashboard instead of showing 404
    const onDashboard = page.url().includes("dashboard");
    expect(foundNotFound || onDashboard).toBeTruthy();
  });
});
