import { test, expect } from "../fixtures/test-fixtures";

const navTargets = [
  { label: "Dashboard", path: "/" },
  { label: "Clients", path: "/clients" },
  { label: "Inventory", path: "/inventory" },
  { label: "Orders", path: "/orders" },
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
      const escapedPath = target.path.replace(/\//g, "\\/");
      const pattern =
        target.path === "/" ? /\/$|\/dashboard$/ : new RegExp(escapedPath);
      await expect(page).toHaveURL(pattern);
      if (target.label === "Clients") {
        await clientsPage.expectLoaded();
      }
    }
  });
});
