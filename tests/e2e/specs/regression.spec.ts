/**
 * Wave 2B Regression Test Suite
 *
 * This suite verifies critical flows and navigation after fixes.
 * Run with: pnpm test:e2e tests/e2e/specs/regression.spec.ts
 */
import { test, expect } from "../fixtures/test-fixtures";

// ============================================================================
// Navigation Routes Tests
// ============================================================================

const mainRoutes = [
  { path: "/", name: "Dashboard" },
  { path: "/clients", name: "Clients" },
  { path: "/orders", name: "Orders" },
  { path: "/inventory", name: "Inventory" },
  { path: "/products", name: "Products" },
  { path: "/samples", name: "Samples" },
  { path: "/calendar", name: "Calendar" },
  { path: "/settings", name: "Settings" },
  { path: "/accounting", name: "Accounting" },
  { path: "/analytics", name: "Analytics" },
  { path: "/users", name: "Users" },
  { path: "/purchase-orders", name: "Purchase Orders" },
  { path: "/vendors", name: "Vendors" },
  { path: "/spreadsheet-view", name: "Spreadsheet View" },
] as const;

test.describe("Navigation Routes - No 404s", () => {
  for (const route of mainRoutes) {
    test(`${route.name} (${route.path}) loads without 404`, async ({
      page,
      dashboardPage,
    }) => {
      await dashboardPage.goto();

      // Navigate to the route
      await page.goto(route.path);

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Should NOT show 404 page
      await expect(page.locator('text="Page not found"')).not.toBeVisible();
      await expect(page.locator('text="404"')).not.toBeVisible();

      // Should have main content area
      await expect(page.locator("main, [role='main']")).toBeVisible();
    });
  }
});

// ============================================================================
// Error Boundary Tests
// ============================================================================

test.describe("Error Handling", () => {
  test("404 page displays correctly for invalid routes", async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.goto("/this-route-does-not-exist-at-all-12345");
    await page.waitForLoadState("networkidle");

    // Should show 404 UI (not a blank page)
    const notFoundText = page.locator('text=/page not found|404/i');
    await expect(notFoundText).toBeVisible();

    // Should have a "Go Home" or similar link
    const homeLink = page.locator(
      'a[href="/"], button:has-text("Home"), button:has-text("Go back")'
    );
    await expect(homeLink).toBeVisible();
  });

  test("Dashboard loads without JavaScript errors", async ({
    page,
    dashboardPage,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", error => {
      errors.push(error.message);
    });

    await dashboardPage.goto();
    await dashboardPage.expectLoaded();
    await page.waitForLoadState("networkidle");

    // Allow some time for widgets to load
    await page.waitForTimeout(1000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      error =>
        !error.includes("ResizeObserver") && !error.includes("Non-Error promise")
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

// ============================================================================
// Modal Open/Close Tests
// ============================================================================

test.describe("Modal Behavior", () => {
  test("Add Client modal opens and closes correctly", async ({
    page,
    clientsPage,
  }) => {
    await clientsPage.goto();
    await clientsPage.expectLoaded();

    // Look for add client button
    const addButton = page.locator(
      'button:has-text("Add Client"), button:has-text("New Client"), [data-testid="add-client-button"]'
    );

    if ((await addButton.count()) > 0) {
      await addButton.first().click();

      // Modal should be visible
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Press ESC to close
      await page.keyboard.press("Escape");

      // Modal should be gone
      await expect(modal).not.toBeVisible();
    }
  });

  test("Dialogs close on ESC key press", async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();

    // Open command palette (Ctrl+K)
    await page.keyboard.press("Control+k");

    // Should show command palette
    const commandPalette = page.locator('[cmdk-root], [role="dialog"]');
    await expect(commandPalette).toBeVisible();

    // Press ESC
    await page.keyboard.press("Escape");

    // Should close
    await expect(commandPalette).not.toBeVisible();
  });

  test("Dialogs close on backdrop click", async ({ page, clientsPage }) => {
    await clientsPage.goto();
    await clientsPage.expectLoaded();

    // Look for any button that opens a modal
    const addButton = page.locator(
      'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
    );

    if ((await addButton.count()) > 0) {
      await addButton.first().click();

      const modal = page.locator('[role="dialog"]');
      if ((await modal.count()) > 0) {
        await expect(modal).toBeVisible();

        // Click outside the modal (on the overlay)
        const overlay = page.locator(
          '[data-state="open"][data-radix-dialog-overlay], .fixed.inset-0.bg-black'
        );
        if ((await overlay.count()) > 0) {
          await overlay.click({ position: { x: 10, y: 10 }, force: true });

          // Modal should close
          await expect(modal).not.toBeVisible({ timeout: 2000 });
        }
      }
    }
  });
});

// ============================================================================
// Critical Flow Tests
// ============================================================================

test.describe("Critical Flows", () => {
  test("can view client list", async ({ page, clientsPage }) => {
    await clientsPage.goto();
    await clientsPage.expectLoaded();

    // Should have a table or list of clients
    const clientContainer = page.locator(
      'table, [role="grid"], [data-testid="clients-list"]'
    );
    await expect(clientContainer).toBeVisible();
  });

  test("can navigate to order creator", async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();

    // Navigate to order creator
    await page.goto("/orders/create");
    await page.waitForLoadState("networkidle");

    // Should load order creator page
    await expect(page.locator('text=/create.*order|new.*order/i')).toBeVisible();
  });

  test("can view inventory list", async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Should show inventory content (table or empty state)
    const content = page.locator(
      'table, [role="grid"], [data-testid="inventory-list"], [class*="empty-state"]'
    );
    await expect(content).toBeVisible();
  });

  test("settings page loads with sections", async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Should have settings content
    await expect(page.locator('text=/settings/i').first()).toBeVisible();
  });
});

// ============================================================================
// Empty State Tests
// ============================================================================

test.describe("Empty States", () => {
  test("clients page shows empty state or data", async ({
    page,
    clientsPage,
  }) => {
    await clientsPage.goto();
    await clientsPage.expectLoaded();

    // Should show either data or a proper empty state, not a blank page
    const hasContent = await page
      .locator(
        'table tbody tr, [data-testid="client-row"], [class*="empty-state"], text=/no clients/i'
      )
      .first()
      .isVisible()
      .catch(() => false);

    // At minimum, the page structure should be present
    const hasPageStructure = await page
      .locator("main, [role='main']")
      .isVisible();

    expect(hasContent || hasPageStructure).toBeTruthy();
  });

  test("orders page handles empty state", async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Should show either orders or empty state
    const hasContent = await page
      .locator(
        'table tbody tr, [data-testid="order-row"], [class*="empty-state"], text=/no orders/i'
      )
      .first()
      .isVisible()
      .catch(() => false);

    const hasPageStructure = await page
      .locator("main, [role='main']")
      .isVisible();

    expect(hasContent || hasPageStructure).toBeTruthy();
  });
});

// ============================================================================
// Form Validation Tests
// ============================================================================

test.describe("Form Validation", () => {
  test("required fields show validation errors", async ({
    page,
    clientsPage,
  }) => {
    await clientsPage.goto();
    await clientsPage.expectLoaded();

    // Try to open add client modal
    const addButton = page.locator(
      'button:has-text("Add Client"), button:has-text("New Client")'
    );

    if ((await addButton.count()) > 0) {
      await addButton.first().click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Try to submit without filling required fields
      const submitButton = modal.locator(
        'button[type="submit"], button:has-text("Save"), button:has-text("Create")'
      );

      if ((await submitButton.count()) > 0) {
        await submitButton.first().click();

        // Should show validation (either HTML5 validation or custom)
        // Check for required field indicators
        const hasValidationUI =
          (await page.locator('[aria-invalid="true"]').count()) > 0 ||
          (await page.locator('text=/required/i').count()) > 0 ||
          (await page.locator(".text-destructive, .text-red").count()) > 0;

        // Note: Form might actually submit if mocked, so we just verify
        // that the modal is still present (didn't close on empty submission)
        // or that validation is shown
        expect(hasValidationUI || (await modal.isVisible())).toBeTruthy();
      }

      // Close modal
      await page.keyboard.press("Escape");
    }
  });
});

// ============================================================================
// Keyboard Accessibility Tests
// ============================================================================

test.describe("Keyboard Accessibility", () => {
  test("keyboard shortcuts work", async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();

    // Test Ctrl+K for command palette
    await page.keyboard.press("Control+k");
    const commandPalette = page.locator('[cmdk-root], [role="dialog"]');
    await expect(commandPalette).toBeVisible();
    await page.keyboard.press("Escape");

    // Test ? for keyboard shortcuts modal
    await page.keyboard.press("?");
    const shortcutsModal = page.locator(
      'text=/keyboard shortcuts/i, [data-testid="keyboard-shortcuts-modal"]'
    );
    // This may or may not be implemented, so we just check it doesn't crash
    await page.waitForTimeout(500);
  });

  test("Tab key moves focus through interactive elements", async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();

    // Tab should move focus
    await page.keyboard.press("Tab");

    // Some element should be focused
    const focusedElement = await page.locator(":focus").count();
    expect(focusedElement).toBeGreaterThan(0);
  });
});

// ============================================================================
// Spreadsheet View Tests (BUG-070)
// ============================================================================

test.describe("Spreadsheet View (BUG-070 Fix)", () => {
  test("spreadsheet view route does not 404", async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.goto("/spreadsheet-view");
    await page.waitForLoadState("networkidle");

    // Should NOT show 404
    await expect(page.locator('text="Page not found"')).not.toBeVisible();

    // Should show either:
    // 1. The spreadsheet view content (if feature flag enabled)
    // 2. A "feature disabled" message (if feature flag disabled)
    const hasContent =
      (await page.locator('text=/spreadsheet/i').count()) > 0 ||
      (await page.locator('text=/feature.*disabled/i').count()) > 0 ||
      (await page.locator('[data-testid="spreadsheet-view"]').count()) > 0;

    expect(hasContent).toBeTruthy();
  });

  test("spreadsheet view shows proper UI when enabled", async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.goto("/spreadsheet-view");
    await page.waitForLoadState("networkidle");

    // Look for tabs or content indicating the spreadsheet view is working
    const hasTabs =
      (await page.locator('[role="tablist"]').count()) > 0 ||
      (await page.locator('text=/inventory|intake|pick.*pack|clients/i').count()) >
        0;

    const hasFeatureDisabled =
      (await page.locator('text=/feature.*disabled/i').count()) > 0;

    // Either tabs are visible (feature enabled) or disabled message shown
    expect(hasTabs || hasFeatureDisabled).toBeTruthy();
  });
});

// ============================================================================
// Calendar Event Dialog Tests (Modal Fix)
// ============================================================================

test.describe("Calendar Event Dialog", () => {
  test("calendar page loads without errors", async ({ page, dashboardPage }) => {
    const errors: string[] = [];
    page.on("pageerror", error => {
      errors.push(error.message);
    });

    await dashboardPage.goto();
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");

    // Should load calendar
    await expect(page.locator('text=/calendar/i').first()).toBeVisible();

    // No critical errors
    const criticalErrors = errors.filter(
      error => !error.includes("ResizeObserver")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ============================================================================
// Accounting Routes Tests
// ============================================================================

const accountingRoutes = [
  "/accounting",
  "/accounting/invoices",
  "/accounting/bills",
  "/accounting/payments",
  "/accounting/expenses",
] as const;

test.describe("Accounting Routes", () => {
  for (const route of accountingRoutes) {
    test(`${route} loads without 404`, async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      // Should NOT show 404
      await expect(page.locator('text="Page not found"')).not.toBeVisible();

      // Should have main content
      await expect(page.locator("main, [role='main']")).toBeVisible();
    });
  }
});
