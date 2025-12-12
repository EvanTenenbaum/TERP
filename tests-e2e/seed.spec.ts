import { test, expect } from '@playwright/test';

/**
 * Seed Spec: Authentication & Base Setup
 * 
 * This foundational test provides reusable authentication flows for AI-generated tests.
 * AI agents (Planner, Generator, Healer) use this spec to establish authenticated context.
 * 
 * Run this spec first to ensure test data and authentication are properly set up.
 */

test.describe('Seed: Authentication & Base Setup', () => {
  test('should authenticate as admin user', async ({ page }) => {
    await page.goto('/login');
    
    // Login with admin credentials (from test database seeding)
    await page.fill('input[name="email"], input[type="email"]', 'admin@terp.test');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Verify successful login - should redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
    
    // Verify admin-specific UI elements are visible
    await expect(page.locator('[data-testid="admin-menu"], nav, .sidebar').first()).toBeVisible();
  });

  test('should authenticate as standard user', async ({ page }) => {
    await page.goto('/login');
    
    // Login with standard user credentials
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Verify successful login
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
  });

  test('should verify base data exists', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'admin@terp.test');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
    
    // Verify essential test data exists by checking key pages
    
    // Check clients exist
    await page.goto('/clients');
    await expect(page.locator('table tbody tr, [data-testid="client-card"], .client-item').first()).toBeVisible({ timeout: 5000 });
    
    // Check inventory exists
    await page.goto('/inventory');
    await expect(page.locator('table tbody tr, [data-testid="inventory-item"], .inventory-card').first()).toBeVisible({ timeout: 5000 });
  });

  test('should verify navigation is accessible', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'admin@terp.test');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
    
    // Verify main navigation links are present
    const navLinks = page.locator('nav a, .sidebar a, [role="navigation"] a');
    await expect(navLinks.first()).toBeVisible();
    
    // Count should be > 0 indicating navigation is populated
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});
