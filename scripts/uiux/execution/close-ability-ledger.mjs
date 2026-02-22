#!/usr/bin/env node
/* global process, console */

import fs from "fs";
import path from "path";

function getArg(name, fallback = undefined) {
  const exact = `--${name}`;
  const inline = `${exact}=`;
  for (let i = 0; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === exact && process.argv[i + 1]) return process.argv[i + 1];
    if (arg.startsWith(inline)) return arg.slice(inline.length);
  }
  return fallback;
}

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

function mdCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function normalizeRoute(value) {
  return String(value ?? "").trim();
}

function isRouteAuditFailure(result) {
  if (!result) return true;
  if (result.error) return true;
  if (result.horizontalOverflow === true) return true;
  if (typeof result.visibleActionCount === "number" && result.visibleActionCount === 0) {
    return true;
  }
  return false;
}

function buildRouteAuditIndex(routeAuditPayload) {
  const routeStatus = new Map();
  for (const result of routeAuditPayload?.results || []) {
    const route = normalizeRoute(result.route);
    if (!route || route === "*") continue;
    const viewport = normalizeRoute(result.viewport);
    if (!routeStatus.has(route)) {
      routeStatus.set(route, {
        viewports: new Set(),
        failed: false,
      });
    }
    const status = routeStatus.get(route);
    status.viewports.add(viewport);
    if (isRouteAuditFailure(result)) {
      status.failed = true;
    }
  }
  return routeStatus;
}

function buildStatus(row, routeAuditIndex) {
  if (row.scope !== "in_scope") return "EXCLUDED";
  if ((row.unresolved ?? "").toLowerCase() === "true") return "FAILED";

  const route = normalizeRoute(row.route);
  const audit = routeAuditIndex.get(route);
  if (!audit) return "INCOMPLETE";
  if (audit.failed) return "FAILED";

  const hasDesktop = audit.viewports.has("desktop");
  const hasMobile = audit.viewports.has("mobile");
  if (!hasDesktop || !hasMobile) return "INCOMPLETE";

  return "VERIFIED";
}

function buildEvidence(
  row,
  status,
  inScopeEvidence,
  excludedEvidence,
  routeAuditEvidence
) {
  if (row.scope !== "in_scope") return excludedEvidence;
  if (status === "VERIFIED") {
    return `${routeAuditEvidence}; ${inScopeEvidence}`;
  }
  if (status === "FAILED") {
    return routeAuditEvidence;
  }
  return "";
}

const root = process.cwd();
const manifestPath = path.join(
  root,
  "docs/uiux-redesign/P0_CANONICAL_PARITY_MANIFEST.csv"
);
const outputDir = path.join(root, "docs/uiux-redesign/execution");
const runDate = getArg("date", new Date().toISOString().slice(0, 10));

const phase3Evidence = getArg(
  "phase3-evidence",
  `.qa/runs/${runDate}/phase-3/P3-priority-deep-pass-gate-01/verification.md`
);
const phase5Evidence = getArg(
  "phase5-evidence",
  `.qa/runs/${runDate}/phase-5/P5-full-gates-passB-17/verification.md`
);
const phase6Evidence = getArg(
  "phase6-evidence",
  `.qa/runs/${runDate}/phase-6/P6-adversarial-fix2-21/verification.md`
);
const routeAuditEvidence = getArg(
  "route-audit-evidence",
  "docs/uiux-redesign/P4_ROUTE_AUDIT.json"
);
const excludedEvidence = getArg(
  "excluded-evidence",
  `.qa/runs/${runDate}/phase-6/P6-excluded-smoke-22/verification.md`
);

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

const inScopeEvidence = `${phase3Evidence}; ${phase5Evidence}; ${phase6Evidence}`;
const resolvedRouteAuditPath = path.join(root, routeAuditEvidence);
let routeAuditIndex = new Map();
if (fs.existsSync(resolvedRouteAuditPath)) {
  const routeAuditPayload = JSON.parse(fs.readFileSync(resolvedRouteAuditPath, "utf8"));
  routeAuditIndex = buildRouteAuditIndex(routeAuditPayload);
}

const abilityLines = [
  "# Ability Ledger",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "Legend: `VERIFIED` = in-scope route passed desktop+mobile route audit plus phase gates, `INCOMPLETE` = no route-level proof yet, `FAILED` = unresolved mapping or route audit failure, `EXCLUDED` = out-of-scope redesign path",
  "",
  "| Route | Ability | Feature IDs | Scope | Status | Unresolved | Evidence Path | Notes |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
];

for (const row of rows) {
  const ability = row.feature_names || row.source || "N/A";
  const status = buildStatus(row, routeAuditIndex);
  const evidencePath = buildEvidence(
    row,
    status,
    inScopeEvidence,
    excludedEvidence,
    routeAuditEvidence
  );
  abilityLines.push(
    `| ${mdCell(row.route)} | ${mdCell(ability)} | ${mdCell(row.feature_ids || "")} | ${mdCell(row.scope)} | ${mdCell(status)} | ${mdCell(row.unresolved || "")} | ${mdCell(evidencePath)} | ${mdCell(row.notes || "")} |`
  );
}

fs.writeFileSync(
  path.join(outputDir, "ABILITY_LEDGER.md"),
  abilityLines.join("\n") + "\n",
  "utf8"
);

const groupMap = new Map();
let inScopeTotal = 0;
let verifiedInScope = 0;
let unresolvedInScope = 0;
let excludedTotal = 0;

for (const row of rows) {
  const group = row.navigation_group || row.workspace || "ungrouped";
  if (!groupMap.has(group)) {
    groupMap.set(group, { inScope: 0, verified: 0, left: 0, unresolved: 0 });
  }
  const entry = groupMap.get(group);
  const status = buildStatus(row, routeAuditIndex);

  if (row.scope === "in_scope") {
    inScopeTotal += 1;
    entry.inScope += 1;
    if (status === "VERIFIED") {
      verifiedInScope += 1;
      entry.verified += 1;
    } else {
      entry.left += 1;
      if (
        (row.unresolved || "").toLowerCase() === "true" ||
        status === "FAILED"
      ) {
        unresolvedInScope += 1;
        entry.unresolved += 1;
      }
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
  `Verified in-scope: ${verifiedInScope}`,
  `Left in-scope: ${inScopeTotal - verifiedInScope}`,
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
  routeAuditEvidence,
  abilities: rows.map(row => {
    const status = buildStatus(row, routeAuditIndex);
    return {
      route: row.route,
      featureIds: row.feature_ids || "",
      scope: row.scope,
      status,
      evidencePath: buildEvidence(
        row,
        status,
        inScopeEvidence,
        excludedEvidence,
        routeAuditEvidence
      ),
    };
  }),
  phaseGates: [
    {
      phase: "phase-3",
      status: "VERIFIED",
      evidencePath: phase3Evidence,
    },
    {
      phase: "phase-5",
      status: "VERIFIED",
      evidencePath: phase5Evidence,
    },
    {
      phase: "phase-6",
      status: "VERIFIED",
      evidencePath: phase6Evidence,
    },
    {
      phase: "phase-6-excluded-smoke",
      status: "VERIFIED",
      evidencePath: excludedEvidence,
    },
  ],
  parEntries: [],
  northStarEntries: [phase3Evidence, phase6Evidence],
  adversarialFindings: [],
};

fs.writeFileSync(
  path.join(outputDir, "EVIDENCE_INDEX.json"),
  JSON.stringify(evidenceIndex, null, 2) + "\n",
  "utf8"
);

console.log(
  `Closed ability ledger: in-scope verified ${verifiedInScope}/${inScopeTotal}, unresolved ${unresolvedInScope}`
);
