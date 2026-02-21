#!/usr/bin/env node

import fs from "fs";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
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

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function getColumnIndex(header, columnName) {
  const index = header.indexOf(columnName);
  if (index === -1) {
    throw new Error(`Missing required column "${columnName}" in parity manifest`);
  }
  return index;
}

const [, , manifestPath, ...requiredRoutes] = process.argv;

if (!manifestPath) {
  console.error("Usage: node parity-manifest-report.mjs <manifest.csv> [required-route...]");
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(1);
}

const csvText = fs.readFileSync(manifestPath, "utf8");
const parsed = parseCsv(csvText);
if (parsed.length === 0) {
  console.error(`Manifest is empty: ${manifestPath}`);
  process.exit(1);
}

const header = parsed[0];
const records = parsed
  .slice(1)
  .filter(row => row.some(cell => (cell ?? "").trim().length > 0));

const routeIdx = getColumnIndex(header, "route");
const scopeIdx = getColumnIndex(header, "scope");
const unresolvedIdx = getColumnIndex(header, "unresolved");

const inScopeRecords = records.filter(
  row => (row[scopeIdx] ?? "").trim() === "in_scope"
);
const unresolvedInScope = inScopeRecords.filter(
  row => (row[unresolvedIdx] ?? "").trim().toLowerCase() === "true"
);
const presentRoutes = new Set(records.map(row => (row[routeIdx] ?? "").trim()));
const missingRequiredRoutes = requiredRoutes.filter(
  route => !presentRoutes.has(route)
);

process.stdout.write(
  JSON.stringify({
    inScopeCount: inScopeRecords.length,
    unresolvedInScopeCount: unresolvedInScope.length,
    missingRequiredRoutes,
  })
);
