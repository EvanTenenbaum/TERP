/**
 * Centralized Authentication Fixtures
 * 
 * All E2E tests should use these credentials to ensure consistency.
 * These must match the seeded test data.
 */

export const TEST_USERS = {
  admin: {
    // In production/live DB mode, override via env to avoid hardcoding credentials.
    // (Username is stored in the `users.email` field in the simple auth system.)
    email: process.env.E2E_ADMIN_USERNAME || 'admin@terp.test',
    password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
  },
  standard: {
    email: process.env.E2E_STANDARD_USERNAME || 'test@example.com',
    password: process.env.E2E_STANDARD_PASSWORD || 'password123',
  },
  vipClient: {
    email: process.env.E2E_VIP_USERNAME || 'client@greenleaf.com',
    password: process.env.E2E_VIP_PASSWORD || 'password123',
  },
} as const;

export const AUTH_ROUTES = {
  login: '/login',
  signIn: '/sign-in', // Alias - should redirect to /login (legacy)
  vipPortal: '/vip-portal/login',
} as const;

async function fillFirstVisible(
  page: import('@playwright/test').Page,
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
  throw new Error(`No visible input found for selectors: ${selectors.join(', ')}`);
}

/**
 * Helper to login via the standard login page
 */
export async function loginAsAdmin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await fillFirstVisible(page, ['input[name="username"]', '#username', 'input[placeholder*="username" i]', 'input[name="email"]', 'input[type="email"]'], TEST_USERS.admin.email);
  await fillFirstVisible(page, ['input[name="password"]', '#password', 'input[type="password"]'], TEST_USERS.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/($|dashboard)(\?.*)?/, { timeout: 15000 });
}

export async function loginAsStandardUser(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await fillFirstVisible(page, ['input[name="username"]', '#username', 'input[placeholder*="username" i]', 'input[name="email"]', 'input[type="email"]'], TEST_USERS.standard.email);
  await fillFirstVisible(page, ['input[name="password"]', '#password', 'input[type="password"]'], TEST_USERS.standard.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/($|dashboard)(\?.*)?/, { timeout: 15000 });
}

export async function loginAsVipClient(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(AUTH_ROUTES.vipPortal);
  await fillFirstVisible(page, ['input[name="username"]', '#username', 'input[placeholder*="username" i]', 'input[name="email"]', 'input[type="email"]'], TEST_USERS.vipClient.email);
  await fillFirstVisible(page, ['input[name="password"]', '#password', 'input[type="password"]'], TEST_USERS.vipClient.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/vip-portal/dashboard', { timeout: 15000 });
}
