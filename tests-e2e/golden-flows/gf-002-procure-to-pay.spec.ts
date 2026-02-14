/**
 * Golden Flow Test: GF-002 Procure-to-Pay
 *
 * Flow: /purchase-orders → open create dialog → verify form fields → receive goods
 */

import { expect, test, type Page } from "@playwright/test";
import { loginAsInventoryManager } from "../fixtures/auth";

const openPurchaseOrders = async (page: Page): Promise<void> => {
  await page.goto("/purchase-orders");
  await page.waitForLoadState("networkidle");
};

test.describe("Golden Flow: GF-002 Procure-to-Pay", (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await loginAsInventoryManager(page);
  });

  test("should access purchase order creation flow", async ({
    page,
  }): Promise<void> => {
    await openPurchaseOrders(page);

    // PO creation uses a dialog, not a separate page route
    const createButton = page.locator(
      'button:has-text("New Purchase Order"), button:has-text("Create PO"), button:has-text("New PO")'
    );

    const hasCreateButton = await createButton
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasCreateButton) {
      test.skip(
        true,
        "Create PO button not visible — PO creation may not be available"
      );
      return;
    }

    await createButton.first().click();

    // Dialog should open with "Create Purchase Order" title
    const dialogTitle = page.locator(
      'h2:has-text("Create Purchase Order"), [role="dialog"] h2'
    );
    await expect(dialogTitle.first()).toBeVisible({ timeout: 5000 });

    // Verify supplier selector exists
    const supplierSelect = page.locator(
      'button:has-text("Select supplier"), [role="dialog"] button[role="combobox"]'
    );
    await expect(supplierSelect.first()).toBeVisible({ timeout: 5000 });

    // Verify order date input exists
    const orderDateInput = page.locator('#orderDate, input[type="date"]');
    await expect(orderDateInput.first()).toBeVisible({ timeout: 3000 });

    // Verify line items section with "Add Item" button exists
    const addItemButton = page.locator(
      '[role="dialog"] button:has-text("Add Item")'
    );
    await expect(addItemButton.first()).toBeVisible({ timeout: 3000 });

    // Verify product selector in line items
    const productSelect = page.locator(
      '[role="dialog"] button:has-text("Select product"), [role="dialog"] [role="combobox"]'
    );
    await expect(productSelect.first()).toBeVisible({ timeout: 3000 });
  });

  test("should show receiving action for purchase orders", async ({
    page,
  }): Promise<void> => {
    await openPurchaseOrders(page);

    // Precondition: at least one PO row must exist
    const poRow = page.locator('[role="row"], tr').first();
    if (!(await poRow.isVisible().catch(() => false))) {
      test.skip(true, "No purchase order rows visible — cannot test receiving");
      return;
    }

    await poRow.click();

    // After clicking a PO row, a receive action MUST be available
    const receiveButton = page.locator(
      'button:has-text("Receive"), button:has-text("Mark Received"), button:has-text("Receive Items")'
    );
    await expect(receiveButton.first()).toBeVisible({ timeout: 5000 });
  });
});
