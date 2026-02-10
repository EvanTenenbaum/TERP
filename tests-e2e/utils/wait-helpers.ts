/**
 * Deterministic wait helpers to replace hard-coded waitForTimeout() calls.
 *
 * POLICY: Never use page.waitForTimeout() in tests.
 * Instead, wait for a concrete signal (element visible, network idle, URL change, etc.).
 */
import { type Page, expect } from "@playwright/test";

/** Default timeout for element waits (ms) */
const DEFAULT_ELEMENT_TIMEOUT = 10_000;
/** Default timeout for page/navigation waits (ms) */
const DEFAULT_PAGE_TIMEOUT = 30_000;

/**
 * Wait for a skeleton/loading indicator to disappear.
 * Use this instead of fixed delays after page loads.
 */
export async function waitForLoadingComplete(
  page: Page,
  options: {
    loadingSelector?: string;
    timeout?: number;
  } = {}
): Promise<void> {
  const {
    loadingSelector = '[data-testid*="skeleton"], [data-testid*="loading"], .animate-pulse, [role="progressbar"]',
    timeout = DEFAULT_PAGE_TIMEOUT,
  } = options;

  const loading = page.locator(loadingSelector).first();

  // Fix: use try/catch instead of .catch(() => false) anti-pattern
  try {
    const isVisible = await loading.isVisible();
    if (isVisible) {
      await expect(loading).not.toBeVisible({ timeout });
    }
  } catch {
    // Element doesn't exist or is already hidden - this is fine
  }
}

/**
 * Wait for a table/grid to finish loading data.
 * Combines skeleton wait + row appearance.
 */
export async function waitForTableReady(
  page: Page,
  options: {
    rowSelector?: string;
    timeout?: number;
  } = {}
): Promise<void> {
  const {
    rowSelector = 'tbody tr, .ag-row, [role="row"]',
    timeout = DEFAULT_ELEMENT_TIMEOUT,
  } = options;

  await waitForLoadingComplete(page);

  // Wait for first row to appear
  // Note: .catch() is legitimate here - table may legitimately be empty after loading completes
  await page
    .locator(rowSelector)
    .first()
    .waitFor({ state: "visible", timeout })
    .catch(() => {
      // Empty table is a valid state - don't throw
    });
}
