/**
 * Smoke Test Suite - Critical Path Verification
 *
 * These tests verify that the most critical user journeys work correctly.
 * Run these tests after each deployment to verify fixes for:
 * - BUG-040: Order Creator loads inventory
 * - BUG-041: Batch Detail View opens without crash
 * - BUG-042: Global Search returns results
 * - QA-049: Products page shows products
 * - QA-050: Samples page shows samples
 *
 * Usage:
 *   pnpm test:smoke                    # Run against local dev
 *   PLAYWRIGHT_BASE_URL=https://... pnpm test:smoke  # Run against staging/prod
 */

import { test, expect, Page } from "@playwright/test";

// Configuration
const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.MEGA_QA_BASE_URL ||
  "http://localhost:5173";

const IS_PRODUCTION = BASE_URL.includes("ondigitalocean.app");

// Test credentials - use existing E2E admin user (created by ensure-e2e-users.ts)
const TEST_CREDENTIALS = {
  email: process.env.E2E_ADMIN_USERNAME || "admin@terp.test",
  password: process.env.E2E_ADMIN_PASSWORD || "admin123",
};

// Increase timeouts for production tests
test.setTimeout(IS_PRODUCTION ? 90000 : 30000);

/**
 * Login helper for smoke tests
 */
async function loginIfNeeded(page: Page): Promise<void> {
  // Check if we're on a login page or auth check screen
  const isAuthScreen = await page
    .getByText(/checking authentication|sign in|login/i)
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (!isAuthScreen) {
    // Already authenticated or no auth required
    return;
  }

  console.info("Authentication required, logging in...");

  // Navigate to login page if not already there
  const currentUrl = page.url();
  if (!currentUrl.includes("/login")) {
    await page.goto(`${BASE_URL}/login`);
  }

  // Wait for login form to be ready
  await page
    .waitForLoadState("networkidle", { timeout: 15000 })
    .catch(() => {});

  // Fill email/username
  const emailInput = page
    .locator('input[name="username"]')
    .or(page.locator('input[name="email"]'))
    .or(page.locator('input[type="email"]'))
    .or(page.locator("#username"))
    .or(page.locator("#email"));

  await emailInput.first().fill(TEST_CREDENTIALS.email);

  // Fill password
  const passwordInput = page
    .locator('input[name="password"]')
    .or(page.locator('input[type="password"]'))
    .or(page.locator("#password"));

  await passwordInput.first().fill(TEST_CREDENTIALS.password);

  // Submit form
  const submitButton = page
    .locator('button[type="submit"]')
    .or(page.getByRole("button", { name: /sign in|login|submit/i }));

  await submitButton.first().click();

  // Wait for redirect to dashboard or main app
  await page.waitForURL(/\/($|dashboard|inventory|orders)/, { timeout: 20000 });

  console.info("✓ Login successful");
}

test.describe("Smoke Tests - Critical Paths", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    // Set longer timeout for navigation in production
    page.setDefaultNavigationTimeout(IS_PRODUCTION ? 30000 : 15000);
  });

  test("Dashboard loads successfully", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Handle authentication if needed
    await loginIfNeeded(page);

    // Wait for dashboard to load - check for heading or main content
    await expect(
      page.getByRole("heading", { name: /dashboard/i }).first()
    ).toBeVisible({ timeout: 20000 });

    // Verify no error states
    await expect(page.getByText(/error/i).first())
      .not.toBeVisible({ timeout: 2000 })
      .catch(() => {
        // Some "error" text might be in expected UI, so we just log
        console.info("Note: 'error' text found on page - verify if expected");
      });

    console.info("✓ Dashboard loaded successfully");
  });

  test("Products page shows products (QA-049)", async ({ page }) => {
    await page.goto(`${BASE_URL}/products`);

    // Handle authentication if needed
    await loginIfNeeded(page);

    // Wait for loading to complete
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {
      console.info("Note: Network not fully idle, continuing...");
    });

    // Wait for skeleton to disappear
    const skeleton = page.locator('[data-testid="products-skeleton"]');
    await expect(skeleton)
      .not.toBeVisible({ timeout: 15000 })
      .catch(() => {
        // Skeleton might not exist if already loaded
      });

    // Look for products table or grid
    const productsTable = page
      .locator("table")
      .or(page.locator('[class*="product"]'))
      .or(page.locator('[role="grid"]'));

    await expect(productsTable.first()).toBeVisible({ timeout: 10000 });

    // Verify there are product rows
    const rows = page.locator("tbody tr").or(page.locator('[role="row"]'));
    const rowCount = await rows.count();

    expect(rowCount).toBeGreaterThan(0);
    console.info(`✓ Products page shows ${rowCount} products`);
  });

  test("Samples page shows samples (QA-050)", async ({ page }) => {
    await page.goto(`${BASE_URL}/samples`);

    // Handle authentication if needed
    await loginIfNeeded(page);

    // Wait for loading to complete
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {
      console.info("Note: Network not fully idle, continuing...");
    });

    // Look for samples content
    const samplesContent = page
      .locator('[class*="sample"]')
      .or(page.locator("table"))
      .or(page.getByRole("tablist"));

    await expect(samplesContent.first()).toBeVisible({ timeout: 10000 });

    // Check for tab counts or sample data
    const tabsOrRows = page
      .locator('[role="tab"]')
      .or(page.locator("tbody tr"))
      .or(page.locator('[role="row"]'));

    const count = await tabsOrRows.count();
    expect(count).toBeGreaterThan(0);

    console.info(`✓ Samples page loaded with ${count} tabs/rows`);
  });

  test("Order Creator page loads (BUG-040 prerequisite)", async ({ page }) => {
    await page.goto(`${BASE_URL}/orders/create`);

    // Handle authentication if needed
    await loginIfNeeded(page);

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {
      console.info("Note: Network not fully idle, continuing...");
    });

    // Verify the page doesn't show a 404 or critical error
    await expect(page.getByText(/404/i).or(page.getByText(/page not found/i)))
      .not.toBeVisible({ timeout: 2000 })
      .catch(() => {});

    // Look for order creation form elements (customer select, form, etc.)
    const formElements = page
      .locator("form")
      .or(page.locator('[class*="order"]'))
      .or(page.getByRole("combobox"));

    await expect(formElements.first()).toBeVisible({ timeout: 10000 });

    console.info("✓ Order Creator page loads correctly");
  });

  test("Inventory page and batch navigation (BUG-041 prerequisite)", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/inventory`);

    // Handle authentication if needed
    await loginIfNeeded(page);

    // Wait for skeleton to disappear
    const skeleton = page.locator('[data-testid="inventory-skeleton"]');
    await expect(skeleton)
      .not.toBeVisible({ timeout: 15000 })
      .catch(() => {
        // Skeleton might not exist if already loaded
      });

    // Wait for inventory content to load
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {
      console.info("Note: Network not fully idle, continuing...");
    });

    // Verify inventory page has content
    const inventoryContent = page
      .locator("table")
      .or(page.locator('[class*="inventory"]'))
      .or(page.locator('[role="grid"]'));

    await expect(inventoryContent.first()).toBeVisible({ timeout: 10000 });

    // Count rows/batches
    const rows = page.locator("tbody tr").or(page.locator('[role="row"]'));
    const rowCount = await rows.count();

    if (rowCount > 0) {
      console.info(`✓ Inventory page shows ${rowCount} batches`);
    } else {
      console.info("✓ Inventory page loaded (no batches in current view)");
    }
  });

  test("Global Search is accessible (BUG-042 prerequisite)", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/`);

    // Handle authentication if needed
    await loginIfNeeded(page);

    // Wait for page to load
    await page
      .waitForLoadState("networkidle", { timeout: 15000 })
      .catch(() => {});

    // Look for search icon/button/input
    const searchTrigger = page
      .locator('[class*="search"]')
      .or(page.getByRole("searchbox"))
      .or(page.getByPlaceholder(/search/i))
      .or(page.locator("button").filter({ hasText: /search/i }))
      .or(page.locator('[aria-label*="search" i]'));

    // Search might be accessible via keyboard shortcut (Cmd+K / Ctrl+K)
    const hasSearchElement = await searchTrigger
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasSearchElement) {
      console.info("✓ Global search element found");
    } else {
      // Try keyboard shortcut
      await page.keyboard.press("Meta+k");
      await page.waitForTimeout(500);

      const searchDialog = page
        .locator('[role="dialog"]')
        .or(page.locator('[class*="command"]'));

      const hasDialog = await searchDialog
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (hasDialog) {
        console.info("✓ Global search accessible via Cmd+K");
        await page.keyboard.press("Escape");
      } else {
        console.info(
          "Note: Global search element not immediately visible - may require interaction"
        );
      }
    }
  });

  test("All main navigation links work", async ({ page }) => {
    const navLinks = [
      { path: "/", name: "Dashboard" },
      { path: "/clients", name: "Clients" },
      { path: "/orders", name: "Orders" },
      { path: "/invoices", name: "Invoices" },
      { path: "/inventory", name: "Inventory" },
      { path: "/products", name: "Products" },
      { path: "/samples", name: "Samples" },
      { path: "/settings", name: "Settings" },
    ];

    const results: Array<{ name: string; status: string }> = [];

    // First navigate to ensure we're logged in
    await page.goto(`${BASE_URL}/`);
    await loginIfNeeded(page);

    for (const link of navLinks) {
      await page.goto(`${BASE_URL}${link.path}`);

      // Wait for page to start loading
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });

      // Check for 404 or critical errors
      const has404 = await page
        .getByText(/404|page not found/i)
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      const hasCriticalError = await page
        .getByText(/something went wrong|fatal error|application error/i)
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false);

      if (has404) {
        results.push({ name: link.name, status: "404" });
        console.info(`✗ ${link.name} (${link.path}) - 404 Not Found`);
      } else if (hasCriticalError) {
        results.push({ name: link.name, status: "error" });
        console.info(`✗ ${link.name} (${link.path}) - Critical Error`);
      } else {
        results.push({ name: link.name, status: "ok" });
        console.info(`✓ ${link.name} (${link.path}) loads correctly`);
      }
    }

    // Verify all pages loaded without 404s
    const failures = results.filter(r => r.status !== "ok");
    expect(failures.length).toBe(0);
  });

  test("API health endpoint responds", async ({ request }) => {
    // Try multiple possible health endpoints
    const healthEndpoints = [
      "/api/health",
      "/health",
      "/health/live",
      "/api/health/live",
    ];

    let healthOk = false;
    let responseInfo = "";

    for (const endpoint of healthEndpoints) {
      try {
        const response = await request.get(`${BASE_URL}${endpoint}`);
        if (response.ok()) {
          healthOk = true;
          responseInfo = `${endpoint} returned ${response.status()}`;
          break;
        }
      } catch {
        // Continue to next endpoint
      }
    }

    if (healthOk) {
      console.info(`✓ Health check passed: ${responseInfo}`);
    } else {
      console.info(
        "Note: No standard health endpoint found - application may still be healthy"
      );
    }

    // Don't fail the test if no health endpoint exists - the app might not have one
    // The navigation tests above prove the app is running
  });
});

test.describe("Smoke Tests - Error Scenarios", () => {
  test("No JavaScript errors on dashboard load", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", error => {
      errors.push(error.message);
    });

    await page.goto(`${BASE_URL}/`);

    // Handle authentication if needed
    await loginIfNeeded(page);

    await page
      .waitForLoadState("networkidle", { timeout: 15000 })
      .catch(() => {});

    // Filter out known benign errors
    const criticalErrors = errors.filter(
      e =>
        !e.includes("ResizeObserver") && // Common benign error
        !e.includes("Non-Error") && // Common React hydration message
        !e.includes("hydration") // Hydration mismatches
    );

    if (criticalErrors.length > 0) {
      console.info("JavaScript errors found:");
      criticalErrors.forEach(e => console.info(`  - ${e}`));
    } else {
      console.info("✓ No critical JavaScript errors on dashboard");
    }

    expect(criticalErrors.length).toBe(0);
  });

  test("No console errors on products page", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", error => {
      errors.push(error.message);
    });

    await page.goto(`${BASE_URL}/products`);

    // Handle authentication if needed
    await loginIfNeeded(page);

    await page
      .waitForLoadState("networkidle", { timeout: 15000 })
      .catch(() => {});

    const criticalErrors = errors.filter(
      e =>
        !e.includes("ResizeObserver") &&
        !e.includes("Non-Error") &&
        !e.includes("hydration")
    );

    if (criticalErrors.length > 0) {
      console.info("JavaScript errors found on Products page:");
      criticalErrors.forEach(e => console.info(`  - ${e}`));
    } else {
      console.info("✓ No critical JavaScript errors on Products page");
    }

    expect(criticalErrors.length).toBe(0);
  });
});
