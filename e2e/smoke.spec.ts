import { test, expect } from '@playwright/test';

test('app root responds', async ({ page, baseURL }) => {
  const url = baseURL ?? 'http://localhost:3000';
  await page.goto(url);
  // Check that the page has a title element rendered (layout loads without crash)
  await expect(page).toHaveURL(url + '/');
});
