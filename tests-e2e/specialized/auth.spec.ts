import { test, expect } from '@playwright/test';
import { argosScreenshot } from '@argos-ci/playwright';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Authentication Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await argosScreenshot(page, 'login-page');
    await injectAxe(page);
    await checkA11y(page);

    // Fill login form
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    await argosScreenshot(page, 'dashboard-after-login');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form with invalid credentials
    await page.fill('input[name="email"], input[type="email"]', 'invalid@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    const errorMessage = page.locator('text="Invalid", text="Error", [role="alert"]').first();
    await expect(errorMessage).toBeVisible();
    await argosScreenshot(page, 'login-error');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Logout
    await page.click('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
    await argosScreenshot(page, 'logged-out');
  });
});
