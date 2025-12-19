/**
 * Mega QA Suite Runners
 *
 * Functions to run different test suites (Playwright, Vitest)
 * and parse their results into a common format.
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import type { MegaQAConfig, SuiteResult, Failure } from "./types";

// ============================================================================
// Vitest Suite Runner (for property tests, contract tests)
// ============================================================================

/**
 * Parse vitest JSON output, handling mixed output with pino logger lines.
 * Vitest JSON output starts with {"numTotalTestSuites": so we look for that.
 */
function parseVitestJsonOutput(output: string): {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
} | null {
  // Find the vitest JSON - it starts with {"numTotalTestSuites" and may end with }]} or }
  // Use greedy match from the start pattern to end of string
  const vitestJsonMatch = output.match(/\{"numTotalTestSuites"[\s\S]+$/);
  if (vitestJsonMatch) {
    try {
      return JSON.parse(vitestJsonMatch[0]);
    } catch {
      // JSON parsing failed, try trimming
      const trimmed = vitestJsonMatch[0].trim();
      try {
        return JSON.parse(trimmed);
      } catch {
        // Still failed
      }
    }
  }

  // Alternative: look for lines containing numTotalTests
  const lines = output.split("\n");
  for (const line of lines) {
    if (line.includes('"numTotalTests"') && line.startsWith("{")) {
      try {
        return JSON.parse(line);
      } catch {
        // Continue to next line
      }
    }
  }

  return null;
}

/**
 * Fallback parsing using regex on human-readable output
 */
function parseVitestFallback(output: string): {
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
} {
  const passMatch = output.match(/(\d+) passed/);
  const failMatch = output.match(/(\d+) failed/);
  const skipMatch = output.match(/(\d+) skipped/);
  const testsPassed = passMatch ? parseInt(passMatch[1]) : 0;
  const testsFailed = failMatch ? parseInt(failMatch[1]) : 0;
  const testsSkipped = skipMatch ? parseInt(skipMatch[1]) : 0;
  return {
    testsRun: testsPassed + testsFailed + testsSkipped,
    testsPassed,
    testsFailed,
    testsSkipped,
  };
}

export function runVitestSuite(
  suiteName: string,
  testPath: string,
  _config: MegaQAConfig,
  category: SuiteResult["category"] = "property"
): { result: SuiteResult; failures: Failure[] } {
  console.log(`\n🧪 Running ${suiteName}...`);

  const startTime = Date.now();
  const failures: Failure[] = [];

  let testsRun = 0,
    testsPassed = 0,
    testsFailed = 0,
    testsSkipped = 0;

  let output = "";
  try {
    output = execSync(`pnpm vitest run ${testPath} --reporter=json`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
  } catch (error) {
    // Test failures cause non-zero exit, capture output anyway
    output = (error as { stdout?: string }).stdout || "";
  }

  // Parse JSON output from vitest
  const parsed = parseVitestJsonOutput(output);
  if (parsed) {
    testsRun = parsed.numTotalTests || 0;
    testsPassed = parsed.numPassedTests || 0;
    testsFailed = parsed.numFailedTests || 0;
    testsSkipped = parsed.numPendingTests || 0;
  } else {
    // Fallback: try to extract from console output
    const fallback = parseVitestFallback(output);
    testsRun = fallback.testsRun;
    testsPassed = fallback.testsPassed;
    testsFailed = fallback.testsFailed;
    testsSkipped = fallback.testsSkipped;
  }

  const durationMs = Date.now() - startTime;
  console.log(`   ${testsPassed}/${testsRun} passed (${durationMs}ms)`);

  // Determine covered tags based on category
  const coveredTags: string[] = [];
  if (category === "property") {
    coveredTags.push("property-tests", "business-logic", "invariants");
  } else if (category === "contract") {
    coveredTags.push("contract-tests", "api-schema", "trpc-procedures");
  }

  return {
    result: {
      name: suiteName,
      category,
      testsRun,
      testsPassed,
      testsFailed,
      testsSkipped,
      durationMs,
      failureIds: failures.map(f => f.id),
      coveredTags,
    },
    failures,
  };
}

// ============================================================================
// Playwright Suite Runner (for E2E tests)
// ============================================================================

export function runPlaywrightSuite(
  suiteName: string,
  testPath: string,
  config: MegaQAConfig
): { result: SuiteResult; failures: Failure[] } {
  console.log(`\n🧪 Running ${suiteName}...`);

  const startTime = Date.now();
  const isLocalBaseURL =
    config.baseURL.includes("localhost") || config.baseURL.includes("127.0.0.1");
  const envVars = {
    ...process.env,
    MEGA_QA_SEED: String(config.seed),
    MEGA_QA_MODE: config.mode,
    MEGA_QA_JOURNEYS: String(config.journeyCount),
    // Ensure Playwright points at the configured target (cloud or local)
    PLAYWRIGHT_BASE_URL: config.baseURL,
    MEGA_QA_BASE_URL: config.baseURL,
    // Allow globalSetup to detect cloud/live DB mode and avoid Docker/reset.
    ...(config.cloud ? { MEGA_QA_CLOUD: "1", MEGA_QA_USE_LIVE_DB: "1" } : {}),
    // IMPORTANT:
    // Do not force CI=1 for cloud runs. CI changes Playwright retries/workers defaults.
    // We explicitly control those via CLI flags below.
    ...(isLocalBaseURL ? {} : {}),
  };

  const playwrightArgs = [
    "playwright",
    "test",
    testPath,
    "--output=test-results",
    config.headless ? "" : "--headed",
    // Cloud/live DB should be gentle (single worker) but deterministic.
    config.cloud ? "--workers=1" : "",
    // Keep quick runs quick: no retries. CI runs can still opt into strict mode.
    config.ci || config.mode === "quick" ? "--retries=0" : "",
  ].filter(Boolean);

  try {
    execSync(`pnpm ${playwrightArgs.join(" ")}`, {
      env: envVars,
      stdio: "pipe",
    });
  } catch {
    // Test failures are expected, we'll parse results
  }

  const durationMs = Date.now() - startTime;

  // Parse results from test-results.json (written by playwright.config.ts json reporter)
  const resultsPath = "test-results.json";
  let testsRun = 0,
    testsPassed = 0,
    testsFailed = 0,
    testsSkipped = 0;
  const failures: Failure[] = [];
  const coveredTags: string[] = [];

  if (existsSync(resultsPath)) {
    try {
      const results = JSON.parse(readFileSync(resultsPath, "utf-8"));
      testsRun =
        results.stats?.expected +
          results.stats?.unexpected +
          results.stats?.skipped || 0;
      testsPassed = results.stats?.expected || 0;
      testsFailed = results.stats?.unexpected || 0;
      testsSkipped = results.stats?.skipped || 0;

      // Extract failures (simplified - would need full parser in production)
      // For now, just count
    } catch {
      console.warn(`   ⚠️  Could not parse ${resultsPath}`);
    }
  }

  console.log(`   ${testsPassed}/${testsRun} passed (${durationMs}ms)`);

  return {
    result: {
      name: suiteName,
      category: "must-hit",
      testsRun,
      testsPassed,
      testsFailed,
      testsSkipped,
      durationMs,
      failureIds: failures.map(f => f.id),
      coveredTags,
    },
    failures,
  };
}
