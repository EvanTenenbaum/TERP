/**
 * Deterministic wait helpers to replace hard-coded waitForTimeout() calls.
 *
 * POLICY: Never use page.waitForTimeout() in tests.
 * Instead, wait for a concrete signal (element visible, network idle, URL change, etc.).
 */
import { type Page, type Locator, expect } from "@playwright/test";

/** Default timeout for element waits (ms) */
const DEFAULT_ELEMENT_TIMEOUT = 10_000;
/** Default timeout for page/navigation waits (ms) */
const DEFAULT_PAGE_TIMEOUT = 30_000;
/** Default timeout for network waits (ms) */
const DEFAULT_NETWORK_TIMEOUT = 15_000;

/**
 * Wait for network to settle after an action.
 * Prefer this over waitForTimeout after clicks/navigations.
 */
export async function waitForNetworkIdle(
  page: Page,
  timeout = DEFAULT_NETWORK_TIMEOUT
): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout });
}

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
  const isVisible = await loading.isVisible().catch(() => false);
  if (isVisible) {
    await expect(loading).not.toBeVisible({ timeout });
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
  await page
    .locator(rowSelector)
    .first()
    .waitFor({ state: "visible", timeout })
    .catch(() => {
      // Table may legitimately be empty
    });
}

/**
 * Wait for navigation to complete after a click.
 * Use instead of waitForTimeout after programmatic navigation.
 */
export async function waitForNavigation(
  page: Page,
  urlPattern: string | RegExp,
  timeout = DEFAULT_PAGE_TIMEOUT
): Promise<void> {
  await page.waitForURL(urlPattern, { timeout });
  await waitForLoadingComplete(page);
}

/**
 * Wait for a toast/notification to appear and optionally dismiss it.
 */
export async function waitForToast(
  page: Page,
  options: {
    textPattern?: string | RegExp;
    timeout?: number;
    dismiss?: boolean;
  } = {}
): Promise<string | null> {
  const {
    textPattern,
    timeout = DEFAULT_ELEMENT_TIMEOUT,
    dismiss = false,
  } = options;

  const toastSelector =
    '[data-testid="toast"], [role="alert"], [data-sonner-toast], .toast, [class*="toast"]';
  const toast = page.locator(toastSelector).first();

  try {
    await toast.waitFor({ state: "visible", timeout });
  } catch {
    return null;
  }

  const text = await toast.textContent();

  if (textPattern) {
    if (typeof textPattern === "string") {
      expect(text).toContain(textPattern);
    } else {
      expect(text).toMatch(textPattern);
    }
  }

  if (dismiss) {
    const closeBtn = toast
      .locator('button[aria-label*="close" i], button[aria-label*="dismiss" i]')
      .first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
  }

  return text;
}

/**
 * Wait for a dialog/modal to be fully visible and interactive.
 */
export async function waitForDialog(
  page: Page,
  timeout = DEFAULT_ELEMENT_TIMEOUT
): Promise<Locator> {
  const dialog = page
    .locator('[role="dialog"], [data-testid*="dialog"], [data-testid*="modal"]')
    .first();
  await dialog.waitFor({ state: "visible", timeout });
  return dialog;
}

/**
 * Wait for a debounced search input to settle.
 * Use instead of waitForTimeout(500) after typing in search fields.
 */
export async function waitForSearchResults(
  page: Page,
  options: {
    resultsSelector?: string;
    timeout?: number;
  } = {}
): Promise<void> {
  const {
    resultsSelector = 'tbody tr, .ag-row, [role="row"], [data-testid*="result"]',
    timeout = DEFAULT_ELEMENT_TIMEOUT,
  } = options;

  await waitForNetworkIdle(page, timeout);
  // Allow a brief moment for the DOM to update after network settles
  await page
    .locator(resultsSelector)
    .first()
    .waitFor({ state: "visible", timeout })
    .catch(() => {
      // Results may legitimately be empty after search
    });
}
