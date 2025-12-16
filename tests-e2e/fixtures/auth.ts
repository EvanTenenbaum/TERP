/**
 * Centralized Authentication Fixtures
 * 
 * All E2E tests should use these credentials to ensure consistency.
 * These must match the seeded test data.
 */

export const TEST_USERS = {
  admin: {
    email: 'admin@terp.test',
    password: 'admin123',
  },
  standard: {
    email: 'test@example.com',
    password: 'password123',
  },
  vipClient: {
    email: 'client@greenleaf.com',
    password: 'password123',
  },
} as const;

export const AUTH_ROUTES = {
  login: '/login',
  signIn: '/sign-in', // Alias - should redirect to /login
  vipPortal: '/vip-portal/sign-in',
} as const;

/**
 * Helper to login via the standard login page
 */
export async function loginAsAdmin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"], input[type="email"]', TEST_USERS.admin.email);
  await page.fill('input[name="password"], input[type="password"]', TEST_USERS.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });
}

export async function loginAsStandardUser(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"], input[type="email"]', TEST_USERS.standard.email);
  await page.fill('input[name="password"], input[type="password"]', TEST_USERS.standard.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });
}

export async function loginAsVipClient(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/vip-portal/sign-in');
  await page.fill('input[name="email"], input[type="email"]', TEST_USERS.vipClient.email);
  await page.fill('input[name="password"], input[type="password"]', TEST_USERS.vipClient.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/vip-portal/dashboard', { timeout: 10000 });
}
