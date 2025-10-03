import { test, expect } from '@playwright/test';

test.describe('Quote Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app - assuming dev login or auth is handled
    await page.goto('/');
  });

  test('should navigate to Quotes page', async ({ page }) => {
    await page.goto('/quotes');
    await expect(page.getByRole('heading', { name: /quotes/i })).toBeVisible();
  });

  test('should display quotes list', async ({ page }) => {
    await page.goto('/quotes');
    
    // Check for the New Quote button
    const newQuoteButton = page.getByRole('button', { name: /new quote/i });
    await expect(newQuoteButton).toBeVisible();
    
    // Check for data table or empty state
    const hasTable = await page.locator('table').count() > 0;
    const hasEmptyState = await page.getByText(/no quotes/i).count() > 0;
    expect(hasTable || hasEmptyState).toBeTruthy();
  });

  test('should navigate to new quote page', async ({ page }) => {
    await page.goto('/quotes');
    
    // Click New Quote button
    await page.getByRole('button', { name: /new quote/i }).click();
    
    // Should navigate to /quotes/new
    await expect(page).toHaveURL(/\/quotes\/new/);
  });

  test('should show quote detail page', async ({ page }) => {
    // Navigate directly to a quote detail (assuming ID 1 exists or mock)
    await page.goto('/quotes/1');
    
    // Should show quote details or error state
    const hasContent = await page.locator('h1').count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/quotes');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Check that focus is visible (focus ring should be present)
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    await page.goto('/quotes');
    
    // Loading spinner should appear briefly or data should load
    // This is a basic check that the page doesn't crash
    await page.waitForLoadState('networkidle');
    
    const hasError = await page.getByText(/error/i).count() > 0;
    const hasContent = await page.locator('table, [role="region"]').count() > 0;
    const hasEmptyState = await page.getByText(/no quotes/i).count() > 0;
    
    expect(hasError || hasContent || hasEmptyState).toBeTruthy();
  });
});

test.describe('Inventory Management', () => {
  test('should navigate to cycle count page', async ({ page }) => {
    await page.goto('/inventory/cycle-count');
    await expect(page.getByRole('heading', { name: /cycle count/i })).toBeVisible();
  });

  test('should navigate to customer returns page', async ({ page }) => {
    await page.goto('/inventory/returns/customer');
    await expect(page.getByRole('heading', { name: /customer returns/i })).toBeVisible();
  });

  test('should navigate to vendor returns page', async ({ page }) => {
    await page.goto('/inventory/returns/vendor');
    await expect(page.getByRole('heading', { name: /vendor returns/i })).toBeVisible();
  });
});

test.describe('Finance Module', () => {
  test('should navigate to finance dashboard', async ({ page }) => {
    await page.goto('/finance/dashboard');
    await expect(page.getByRole('heading', { name: /finance/i })).toBeVisible();
  });

  test('should navigate to AR aging page', async ({ page }) => {
    await page.goto('/finance/ar/aging');
    await expect(page.getByRole('heading', { name: /ar aging/i })).toBeVisible();
    
    // Check for export button
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton).toBeVisible();
  });

  test('should navigate to AP aging page', async ({ page }) => {
    await page.goto('/finance/ap/aging');
    await expect(page.getByRole('heading', { name: /ap aging/i })).toBeVisible();
  });
});

test.describe('Visual Mode', () => {
  test('should load visual mode page', async ({ page }) => {
    await page.goto('/visual-mode');
    
    // Check that visual mode interface loads
    const hasContent = await page.locator('[role="region"], .swipeable').count() > 0;
    expect(hasContent).toBeTruthy();
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels on buttons', async ({ page }) => {
    await page.goto('/quotes');
    
    // Check that buttons have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      expect(ariaLabel || textContent).toBeTruthy();
    }
  });

  test('should support keyboard navigation in tables', async ({ page }) => {
    await page.goto('/quotes');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Check if table rows are keyboard accessible
    const clickableRows = await page.locator('tr[tabindex="0"]').count();
    
    // If there are clickable rows, they should be keyboard navigable
    if (clickableRows > 0) {
      const firstRow = page.locator('tr[tabindex="0"]').first();
      await firstRow.focus();
      await expect(firstRow).toBeFocused();
    }
  });
});
