#!/usr/bin/env tsx
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

type RouteRow = {
  route: string;
  source: string;
  isRedirect: boolean;
  inNavigation: boolean;
  navigationName: string;
  navigationGroup: string;
  workspace: string;
  notes: string;
};

type FeatureRow = {
  id: string;
  name: string;
  routePatterns: string[];
  priority: string;
  status: string;
};

type CoverageRow = {
  type: string;
  id: string;
  name: string;
  ownerModule: string;
  intentSource: string;
  status: string;
  implementationSource: string;
  notes: string;
};

const EXCLUDED_FEATURE_IDS = new Set([
  "DF-005",
  "DF-016",
  "DF-072",
  "DF-073",
  "DF-074",
]);

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      row.push(current);
      current = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") continue;
      if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function escapeCsv(value: string | boolean) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseRouteRows(csv: string): RouteRow[] {
  const rows = parseCsv(csv);
  const [header, ...data] = rows;
  const idx = (name: string) => header.indexOf(name);

  return data.map(row => ({
    route: row[idx("route")] ?? "",
    source: row[idx("source")] ?? "",
    isRedirect: (row[idx("is_redirect")] ?? "").toLowerCase() === "true",
    inNavigation: (row[idx("in_navigation")] ?? "").toLowerCase() === "true",
    navigationName: row[idx("navigation_name")] ?? "",
    navigationGroup: row[idx("navigation_group")] ?? "",
    workspace: row[idx("workspace")] ?? "",
    notes: row[idx("notes")] ?? "",
  }));
}

function parseFeatureMatrix(markdown: string): FeatureRow[] {
  const lines = markdown.split("\n");
  const rows: FeatureRow[] = [];

  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    if (!line.includes("DF-") && !line.includes("ACCT-") && !line.includes("INV-") && !line.includes("SALE-") && !line.includes("FUL-")) {
      continue;
    }

    const parts = line
      .split("|")
      .map(part => part.trim())
      .filter(Boolean);

    if (parts.length < 11) continue;

    const id = parts[0];
    const name = parts[1];
    const routeField = parts[3] ?? "";
    const priority = parts[6] ?? "";
    const status = parts[10] ?? "";

    const routePatterns = routeField
      .split(/[,;]+/)
      .map(item => item.trim())
      .map(item => item.replace(/\\\*/g, "*"))
      .filter(item => item.includes("/"));

    rows.push({
      id,
      name,
      routePatterns,
      priority,
      status,
    });
  }

  return rows;
}

function parseCoverage(csv: string): CoverageRow[] {
  const rows = parseCsv(csv);
  const [header, ...data] = rows;
  const idx = (name: string) => header.indexOf(name);

  return data.map(row => ({
    type: row[idx("Type")] ?? "",
    id: row[idx("ID")] ?? "",
    name: row[idx("Name")] ?? "",
    ownerModule: row[idx("OwnerModule")] ?? "",
    intentSource: row[idx("IntentSource")] ?? "",
    status: row[idx("Status")] ?? "",
    implementationSource: row[idx("ImplementationSource")] ?? "",
    notes: row[idx("Notes")] ?? "",
  }));
}

function routeMatchesPattern(route: string, pattern: string): boolean {
  const normalized = pattern.trim();
  if (!normalized) return false;
  if (normalized === route) return true;

  if (normalized.includes("*")) {
    const prefix = normalized.split("*")[0];
    return route === prefix.replace(/\/$/, "") || route.startsWith(prefix);
  }

  if (normalized.includes(":")) {
    const regex = new RegExp(
      `^${normalized.replace(/:[^/]+/g, "[^/]+").replace(/\//g, "\\/")}$`
    );
    return regex.test(route);
  }

  if (normalized.endsWith("/")) {
    return route.startsWith(normalized);
  }

  return route.startsWith(`${normalized}/`) || route === normalized;
}

function routeCandidates(route: string): string[] {
  const aliasMap: Record<string, string[]> = {
    "/": ["/dashboard"],
    "/inbox": ["/notifications"],
    "/direct-intake": ["/spreadsheet", "/inventory"],
    "/spreadsheet-view": ["/spreadsheet"],
    "/client-ledger": ["/clients/:id/ledger"],
    "/users": ["/settings/users"],
    "/todos": ["/todo-lists"],
    "/todo": ["/todo-lists"],
    "/time-clock": ["/scheduling"],
    "/relationships": ["/clients", "/vendors"],
    "/demand-supply": [
      "/needs",
      "/interest-list",
      "/vendor-supply",
      "/matchmaking",
    ],
  };

  return [route, ...(aliasMap[route] ?? [])];
}

function buildBaselineBlockerMap(coverageRows: CoverageRow[]) {
  const map = new Map<string, string>();

  for (const row of coverageRows) {
    if (row.type !== "GoldenFlow") continue;
    if (["IntendedMissing", "Divergent"].includes(row.status)) {
      map.set(row.id, row.status);
    }
  }

  return map;
}

function determineScope(route: string, featureIds: string[]) {
  if (route.startsWith("/vip-portal") || route === "/live-shopping") {
    return "excluded";
  }
  if (featureIds.some(id => EXCLUDED_FEATURE_IDS.has(id))) {
    return "excluded";
  }
  if (featureIds.includes("DF-067")) {
    return "baseline_missing";
  }
  return "in_scope";
}

function determineBlockerTag(route: string, featureIds: string[], blockerMap: Map<string, string>) {
  const blockedFlowRoutes = new Set(["/inventory", "/orders", "/purchase-orders", "/samples"]);
  if (blockedFlowRoutes.has(route)) return "golden-flow-blocker";

  if (featureIds.some(id => blockerMap.has(id))) {
    return "baseline-risk";
  }

  return "";
}

function main() {
  const root = process.cwd();
  const docsDir = path.join(root, "docs/uiux-redesign");
  mkdirSync(docsDir, { recursive: true });

  const routesCsv = readFileSync(path.join(docsDir, "P0_ROUTE_MANIFEST.csv"), "utf8");
  const matrixMd = readFileSync(
    path.join(root, "docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md"),
    "utf8"
  );
  const coverageCsv = readFileSync(
    path.join(root, "docs/intended-map/00_COVERAGE.csv"),
    "utf8"
  );

  const routeRows = parseRouteRows(routesCsv);
  const featureRows = parseFeatureMatrix(matrixMd);
  const coverageRows = parseCoverage(coverageCsv);
  const blockerMap = buildBaselineBlockerMap(coverageRows);

  const headers = [
    "route",
    "source",
    "in_navigation",
    "navigation_group",
    "workspace",
    "feature_ids",
    "feature_names",
    "priority",
    "scope",
    "baseline_blocker",
    "unresolved",
    "notes",
  ];

  const manifestRows: string[] = [headers.join(",")];

  let unresolvedCount = 0;
  let inScopeCount = 0;
  let excludedCount = 0;
  let baselineMissingCount = 0;

  for (const route of routeRows) {
    const candidates = routeCandidates(route.route);
    const matches = featureRows.filter(feature =>
      feature.routePatterns.some(pattern =>
        candidates.some(candidate => routeMatchesPattern(candidate, pattern))
      )
    );

    const featureIds = Array.from(new Set(matches.map(match => match.id)));
    const featureNames = Array.from(new Set(matches.map(match => match.name)));
    const priorities = Array.from(new Set(matches.map(match => match.priority)));

    const scope = determineScope(route.route, featureIds);
    if (scope === "excluded") excludedCount += 1;
    if (scope === "baseline_missing") baselineMissingCount += 1;
    if (scope === "in_scope") inScopeCount += 1;

    const unresolved =
      scope === "in_scope" &&
      route.inNavigation &&
      !route.route.startsWith("/slice-v1") &&
      featureIds.length === 0;
    if (unresolved) unresolvedCount += 1;

    const blockerTag = determineBlockerTag(route.route, featureIds, blockerMap);

    const notes = [route.notes, unresolved ? "needs_feature_mapping" : ""]
      .filter(Boolean)
      .join("; ");

    manifestRows.push(
      [
        escapeCsv(route.route),
        escapeCsv(route.source),
        escapeCsv(route.inNavigation),
        escapeCsv(route.navigationGroup),
        escapeCsv(route.workspace),
        escapeCsv(featureIds.join("|")),
        escapeCsv(featureNames.join("|")),
        escapeCsv(priorities.join("|")),
        escapeCsv(scope),
        escapeCsv(blockerTag),
        escapeCsv(unresolved),
        escapeCsv(notes),
      ].join(",")
    );
  }

  const parityPath = path.join(docsDir, "P0_CANONICAL_PARITY_MANIFEST.csv");
  writeFileSync(parityPath, `${manifestRows.join("\n")}\n`, "utf8");

  const scopeDoc = `# P0 Scope Register\n\n## Locked Exclusions\n- \/vip-portal\/*\n- \/live-shopping\n- DF-005, DF-016, DF-072, DF-073, DF-074\n\n## Baseline Missing (Known Pre-existing)\n- DF-067 Recurring Orders\n\n## Scope Summary\n- In-scope routes: ${inScopeCount}\n- Excluded routes: ${excludedCount}\n- Baseline-missing routes: ${baselineMissingCount}\n- Unresolved in-scope mappings: ${unresolvedCount}\n`;

  writeFileSync(path.join(docsDir, "P0_SCOPE_REGISTER.md"), scopeDoc, "utf8");

  const blockerRows = coverageRows
    .filter(row => row.type === "GoldenFlow" && ["IntendedMissing", "Divergent"].includes(row.status))
    .map(
      row =>
        `| ${row.id} | ${row.name} | ${row.status} | ${row.notes || ""} |`
    )
    .join("\n");

  const baselineDefects = `# P0 Baseline Defect Ledger\n\nThis ledger captures pre-redesign blockers that impact UX evaluation.\n\n| Flow | Name | Status | Notes |\n|---|---|---|---|\n${blockerRows}\n`;

  writeFileSync(
    path.join(docsDir, "P0_BASELINE_DEFECT_LEDGER.md"),
    baselineDefects,
    "utf8"
  );

  const truthDoc = `# P0 Truth Reconciliation\n\n## Evidence Hierarchy\n1. Golden flow specs in docs/golden-flows/specs\n2. docs/specs\n3. docs/intended-map\n4. Legacy roadmap/docs\n\n## Inputs Reconciled\n- docs/uiux-redesign/P0_ROUTE_MANIFEST.csv\n- docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md\n- docs/intended-map/00_COVERAGE.csv\n\n## Results\n- Canonical parity manifest: docs/uiux-redesign/P0_CANONICAL_PARITY_MANIFEST.csv\n- In-scope routes: ${inScopeCount}\n- Excluded routes: ${excludedCount}\n- Baseline missing routes: ${baselineMissingCount}\n- Unresolved in-scope mappings: ${unresolvedCount}\n\n${
    unresolvedCount > 0
      ? "## Action Required\nUnresolved in-scope mappings must be explicitly assigned before final rollout.\n"
      : "## Action Required\nNo unresolved in-scope mappings.\n"
  }`;

  writeFileSync(
    path.join(docsDir, "P0_TRUTH_RECONCILIATION.md"),
    truthDoc,
    "utf8"
  );

  console.log(`Wrote ${parityPath}`);
  console.log(`In-scope=${inScopeCount} Excluded=${excludedCount} BaselineMissing=${baselineMissingCount} Unresolved=${unresolvedCount}`);
}

main();
