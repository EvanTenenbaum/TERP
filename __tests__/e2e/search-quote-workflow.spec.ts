import { test, expect } from '@playwright/test';

test.describe('Search to Quote Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the search page
    await page.goto('/search');
  });

  test('complete search to quote workflow', async ({ page }) => {
    // Test search functionality
    await test.step('Search for products', async () => {
      // Wait for search interface to load
      await expect(page.locator('h1')).toContainText('Product Search');
      
      // Perform a keyword search
      await page.fill('input[placeholder*="SKU, name, or description"]', 'test');
      
      // Wait for search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      // Verify search results are displayed
      await expect(page.locator('.product-card')).toHaveCount.greaterThan(0);
    });

    await test.step('Apply filters', async () => {
      // Test category filter
      await page.selectOption('select[id="category"]', 'electronics');
      
      // Test availability filter
      await page.selectOption('select[id="availability"]', 'available');
      
      // Test location filter
      await page.selectOption('select[id="location"]', 'Warehouse A');
      
      // Test price range filter
      await page.fill('input[placeholder="Min"]', '50');
      await page.fill('input[placeholder="Max"]', '200');
      
      // Verify filtered results
      await expect(page.locator('.product-card')).toHaveCount.greaterThan(0);
    });

    await test.step('Add products to cart', async () => {
      // Find the first product and add to cart
      const firstProduct = page.locator('.product-card').first();
      
      // Set quantity
      await firstProduct.locator('input[type="number"]').fill('3');
      
      // Click add to cart
      await firstProduct.locator('button:has-text("Add to Cart")').click();
      
      // Verify cart icon shows item count
      await expect(page.locator('[data-testid="cart-count"]')).toContainText('3');
      
      // Add another product
      const secondProduct = page.locator('.product-card').nth(1);
      await secondProduct.locator('input[type="number"]').fill('2');
      await secondProduct.locator('button:has-text("Add to Cart")').click();
      
      // Verify cart count updated
      await expect(page.locator('[data-testid="cart-count"]')).toContainText('5');
    });

    await test.step('Open cart and review items', async () => {
      // Open cart sidebar
      await page.click('[data-testid="cart-button"]');
      
      // Verify cart sidebar is open
      await expect(page.locator('[data-testid="cart-sidebar"]')).toBeVisible();
      
      // Verify cart items are displayed
      await expect(page.locator('.cart-item')).toHaveCount(2);
      
      // Verify total is calculated
      await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
      
      // Update quantity of first item
      await page.selectOption('.cart-item:first-child select', '5');
      
      // Verify total updated
      await expect(page.locator('[data-testid="cart-total"]')).toContainText('$');
    });

    await test.step('Create quote from cart', async () => {
      // Click create quote button
      await page.click('button:has-text("Create Quote")');
      
      // Should navigate to new quote page
      await expect(page).toHaveURL('/quotes/new');
      
      // Verify quote items are displayed
      await expect(page.locator('table tbody tr')).toHaveCount(2);
      
      // Select customer
      await page.selectOption('select[id="customer"]', { index: 1 });
      
      // Add notes
      await page.fill('textarea[id="notes"]', 'Test quote from E2E test');
      
      // Set valid until date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      await page.fill('input[id="validUntil"]', futureDate.toISOString().split('T')[0]);
      
      // Submit quote
      await page.click('button[type="submit"]:has-text("Create Quote")');
      
      // Should navigate to quote details page
      await expect(page).toHaveURL(/\/quotes\/[a-zA-Z0-9-]+$/);
    });

    await test.step('Verify quote details', async () => {
      // Verify quote number is displayed
      await expect(page.locator('h1')).toContainText('Quote #');
      
      // Verify quote status
      await expect(page.locator('[data-testid="quote-status"]')).toContainText('Draft');
      
      // Verify customer information
      await expect(page.locator('[data-testid="customer-info"]')).toBeVisible();
      
      // Verify quote items table
      await expect(page.locator('table tbody tr')).toHaveCount(2);
      
      // Verify total amount
      await expect(page.locator('[data-testid="quote-total"]')).toContainText('$');
      
      // Verify notes are displayed
      await expect(page.locator('[data-testid="quote-notes"]')).toContainText('Test quote from E2E test');
    });

    await test.step('Test PDF export', async () => {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Click download PDF button
      await page.click('button:has-text("Download PDF")');
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download filename
      expect(download.suggestedFilename()).toMatch(/quote-Q\d{8}\.pdf/);
    });

    await test.step('Test share link functionality', async () => {
      // Click share link button
      await page.click('button:has-text("Share Link")');
      
      // Verify share link is displayed
      await expect(page.locator('[data-testid="share-link-input"]')).toBeVisible();
      
      // Get share link URL
      const shareLink = await page.locator('[data-testid="share-link-input"]').inputValue();
      
      // Verify share link format
      expect(shareLink).toMatch(/\/quotes\/share\/[a-f0-9]{64}$/);
      
      // Test share link in new tab
      const newPage = await page.context().newPage();
      await newPage.goto(shareLink);
      
      // Verify shared quote page loads
      await expect(newPage.locator('h1')).toContainText('Quote #');
      await expect(newPage.locator('[data-testid="shared-quote-badge"]')).toContainText('Sales Quote');
      
      // Verify quote details are visible (read-only)
      await expect(newPage.locator('table tbody tr')).toHaveCount(2);
      
      // Verify PDF download works on shared page
      const sharedDownloadPromise = newPage.waitForEvent('download');
      await newPage.click('button:has-text("Download PDF")');
      const sharedDownload = await sharedDownloadPromise;
      expect(sharedDownload.suggestedFilename()).toMatch(/quote-Q\d{8}\.pdf/);
      
      await newPage.close();
    });

    await test.step('Update quote status', async () => {
      // Mark quote as sent
      await page.click('button:has-text("Mark as Sent")');
      
      // Verify status updated
      await expect(page.locator('[data-testid="quote-status"]')).toContainText('Sent');
      
      // Verify new action buttons are available
      await expect(page.locator('button:has-text("Mark as Accepted")')).toBeVisible();
      await expect(page.locator('button:has-text("Mark as Rejected")')).toBeVisible();
      
      // Mark as accepted
      await page.click('button:has-text("Mark as Accepted")');
      
      // Verify status updated
      await expect(page.locator('[data-testid="quote-status"]')).toContainText('Accepted');
      
      // Verify convert to order button is available
      await expect(page.locator('button:has-text("Convert to Order")')).toBeVisible();
    });
  });

  test('search filters work correctly', async ({ page }) => {
    await test.step('Test individual filters', async () => {
      // Test keyword search
      await page.fill('input[placeholder*="SKU, name, or description"]', 'electronics');
      await expect(page.locator('.product-card')).toHaveCount.greaterThan(0);
      
      // Clear and test category filter
      await page.fill('input[placeholder*="SKU, name, or description"]', '');
      await page.selectOption('select[id="category"]', 'electronics');
      await expect(page.locator('.product-card')).toHaveCount.greaterThan(0);
      
      // Test availability filter
      await page.selectOption('select[id="availability"]', 'low_stock');
      // Should show only low stock items or no results message
      
      // Test vendor filter
      await page.selectOption('select[id="availability"]', ''); // Clear availability
      await page.selectOption('select[id="vendorCode"]', { index: 1 });
      
      // Test location filter
      await page.selectOption('select[id="location"]', { index: 1 });
      
      // Test price range
      await page.fill('input[placeholder="Min"]', '100');
      await page.fill('input[placeholder="Max"]', '500');
    });

    await test.step('Test filter combinations', async () => {
      // Combine multiple filters
      await page.selectOption('select[id="category"]', 'electronics');
      await page.selectOption('select[id="availability"]', 'available');
      await page.fill('input[placeholder="Min"]', '50');
      
      // Should show filtered results or no results message
      const results = page.locator('.product-card');
      const noResults = page.locator('text=No products found');
      
      await expect(results.or(noResults)).toBeVisible();
    });

    await test.step('Test clear filters', async () => {
      // Click clear all filters
      await page.click('button:has-text("Clear all")');
      
      // Verify all filters are cleared
      await expect(page.locator('input[placeholder*="SKU, name, or description"]')).toHaveValue('');
      await expect(page.locator('select[id="category"]')).toHaveValue('');
      await expect(page.locator('select[id="availability"]')).toHaveValue('');
      await expect(page.locator('input[placeholder="Min"]')).toHaveValue('');
      await expect(page.locator('input[placeholder="Max"]')).toHaveValue('');
    });
  });

  test('cart functionality works correctly', async ({ page }) => {
    await test.step('Add items to cart', async () => {
      // Add first product
      const firstProduct = page.locator('.product-card').first();
      await firstProduct.locator('input[type="number"]').fill('2');
      await firstProduct.locator('button:has-text("Add to Cart")').click();
      
      // Verify cart count
      await expect(page.locator('[data-testid="cart-count"]')).toContainText('2');
    });

    await test.step('Update cart quantities', async () => {
      // Open cart
      await page.click('[data-testid="cart-button"]');
      
      // Update quantity
      await page.selectOption('.cart-item select', '5');
      
      // Verify cart count updated
      await expect(page.locator('[data-testid="cart-count"]')).toContainText('5');
    });

    await test.step('Remove items from cart', async () => {
      // Remove item
      await page.click('.cart-item button:has-text("Remove")');
      
      // Verify cart is empty
      await expect(page.locator('[data-testid="cart-count"]')).toContainText('0');
      await expect(page.locator('text=Your cart is empty')).toBeVisible();
    });

    await test.step('Clear entire cart', async () => {
      // Add items again
      await page.click('button:has-text("Continue Shopping")');
      const product = page.locator('.product-card').first();
      await product.locator('button:has-text("Add to Cart")').click();
      
      // Open cart and clear
      await page.click('[data-testid="cart-button"]');
      await page.click('button:has-text("Clear Cart")');
      
      // Verify cart is empty
      await expect(page.locator('text=Your cart is empty')).toBeVisible();
    });
  });
});

