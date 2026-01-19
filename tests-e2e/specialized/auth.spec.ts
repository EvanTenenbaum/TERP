import { test, expect } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";
import { injectAxe, checkA11y } from "axe-playwright";
import { TEST_USERS, loginViaForm } from "../fixtures/auth";

test.describe("Authentication Flow", () => {
  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login");
    await argosScreenshot(page, "login-page");
    await injectAxe(page);
    await checkA11y(page);

    // Fill login form with QA admin credentials
    await page.fill(
      'input[name="email"], input[name="username"], input[type="email"]',
      TEST_USERS.admin.email
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      TEST_USERS.admin.password
    );
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/($|dashboard)/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/($|dashboard)/);
    await argosScreenshot(page, "dashboard-after-login");
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill login form with invalid credentials
    await page.fill(
      'input[name="email"], input[name="username"], input[type="email"]',
      "invalid@example.com"
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      "wrongpassword"
    );
    await page.click('button[type="submit"]');

    // Wait for error message
    const errorMessage = page
      .locator('text="Invalid", text="Error", [role="alert"]')
      .first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await argosScreenshot(page, "login-error");
  });

  test("should logout successfully", async ({ page }) => {
    // Login first using helper
    await loginViaForm(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Logout
    await page.click(
      'button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]'
    );
    await page.waitForURL("/login", { timeout: 10000 });
    await expect(page).toHaveURL("/login");
    await argosScreenshot(page, "logged-out");
  });
});
