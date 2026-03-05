#!/usr/bin/env bash
set -euo pipefail

# TERP Terminology Census (LEX-005)
# Bash-3 compatible wrapper around a deterministic Node scanner.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_JSON="false"
SUMMARY_ONLY="false"

for arg in "$@"; do
  case "$arg" in
    --json) OUTPUT_JSON="true" ;;
    --summary) SUMMARY_ONLY="true" ;;
  esac
done

node - "$REPO_ROOT" "$OUTPUT_JSON" "$SUMMARY_ONLY" <<'NODE'
const fs = require("fs");
const path = require("path");

const repoRoot = process.argv[2];
const outputJson = process.argv[3] === "true";
const summaryOnly = process.argv[4] === "true";

const version = "1.0.0";
const runDate = new Date().toISOString();

const terms = [
  ["Vendor", "Supplier", "party", /\bVendor\b/g],
  ["vendor", "Supplier", "party", /\bvendor\b/g],
  ["vendorId", "supplierClientId", "party", /\bvendorId\b/g],
  ["db.query.vendors", "clients with isSeller", "party", /db\.query\.vendors/g],

  ["Receiving", "Intake", "intake", /\bReceiving\b/g],
  ["receiving_session", "intake_session", "intake", /\breceiving[_-]session\b/g],
  ["DirectEntry", "Direct Intake", "intake", /\bDirectEntry\b/g],
  ["direct_entry", "direct_intake", "intake", /\bdirect[_-]entry\b/g],
  ["ManualIntake", "Direct Intake", "intake", /\bManualIntake\b/g],
  ["manual_intake", "direct_intake", "intake", /\bmanual[_-]intake\b/g],

  ["Estimate", "Quote", "sales", /\bEstimate\b/g],
  ["Sale (noun)", "Sales Order", "sales", /\bSale\b/g],
  ["Shipping (lifecycle)", "Fulfillment", "sales", /\bShipping\b/g],

  ["InventoryItem", "Batch", "product", /\bInventoryItem\b/g],
  ["inventory_item", "batch", "product", /\binventory[_-]item\b/g],

  ["Grower", "Farmer/Brand", "brand", /\bGrower\b/g],
  ["grower", "farmer/brand", "brand", /\bgrower\b/g]
];

const exemptPatterns = [
  "drizzle/schema.ts",
  "server/inventoryDb.ts",
  "server/routers/vendors.ts",
  "server/vendorContextDb.ts",
  "server/vendorSupplyDb.ts",
  "server/services/vendorMappingService.ts",
  "server/services/payablesService.ts",
  "client/src/components/vendors/",
  "client/src/lib/nomenclature.ts",
  "server/routers/intakeReceipts.ts",
  "server/routers/pricing.ts"
];

function walkTsFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "dist" || e.name === ".next") continue;
        stack.push(full);
      } else if (/\.(ts|tsx)$/.test(e.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

function isExempt(absFile) {
  const rel = path.relative(repoRoot, absFile).replace(/\\/g, "/");
  return exemptPatterns.some(p => rel.includes(p));
}

function countMatches(content, regex) {
  const re = new RegExp(regex.source, regex.flags);
  const matches = content.match(re);
  return matches ? matches.length : 0;
}

const scanFiles = [
  ...walkTsFiles(path.join(repoRoot, "client/src")),
  ...walkTsFiles(path.join(repoRoot, "server"))
].sort();

const counters = new Map();
for (const [term, canonical, family] of terms) {
  counters.set(term, {
    term,
    canonical,
    family,
    total: 0,
    exempt: 0,
    nonExempt: 0
  });
}

const fileHits = new Map();

for (const file of scanFiles) {
  const content = fs.readFileSync(file, "utf8");
  const exempt = isExempt(file);
  const perFile = [];

  for (const [term, _canonical, _family, regex] of terms) {
    const count = countMatches(content, regex);
    if (count === 0) continue;
    const c = counters.get(term);
    c.total += count;
    if (exempt) {
      c.exempt += count;
    } else {
      c.nonExempt += count;
      perFile.push({ term, count });
    }
  }

  if (perFile.length > 0) {
    fileHits.set(file, perFile);
  }
}

if (outputJson) {
  const results = [...counters.values()].map(v => ({
    deprecated_term: v.term,
    canonical_term: v.canonical,
    family: v.family,
    total_occurrences: v.total,
    exempt_occurrences: v.exempt,
    non_exempt_occurrences: v.nonExempt
  }));

  process.stdout.write(
    JSON.stringify(
      {
        script: "terminology-census",
        version,
        run_date: runDate,
        total_files_scanned: scanFiles.length,
        results
      },
      null,
      2
    ) + "\n"
  );
  process.exit(0);
}

const familyOrder = [
  ["party", "Party (Supplier vs Vendor)"],
  ["intake", "Intake (Intake vs Receiving)"],
  ["sales", "Sales (Order/Quote terminology)"],
  ["product", "Product (Batch vs InventoryItem)"],
  ["brand", "Brand (Farmer vs Grower)"]
];

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║           TERP Terminology Census Report                     ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log("");
console.log(`  Version : ${version}`);
console.log(`  Run Date: ${runDate}`);
console.log(`  Files   : ${scanFiles.length} TypeScript/TSX files scanned`);
console.log("");

let grandTotalNonExempt = 0;

for (const [family, label] of familyOrder) {
  console.log(`── ${label} ──────────────────────────────────────────`);
  for (const [term, canonical, fam] of terms) {
    if (fam !== family) continue;
    const c = counters.get(term);
    grandTotalNonExempt += c.nonExempt;
    const status = c.nonExempt > 0 ? "DRIFT" : "OK";
    const row = `${JSON.stringify(term).padEnd(30)} → ${JSON.stringify(canonical).padEnd(25)} [${status}] total=${String(c.total).padEnd(4)} exempt=${String(c.exempt).padEnd(4)} new_code=${String(c.nonExempt).padEnd(4)}`;
    console.log(`    ${row}`);
  }
  console.log("");
}

console.log("────────────────────────────────────────────────────────────────");
if (grandTotalNonExempt === 0) {
  console.log("  RESULT: CLEAN — No deprecated terms in non-exempt code");
} else {
  console.log(`  RESULT: ${grandTotalNonExempt} deprecated term occurrence(s) in non-exempt code`);
  console.log("          Run 'pnpm terminology:audit' for strict enforcement");
}
console.log("────────────────────────────────────────────────────────────────");
console.log("");

if (!summaryOnly && fileHits.size > 0) {
  console.log("FILES WITH DEPRECATED TERMS (non-exempt only):");
  console.log("");
  for (const file of [...fileHits.keys()].sort()) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
    console.log(`  ${rel}`);
    for (const hit of fileHits.get(file)) {
      const left = hit.term.padEnd(30);
      console.log(`    ${left} ${hit.count} occurrence(s)`);
    }
    console.log("");
  }
}
NODE
