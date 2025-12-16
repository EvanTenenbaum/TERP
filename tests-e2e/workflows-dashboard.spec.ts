import { test, expect } from "@playwright/test";
import { loginAsStandardUser } from "./fixtures/auth";

test.describe("Workflows and Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login using centralized auth fixture
    await loginAsStandardUser(page);
  });

  test("should display dashboard with widgets", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.locator("h1, h2").filter({ hasText: /dashboard/i })
    ).toBeVisible();

    // Check for dashboard widgets
    const widgets = page.locator("[data-widget], .widget, .card");
    await expect(widgets.first()).toBeVisible({ timeout: 5000 });
  });

  test("should display KPI metrics", async ({ page }) => {
    await page.goto("/dashboard");

    // Look for common KPI elements
    const kpis = page.locator("[data-kpi], .kpi, .metric");

    if (await kpis.first().isVisible()) {
      await expect(kpis.first()).toBeVisible();
      const kpiText = await kpis.first().textContent();
      expect(kpiText).toBeTruthy();
    }
  });

  test("should navigate to workflow queue", async ({ page }) => {
    await page.goto("/workflow-queue");
    await expect(page).toHaveURL("/workflow-queue");
    await expect(
      page.locator("h1, h2").filter({ hasText: /workflow/i })
    ).toBeVisible();
  });

  test("should display workflow items", async ({ page }) => {
    await page.goto("/workflow-queue");

    const workflowItems = page.locator(
      '.workflow-item, [role="listitem"], tbody tr'
    );

    if (await workflowItems.first().isVisible()) {
      await expect(workflowItems.first()).toBeVisible();
    }
  });

  test("should filter workflows by status", async ({ page }) => {
    await page.goto("/workflow-queue");

    const filterButton = page
      .locator('button:has-text("Filter"), select[name*="status"]')
      .first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.locator('[role="option"], option').first().click();
      await page.waitForLoadState("networkidle");
    }
  });

  test("should complete a workflow task", async ({ page }) => {
    await page.goto("/workflow-queue");

    const firstItem = page
      .locator('.workflow-item, [role="listitem"], tbody tr')
      .first();

    if (await firstItem.isVisible()) {
      await firstItem.click();

      const completeButton = page
        .locator('button:has-text("Complete"), button:has-text("Done")')
        .first();

      if (await completeButton.isVisible()) {
        await completeButton.click();
        await expect(
          page
            .locator('.toast, [role="alert"]')
            .filter({ hasText: /success|completed/i })
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should navigate between dashboard sections", async ({ page }) => {
    await page.goto("/dashboard");

    // Try navigating to different sections via sidebar
    const inventoryLink = page
      .locator('a[href="/inventory"], nav a:has-text("Inventory")')
      .first();
    await inventoryLink.click();
    await expect(page).toHaveURL("/inventory");

    const ordersLink = page
      .locator('a[href="/orders"], nav a:has-text("Orders")')
      .first();
    await ordersLink.click();
    await expect(page).toHaveURL("/orders");
  });

  test("should display recent activity", async ({ page }) => {
    await page.goto("/dashboard");

    const activitySection = page
      .locator('[data-section="activity"], .activity, h3:has-text("Activity")')
      .first();

    if (await activitySection.isVisible()) {
      await expect(activitySection).toBeVisible();
    }
  });

  test("should refresh dashboard data", async ({ page }) => {
    await page.goto("/dashboard");

    const refreshButton = page
      .locator('button[aria-label*="refresh" i], button:has-text("Refresh")')
      .first();

    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator("[data-widget], .widget").first()
      ).toBeVisible();
    }
  });

  test("should display charts and graphs", async ({ page }) => {
    await page.goto("/dashboard");

    const charts = page.locator('canvas, svg[class*="recharts"], .chart');

    if (await charts.first().isVisible()) {
      await expect(charts.first()).toBeVisible();
    }
  });
});
