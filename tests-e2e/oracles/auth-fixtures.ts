/**
 * QA Role Authentication Fixtures
 *
 * This module intentionally supports credential drift in live environments by:
 * - preferring role-specific env credentials
 * - trying API auth first (more reliable than UI-only login)
 * - falling back to known-safe role aliases when configured role accounts drift
 */

import { type Page } from "@playwright/test";
import superjson from "superjson";
import { TEST_USERS } from "../fixtures/auth";
import type { QARole } from "./types";

type CredentialSet = {
  email: string;
  password: string;
  source: string;
};

const LAST_SUCCESSFUL_CREDENTIALS: Partial<Record<QARole, CredentialSet>> = {};

const DEFAULT_QA_PASSWORD = "TerpQA2026!";

type AuthConfig = {
  allowAdminFallback: boolean;
  allowRoleMismatch: boolean;
};

const ROLE_TO_RBAC_NAME: Record<QARole, string> = {
  SuperAdmin: "Super Admin",
  SalesManager: "Sales Manager",
  SalesRep: "Customer Service",
  InventoryManager: "Inventory Manager",
  Fulfillment: "Warehouse Staff",
  AccountingManager: "Accountant",
  Auditor: "Read-Only Auditor",
};

function getProvisionedRoleEmail(role: QARole): string {
  return `qa.oracle.${role.toLowerCase()}@terp.test`;
}

function getProvisionedRoleEmailV2(role: QARole): string {
  return `qa.oracle.${role.toLowerCase()}.v2@terp.test`;
}

function getBaseUrl(): string {
  return (
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.MEGA_QA_BASE_URL ||
    "http://localhost:5173"
  );
}

function getAuthConfig(): AuthConfig {
  return {
    // Default is strict role fidelity: no admin fallback unless explicitly enabled.
    allowAdminFallback: process.env.E2E_ALLOW_ADMIN_FALLBACK === "true",
    // Optional emergency override for environments that intentionally share one account.
    allowRoleMismatch: process.env.E2E_ALLOW_ROLE_MISMATCH === "true",
  };
}

function isLoginUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return pathname === "/login" || pathname === "/sign-in";
  } catch {
    return url.includes("/login") || url.includes("/sign-in");
  }
}

function isRetryableNavigationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("ERR_TIMED_OUT") ||
    message.includes("net::ERR_") ||
    message.includes("Navigation timeout") ||
    /Timeout \d+ms exceeded/i.test(message)
  );
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

function prioritizeCachedCredential(
  role: QARole,
  candidates: CredentialSet[]
): CredentialSet[] {
  const cached = LAST_SUCCESSFUL_CREDENTIALS[role];
  if (!cached) return candidates;
  return dedupeCredentials([cached, ...candidates]);
}

function getAllowedEmailsForRole(role: QARole): string[] {
  switch (role) {
    case "SuperAdmin":
      return [TEST_USERS.admin.email];
    case "SalesManager":
      return [
        TEST_USERS.salesManager.email,
        process.env.E2E_SALES_MANAGER_USERNAME || "qa.salesmanager@terp.test",
        getProvisionedRoleEmail("SalesManager"),
        getProvisionedRoleEmailV2("SalesManager"),
      ];
    case "SalesRep":
      return [
        TEST_USERS.salesRep.email,
        process.env.E2E_SALES_REP_USERNAME || "qa.salesrep@terp.test",
        getProvisionedRoleEmail("SalesRep"),
        getProvisionedRoleEmailV2("SalesRep"),
      ];
    case "InventoryManager":
      return [
        TEST_USERS.inventory.email,
        process.env.E2E_INVENTORY_USERNAME || "qa.inventory@terp.test",
        process.env.E2E_INVMANAGER_USERNAME || "qa.invmanager@terp.test",
        getProvisionedRoleEmail("InventoryManager"),
        getProvisionedRoleEmailV2("InventoryManager"),
      ];
    case "Fulfillment":
      return [
        TEST_USERS.fulfillment.email,
        process.env.E2E_FULFILLMENT_USERNAME || "qa.fulfillment@terp.test",
        process.env.E2E_WAREHOUSE_USERNAME || "qa.warehouse@terp.test",
        getProvisionedRoleEmail("Fulfillment"),
        getProvisionedRoleEmailV2("Fulfillment"),
      ];
    case "AccountingManager":
      return [
        TEST_USERS.accounting.email,
        process.env.E2E_ACCOUNTING_USERNAME || "qa.accounting@terp.test",
        process.env.E2E_ACCOUNTANT_USERNAME || "qa.accountant@terp.test",
        getProvisionedRoleEmail("AccountingManager"),
        getProvisionedRoleEmailV2("AccountingManager"),
      ];
    case "Auditor":
      return [
        TEST_USERS.auditor.email,
        process.env.E2E_AUDITOR_USERNAME || "qa.auditor@terp.test",
        getProvisionedRoleEmail("Auditor"),
        getProvisionedRoleEmailV2("Auditor"),
      ];
    default:
      return [];
  }
}

function isEmailAllowedForRole(role: QARole, email: string): boolean {
  const allowed = new Set(
    getAllowedEmailsForRole(role).map(value => value.toLowerCase())
  );
  return allowed.has(email.toLowerCase());
}

export function getRoleCredentialCandidates(role: QARole): CredentialSet[] {
  const config = getAuthConfig();
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
        process.env.E2E_SALES_MANAGER_USERNAME || "qa.salesmanager@terp.test",
        process.env.E2E_SALES_MANAGER_PASSWORD || sharedQaPassword,
        "legacy sales manager fallback"
      );
      add(
        getProvisionedRoleEmail("SalesManager"),
        process.env.E2E_SALES_MANAGER_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback"
      );
      add(
        getProvisionedRoleEmailV2("SalesManager"),
        process.env.E2E_SALES_MANAGER_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback v2"
      );
      break;
    case "SalesRep":
      add(
        TEST_USERS.salesRep.email,
        TEST_USERS.salesRep.password,
        "TEST_USERS.salesRep"
      );
      add(
        getProvisionedRoleEmail("SalesRep"),
        process.env.E2E_SALES_REP_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback"
      );
      add(
        getProvisionedRoleEmailV2("SalesRep"),
        process.env.E2E_SALES_REP_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback v2"
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
      add(
        getProvisionedRoleEmail("InventoryManager"),
        process.env.E2E_INVENTORY_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback"
      );
      add(
        getProvisionedRoleEmailV2("InventoryManager"),
        process.env.E2E_INVENTORY_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback v2"
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
        getProvisionedRoleEmail("Fulfillment"),
        process.env.E2E_FULFILLMENT_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback"
      );
      add(
        getProvisionedRoleEmailV2("Fulfillment"),
        process.env.E2E_FULFILLMENT_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback v2"
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
      add(
        getProvisionedRoleEmail("AccountingManager"),
        process.env.E2E_ACCOUNTING_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback"
      );
      add(
        getProvisionedRoleEmailV2("AccountingManager"),
        process.env.E2E_ACCOUNTING_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback v2"
      );
      break;
    case "Auditor":
      add(
        TEST_USERS.auditor.email,
        TEST_USERS.auditor.password,
        "TEST_USERS.auditor"
      );
      add(
        getProvisionedRoleEmail("Auditor"),
        process.env.E2E_AUDITOR_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback"
      );
      add(
        getProvisionedRoleEmailV2("Auditor"),
        process.env.E2E_AUDITOR_PASSWORD || sharedQaPassword,
        "oracle role provisioning fallback v2"
      );
      break;
    default:
      break;
  }

  if (config.allowAdminFallback && role !== "SuperAdmin") {
    candidates.push({
      email: TEST_USERS.admin.email,
      password: TEST_USERS.admin.password,
      source: "admin fallback (explicit)",
    });
  }

  return dedupeCredentials(candidates);
}

async function getAuthenticatedEmail(page: Page): Promise<string | null> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await page.request.get(`${getBaseUrl()}/api/auth/me`);
      if (response.ok()) {
        const payload = (await response.json()) as {
          user?: { email?: string };
        };
        return payload.user?.email ?? null;
      }

      const retryableStatus =
        response.status() === 408 ||
        response.status() === 429 ||
        response.status() >= 500;
      if (!retryableStatus || attempt === maxAttempts) return null;
    } catch {
      if (attempt === maxAttempts) return null;
    }

    await page.waitForTimeout(200 * attempt);
  }

  return null;
}

async function assertRoleFidelity(
  page: Page,
  role: QARole,
  credentials: CredentialSet
): Promise<boolean> {
  const config = getAuthConfig();
  if (config.allowRoleMismatch) return true;

  const currentEmail = await getAuthenticatedEmail(page);
  if (!currentEmail) return false;

  // Require both expected role-email match and attempted credential match.
  if (!isEmailAllowedForRole(role, currentEmail)) return false;
  if (currentEmail.toLowerCase() !== credentials.email.toLowerCase()) {
    return false;
  }

  return verifyRolePermissionCanary(page, role);
}

async function verifyRolePermissionCanary(
  page: Page,
  role: QARole
): Promise<boolean> {
  if (role === "SuperAdmin") {
    const result = await trpcQuery(page, "rbacRoles.list", {
      limit: 1,
      offset: 0,
      includeSystemRoles: true,
    });
    return Boolean(result);
  }

  if (role === "Fulfillment" || role === "InventoryManager") {
    const result = await trpcQuery(page, "inventory.list", {
      limit: 1,
      offset: 0,
    });
    return Boolean(result);
  }

  const result = await trpcQuery(page, "clients.list", { limit: 1, offset: 0 });
  return Boolean(result);
}

type TrpcEnvelope<T> = {
  result?: { data?: { json?: T } };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function extractTrpcJson<T>(payload: unknown): T | null {
  const direct = asRecord(payload) as TrpcEnvelope<T> | null;
  const directJson = direct?.result?.data?.json;
  if (directJson !== undefined) return directJson;

  if (Array.isArray(payload) && payload.length > 0) {
    const first = asRecord(payload[0]) as TrpcEnvelope<T> | null;
    const firstJson = first?.result?.data?.json;
    if (firstJson !== undefined) return firstJson;
  }

  return null;
}

function getTrpcUrl(path: string, input?: unknown): string {
  const url = new URL(`/api/trpc/${path.replace(/^\//, "")}`, getBaseUrl());
  if (input !== undefined) {
    url.searchParams.set("input", JSON.stringify(superjson.serialize(input)));
  }
  return url.toString();
}

async function trpcQuery<T>(
  page: Page,
  path: string,
  input: Record<string, unknown> = {}
): Promise<T | null> {
  const response = await page.request.get(getTrpcUrl(path, input));
  if (!response.ok()) return null;

  const payload = (await response.json()) as unknown;
  return extractTrpcJson<T>(payload);
}

async function trpcMutation<T>(
  page: Page,
  path: string,
  input: Record<string, unknown>
): Promise<{ ok: boolean; data: T | null; rawText?: string }> {
  const response = await page.request.post(getTrpcUrl(path), {
    data: superjson.serialize(input),
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok()) {
    return { ok: false, data: null, rawText: await response.text() };
  }

  const payload = (await response.json()) as unknown;
  return { ok: true, data: extractTrpcJson<T>(payload) };
}

function getProvisioningDisplayName(role: QARole): string {
  switch (role) {
    case "SalesManager":
      return "QA Oracle Sales Manager";
    case "SalesRep":
      return "QA Oracle Sales Rep";
    case "InventoryManager":
      return "QA Oracle Inventory Manager";
    case "Fulfillment":
      return "QA Oracle Fulfillment";
    case "AccountingManager":
      return "QA Oracle Accounting Manager";
    case "Auditor":
      return "QA Oracle Auditor";
    default:
      return "QA Oracle User";
  }
}

async function provisionRoleAccount(
  page: Page,
  role: QARole,
  candidate: CredentialSet
): Promise<boolean> {
  if (role === "SuperAdmin") return false;

  const adminCredentials: CredentialSet = {
    email: TEST_USERS.admin.email,
    password: TEST_USERS.admin.password,
    source: "TEST_USERS.admin",
  };

  try {
    const apiAuth = await tryApiLogin(page, adminCredentials);
    const authenticated =
      apiAuth || (await tryFormLogin(page, adminCredentials));
    if (!authenticated) return false;

    // Create deterministic role-specific fallback account if absent.
    const createResponse = await page.request.post(
      `${getBaseUrl()}/api/auth/create-first-user`,
      {
        data: {
          username: candidate.email,
          password: candidate.password,
          name: getProvisioningDisplayName(role),
        },
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!createResponse.ok()) {
      const body = await createResponse.text();
      if (!body.toLowerCase().includes("already exists")) {
        return false;
      }
    }

    const roleList = await trpcQuery<{
      roles?: Array<{ id: number; name: string }>;
    }>(page, "rbacRoles.list");
    const expectedRoleName = ROLE_TO_RBAC_NAME[role];
    const roleId = roleList?.roles?.find(
      roleRecord => roleRecord.name === expectedRoleName
    )?.id;
    if (!roleId) return false;

    const assignResult = await trpcMutation<{
      success?: boolean;
      message?: string;
    }>(page, "rbacUsers.assignRole", {
      userId: candidate.email,
      roleId,
    });

    if (!assignResult.ok) {
      const body = assignResult.rawText?.toLowerCase() || "";
      if (!body.includes("already")) return false;
    }

    return true;
  } catch {
    return false;
  } finally {
    await logout(page).catch(() => undefined);
  }
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
      // Primary check: authenticated user endpoint confirms session.
      const authenticatedEmail = await getAuthenticatedEmail(page);
      if (authenticatedEmail) return true;

      // Fallback shell indicators for role-specific dashboards.
      const hasShell = await page
        .locator(
          'nav, [role="navigation"], [data-testid="sidebar"], [data-testid="user-menu"], main'
        )
        .first()
        .isVisible()
        .catch(() => false);

      if (hasShell) return true;
    }

    await page.waitForTimeout(250);
  }

  if (isLoginUrl(page.url())) return false;
  const authenticatedEmail = await getAuthenticatedEmail(page);
  return Boolean(authenticatedEmail);
}

async function tryApiLogin(
  page: Page,
  credentials: CredentialSet
): Promise<boolean> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await page.request.post(
        `${getBaseUrl()}/api/auth/login`,
        {
          data: {
            username: credentials.email,
            password: credentials.password,
          },
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok()) {
        const retryableStatus =
          response.status() === 408 ||
          response.status() === 429 ||
          response.status() >= 500;
        if (retryableStatus && attempt < maxAttempts) {
          await page.waitForTimeout(400 * attempt);
          continue;
        }
        return false;
      }

      const payload = await response
        .json()
        .catch(() => ({ success: false }) as { success?: boolean });
      if (!payload.success) {
        return false;
      }

      return waitForAuthenticatedShell(page);
    } catch (error) {
      const canRetry =
        attempt < maxAttempts && isRetryableNavigationError(error);
      if (!canRetry) return false;
      await page.waitForTimeout(400 * attempt);
    }
  }

  return false;
}

async function tryFormLogin(
  page: Page,
  credentials: CredentialSet
): Promise<boolean> {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await page.goto("/login", { waitUntil: "domcontentloaded" });

      // Local redesign runs can intentionally bypass login in dev mode.
      // If /login immediately redirects into the app shell, treat as success.
      if (!isLoginUrl(page.url())) {
        const shellReady = await waitForAuthenticatedShell(page);
        if (shellReady) return true;
      }

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
    } catch (error) {
      const shellReady = await waitForAuthenticatedShell(page).catch(
        () => false
      );
      if (shellReady) return true;

      const canRetry =
        attempt < maxAttempts && isRetryableNavigationError(error);
      if (!canRetry) throw error;
      await page.waitForTimeout(400 * attempt);
    }
  }

  return false;
}

/**
 * Login as a specific QA role.
 */
export async function loginAsRole(page: Page, role: QARole): Promise<void> {
  const candidates = prioritizeCachedCredential(
    role,
    getRoleCredentialCandidates(role)
  );
  if (candidates.length === 0) {
    throw new Error(`No credential candidates configured for role: ${role}`);
  }

  const attempted: string[] = [];
  for (const candidate of candidates) {
    attempted.push(`${candidate.email} (${candidate.source})`);

    const apiSuccess = await tryApiLogin(page, candidate);
    if (apiSuccess) {
      const roleMatch = await assertRoleFidelity(page, role, candidate);
      if (roleMatch) {
        LAST_SUCCESSFUL_CREDENTIALS[role] = candidate;
        return;
      }
      await logout(page);
    }

    const formSuccess = await tryFormLogin(page, candidate);
    if (formSuccess) {
      const roleMatch = await assertRoleFidelity(page, role, candidate);
      if (roleMatch) {
        LAST_SUCCESSFUL_CREDENTIALS[role] = candidate;
        return;
      }
      await logout(page);
    }
  }

  const provisioningCandidates = candidates.filter(candidate =>
    candidate.source.includes("oracle role provisioning")
  );
  for (const provisioningCandidate of provisioningCandidates) {
    const provisioned = await provisionRoleAccount(
      page,
      role,
      provisioningCandidate
    );
    if (!provisioned) continue;

    attempted.push(
      `${provisioningCandidate.email} (oracle role account provisioned)`
    );

    const apiSuccess = await tryApiLogin(page, provisioningCandidate);
    if (apiSuccess) {
      const roleMatch = await assertRoleFidelity(
        page,
        role,
        provisioningCandidate
      );
      if (roleMatch) {
        LAST_SUCCESSFUL_CREDENTIALS[role] = provisioningCandidate;
        return;
      }
      await logout(page);
    }

    const formSuccess = await tryFormLogin(page, provisioningCandidate);
    if (formSuccess) {
      const roleMatch = await assertRoleFidelity(
        page,
        role,
        provisioningCandidate
      );
      if (roleMatch) {
        LAST_SUCCESSFUL_CREDENTIALS[role] = provisioningCandidate;
        return;
      }
      await logout(page);
    }
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

export const __testables = {
  getAuthConfig,
  getAllowedEmailsForRole,
  isEmailAllowedForRole,
  getRoleCredentialCandidates,
};

// Re-export types
export { QA_CREDENTIALS } from "./types";
export type { QARole } from "./types";
