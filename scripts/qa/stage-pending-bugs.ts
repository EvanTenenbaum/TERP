#!/usr/bin/env tsx
/**
 * Stage Pending Bugs for Approval
 *
 * Reads Mega QA failures and stages them as pending bugs.
 * These are NOT added to the roadmap until approved via Slack.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface MegaQAFailure {
  id: string;
  testName: string;
  suiteName: string;
  specFile: string;
  category: string;
  error: string;
  seed?: number;
  replayCommand?: string;
}

interface PendingBug {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  specFile: string;
  error: string;
  replayCommand: string;
  timestamp: string;
  approved: boolean;
  dismissed: boolean;
}

interface PendingBugsFile {
  generatedAt: string;
  runId: string;
  gitSha: string;
  totalFailures: number;
  bugs: PendingBug[];
}

// Determine priority based on test category
function determinePriority(
  category: string,
  testName: string
): "HIGH" | "MEDIUM" | "LOW" {
  // Security and auth issues are always HIGH
  if (
    category === "security" ||
    testName.toLowerCase().includes("auth") ||
    testName.toLowerCase().includes("login")
  ) {
    return "HIGH";
  }

  // Core functionality
  if (
    category === "must-hit" ||
    testName.toLowerCase().includes("order") ||
    testName.toLowerCase().includes("payment")
  ) {
    return "HIGH";
  }

  // Property test failures indicate business logic bugs
  if (category === "property") {
    return "HIGH";
  }

  // Performance and accessibility
  if (category === "perf" || category === "a11y") {
    return "MEDIUM";
  }

  // Visual and resilience
  if (category === "visual" || category === "resilience") {
    return "LOW";
  }

  return "MEDIUM";
}

// Generate a provisional bug ID
function generateBugId(index: number): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `PENDING-${dateStr}-${String(index + 1).padStart(3, "0")}`;
}

// Create a descriptive title from test name
function createTitle(testName: string, category: string): string {
  // Clean up test name
  let title = testName
    .replace(/^should\s+/i, "")
    .replace(/^it\s+/i, "")
    .replace(/^test\s+/i, "");

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Add category prefix
  const categoryPrefix: Record<string, string> = {
    security: "[Security]",
    "must-hit": "[Core]",
    property: "[Logic]",
    perf: "[Perf]",
    a11y: "[A11y]",
    visual: "[Visual]",
    resilience: "[Resilience]",
    contract: "[API]",
    journey: "[E2E]",
  };

  const prefix = categoryPrefix[category] || "[Bug]";
  return `${prefix} ${title}`.substring(0, 80);
}

function main(): void {
  console.log("📦 Staging bugs for approval...\n");

  // Check for Mega QA results
  const megaQaPath = "qa-results/mega-qa/latest";
  const failuresPath = join(megaQaPath, "failures.json");
  const bundlePath = join(megaQaPath, "bundle.json");

  if (!existsSync(failuresPath) && !existsSync(bundlePath)) {
    console.log("ℹ️  No Mega QA results found - checking legacy format");

    // Try legacy format
    const legacyPath = "test-results.json";
    if (!existsSync(legacyPath)) {
      console.log("✅ No failures found - nothing to stage");
      return;
    }
  }

  let failures: MegaQAFailure[] = [];

  // Try to read failures from Mega QA
  if (existsSync(failuresPath)) {
    try {
      failures = JSON.parse(readFileSync(failuresPath, "utf-8"));
    } catch {
      console.warn("⚠️  Could not parse failures.json");
    }
  }

  // If no failures array, try to extract from bundle
  if (failures.length === 0 && existsSync(bundlePath)) {
    try {
      const bundle = JSON.parse(readFileSync(bundlePath, "utf-8"));
      failures = bundle.failures || [];
    } catch {
      console.warn("⚠️  Could not parse bundle.json");
    }
  }

  if (failures.length === 0) {
    console.log("✅ No failures found - nothing to stage");

    // Write empty pending bugs file
    const emptyFile: PendingBugsFile = {
      generatedAt: new Date().toISOString(),
      runId: process.env.GITHUB_RUN_ID || "local",
      gitSha: process.env.GITHUB_SHA || "unknown",
      totalFailures: 0,
      bugs: [],
    };

    mkdirSync("qa-results", { recursive: true });
    writeFileSync(
      "qa-results/pending-bugs.json",
      JSON.stringify(emptyFile, null, 2)
    );
    return;
  }

  console.log(`🐛 Found ${failures.length} failures\n`);

  // Load existing pending bugs for deduplication
  let existingBugs: PendingBug[] = [];
  const existingPendingPath = "qa-results/pending-bugs.json";
  if (existsSync(existingPendingPath)) {
    try {
      const existing: PendingBugsFile = JSON.parse(
        readFileSync(existingPendingPath, "utf-8")
      );
      existingBugs = existing.bugs || [];
    } catch {
      // Ignore parse errors
    }
  }

  // Create a set of existing bug signatures for deduplication
  const existingSignatures = new Set(
    existingBugs.map(b => `${b.specFile}:${b.title.substring(0, 50)}`)
  );

  // Convert failures to pending bugs (with deduplication)
  const bugs: PendingBug[] = failures.map((failure, index) => {
    const priority = determinePriority(failure.category, failure.testName);
    const title = createTitle(failure.testName, failure.category);

    return {
      id: generateBugId(index),
      title,
      description: `Test failure in ${failure.suiteName}:\n\n${failure.error.substring(0, 500)}`,
      category: failure.category,
      priority,
      specFile: failure.specFile,
      error: failure.error.substring(0, 1000),
      replayCommand:
        failure.replayCommand ||
        (failure.seed
          ? `pnpm mega:qa --seed=${failure.seed}`
          : `pnpm playwright test ${failure.specFile}`),
      timestamp: new Date().toISOString(),
      approved: false,
      dismissed: false,
    };
  });

  // Filter out duplicates (same spec file + similar title)
  const newBugs = bugs.filter(bug => {
    const signature = `${bug.specFile}:${bug.title.substring(0, 50)}`;
    return !existingSignatures.has(signature);
  });

  // Merge with existing unapproved bugs
  const mergedBugs = [
    ...existingBugs.filter(b => !b.approved && !b.dismissed),
    ...newBugs,
  ];

  if (newBugs.length < bugs.length) {
    console.log(
      `ℹ️  Deduplicated ${bugs.length - newBugs.length} already-staged bugs`
    );
  }

  // Sort by priority
  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  mergedBugs.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  // Create pending bugs file
  const pendingBugsFile: PendingBugsFile = {
    generatedAt: new Date().toISOString(),
    runId: process.env.GITHUB_RUN_ID || "local",
    gitSha: process.env.GITHUB_SHA || "unknown",
    totalFailures: failures.length,
    bugs: mergedBugs,
  };

  // Write to file
  mkdirSync("qa-results", { recursive: true });
  writeFileSync(
    "qa-results/pending-bugs.json",
    JSON.stringify(pendingBugsFile, null, 2)
  );

  // Print summary
  console.log("📋 Pending Bugs Summary:");
  console.log("=".repeat(60));

  const highCount = mergedBugs.filter(b => b.priority === "HIGH").length;
  const mediumCount = mergedBugs.filter(b => b.priority === "MEDIUM").length;
  const lowCount = mergedBugs.filter(b => b.priority === "LOW").length;

  console.log(`   🔴 HIGH:   ${highCount}`);
  console.log(`   🟡 MEDIUM: ${mediumCount}`);
  console.log(`   🟢 LOW:    ${lowCount}`);
  console.log(`   📊 New this run: ${newBugs.length}`);
  console.log("");

  for (const bug of mergedBugs.slice(0, 10)) {
    const emoji =
      bug.priority === "HIGH" ? "🔴" : bug.priority === "MEDIUM" ? "🟡" : "🟢";
    console.log(`   ${emoji} ${bug.id}: ${bug.title}`);
  }

  if (mergedBugs.length > 10) {
    console.log(`   ... and ${mergedBugs.length - 10} more`);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log(
    `✅ Staged ${mergedBugs.length} bugs in qa-results/pending-bugs.json`
  );
  console.log("   Awaiting approval via Slack...");
}

main();
