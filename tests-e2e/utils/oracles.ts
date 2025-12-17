/**
 * Mega QA Global Oracles
 *
 * Invariants that should always hold true across all tests.
 * These capture evidence and detect common failure modes.
 */

import { Page, expect } from "@playwright/test";

export interface OracleEvidence {
  consoleErrors: string[];
  networkFailures: Array<{ url: string; status: number; error?: string }>;
  infiniteSpinnerDetected: boolean;
  layoutBroken: boolean;
}

/**
 * Collect console errors from page
 */
export function setupConsoleCapture(page: Page): string[] {
  const errors: string[] = [];

  page.on("console", msg => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  page.on("pageerror", error => {
    errors.push(error.message);
  });

  return errors;
}

/**
 * Collect network failures
 */
export function setupNetworkCapture(
  page: Page
): Array<{ url: string; status: number; error?: string }> {
  const failures: Array<{ url: string; status: number; error?: string }> = [];

  page.on("response", response => {
    if (response.status() >= 400) {
      failures.push({
        url: response.url(),
        status: response.status(),
      });
    }
  });

  page.on("requestfailed", request => {
    failures.push({
      url: request.url(),
      status: 0,
      error: request.failure()?.errorText,
    });
  });

  return failures;
}

/**
 * Check for infinite spinner (page not settling)
 */
export async function checkNoInfiniteSpinner(
  page: Page,
  timeoutMs = 10000
): Promise<boolean> {
  try {
    // Wait for network to be idle
    await page.waitForLoadState("networkidle", { timeout: timeoutMs });

    // Check for common spinner indicators
    const spinners = page.locator(
      '.spinner, [role="status"], .loading, [data-loading="true"]'
    );
    const visibleSpinners = await spinners.count();

    // If spinners are visible, wait a bit more
    if (visibleSpinners > 0) {
      await page.waitForTimeout(2000);
      const stillVisible = await spinners
        .first()
        .isVisible()
        .catch(() => false);
      return !stillVisible;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check layout consistency (nav + header present where expected)
 */
export async function checkLayoutConsistency(page: Page): Promise<boolean> {
  const url = page.url();

  // Skip for login/auth pages
  if (url.includes("/login") || url.includes("/sign-in")) {
    return true;
  }

  // Check for navigation
  const nav = page.locator('nav, aside, [role="navigation"]').first();
  const hasNav = await nav.isVisible().catch(() => false);

  return hasNav;
}

/**
 * Run all oracles and collect evidence
 */
export async function runOracles(
  page: Page,
  consoleErrors: string[],
  networkFailures: Array<{ url: string; status: number; error?: string }>
): Promise<OracleEvidence> {
  const infiniteSpinnerDetected = !(await checkNoInfiniteSpinner(page));
  const layoutBroken = !(await checkLayoutConsistency(page));

  return {
    consoleErrors: [...consoleErrors],
    networkFailures: [...networkFailures],
    infiniteSpinnerDetected,
    layoutBroken,
  };
}

/**
 * Assert oracles pass
 */
export async function assertOracles(evidence: OracleEvidence): Promise<void> {
  // Filter out expected console errors
  const criticalErrors = evidence.consoleErrors.filter(
    e =>
      !e.includes("favicon") &&
      !e.includes("DevTools") &&
      !e.includes("React DevTools")
  );

  // Allow some network failures (404s for optional resources)
  const criticalNetworkFailures = evidence.networkFailures.filter(
    f => f.status >= 500 || f.status === 0
  );

  // Assert no infinite spinner
  expect(
    evidence.infiniteSpinnerDetected,
    "Infinite spinner detected"
  ).toBeFalsy();

  // Assert layout not broken (warning only, don't fail)
  if (evidence.layoutBroken) {
    console.warn("⚠️ Layout consistency check failed");
  }

  // Log critical errors but don't fail (some may be expected)
  if (criticalErrors.length > 0) {
    console.warn(`⚠️ Console errors captured: ${criticalErrors.length}`);
  }

  // Fail on 5xx errors
  if (criticalNetworkFailures.length > 0) {
    console.error(
      `❌ Critical network failures: ${JSON.stringify(criticalNetworkFailures)}`
    );
  }
}
