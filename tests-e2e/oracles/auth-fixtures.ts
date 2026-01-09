/**
 * QA Role Authentication Fixtures
 *
 * Extended authentication helpers for role-based testing.
 * Each QA role has deterministic credentials for reproducible tests.
 */

import { Page } from "@playwright/test";
import { QARole, QA_CREDENTIALS } from "./types";

/**
 * Fill the first visible input matching any selector
 */
async function fillFirstVisible(
  page: Page,
  selectors: string[],
  value: string
): Promise<void> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.fill(value);
      return;
    }
  }
  throw new Error(
    `No visible input found for selectors: ${selectors.join(", ")}`
  );
}

/**
 * Login as a specific QA role
 */
export async function loginAsRole(page: Page, role: QARole): Promise<void> {
  const credentials = QA_CREDENTIALS[role];
  if (!credentials) {
    throw new Error(`Unknown QA role: ${role}`);
  }

  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Fill username/email field
  await fillFirstVisible(
    page,
    [
      'input[name="username"]',
      "#username",
      'input[placeholder*="username" i]',
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email" i]',
    ],
    credentials.email
  );

  // Fill password field
  await fillFirstVisible(
    page,
    ['input[name="password"]', "#password", 'input[type="password"]'],
    credentials.password
  );

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/($|dashboard)(\?.*)?/, { timeout: 15000 });
}

/**
 * Login as Super Admin
 */
export async function loginAsSuperAdmin(page: Page): Promise<void> {
  await loginAsRole(page, "SuperAdmin");
}

/**
 * Login as Sales Manager
 */
export async function loginAsSalesManager(page: Page): Promise<void> {
  await loginAsRole(page, "SalesManager");
}

/**
 * Login as Sales Rep
 */
export async function loginAsSalesRep(page: Page): Promise<void> {
  await loginAsRole(page, "SalesRep");
}

/**
 * Login as Inventory Manager
 */
export async function loginAsInventoryManager(page: Page): Promise<void> {
  await loginAsRole(page, "InventoryManager");
}

/**
 * Login as Fulfillment
 */
export async function loginAsFulfillment(page: Page): Promise<void> {
  await loginAsRole(page, "Fulfillment");
}

/**
 * Login as Accounting Manager
 */
export async function loginAsAccountingManager(page: Page): Promise<void> {
  await loginAsRole(page, "AccountingManager");
}

/**
 * Login as Auditor (read-only)
 */
export async function loginAsAuditor(page: Page): Promise<void> {
  await loginAsRole(page, "Auditor");
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  // Try clicking logout button or user menu
  const logoutButton = page.locator(
    'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
  );

  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
  } else {
    // Try opening user menu first
    const userMenu = page.locator(
      '[data-testid="user-menu"], [aria-label="User menu"], .user-avatar'
    );
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
      await page.waitForTimeout(500);
      await page
        .locator('button:has-text("Logout"), a:has-text("Logout")')
        .click();
    }
  }

  // Wait for redirect to login
  await page.waitForURL(/\/login/, { timeout: 10000 });
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  if (url.includes("/login") || url.includes("/sign-in")) {
    return false;
  }

  // Check for logout button or user menu
  const authIndicator = page.locator(
    '[data-testid="user-menu"], [aria-label="User menu"], .user-avatar, button:has-text("Logout")'
  );

  return authIndicator.isVisible().catch(() => false);
}

/**
 * Get current user role from UI (if displayed)
 */
export async function getCurrentRole(page: Page): Promise<string | null> {
  const roleIndicator = page.locator(
    '[data-testid="user-role"], .user-role, [aria-label="Current role"]'
  );

  if (await roleIndicator.isVisible().catch(() => false)) {
    return roleIndicator.textContent();
  }

  return null;
}

/**
 * Ensure logged in as a specific role, re-login if needed
 */
export async function ensureLoggedInAs(
  page: Page,
  role: QARole
): Promise<void> {
  const loggedIn = await isLoggedIn(page);

  if (!loggedIn) {
    await loginAsRole(page, role);
    return;
  }

  // Check if we're logged in as the right role
  // For now, just verify we're logged in
  // In future, could check role indicator in UI
}

// Re-export types
export { QARole, QA_CREDENTIALS } from "./types";
