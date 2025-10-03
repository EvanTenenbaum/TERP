import { test, expect } from '@playwright/test';

test('navigate to Cycle Counts', async ({ page }) => {
  await page.goto('/inventory/cycle-count');
  await expect(page.getByText('Cycle Counts')).toBeVisible();
});
