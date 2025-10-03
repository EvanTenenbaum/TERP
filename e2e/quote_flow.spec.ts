import { test, expect } from '@playwright/test';

test('navigate to Quotes page', async ({ page }) => {
  await page.goto('/quotes');
  await expect(page.getByText('Quotes')).toBeVisible();
});
