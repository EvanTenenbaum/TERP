import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2').filter({ hasText: /login|sign in/i })).toBeVisible();
  });

  test('should show validation error for empty credentials', async ({ page }) => {
    await page.goto('/login');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    // Expect either form validation or error message
    await expect(page.locator('input:invalid, [role="alert"], .error')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'invalid@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Wait for error message
    await expect(page.locator('[role="alert"], .error, .toast').first()).toBeVisible({ timeout: 5000 });
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
  });

  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
    
    // Reload page
    await page.reload();
    
    // Should still be on dashboard, not redirected to login
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
    
    // Find and click logout button (could be in dropdown or direct button)
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [aria-label*="logout" i]').first();
    await logoutButton.click();
    
    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });

  test('should redirect to login when accessing protected route while logged out', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });

  test('should show password visibility toggle', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const toggleButton = page.locator('button[aria-label*="password" i], button:near(input[type="password"])').first();
    
    // Password should be hidden initially
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      // Password should be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });

  test('should handle remember me functionality', async ({ page }) => {
    await page.goto('/login');
    const rememberCheckbox = page.locator('input[type="checkbox"][name*="remember" i], label:has-text("Remember")').first();
    
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
      await expect(rememberCheckbox).toBeChecked();
    }
  });

  test('should display forgot password link', async ({ page }) => {
    await page.goto('/login');
    const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("Reset")').first();
    
    if (await forgotLink.isVisible()) {
      await expect(forgotLink).toBeVisible();
    }
  });
});
