/**
 * Mega QA Coverage Contract
 *
 * This module is imported by `scripts/mega-qa/index.ts` and must exist for the
 * runner to function. It defines a small required tag set and a coverage gate.
 *
 * NOTE: This is intentionally minimal; expand as coverage tagging matures.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { CoverageReport, CoverageTag } from "../types";

const QA_RESULTS_DIR = "qa-results/mega-qa";
const REQUIRED_TAGS_OUTPUT = join(QA_RESULTS_DIR, "required-tags.json");
const WAIVERS_PATH = "scripts/mega-qa/coverage/waivers.json";

const REQUIRED_TAGS: CoverageTag[] = [
  // Interaction protocol tags (examples)
  { id: "TS-001", category: "ts-protocol", description: "Core protocol 001", required: true },
  { id: "TS-002", category: "ts-protocol", description: "Core protocol 002", required: true },
  { id: "TS-1.1", category: "ts-protocol", description: "Protocol 1.1", required: true },
  { id: "TS-2.1", category: "ts-protocol", description: "Protocol 2.1", required: true },
  { id: "TS-11.1", category: "ts-protocol", description: "Protocol 11.1", required: true },

  // Route tags
  { id: "route:/login", category: "route", description: "Login route loads", required: true },
  {
    id: "route:/dashboard",
    category: "route",
    description: "Dashboard route loads",
    required: true,
  },
  { id: "route:/orders", category: "route", description: "Orders route loads", required: true },
  { id: "route:/clients", category: "route", description: "Clients route loads", required: true },
  {
    id: "route:/inventory",
    category: "route",
    description: "Inventory route loads",
    required: true,
  },

  // API tags
  { id: "api:auth.login", category: "api", description: "Auth login works", required: true },
  { id: "api:auth.me", category: "api", description: "Auth me works", required: true },
  {
    id: "api:orders.list",
    category: "api",
    description: "Orders list procedure works",
    required: true,
  },
  {
    id: "api:clients.list",
    category: "api",
    description: "Clients list procedure works",
    required: true,
  },
  {
    id: "api:batches.list",
    category: "api",
    description: "Batches list procedure works",
    required: true,
  },

  // Regression tags
  { id: "regression:cmd-k", category: "regression", description: "Cmd+K works", required: true },
  {
    id: "regression:theme-toggle",
    category: "regression",
    description: "Theme toggle works",
    required: true,
  },
  {
    id: "regression:no-spinner",
    category: "regression",
    description: "No infinite spinner regression",
    required: true,
  },
  {
    id: "regression:layout-consistency",
    category: "regression",
    description: "Layout consistency regression check",
    required: true,
  },
];

function readWaivers(): Array<{ tagId: string; rationale: string }> {
  if (!existsSync(WAIVERS_PATH)) return [];
  try {
    const raw = readFileSync(WAIVERS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (w): w is { tagId: string; rationale: string } =>
          !!w &&
          typeof w === "object" &&
          "tagId" in w &&
          "rationale" in w &&
          typeof (w as { tagId?: unknown }).tagId === "string" &&
          typeof (w as { rationale?: unknown }).rationale === "string"
      )
      .map(w => ({ tagId: w.tagId, rationale: w.rationale }));
  } catch {
    return [];
  }
}

export function writeRequiredTagsFile(): void {
  mkdirSync(QA_RESULTS_DIR, { recursive: true });
  writeFileSync(REQUIRED_TAGS_OUTPUT, JSON.stringify(REQUIRED_TAGS, null, 2));
}

export function calculateCoverage(coveredTags: string[]): CoverageReport {
  const coveredSet = new Set((coveredTags ?? []).filter(Boolean));
  const waivers = readWaivers();
  const waivedIds = new Set(waivers.map(w => w.tagId));

  const required = REQUIRED_TAGS.filter(t => t.required);
  const requiredIds = required.map(t => t.id);

  const missing = requiredIds.filter(id => !coveredSet.has(id) && !waivedIds.has(id));
  const coveredRequiredCount = requiredIds.filter(
    id => coveredSet.has(id) || waivedIds.has(id)
  ).length;

  const coveragePercent =
    requiredIds.length === 0 ? 100 : (coveredRequiredCount / requiredIds.length) * 100;

  return {
    required,
    covered: Array.from(coveredSet),
    missing,
    waivers,
    coveragePercent,
    passed: missing.length === 0,
  };
}

export function printCoverageReport(coverage: CoverageReport): void {
  console.log("\n📊 COVERAGE REPORT");
  console.log("-".repeat(60));
  console.log(`Required tags: ${coverage.required.length}`);
  console.log(`Covered tags:  ${coverage.covered.length}`);
  console.log(`Coverage:      ${coverage.coveragePercent.toFixed(1)}%`);
  console.log(`Gate:          ${coverage.passed ? "✅ PASS" : "❌ FAIL"}`);
  if (!coverage.passed) {
    console.log("\nMissing required tags:");
    for (const id of coverage.missing) console.log(`  - ${id}`);
  }
  console.log("-".repeat(60));
}

/**
 * Mega QA Coverage Contract
 *
 * Minimal implementation to support `scripts/mega-qa/index.ts`.
 * This defines a required tag set, optional waivers, and helpers to:
 * - write a machine-readable required-tags file
 * - calculate coverage and enforce the coverage gate
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { CoverageReport, CoverageTag } from "../types";

const QA_RESULTS_DIR = "qa-results/mega-qa";
const REQUIRED_TAGS_OUTPUT = join(QA_RESULTS_DIR, "required-tags.json");
const WAIVERS_PATH = "scripts/mega-qa/coverage/waivers.json";

// NOTE: Keep this small + stable. It can be expanded as Mega QA matures.
const REQUIRED_TAGS: CoverageTag[] = [
  // Interaction protocol tags (examples)
  { id: "TS-001", category: "ts-protocol", description: "Core protocol 001", required: true },
  { id: "TS-002", category: "ts-protocol", description: "Core protocol 002", required: true },
  { id: "TS-1.1", category: "ts-protocol", description: "Protocol 1.1", required: true },
  { id: "TS-2.1", category: "ts-protocol", description: "Protocol 2.1", required: true },
  { id: "TS-11.1", category: "ts-protocol", description: "Protocol 11.1", required: true },

  // Route tags
  { id: "route:/login", category: "route", description: "Login route loads", required: true },
  {
    id: "route:/dashboard",
    category: "route",
    description: "Dashboard route loads",
    required: true,
  },
  { id: "route:/orders", category: "route", description: "Orders route loads", required: true },
  { id: "route:/clients", category: "route", description: "Clients route loads", required: true },
  {
    id: "route:/inventory",
    category: "route",
    description: "Inventory route loads",
    required: true,
  },

  // API tags
  { id: "api:auth.login", category: "api", description: "Auth login works", required: true },
  { id: "api:auth.me", category: "api", description: "Auth me works", required: true },
  {
    id: "api:orders.list",
    category: "api",
    description: "Orders list procedure works",
    required: true,
  },
  {
    id: "api:clients.list",
    category: "api",
    description: "Clients list procedure works",
    required: true,
  },
  {
    id: "api:batches.list",
    category: "api",
    description: "Batches list procedure works",
    required: true,
  },

  // Regression tags
  { id: "regression:cmd-k", category: "regression", description: "Cmd+K works", required: true },
  {
    id: "regression:theme-toggle",
    category: "regression",
    description: "Theme toggle works",
    required: true,
  },
  {
    id: "regression:no-spinner",
    category: "regression",
    description: "No infinite spinner regression",
    required: true,
  },
  {
    id: "regression:layout-consistency",
    category: "regression",
    description: "Layout consistency regression check",
    required: true,
  },
];

function readWaivers(): Array<{ tagId: string; rationale: string }> {
  if (!existsSync(WAIVERS_PATH)) return [];
  try {
    const raw = readFileSync(WAIVERS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (w): w is { tagId: string; rationale: string } =>
          !!w &&
          typeof w === "object" &&
          "tagId" in w &&
          "rationale" in w &&
          typeof (w as { tagId?: unknown }).tagId === "string" &&
          typeof (w as { rationale?: unknown }).rationale === "string"
      )
      .map(w => ({ tagId: w.tagId, rationale: w.rationale }));
  } catch {
    return [];
  }
}

export function writeRequiredTagsFile(): void {
  mkdirSync(QA_RESULTS_DIR, { recursive: true });
  writeFileSync(REQUIRED_TAGS_OUTPUT, JSON.stringify(REQUIRED_TAGS, null, 2));
}

export function calculateCoverage(coveredTags: string[]): CoverageReport {
  const coveredSet = new Set((coveredTags ?? []).filter(Boolean));
  const waivers = readWaivers();
  const waivedIds = new Set(waivers.map(w => w.tagId));

  const required = REQUIRED_TAGS.filter(t => t.required);
  const requiredIds = required.map(t => t.id);

  const missing = requiredIds.filter(id => !coveredSet.has(id) && !waivedIds.has(id));
  const coveredRequiredCount = requiredIds.filter(
    id => coveredSet.has(id) || waivedIds.has(id)
  ).length;

  const coveragePercent =
    requiredIds.length === 0 ? 100 : (coveredRequiredCount / requiredIds.length) * 100;

  return {
    required,
    covered: Array.from(coveredSet),
    missing,
    waivers,
    coveragePercent,
    passed: missing.length === 0,
  };
}

export function printCoverageReport(coverage: CoverageReport): void {
  console.log("\n📊 COVERAGE REPORT");
  console.log("-".repeat(60));
  console.log(`Required tags: ${coverage.required.length}`);
  console.log(`Covered tags:  ${coverage.covered.length}`);
  console.log(`Coverage:      ${coverage.coveragePercent.toFixed(1)}%`);
  console.log(`Gate:          ${coverage.passed ? "✅ PASS" : "❌ FAIL"}`);
  if (!coverage.passed) {
    console.log("\nMissing required tags:");
    for (const id of coverage.missing) console.log(`  - ${id}`);
  }
  console.log("-".repeat(60));
}

