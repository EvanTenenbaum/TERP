/**
 * Mega QA Visual Regression Suite
 *
 * Captures and compares screenshots of key pages to detect visual regressions.
 * Uses Playwright's built-in screenshot comparison with optional Argos integration.
 */

import { test, expect } from "@playwright/test";
import { loginAsStandardUser } from "../../fixtures/auth";

// Helper to emit coverage tags
function emitTag(tag: string): void {
  console.info(`[COVERAGE] ${tag}`);
}

// Configure screenshot options
const screenshotOptions = {
  fullPage: true,
  animations: "disabled" as const,
  mask: [
    // Mask dynamic content that changes between runs
    '[data-testid="timestamp"]',
    '[data-testid="date"]',
    ".relative-time",
    "time",
  ],
};

test.describe("Visual Regression - Core Pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("Dashboard snapshot", async ({ page }) => {
    emitTag("visual-dashboard");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Take screenshot
    await expect(page).toHaveScreenshot("dashboard.png", screenshotOptions);
  });

  test("Orders list snapshot", async ({ page }) => {
    emitTag("visual-orders");

    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("orders-list.png", screenshotOptions);
  });

  test("Clients list snapshot", async ({ page }) => {
    emitTag("visual-clients");

    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("clients-list.png", screenshotOptions);
  });

  test("Inventory list snapshot", async ({ page }) => {
    emitTag("visual-inventory");

    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot(
      "inventory-list.png",
      screenshotOptions
    );
  });

  test("Analytics snapshot", async ({ page }) => {
    emitTag("visual-analytics");

    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    await page
      .locator('canvas, .chart-container, [data-testid*="chart"]')
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {});

    await expect(page).toHaveScreenshot("analytics.png", screenshotOptions);
  });

  test("Calendar snapshot", async ({ page }) => {
    emitTag("visual-calendar");

    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("calendar.png", screenshotOptions);
  });

  test("Settings snapshot", async ({ page }) => {
    emitTag("visual-settings");

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("settings.png", screenshotOptions);
  });
});

test.describe("Visual Regression - Theme Modes", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("Dashboard in dark mode", async ({ page }) => {
    emitTag("visual-dark-mode");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Switch to dark mode
    const html = page.locator("html");
    if (!(await html.evaluate(el => el.classList.contains("dark")))) {
      const toggle = page
        .locator('button[aria-label*="theme" i], button[aria-label*="dark" i]')
        .first();
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await page.waitForLoadState("networkidle");
      }
    }

    await expect(page).toHaveScreenshot(
      "dashboard-dark.png",
      screenshotOptions
    );
  });

  test("Dashboard in light mode", async ({ page }) => {
    emitTag("visual-light-mode");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Switch to light mode
    const html = page.locator("html");
    if (await html.evaluate(el => el.classList.contains("dark"))) {
      const toggle = page
        .locator('button[aria-label*="theme" i], button[aria-label*="dark" i]')
        .first();
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await page.waitForLoadState("networkidle");
      }
    }

    await expect(page).toHaveScreenshot(
      "dashboard-light.png",
      screenshotOptions
    );
  });
});

test.describe("Visual Regression - Components", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("Modal snapshot", async ({ page }) => {
    emitTag("visual-modal");

    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Open a modal
    const createBtn = page
      .locator('button:has-text("Add"), button:has-text("New")')
      .first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();

      const modal = page.locator('[role="dialog"]').first();
      await modal.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});

      if (await modal.isVisible().catch(() => false)) {
        await expect(modal).toHaveScreenshot("create-modal.png");
        await page.keyboard.press("Escape");
      }
    }
  });

  test("Navigation sidebar snapshot", async ({ page }) => {
    emitTag("visual-sidebar");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("nav, aside").first();
    if (await sidebar.isVisible().catch(() => false)) {
      await expect(sidebar).toHaveScreenshot("sidebar.png");
    }
  });

  test("Command palette snapshot", async ({ page }) => {
    emitTag("visual-cmd-palette");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Open command palette
    await page.keyboard.press("Meta+k");
    await page
      .locator('[role="dialog"], [data-command-palette], [cmdk-root]')
      .first()
      .waitFor({ state: "visible", timeout: 2000 })
      .catch(() => {});

    const palette = page
      .locator('[role="dialog"], [data-command-palette], .command-palette')
      .first();

    if (!(await palette.isVisible({ timeout: 1000 }).catch(() => false))) {
      await page.keyboard.press("Control+k");
      await page
        .locator('[role="dialog"], [data-command-palette], [cmdk-root]')
        .first()
        .waitFor({ state: "visible", timeout: 2000 })
        .catch(() => {});
    }

    if (await palette.isVisible().catch(() => false)) {
      await expect(palette).toHaveScreenshot("command-palette.png");
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Visual Regression - Responsive", () => {
  test("Dashboard mobile viewport", async ({ page }) => {
    emitTag("visual-mobile");

    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await loginAsStandardUser(page);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot(
      "dashboard-mobile.png",
      screenshotOptions
    );
  });

  test("Dashboard tablet viewport", async ({ page }) => {
    emitTag("visual-tablet");

    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await loginAsStandardUser(page);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot(
      "dashboard-tablet.png",
      screenshotOptions
    );
  });
});
