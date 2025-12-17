/**
 * Mega QA Report Bundle Writer
 *
 * Writes the structured report bundle to disk in a format
 * optimized for AI-only consumption and replay.
 */

import {
  writeFileSync,
  mkdirSync,
  existsSync,
  symlinkSync,
  unlinkSync,
} from "fs";
import { join } from "path";
import type {
  MegaQAReportBundle,
  RunManifest,
  CoverageReport,
  SuiteResult,
  Failure,
  ArtifactIndex,
} from "../types";

const QA_RESULTS_DIR = "qa-results/mega-qa";

/**
 * Generate a unique run ID based on timestamp
 */
export function generateRunId(): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0].replace(/-/g, "");
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "");
  const random = Math.random().toString(36).substring(2, 6);
  return `${date}-${time}-${random}`;
}

/**
 * Get the output directory for a run
 */
export function getRunDir(runId: string): string {
  return join(QA_RESULTS_DIR, runId);
}

/**
 * Initialize the report bundle directory
 */
export function initReportBundle(runId: string): string {
  const runDir = getRunDir(runId);

  // Create directories
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(runDir, "artifacts"), { recursive: true });
  mkdirSync(join(runDir, "artifacts/traces"), { recursive: true });
  mkdirSync(join(runDir, "artifacts/screenshots"), { recursive: true });
  mkdirSync(join(runDir, "artifacts/videos"), { recursive: true });
  mkdirSync(join(runDir, "artifacts/visual-diffs"), { recursive: true });

  return runDir;
}

/**
 * Write the manifest file
 */
export function writeManifest(runDir: string, manifest: RunManifest): void {
  const path = join(runDir, "manifest.json");
  writeFileSync(path, JSON.stringify(manifest, null, 2));
}

/**
 * Write the coverage report
 */
export function writeCoverageReport(
  runDir: string,
  coverage: CoverageReport
): void {
  const path = join(runDir, "coverage.json");
  writeFileSync(path, JSON.stringify(coverage, null, 2));
}

/**
 * Write the failures file
 */
export function writeFailures(runDir: string, failures: Failure[]): void {
  const path = join(runDir, "failures.json");
  writeFileSync(path, JSON.stringify(failures, null, 2));
}

/**
 * Write the suite results
 */
export function writeSuiteResults(runDir: string, suites: SuiteResult[]): void {
  const path = join(runDir, "suites.json");
  writeFileSync(path, JSON.stringify(suites, null, 2));
}

/**
 * Write the artifact index
 */
export function writeArtifactIndex(
  runDir: string,
  artifacts: ArtifactIndex
): void {
  const path = join(runDir, "artifacts.json");
  writeFileSync(path, JSON.stringify(artifacts, null, 2));
}

/**
 * Write the complete report bundle
 */
export function writeReportBundle(
  runDir: string,
  bundle: MegaQAReportBundle
): void {
  // Write individual files
  writeManifest(runDir, bundle.manifest);
  writeCoverageReport(runDir, bundle.coverage);
  writeFailures(runDir, bundle.failures);
  writeSuiteResults(runDir, bundle.suites);
  writeArtifactIndex(runDir, bundle.artifacts);

  // Write combined bundle
  const bundlePath = join(runDir, "bundle.json");
  writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));

  // Write summary for quick reading
  const summaryPath = join(runDir, "summary.json");
  writeFileSync(summaryPath, JSON.stringify(bundle.summary, null, 2));

  // Update the "latest" symlink
  updateLatestLink(runDir);
}

/**
 * Update the "latest" symlink to point to the most recent run
 */
function updateLatestLink(runDir: string): void {
  const latestPath = join(QA_RESULTS_DIR, "latest");

  try {
    // Remove existing symlink if it exists
    if (existsSync(latestPath)) {
      unlinkSync(latestPath);
    }

    // Create new symlink (relative path for portability)
    const runId = runDir.split("/").pop() ?? "unknown";
    symlinkSync(runId, latestPath);
  } catch (error) {
    // Symlink may fail on some systems, just log and continue
    console.warn("⚠️  Could not create latest symlink:", error);
  }
}

/**
 * Generate a machine-readable summary line for CLI output
 */
export function formatSummaryLine(bundle: MegaQAReportBundle): string {
  const { summary, manifest } = bundle;
  const status = manifest.result === "pass" ? "✅ PASS" : "❌ FAIL";

  return [
    status,
    `tests=${summary.passed}/${summary.totalTests}`,
    `coverage=${summary.coveragePercent.toFixed(1)}%`,
    `new_failures=${summary.newFailures}`,
    `known_failures=${summary.knownFailures}`,
    `duration=${Math.round(manifest.durationMs / 1000)}s`,
    `bundle=${manifest.runId}`,
  ].join(" | ");
}

/**
 * Print report location for AI consumption
 */
export function printReportLocation(
  runDir: string,
  bundle: MegaQAReportBundle
): void {
  console.log("\n" + "=".repeat(80));
  console.log("📦 MEGA QA REPORT BUNDLE");
  console.log("=".repeat(80));
  console.log("");
  console.log(`Run ID:     ${bundle.manifest.runId}`);
  console.log(`Result:     ${bundle.manifest.result.toUpperCase()}`);
  console.log(`Exit Code:  ${bundle.manifest.exitCode}`);
  console.log("");
  console.log(`Bundle:     ${runDir}/bundle.json`);
  console.log(`Manifest:   ${runDir}/manifest.json`);
  console.log(`Coverage:   ${runDir}/coverage.json`);
  console.log(`Failures:   ${runDir}/failures.json`);
  console.log(`Artifacts:  ${runDir}/artifacts/`);
  console.log("");
  console.log("Summary:");
  console.log(
    `  Tests:      ${bundle.summary.passed}/${bundle.summary.totalTests} passed`
  );
  console.log(`  Coverage:   ${bundle.summary.coveragePercent.toFixed(1)}%`);
  console.log(
    `  Failures:   ${bundle.summary.failed} (${bundle.summary.newFailures} new)`
  );
  console.log(
    `  Duration:   ${Math.round(bundle.manifest.durationMs / 1000)}s`
  );
  console.log("");
  console.log("=".repeat(80));
  console.log("");

  // Print machine-readable summary
  console.log("MACHINE_SUMMARY: " + formatSummaryLine(bundle));
  console.log("");
}
