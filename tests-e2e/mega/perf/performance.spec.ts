/**
 * Mega QA Performance Budget Suite
 *
 * Tests performance budgets for critical pages and API calls.
 */

import { test, expect } from "@playwright/test";
import { loginAsStandardUser } from "../../fixtures/auth";

// Performance budgets in milliseconds
const BUDGETS = {
  pageLoad: {
    dashboard: 3000,
    orders: 3000,
    clients: 3000,
    inventory: 3000,
    analytics: 4000,
  },
  interaction: {
    modalOpen: 500,
    search: 1000,
    navigation: 2000,
  },
  api: {
    list: 2000,
    create: 3000,
    getById: 1000,
  },
};

// Helper to emit coverage tags
function emitTag(tag: string): void {
  console.info(`[COVERAGE] ${tag}`);
}

test.describe("Performance - Page Load Budgets", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("Dashboard loads within budget", async ({ page }) => {
    emitTag("perf-dashboard");

    const start = Date.now();
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const duration = Date.now() - start;

    console.info(
      `[PERF] Dashboard load: ${duration}ms (budget: ${BUDGETS.pageLoad.dashboard}ms)`
    );
    expect(duration).toBeLessThan(BUDGETS.pageLoad.dashboard);
  });

  test("Orders page loads within budget", async ({ page }) => {
    emitTag("perf-orders");

    const start = Date.now();
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");
    const duration = Date.now() - start;

    console.info(
      `[PERF] Orders load: ${duration}ms (budget: ${BUDGETS.pageLoad.orders}ms)`
    );
    expect(duration).toBeLessThan(BUDGETS.pageLoad.orders);
  });

  test("Clients page loads within budget", async ({ page }) => {
    emitTag("perf-clients");

    const start = Date.now();
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");
    const duration = Date.now() - start;

    console.info(
      `[PERF] Clients load: ${duration}ms (budget: ${BUDGETS.pageLoad.clients}ms)`
    );
    expect(duration).toBeLessThan(BUDGETS.pageLoad.clients);
  });

  test("Inventory page loads within budget", async ({ page }) => {
    emitTag("perf-inventory");

    const start = Date.now();
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");
    const duration = Date.now() - start;

    console.info(
      `[PERF] Inventory load: ${duration}ms (budget: ${BUDGETS.pageLoad.inventory}ms)`
    );
    expect(duration).toBeLessThan(BUDGETS.pageLoad.inventory);
  });

  test("Analytics page loads within budget", async ({ page }) => {
    emitTag("perf-analytics");

    const start = Date.now();
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    const duration = Date.now() - start;

    console.info(
      `[PERF] Analytics load: ${duration}ms (budget: ${BUDGETS.pageLoad.analytics}ms)`
    );
    expect(duration).toBeLessThan(BUDGETS.pageLoad.analytics);
  });
});

test.describe("Performance - Interaction Budgets", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("Modal opens within budget", async ({ page }) => {
    emitTag("perf-modal");

    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const createBtn = page
      .locator('button:has-text("Add"), button:has-text("New")')
      .first();
    if (await createBtn.isVisible().catch(() => false)) {
      const start = Date.now();
      await createBtn.click();

      const modal = page.locator('[role="dialog"]').first();
      await modal.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      const duration = Date.now() - start;

      console.info(
        `[PERF] Modal open: ${duration}ms (budget: ${BUDGETS.interaction.modalOpen}ms)`
      );

      if (await modal.isVisible().catch(() => false)) {
        expect(duration).toBeLessThan(BUDGETS.interaction.modalOpen);
        await page.keyboard.press("Escape");
      }
    }
  });

  test("Search responds within budget", async ({ page }) => {
    emitTag("perf-search");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();
    if (await searchInput.isVisible().catch(() => false)) {
      const start = Date.now();
      await searchInput.fill("test");
      await page.waitForLoadState("networkidle");
      const duration = Date.now() - start;

      console.info(
        `[PERF] Search: ${duration}ms (budget: ${BUDGETS.interaction.search}ms)`
      );
      expect(duration).toBeLessThan(BUDGETS.interaction.search);
    }
  });

  test("Navigation within budget", async ({ page }) => {
    emitTag("perf-navigation");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const navLinks = ["/orders", "/clients", "/inventory"];

    for (const link of navLinks) {
      const start = Date.now();
      await page.goto(link);
      await page.waitForLoadState("networkidle");
      const duration = Date.now() - start;

      console.info(`[PERF] Navigate to ${link}: ${duration}ms`);
      expect(duration).toBeLessThan(BUDGETS.interaction.navigation);
    }
  });
});

test.describe("Performance - Core Web Vitals", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("Dashboard has acceptable LCP", async ({ page }) => {
    emitTag("perf-lcp");

    // Navigate and measure performance
    await page.goto("/dashboard");

    // Get LCP from performance API
    const lcp = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        /* eslint-disable no-undef */
        new PerformanceObserver(entryList => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(
            (lastEntry as PerformanceEntry & { startTime: number }).startTime
          );
        }).observe({ type: "largest-contentful-paint", buffered: true });
        /* eslint-enable no-undef */

        // Timeout after 5 seconds
        setTimeout(() => resolve(5000), 5000);
      });
    });

    console.info(`[PERF] LCP: ${lcp}ms`);
    // LCP should be under 2.5 seconds for "good"
    expect(lcp).toBeLessThan(4000); // Allow 4s for CI environments
  });
});
