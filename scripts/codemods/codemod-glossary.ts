#!/usr/bin/env tsx
/**
 * TER-1315 — Glossary codemod
 *
 * Rewrites non-canonical TERP terminology to the canonical forms defined in
 * `client/src/config/glossary.ts`. Closes the T-15 "terminology inconsistency"
 * findings from `docs/ux-review/02-Implementation_Strategy.md §4.12`.
 *
 * Replacements (exact, case-sensitive):
 *
 *   "Sales Order"     → "Order"
 *   "Vendor Invoice"  → "Invoice"
 *   "Inventory Line"  → "SKU"
 *   "Customer"        → "Client"
 *   "Buyer"           → "Client"
 *   "Item"            → "SKU"
 *
 * Scope & safety:
 *
 *   - Scans `client/src/**\/*.tsx` only (server code, scripts, tests, and
 *     story files are skipped).
 *   - ONLY modifies JSX text content. Import specifiers, identifiers, type
 *     names, and non-JSX string literals are left untouched.
 *   - Uses ts-morph (already installed) so replacements are AST-aware rather
 *     than fragile regex passes over source text.
 *
 * Excluded paths (never modified):
 *
 *   - `client/src/config/glossary.ts` (the mapping itself)
 *   - `*.test.tsx` / `*.spec.tsx`
 *   - `*.stories.tsx`
 *
 * Usage:
 *
 *   pnpm codemod:glossary --dry-run   # report only (no writes)
 *   pnpm codemod:glossary             # apply changes in place
 *
 * Exit code is `0` regardless of how many files changed — this is a refactor
 * tool, not a gate. The companion ESLint rule `terp/no-restricted-glossary`
 * is what fails CI if the tree regresses.
 */

import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { Node, Project, SyntaxKind } from "ts-morph";
import type { JsxText, SourceFile } from "ts-morph";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");

/**
 * Forbidden → canonical mapping. Kept in lockstep with
 * `client/src/config/glossary.ts` and
 * `eslint-rules/rules/no-restricted-glossary.js`.
 */
const FORBIDDEN_TERMS: Record<string, string> = {
  "Sales Order": "Order",
  "Vendor Invoice": "Invoice",
  "Inventory Line": "SKU",
  Customer: "Client",
  Buyer: "Client",
  Item: "SKU",
};

/** Longest keys first so multi-word phrases replace before their substrings. */
const FORBIDDEN_KEYS = Object.keys(FORBIDDEN_TERMS).sort(
  (a, b) => b.length - a.length,
);

/**
 * Multi-word phrases use a plain exact match; single-word synonyms use a
 * word-boundary-aware regex so "Items" → "SKUs" but "ItemGroup" stays put.
 * Compile once per key for efficiency.
 */
interface ReplacePattern {
  term: string;
  replacement: string;
  regex: RegExp;
}

const PATTERNS: ReplacePattern[] = FORBIDDEN_KEYS.map((term) => {
  const replacement = FORBIDDEN_TERMS[term];
  // Escape regex metacharacters in the term (none today, but future-proof).
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (term.includes(" ")) {
    return { term, replacement, regex: new RegExp(escaped, "g") };
  }
  // Left side: string start or a non-identifier char so we don't match
  // "ItemGroup" / "SubItem". Right side: any chars — plurals like
  // "Customers" → "Clients" are desirable.
  return {
    term,
    replacement,
    regex: new RegExp(`(^|[^A-Za-z0-9_])${escaped}`, "g"),
  };
});

function rewrite(text: string): { text: string; hits: Record<string, number> } {
  let out = text;
  const hits: Record<string, number> = {};
  for (const { term, replacement, regex } of PATTERNS) {
    let count = 0;
    out = out.replace(regex, (match, prefix: string | undefined) => {
      count += 1;
      if (term.includes(" ")) return replacement;
      return `${prefix ?? ""}${replacement}`;
    });
    if (count > 0) hits[term] = count;
  }
  return { text: out, hits };
}

function isExcluded(filePath: string): boolean {
  const normalized = filePath.split("\\").join("/");
  if (normalized.endsWith("/client/src/config/glossary.ts")) return true;
  if (/\.(test|spec)\.tsx?$/.test(normalized)) return true;
  if (/\.stories\.tsx?$/.test(normalized)) return true;
  return false;
}

interface FileDiff {
  path: string;
  hits: Record<string, number>;
  changes: Array<{ before: string; after: string }>;
}

function processSourceFile(source: SourceFile): FileDiff | null {
  const path = source.getFilePath();
  if (isExcluded(path)) return null;

  const changes: Array<{ before: string; after: string }> = [];
  const totalHits: Record<string, number> = {};

  // Collect all JSX text nodes up-front. Mutating the AST while iterating
  // ts-morph descendants is unreliable.
  const jsxTexts = source
    .getDescendantsOfKind(SyntaxKind.JsxText)
    .filter((node): node is JsxText => Node.isJsxText(node));

  for (const node of jsxTexts) {
    const before = node.getText();
    const { text: after, hits } = rewrite(before);
    if (after === before) continue;

    for (const [term, count] of Object.entries(hits)) {
      totalHits[term] = (totalHits[term] ?? 0) + count;
    }
    changes.push({ before, after });
    node.replaceWithText(after);
  }

  if (changes.length === 0) return null;
  return { path, hits: totalHits, changes };
}

function printDiff(diff: FileDiff): void {
  const rel = relative(repoRoot, diff.path);
  // eslint-disable-next-line no-console
  console.log(`\n📝 ${rel}`);
  for (const [term, count] of Object.entries(diff.hits)) {
    // eslint-disable-next-line no-console
    console.log(`  - "${term}" → "${FORBIDDEN_TERMS[term]}" (${count})`);
  }
}

interface RunSummary {
  scanned: number;
  changed: number;
  totalHits: Record<string, number>;
}

function summarize(diffs: FileDiff[], scanned: number): RunSummary {
  const totalHits: Record<string, number> = {};
  for (const diff of diffs) {
    for (const [term, count] of Object.entries(diff.hits)) {
      totalHits[term] = (totalHits[term] ?? 0) + count;
    }
  }
  return { scanned, changed: diffs.length, totalHits };
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  // eslint-disable-next-line no-console
  console.log("📖 TER-1315: Glossary codemod");
  // eslint-disable-next-line no-console
  console.log("=============================");
  // eslint-disable-next-line no-console
  console.log(dryRun ? "🔍 DRY RUN (no files will be written)\n" : "✨ LIVE MODE\n");

  const project = new Project({
    tsConfigFilePath: join(repoRoot, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
  });

  // Only .tsx files carry JSX. Skip .ts / .d.ts intentionally.
  project.addSourceFilesAtPaths(join(repoRoot, "client/src/**/*.tsx"));

  const sourceFiles = project.getSourceFiles();
  // eslint-disable-next-line no-console
  console.log(`Scanning ${sourceFiles.length} .tsx files under client/src …\n`);

  const diffs: FileDiff[] = [];
  for (const source of sourceFiles) {
    const diff = processSourceFile(source);
    if (diff) diffs.push(diff);
  }

  for (const diff of diffs) {
    printDiff(diff);
  }

  const summary = summarize(diffs, sourceFiles.length);

  // eslint-disable-next-line no-console
  console.log("\n" + "=".repeat(56));
  // eslint-disable-next-line no-console
  console.log(
    `📊 Summary: ${summary.changed}/${summary.scanned} files would change`,
  );
  for (const [term, count] of Object.entries(summary.totalHits)) {
    // eslint-disable-next-line no-console
    console.log(
      `   "${term}" → "${FORBIDDEN_TERMS[term]}" — ${count} replacement(s)`,
    );
  }

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log("\n💡 Run without --dry-run to apply changes.");
    return;
  }

  if (summary.changed === 0) {
    // eslint-disable-next-line no-console
    console.log("\n✅ No changes needed — tree already canonical.");
    return;
  }

  project.saveSync();
  // eslint-disable-next-line no-console
  console.log(
    `\n✅ Wrote ${summary.changed} file(s). Follow-up:`,
  );
  // eslint-disable-next-line no-console
  console.log("   1. Review with `git diff`.");
  // eslint-disable-next-line no-console
  console.log(
    "   2. Verify `pnpm check && pnpm lint --config eslint.config.strict.js`.",
  );
}

main();
