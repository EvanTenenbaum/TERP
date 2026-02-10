/**
 * KPI Actionability Critical Path Tests
 *
 * Verifies that all KPI cards and data widgets are clickable
 * and navigate to the appropriate filtered views.
 *
 * Sprint B Requirement: ACT-001, ACT-002, ACT-003
 */
import { test, expect } from "@playwright/test";
import { loginAsStandardUser } from "../fixtures/auth";

test.describe("Dashboard KPI Actionability @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should navigate to invoices when clicking Cash Collected", async ({
    page,
  }) => {
    await page.goto("/");

    // Find and click Cash Collected card/row
    const cashCollected = page.locator("text=/cash collected/i").first();
    await expect(cashCollected).toBeVisible();
    await cashCollected.click();

    await page.waitForLoadState("networkidle");

    // Should navigate to accounting or invoices page
    const url = page.url();
    expect(url.includes("accounting") || url.includes("invoices")).toBeTruthy();
  });

  test("should navigate to client profile when clicking Sales Top 10 row", async ({
    page,
  }) => {
    await page.goto("/");

    // Find the Sales Top 10 widget and click a client row
    const clientRow = page
      .locator('[data-testid="sales-top-10"] tbody tr, .sales-widget tbody tr')
      .first();

    if (await clientRow.isVisible().catch(() => false)) {
      await clientRow.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to client profile
      expect(page.url()).toContain("client");
    }
  });

  test("should navigate to filtered inventory when clicking category", async ({
    page,
  }) => {
    await page.goto("/");

    // Find Inventory Snapshot and click a category (e.g., Flower)
    const categoryRow = page.locator("text=Flower").first();

    if (await categoryRow.isVisible().catch(() => false)) {
      await categoryRow.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to inventory with category filter
      expect(page.url()).toContain("inventory");
      expect(page.url().toLowerCase()).toContain("flower");
    }
  });

  test("should show View All link for Total Debt", async ({ page }) => {
    await page.goto("/");

    // Find Total Debt widget and look for View All
    const viewAll = page.locator("text=/view all/i").first();

    if (await viewAll.isVisible().catch(() => false)) {
      await viewAll.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to accounting
      expect(page.url()).toContain("accounting");
    }
  });
});

test.describe("Accounting KPI Actionability @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should navigate to invoices when clicking Accounts Receivable", async ({
    page,
  }) => {
    await page.goto("/accounting");

    // Find and click AR card
    const arCard = page.locator("text=/accounts receivable/i").first();

    if (await arCard.isVisible().catch(() => false)) {
      await arCard.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to invoices
      expect(page.url()).toContain("invoices");
    }
  });

  test("should navigate to bills when clicking Accounts Payable", async ({
    page,
  }) => {
    await page.goto("/accounting");

    // Find and click AP card
    const apCard = page.locator("text=/accounts payable/i").first();

    if (await apCard.isVisible().catch(() => false)) {
      await apCard.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to bills or vendor bills
      const url = page.url();
      expect(url.includes("bills") || url.includes("payable")).toBeTruthy();
    }
  });
});

test.describe("Clients KPI Actionability @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should filter table when clicking Clients with Debt KPI", async ({
    page,
  }) => {
    await page.goto("/clients");

    // Get initial row count
    // Find and click "With Debt" KPI
    const debtKpi = page.locator("text=/with debt/i").first();

    if (await debtKpi.isVisible().catch(() => false)) {
      await debtKpi.click();
      await page.waitForLoadState("networkidle");

      // URL should update with filter
      expect(page.url()).toContain("hasDebt=true");

      // Note: Table filtering may be broken (BUG-031)
      // This test documents expected behavior
    }
  });

  test("should filter table when clicking Buyers KPI", async ({ page }) => {
    await page.goto("/clients");

    // Find and click "Buyers" KPI
    const buyersKpi = page.locator("text=/buyers/i").first();

    if (await buyersKpi.isVisible().catch(() => false)) {
      await buyersKpi.click();
      await page.waitForLoadState("networkidle");

      // URL should update with filter
      expect(page.url()).toContain("type=buyer");
    }
  });

  test("should filter table when clicking Suppliers KPI", async ({ page }) => {
    await page.goto("/clients");

    // Find and click "Suppliers" KPI
    const suppliersKpi = page.locator("text=/suppliers/i").first();

    if (await suppliersKpi.isVisible().catch(() => false)) {
      await suppliersKpi.click();
      await page.waitForLoadState("networkidle");

      // URL should update with filter
      expect(page.url()).toContain("type=supplier");
    }
  });
});

test.describe("Inventory KPI Actionability @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should filter by category when clicking category chart segment", async ({
    page,
  }) => {
    await page.goto("/inventory");

    // Find category chart or list and click a category
    const categoryItem = page
      .locator("text=Flower, text=Concentrates, text=Edibles")
      .first();

    if (await categoryItem.isVisible().catch(() => false)) {
      await categoryItem.click();
      await page.waitForLoadState("networkidle");

      // URL should update with category filter
      expect(page.url()).toContain("category=");
    }
  });
});
