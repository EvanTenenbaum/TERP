import { test, expect } from '@playwright/test';
import { checkAccessibility } from './utils/accessibility';
import { loginAsAdmin } from './fixtures/auth';

// Conditionally import argos - may not be available in all environments
let argosScreenshot: ((page: unknown, name: string) => Promise<void>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  argosScreenshot = require('@argos-ci/playwright').argosScreenshot;
} catch {
  // Argos not available, screenshots will be skipped
}

async function takeScreenshot(page: unknown, name: string): Promise<void> {
  if (argosScreenshot) {
    await argosScreenshot(page, name);
  }
}

test.describe('Order Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should create a multi-item order successfully', async ({ page }) => {
    // Navigate to order creation page
    await page.goto('/orders/new');
    await checkAccessibility(page);

    // Select client
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: /Green Valley Dispensary/ }).click();

    // Add first item
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.getByLabel('Product').first().click();
    await page.getByRole('option', { name: /Blue Dream/ }).click();
    await page.getByLabel('Quantity').first().fill('10');

    // Add second item
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.getByLabel('Product').nth(1).click();
    await page.getByRole('option', { name: /OG Kush/ }).click();
    await page.getByLabel('Quantity').nth(1).fill('5');

    // Verify total calculation
    const total = await page.getByTestId('order-total').textContent();
    expect(total).toMatch(/\$[\d,]+\.\d{2}/);

    // Take screenshot before submission
    await takeScreenshot(page, 'order-form-filled');

    // Submit order
    await page.getByRole('button', { name: 'Create Order' }).click();

    // Assert: Redirected to order detail page
    await expect(page).toHaveURL(/\/orders\/\d+/);
    await expect(page.getByRole('heading', { name: 'Order Details' })).toBeVisible();

    // Assert: Success message displayed
    await expect(page.getByText('Order created successfully')).toBeVisible();

    // Assert: Order items are displayed
    await expect(page.getByText('Blue Dream')).toBeVisible();
    await expect(page.getByText('OG Kush')).toBeVisible();

    // Check accessibility on order detail page
    await checkAccessibility(page);
  });

  test('should prevent order creation with insufficient inventory', async ({ page }) => {
    await page.goto('/orders/new');

    // Select client
    await page.getByLabel('Client').click();
    await page.getByRole('option').first().click();

    // Add item with quantity exceeding available stock
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.getByLabel('Product').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Quantity').fill('999999'); // Unrealistic quantity

    // Attempt to submit
    await page.getByRole('button', { name: 'Create Order' }).click();

    // Assert: Error message displayed
    await expect(page.getByText(/insufficient inventory/i)).toBeVisible();

    // Assert: Still on order creation page
    await expect(page).toHaveURL('/orders/new');
  });

  test('should calculate order total correctly', async ({ page }) => {
    await page.goto('/orders/new');

    // Select client
    await page.getByLabel('Client').click();
    await page.getByRole('option').first().click();

    // Add item
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.getByLabel('Product').click();
    
    // Select a product with known price (e.g., $150/unit)
    await page.getByRole('option', { name: /Blue Dream.*\$150/ }).click();
    await page.getByLabel('Quantity').fill('10');

    // Wait for total to update
    await page.waitForTimeout(500);

    // Assert: Total is quantity * unit price
    const total = await page.getByTestId('order-total').textContent();
    expect(total).toContain('$1,500.00');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/orders/new');

    // Tab through form fields
    await page.keyboard.press('Tab'); // Client field
    await page.keyboard.press('Enter'); // Open dropdown
    await page.keyboard.press('ArrowDown'); // Select first option
    await page.keyboard.press('Enter'); // Confirm selection

    await page.keyboard.press('Tab'); // Add Item button
    await page.keyboard.press('Enter'); // Click button

    await page.keyboard.press('Tab'); // Product field
    await page.keyboard.press('Enter'); // Open dropdown
    await page.keyboard.press('ArrowDown'); // Select first option
    await page.keyboard.press('Enter'); // Confirm selection

    await page.keyboard.press('Tab'); // Quantity field
    await page.keyboard.type('5'); // Enter quantity

    // Verify form is filled via keyboard only
    const quantity = await page.getByLabel('Quantity').inputValue();
    expect(quantity).toBe('5');
  });
});
