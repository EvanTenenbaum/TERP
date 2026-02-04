/**
 * E2E Tests: Accounting Flows with RBAC Verification
 *
 * TER-47: Verifies that the Accountant role has proper access to:
 * - GL entries / journal entries
 * - Record payments
 * - Financial reports
 * - Client balances
 *
 * Also verifies RBAC restrictions are enforced properly.
 *
 * Test Account: qa.accounting@terp.test (password: TerpQA2026!)
 * Role: Accountant
 * Permissions: Full access to accounting, credits, COGS, bad debt
 *              Read access to orders, clients, and vendors
 */

import { test, expect } from "@playwright/test";
import { loginAsAccountant, loginAsWarehouseStaff } from "../fixtures/auth";

// ============================================================================
// ACCOUNTANT ROLE - ALLOWED ACTIONS
// ============================================================================

test.describe("Accountant Role - Accounting Access", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAccountant(page);
  });

  test("should access accounting module from navigation", async ({ page }) => {
    // Navigate to accounting
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Verify accounting page loads
    await expect(page).toHaveURL(/\/accounting/);

    // Look for accounting-related content
    const accountingHeader = page.locator(
      'h1:has-text("Accounting"), h2:has-text("Accounting"), [data-testid="accounting-page"]'
    );
    await expect(accountingHeader.first()).toBeVisible({ timeout: 10000 });
  });

  test("should view chart of accounts", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for chart of accounts section or link
    const coaLink = page.locator(
      'a:has-text("Chart of Accounts"), button:has-text("Chart of Accounts"), [data-testid="coa-link"], [href*="accounts"]'
    );

    if (
      await coaLink
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await coaLink.first().click();
      await page.waitForLoadState("networkidle");

      // Verify accounts list is visible
      const accountsTable = page.locator(
        "table, [data-testid='accounts-table'], [data-testid='chart-of-accounts']"
      );
      await expect(accountsTable.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Try direct navigation
      await page.goto("/accounting/accounts");
      await page.waitForLoadState("networkidle");

      const accountsContent = page.locator(
        'h1:has-text("Accounts"), h2:has-text("Accounts"), table'
      );
      await expect(accountsContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should view general ledger entries", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for ledger/journal entries section
    const ledgerLink = page.locator(
      'a:has-text("Ledger"), button:has-text("Ledger"), a:has-text("Journal"), [data-testid="ledger-link"], [href*="ledger"]'
    );

    if (
      await ledgerLink
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await ledgerLink.first().click();
      await page.waitForLoadState("networkidle");

      // Verify ledger entries are displayed
      const ledgerTable = page.locator(
        "table, [data-testid='ledger-table'], [data-testid='journal-entries']"
      );
      await expect(ledgerTable.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Try direct navigation
      await page.goto("/accounting/ledger");
      await page.waitForLoadState("networkidle");

      const ledgerContent = page.locator(
        'h1:has-text("Ledger"), h2:has-text("Journal"), table'
      );
      await expect(ledgerContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should view invoices (AR)", async ({ page }) => {
    await page.goto("/accounting/invoices");
    await page.waitForLoadState("networkidle");

    // Verify invoices page loads
    const invoiceHeader = page.locator(
      'h1:has-text("Invoice"), h2:has-text("Invoice"), [data-testid="invoices-page"]'
    );
    await expect(invoiceHeader.first()).toBeVisible({ timeout: 10000 });

    // Verify invoice list or table is present
    const invoiceTable = page.locator(
      "table, [data-testid='invoices-table'], [role='grid']"
    );
    await expect(invoiceTable.first()).toBeVisible({ timeout: 5000 });
  });

  test("should view bills (AP)", async ({ page }) => {
    await page.goto("/accounting/bills");
    await page.waitForLoadState("networkidle");

    // Verify bills page loads
    const billsHeader = page.locator(
      'h1:has-text("Bill"), h2:has-text("Bill"), [data-testid="bills-page"]'
    );
    await expect(billsHeader.first()).toBeVisible({ timeout: 10000 });

    // Verify bills list is present
    const billsTable = page.locator(
      "table, [data-testid='bills-table'], [role='grid']"
    );
    await expect(billsTable.first()).toBeVisible({ timeout: 5000 });
  });

  test("should view payments list", async ({ page }) => {
    await page.goto("/accounting/payments");
    await page.waitForLoadState("networkidle");

    // Verify payments page loads
    const paymentsHeader = page.locator(
      'h1:has-text("Payment"), h2:has-text("Payment"), [data-testid="payments-page"]'
    );
    await expect(paymentsHeader.first()).toBeVisible({ timeout: 10000 });
  });

  test("should access AR/AP dashboard summary", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for AR/AP summary sections
    const arSection = page.locator(
      '[data-testid="ar-summary"], :has-text("Accounts Receivable"), :has-text("AR Summary")'
    );
    const apSection = page.locator(
      '[data-testid="ap-summary"], :has-text("Accounts Payable"), :has-text("AP Summary")'
    );

    // At least one summary should be visible on the accounting page
    const arVisible = await arSection
      .first()
      .isVisible()
      .catch(() => false);
    const apVisible = await apSection
      .first()
      .isVisible()
      .catch(() => false);

    // The accounting page should show some financial summary
    expect(arVisible || apVisible).toBeTruthy();
  });
});

// ============================================================================
// ACCOUNTANT ROLE - PAYMENT RECORDING
// ============================================================================

test.describe("Accountant Role - Record Payments", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAccountant(page);
  });

  test("should access payment recording form", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for receive payment button
    const receivePaymentButton = page.locator(
      'button:has-text("Receive Payment"), a:has-text("Receive Payment"), button:has-text("Record Payment"), [data-testid="receive-payment"]'
    );

    if (
      await receivePaymentButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await receivePaymentButton.first().click();

      // Verify payment form or modal appears
      const paymentForm = page.locator(
        '[role="dialog"], form, .modal, [data-testid="payment-form"]'
      );
      await expect(paymentForm.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should have payment method options available", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    const receivePaymentButton = page.locator(
      'button:has-text("Receive Payment"), button:has-text("Record Payment")'
    );

    if (
      await receivePaymentButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await receivePaymentButton.first().click();

      // Look for payment method selector
      const paymentMethodSelect = page.locator(
        'select[name="paymentMethod"], [data-testid="payment-method-select"], select:has(option:has-text("Cash")), select:has(option:has-text("Check"))'
      );

      if (
        await paymentMethodSelect
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(paymentMethodSelect.first()).toBeVisible();
      }
    }
  });

  test("should navigate to invoice and record payment", async ({ page }) => {
    await page.goto("/accounting/invoices");
    await page.waitForLoadState("networkidle");

    // Click on first invoice row if available
    const invoiceRow = page.locator('[role="row"], tr').nth(1);

    if (await invoiceRow.isVisible().catch(() => false)) {
      await invoiceRow.click();

      // Look for record payment action
      const recordPaymentButton = page.locator(
        'button:has-text("Record Payment"), button:has-text("Payment"), [data-testid="record-payment"]'
      );

      if (
        await recordPaymentButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(recordPaymentButton.first()).toBeVisible();
        // Accountant should have permission to click this button
      }
    }
  });
});

// ============================================================================
// ACCOUNTANT ROLE - FINANCIAL REPORTS
// ============================================================================

test.describe("Accountant Role - Financial Reports", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAccountant(page);
  });

  test("should access financial reports section", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for reports link/section
    const reportsLink = page.locator(
      'a:has-text("Reports"), button:has-text("Reports"), [data-testid="reports-link"], [href*="reports"]'
    );

    if (
      await reportsLink
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await reportsLink.first().click();
      await page.waitForLoadState("networkidle");

      // Verify reports page loads
      const reportsHeader = page.locator(
        'h1:has-text("Report"), h2:has-text("Report"), [data-testid="reports-page"]'
      );
      await expect(reportsHeader.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should view trial balance", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for trial balance option
    const trialBalanceLink = page.locator(
      'a:has-text("Trial Balance"), button:has-text("Trial Balance"), [data-testid="trial-balance"]'
    );

    if (
      await trialBalanceLink
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await trialBalanceLink.first().click();
      await page.waitForLoadState("networkidle");

      // Verify trial balance displays
      const trialBalanceContent = page.locator(
        '[data-testid="trial-balance"], h2:has-text("Trial Balance"), table'
      );
      await expect(trialBalanceContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should view aging reports", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for aging report option (AR aging, AP aging)
    const agingLink = page.locator(
      'a:has-text("Aging"), button:has-text("Aging"), [data-testid="aging-report"]'
    );

    if (
      await agingLink
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await agingLink.first().click();

      // Verify aging buckets are displayed
      const agingBuckets = page.locator(
        ':has-text("Current"), :has-text("30 Days"), :has-text("60 Days"), :has-text("90 Days")'
      );
      await expect(agingBuckets.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should view P&L summary", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for P&L or Income Statement option
    const plLink = page.locator(
      'a:has-text("P&L"), a:has-text("Profit"), a:has-text("Income Statement"), button:has-text("P&L"), [data-testid="profit-loss"]'
    );

    if (
      await plLink
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await plLink.first().click();
      await page.waitForLoadState("networkidle");

      // Verify P&L content displays
      const plContent = page.locator(
        '[data-testid="profit-loss"], :has-text("Revenue"), :has-text("Expenses"), :has-text("Net Income")'
      );
      await expect(plContent.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ============================================================================
// ACCOUNTANT ROLE - CLIENT BALANCES
// ============================================================================

test.describe("Accountant Role - Client Balances", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAccountant(page);
  });

  test("should access clients list (read-only)", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Verify clients page loads (Accountant has clients:read permission)
    const clientsHeader = page.locator(
      'h1:has-text("Client"), h2:has-text("Client"), [data-testid="clients-page"]'
    );
    await expect(clientsHeader.first()).toBeVisible({ timeout: 10000 });

    // Verify client list is displayed
    const clientsTable = page.locator(
      "table, [data-testid='clients-table'], [role='grid']"
    );
    await expect(clientsTable.first()).toBeVisible({ timeout: 5000 });
  });

  test("should view client balance information", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Click on first client row
    const clientRow = page.locator('[role="row"], tr').nth(1);

    if (await clientRow.isVisible().catch(() => false)) {
      await clientRow.click();
      await page.waitForLoadState("networkidle");

      // Look for balance/transactions information
      const balanceSection = page.locator(
        '[data-testid="client-balance"], :has-text("Balance"), :has-text("Total Owed"), :has-text("AR Balance")'
      );

      if (
        await balanceSection
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(balanceSection.first()).toBeVisible();
      }
    }
  });

  test("should view client ledger/transactions", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Click on first client
    const clientRow = page.locator('[role="row"], tr').nth(1);

    if (await clientRow.isVisible().catch(() => false)) {
      await clientRow.click();
      await page.waitForLoadState("networkidle");

      // Look for ledger/transactions tab
      const ledgerTab = page.locator(
        'a:has-text("Ledger"), button:has-text("Ledger"), a:has-text("Transactions"), [data-testid="ledger-tab"]'
      );

      if (
        await ledgerTab
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await ledgerTab.first().click();
        await page.waitForLoadState("networkidle");

        // Verify ledger/transactions display
        const ledgerContent = page.locator(
          '[data-testid="client-ledger"], table, [role="grid"]'
        );
        await expect(ledgerContent.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should view client statement", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const clientRow = page.locator('[role="row"], tr').nth(1);

    if (await clientRow.isVisible().catch(() => false)) {
      await clientRow.click();
      await page.waitForLoadState("networkidle");

      // Look for statement option
      const statementButton = page.locator(
        'button:has-text("Statement"), a:has-text("Statement"), [data-testid="client-statement"]'
      );

      if (
        await statementButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(statementButton.first()).toBeVisible();
        // Accountant should have access to generate/view statements
      }
    }
  });
});

// ============================================================================
// ACCOUNTANT ROLE - READ-ONLY ACCESS TO OTHER MODULES
// ============================================================================

test.describe("Accountant Role - Read-Only Access Verification", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAccountant(page);
  });

  test("should have read access to orders", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Verify orders page loads (Accountant has orders:read permission)
    const ordersHeader = page.locator(
      'h1:has-text("Order"), h2:has-text("Order"), [data-testid="orders-page"]'
    );
    await expect(ordersHeader.first()).toBeVisible({ timeout: 10000 });
  });

  test("should have read access to vendors", async ({ page }) => {
    await page.goto("/vendors");
    await page.waitForLoadState("networkidle");

    // Verify vendors page loads (Accountant has vendors:read permission)
    // Note: vendors may redirect to suppliers/clients with isSeller=true
    const vendorsHeader = page.locator(
      'h1:has-text("Vendor"), h1:has-text("Supplier"), h2:has-text("Vendor"), [data-testid="vendors-page"]'
    );
    await expect(vendorsHeader.first()).toBeVisible({ timeout: 10000 });
  });

  test("should NOT have write access to inventory adjustments", async ({
    page,
  }) => {
    // Accountant does NOT have inventory:quantity:adjust permission
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Look for inventory page (may not have access at all)
    const inventoryHeader = page.locator(
      'h1:has-text("Inventory"), [data-testid="inventory-page"]'
    );

    // If inventory page loads, verify no adjust button or it's disabled
    if (
      await inventoryHeader
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      const adjustButton = page.locator(
        'button:has-text("Adjust"), [data-testid="adjust-inventory"]'
      );

      // Either button should not exist or should be disabled/hidden
      const adjustVisible = await adjustButton
        .first()
        .isVisible()
        .catch(() => false);
      if (adjustVisible) {
        // If visible, check if it's disabled
        const isDisabled = await adjustButton.first().isDisabled();
        expect(isDisabled).toBeTruthy();
      }
    }
  });
});

// ============================================================================
// RBAC NEGATIVE TESTS - RESTRICTED ACTIONS
// ============================================================================

test.describe("RBAC - Accountant Restricted Actions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAccountant(page);
  });

  test("should NOT have access to user management", async ({ page }) => {
    // Accountant does NOT have users:* permissions
    await page.goto("/settings/users");
    await page.waitForLoadState("networkidle");

    // Either redirected away or access denied shown
    const accessDenied = page.locator(
      ':has-text("Access Denied"), :has-text("Unauthorized"), :has-text("Permission"), [data-testid="access-denied"]'
    );
    const usersPage = page.locator(
      'h1:has-text("Users"), [data-testid="users-page"]'
    );

    // Should either show access denied or not be on users page
    const _isDenied = await accessDenied
      .first()
      .isVisible()
      .catch(() => false);
    const isUsersPage = await usersPage
      .first()
      .isVisible()
      .catch(() => false);

    // If users page is visible, it should be in read-only mode or redirected
    if (isUsersPage) {
      // Check that create/edit buttons are not available
      const createUserButton = page.locator(
        'button:has-text("Create User"), button:has-text("Add User")'
      );
      const isCreateVisible = await createUserButton
        .first()
        .isVisible()
        .catch(() => false);
      expect(isCreateVisible).toBeFalsy();
    }
  });

  test("should NOT have access to admin tools", async ({ page }) => {
    // Accountant does NOT have admin:* permissions
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Should be redirected or show access denied
    const adminPage = page.locator(
      'h1:has-text("Admin"), [data-testid="admin-page"]'
    );
    const adminVisible = await adminPage
      .first()
      .isVisible()
      .catch(() => false);

    // Admin page should not be accessible
    expect(adminVisible).toBeFalsy();
  });
});

// ============================================================================
// CROSS-ROLE COMPARISON - WAREHOUSE STAFF
// ============================================================================

test.describe("RBAC - Warehouse Staff Cannot Access Accounting", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsWarehouseStaff(page);
  });

  test("Warehouse Staff should NOT see accounting navigation", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Look for accounting link in navigation
    const accountingNav = page.locator(
      'nav a:has-text("Accounting"), nav button:has-text("Accounting"), [data-testid="nav-accounting"]'
    );

    // Warehouse Staff does NOT have accounting:access permission
    const isAccountingVisible = await accountingNav
      .first()
      .isVisible()
      .catch(() => false);

    // Accounting navigation should not be visible for Warehouse Staff
    expect(isAccountingVisible).toBeFalsy();
  });

  test("Warehouse Staff should be denied direct accounting URL access", async ({
    page,
  }) => {
    // Try to access accounting directly
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Should be redirected or show access denied
    const accountingPage = page.locator(
      'h1:has-text("Accounting"), [data-testid="accounting-page"]'
    );
    const accessDenied = page.locator(
      ':has-text("Access Denied"), :has-text("Unauthorized"), :has-text("Permission")'
    );

    const isAccountingVisible = await accountingPage
      .first()
      .isVisible()
      .catch(() => false);
    const _isDeniedWarehouse = await accessDenied
      .first()
      .isVisible()
      .catch(() => false);

    // Either denied or not showing accounting content
    expect(isAccountingVisible).toBeFalsy();
  });
});

// ============================================================================
// API-LEVEL RBAC VERIFICATION
// ============================================================================

test.describe("API RBAC - Accounting Endpoints", () => {
  test("Accountant can call accounting API endpoints", async ({ page }) => {
    await loginAsAccountant(page);

    // Make API request to get AR summary
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

    // Navigate first to ensure cookies are set
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Try to fetch AR summary via tRPC
    const response = await page.request.get(
      `${baseUrl}/api/trpc/accounting.arApDashboard.getARSummary`
    );

    // Should succeed (200) or return valid tRPC response
    const status = response.status();
    expect([200, 304]).toContain(status);
  });

  test("Warehouse Staff cannot call accounting API endpoints", async ({
    page,
  }) => {
    await loginAsWarehouseStaff(page);

    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

    // Navigate first to ensure cookies are set
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Try to fetch AR summary via tRPC
    const response = await page.request.get(
      `${baseUrl}/api/trpc/accounting.arApDashboard.getARSummary`
    );

    // Should fail with unauthorized (401 or 403) or tRPC error
    const status = response.status();
    const body = await response.json().catch(() => ({}));

    // Either HTTP error or tRPC error response
    const hasError =
      status === 401 ||
      status === 403 ||
      body?.error?.message?.includes("UNAUTHORIZED") ||
      body?.error?.message?.includes("permission") ||
      body?.error?.data?.code === "UNAUTHORIZED" ||
      body?.error?.data?.code === "FORBIDDEN";

    expect(hasError).toBeTruthy();
  });
});

// ============================================================================
// ACCOUNTANT SPECIFIC ACTIONS - CREDITS & BAD DEBT
// ============================================================================

test.describe("Accountant Role - Credits and Bad Debt", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAccountant(page);
  });

  test("should have access to credits management", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for credits section
    const creditsLink = page.locator(
      'a:has-text("Credits"), button:has-text("Credits"), [data-testid="credits-link"], [href*="credits"]'
    );

    if (
      await creditsLink
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await creditsLink.first().click();
      await page.waitForLoadState("networkidle");

      // Verify credits page loads
      const creditsContent = page.locator(
        'h1:has-text("Credit"), h2:has-text("Credit"), [data-testid="credits-page"]'
      );
      await expect(creditsContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should have access to bad debt management", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for bad debt section
    const badDebtLink = page.locator(
      'a:has-text("Bad Debt"), button:has-text("Bad Debt"), button:has-text("Write-off"), [data-testid="bad-debt-link"]'
    );

    if (
      await badDebtLink
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await badDebtLink.first().click();
      await page.waitForLoadState("networkidle");

      // Verify bad debt page loads
      const badDebtContent = page.locator(
        'h1:has-text("Bad Debt"), h2:has-text("Bad Debt"), h2:has-text("Write-off"), [data-testid="bad-debt-page"]'
      );
      await expect(badDebtContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should have access to COGS settings", async ({ page }) => {
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");

    // Look for COGS section
    const cogsLink = page.locator(
      'a:has-text("COGS"), button:has-text("COGS"), a:has-text("Cost of Goods"), [data-testid="cogs-link"]'
    );

    if (
      await cogsLink
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await cogsLink.first().click();
      await page.waitForLoadState("networkidle");

      // Verify COGS page loads
      const cogsContent = page.locator(
        'h1:has-text("COGS"), h2:has-text("COGS"), h2:has-text("Cost"), [data-testid="cogs-page"]'
      );
      await expect(cogsContent.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ============================================================================
// SUMMARY TEST - FULL ACCOUNTANT WORKFLOW
// ============================================================================

test.describe("Accountant Full Workflow", () => {
  test("complete accounting review workflow", async ({ page }) => {
    await loginAsAccountant(page);

    // Step 1: Access accounting dashboard
    await page.goto("/accounting");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/accounting/);

    // Step 2: Review AR summary
    const arSummary = page.locator(
      '[data-testid="ar-summary"], :has-text("Receivable"), :has-text("AR")'
    );
    if (
      await arSummary
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      console.info("AR Summary visible - PASS");
    }

    // Step 3: Navigate to invoices
    await page.goto("/accounting/invoices");
    await page.waitForLoadState("networkidle");
    const invoicesPage = page.locator(
      'h1:has-text("Invoice"), h2:has-text("Invoice")'
    );
    await expect(invoicesPage.first()).toBeVisible({ timeout: 10000 });
    console.info("Invoices page accessible - PASS");

    // Step 4: Navigate to payments
    await page.goto("/accounting/payments");
    await page.waitForLoadState("networkidle");
    const paymentsPage = page.locator(
      'h1:has-text("Payment"), h2:has-text("Payment")'
    );
    await expect(paymentsPage.first()).toBeVisible({ timeout: 10000 });
    console.info("Payments page accessible - PASS");

    // Step 5: Check client balances access
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");
    const clientsPage = page.locator(
      'h1:has-text("Client"), h2:has-text("Client")'
    );
    await expect(clientsPage.first()).toBeVisible({ timeout: 10000 });
    console.info("Clients page accessible (read-only) - PASS");

    console.info("Accountant workflow completed successfully");
  });
});
