#!/usr/bin/env tsx

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

import { ALL_CHAINS } from "../../tests-e2e/chains/definitions/index.ts";
import type { TestChain } from "../../tests-e2e/chains/types.ts";
import { loadOraclesFromDir } from "../../tests-e2e/oracles/loader.ts";
import type { TestOracle } from "../../tests-e2e/oracles/types.ts";

type OutputFormat = "json" | "markdown";
type Executor = "chain" | "oracle" | "manual";
type Priority = "critical" | "high" | "medium";

interface Options {
  count: number;
  seed: number;
  anchors: number;
  domains: string[] | null;
  format: OutputFormat;
  output?: string;
  includePermissionProbes: boolean;
}

interface MatrixRow {
  domain: string;
  entity: string;
  flowName: string;
  archetype: string;
  procedure: string;
  type: string;
  permissions: string;
  roles: string[];
  entryPaths: string[];
  businessPurpose: string;
  implementationStatus: string;
  knownIssues: string;
  routerFile: string;
  key: string;
}

interface LoadedMatrixRows {
  rows: MatrixRow[];
  availableDomains: string[];
  knownDomains: string[];
}

interface RoleFixture {
  qaRole: string;
  email: string;
}

interface ChainSummary {
  chainId: string;
  description: string;
  routePaths: string[];
  tokens: Set<string>;
  personaTags: string[];
  crudTags: string[];
  chain: TestChain;
}

interface OracleSummary {
  flowId: string;
  description: string;
  tags: string[];
  role: string;
  tokens: Set<string>;
  oracle: TestOracle;
}

interface ScoredMatch {
  id: string;
  score: number;
}

interface FlowSupport {
  executor: Executor;
  linkedChains: ScoredMatch[];
  linkedOracles: ScoredMatch[];
  riskScore: number;
  priority: Priority;
}

interface PersonaLens {
  id: string;
  label: string;
  description: string;
  desktopOnly?: boolean;
}

interface MistakePattern {
  id: string;
  label: string;
  archetypes: string[];
  interruptionMode: string;
  description: string;
  recoveryCheck: string;
  permissionProbe?: boolean;
}

interface GeneratedFlow {
  runId: string;
  matrixKey: string;
  domain: string;
  entity: string;
  flowName: string;
  archetype: string;
  priority: Priority;
  riskScore: number;
  executor: Executor;
  entryPath: string;
  procedure: string;
  role: string;
  qaRole?: string;
  qaEmail?: string;
  roleMode: "allowed" | "permission-probe" | "super-admin-fallback";
  device: "desktop" | "tablet" | "mobile";
  personaLens: string;
  mistakePattern: string;
  interruptionMode: string;
  mistakeDescription: string;
  recoveryCheck: string;
  linkedChainIds: string[];
  linkedOracleFlowIds: string[];
  businessPurpose: string;
  knownIssues: string;
  anchor: boolean;
}

interface OutputPacket {
  generatedAt: string;
  seed: number;
  candidateRows: number;
  selectedCount: number;
  anchors: number;
  summary: {
    byExecutor: Record<string, number>;
    byPriority: Record<string, number>;
    byDomain: Record<string, number>;
    byDevice: Record<string, number>;
    byMistakePattern: Record<string, number>;
    permissionProbes: number;
  };
  flows: GeneratedFlow[];
}

const MATRIX_PATH = path.join(
  process.cwd(),
  "docs/reference/USER_FLOW_MATRIX.csv"
);
const ORACLES_DIR = path.join(process.cwd(), "tests-e2e/oracles");

const QA_ROLE_FIXTURES = {
  "Super Admin": {
    qaRole: "SuperAdmin",
    email: "qa.superadmin@terp.test",
  },
  "Sales Manager": {
    qaRole: "SalesManager",
    email: "qa.salesmanager@terp.test",
  },
  "Sales Rep": {
    qaRole: "SalesRep",
    email: "qa.salesrep@terp.test",
  },
  "Inventory Manager": {
    qaRole: "InventoryManager",
    email: "qa.inventory@terp.test",
  },
  Fulfillment: {
    qaRole: "Fulfillment",
    email: "qa.fulfillment@terp.test",
  },
  "Accounting Manager": {
    qaRole: "AccountingManager",
    email: "qa.accounting@terp.test",
  },
  "Read-Only Auditor": {
    qaRole: "Auditor",
    email: "qa.auditor@terp.test",
  },
} satisfies Record<string, RoleFixture>;
type QaFixtureRoleName = keyof typeof QA_ROLE_FIXTURES;

const DIRECT_MATRIX_ROLE_FIXTURE_LABELS: Record<string, QaFixtureRoleName> = {
  "Super Admin": "Super Admin",
  "Sales Manager": "Sales Manager",
  "Sales Rep": "Sales Rep",
  "Inventory Manager": "Inventory Manager",
  Fulfillment: "Fulfillment",
  "Warehouse Staff": "Fulfillment",
  "Accounting Manager": "Accounting Manager",
  Accountant: "Accounting Manager",
  Auditor: "Read-Only Auditor",
  "Read-Only Auditor": "Read-Only Auditor",
};

const DOMAIN_QA_ROLE_HINTS: Partial<Record<string, QaFixtureRoleName>> = {
  "Admin Tools": "Super Admin",
  Analytics: "Accounting Manager",
  Auth: "Sales Manager",
  "Bad Debt": "Accounting Manager",
  Calendar: "Sales Manager",
  COGS: "Accounting Manager",
  Configuration: "Super Admin",
  "Client Ledger": "Accounting Manager",
  Dashboard: "Sales Manager",
  Debug: "Super Admin",
  Gamification: "Sales Manager",
  Health: "Super Admin",
  Inventory: "Inventory Manager",
  "Live Shopping": "Sales Manager",
  Organization: "Super Admin",
  "Purchase Orders": "Inventory Manager",
  Returns: "Sales Manager",
  "Recurring Orders": "Sales Manager",
  Samples: "Sales Manager",
  Scheduling: "Inventory Manager",
  Storage: "Inventory Manager",
  Strains: "Inventory Manager",
  "Supplier Supply": "Inventory Manager",
  Tags: "Inventory Manager",
  "User Management": "Super Admin",
  "VIP Portal": "Sales Manager",
  Workflow: "Sales Manager",
};

const INTENTIONALLY_UNRESOLVED_MATRIX_ROLES = new Set([
  "Buyer",
  "Supplier",
  "VIP Client",
]);

const GENERIC_MATRIX_ROLE_FIXTURE_LABELS: Record<
  string,
  QaFixtureRoleName | ((row: MatrixRow) => QaFixtureRoleName | undefined)
> = {
  Admin: "Super Admin",
  System: "Super Admin",
  Accounting: "Accounting Manager",
  Warehouse: "Fulfillment",
  Logistics: "Fulfillment",
  Purchasing: "Inventory Manager",
  "Purchasing Manager": "Inventory Manager",
  "All Sales": "Sales Manager",
  "Session Owner": "Sales Manager",
  Manager: row => DOMAIN_QA_ROLE_HINTS[row.domain] ?? "Sales Manager",
  "All Users": row => DOMAIN_QA_ROLE_HINTS[row.domain] ?? "Sales Manager",
  "All Authenticated Users": row => DOMAIN_QA_ROLE_HINTS[row.domain] ?? "Sales Manager",
};

const ALL_QA_ROLE_NAMES = Object.keys(QA_ROLE_FIXTURES) as QaFixtureRoleName[];
const warnedMissingRoleFixtures = new Set<string>();
const warnedMistakeFallbackArchetypes = new Set<string>();
const ALLOWED_SHORT_TOKENS = new Set(["id", "po", "vip"]);

const PERSONA_LENSES: PersonaLens[] = [
  {
    id: "first-time-user",
    label: "First-time user",
    description: "Still learning labels and likely to pick the wrong obvious action first.",
  },
  {
    id: "rushed-operator",
    label: "Rushed operator",
    description: "Moves fast, skim-reads, and assumes the app kept the last context.",
  },
  {
    id: "cautious-operator",
    label: "Cautious operator",
    description: "Double-checks before committing and backs out when feedback feels unclear.",
  },
  {
    id: "distracted-multitasker",
    label: "Distracted multitasker",
    description: "Switches tabs, loses context, and returns expecting the UI to remember state.",
  },
  {
    id: "returning-user",
    label: "Returning user",
    description: "Assumes old habits still work and may miss changed labels or hidden filters.",
  },
  {
    id: "keyboard-first",
    label: "Keyboard-first operator",
    description: "Uses search, tab, enter, escape, and back/forward heavily.",
    desktopOnly: true,
  },
];

const MISTAKE_PATTERNS: MistakePattern[] = [
  {
    id: "wrong-first-click",
    label: "Wrong first click",
    archetypes: [
      "view/search",
      "action",
      "create",
      "update",
      "state transition",
      "validation",
    ],
    interruptionMode: "mis-click",
    description: "Open the wrong row, tab, or action first before correcting course.",
    recoveryCheck: "Verify the app makes it obvious what changed and allows an easy recovery.",
  },
  {
    id: "stale-filter-carryover",
    label: "Stale filter carryover",
    archetypes: ["view/search", "report", "action", "state transition"],
    interruptionMode: "filter-noise",
    description: "Apply a partial filter, forget about it, and continue as if the list is complete.",
    recoveryCheck: "Check whether the UI exposes the active filter clearly and avoids false empty states.",
  },
  {
    id: "partial-search-term",
    label: "Partial search term",
    archetypes: ["view/search", "report"],
    interruptionMode: "search-noise",
    description: "Use an incomplete or slightly wrong search term, then misread the results.",
    recoveryCheck: "Look for helpful empty states, fuzzy matches, or clear recovery guidance.",
  },
  {
    id: "open-cancel-return",
    label: "Open cancel return",
    archetypes: ["create", "update", "delete", "delete/archive", "create/update"],
    interruptionMode: "cancel-reopen",
    description: "Open the flow, cancel midway, then come back expecting clean state.",
    recoveryCheck: "Confirm canceled work does not leak state or leave ghost selections behind.",
  },
  {
    id: "backtrack-after-open",
    label: "Backtrack after open",
    archetypes: ["view/search", "create", "update", "state transition"],
    interruptionMode: "browser-back",
    description: "Use browser back/forward after opening a drawer, detail panel, or cross-link.",
    recoveryCheck: "Verify URLs, selection state, and detail panels stay truthful after backtracking.",
  },
  {
    id: "refresh-mid-flow",
    label: "Refresh mid-flow",
    archetypes: [
      "create",
      "update",
      "state transition",
      "action",
      "validation",
    ],
    interruptionMode: "refresh",
    description: "Refresh after starting a flow or after a likely save point.",
    recoveryCheck: "Check whether the page recovers cleanly and explains any lost draft or retained state.",
  },
  {
    id: "double-submit-attempt",
    label: "Double submit attempt",
    archetypes: [
      "create",
      "update",
      "delete",
      "delete/archive",
      "state transition",
      "validation",
    ],
    interruptionMode: "rapid-repeat",
    description: "Click confirm twice or retry quickly because the UI feels slow or ambiguous.",
    recoveryCheck: "Look for duplicate submissions, repeated toasts, or unclear disabled/loading states.",
  },
  {
    id: "context-switch-return",
    label: "Context switch return",
    archetypes: ["view/search", "create", "update", "report", "state transition"],
    interruptionMode: "cross-module-switch",
    description: "Jump to a nearby page, then return expecting the original selection or filter to persist sensibly.",
    recoveryCheck: "Verify context persistence is intentional and not silently misleading.",
  },
  {
    id: "misread-primary-action",
    label: "Misread primary action",
    archetypes: ["action", "state transition", "create"],
    interruptionMode: "label-confusion",
    description: "Choose the most obvious action based on label alone, even if it means the wrong workflow.",
    recoveryCheck: "Check whether button labels and resulting destinations align to normal human expectations.",
  },
  {
    id: "mobile-hidden-control",
    label: "Mobile hidden control",
    archetypes: ["view/search", "create", "update", "action", "report"],
    interruptionMode: "small-viewport",
    description: "Run the flow on a narrow viewport where filters or actions may be tucked away.",
    recoveryCheck: "Verify the next action remains discoverable and that overlays do not trap the user.",
  },
  {
    id: "permission-probe",
    label: "Permission probe",
    archetypes: ["view/search", "action", "create", "update", "delete", "delete/archive", "state transition"],
    interruptionMode: "role-mismatch",
    description: "Attempt the flow as a plausible but wrong role to see whether the UI fails safely.",
    recoveryCheck: "Verify blocked roles are denied clearly without broken or half-rendered UI.",
    permissionProbe: true,
  },
];

class SeededRng {
  constructor(private state: number) {}

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  pick<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error("SeededRng.pick received an empty item list");
    }
    return items[Math.floor(this.next() * items.length)];
  }

  weightedPick<T>(items: Array<{ item: T; weight: number }>): T {
    if (items.length === 0) {
      throw new Error("SeededRng.weightedPick received an empty item list");
    }
    const total = items.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = this.next() * total;
    for (const entry of items) {
      cursor -= entry.weight;
      if (cursor <= 0) return entry.item;
    }
    return items[items.length - 1].item;
  }
}

function fixtureIdentity(fixture?: RoleFixture): string | null {
  if (!fixture) return null;
  return `${fixture.qaRole}|${fixture.email}`;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    count: 40,
    seed: Date.now(),
    anchors: 8,
    domains: null,
    format: "markdown",
    includePermissionProbes: true,
  };

  const args = [...argv];
  while (args.length > 0) {
    const current = args.shift();
    if (!current) continue;
    if (current === "--") continue;

    const [flag, inlineValue] = current.split("=", 2);
    const nextValue =
      inlineValue !== undefined ? inlineValue : args[0]?.startsWith("--") ? undefined : args.shift();

    switch (flag) {
      case "--count":
        if (!nextValue) throw new Error("--count requires a value");
        options.count = Number(nextValue);
        break;
      case "--seed":
        if (!nextValue) throw new Error("--seed requires a value");
        options.seed = Number(nextValue);
        break;
      case "--anchors":
        if (!nextValue) throw new Error("--anchors requires a value");
        options.anchors = Number(nextValue);
        break;
      case "--domains":
        if (!nextValue) throw new Error("--domains requires a comma-separated value");
        options.domains = nextValue
          .split(",")
          .map(value => value.trim())
          .filter(Boolean);
        break;
      case "--format":
        if (nextValue !== "json" && nextValue !== "markdown") {
          throw new Error("--format must be json or markdown");
        }
        options.format = nextValue;
        break;
      case "--output":
        if (!nextValue) throw new Error("--output requires a file path");
        options.output = nextValue;
        break;
      case "--no-permission-probes":
        options.includePermissionProbes = false;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }

  if (!Number.isFinite(options.count) || options.count <= 0) {
    throw new Error("--count must be a positive number");
  }

  if (!Number.isFinite(options.anchors) || options.anchors < 0) {
    throw new Error("--anchors must be zero or greater");
  }

  if (!Number.isFinite(options.seed)) {
    throw new Error("--seed must be a finite number");
  }

  options.seed = options.seed >>> 0;

  return options;
}

function printHelp(): void {
  console.log(`
Generate a seeded confused-human QA packet for TERP.

Usage:
  pnpm qa:human:flows -- --count 40 --seed $(date +%Y%m%d)

Options:
  --count <n>              Number of generated runs (default: 40)
  --seed <n>               RNG seed for reproducibility (default: current timestamp, normalized to uint32)
  --anchors <n>            Number of deterministic high-risk anchors (default: 8)
  --domains a,b,c          Restrict to specific domains from USER_FLOW_MATRIX.csv
  --format json|markdown   Output file format when --output is used (default: markdown)
  --output <file>          Write the generated packet to a file
  --no-permission-probes   Skip wrong-role permission probes
`);
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter(candidate => candidate.some(value => value.trim().length > 0));
}

function splitField(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeToken(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, " ")
    .split(/\s+/)
    .filter(
      token => token.length >= 3 || ALLOWED_SHORT_TOKENS.has(token)
    );
}

function normalizePathForMatch(value: string): string {
  if (!value.startsWith("/")) return value;
  const withoutQuery = value.split("?")[0];
  const withoutDynamicSegments = withoutQuery.replace(/\/:[^/]+/g, "");
  return withoutDynamicSegments.replace(/\/+$/, "") || "/";
}

function resolveRoleFixtureLabel(
  row: MatrixRow,
  role: string
): QaFixtureRoleName | undefined {
  const directLabel = DIRECT_MATRIX_ROLE_FIXTURE_LABELS[role];
  if (directLabel) {
    return directLabel;
  }

  const genericLabel = GENERIC_MATRIX_ROLE_FIXTURE_LABELS[role];
  if (!genericLabel) {
    return undefined;
  }

  return typeof genericLabel === "function" ? genericLabel(row) : genericLabel;
}

function resolveRoleFixture(
  row: MatrixRow,
  role: string
): RoleFixture | undefined {
  const fixtureLabel = resolveRoleFixtureLabel(row, role);
  return fixtureLabel ? QA_ROLE_FIXTURES[fixtureLabel] : undefined;
}

function loadMatrixRows(domains: string[] | null): LoadedMatrixRows {
  const raw = readFileSync(MATRIX_PATH, "utf8");
  const parsed = parseCsv(raw);
  const header = parsed[0];
  const rows: MatrixRow[] = [];
  const knownDomains = new Set<string>();
  const availableDomains = new Set<string>();
  const requestedDomains = domains
    ? new Set(domains.map(domain => domain.trim().toLowerCase()))
    : null;

  for (const dataRow of parsed.slice(1)) {
    const record = Object.fromEntries(
      header.map((column, index) => [column, dataRow[index] ?? ""])
    );
    const domain = record.Domain.trim();
    knownDomains.add(domain);

    if (record["Implementation Status"] !== "Client-wired") {
      continue;
    }
    availableDomains.add(domain);

    if (requestedDomains && !requestedDomains.has(domain.toLowerCase())) {
      continue;
    }

    const entryPaths = splitField(record["UI Entry Paths"]).filter(pathValue =>
      pathValue.startsWith("/")
    );

    rows.push({
      domain,
      entity: record.Entity.trim(),
      flowName: record["Flow Name"].trim(),
      archetype: record.Archetype.trim(),
      procedure: record["tRPC Procedure"].trim(),
      type: record.Type.trim(),
      permissions: record.Permissions.trim(),
      roles: splitField(record.Roles),
      entryPaths,
      businessPurpose: record["Business Purpose"].trim(),
      implementationStatus: record["Implementation Status"].trim(),
      knownIssues: record["Known Issues"].trim(),
      routerFile: record["Router File"].trim(),
      key: [
        record.Domain.trim(),
        record.Entity.trim(),
        record["Flow Name"].trim(),
        record["tRPC Procedure"].trim(),
      ].join("|"),
    });
  }

  return {
    rows,
    availableDomains: [...availableDomains].sort((left, right) =>
      left.localeCompare(right)
    ),
    knownDomains: [...knownDomains].sort((left, right) =>
      left.localeCompare(right)
    ),
  };
}

function buildChainSummaries(): ChainSummary[] {
  return ALL_CHAINS.map(chain => {
    const routePaths = chain.tags
      .filter(tag => tag.startsWith("route:"))
      .map(tag => normalizePathForMatch(tag.slice("route:".length)));
    const tokens = new Set<string>([
      ...normalizeToken(chain.chain_id),
      ...normalizeToken(chain.description),
      ...chain.tags.flatMap(tag => normalizeToken(tag)),
    ]);

    return {
      chainId: chain.chain_id,
      description: chain.description,
      routePaths,
      tokens,
      personaTags: chain.tags.filter(tag => tag.startsWith("persona:")),
      crudTags: chain.tags.filter(tag => tag.startsWith("crud:")),
      chain,
    };
  });
}

function buildOracleSummaries(): OracleSummary[] {
  const oracles = loadOraclesFromDir(ORACLES_DIR);

  return oracles.map(oracle => ({
    flowId: oracle.flow_id,
    description: oracle.description,
    tags: oracle.tags ?? [],
    role: oracle.role,
    tokens: new Set<string>([
      ...normalizeToken(oracle.flow_id),
      ...normalizeToken(oracle.description),
      ...(oracle.tags ?? []).flatMap(tag => normalizeToken(tag)),
    ]),
    oracle,
  }));
}

function scoreChain(row: MatrixRow, summary: ChainSummary): number {
  let score = 0;
  const normalizedEntryPaths = row.entryPaths.map(normalizePathForMatch);

  if (
    normalizedEntryPaths.some(entryPath =>
      summary.routePaths.some(
        routePath =>
          routePath === entryPath ||
          routePath.startsWith(entryPath) ||
          entryPath.startsWith(routePath)
      )
    )
  ) {
    score += 5;
  }

  const rowTokens = new Set<string>([
    ...normalizeToken(row.domain),
    ...normalizeToken(row.entity),
    ...normalizeToken(row.flowName),
    ...normalizeToken(row.procedure),
  ]);

  for (const token of rowTokens) {
    if (summary.tokens.has(token)) score += 1;
  }

  const archetype = row.archetype.toLowerCase();
  if (archetype.includes("create") && summary.crudTags.includes("crud:create")) {
    score += 2;
  }
  if (archetype.includes("update") && summary.crudTags.includes("crud:update")) {
    score += 2;
  }
  if (
    (archetype.includes("view") || archetype.includes("report")) &&
    summary.crudTags.includes("crud:read")
  ) {
    score += 2;
  }
  if (
    archetype.includes("delete") &&
    summary.crudTags.includes("crud:delete")
  ) {
    score += 2;
  }

  return score;
}

function scoreOracle(row: MatrixRow, summary: OracleSummary): number {
  let score = 0;
  const rowTokens = new Set<string>([
    ...normalizeToken(row.domain),
    ...normalizeToken(row.entity),
    ...normalizeToken(row.flowName),
    ...normalizeToken(row.procedure),
  ]);

  for (const token of rowTokens) {
    if (summary.tokens.has(token)) score += 1;
  }

  const archetype = row.archetype.toLowerCase();
  if (row.type === "mutation" && summary.tags.includes("mutation")) score += 2;
  if (
    archetype.includes("create") ||
    archetype.includes("update") ||
    archetype.includes("delete") ||
    archetype.includes("state transition")
  ) {
    if (summary.tags.includes("crud") || summary.tags.includes("orders")) {
      score += 1;
    }
  }
  if (row.type === "query" && summary.tags.includes("smoke")) score += 1;

  return score;
}

function getRiskScore(row: MatrixRow, executor: Executor): number {
  const domainWeight: Record<string, number> = {
    Orders: 5,
    Inventory: 5,
    Accounting: 5,
    CRM: 4,
    "Purchase Orders": 4,
    Pricing: 4,
    Samples: 4,
    Workflow: 4,
    Admin: 3,
    Scheduling: 3,
    "VIP Portal": 3,
    "Live Shopping": 3,
  };

  const archetypeWeight: Record<string, number> = {
    "view/search": 2,
    action: 3,
    report: 2,
    create: 4,
    update: 4,
    delete: 4,
    "delete/archive": 4,
    "create/update": 4,
    "state transition": 5,
    validation: 3,
  };

  const domainScore = domainWeight[row.domain] ?? 2;
  const archetypeScore = archetypeWeight[row.archetype.toLowerCase()] ?? 2;
  const typeScore = row.type === "mutation" ? 1 : 0;
  const issueScore = row.knownIssues ? 2 : 0;
  const manualScore = executor === "manual" ? 1 : 0;

  return domainScore + archetypeScore + typeScore + issueScore + manualScore;
}

function getPriority(score: number): Priority {
  if (score >= 10) return "critical";
  if (score >= 7) return "high";
  return "medium";
}

function buildFlowSupport(
  row: MatrixRow,
  chainSummaries: ChainSummary[],
  oracleSummaries: OracleSummary[]
): FlowSupport {
  const linkedChains = chainSummaries
    .map(summary => ({
      id: summary.chainId,
      score: scoreChain(row, summary),
    }))
    .filter(match => match.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.id.localeCompare(right.id)
    )
    .slice(0, 3);

  const linkedOracles = oracleSummaries
    .map(summary => ({
      id: summary.flowId,
      score: scoreOracle(row, summary),
    }))
    .filter(match => match.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.id.localeCompare(right.id)
    )
    .slice(0, 3);

  let executor: Executor = "manual";

  if (linkedChains[0] && linkedChains[0].score >= 5) {
    executor = "chain";
  } else if (linkedOracles[0] && linkedOracles[0].score >= 3) {
    executor = "oracle";
  }

  const riskScore = getRiskScore(row, executor);

  return {
    executor,
    linkedChains,
    linkedOracles,
    riskScore,
    priority: getPriority(riskScore),
  };
}

function getDeviceChoices(archetype: string): Array<{ item: "desktop" | "tablet" | "mobile"; weight: number }> {
  const normalized = archetype.toLowerCase();
  if (normalized.includes("report")) {
    return [
      { item: "desktop", weight: 7 },
      { item: "tablet", weight: 2 },
      { item: "mobile", weight: 1 },
    ];
  }

  if (
    normalized.includes("create") ||
    normalized.includes("update") ||
    normalized.includes("state transition")
  ) {
    return [
      { item: "desktop", weight: 5 },
      { item: "tablet", weight: 2 },
      { item: "mobile", weight: 3 },
    ];
  }

  return [
    { item: "desktop", weight: 5 },
    { item: "tablet", weight: 2 },
    { item: "mobile", weight: 2 },
  ];
}

function pickPersonaLens(
  rng: SeededRng,
  device: "desktop" | "tablet" | "mobile"
): PersonaLens {
  const candidates = PERSONA_LENSES.filter(
    lens => !(lens.desktopOnly && device !== "desktop")
  );
  return rng.pick(candidates);
}

function pickMistakePattern(
  row: MatrixRow,
  rng: SeededRng,
  includePermissionProbes: boolean
): MistakePattern {
  const normalized = row.archetype.toLowerCase();
  const candidates = MISTAKE_PATTERNS.filter(pattern => {
    if (!includePermissionProbes && pattern.permissionProbe) return false;
    return pattern.archetypes.includes(normalized);
  });
  const fallbackPatterns = includePermissionProbes
    ? MISTAKE_PATTERNS
    : MISTAKE_PATTERNS.filter(pattern => !pattern.permissionProbe);
  if (
    candidates.length === 0 &&
    !warnedMistakeFallbackArchetypes.has(normalized)
  ) {
    console.warn(
      `Warning: no mistake-pattern mapping for archetype "${row.archetype}"; using fallback patterns.`
    );
    warnedMistakeFallbackArchetypes.add(normalized);
  }
  return rng.pick(candidates.length > 0 ? candidates : fallbackPatterns);
}

function chooseRole(
  row: MatrixRow,
  mistakePattern: MistakePattern,
  rng: SeededRng
): { role: string; roleMode: "allowed" | "permission-probe" | "super-admin-fallback"; fixture?: RoleFixture } {
  const allowedRoles = row.roles.filter(role => resolveRoleFixture(row, role));
  const allowedFixtureKeys = new Set(
    allowedRoles
      .map(role => fixtureIdentity(resolveRoleFixture(row, role)))
      .filter((value): value is string => Boolean(value))
  );

  if (
    mistakePattern.permissionProbe &&
    allowedFixtureKeys.size > 0 &&
    allowedFixtureKeys.size < ALL_QA_ROLE_NAMES.length
  ) {
    const disallowedRoles = ALL_QA_ROLE_NAMES.filter(
      role =>
        !allowedFixtureKeys.has(fixtureIdentity(QA_ROLE_FIXTURES[role]) ?? "")
    );
    if (disallowedRoles.length > 0) {
      const role = rng.pick(disallowedRoles);
      return {
        role,
        roleMode: "permission-probe",
        fixture: QA_ROLE_FIXTURES[role],
      };
    }
  }

  if (allowedRoles.length === 0) {
    if (!warnedMissingRoleFixtures.has(row.key)) {
      const unresolvedRoles = row.roles.filter(role => !resolveRoleFixture(row, role));
      const unresolvedSuffix =
        unresolvedRoles.length > 0 ? ` [${unresolvedRoles.join(", ")}]` : "";
      const intentNote =
        unresolvedRoles.length > 0 &&
        unresolvedRoles.every(role => INTENTIONALLY_UNRESOLVED_MATRIX_ROLES.has(role))
          ? " using explicit fallback for external/public personas"
          : "";
      console.warn(
        `Warning: no safe QA fixture mapping for roles${unresolvedSuffix} on ${row.key}; defaulting to Super Admin${intentNote}.`
      );
      warnedMissingRoleFixtures.add(row.key);
    }
    return {
      role: "Super Admin",
      roleMode: "super-admin-fallback",
      fixture: QA_ROLE_FIXTURES["Super Admin"],
    };
  }

  const role = rng.pick(allowedRoles);
  return {
    role,
    roleMode: "allowed",
    fixture: resolveRoleFixture(row, role),
  };
}

function weightedUniqueSample<T>(
  items: T[],
  count: number,
  weightOf: (item: T) => number,
  rng: SeededRng
): T[] {
  const pool = [...items];
  const selected: T[] = [];

  while (pool.length > 0 && selected.length < count) {
    const pick = rng.weightedPick(
      pool.map(item => ({ item, weight: Math.max(1, weightOf(item)) }))
    );
    selected.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }

  return selected;
}

function chooseEntryPath(row: MatrixRow, rng: SeededRng): string {
  if (row.entryPaths.length === 0) return "No UI path in matrix";
  return rng.pick(row.entryPaths);
}

function buildGeneratedFlows(
  rows: MatrixRow[],
  chainSummaries: ChainSummary[],
  oracleSummaries: OracleSummary[],
  options: Options
): OutputPacket {
  const rng = new SeededRng(options.seed >>> 0);
  const supportedRows = rows.map(row => ({
    row,
    support: buildFlowSupport(row, chainSummaries, oracleSummaries),
  }));

  const sortedByRisk = [...supportedRows].sort(
    (left, right) =>
      right.support.riskScore - left.support.riskScore ||
      left.row.key.localeCompare(right.row.key)
  );
  const anchorCount = Math.min(options.count, options.anchors);
  const anchors = sortedByRisk.slice(0, anchorCount);
  const anchorKeySet = new Set(anchors.map(candidate => candidate.row.key));
  const remaining = supportedRows.filter(
    candidate => !anchors.some(anchor => anchor.row.key === candidate.row.key)
  );

  const randomized = weightedUniqueSample(
    remaining,
    Math.max(0, options.count - anchors.length),
    candidate => candidate.support.riskScore * candidate.support.riskScore,
    rng
  );

  const selected = [...anchors, ...randomized];

  const flows = selected.map((candidate, index) => {
    const attributeRng = new SeededRng(
      hashSeed(`${options.seed}:${candidate.row.key}:attributes`)
    );
    const device = attributeRng.weightedPick(
      getDeviceChoices(candidate.row.archetype)
    );
    const persona = pickPersonaLens(attributeRng, device);
    let mistakePattern = pickMistakePattern(
      candidate.row,
      attributeRng,
      options.includePermissionProbes
    );
    let roleChoice = chooseRole(candidate.row, mistakePattern, attributeRng);
    if (
      mistakePattern.permissionProbe &&
      roleChoice.roleMode !== "permission-probe"
    ) {
      mistakePattern = pickMistakePattern(
        candidate.row,
        new SeededRng(hashSeed(`${options.seed}:${candidate.row.key}:fallback-mistake`)),
        false
      );
      roleChoice = chooseRole(
        candidate.row,
        mistakePattern,
        new SeededRng(hashSeed(`${options.seed}:${candidate.row.key}:fallback-role`))
      );
    }

    return {
      runId: `CHQ-${String(index + 1).padStart(3, "0")}`,
      matrixKey: candidate.row.key,
      domain: candidate.row.domain,
      entity: candidate.row.entity,
      flowName: candidate.row.flowName,
      archetype: candidate.row.archetype,
      priority: candidate.support.priority,
      riskScore: candidate.support.riskScore,
      executor: candidate.support.executor,
      entryPath: chooseEntryPath(candidate.row, attributeRng),
      procedure: candidate.row.procedure,
      role: roleChoice.role,
      qaRole: roleChoice.fixture?.qaRole,
      qaEmail: roleChoice.fixture?.email,
      roleMode: roleChoice.roleMode,
      device,
      personaLens: persona.label,
      mistakePattern: mistakePattern.label,
      interruptionMode: mistakePattern.interruptionMode,
      mistakeDescription: mistakePattern.description,
      recoveryCheck: mistakePattern.recoveryCheck,
      linkedChainIds: candidate.support.linkedChains.map(match => match.id),
      linkedOracleFlowIds: candidate.support.linkedOracles.map(match => match.id),
      businessPurpose: candidate.row.businessPurpose,
      knownIssues: candidate.row.knownIssues,
      anchor: anchorKeySet.has(candidate.row.key),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    seed: options.seed >>> 0,
    candidateRows: supportedRows.length,
    selectedCount: flows.length,
    anchors: anchors.length,
    summary: {
      byExecutor: countBy(flows, flow => flow.executor),
      byPriority: countBy(flows, flow => flow.priority),
      byDomain: countBy(flows, flow => flow.domain),
      byDevice: countBy(flows, flow => flow.device),
      byMistakePattern: countBy(flows, flow => flow.mistakePattern),
      permissionProbes: flows.filter(flow => flow.roleMode === "permission-probe").length,
    },
    flows,
  };
}

function countBy<T>(items: T[], select: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = select(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function toMarkdown(packet: OutputPacket): string {
  const lines: string[] = [];
  lines.push("# Confused Human QA Packet");
  lines.push("");
  lines.push(`- Seed: \`${packet.seed}\``);
  lines.push(`- Candidate client-wired rows: \`${packet.candidateRows}\``);
  lines.push(`- Generated runs: \`${packet.selectedCount}\``);
  lines.push(`- High-risk anchors: \`${packet.anchors}\``);
  lines.push(`- Permission probes: \`${packet.summary.permissionProbes}\``);
  lines.push("");
  lines.push("## Mix");
  lines.push("");
  lines.push(`- Executors: ${formatCounts(packet.summary.byExecutor)}`);
  lines.push(`- Priority: ${formatCounts(packet.summary.byPriority)}`);
  lines.push(`- Devices: ${formatCounts(packet.summary.byDevice)}`);
  lines.push("");
  lines.push("## Runs");
  lines.push("");

  for (const flow of packet.flows) {
    const roleSuffix =
      flow.roleMode === "permission-probe"
        ? " (permission probe)"
        : flow.roleMode === "super-admin-fallback"
          ? " (super admin fallback)"
          : "";
    lines.push(
      `${flow.runId} | ${flow.priority.toUpperCase()} | ${flow.executor} | ${flow.domain} | ${flow.role}${roleSuffix} | ${flow.device} | ${flow.mistakePattern}`
    );
    lines.push(`Path: ${flow.entryPath}`);
    lines.push(`Flow: ${flow.entity} -> ${flow.flowName} (${flow.archetype})`);
    lines.push(`Intent: ${flow.businessPurpose}`);
    lines.push(`Mistake: ${flow.mistakeDescription}`);
    lines.push(`Recovery check: ${flow.recoveryCheck}`);
    if (flow.linkedChainIds.length > 0) {
      lines.push(`Linked chains: ${flow.linkedChainIds.join(", ")}`);
    }
    if (flow.linkedOracleFlowIds.length > 0) {
      lines.push(`Linked oracles: ${flow.linkedOracleFlowIds.join(", ")}`);
    }
    if (flow.knownIssues) {
      lines.push(`Known issues: ${flow.knownIssues}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

function formatCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

function writeOutput(packet: OutputPacket, options: Options): void {
  if (!options.output) return;

  const outputPath = path.resolve(process.cwd(), options.output);
  mkdirSync(path.dirname(outputPath), { recursive: true });

  const content =
    options.format === "json"
      ? JSON.stringify(packet, null, 2) + "\n"
      : toMarkdown(packet);
  writeFileSync(outputPath, content, "utf8");
}

function printSummary(packet: OutputPacket): void {
  console.log(`Seed: ${packet.seed}`);
  console.log(`Candidate rows: ${packet.candidateRows}`);
  console.log(`Generated runs: ${packet.selectedCount}`);
  console.log(`Anchors: ${packet.anchors}`);
  console.log(`Executors: ${formatCounts(packet.summary.byExecutor)}`);
  console.log(`Priority: ${formatCounts(packet.summary.byPriority)}`);
  console.log(`Devices: ${formatCounts(packet.summary.byDevice)}`);
  console.log(`Mistakes: ${formatCounts(packet.summary.byMistakePattern)}`);
  console.log("");
  console.log("Sample runs:");
  for (const flow of packet.flows.slice(0, Math.min(5, packet.flows.length))) {
    console.log(
      `- ${flow.runId}: ${flow.domain} / ${flow.flowName} / ${flow.executor} / ${flow.device} / ${flow.mistakePattern}`
    );
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  if (options.anchors >= options.count) {
    console.warn(
      "Warning: --anchors >= --count; output will be deterministic anchors only with no random sample."
    );
  }

  const { rows, availableDomains, knownDomains } = loadMatrixRows(options.domains);
  if (rows.length === 0) {
    const scopedMessage =
      options.domains && options.domains.length > 0
        ? ` for domains: ${options.domains.join(", ")}`
        : "";
    throw new Error(
      `No client-wired matrix rows matched${scopedMessage}. Client-wired domains: ${availableDomains.join(", ")}. Domains in matrix: ${knownDomains.join(", ")}`
    );
  }
  const chainSummaries = buildChainSummaries();
  const oracleSummaries = buildOracleSummaries();
  const packet = buildGeneratedFlows(
    rows,
    chainSummaries,
    oracleSummaries,
    options
  );

  writeOutput(packet, options);

  if (options.output) {
    console.log(`Wrote ${options.format} packet to ${options.output}`);
    console.log("");
  }

  printSummary(packet);
}

export {
  buildChainSummaries,
  buildFlowSupport,
  buildGeneratedFlows,
  buildOracleSummaries,
  chooseRole,
  hashSeed,
  INTENTIONALLY_UNRESOLVED_MATRIX_ROLES,
  loadMatrixRows,
  normalizeToken,
  parseArgs,
  pickMistakePattern,
  resolveRoleFixture,
  resolveRoleFixtureLabel,
  SeededRng,
};

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main();
}
