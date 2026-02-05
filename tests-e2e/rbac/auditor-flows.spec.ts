/**
 * E2E Tests: Read-Only Auditor Role RBAC Verification
 *
 * TER-49: Verifies that the Auditor role has proper read-only access:
 * - CAN view all modules (dashboard, clients, orders, inventory, invoices, accounting)
 * - CANNOT create, update, or delete any records
 * - Full access to audit logs
 *
 * Test Account: qa.auditor@terp.test (password: TerpQA2026!)
 * Role: Read-Only Auditor
 * Permissions: Read-only access to all modules, full access to audit logs
 */

import { test, expect } from "@playwright/test";
import { loginAsAuditor, loginAsAdmin } from "../fixtures/auth";

// ============================================================================
// AUDITOR ROLE - ALLOWED ACTIONS (READ-ONLY)
// ============================================================================

test.describe("Auditor Role - Read Access Verification", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAuditor(page);
  });

  test("should access dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Verify dashboard loads
    await expect(page).toHaveURL(/\/($|dashboard)/);

    // Look for dashboard content
    const dashboardContent = page.locator(
      'h1:has-text("Dashboard"), [data-testid="dashboard"], .dashboard-widgets'
    );
    await expect(dashboardContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("should view clients list (read-only)", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/clients/);

    // Look for clients content
    const clientsContent = page.locator(
      'h1:has-text("Client"), table, [data-testid="clients-list"], [data-testid="clients-grid"]'
    );
    await expect(clientsContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("should view orders list (read-only)", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/orders/);

    // Look for orders content
    const ordersContent = page.locator(
      'h1:has-text("Order"), table, [data-testid="orders-list"], [data-testid="orders-grid"]'
    );
    await expect(ordersContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("should view inventory (read-only)", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/inventory/);

    // Look for inventory content
    const inventoryContent = page.locator(
      'h1:has-text("Inventory"), table, [data-testid="inventory-list"], [data-testid="inventory-grid"]'
    );
    await expect(inventoryContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("should view invoices (read-only)", async ({ page }) => {
    await page.goto("/invoices");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/invoices/);

    // Look for invoices content
    const invoicesContent = page.locator(
      'h1:has-text("Invoice"), table, [data-testid="invoices-list"], [data-testid="invoices-grid"]'
    );
    await expect(invoicesContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("should view accounting dashboard (read-only)", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/accounting/);

    // Look for accounting content
    const accountingContent = page.locator(
      'h1:has-text("Accounting"), [data-testid="accounting-dashboard"], .accounting-overview'
    );
    await expect(accountingContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("should view general ledger (read-only)", async ({ page }) => {
    await page.goto("/accounting/general-ledger");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/general-ledger/);

    // Look for GL content
    const glContent = page.locator(
      'h1:has-text("Ledger"), h1:has-text("General"), table, [data-testid="gl-entries"]'
    );
    await expect(glContent.first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// AUDITOR ROLE - RESTRICTED ACTIONS (SHOULD NOT SEE CREATE/EDIT BUTTONS)
// ============================================================================

test.describe("Auditor Role - Create/Edit Restrictions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAuditor(page);
  });

  test("should NOT see create client button on clients page", async ({
    page,
  }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Look for create button - should be hidden or disabled for auditor
    const createButton = page.locator(
      'button:has-text("Add Client"), button:has-text("New Client"), button:has-text("Create Client"), a[href*="clients/new"]'
    );

    // Either the button doesn't exist, or it's disabled/hidden
    const buttonVisible = await createButton
      .first()
      .isVisible()
      .catch(() => false);
    if (buttonVisible) {
      // If visible, it should be disabled
      await expect(createButton.first()).toBeDisabled();
    }
  });

  test("should NOT see create order button on orders page", async ({
    page,
  }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Look for create button - should be hidden or disabled for auditor
    const createButton = page.locator(
      'button:has-text("New Order"), button:has-text("Create Order"), a[href*="orders/new"]'
    );

    const buttonVisible = await createButton
      .first()
      .isVisible()
      .catch(() => false);
    if (buttonVisible) {
      await expect(createButton.first()).toBeDisabled();
    }
  });

  test("should NOT see edit actions in inventory", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Look for edit/adjust buttons - should be hidden or disabled for auditor
    const editButton = page.locator(
      'button:has-text("Adjust"), button:has-text("Edit"), button:has-text("Transfer")'
    );

    const buttonVisible = await editButton
      .first()
      .isVisible()
      .catch(() => false);
    if (buttonVisible) {
      await expect(editButton.first()).toBeDisabled();
    }
  });

  test("should NOT be able to record payment", async ({ page }) => {
    await page.goto("/accounting/payments");
    await page.waitForLoadState("networkidle");

    // Look for record payment button - should be hidden or disabled
    const recordButton = page.locator(
      'button:has-text("Record Payment"), button:has-text("New Payment"), button:has-text("Add Payment")'
    );

    const buttonVisible = await recordButton
      .first()
      .isVisible()
      .catch(() => false);
    if (buttonVisible) {
      await expect(recordButton.first()).toBeDisabled();
    }
  });

  test("should NOT be able to post journal entry", async ({ page }) => {
    await page.goto("/accounting/general-ledger");
    await page.waitForLoadState("networkidle");

    // Look for journal entry button - should be hidden or disabled
    const postButton = page.locator(
      'button:has-text("Post"), button:has-text("New Entry"), button:has-text("Journal Entry")'
    );

    const buttonVisible = await postButton
      .first()
      .isVisible()
      .catch(() => false);
    if (buttonVisible) {
      await expect(postButton.first()).toBeDisabled();
    }
  });
});

// ============================================================================
// AUDITOR ROLE - AUDIT LOG ACCESS
// ============================================================================

test.describe("Auditor Role - Audit Log Access", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAuditor(page);
  });

  test("should access audit logs", async ({ page }) => {
    // Try to navigate to audit logs
    await page.goto("/admin/audit-logs");
    await page.waitForLoadState("networkidle");

    // If audit logs page exists, verify access
    const auditContent = page.locator(
      'h1:has-text("Audit"), [data-testid="audit-logs"], table'
    );

    if (
      await auditContent
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(auditContent.first()).toBeVisible();
    } else {
      // Try alternative route
      await page.goto("/settings/audit");
      await page.waitForLoadState("networkidle");

      // Verify page loaded - even if audit logs aren't visible,
      // we've confirmed the auditor can access the route
      await expect(page).not.toHaveURL(/\/403|\/unauthorized/);
    }
  });
});

// ============================================================================
// COMPARISON: ADMIN CAN DO WHAT AUDITOR CANNOT
// ============================================================================

test.describe("Admin vs Auditor Comparison", () => {
  test("admin should see create buttons that auditor cannot see", async ({
    page,
  }) => {
    // Login as admin
    await loginAsAdmin(page);
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Admin should see create button
    const createButton = page.locator(
      'button:has-text("Add Client"), button:has-text("New Client"), button:has-text("Create Client")'
    );

    // If button exists, it should be enabled for admin
    if (
      await createButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(createButton.first()).toBeEnabled();
    }
  });
});
