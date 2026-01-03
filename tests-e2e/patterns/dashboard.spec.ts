import { test } from "@playwright/test";
import { DashboardPage } from "../page-objects/DashboardPage";
import dashboards from "../fixtures/dashboards.json" with { type: "json" };

// Parameterized test for all dashboards
for (const dashboard of dashboards) {
  test.describe(`${dashboard.name} Flow`, () => {
    let dashboardPage: DashboardPage;

    test.beforeEach(async ({ page }) => {
      dashboardPage = new DashboardPage(page, dashboard);
      await dashboardPage.gotoDashboard();
    });

    test(`should display ${dashboard.name} with all metrics`, async () => {
      await dashboardPage.verifyMetrics();
    });

    if (dashboard.filterSelectors) {
      test(`should filter ${dashboard.name} data`, async () => {
        const filterName = Object.keys(dashboard.filterSelectors)[0];
        await dashboardPage.applyFilter(filterName, "last-30-days");
      });
    }
  });
}
