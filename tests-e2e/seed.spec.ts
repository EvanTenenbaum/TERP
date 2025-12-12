import { test, expect } from '@playwright/test';

/**
 * Seed Spec: Authentication & Base Setup
 *
 * This foundational test provides reusable authentication flows for AI-generated tests.
 * It establishes baseline user sessions and verifies test data prerequisites.
 *
 * AI agents (Planner, Generator, Healer) will use this spec for authenticated context.
 */

test.describe('Seed: Authentication & Base Setup', () => {
  test.describe('Admin User Authentication', () => {
    test('should authenticate as admin user', async ({ page }) => {
      await page.goto('/login');

      // Login with admin credentials (from test database seeding)
      await page.fill('input[name="email"], input[type="email"]', 'admin@terp.test');
      await page.fill(
        'input[name="password"], input[type="password"]',
        'admin123'
      );
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

      // Verify admin-specific UI elements are visible
      await expect(
        page.locator('[data-testid="admin-menu"], nav, .sidebar').first()
      ).toBeVisible();
    });

    test('should have access to admin settings', async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('input[name="email"], input[type="email"]', 'admin@terp.test');
      await page.fill('input[name="password"], input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

      // Navigate to settings (admin-only area)
      const settingsLink = page.locator(
        'a[href*="settings"], button:has-text("Settings")'
      ).first();
      if (await settingsLink.isVisible()) {
        await settingsLink.click();
        await expect(page).toHaveURL(/settings/);
      }
    });
  });

  test.describe('Standard User Authentication', () => {
    test('should authenticate as standard user', async ({ page }) => {
      await page.goto('/login');

      // Login with standard user credentials
      await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
      await page.fill(
        'input[name="password"], input[type="password"]',
        'password123'
      );
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
    });

    test('should have limited access compared to admin', async ({ page }) => {
      // Login as standard user
      await page.goto('/login');
      await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"], input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

      // Standard users should see main navigation
      await expect(page.locator('nav, .sidebar, [role="navigation"]').first()).toBeVisible();
    });
  });

  test.describe('Base Data Verification', () => {
    test('should verify essential test data exists', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"], input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

      // Verify dashboard loads with data
      await expect(page.locator('main, [role="main"], .content').first()).toBeVisible();
    });

    test('should verify clients data is seeded', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"], input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

      // Navigate to clients
      await page.goto('/clients');

      // Should have at least one client from seeding
      const clientRows = page.locator(
        'table tbody tr, [data-testid="client-row"], .client-item'
      );
      await expect(clientRows.first()).toBeVisible({ timeout: 10000 });
    });

    test('should verify inventory data is seeded', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"], input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

      // Navigate to inventory
      await page.goto('/inventory');

      // Should have inventory items from seeding
      const inventoryItems = page.locator(
        'table tbody tr, [data-testid="inventory-row"], .inventory-item'
      );
      await expect(inventoryItems.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Session State Storage', () => {
    test('should store admin session state for reuse', async ({ page, context }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('input[name="email"], input[type="email"]', 'admin@terp.test');
      await page.fill('input[name="password"], input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

      // Store session state for reuse by AI-generated tests
      await context.storageState({ path: 'playwright/.auth/admin.json' });
    });

    test('should store standard user session state for reuse', async ({
      page,
      context,
    }) => {
      // Login as standard user
      await page.goto('/login');
      await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"], input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

      // Store session state for reuse by AI-generated tests
      await context.storageState({ path: 'playwright/.auth/user.json' });
    });
  });
});
