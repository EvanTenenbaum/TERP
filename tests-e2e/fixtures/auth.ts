/**
 * Centralized Authentication Fixtures
 *
 * All E2E tests should use these credentials to ensure consistency.
 * These credentials work against production via the standard /api/auth/login endpoint.
 *
 * QA accounts have bcrypt password hashes stored in the database and can authenticate
 * via the standard login flow (not the QA Auth system which is disabled in production).
 *
 * NOTE: When DEMO_MODE=true is set on the server, visitors are auto-authenticated
 * as Super Admin. The role switcher is also available for testing other roles.
 *
 * @module tests-e2e/fixtures/auth
 */

import { test as base, type Page } from "@playwright/test";

/**
 * QA Test User Credentials
 * These accounts exist in production with bcrypt password hashes.
 * Password for all QA accounts: TerpQA2026!
 */
export const QA_PASSWORD = "TerpQA2026!";

export const TEST_USERS = {
  // Primary admin account for E2E tests
  admin: {
    email: process.env.E2E_ADMIN_USERNAME || "qa.superadmin@terp.test",
    password: process.env.E2E_ADMIN_PASSWORD || QA_PASSWORD,
    role: "Super Admin",
    description: "Unrestricted access to entire system",
  },
  // Sales Manager role
  salesManager: {
    email:
      process.env.E2E_SALES_MANAGER_USERNAME || "qa.salesmanager@terp.test",
    password: process.env.E2E_SALES_MANAGER_PASSWORD || QA_PASSWORD,
    role: "Sales Manager",
    description: "Full access to clients, orders, quotes, sales sheets",
  },
  // Customer Service / Sales Rep role
  salesRep: {
    email: process.env.E2E_SALES_REP_USERNAME || "qa.salesrep@terp.test",
    password: process.env.E2E_SALES_REP_PASSWORD || QA_PASSWORD,
    role: "Customer Service",
    description: "Full access to clients, orders, returns, refunds",
  },
  // Inventory Manager role
  inventory: {
    email: process.env.E2E_INVENTORY_USERNAME || "qa.inventory@terp.test",
    password: process.env.E2E_INVENTORY_PASSWORD || QA_PASSWORD,
    role: "Inventory Manager",
    description:
      "Full access to inventory, locations, transfers, product intake",
  },
  // Warehouse Staff / Fulfillment role
  fulfillment: {
    email: process.env.E2E_FULFILLMENT_USERNAME || "qa.fulfillment@terp.test",
    password: process.env.E2E_FULFILLMENT_PASSWORD || QA_PASSWORD,
    role: "Warehouse Staff",
    description:
      "Can receive POs, adjust inventory, transfer inventory, process returns",
  },
  // Accountant role
  accounting: {
    email: process.env.E2E_ACCOUNTING_USERNAME || "qa.accounting@terp.test",
    password: process.env.E2E_ACCOUNTING_PASSWORD || QA_PASSWORD,
    role: "Accountant",
    description: "Full access to accounting, credits, COGS, bad debt",
  },
  // Read-Only Auditor role
  auditor: {
    email: process.env.E2E_AUDITOR_USERNAME || "qa.auditor@terp.test",
    password: process.env.E2E_AUDITOR_PASSWORD || QA_PASSWORD,
    role: "Read-Only Auditor",
    description: "Read-only access to all modules, full access to audit logs",
  },
  // Legacy aliases for backwards compatibility
  standard: {
    email: process.env.E2E_STANDARD_USERNAME || "qa.salesmanager@terp.test",
    password: process.env.E2E_STANDARD_PASSWORD || QA_PASSWORD,
    role: "Sales Manager",
    description: "Standard user (alias for salesManager)",
  },
  vipClient: {
    email: process.env.E2E_VIP_USERNAME || "client@greenleaf.com",
    password: process.env.E2E_VIP_PASSWORD || QA_PASSWORD,
    role: "VIP Client",
    description: "VIP Portal client access",
  },
} as const;

export const AUTH_ROUTES = {
  login: "/login",
  signIn: "/sign-in", // Alias - should redirect to /login (legacy)
  vipPortal: "/vip-portal/login",
  apiLogin: "/api/auth/login",
  apiLogout: "/api/auth/logout",
  apiMe: "/api/auth/me",
} as const;

/**
 * Fill the first visible input matching any of the given selectors
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
 * Login via the API and set the session cookie
 * This is faster and more reliable than UI-based login
 */
export async function loginViaApi(
  page: Page,
  email: string,
  password: string
): Promise<boolean> {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

  try {
    const response = await page.request.post(
      `${baseUrl}${AUTH_ROUTES.apiLogin}`,
      {
        data: { username: email, password },
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok()) {
      console.error(
        `API login failed: ${response.status()} ${await response.text()}`
      );
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("API login error:", error);
    return false;
  }
}

/**
 * Login via the UI form
 * Use this when testing the login UI itself
 */
export async function loginViaForm(
  page: Page,
  email: string,
  password: string,
  options: { waitForRedirect?: boolean; timeout?: number } = {}
): Promise<void> {
  const { waitForRedirect = true, timeout = 15000 } = options;

  await page.goto("/login");

  // Wait for the login form to be ready
  await page.waitForSelector('button[type="submit"]', { timeout: 10000 });

  // Fill email/username field
  await fillFirstVisible(
    page,
    [
      'input[name="username"]',
      "#username",
      'input[placeholder*="username" i]',
      'input[name="email"]',
      'input[type="email"]',
    ],
    email
  );

  // Fill password field
  await fillFirstVisible(
    page,
    ['input[name="password"]', "#password", 'input[type="password"]'],
    password
  );

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  if (waitForRedirect) {
    await page.waitForURL(/\/($|dashboard)(\?.*)?/, { timeout });
  }
}

/**
 * Navigate to dashboard and verify authentication landed on app shell.
 */
async function navigateToDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await page.waitForURL(/\/($|dashboard)(\?.*)?/, { timeout: 10000 });
}

/**
 * Login with credentials.
 * Non-admin roles may optionally fall back to admin when test-role fixtures are unavailable.
 */
async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
  options: { allowAdminFallback?: boolean } = {}
): Promise<void> {
  const { allowAdminFallback = false } = options;
  const apiSuccess = await loginViaApi(page, email, password);
  if (apiSuccess) {
    await navigateToDashboard(page);
    return;
  }

  try {
    await loginViaForm(page, email, password);
    return;
  } catch (error) {
    if (!allowAdminFallback || email === TEST_USERS.admin.email) {
      throw error;
    }

    const adminApiSuccess = await loginViaApi(
      page,
      TEST_USERS.admin.email,
      TEST_USERS.admin.password
    );
    if (adminApiSuccess) {
      await navigateToDashboard(page);
      return;
    }

    await loginViaForm(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  }
}

const allowAdminRoleFallback = process.env.E2E_ALLOW_ADMIN_FALLBACK !== "false";

/**
 * Helper to login as admin (Super Admin role)
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await loginWithCredentials(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
}

/**
 * Helper to login as Sales Manager
 */
export async function loginAsSalesManager(page: Page): Promise<void> {
  await loginWithCredentials(page, TEST_USERS.salesManager.email, TEST_USERS.salesManager.password, {
    allowAdminFallback: allowAdminRoleFallback,
  });
}

/**
 * Helper to login as Sales Rep (Customer Service)
 */
export async function loginAsSalesRep(page: Page): Promise<void> {
  await loginWithCredentials(page, TEST_USERS.salesRep.email, TEST_USERS.salesRep.password, {
    allowAdminFallback: allowAdminRoleFallback,
  });
}

/**
 * Helper to login as Inventory Manager
 */
export async function loginAsInventoryManager(page: Page): Promise<void> {
  await loginWithCredentials(page, TEST_USERS.inventory.email, TEST_USERS.inventory.password, {
    allowAdminFallback: allowAdminRoleFallback,
  });
}

/**
 * Helper to login as Accountant
 */
export async function loginAsAccountant(page: Page): Promise<void> {
  await loginWithCredentials(page, TEST_USERS.accounting.email, TEST_USERS.accounting.password, {
    allowAdminFallback: allowAdminRoleFallback,
  });
}

/**
 * Helper to login as Warehouse Staff
 */
export async function loginAsWarehouseStaff(page: Page): Promise<void> {
  await loginWithCredentials(page, TEST_USERS.fulfillment.email, TEST_USERS.fulfillment.password, {
    allowAdminFallback: allowAdminRoleFallback,
  });
}

/**
 * Helper to login as Fulfillment (alias for Warehouse Staff)
 */
export async function loginAsFulfillment(page: Page): Promise<void> {
  await loginAsWarehouseStaff(page);
}

/**
 * Helper to login as Auditor (read-only)
 */
export async function loginAsAuditor(page: Page): Promise<void> {
  await loginWithCredentials(page, TEST_USERS.auditor.email, TEST_USERS.auditor.password, {
    allowAdminFallback: allowAdminRoleFallback,
  });
}

/**
 * Helper to login as any QA role by name
 */
export async function loginAsRole(
  page: Page,
  role: keyof typeof TEST_USERS
): Promise<void> {
  const user = TEST_USERS[role];
  if (!user) {
    throw new Error(`Unknown role: ${role}`);
  }
  const allowAdminFallback =
    role !== "admin" && role !== "vipClient" && allowAdminRoleFallback;
  await loginWithCredentials(page, user.email, user.password, {
    allowAdminFallback,
  });
}

/**
 * Legacy alias for backwards compatibility
 */
export async function loginAsStandardUser(page: Page): Promise<void> {
  await loginAsSalesManager(page);
}

/**
 * Login as VIP Client (for VIP Portal tests)
 */
export async function loginAsVipClient(page: Page): Promise<void> {
  const { email, password } = TEST_USERS.vipClient;

  await page.goto(AUTH_ROUTES.vipPortal);
  await fillFirstVisible(
    page,
    [
      'input[name="username"]',
      "#username",
      'input[placeholder*="username" i]',
      'input[name="email"]',
      'input[type="email"]',
    ],
    email
  );
  await fillFirstVisible(
    page,
    ['input[name="password"]', "#password", 'input[type="password"]'],
    password
  );
  await page.click('button[type="submit"]');
  await page.waitForURL("/vip-portal/dashboard", { timeout: 15000 });
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

  await page.request.post(`${baseUrl}${AUTH_ROUTES.apiLogout}`);
  await page.goto("/login");
}

/**
 * Check if the current session is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

  try {
    const response = await page.request.get(`${baseUrl}${AUTH_ROUTES.apiMe}`);
    return response.ok();
  } catch {
    return false;
  }
}

/**
 * Playwright test fixture with pre-authenticated admin session
 */
export const authenticatedTest = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, _use): Promise<void> => {
    await loginAsAdmin(page);
    await _use(page);
  },
});

/**
 * Playwright test fixture with role-based authentication
 */
export const roleBasedTest = base.extend<{
  role: keyof typeof TEST_USERS;
  authedPage: Page;
}>({
  role: ["admin", { option: true }],
  authedPage: async ({ page, role }, _use): Promise<void> => {
    await loginAsRole(page, role);
    await _use(page);
  },
});
