import { test, expect } from "../fixtures/test-fixtures";

const credentials = {
  username: process.env.E2E_USERNAME ?? "e2e-user@terp.test",
  password: process.env.E2E_PASSWORD ?? "Password123!",
};

test.describe("Authentication", () => {
  test("logs in from the form and reaches the dashboard", async ({
    loginPage,
    dashboardPage,
    page,
  }) => {
    await loginPage.goto();
    await loginPage.assertLoaded();

    await loginPage.login(credentials.username, credentials.password);
    await dashboardPage.expectLoaded();
    await expect(page).toHaveURL(/dashboard|\/$/);
  });

  test("signs out from the user menu", async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();

    const logoutRequest = page.waitForRequest(request =>
      request.url().includes("/api/trpc/auth.logout")
    );

    await page.getByLabel("User menu").click();
    await page.getByRole("menuitem", { name: /Sign out/i }).click();

    await logoutRequest;
    await expect(page).toHaveURL(/login/);
    await expect(page.getByRole("heading", { name: "TERP" })).toBeVisible();
  });
});
