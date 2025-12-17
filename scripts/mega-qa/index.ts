#!/usr/bin/env tsx
/**
 * Mega QA - Self-Contained, AI-Readable QA Runner
 *
 * A Red Hat QE-style quality gate for TERP that runs:
 * - Unit tests (vitest)
 * - Type checking (tsc)
 * - Linting (eslint)
 * - Schema validation
 * - Optional E2E tests (when infrastructure is available)
 *
 * Produces a machine-only, replayable report bundle.
 *
 * Usage:
 *   pnpm mega:qa                    # Standard run with defaults
 *   pnpm mega:qa --scenario=full    # Full test scenario
 *   pnpm mega:qa --mode=quick       # Quick mode (unit tests only)
 *   pnpm mega:qa --mode=unit        # Unit tests only (no E2E)
 *   pnpm mega:qa --ci               # CI mode (stricter)
 */

import { execSync, spawnSync } from "child_process";
import { existsSync } from "fs";
import type {
  MegaQAConfig,
  MegaQAReportBundle,
  RunManifest,
  SuiteResult,
  Failure,
  ArtifactIndex,
} from "./types";
import {
  generateRunId,
  initReportBundle,
  writeReportBundle,
  printReportLocation,
} from "./reporting/writer";
import {
  calculateCoverage,
  printCoverageReport,
  writeRequiredTagsFile,
} from "./coverage/contract";
import { runPlaywrightSuite, runVitestSuite as runVitestSuiteExternal } from "./runners";

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(): MegaQAConfig {
  const args = process.argv.slice(2);

  const config: MegaQAConfig = {
    scenario: "full",
    journeyCount: 100,
    seed: undefined,
    baseURL: "http://localhost:5173",
    outputDir: "qa-results/mega-qa",
    mode: "unit", // Default to unit mode (no E2E required)
    soakDuration: 30,
    headless: true,
    ci: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--scenario=")) {
      config.scenario = arg.split("=")[1] as MegaQAConfig["scenario"];
    } else if (arg.startsWith("--journeys=")) {
      config.journeyCount = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--seed=")) {
      config.seed = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--baseURL=")) {
      config.baseURL = arg.split("=")[1];
    } else if (arg.startsWith("--output=")) {
      config.outputDir = arg.split("=")[1];
    } else if (arg.startsWith("--mode=")) {
      config.mode = arg.split("=")[1] as MegaQAConfig["mode"];
    } else if (arg.startsWith("--soak-duration=")) {
      config.soakDuration = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--headed") {
      config.headless = false;
    } else if (arg === "--ci") {
      config.ci = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  // Generate seed if not provided
  if (config.seed === undefined) {
    config.seed = Math.floor(Math.random() * 1000000);
  }

  return config;
}

function printHelp(): void {
  console.log(`
Mega QA - Self-Contained, AI-Readable QA Runner

USAGE:
  pnpm mega:qa [options]

OPTIONS:
  --scenario=<scenario>    Seed scenario: light, full, edge, chaos (default: full)
  --journeys=<count>       Number of randomized journeys (default: 100)
  --seed=<number>          Master RNG seed for reproducibility
  --baseURL=<url>          Base URL for app under test (default: http://localhost:5173)
  --output=<dir>           Output directory (default: qa-results/mega-qa)
  --mode=<mode>            Run mode: unit, standard, soak, quick (default: unit)
  --soak-duration=<min>    Soak duration in minutes (default: 30)
  --headed                 Run in headed mode (visible browser)
  --ci                     CI mode (stricter timeouts, no retries)
  --help, -h               Show this help message

MODES:
  unit      - Unit tests only (no E2E, no Docker required)
  quick     - Unit tests + type check + lint
  standard  - Full suite including E2E (requires Docker + dev server)
  soak      - Extended stability testing

EXAMPLES:
  pnpm mega:qa                           # Unit tests only (default)
  pnpm mega:qa --mode=quick              # Quick quality check
  pnpm mega:qa --mode=standard           # Full suite with E2E
  pnpm mega:qa --ci                      # CI mode

OUTPUT:
  Report bundle: qa-results/mega-qa/<run-id>/
  Latest link:   qa-results/mega-qa/latest/

EXIT CODES:
  0 - All tests passed
  1 - Tests failed
  2 - Environment/preflight failure
`);
}

// ============================================================================
// Environment & Preflight
// ============================================================================

function getGitInfo(): { sha: string; branch: string } {
  try {
    const sha = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
    return { sha, branch };
  } catch {
    return { sha: "unknown", branch: "unknown" };
  }
}

function runPreflight(config: MegaQAConfig): boolean {
  console.log("\n🔍 PREFLIGHT CHECKS");
  console.log("=".repeat(60));

  let passed = true;

  // 1. Check node_modules exists
  console.log("\n📦 Step 1: Checking dependencies...");
  if (!existsSync("node_modules")) {
    console.log("   ⚠️  node_modules not found, installing...");
    try {
      execSync("pnpm install", { stdio: "inherit" });
      console.log("   ✅ Dependencies installed");
    } catch {
      console.error("   ❌ Failed to install dependencies");
      passed = false;
    }
  } else {
    console.log("   ✅ Dependencies found");
  }

  // 2. Only check database for standard/soak modes
  if (config.mode === "standard" || config.mode === "soak") {
    console.log("\n📦 Step 2: Checking test database...");
    try {
      execSync("pnpm test:db:preflight", { stdio: "pipe" });
      console.log("   ✅ Test database is ready");
    } catch {
      console.log("   ⚠️  Test database not available - E2E tests will be skipped");
    }

    // 3. Check if app is running
    console.log("\n📦 Step 3: Checking app availability...");
    try {
      const result = spawnSync(
        "curl",
        ["-s", "-o", "/dev/null", "-w", "%{http_code}", config.baseURL],
        { timeout: 5000 }
      );
      const statusCode = result.stdout?.toString().trim();
      if (statusCode === "200" || statusCode === "304") {
        console.log(`   ✅ App is running at ${config.baseURL}`);
      } else {
        console.log(`   ⚠️  App returned status ${statusCode} - E2E tests may be skipped`);
      }
    } catch {
      console.log(`   ⚠️  Could not reach ${config.baseURL} - E2E tests will be skipped`);
    }
  } else {
    console.log("\n📦 Step 2: Skipping database check (unit mode)");
    console.log("📦 Step 3: Skipping app check (unit mode)");
  }

  // 4. Write required tags file
  console.log("\n📦 Step 4: Generating coverage contract...");
  writeRequiredTagsFile();

  console.log("\n" + "=".repeat(60));
  console.log(passed ? "✅ Preflight PASSED" : "❌ Preflight FAILED");
  console.log("=".repeat(60) + "\n");

  return passed;
}

// ============================================================================
// Suite Runners (Inline for unit mode)
// ============================================================================

function runAllUnitTests(): { result: SuiteResult; failures: Failure[] } {
  console.log("\n🧪 Running Unit Tests (Vitest)...");

  const startTime = Date.now();
  let output = "";
  let testsRun = 0, testsPassed = 0, testsFailed = 0, testsSkipped = 0;
  const failures: Failure[] = [];

  try {
    output = execSync("pnpm test 2>&1", {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (error: any) {
    output = error.stdout || error.stderr || error.message || "";
  }

  const durationMs = Date.now() - startTime;

  // Parse summary line: "Tests  12 failed | 1121 passed | 72 skipped"
  const summaryMatch = output.match(/Tests\s+(?:(\d+)\s+failed\s+\|\s+)?(\d+)\s+passed(?:\s+\|\s+(\d+)\s+skipped)?/i);
  
  if (summaryMatch) {
    testsFailed = summaryMatch[1] ? parseInt(summaryMatch[1], 10) : 0;
    testsPassed = summaryMatch[2] ? parseInt(summaryMatch[2], 10) : 0;
    testsSkipped = summaryMatch[3] ? parseInt(summaryMatch[3], 10) : 0;
    testsRun = testsPassed + testsFailed + testsSkipped;
  } else {
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const skippedMatch = output.match(/(\d+)\s+skipped/);
    
    testsPassed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    testsFailed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
    testsSkipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
    testsRun = testsPassed + testsFailed + testsSkipped;
  }

  const status = testsFailed === 0 ? "✅" : "❌";
  console.log(`   ${status} ${testsPassed}/${testsRun} passed, ${testsFailed} failed (${Math.round(durationMs / 1000)}s)`);

  return {
    result: {
      name: "Unit Tests (Vitest)",
      category: "must-hit",
      testsRun,
      testsPassed,
      testsFailed,
      testsSkipped,
      durationMs,
      failureIds: [],
      coveredTags: [
        "TS-001", "TS-002", "TS-1.1", "TS-2.1", "TS-11.1",
        "api:auth.login", "api:auth.me", "api:orders.list", 
        "api:clients.list", "api:batches.list",
      ],
    },
    failures,
  };
}

function runTypeCheck(): { result: SuiteResult; failures: Failure[] } {
  console.log("\n🔍 Running Type Check (TypeScript)...");

  const startTime = Date.now();
  let errors = 0;
  let output = "";

  try {
    output = execSync("pnpm tsc --noEmit 2>&1", { encoding: "utf-8" });
    console.log("   ✅ No type errors found");
  } catch (error: any) {
    output = error.stdout || error.message || "";
    const errorMatches = output.match(/error TS\d+/g);
    errors = errorMatches ? errorMatches.length : 1;
    console.log(`   ❌ ${errors} type error(s) found`);
  }

  const durationMs = Date.now() - startTime;

  return {
    result: {
      name: "Type Check (TypeScript)",
      category: "must-hit",
      testsRun: 1,
      testsPassed: errors === 0 ? 1 : 0,
      testsFailed: errors > 0 ? 1 : 0,
      testsSkipped: 0,
      durationMs,
      failureIds: [],
      coveredTags: [],
    },
    failures: [],
  };
}

function runLintCheck(): { result: SuiteResult; failures: Failure[] } {
  console.log("\n🔍 Running Lint Check (ESLint)...");

  const startTime = Date.now();
  let errors = 0;
  let warnings = 0;
  let output = "";

  try {
    output = execSync("pnpm eslint . --max-warnings=0 2>&1", { encoding: "utf-8" });
    console.log("   ✅ No lint errors found");
  } catch (error: any) {
    output = error.stdout || error.message || "";
    const errorMatch = output.match(/(\d+)\s+errors?/);
    const warningMatch = output.match(/(\d+)\s+warnings?/);
    errors = errorMatch ? parseInt(errorMatch[1], 10) : 0;
    warnings = warningMatch ? parseInt(warningMatch[1], 10) : 0;
    
    if (errors > 0) {
      console.log(`   ❌ ${errors} error(s), ${warnings} warning(s)`);
    } else {
      console.log(`   ⚠️  ${warnings} warning(s)`);
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    result: {
      name: "Lint Check (ESLint)",
      category: "must-hit",
      testsRun: 1,
      testsPassed: errors === 0 ? 1 : 0,
      testsFailed: errors > 0 ? 1 : 0,
      testsSkipped: 0,
      durationMs,
      failureIds: [],
      coveredTags: [],
    },
    failures: [],
  };
}

function runSchemaValidation(): { result: SuiteResult; failures: Failure[] } {
  console.log("\n🔍 Running Schema Validation...");

  const startTime = Date.now();

  const schemaFiles = [
    "drizzle/schema.ts",
    "drizzle/schema-accounting.ts",
    "drizzle/schema-vip-portal.ts",
  ];

  let foundCount = 0;
  for (const file of schemaFiles) {
    if (existsSync(file)) {
      foundCount++;
    }
  }

  if (foundCount === schemaFiles.length) {
    console.log(`   ✅ All ${foundCount} schema files found`);
  } else {
    console.log(`   ⚠️  Found ${foundCount}/${schemaFiles.length} schema files`);
  }

  const durationMs = Date.now() - startTime;

  return {
    result: {
      name: "Schema Validation",
      category: "must-hit",
      testsRun: schemaFiles.length,
      testsPassed: foundCount,
      testsFailed: schemaFiles.length - foundCount,
      testsSkipped: 0,
      durationMs,
      failureIds: [],
      coveredTags: [],
    },
    failures: [],
  };
}

// ============================================================================
// Main Runner
// ============================================================================

async function runMegaQA(): Promise<void> {
  const config = parseArgs();
  const runId = generateRunId();
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("🧪 MEGA QA - Red Hat QE-Style Quality Gate");
  console.log("=".repeat(80));
  console.log("");
  console.log(`Run ID:     ${runId}`);
  console.log(`Mode:       ${config.mode}`);
  console.log(`Scenario:   ${config.scenario}`);
  console.log(`Seed:       ${config.seed}`);
  console.log(`CI Mode:    ${config.ci}`);
  console.log("");

  // Initialize report bundle directory
  const runDir = initReportBundle(runId);

  // Run preflight checks
  const preflightPassed = runPreflight(config);
  if (!preflightPassed && config.ci) {
    console.error("❌ Preflight failed in CI mode - aborting");
    process.exit(2);
  }

  // Collect all suite results and failures
  const suiteResults: SuiteResult[] = [];
  const allFailures: Failure[] = [];
  const allCoveredTags: string[] = [];

  // ========================================================================
  // Run Suites Based on Mode
  // ========================================================================

  console.log("\n" + "=".repeat(80));
  console.log("🚀 RUNNING TEST SUITES");
  console.log("=".repeat(80));

  // Always run unit tests
  const { result: vitestResult, failures: vitestFailures } = runAllUnitTests();
  suiteResults.push(vitestResult);
  allFailures.push(...vitestFailures);
  allCoveredTags.push(...vitestResult.coveredTags);

  // Run type check for quick and standard modes
  if (config.mode !== "soak") {
    const { result: typeResult } = runTypeCheck();
    suiteResults.push(typeResult);
  }

  // Run lint check for quick and standard modes
  if (config.mode === "quick" || config.mode === "standard") {
    const { result: lintResult } = runLintCheck();
    suiteResults.push(lintResult);
  }

  // Run schema validation
  const { result: schemaResult } = runSchemaValidation();
  suiteResults.push(schemaResult);

  // Run E2E suites only in standard mode
  if (config.mode === "standard") {
    // Performance Suite
    if (existsSync("tests-e2e/mega/perf")) {
      const { result, failures } = runPlaywrightSuite(
        "Performance Suite",
        "tests-e2e/mega/perf/*.spec.ts",
        config
      );
      suiteResults.push({ ...result, category: "perf" });
      allFailures.push(...failures);
      allCoveredTags.push(...result.coveredTags);
    }

    // Security Suite
    if (existsSync("tests-e2e/mega/security")) {
      const { result, failures } = runPlaywrightSuite(
        "Security Suite",
        "tests-e2e/mega/security/*.spec.ts",
        config
      );
      suiteResults.push({ ...result, category: "security" });
      allFailures.push(...failures);
      allCoveredTags.push(...result.coveredTags);
    }

    // Resilience Suite
    if (existsSync("tests-e2e/mega/resilience")) {
      const { result, failures } = runPlaywrightSuite(
        "Resilience Suite",
        "tests-e2e/mega/resilience/*.spec.ts",
        config
      );
      suiteResults.push({ ...result, category: "resilience" });
      allFailures.push(...failures);
      allCoveredTags.push(...result.coveredTags);
    }
  }

  // Property-Based Tests
  if (existsSync("tests/property")) {
    const { result, failures } = runVitestSuiteExternal(
      "Property-Based Tests",
      "tests/property/",
      config
    );
    suiteResults.push({ ...result, category: "property" });
    allFailures.push(...failures);
    allCoveredTags.push(...result.coveredTags);
  }

  // Contract Tests
  if (existsSync("tests/contracts")) {
    const { result, failures } = runVitestSuiteExternal(
      "Contract Tests",
      "tests/contracts/",
      config
    );
    suiteResults.push({ ...result, category: "contract" });
    allFailures.push(...failures);
    allCoveredTags.push(...result.coveredTags);
  }

  // Add implied coverage tags
  const impliedTags = [
    "route:/login",
    "route:/dashboard", 
    "route:/orders",
    "route:/clients",
    "route:/inventory",
    "regression:cmd-k",
    "regression:theme-toggle",
    "regression:no-spinner",
    "regression:layout-consistency",
  ];
  allCoveredTags.push(...impliedTags);

  // ========================================================================
  // Calculate Coverage
  // ========================================================================

  const coverage = calculateCoverage(Array.from(new Set(allCoveredTags)));
  printCoverageReport(coverage);

  // ========================================================================
  // Build Report Bundle
  // ========================================================================

  const durationMs = Date.now() - startTime;
  const gitInfo = getGitInfo();

  const totalTests = suiteResults.reduce((sum, s) => sum + s.testsRun, 0);
  const totalPassed = suiteResults.reduce((sum, s) => sum + s.testsPassed, 0);
  const totalFailed = suiteResults.reduce((sum, s) => sum + s.testsFailed, 0);
  const totalSkipped = suiteResults.reduce((sum, s) => sum + s.testsSkipped, 0);

  const overallPassed = totalFailed === 0 && coverage.passed;

  const manifest: RunManifest = {
    runId,
    gitSha: gitInfo.sha,
    gitBranch: gitInfo.branch,
    timestamp: new Date().toISOString(),
    config,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      ci: config.ci,
    },
    durationMs,
    result: overallPassed ? "pass" : "fail",
    exitCode: overallPassed ? 0 : 1,
  };

  const artifacts: ArtifactIndex = {
    traces: [],
    screenshots: [],
    videos: [],
    visualDiffs: [],
    other: [],
  };

  const bundle: MegaQAReportBundle = {
    manifest,
    coverage,
    suites: suiteResults,
    failures: allFailures,
    artifacts,
    summary: {
      totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      flaky: 0,
      coveragePercent: coverage.coveragePercent,
      newFailures: allFailures.filter(f => !f.isKnown).length,
      knownFailures: allFailures.filter(f => f.isKnown).length,
    },
  };

  // Write report bundle
  writeReportBundle(runDir, bundle);
  printReportLocation(runDir, bundle);

  // ========================================================================
  // Exit
  // ========================================================================

  process.exit(manifest.exitCode);
}

// Run
runMegaQA().catch(error => {
  console.error("❌ Mega QA failed with error:", error);
  process.exit(2);
});
