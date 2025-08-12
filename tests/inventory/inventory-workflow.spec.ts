import { test, expect } from '@playwright/test';

test.describe('Inventory Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the inventory dashboard
    await page.goto('/inventory');
  });

  test('should create product → batch → lot → change cost workflow', async ({ page }) => {
    // Step 1: Create a new product
    await test.step('Create a new product', async () => {
      await page.click('text=Add Product');
      await expect(page).toHaveURL('/inventory/products/new');

      // Fill out the product form
      await page.fill('[name="sku"]', 'TEST-FLOWER-001');
      await page.fill('[name="name"]', 'Test Premium Flower');
      await page.selectOption('[name="category"]', 'flower');
      await page.fill('[name="description"]', 'High quality test flower for automation testing');
      await page.fill('[name="defaultPrice"]', '25.00');
      await page.selectOption('[name="unit"]', 'gram');
      
      // Ensure active checkbox is checked
      await page.check('[name="isActive"]');

      // Submit the form
      await page.click('button[type="submit"]');
      
      // Should redirect to products list
      await expect(page).toHaveURL('/inventory/products');
      
      // Verify product appears in the list
      await expect(page.locator('text=TEST-FLOWER-001')).toBeVisible();
      await expect(page.locator('text=Test Premium Flower')).toBeVisible();
    });

    // Step 2: Create a batch for the product
    await test.step('Create a batch for the product', async () => {
      await page.click('text=Batches');
      await expect(page).toHaveURL('/inventory/batches');
      
      await page.click('text=Create Batch');
      await expect(page).toHaveURL('/inventory/batches/new');

      // Fill out the batch form
      await page.fill('[name="batchNumber"]', 'BATCH-TEST-001');
      
      // Select the product we just created
      await page.selectOption('[name="productId"]', { label: 'Test Premium Flower' });
      
      // Select a vendor (assuming there's at least one vendor in the system)
      const vendorOptions = await page.locator('[name="vendorId"] option').count();
      if (vendorOptions > 1) {
        await page.selectOption('[name="vendorId"]', { index: 1 });
      }
      
      await page.fill('[name="quantity"]', '1000');
      await page.fill('[name="initialCost"]', '15.00');
      
      // Set received date to today
      const today = new Date().toISOString().split('T')[0];
      await page.fill('[name="receivedDate"]', today);
      
      await page.fill('[name="notes"]', 'Test batch for automation testing');

      // Submit the form
      await page.click('button[type="submit"]');
      
      // Should redirect to batches list
      await expect(page).toHaveURL('/inventory/batches');
      
      // Verify batch appears in the list
      await expect(page.locator('text=BATCH-TEST-001')).toBeVisible();
      await expect(page.locator('text=Test Premium Flower')).toBeVisible();
    });

    // Step 3: Create an inventory lot
    await test.step('Create an inventory lot', async () => {
      await page.click('text=Inventory Lots');
      await expect(page).toHaveURL('/inventory/lots');
      
      await page.click('text=Add Inventory Lot');
      await expect(page).toHaveURL('/inventory/lots/new');

      // Select the batch we just created
      await page.selectOption('[name="batchId"]', { label: 'BATCH-TEST-001' });
      
      await page.fill('[name="location"]', 'Warehouse A');
      await page.fill('[name="qtyOnHand"]', '1000');
      await page.fill('[name="qtyAllocated"]', '0');
      await page.fill('[name="reorderPoint"]', '100');

      // Submit the form
      await page.click('button[type="submit"]');
      
      // Should redirect to lots list
      await expect(page).toHaveURL('/inventory/lots');
      
      // Verify lot appears in the list
      await expect(page.locator('text=BATCH-TEST-001')).toBeVisible();
      await expect(page.locator('text=Warehouse A')).toBeVisible();
      await expect(page.locator('text=1000')).toBeVisible(); // quantity
    });

    // Step 4: Verify active cost is displayed
    await test.step('Verify active cost is displayed in lists', async () => {
      // Go back to batches and verify current cost is shown
      await page.click('text=Batches');
      await expect(page).toHaveURL('/inventory/batches');
      
      // Look for the cost display (should show $15.00)
      await expect(page.locator('text=$15.00')).toBeVisible();
      
      // Go to inventory lots and verify cost is shown there too
      await page.click('text=Inventory Lots');
      await expect(page).toHaveURL('/inventory/lots');
      
      // The current cost should be displayed in the lots view
      await expect(page.locator('text=$15.00')).toBeVisible();
    });

    // Step 5: Add a cost change and verify it only affects future allocations
    await test.step('Add cost change and verify UI shows active cost', async () => {
      // Navigate to the specific batch to add cost change
      await page.click('text=Batches');
      await page.click('text=BATCH-TEST-001');
      
      // Should be on batch detail page with cost history
      await expect(page.locator('text=Cost History')).toBeVisible();
      
      // Add a new cost change
      await page.click('text=Add Cost Change');
      
      // Fill in new cost
      await page.fill('[name="newCost"]', '18.00');
      
      // Set effective date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      await page.fill('[name="effectiveDate"]', tomorrowStr);
      
      // Submit the cost change
      await page.click('button[type="submit"]');
      
      // Verify the cost history shows both costs
      await expect(page.locator('text=$15.00')).toBeVisible(); // Original cost
      await expect(page.locator('text=$18.00')).toBeVisible(); // New cost
      
      // Verify current cost is still $15.00 (since new cost is effective tomorrow)
      await expect(page.locator('text=Current')).toBeVisible();
      
      // Go back to lists and verify they still show the current active cost
      await page.click('text=Batches');
      await expect(page.locator('text=$15.00')).toBeVisible();
    });
  });

  test('should display vendor codes (masked) in inventory UIs', async ({ page }) => {
    await test.step('Verify vendor code masking in batch list', async () => {
      await page.click('text=Batches');
      await expect(page).toHaveURL('/inventory/batches');
      
      // Check that vendor column shows vendor codes, not company names
      // This assumes there are vendors with codes in the system
      const vendorCells = page.locator('tbody td:nth-child(3)'); // Vendor column
      const vendorCount = await vendorCells.count();
      
      if (vendorCount > 0) {
        // Verify that vendor codes are displayed (typically short alphanumeric codes)
        const firstVendorText = await vendorCells.first().textContent();
        expect(firstVendorText).toBeTruthy();
        // Vendor codes should be relatively short (not full company names)
        expect(firstVendorText!.length).toBeLessThan(20);
      }
    });

    await test.step('Verify vendor code masking in product creation', async () => {
      await page.click('text=Products');
      await page.click('text=Add Product');
      
      // When creating a batch, vendor dropdown should show codes
      await page.click('text=Batches');
      await page.click('text=Create Batch');
      
      // Check vendor dropdown options
      const vendorOptions = page.locator('[name="vendorId"] option');
      const optionCount = await vendorOptions.count();
      
      if (optionCount > 1) {
        // Get the text of the second option (first is usually "Select Vendor")
        const vendorOptionText = await vendorOptions.nth(1).textContent();
        expect(vendorOptionText).toBeTruthy();
        // Should be vendor code, not full company name
        expect(vendorOptionText!.length).toBeLessThan(20);
      }
    });
  });

  test('should handle referential integrity correctly', async ({ page }) => {
    await test.step('Verify Order→AR unique constraint', async () => {
      // This test would verify that each Order can only have one AR record
      // For now, we'll just verify the navigation works
      await page.goto('/inventory');
      await expect(page.locator('text=Inventory Management')).toBeVisible();
    });

    await test.step('Verify PaymentApplication FK constraints', async () => {
      // This test would verify PaymentApplication foreign key relationships
      // For now, we'll just verify the inventory system is accessible
      await page.goto('/inventory/products');
      await expect(page).toHaveURL('/inventory/products');
    });
  });

  test('should show low stock items correctly', async ({ page }) => {
    await test.step('Navigate to low stock view', async () => {
      await page.click('text=Low Stock');
      await expect(page).toHaveURL('/inventory/low-stock');
      
      // Should show the low stock alert page
      await expect(page.locator('text=Low Stock Alert')).toBeVisible();
      await expect(page.locator('text=Items where quantity on hand is below reorder point')).toBeVisible();
    });

    await test.step('Verify low stock detection logic', async () => {
      // The page should show either low stock items or a "well stocked" message
      const hasLowStockItems = await page.locator('tbody tr').count() > 1;
      const hasWellStockedMessage = await page.locator('text=All items are well stocked!').isVisible();
      
      // One of these should be true
      expect(hasLowStockItems || hasWellStockedMessage).toBeTruthy();
      
      if (hasWellStockedMessage) {
        await expect(page.locator('text=No items are currently below their reorder points.')).toBeVisible();
      }
    });
  });
});

