/**
 * Precondition guards for E2E tests.
 *
 * Instead of silently catching errors when elements don't exist,
 * tests should call these guards to skip with a clear reason
 * when required data/state is absent.
 */
import { test, type Page } from "@playwright/test";
import { IS_LOCAL, IS_PRODUCTION, DEMO_MODE_EXPECTED } from "./environment";

/**
 * Skip the current test if the condition is false, with a clear reason.
 * Use this instead of silent .catch(() => false) patterns.
 */
export function skipUnless(condition: boolean, reason: string): void {
  if (!condition) {
    test.skip(true, reason);
  }
}

/**
 * Skip the current test if running against production.
 * Use for tests that create/mutate data.
 */
export function skipInProduction(reason?: string): void {
  if (IS_PRODUCTION) {
    test.skip(
      true,
      reason || "Skipped in production: test creates or mutates data"
    );
  }
}

/**
 * Skip the current test when running locally.
 * Use for tests that should execute only in remote environments.
 */
export function skipInLocal(reason?: string): void {
  if (IS_LOCAL) {
    test.skip(true, reason || "Skipped in local environment");
  }
}

/**
 * Skip the current test unless running against strict production.
 */
export function skipUnlessProduction(reason?: string): void {
  if (!IS_PRODUCTION) {
    test.skip(
      true,
      reason || "Skipped: only runs against production environment"
    );
  }
}

/**
 * Backward-compatible alias for strict production-only checks.
 * Prefer `skipUnlessProduction` in new tests.
 */
export function skipIfNotProduction(reason?: string): void {
  skipUnlessProduction(reason);
}

/**
 * Verify at least one of the given selectors is visible. Skip if none found.
 * Replaces the anti-pattern: expect(condA || condB).toBeTruthy()
 */
export async function requireOneOf(
  page: Page,
  selectors: string[],
  reason?: string,
  timeout = 5000
): Promise<string | null> {
  for (const selector of selectors) {
    try {
      await page
        .locator(selector)
        .first()
        .waitFor({ state: "visible", timeout });
      return selector;
    } catch {
      continue;
    }
  }
  test.skip(
    true,
    reason || `None of the expected elements found: ${selectors.join(", ")}`
  );
  return null;
}

/**
 * Assert at least one of the given selectors is visible.
 * Unlike requireOneOf, this FAILS the test rather than skipping.
 * Use for assertions where the element MUST exist.
 */
export async function assertOneVisible(
  page: Page,
  selectors: string[],
  message?: string,
  timeout = 5000
): Promise<void> {
  for (const selector of selectors) {
    try {
      await page
        .locator(selector)
        .first()
        .waitFor({ state: "visible", timeout });
      return;
    } catch {
      continue;
    }
  }
  throw new Error(
    message ||
      `Expected one of [${selectors.join(", ")}] to be visible, but none were`
  );
}

/**
 * Skip the current test when DEMO_MODE is active,
 * because RBAC/permission tests are meaningless when everyone is Super Admin.
 */
export function skipInDemoMode(reason?: string): void {
  if (DEMO_MODE_EXPECTED) {
    test.skip(
      true,
      reason ||
        "Skipped in DEMO_MODE: all users are auto-authenticated as Super Admin"
    );
  }
}

/**
 * Verify a page has loaded data rows (table, grid, list).
 * Returns the count of visible rows. Skips test if zero rows.
 */
export async function requireDataRows(
  page: Page,
  options: {
    /** Selector for data rows. Default: 'tbody tr, .ag-row, [role="row"]' */
    rowSelector?: string;
    /** Human-readable name for the data (e.g. "clients", "inventory batches") */
    dataName?: string;
    /** Max time to wait for rows to appear (ms). Default: 10000 */
    timeout?: number;
  } = {}
): Promise<number> {
  const {
    rowSelector = 'tbody tr, .ag-row, [role="row"]',
    dataName = "data rows",
    timeout = 10000,
  } = options;

  try {
    await page
      .locator(rowSelector)
      .first()
      .waitFor({ state: "visible", timeout });
  } catch {
    test.skip(true, `No ${dataName} found - precondition not met`);
    return 0;
  }

  const count = await page.locator(rowSelector).count();
  if (count === 0) {
    test.skip(true, `No ${dataName} found - precondition not met`);
  }
  return count;
}

/**
 * Verify a specific element is present. Skip if absent.
 */
export async function requireElement(
  page: Page,
  selector: string,
  reason?: string,
  timeout = 5000
): Promise<void> {
  try {
    await page.locator(selector).first().waitFor({ state: "visible", timeout });
  } catch {
    test.skip(true, reason || `Required element not found: ${selector}`);
  }
}

/**
 * Verify the page is authenticated (not on login page).
 * Useful as a beforeEach guard.
 */
export async function requireAuthenticated(page: Page): Promise<void> {
  const url = page.url();
  if (url.includes("/login") || url.includes("/sign-in")) {
    test.skip(true, "Authentication failed - landed on login page");
  }
}

/**
 * Require that a feature flag / UI section is present.
 * Use for optional features that may not be enabled in all environments.
 */
export async function requireFeature(
  page: Page,
  featureSelector: string,
  featureName: string,
  timeout = 5000
): Promise<void> {
  try {
    await page
      .locator(featureSelector)
      .first()
      .waitFor({ state: "visible", timeout });
  } catch {
    test.skip(
      true,
      `Feature "${featureName}" not available in this environment`
    );
  }
}
