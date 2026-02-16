import { test, expect } from "../fixtures/test-fixtures";

// Route contract: legacy paths redirect to consolidated workspaces
// /clients -> /relationships?tab=clients
// /orders  -> /sales?tab=orders
const navTargets = [
  { label: "Dashboard", path: "/", pattern: /\/$|\/dashboard$/ },
  { label: "Clients", path: "/clients", pattern: /\/relationships\?tab=clients|\/clients/ },
  { label: "Inventory", path: "/inventory", pattern: /\/inventory/ },
  { label: "Orders", path: "/orders", pattern: /\/sales\?tab=orders|\/orders/ },
];

test.describe("Navigation", () => {
  test("navigates between main sections", async ({
    dashboardPage,
    clientsPage,
    page,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();

    for (const target of navTargets) {
      await dashboardPage.openNavigationLink(target.label);
      await expect(page).toHaveURL(target.pattern);
      if (target.label === "Clients") {
        await clientsPage.expectLoaded();
      }
    }
  });
});
