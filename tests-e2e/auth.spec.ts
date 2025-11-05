import { test, expect } from '@playwright/test';
import { argosScreenshot } from '@argos-ci/playwright';
import { checkAccessibility } from './utils/accessibility';

test.describe('Authentication Flow', () => {
  test('should allow a user to sign in and out', async ({ page }) => {
    // Navigate to the sign-in page
    await page.goto('/sign-in');
    await checkAccessibility(page);

    // Fill in the sign-in form
    await page.getByLabel('Email').fill('admin@terp.local');
    await page.getByLabel('Password').fill('password'); // Note: Use env vars for secrets
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Assert: User is redirected to the dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await checkAccessibility(page);

    // Take a screenshot for visual regression testing
    await argosScreenshot(page, 'dashboard-authenticated');

    // Sign out
    await page.getByRole('button', { name: 'User Menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();

    // Assert: User is redirected to the sign-in page
    await expect(page).toHaveURL('/sign-in');
  });
});
