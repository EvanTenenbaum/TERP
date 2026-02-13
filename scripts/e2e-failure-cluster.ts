#!/usr/bin/env tsx
/**
 * E2E Failure Auto-Clustering Script (TER-127)
 *
 * Parses Playwright JSON test results and clusters failures by:
 * 1. Error type (timeout, selector not found, assertion, etc.)
 * 2. Root cause category (auth, data, selector, timing, feature-flag, rbac)
 * 3. Affected file/spec
 *
 * Outputs:
 * - Clustered failure report (JSON + Markdown)
 * - Suggested Linear ticket updates
 *
 * Usage:
 *   npx tsx scripts/e2e-failure-cluster.ts [path-to-test-results.json]
 *   npx tsx scripts/e2e-failure-cluster.ts  # defaults to ./test-results.json
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, basename, relative } from "path";

// ─── Types ───────────────────────────────────────────────────────────

interface PlaywrightTestResult {
  suites: Suite[];
  config?: Record<string, unknown>;
}

interface Suite {
  title: string;
  file?: string;
  suites?: Suite[];
  specs?: Spec[];
}

interface Spec {
  title: string;
  ok: boolean;
  tags?: string[];
  tests?: TestCase[];
}

interface TestCase {
  expectedStatus: string;
  projectName: string;
  results: TestResult[];
  status: string;
}

interface TestResult {
  status: string;
  duration: number;
  error?: {
    message?: string;
    stack?: string;
    snippet?: string;
  };
  errors?: Array<{
    message?: string;
    stack?: string;
    snippet?: string;
  }>;
  retry: number;
}

type FailureCategory =
  | "auth"
  | "selector"
  | "timeout"
  | "data-missing"
  | "assertion"
  | "feature-flag"
  | "rbac"
  | "network"
  | "unknown";

interface ClusteredFailure {
  category: FailureCategory;
  pattern: string;
  count: number;
  files: string[];
  specs: string[];
  sampleError: string;
  suggestedFix: string;
}

interface FailureReport {
  generatedAt: string;
  inputFile: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  passRate: string;
  clusters: ClusteredFailure[];
  fileFailureCounts: Record<string, number>;
  recommendations: string[];
}

// ─── Error Classification ────────────────────────────────────────────

function classifyError(error: { message?: string; stack?: string }): {
  category: FailureCategory;
  pattern: string;
  suggestedFix: string;
} {
  const msg = (error.message || "") + " " + (error.stack || "");
  const msgLower = msg.toLowerCase();

  // Auth failures
  if (
    msgLower.includes("login") ||
    msgLower.includes("sign-in") ||
    msgLower.includes("unauthorized") ||
    msgLower.includes("401") ||
    msgLower.includes("authentication") ||
    msgLower.includes("/login")
  ) {
    return {
      category: "auth",
      pattern: "Authentication/session failure",
      suggestedFix:
        "Check auth credentials, DEMO_MODE setting, and session cookie handling",
    };
  }

  // RBAC failures
  if (
    msgLower.includes("forbidden") ||
    msgLower.includes("403") ||
    msgLower.includes("permission") ||
    msgLower.includes("access denied") ||
    msgLower.includes("not authorized")
  ) {
    return {
      category: "rbac",
      pattern: "RBAC/permission failure",
      suggestedFix:
        "Verify role has required permissions, check admin fallback setting",
    };
  }

  // Timeout failures
  if (
    msgLower.includes("timeout") ||
    msgLower.includes("exceeded") ||
    msgLower.includes("waiting for") ||
    msgLower.includes("timed out")
  ) {
    if (
      msgLower.includes("waiting for selector") ||
      msgLower.includes("locator")
    ) {
      return {
        category: "selector",
        pattern: "Selector timeout - element not found",
        suggestedFix:
          "Use data-testid selectors, add waitForLoadingComplete(), check element exists in current UI version",
      };
    }
    return {
      category: "timeout",
      pattern: "General timeout",
      suggestedFix:
        "Replace hardcoded waits with deterministic waits, increase timeout for slow environments",
    };
  }

  // Selector failures (non-timeout)
  if (
    msgLower.includes("no element") ||
    msgLower.includes("not found") ||
    msgLower.includes("locator resolved to") ||
    msgLower.includes("strict mode violation")
  ) {
    return {
      category: "selector",
      pattern: "Selector resolution failure",
      suggestedFix:
        "Use more specific selectors (data-testid), avoid .first() without .waitFor()",
    };
  }

  // Data missing
  if (
    msgLower.includes("no data") ||
    msgLower.includes("empty") ||
    msgLower.includes("no rows") ||
    msgLower.includes("no results") ||
    msgLower.includes("0 items")
  ) {
    return {
      category: "data-missing",
      pattern: "Required test data not present",
      suggestedFix:
        "Add precondition guard with test.skip(), or seed required data before test",
    };
  }

  // Feature flag
  if (
    msgLower.includes("feature") ||
    msgLower.includes("flag") ||
    msgLower.includes("not enabled") ||
    msgLower.includes("not available")
  ) {
    return {
      category: "feature-flag",
      pattern: "Feature not available in environment",
      suggestedFix: "Add requireFeature() guard, tag test with @feature-flag",
    };
  }

  // Network
  if (
    msgLower.includes("network") ||
    msgLower.includes("econnrefused") ||
    msgLower.includes("fetch failed") ||
    msgLower.includes("net::err")
  ) {
    return {
      category: "network",
      pattern: "Network/connectivity failure",
      suggestedFix: "Check server is running, verify base URL, add retry logic",
    };
  }

  // General assertion
  if (
    msgLower.includes("expect") ||
    msgLower.includes("assertion") ||
    msgLower.includes("tobetruthy") ||
    msgLower.includes("tocontain") ||
    msgLower.includes("tobevisible")
  ) {
    return {
      category: "assertion",
      pattern: "Assertion failure",
      suggestedFix: "Review expected vs actual values, check if UI has changed",
    };
  }

  return {
    category: "unknown",
    pattern: "Unclassified failure",
    suggestedFix: "Manual investigation required",
  };
}

// ─── Result Parsing ──────────────────────────────────────────────────

interface FlatFailure {
  file: string;
  spec: string;
  error: { message?: string; stack?: string };
  duration: number;
}

function normalizeFilePath(filePath: string): string {
  if (!filePath || filePath === "unknown") return "unknown";

  const normalized = filePath.replace(/\\/g, "/");
  if (!normalized.startsWith("/")) {
    return normalized.replace(/^\.\//, "");
  }

  const rel = relative(process.cwd(), normalized).replace(/\\/g, "/");
  return rel.startsWith("..") ? normalized : rel;
}

function getPrimaryResultError(result: TestResult): {
  message?: string;
  stack?: string;
  snippet?: string;
} | null {
  if (result.error) return result.error;
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    return result.errors[0] || null;
  }
  return null;
}

function flattenSuites(suites: Suite[], parentFile = ""): FlatFailure[] {
  const failures: FlatFailure[] = [];

  for (const suite of suites) {
    const file = suite.file || parentFile;

    if (suite.specs) {
      for (const spec of suite.specs) {
        if (!spec.ok && spec.tests) {
          for (const testCase of spec.tests) {
            if (
              testCase.status === "unexpected" ||
              testCase.status === "failed"
            ) {
              for (const result of testCase.results) {
                const error = getPrimaryResultError(result);
                if (error) {
                  failures.push({
                    file: normalizeFilePath(file || "unknown"),
                    spec: `${suite.title} > ${spec.title}`,
                    error,
                    duration: result.duration,
                  });
                } else if (result.status === "failed") {
                  failures.push({
                    file: normalizeFilePath(file || "unknown"),
                    spec: `${suite.title} > ${spec.title}`,
                    error: {
                      message:
                        "Playwright reported a failed result with no structured error payload",
                    },
                    duration: result.duration,
                  });
                }
              }
            }
          }
        }
      }
    }

    if (suite.suites) {
      failures.push(...flattenSuites(suite.suites, file));
    }
  }

  return failures;
}

function countTests(suites: Suite[]): {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
} {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const suite of suites) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        if (spec.tests) {
          for (const testCase of spec.tests) {
            total++;
            // Playwright reporters can emit either semantic statuses
            // ("passed", "failed", "skipped") or expectation statuses
            // ("expected", "unexpected"). Normalize both forms.
            if (testCase.status === "passed") {
              passed++;
            } else if (testCase.status === "skipped") {
              skipped++;
            } else if (
              testCase.status === "expected" &&
              testCase.expectedStatus === "skipped"
            ) {
              skipped++;
            } else if (
              testCase.status === "expected" &&
              testCase.expectedStatus === "passed"
            ) {
              passed++;
            } else {
              failed++;
            }
          }
        }
      }
    }
    if (suite.suites) {
      const sub = countTests(suite.suites);
      total += sub.total;
      passed += sub.passed;
      failed += sub.failed;
      skipped += sub.skipped;
    }
  }

  return { total, passed, failed, skipped };
}

// ─── Clustering ──────────────────────────────────────────────────────

function clusterFailures(failures: FlatFailure[]): ClusteredFailure[] {
  const clusterMap = new Map<string, ClusteredFailure>();

  for (const failure of failures) {
    const { category, pattern, suggestedFix } = classifyError(failure.error);
    const key = `${category}::${pattern}`;

    if (!clusterMap.has(key)) {
      clusterMap.set(key, {
        category,
        pattern,
        count: 0,
        files: [],
        specs: [],
        sampleError: (failure.error.message || "").slice(0, 200),
        suggestedFix,
      });
    }

    const cluster = clusterMap.get(key);
    if (!cluster) {
      throw new Error(`Cluster not found for key: ${key}`);
    }
    cluster.count++;
    if (!cluster.files.includes(failure.file)) {
      cluster.files.push(failure.file);
    }
    cluster.specs.push(failure.spec);
  }

  return Array.from(clusterMap.values()).sort((a, b) => b.count - a.count);
}

function getFileFailureCounts(failures: FlatFailure[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of failures) {
    const file = normalizeFilePath(f.file);
    counts[file] = (counts[file] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([, a], [, b]) => b - a)
  );
}

function generateRecommendations(clusters: ClusteredFailure[]): string[] {
  const recs: string[] = [];
  const categories = new Set(clusters.map(c => c.category));

  if (categories.has("auth")) {
    recs.push(
      "AUTH: Verify QA account credentials are provisioned in target environment. Check DEMO_MODE setting."
    );
  }
  if (categories.has("selector")) {
    recs.push(
      "SELECTORS: Add data-testid attributes to high-failure components. Replace text-based selectors."
    );
  }
  if (categories.has("timeout")) {
    recs.push(
      "TIMEOUTS: Replace page.waitForTimeout() with deterministic waits (networkidle, element visibility)."
    );
  }
  if (categories.has("data-missing")) {
    recs.push(
      "DATA: Add precondition guards (test.skip) for tests that require specific data. Consider API-based seeding."
    );
  }
  if (categories.has("rbac")) {
    recs.push(
      "RBAC: Disable admin fallback for permission tests. Test at API level for negative cases."
    );
  }
  if (categories.has("feature-flag")) {
    recs.push(
      "FEATURE FLAGS: Use requireFeature() guard. Tag affected tests with @feature-flag."
    );
  }
  if (categories.has("network")) {
    recs.push(
      "NETWORK: Add retry logic for network-dependent operations. Verify server health before suite."
    );
  }

  return recs;
}

// ─── Output Generation ──────────────────────────────────────────────

function generateMarkdown(report: FailureReport): string {
  let md = `# E2E Failure Cluster Report\n\n`;
  md += `**Generated:** ${report.generatedAt}\n`;
  md += `**Input:** ${report.inputFile}\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Total Tests | ${report.totalTests} |\n`;
  md += `| Passed | ${report.totalPassed} |\n`;
  md += `| Failed | ${report.totalFailed} |\n`;
  md += `| Skipped | ${report.totalSkipped} |\n`;
  md += `| Pass Rate | ${report.passRate} |\n\n`;

  md += `## Failure Clusters (by root cause)\n\n`;
  for (const cluster of report.clusters) {
    md += `### ${cluster.category.toUpperCase()}: ${cluster.pattern} (${cluster.count} failures)\n\n`;
    md += `**Affected files:** ${cluster.files.map(f => basename(f)).join(", ")}\n\n`;
    md += `**Sample error:** \`${cluster.sampleError}\`\n\n`;
    md += `**Suggested fix:** ${cluster.suggestedFix}\n\n`;
    md += `---\n\n`;
  }

  md += `## File Failure Counts\n\n`;
  md += `| File | Failures |\n|------|----------|\n`;
  for (const [file, count] of Object.entries(report.fileFailureCounts)) {
    md += `| ${file} | ${count} |\n`;
  }
  md += `\n`;

  md += `## Recommendations\n\n`;
  for (const rec of report.recommendations) {
    md += `- ${rec}\n`;
  }

  return md;
}

// ─── Main ────────────────────────────────────────────────────────────

function main(): void {
  const inputPath = resolve(process.argv[2] || "test-results.json");

  if (!existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    console.error(
      "Usage: npx tsx scripts/e2e-failure-cluster.ts [path-to-test-results.json]"
    );
    process.exit(1);
  }

  console.info(`Parsing: ${inputPath}`);
  const raw = readFileSync(inputPath, "utf-8");
  const data: PlaywrightTestResult = JSON.parse(raw);

  const counts = countTests(data.suites);
  const failures = flattenSuites(data.suites);
  const clusters = clusterFailures(failures);
  const fileFailureCounts = getFileFailureCounts(failures);
  const recommendations = generateRecommendations(clusters);

  const report: FailureReport = {
    generatedAt: new Date().toISOString(),
    inputFile: inputPath,
    totalTests: counts.total,
    totalPassed: counts.passed,
    totalFailed: counts.failed,
    totalSkipped: counts.skipped,
    passRate:
      counts.total > 0
        ? `${((counts.passed / counts.total) * 100).toFixed(1)}%`
        : "N/A",
    clusters,
    fileFailureCounts,
    recommendations,
  };

  // Write JSON report
  const jsonPath = resolve("qa-results/failure-clusters.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.info(`JSON report: ${jsonPath}`);

  // Write Markdown report
  const mdPath = resolve("qa-results/failure-clusters.md");
  writeFileSync(mdPath, generateMarkdown(report));
  console.info(`Markdown report: ${mdPath}`);

  // Console summary
  console.info(`\n${"=".repeat(60)}`);
  console.info(`FAILURE CLUSTER SUMMARY`);
  console.info(`${"=".repeat(60)}`);
  console.info(
    `Tests: ${counts.total} | Passed: ${counts.passed} | Failed: ${counts.failed} | Skipped: ${counts.skipped}`
  );
  console.info(`Pass Rate: ${report.passRate}`);
  console.info(`\nClusters (${clusters.length}):`);
  for (const c of clusters) {
    console.info(
      `  [${c.category.toUpperCase()}] ${c.pattern}: ${c.count} failures across ${c.files.length} files`
    );
  }
  console.info(`\nTop failing files:`);
  for (const [file, count] of Object.entries(fileFailureCounts).slice(0, 10)) {
    console.info(`  ${file}: ${count}`);
  }
}

main();
