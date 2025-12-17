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

export function runVitestSuite(
  suiteName: string,
  testPath: string,
  _config: MegaQAConfig
): { result: SuiteResult; failures: Failure[] } {
  console.log(`\n🧪 Running ${suiteName}...`);

  const startTime = Date.now();
  const failures: Failure[] = [];

  let testsRun = 0,
    testsPassed = 0,
    testsFailed = 0,
    testsSkipped = 0;

  try {
    const output = execSync(`pnpm vitest run ${testPath} --reporter=json`, {
      encoding: "utf-8",
      stdio: "pipe",
    });

    // Parse JSON output from vitest
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const results = JSON.parse(jsonMatch[0]);
      testsRun = results.numTotalTests || 0;
      testsPassed = results.numPassedTests || 0;
      testsFailed = results.numFailedTests || 0;
      testsSkipped = results.numPendingTests || 0;
    }
  } catch (error) {
    // Test failures cause non-zero exit, parse output anyway
    const output = (error as { stdout?: string }).stdout || "";
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const results = JSON.parse(jsonMatch[0]);
        testsRun = results.numTotalTests || 0;
        testsPassed = results.numPassedTests || 0;
        testsFailed = results.numFailedTests || 0;
        testsSkipped = results.numPendingTests || 0;
      } catch {
        // Fallback: try to extract from console output
        const passMatch = output.match(/(\d+) passed/);
        const failMatch = output.match(/(\d+) failed/);
        const skipMatch = output.match(/(\d+) skipped/);
        testsPassed = passMatch ? parseInt(passMatch[1]) : 0;
        testsFailed = failMatch ? parseInt(failMatch[1]) : 0;
        testsSkipped = skipMatch ? parseInt(skipMatch[1]) : 0;
        testsRun = testsPassed + testsFailed + testsSkipped;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`   ${testsPassed}/${testsRun} passed (${durationMs}ms)`);

  return {
    result: {
      name: suiteName,
      category: "property",
      testsRun,
      testsPassed,
      testsFailed,
      testsSkipped,
      durationMs,
      failureIds: failures.map(f => f.id),
      coveredTags: ["property-tests"],
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
  const envVars = {
    ...process.env,
    MEGA_QA_SEED: String(config.seed),
    MEGA_QA_MODE: config.mode,
    MEGA_QA_JOURNEYS: String(config.journeyCount),
  };

  const playwrightArgs = [
    "playwright",
    "test",
    testPath,
    "--reporter=json",
    "--output=test-results",
    config.headless ? "" : "--headed",
    config.ci ? "--retries=0" : "",
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

  // Parse results from test-results.json
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
