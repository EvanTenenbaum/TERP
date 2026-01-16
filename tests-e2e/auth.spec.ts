import { test, expect } from "@playwright/test";
import {
  TEST_USERS,
  loginAsAdmin,
  loginAsSalesManager,
  loginViaApi,
  loginViaForm,
  logout,
  isAuthenticated,
  AUTH_ROUTES,
} from "./fixtures/auth";

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto(AUTH_ROUTES.login);
    // Wait for page to load
    await page.waitForLoadState("networkidle");
    // Check for login form elements
    await expect(
      page.locator('button[type="submit"], input[type="submit"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("should show validation error for empty credentials", async ({
    page,
  }) => {
    await page.goto(AUTH_ROUTES.login);
    await page.waitForLoadState("networkidle");

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Expect either form validation or error message
    // Give it time for validation to trigger
    await page.waitForTimeout(500);
    const hasValidation = await page
      .locator(
        'input:invalid, [role="alert"], .error, .text-red-500, .text-destructive'
      )
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasValidation).toBeTruthy();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto(AUTH_ROUTES.login);
    await page.waitForLoadState("networkidle");

    // Fill with invalid credentials
    const emailInput = page
      .locator(
        'input[name="username"], input[name="email"], input[type="email"]'
      )
      .first();
    const passwordInput = page
      .locator('input[name="password"], input[type="password"]')
      .first();

    await emailInput.fill("invalid@example.com");
    await passwordInput.fill("wrongpassword");
    await page.click('button[type="submit"]');

    // Wait for error message (toast, alert, or inline error)
    await expect(
      page
        .locator(
          '[role="alert"], .error, .toast, .text-red-500, .text-destructive'
        )
        .first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("should successfully login with valid QA credentials via API", async ({
    page,
  }) => {
    const { email, password } = TEST_USERS.admin;

    // Login via API
    const success = await loginViaApi(page, email, password);
    expect(success).toBeTruthy();

    // Navigate to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should be on dashboard, not redirected to login
    await expect(page).toHaveURL(/\/(dashboard)?(\?.*)?$/, { timeout: 10000 });
  });

  test("should successfully login with valid QA credentials via form", async ({
    page,
  }) => {
    const { email, password } = TEST_USERS.admin;

    // Login via form
    await loginViaForm(page, email, password);

    // Should be on dashboard
    await expect(page).toHaveURL(/\/(dashboard)?(\?.*)?$/, { timeout: 10000 });
  });

  test("should persist session after page reload", async ({ page }) => {
    // Login using helper
    await loginAsAdmin(page);

    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/(dashboard)?(\?.*)?$/);

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still be on dashboard, not redirected to login
    await expect(page).toHaveURL(/\/(dashboard)?(\?.*)?$/);
  });

  test("should logout successfully via API", async ({ page }) => {
    // Login first
    await loginAsAdmin(page);

    // Verify authenticated
    const wasAuthenticated = await isAuthenticated(page);
    expect(wasAuthenticated).toBeTruthy();

    // Logout
    await logout(page);

    // Should be on login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Should no longer be authenticated
    const stillAuthenticated = await isAuthenticated(page);
    expect(stillAuthenticated).toBeFalsy();
  });

  test("should redirect to login when accessing protected route while logged out", async ({
    page,
  }) => {
    // Clear any existing session
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("should login as different roles successfully", async ({ page }) => {
    // Test Sales Manager login
    await loginAsSalesManager(page);
    await expect(page).toHaveURL(/\/(dashboard)?(\?.*)?$/);

    // Logout
    await logout(page);

    // Test Admin login
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/(dashboard)?(\?.*)?$/);
  });

  test("should show password field on login page", async ({ page }) => {
    await page.goto(AUTH_ROUTES.login);
    await page.waitForLoadState("networkidle");

    const passwordInput = page
      .locator('input[name="password"], input[type="password"]')
      .first();

    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("should have submit button on login page", async ({ page }) => {
    await page.goto(AUTH_ROUTES.login);
    await page.waitForLoadState("networkidle");

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });
});

test.describe("Authentication - Role-Based Access", () => {
  test("Super Admin can access all areas", async ({ page }) => {
    await loginAsAdmin(page);

    // Test access to various routes
    const routes = [
      "/dashboard",
      "/orders",
      "/clients",
      "/inventory",
      "/accounting",
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      // Should not be redirected to login or show access denied
      expect(page.url()).not.toContain("/login");
    }
  });

  test("Sales Manager can access sales-related areas", async ({ page }) => {
    await loginAsSalesManager(page);

    // Test access to sales routes
    const salesRoutes = ["/dashboard", "/orders", "/clients"];

    for (const route of salesRoutes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      expect(page.url()).not.toContain("/login");
    }
  });
});
