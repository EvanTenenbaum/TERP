/**
 * Mega QA Bugpackager
 *
 * Converts Mega QA failures into roadmap-ready bug entries and prompt files.
 * Integrates with the existing QA pipeline.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { Failure, MegaQAReportBundle } from "./types";

const ROADMAP_FILE = "docs/roadmaps/MASTER_ROADMAP.md";
const PROMPTS_DIR = "docs/prompts";
const QA_RESULTS_DIR = "qa-results/mega-qa";

interface BugEntry {
  id: string;
  failure: Failure;
  entry: string;
  prompt: string;
}

/**
 * Get next available BUG-XXX ID from roadmap
 */
function getNextBugId(): string {
  if (!existsSync(ROADMAP_FILE)) {
    return "BUG-001";
  }

  const roadmap = readFileSync(ROADMAP_FILE, "utf-8");
  const matches = Array.from(roadmap.matchAll(/BUG-(\d+)/g));
  let maxId = 0;

  for (const match of matches) {
    const id = parseInt(match[1], 10);
    if (id > maxId) maxId = id;
  }

  return `BUG-${String(maxId + 1).padStart(3, "0")}`;
}

/**
 * Generate roadmap entry for a failure
 */
function generateRoadmapEntry(
  bugId: string,
  failure: Failure,
  runId: string
): string {
  const today = new Date().toISOString().split("T")[0];
  const shortError = failure.errorMessage.split("\n")[0].substring(0, 100);
  const classification = failure.classification.toUpperCase();

  return `
### ${bugId}: Mega QA Failure - ${failure.testName.substring(0, 50)}

**Status:** ready
**Priority:** ${failure.classification === "backend" ? "HIGH" : "MEDIUM"}
**Estimate:** 4-8h
**Module:** \`${failure.suite}\`
**Dependencies:** None
**Prompt:** \`docs/prompts/${bugId}.md\`
**Discovered:** ${today} (Mega QA Run: ${runId})

**Problem:** ${classification} failure in ${failure.suite}: "${failure.testName}"

**Error:** \`${shortError}\`

**Classification:** ${classification}

**Objectives:**

- Investigate the root cause of the ${classification.toLowerCase()} failure
- Fix the underlying bug
- Verify the test passes after the fix

**Deliverables:**

- [ ] Root cause identified and documented
- [ ] Bug fix implemented
- [ ] Test passes consistently (3 consecutive runs)
- [ ] No regression in related tests
- [ ] Code reviewed and merged

---
`;
}

/**
 * Generate prompt file for a failure
 */
function generatePromptFile(
  bugId: string,
  failure: Failure,
  runId: string
): string {
  const today = new Date().toISOString().split("T")[0];

  return `# ${bugId}: Mega QA Failure Fix

## Task Overview

**Bug ID:** ${bugId}
**Priority:** ${failure.classification === "backend" ? "HIGH" : "MEDIUM"}
**Estimate:** 4-8h
**Discovered:** ${today}
**Classification:** ${failure.classification.toUpperCase()}

## Problem Description

A Mega QA test failure was detected. This was discovered by the automated Mega QA pipeline.

**Test Name:** ${failure.testName}
**Suite:** ${failure.suite}
**Run ID:** ${runId}

## Error Details

\`\`\`
${failure.errorMessage}
\`\`\`

${failure.errorStack ? `### Stack Trace\n\`\`\`\n${failure.errorStack.substring(0, 1500)}\n\`\`\`` : ""}

## Replay Information

**Seed:** ${failure.replay.seed}
**Persona:** ${failure.replay.persona}

### Step Transcript

\`\`\`json
${JSON.stringify(failure.replay.steps.slice(-10), null, 2)}
\`\`\`

### URL History

${failure.replay.urlHistory
  .slice(-5)
  .map(url => `- ${url}`)
  .join("\n")}

### Replay Command

\`\`\`bash
${failure.replay.replayCommand}
\`\`\`

## Evidence

${failure.evidence.tracePath ? `- **Trace:** \`${failure.evidence.tracePath}\`` : ""}
${failure.evidence.screenshotPath ? `- **Screenshot:** \`${failure.evidence.screenshotPath}\`` : ""}

### Console Errors

${
  failure.evidence.consoleErrors.length > 0
    ? failure.evidence.consoleErrors
        .slice(0, 5)
        .map(e => `- ${e}`)
        .join("\n")
    : "None captured"
}

### Network Failures

${
  failure.evidence.networkFailures.length > 0
    ? failure.evidence.networkFailures
        .slice(0, 5)
        .map(
          f => `- ${f.method || "GET"} ${f.url}: ${f.status} ${f.error || ""}`
        )
        .join("\n")
    : "None captured"
}

## Implementation Guide

1. **Reproduce the failure locally:**
   \`\`\`bash
   pnpm mega:qa --seed=${failure.replay.seed}
   \`\`\`

2. **Check the evidence artifacts:**
   - Open the trace file in Playwright's trace viewer
   - Review the screenshot at the failure point

3. **Identify the root cause:**
   - Is it a frontend bug?
   - Is it a backend bug?
   - Is it a test/seed data issue?
   - Is it an environment issue?

4. **Implement the fix**

5. **Verify the fix:**
   \`\`\`bash
   pnpm mega:qa --seed=${failure.replay.seed} --journeys=10
   \`\`\`

## Acceptance Criteria

- [ ] Test passes consistently (3 consecutive runs with same seed)
- [ ] Root cause documented in commit message
- [ ] No regression in related tests
- [ ] No new TypeScript errors
`;
}

/**
 * Load Mega QA report bundle
 */
function loadReportBundle(runIdOrPath: string): MegaQAReportBundle | null {
  let bundlePath: string;

  if (runIdOrPath.includes("/")) {
    bundlePath = runIdOrPath;
  } else {
    bundlePath = join(QA_RESULTS_DIR, runIdOrPath, "bundle.json");
  }

  if (!existsSync(bundlePath)) {
    // Try latest
    const latestPath = join(QA_RESULTS_DIR, "latest", "bundle.json");
    if (existsSync(latestPath)) {
      bundlePath = latestPath;
    } else {
      console.error(`❌ Report bundle not found: ${bundlePath}`);
      return null;
    }
  }

  return JSON.parse(readFileSync(bundlePath, "utf-8"));
}

/**
 * Package failures into bug entries
 */
export function packageFailures(bundle: MegaQAReportBundle): BugEntry[] {
  const bugs: BugEntry[] = [];

  // Only package new failures (not known ones)
  const newFailures = bundle.failures.filter(f => !f.isKnown);

  for (const failure of newFailures) {
    const bugId = getNextBugId();
    const entry = generateRoadmapEntry(bugId, failure, bundle.manifest.runId);
    const prompt = generatePromptFile(bugId, failure, bundle.manifest.runId);

    bugs.push({ id: bugId, failure, entry, prompt });
  }

  return bugs;
}

/**
 * Write bugs to roadmap and create prompt files
 */
export function writeBugs(bugs: BugEntry[]): void {
  if (bugs.length === 0) {
    console.log("✅ No new failures to package");
    return;
  }

  // Create prompts directory if needed
  if (!existsSync(PROMPTS_DIR)) {
    mkdirSync(PROMPTS_DIR, { recursive: true });
  }

  // Write prompt files
  for (const bug of bugs) {
    const promptPath = join(PROMPTS_DIR, `${bug.id}.md`);
    writeFileSync(promptPath, bug.prompt);
    console.log(`📄 Created prompt: ${promptPath}`);
  }

  // Append to roadmap
  if (existsSync(ROADMAP_FILE)) {
    let roadmap = readFileSync(ROADMAP_FILE, "utf-8");
    const qaSection = "## 🤖 Automated QA Discoveries";

    if (!roadmap.includes(qaSection)) {
      // Find insertion point (after active tasks section)
      const insertPoint = roadmap.indexOf("\n## ") || roadmap.length;
      roadmap =
        roadmap.slice(0, insertPoint) +
        `\n${qaSection}\n\nBugs discovered by the Mega QA pipeline.\n\n---\n` +
        roadmap.slice(insertPoint);
    }

    // Find the QA section and append bugs
    const sectionStart = roadmap.indexOf(qaSection);
    const sectionEnd = roadmap.indexOf(
      "\n## ",
      sectionStart + qaSection.length
    );
    const insertAt = sectionEnd > 0 ? sectionEnd : roadmap.length;

    const bugEntries = bugs.map(b => b.entry).join("\n");
    roadmap =
      roadmap.slice(0, insertAt) + "\n" + bugEntries + roadmap.slice(insertAt);

    writeFileSync(ROADMAP_FILE, roadmap);
    console.log(`📝 Added ${bugs.length} bugs to roadmap`);
  }
}

/**
 * Print bug summary
 */
export function printBugSummary(bugs: BugEntry[]): void {
  console.log("\n" + "=".repeat(60));
  console.log("🐛 MEGA QA BUG PACKAGING SUMMARY");
  console.log("=".repeat(60));
  console.log("");
  console.log(`Total new failures: ${bugs.length}`);
  console.log("");

  for (const bug of bugs) {
    console.log(`  ${bug.id}: ${bug.failure.testName.substring(0, 50)}`);
    console.log(`           Classification: ${bug.failure.classification}`);
    console.log(`           Suite: ${bug.failure.suite}`);
    console.log("");
  }

  console.log("=".repeat(60));
  console.log("");
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const runId = process.argv[2] || "latest";

  console.log(`\n📦 Packaging failures from: ${runId}\n`);

  const bundle = loadReportBundle(runId);

  if (bundle) {
    const bugs = packageFailures(bundle);
    printBugSummary(bugs);
    writeBugs(bugs);
    console.log("✅ Bug packaging complete\n");
  } else {
    process.exit(1);
  }
}
