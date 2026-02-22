#!/usr/bin/env tsx
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

type RouteRow = {
  route: string;
  source: "app_route" | "legacy_alias";
  isRedirect: boolean;
  inNavigation: boolean;
  navigationName: string;
  navigationGroup: string;
  workspace: string;
  notes: string;
};

const root = process.cwd();
const appPath = path.join(root, "client/src/App.tsx");
const navPath = path.join(root, "client/src/config/navigation.ts");
const workspacesPath = path.join(root, "client/src/config/workspaces.ts");
const legacyTelemetryPath = path.join(
  root,
  "client/src/lib/navigation/routeUsageTelemetry.ts"
);

function parseRouteBlocks(appSource: string) {
  const rows: Array<{ route: string; isRedirect: boolean }> = [];
  const blockRegex = /<Route[\s\S]*?(?:\/>|<\/Route>)/g;
  const blocks = appSource.match(blockRegex) ?? [];

  for (const block of blocks) {
    const pathMatch = block.match(/path=\"([^\"]+)\"/);
    if (!pathMatch) continue;

    rows.push({
      route: pathMatch[1],
      isRedirect: /RedirectWith|<Redirect\s/.test(block),
    });
  }

  return rows;
}

function parseNavigationItems(navSource: string) {
  const map = new Map<
    string,
    { name: string; group: string }
  >();

  const itemRegex = /\{\s*name:\s*"([^"]+)"[\s\S]*?path:\s*"([^"]+)"[\s\S]*?group:\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(navSource)) !== null) {
    map.set(match[2], { name: match[1], group: match[3] });
  }

  return map;
}

function parseWorkspaceHomes(workspacesSource: string) {
  const homes: Array<{ title: string; homePath: string }> = [];
  const regex = /title:\s*"([^"]+)"[\s\S]*?homePath:\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(workspacesSource)) !== null) {
    homes.push({ title: match[1], homePath: match[2] });
  }

  return homes;
}

function parseLegacyRoutes(telemetrySource: string): string[] {
  const arrayMatch = telemetrySource.match(
    /LEGACY_ROUTE_PATHS\s*=\s*\[([\s\S]*?)\]\s*as const/
  );
  if (!arrayMatch) return [];

  const valueRegex = /"([^"]+)"/g;
  const routes: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = valueRegex.exec(arrayMatch[1])) !== null) {
    routes.push(match[1]);
  }
  return routes;
}

function escapeCsv(value: string | boolean) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function inferWorkspace(route: string, homes: Array<{ title: string; homePath: string }>) {
  const hit = homes.find(
    home => route === home.homePath || route.startsWith(`${home.homePath}/`)
  );
  return hit?.title ?? "";
}

function toCsv(rows: RouteRow[]) {
  const header = [
    "route",
    "source",
    "is_redirect",
    "in_navigation",
    "navigation_name",
    "navigation_group",
    "workspace",
    "notes",
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        escapeCsv(row.route),
        escapeCsv(row.source),
        escapeCsv(row.isRedirect),
        escapeCsv(row.inNavigation),
        escapeCsv(row.navigationName),
        escapeCsv(row.navigationGroup),
        escapeCsv(row.workspace),
        escapeCsv(row.notes),
      ].join(",")
    );
  }

  return lines.join("\n") + "\n";
}

function main() {
  const appSource = readFileSync(appPath, "utf8");
  const navSource = readFileSync(navPath, "utf8");
  const workspacesSource = readFileSync(workspacesPath, "utf8");
  const telemetrySource = readFileSync(legacyTelemetryPath, "utf8");

  const appRoutes = parseRouteBlocks(appSource);
  const navMap = parseNavigationItems(navSource);
  const workspaceHomes = parseWorkspaceHomes(workspacesSource);
  const legacyRoutes = parseLegacyRoutes(telemetrySource);

  const rows: RouteRow[] = appRoutes.map(route => {
    const nav = navMap.get(route.route);
    const workspace = inferWorkspace(route.route, workspaceHomes);
    return {
      route: route.route,
      source: "app_route",
      isRedirect: route.isRedirect,
      inNavigation: Boolean(nav),
      navigationName: nav?.name ?? "",
      navigationGroup: nav?.group ?? "",
      workspace,
      notes: nav ? "" : "hidden_or_workflow_route",
    };
  });

  const existing = new Set(rows.map(row => row.route));
  for (const legacyRoute of legacyRoutes) {
    if (existing.has(legacyRoute)) continue;
    rows.push({
      route: legacyRoute,
      source: "legacy_alias",
      isRedirect: true,
      inNavigation: false,
      navigationName: "",
      navigationGroup: "",
      workspace: inferWorkspace(legacyRoute, workspaceHomes),
      notes: "legacy_telemetry_alias",
    });
  }

  rows.sort((a, b) => a.route.localeCompare(b.route));

  const outDir = path.join(root, "docs/uiux-redesign");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "P0_ROUTE_MANIFEST.csv");
  writeFileSync(outPath, toCsv(rows), "utf8");

  const appCount = rows.filter(row => row.source === "app_route").length;
  const legacyCount = rows.filter(row => row.source === "legacy_alias").length;

  console.log(`Wrote ${outPath}`);
  console.log(`Routes: ${appCount} app routes, ${legacyCount} legacy aliases`);
}

main();
