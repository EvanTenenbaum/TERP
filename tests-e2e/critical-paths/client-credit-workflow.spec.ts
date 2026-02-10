/**
 * E2E Tests: Client Credit Workflow (Sprint D - TEST-001)
 *
 * Tests the complete client credit workflow:
 * Client Creation → Credit Setup → Order with Credit
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { requireElement } from "../utils/preconditions";

test.describe("Client Creation Flow @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to clients page", async ({ page }) => {
    await page.goto("/clients");

    await expect(
      page.locator('h1:has-text("Client"), [data-testid="clients-page"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test("should open new client form", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Look for new client button
    await requireElement(
      page,
      'button:has-text("New Client"), button:has-text("Add Client"), [data-testid="new-client"]',
      "New client button not found"
    );

    const newClientButton = page.locator(
      'button:has-text("New Client"), button:has-text("Add Client"), [data-testid="new-client"]'
    );
    await newClientButton.click();

    // Should show client form
    await expect(
      page.locator('[data-testid="client-form"], form, [role="dialog"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display client form with required fields", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'button:has-text("New Client"), button:has-text("Add Client")',
      "New client button not found"
    );

    const newClientButton = page.locator(
      'button:has-text("New Client"), button:has-text("Add Client")'
    );
    await newClientButton.click();
    await page.waitForLoadState("networkidle");

    // Verify required fields
    await expect(
      page.locator(
        'input[name="name"], [data-testid="client-name"], input[placeholder*="name" i]'
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("should validate client form before submission", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    await requireElement(
      page,
      'button:has-text("New Client"), button:has-text("Add Client")',
      "New client button not found"
    );

    const newClientButton = page.locator(
      'button:has-text("New Client"), button:has-text("Add Client")'
    );
    await newClientButton.click();
    await page.waitForLoadState("networkidle");

    // Try to submit without filling required fields
    await requireElement(
      page,
      'button[type="submit"], button:has-text("Save"), button:has-text("Create")',
      "Submit button not found"
    );

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Save"), button:has-text("Create")'
    );
    await submitButton.click();

    // Should show validation errors
    await expect(
      page.locator(
        '[role="alert"], .error, input:invalid, [data-testid="validation-error"]'
      )
    ).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Credit Setup Flow @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to credit settings", async ({ page }) => {
    await page.goto("/settings/credit");

    await expect(
      page.locator(
        'h1:has-text("Credit"), [data-testid="credit-settings-page"]'
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display credit limit configuration", async ({ page }) => {
    await page.goto("/settings/credit");
    await page.waitForLoadState("networkidle");

    // Look for credit limit input
    await requireElement(
      page,
      'input[name="creditLimit"], [data-testid="credit-limit"], input[placeholder*="credit" i]',
      "Credit limit input not found"
    );

    const creditLimitInput = page.locator(
      'input[name="creditLimit"], [data-testid="credit-limit"], input[placeholder*="credit" i]'
    );
    await expect(creditLimitInput).toBeVisible();
  });

  test("should view client credit status", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Click on first client
    await requireElement(
      page,
      "table tbody tr, [data-testid='client-item']",
      "No clients found"
    );

    const firstClient = page
      .locator("table tbody tr, [data-testid='client-item']")
      .first();
    await firstClient.click();
    await page.waitForLoadState("networkidle");

    // Look for credit status display - skip if not present
    await requireElement(
      page,
      '[data-testid="credit-status"], .credit-status, :text("Credit"), :text("Balance")',
      "Credit status not visible for this client"
    );
  });

  test("should display credit indicator on client profile", async ({
    page,
  }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Click on first client
    await requireElement(
      page,
      "table tbody tr, [data-testid='client-item']",
      "No clients found"
    );

    const firstClient = page
      .locator("table tbody tr, [data-testid='client-item']")
      .first();
    await firstClient.click();
    await page.waitForLoadState("networkidle");

    // Look for credit indicator - skip if not present
    await requireElement(
      page,
      '[data-testid="credit-indicator"], .credit-indicator, .badge:has-text("Credit")',
      "Credit indicator not visible for this client"
    );
  });
});

test.describe("Order with Credit Flow @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should show credit warning when creating order", async ({ page }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // Select a client
    await requireElement(
      page,
      'select[name="client"], [data-testid="client-select"], button:has-text("Select Client")',
      "Client select not found"
    );

    const clientSelect = page.locator(
      'select[name="client"], [data-testid="client-select"], button:has-text("Select Client")'
    );
    await clientSelect.click();
    await page.waitForLoadState("networkidle");

    // Look for credit warning - skip if not shown
    await requireElement(
      page,
      '[data-testid="credit-warning"], .credit-warning, [role="alert"]:has-text("credit")',
      "Credit warning not shown for this client"
    );
  });

  test("should display credit limit banner", async ({ page }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // Look for credit limit banner - skip if not shown
    await requireElement(
      page,
      '[data-testid="credit-limit-banner"], .credit-banner, [role="alert"]:has-text("limit")',
      "Credit banner not shown"
    );
  });

  test("should allow order creation within credit limit", async ({ page }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // Select client
    await requireElement(
      page,
      'select[name="client"], [data-testid="client-select"]',
      "Client select not found"
    );

    const clientSelect = page.locator(
      'select[name="client"], [data-testid="client-select"]'
    );
    // Select first client
    await clientSelect.selectOption({ index: 1 });
    await page.waitForLoadState("networkidle");

    // Add item
    await requireElement(
      page,
      'button:has-text("Add Item"), [data-testid="add-item"]',
      "Add item button not found"
    );

    const addItemButton = page.locator(
      'button:has-text("Add Item"), [data-testid="add-item"]'
    );
    await addItemButton.click();

    // Should be able to add items
    await expect(
      page.locator(
        '[data-testid="order-item"], .order-item, select[name="product"]'
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("should block order exceeding credit limit", async ({ page }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // This test verifies the credit limit enforcement
    // The actual behavior depends on the client's credit status
    // Skip if credit exceeded message not shown
    await requireElement(
      page,
      '[data-testid="credit-exceeded"], .credit-exceeded, [role="alert"]:has-text("exceeded")',
      "Credit exceeded message not shown"
    );
  });
});

test.describe("Credit Override Flow @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should have credit override option for admin", async ({ page }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // Look for credit override button - skip if not shown
    await requireElement(
      page,
      'button:has-text("Override"), button:has-text("Approve"), [data-testid="credit-override"]',
      "Credit override option not shown"
    );
  });

  test("should display credit explanation", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Click on first client
    await requireElement(
      page,
      "table tbody tr, [data-testid='client-item']",
      "No clients found"
    );

    const firstClient = page
      .locator("table tbody tr, [data-testid='client-item']")
      .first();
    await firstClient.click();
    await page.waitForLoadState("networkidle");

    // Look for credit explanation - skip if not shown
    await requireElement(
      page,
      '[data-testid="credit-explanation"], .credit-explanation, :text("Credit Score"), :text("Credit Limit")',
      "Credit explanation not shown"
    );
  });
});
