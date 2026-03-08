/**
 * Chain Health Monitor
 *
 * Distinguishes test infrastructure issues from application bugs by analyzing
 * chain execution results. Provides categorized health reports for staging
 * load test runs.
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Page } from "@playwright/test";
import type { ChainPhase, SimulationResult } from "./types";

// ---------------------------------------------------------------------------
// Health report types
// ---------------------------------------------------------------------------

export interface HealthIssue {
  category: "app_bug" | "test_infra" | "data_issue" | "network";
  chain_id: string;
  phase_id: string;
  description: string;
  evidence: string;
  screenshot?: string;
  // Is this a known/expected issue or new?
  is_new: boolean;
}

export interface HealthReport {
  timestamp: string;
  environment: string;
  total_checks: number;
  app_bugs: HealthIssue[];
  test_infra_issues: HealthIssue[];
  data_issues: HealthIssue[];
  network_issues: HealthIssue[];
  verdict: "HEALTHY" | "APP_BUGS" | "TEST_ISSUES" | "MIXED";
}

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

type FailureCategory = "app_bug" | "test_infra" | "data_issue" | "network";

interface ClassificationEvidence {
  category: FailureCategory;
  evidence: string;
}

/**
 * Classify a phase failure by inspecting the live page state.
 *
 * Heuristics:
 * - Page URL is /login → auth expired → test_infra
 * - Console errors with "500" or "Internal Server" → app_bug
 * - Element selector not found in DOM at all → test_infra (selectors wrong)
 * - "not found" / 404 content on page → data_issue or app_bug by context
 * - Network errors in page → network
 * - Page loaded fine but wrong data/assertion → app_bug
 */
export async function classifyPhaseFailure(
  page: Page,
  phase: ChainPhase,
  error: unknown
): Promise<ClassificationEvidence> {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // 1. Network-level errors (page.goto / ERR_TIMED_OUT)
  if (
    /ERR_TIMED_OUT|net::ERR_|Navigation timeout|ERR_CONNECTION_REFUSED|ERR_NAME_NOT_RESOLVED/i.test(
      errorMessage
    )
  ) {
    return {
      category: "network",
      evidence: `Network error: ${errorMessage}`,
    };
  }

  // 2. Auth expiry — redirected to login page
  const currentUrl = page.url();
  if (isLoginUrl(currentUrl)) {
    return {
      category: "test_infra",
      evidence: `Session expired — redirected to ${currentUrl}`,
    };
  }

  // 3. Gather page state for further classification
  const pageText = await getPageText(page);
  const consoleErrors = await getPageConsoleErrors(page);

  // 4. 5xx / Internal Server Error in console or page → app_bug
  if (
    consoleErrors.some(msg =>
      /500|Internal Server Error|Unhandled Error/i.test(msg)
    ) ||
    /500 internal server error|something went wrong/i.test(pageText)
  ) {
    return {
      category: "app_bug",
      evidence: `Server error detected. Console: ${consoleErrors.slice(0, 2).join("; ")} | Page: ${excerpt(pageText, 200)}`,
    };
  }

  // 5. Selector not found at all in DOM → test_infra (our selectors are stale)
  if (
    /Selector not found or not visible|not found or not visible/i.test(
      errorMessage
    )
  ) {
    // Check if selector exists attached anywhere in DOM (vs not visible)
    const selectorInError = extractSelectorFromError(errorMessage);
    if (selectorInError) {
      const isAttached = await isSelectorAttachedInDom(page, selectorInError);
      if (!isAttached) {
        return {
          category: "test_infra",
          evidence: `Selector "${selectorInError}" not found in DOM at all — selector is stale or wrong`,
        };
      }
      // Attached but not visible → likely app_bug (element hidden unexpectedly)
      return {
        category: "app_bug",
        evidence: `Selector "${selectorInError}" exists in DOM but is not visible`,
      };
    }

    return {
      category: "test_infra",
      evidence: `Selector resolution failed: ${errorMessage}`,
    };
  }

  // 6. Empty state / CANNOT_RESOLVE_ID → data_issue
  if (
    /CANNOT_RESOLVE_ID|Empty-state detected|no (orders|clients|batches|invoices|results?) found/i.test(
      errorMessage
    ) ||
    /no (orders|clients|batches|invoices|results?) found/i.test(pageText)
  ) {
    return {
      category: "data_issue",
      evidence: `Expected data not present in environment: ${errorMessage}`,
    };
  }

  // 7. 404 Not Found page text → could be app_bug or data_issue
  if (
    /404|page not found|not found/i.test(pageText) &&
    /not found/i.test(pageText.slice(0, 500))
  ) {
    // If we navigated to a dynamic URL with an ID, it's likely a data_issue
    if (/\/\d+/.test(currentUrl) || /\/[a-f0-9-]{8,}/.test(currentUrl)) {
      return {
        category: "data_issue",
        evidence: `404 on dynamic route "${currentUrl}" — resource may not exist in this environment`,
      };
    }
    return {
      category: "app_bug",
      evidence: `404 page at "${currentUrl}" — route may be broken`,
    };
  }

  // 8. Assertion errors on visible content → app_bug
  if (
    /Assert failed|expected.*to be visible|expected.*NOT be visible|page does not contain/i.test(
      errorMessage
    )
  ) {
    return {
      category: "app_bug",
      evidence: `Assertion failure: ${errorMessage} | Page excerpt: ${excerpt(pageText, 200)}`,
    };
  }

  // 9. Wrong data displayed → app_bug
  if (/expected.*but got|value.*does not match/i.test(errorMessage)) {
    return {
      category: "app_bug",
      evidence: `Data mismatch: ${errorMessage}`,
    };
  }

  // 10. Default: page loaded but something failed → classify as app_bug
  const pageLoaded = await isPageLoaded(page);
  if (pageLoaded) {
    return {
      category: "app_bug",
      evidence: `Page loaded at "${currentUrl}" but action failed: ${errorMessage}`,
    };
  }

  return {
    category: "test_infra",
    evidence: `Unknown failure (page may not have loaded): ${errorMessage}`,
  };
}

// ---------------------------------------------------------------------------
// Health report builder
// ---------------------------------------------------------------------------

/**
 * Aggregate all phase failures from a simulation result into a categorized report.
 */
export function buildHealthReport(
  simulationResult: SimulationResult,
  environment?: string
): HealthReport {
  const issues = collectAllIssues(simulationResult);

  const app_bugs = issues.filter(i => i.category === "app_bug");
  const test_infra_issues = issues.filter(i => i.category === "test_infra");
  const data_issues = issues.filter(i => i.category === "data_issue");
  const network_issues = issues.filter(i => i.category === "network");

  const totalPhases = countTotalPhases(simulationResult);

  const verdict = deriveVerdict(
    app_bugs.length,
    test_infra_issues.length,
    data_issues.length,
    network_issues.length
  );

  return {
    timestamp: new Date().toISOString(),
    environment:
      environment || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173",
    total_checks: totalPhases,
    app_bugs,
    test_infra_issues,
    data_issues,
    network_issues,
    verdict,
  };
}

// ---------------------------------------------------------------------------
// Console output
// ---------------------------------------------------------------------------

/**
 * Print a formatted health report to the console.
 */
export function printHealthReport(report: HealthReport): void {
  const separator = "═".repeat(60);
  const thin = "─".repeat(60);

  console.info("\n" + separator);
  console.info("  CHAIN HEALTH REPORT");
  console.info(separator);
  console.info(`  Timestamp : ${report.timestamp}`);
  console.info(`  Env       : ${report.environment}`);
  console.info(`  Checks    : ${report.total_checks}`);
  console.info(`  Verdict   : ${report.verdict}`);
  console.info(thin);

  if (report.app_bugs.length === 0) {
    console.info("  [APP BUGS]          None");
  } else {
    console.info(`  [APP BUGS]          ${report.app_bugs.length} found`);
    for (const issue of report.app_bugs) {
      printIssue(issue);
    }
  }

  console.info(thin);

  if (report.test_infra_issues.length === 0) {
    console.info("  [TEST INFRA ISSUES] None");
  } else {
    console.info(
      `  [TEST INFRA ISSUES] ${report.test_infra_issues.length} found`
    );
    for (const issue of report.test_infra_issues) {
      printIssue(issue);
    }
  }

  console.info(thin);

  if (report.data_issues.length === 0) {
    console.info("  [DATA ISSUES]       None");
  } else {
    console.info(`  [DATA ISSUES]       ${report.data_issues.length} found`);
    for (const issue of report.data_issues) {
      printIssue(issue);
    }
  }

  if (report.network_issues.length > 0) {
    console.info(thin);
    console.info(`  [NETWORK ISSUES]    ${report.network_issues.length} found`);
    for (const issue of report.network_issues) {
      printIssue(issue);
    }
  }

  console.info(separator + "\n");
}

// ---------------------------------------------------------------------------
// File output
// ---------------------------------------------------------------------------

/**
 * Write a JSON health report to a file in the given output directory.
 */
export async function writeHealthReport(
  report: HealthReport,
  outputDir: string
): Promise<string> {
  await mkdir(outputDir, { recursive: true });

  const timestamp = report.timestamp.replace(/[:.]/g, "-");
  const filename = `health-report-${timestamp}.json`;
  const filePath = join(outputDir, filename);

  await writeFile(filePath, JSON.stringify(report, null, 2), "utf-8");
  console.info(`[HealthMonitor] Report written to: ${filePath}`);
  return filePath;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function isLoginUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return pathname === "/login" || pathname === "/sign-in";
  } catch {
    return url.includes("/login") || url.includes("/sign-in");
  }
}

async function getPageText(page: Page): Promise<string> {
  try {
    return (
      (await page.locator("main, [role='main'], body").first().textContent()) ??
      ""
    );
  } catch {
    return "";
  }
}

async function getPageConsoleErrors(page: Page): Promise<string[]> {
  // We can't retroactively collect console messages here since we'd need to
  // set up listeners before they fire. Return an empty array as a safe fallback.
  // Callers that need console error tracking should set up page.on("console") upstream.
  const _ = page; // satisfy no-unused-vars
  return [];
}

async function isPageLoaded(page: Page): Promise<boolean> {
  try {
    const hasMain = await page
      .locator("main, [role='main'], nav, body")
      .first()
      .isVisible();
    return hasMain;
  } catch {
    return false;
  }
}

async function isSelectorAttachedInDom(
  page: Page,
  selector: string
): Promise<boolean> {
  try {
    const count = await page.locator(selector).count();
    return count > 0;
  } catch {
    return false;
  }
}

function extractSelectorFromError(errorMessage: string): string | null {
  // Attempt to pull the raw= selector from oracle executor error format
  const rawMatch = errorMessage.match(/raw=([^\s.]+)/);
  if (rawMatch?.[1]) return rawMatch[1];

  // Or the first selector-like string in the message
  const selectorMatch = errorMessage.match(
    /["']([.#[\]a-zA-Z][\w\s\-[\]="'.#:()^$*]*?)["']/
  );
  if (selectorMatch?.[1]) return selectorMatch[1];

  return null;
}

function excerpt(text: string, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength) + "…";
}

function deriveVerdict(
  appBugs: number,
  testIssues: number,
  dataIssues: number,
  networkIssues: number
): HealthReport["verdict"] {
  const hasAppBugs = appBugs > 0;
  const hasTestIssues = testIssues > 0 || dataIssues > 0 || networkIssues > 0;

  if (!hasAppBugs && !hasTestIssues) return "HEALTHY";
  if (hasAppBugs && !hasTestIssues) return "APP_BUGS";
  if (!hasAppBugs && hasTestIssues) return "TEST_ISSUES";
  return "MIXED";
}

function collectAllIssues(simulationResult: SimulationResult): HealthIssue[] {
  const issues: HealthIssue[] = [];

  for (const day of simulationResult.days) {
    for (const chain of day.chains) {
      for (const phase of chain.phases) {
        if (phase.success) continue;

        const category =
          phase.failure_type ??
          inferCategoryFromChainResult(chain.failure_type);

        const issue: HealthIssue = {
          category,
          chain_id: chain.chain_id,
          phase_id: phase.phase_id,
          description:
            phase.errors[0] ??
            `Phase "${phase.phase_id}" failed with no error message`,
          evidence: phase.failure_evidence ?? phase.errors.join("; "),
          screenshot: phase.screenshots[phase.screenshots.length - 1],
          is_new: true, // All issues are treated as new in a live run
        };

        issues.push(issue);
      }
    }
  }

  // Also pull from the top-level simulation result aggregation
  for (const appBug of simulationResult.app_bugs) {
    // Avoid duplicates — only add if not already captured from phase results
    const alreadyCaptured = issues.some(
      i =>
        i.chain_id === appBug.chain_id &&
        i.phase_id === appBug.phase_id &&
        i.category === "app_bug"
    );
    if (!alreadyCaptured) {
      issues.push({
        category: "app_bug",
        chain_id: appBug.chain_id,
        phase_id: appBug.phase_id,
        description: appBug.description,
        evidence: appBug.evidence,
        screenshot: appBug.screenshot,
        is_new: true,
      });
    }
  }

  for (const testIssue of simulationResult.test_infra_issues) {
    const alreadyCaptured = issues.some(
      i =>
        i.chain_id === testIssue.chain_id &&
        i.phase_id === testIssue.phase_id &&
        i.category === "test_infra"
    );
    if (!alreadyCaptured) {
      issues.push({
        category: "test_infra",
        chain_id: testIssue.chain_id,
        phase_id: testIssue.phase_id,
        description: testIssue.description,
        evidence: testIssue.evidence,
        is_new: true,
      });
    }
  }

  return issues;
}

function inferCategoryFromChainResult(
  chainFailureType: string | undefined
): FailureCategory {
  switch (chainFailureType) {
    case "app_bug":
      return "app_bug";
    case "test_infra":
      return "test_infra";
    case "data_issue":
      return "data_issue";
    case "network":
      return "network";
    default:
      return "app_bug";
  }
}

function countTotalPhases(simulationResult: SimulationResult): number {
  let total = 0;
  for (const day of simulationResult.days) {
    for (const chain of day.chains) {
      total += chain.phases.length;
    }
  }
  return total;
}

function printIssue(issue: HealthIssue): void {
  console.info(`    Chain   : ${issue.chain_id}`);
  console.info(`    Phase   : ${issue.phase_id}`);
  console.info(`    Desc    : ${excerpt(issue.description, 120)}`);
  console.info(`    Evidence: ${excerpt(issue.evidence, 120)}`);
  if (issue.screenshot) {
    console.info(`    Shot    : ${issue.screenshot}`);
  }
  console.info("");
}
