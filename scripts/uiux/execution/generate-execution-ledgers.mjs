#!/usr/bin/env node

import fs from "fs";
import path from "path";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char === "\r") continue;
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function asRecord(header, row) {
  const out = {};
  for (let i = 0; i < header.length; i += 1) {
    out[header[i]] = row[i] ?? "";
  }
  return out;
}

function statusFromRow(row) {
  if (row.scope !== "in_scope") return "EXCLUDED";
  if ((row.unresolved ?? "").toLowerCase() === "true") return "FAILED";
  return "PENDING";
}

function mdCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

const root = process.cwd();
const manifestPath = path.join(
  root,
  "docs/uiux-redesign/P0_CANONICAL_PARITY_MANIFEST.csv"
);
const outputDir = path.join(root, "docs/uiux-redesign/execution");

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing parity manifest: ${manifestPath}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const parsed = parseCsv(fs.readFileSync(manifestPath, "utf8"));
if (parsed.length < 2) {
  console.error("Parity manifest has no data rows.");
  process.exit(1);
}

const header = parsed[0];
const rows = parsed
  .slice(1)
  .filter(row => row.some(cell => (cell ?? "").trim().length > 0))
  .map(row => asRecord(header, row));

const abilityLines = [
  "# Ability Ledger",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "Legend: `PENDING` = not verified in execution wave yet, `EXCLUDED` = out-of-scope redesign path, `FAILED` = unresolved mapping",
  "",
  "| Route | Ability | Feature IDs | Scope | Status | Unresolved | Evidence Path | Notes |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
];

for (const row of rows) {
  const ability = row.feature_names || row.source || "N/A";
  const notes = row.notes || "";
  abilityLines.push(
    `| ${mdCell(row.route)} | ${mdCell(ability)} | ${mdCell(row.feature_ids || "")} | ${mdCell(row.scope)} | ${mdCell(statusFromRow(row))} | ${mdCell(row.unresolved || "")} |  | ${mdCell(notes)} |`
  );
}

fs.writeFileSync(
  path.join(outputDir, "ABILITY_LEDGER.md"),
  abilityLines.join("\n") + "\n",
  "utf8"
);

const groupMap = new Map();
let inScopeTotal = 0;
let unresolvedInScope = 0;
let excludedTotal = 0;

for (const row of rows) {
  const group = row.navigation_group || row.workspace || "ungrouped";
  if (!groupMap.has(group)) {
    groupMap.set(group, { inScope: 0, verified: 0, left: 0, unresolved: 0 });
  }
  const entry = groupMap.get(group);

  if (row.scope === "in_scope") {
    inScopeTotal += 1;
    entry.inScope += 1;
    entry.left += 1;
    if ((row.unresolved || "").toLowerCase() === "true") {
      unresolvedInScope += 1;
      entry.unresolved += 1;
    }
  } else {
    excludedTotal += 1;
  }
}

const doneVsLeftLines = [
  "# Done vs Left",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `In-scope total: ${inScopeTotal}`,
  `Unresolved in-scope: ${unresolvedInScope}`,
  `Excluded total: ${excludedTotal}`,
  "",
  "| Route Family | In Scope | Verified | Left | Unresolved |",
  "| --- | ---: | ---: | ---: | ---: |",
];

for (const [group, counts] of [...groupMap.entries()].sort(([a], [b]) =>
  a.localeCompare(b)
)) {
  doneVsLeftLines.push(
    `| ${group} | ${counts.inScope} | ${counts.verified} | ${counts.left} | ${counts.unresolved} |`
  );
}

fs.writeFileSync(
  path.join(outputDir, "DONE_VS_LEFT.md"),
  doneVsLeftLines.join("\n") + "\n",
  "utf8"
);

const evidenceIndex = {
  generatedAt: new Date().toISOString(),
  sourceManifest: "docs/uiux-redesign/P0_CANONICAL_PARITY_MANIFEST.csv",
  abilities: rows.map(row => ({
    route: row.route,
    featureIds: row.feature_ids || "",
    scope: row.scope,
    status: statusFromRow(row),
    evidencePath: null,
  })),
  phaseGates: [],
  parEntries: [],
  northStarEntries: [],
  adversarialFindings: [],
};

fs.writeFileSync(
  path.join(outputDir, "EVIDENCE_INDEX.json"),
  JSON.stringify(evidenceIndex, null, 2) + "\n",
  "utf8"
);

console.log(`Updated execution ledgers in ${outputDir}`);
