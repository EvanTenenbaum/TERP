/**
 * QA Role Authentication Fixtures
 *
 * This module intentionally supports credential drift in live environments by:
 * - preferring role-specific env credentials
 * - trying API auth first (more reliable than UI-only login)
 * - falling back to known-safe role aliases when configured role accounts drift
 */

import { type Page } from "@playwright/test";
import { TEST_USERS } from "../fixtures/auth";
import type { QARole } from "./types";

type CredentialSet = {
  email: string;
  password: string;
  source: string;
};

const DEFAULT_QA_PASSWORD = "TerpQA2026!";
const ALLOW_ADMIN_FALLBACK = process.env.E2E_ALLOW_ADMIN_FALLBACK !== "false";
const BASE_URL_FOR_AUTH =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.MEGA_QA_BASE_URL ||
  "http://localhost:5173";
const ORACLE_ADMIN_FIRST =
  process.env.ORACLE_ADMIN_FIRST === "true" ||
  (process.env.ORACLE_ADMIN_FIRST !== "false" &&
    /ondigitalocean\.app/i.test(BASE_URL_FOR_AUTH));

function getBaseUrl(): string {
  return BASE_URL_FOR_AUTH;
}

function isLoginUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return pathname === "/login" || pathname === "/sign-in";
  } catch {
    return url.includes("/login") || url.includes("/sign-in");
  }
}

function dedupeCredentials(candidates: CredentialSet[]): CredentialSet[] {
  const seen = new Set<string>();
  const unique: CredentialSet[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.email}|${candidate.password}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }

  return unique;
}

function getRoleCredentialCandidates(role: QARole): CredentialSet[] {
  const sharedQaPassword = process.env.E2E_PASSWORD || DEFAULT_QA_PASSWORD;
  const candidates: CredentialSet[] = [];

  const add = (
    email: string | undefined,
    password: string | undefined,
    source: string
  ): void => {
    if (!email || !password) return;
    candidates.push({ email, password, source });
  };

  switch (role) {
    case "SuperAdmin":
      add(
        TEST_USERS.admin.email,
        TEST_USERS.admin.password,
        "TEST_USERS.admin"
      );
      break;
    case "SalesManager":
      add(
        TEST_USERS.salesManager.email,
        TEST_USERS.salesManager.password,
        "TEST_USERS.salesManager"
      );
      add(
        TEST_USERS.salesRep.email,
        TEST_USERS.salesRep.password,
        "TEST_USERS.salesRep fallback"
      );
      break;
    case "SalesRep":
      add(
        TEST_USERS.salesRep.email,
        TEST_USERS.salesRep.password,
        "TEST_USERS.salesRep"
      );
      break;
    case "InventoryManager":
      add(
        TEST_USERS.inventory.email,
        TEST_USERS.inventory.password,
        "TEST_USERS.inventory"
      );
      add(
        process.env.E2E_INVMANAGER_USERNAME || "qa.invmanager@terp.test",
        process.env.E2E_INVMANAGER_PASSWORD || sharedQaPassword,
        "legacy invmanager fallback"
      );
      break;
    case "Fulfillment":
      add(
        TEST_USERS.fulfillment.email,
        TEST_USERS.fulfillment.password,
        "TEST_USERS.fulfillment"
      );
      add(
        process.env.E2E_WAREHOUSE_USERNAME || "qa.warehouse@terp.test",
        process.env.E2E_WAREHOUSE_PASSWORD ||
          process.env.E2E_FULFILLMENT_PASSWORD ||
          sharedQaPassword,
        "legacy warehouse fallback"
      );
      add(
        TEST_USERS.inventory.email,
        TEST_USERS.inventory.password,
        "TEST_USERS.inventory fallback"
      );
      break;
    case "AccountingManager":
      add(
        TEST_USERS.accounting.email,
        TEST_USERS.accounting.password,
        "TEST_USERS.accounting"
      );
      add(
        process.env.E2E_ACCOUNTANT_USERNAME || "qa.accountant@terp.test",
        process.env.E2E_ACCOUNTANT_PASSWORD ||
          process.env.E2E_ACCOUNTING_PASSWORD ||
          sharedQaPassword,
        "legacy accountant fallback"
      );
      break;
    case "Auditor":
      add(
        TEST_USERS.auditor.email,
        TEST_USERS.auditor.password,
        "TEST_USERS.auditor"
      );
      break;
    default:
      break;
  }

  if (ALLOW_ADMIN_FALLBACK && role !== "SuperAdmin" && ORACLE_ADMIN_FIRST) {
    candidates.unshift({
      email: TEST_USERS.admin.email,
      password: TEST_USERS.admin.password,
      source: "admin fallback (priority)",
    });
  } else if (ALLOW_ADMIN_FALLBACK && role !== "SuperAdmin") {
    add(TEST_USERS.admin.email, TEST_USERS.admin.password, "admin fallback");
  }

  return dedupeCredentials(candidates);
}

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

async function waitForAuthenticatedShell(
  page: Page,
  timeout = 25000
): Promise<boolean> {
  const startedAt = Date.now();

  // Force app-shell navigation so API-cookie login has a deterministic landing page.
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  while (Date.now() - startedAt < timeout) {
    const currentUrl = page.url();
    const invalidCredentialsVisible = await page
      .getByText(/invalid username or password/i)
      .first()
      .isVisible()
      .catch(() => false);

    if (invalidCredentialsVisible) {
      return false;
    }

    if (!isLoginUrl(currentUrl)) {
      // App shell indicators.
      const hasSidebar = await page
        .locator(
          'nav, [role="navigation"], button:has-text("Sales"), a[href="/clients"], a[href="/orders"]'
        )
        .first()
        .isVisible()
        .catch(() => false);

      if (hasSidebar) {
        return true;
      }
    }

    await page.waitForTimeout(250);
  }

  return !isLoginUrl(page.url());
}

async function tryApiLogin(
  page: Page,
  credentials: CredentialSet
): Promise<boolean> {
  const response = await page.request.post(`${getBaseUrl()}/api/auth/login`, {
    data: {
      username: credentials.email,
      password: credentials.password,
    },
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok()) {
    return false;
  }

  const payload = await response
    .json()
    .catch(() => ({ success: false }) as { success?: boolean });
  if (!payload.success) {
    return false;
  }

  return waitForAuthenticatedShell(page);
}

async function tryFormLogin(
  page: Page,
  credentials: CredentialSet
): Promise<boolean> {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('button[type="submit"]', { timeout: 10000 });

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

  await fillFirstVisible(
    page,
    ['input[name="password"]', "#password", 'input[type="password"]'],
    credentials.password
  );

  await page.click('button[type="submit"]');
  return waitForAuthenticatedShell(page);
}

/**
 * Login as a specific QA role.
 */
export async function loginAsRole(page: Page, role: QARole): Promise<void> {
  const candidates = getRoleCredentialCandidates(role);
  if (candidates.length === 0) {
    throw new Error(`No credential candidates configured for role: ${role}`);
  }

  const attempted: string[] = [];
  for (const candidate of candidates) {
    attempted.push(`${candidate.email} (${candidate.source})`);

    const apiSuccess = await tryApiLogin(page, candidate);
    if (apiSuccess) return;

    const formSuccess = await tryFormLogin(page, candidate);
    if (formSuccess) return;
  }

  throw new Error(
    `Unable to authenticate role ${role}. Attempted credentials: ${attempted.join(
      ", "
    )}. Set role-specific E2E_* username/password env vars to match production QA users.`
  );
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
  await page.request
    .post(`${getBaseUrl()}/api/auth/logout`)
    .catch(() => undefined);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login/, { timeout: 15000 });
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  if (isLoginUrl(page.url())) return false;

  const authIndicator = page.locator(
    '[data-testid="user-menu"], [aria-label="User menu"], .user-avatar, button:has-text("Logout"), nav, [role="navigation"]'
  );

  return authIndicator
    .first()
    .isVisible()
    .catch(() => false);
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
  }
}

// Re-export types
export { QA_CREDENTIALS } from "./types";
export type { QARole } from "./types";
