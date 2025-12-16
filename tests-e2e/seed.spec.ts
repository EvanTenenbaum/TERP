import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAsAdmin, loginAsStandardUser } from './fixtures/auth';

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
    await loginAsAdmin(page);
    
    // Verify admin-specific UI elements are visible
    await expect(page.locator('[data-testid="admin-menu"], nav, .sidebar').first()).toBeVisible();
  });

  test('should authenticate as standard user', async ({ page }) => {
    await loginAsStandardUser(page);
    
    // Verify successful login
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });

  test('should verify base data exists', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Verify essential test data exists by checking key pages
    
    // Check clients exist
    await page.goto('/clients');
    await expect(page.locator('table tbody tr, [data-testid="client-card"], .client-item').first()).toBeVisible({ timeout: 5000 });
    
    // Check inventory exists
    await page.goto('/inventory');
    await expect(page.locator('table tbody tr, [data-testid="inventory-item"], .inventory-card').first()).toBeVisible({ timeout: 5000 });
  });

  test('should verify navigation is accessible', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Verify main navigation links are present
    const navLinks = page.locator('nav a, .sidebar a, [role="navigation"] a');
    await expect(navLinks.first()).toBeVisible();
    
    // Count should be > 0 indicating navigation is populated
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});
