import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import type { QARole } from "../../tests-e2e/oracles/types";

export type FlowPacketFormat = "text" | "json";

export interface GeneratorOptions {
  rootDir: string;
  count: number;
  seed: string;
  format: FlowPacketFormat;
  output?: string;
}

interface MatrixRow {
  Domain: string;
  Entity: string;
  "Flow Name": string;
  Archetype: string;
  "tRPC Procedure": string;
  Type: string;
  Roles: string;
  "UI Entry Paths": string;
  "Business Purpose": string;
  "Implementation Status": string;
  "Known Issues": string;
  "Router File": string;
}

type CandidateSource = "matrix" | "chain" | "oracle";

export interface ConfusedHumanCandidate {
  id: string;
  domain: string;
  flowName: string;
  area: string;
  source: CandidateSource;
  sourceRef: string;
  uiPath: string | null;
  roles: string[];
  fixtureRoles: QARole[];
  mappingWarnings: string[];
  priority: number;
  businessPurpose?: string;
  knownIssues?: string | null;
  implementationStatus?: string | null;
}

export interface ConfusedHumanRun {
  runId: string;
  ordinal: number;
  domain: string;
  flowName: string;
  area: string;
  source: CandidateSource;
  sourceRef: string;
  uiPath: string | null;
  fixtureRole: QARole | null;
  roles: string[];
  personaLens: string;
  mistakePattern: string;
  interruption: string;
  priority: number;
  mappingWarnings: string[];
  notes: string[];
}

export interface ConfusedHumanPacket {
  runId: string;
  generatedAt: string;
  seed: string;
  candidateCount: number;
  selectedCount: number;
  candidatesBySource: Record<CandidateSource, number>;
  coverageByDomain: Record<string, number>;
  warnings: string[];
  selected: ConfusedHumanRun[];
}

const MISTAKE_PATTERNS = [
  "wrong-first-click",
  "stale-filter",
  "cancel-return",
  "backtrack",
  "double-submit",
  "refresh-mid-flow",
  "permission-probe",
  "context-switch",
  "keyboard-first",
  "impatient-scroll",
];

const INTERRUPTIONS = [
  "back",
  "refresh",
  "cancel",
  "switch-tab",
  "open-notifications",
  "clear-search",
  "change-tab-and-return",
];

const PERSONA_LENSES: Record<string, string[]> = {
  sales: [
    "hurried rep between customer calls",
    "seller copying yesterday's workflow from memory",
    "rep trying to move fast with half-read labels",
  ],
  relationships: [
    "account manager cleaning up stale customer records",
    "sales user looking for one client and clicking the wrong list first",
  ],
  inventory: [
    "inventory lead multitasking between intake and stock checks",
    "warehouse-minded user expecting practical labels over product language",
  ],
  accounting: [
    "accounting manager triaging overdue work under time pressure",
    "finance user checking the wrong ledger first and recovering",
  ],
  operations: [
    "operations lead bouncing between queues and losing context",
    "general manager using memory instead of reading helper copy",
  ],
  default: [
    "capable but distracted user trying to move fast",
    "returning user who assumes the old path still works",
  ],
};

const EXACT_ROLE_MAP = new Map<string, QARole>([
  ["super admin", "SuperAdmin"],
  ["sales manager", "SalesManager"],
  ["sales rep", "SalesRep"],
  ["inventory manager", "InventoryManager"],
  ["warehouse staff", "Fulfillment"],
  ["fulfillment", "Fulfillment"],
  ["accounting manager", "AccountingManager"],
  ["accountant", "AccountingManager"],
  ["auditor", "Auditor"],
]);

const FALLBACK_ROLE_MAP = new Map<
  string,
  { fixtureRole: QARole; warning: string }
>([
  [
    "purchasing manager",
    {
      fixtureRole: "InventoryManager",
      warning:
        "Purchasing Manager is not a first-class QA fixture yet; using InventoryManager fallback",
    },
  ],
  [
    "operations manager",
    {
      fixtureRole: "SuperAdmin",
      warning:
        "Operations Manager is not a first-class QA fixture yet; using SuperAdmin fallback",
    },
  ],
  [
    "customer service",
    {
      fixtureRole: "SalesRep",
      warning:
        "Customer Service is not a first-class QA fixture yet; using SalesRep fallback",
    },
  ],
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashSeed(seed: string): number {
  let hash = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function createRng(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const values = [...items];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function readCsvObjects<T extends Record<string, string>>(
  filePath: string
): T[] {
  const table = parseCsv(readFileSync(filePath, "utf8"));
  const [header = [], ...body] = table;
  return body.map(row => {
    const entry: Record<string, string> = {};
    header.forEach((column, index) => {
      entry[column] = row[index] ?? "";
    });
    return entry as T;
  });
}

function walkFiles(
  rootDir: string,
  matcher: (filePath: string) => boolean
): string[] {
  const found: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) continue;

    for (const name of readdirSync(currentDir)) {
      const nextPath = join(currentDir, name);
      const stats = statSync(nextPath);
      if (stats.isDirectory()) {
        stack.push(nextPath);
        continue;
      }
      if (matcher(nextPath)) {
        found.push(nextPath);
      }
    }
  }

  return found.sort();
}

function splitRoles(rawRoles: string): string[] {
  return rawRoles
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

function mapRole(role: string): { fixtureRole?: QARole; warning?: string } {
  const normalized = role.trim().toLowerCase();
  const exact = EXACT_ROLE_MAP.get(normalized);
  if (exact) {
    return { fixtureRole: exact };
  }

  const fallback = FALLBACK_ROLE_MAP.get(normalized);
  if (fallback) {
    return fallback;
  }

  return {
    warning: `No QA fixture mapping for role "${role}"`,
  };
}

function normalizeDomain(rawDomain: string): string {
  const normalized = rawDomain.trim().toLowerCase();
  if (normalized === "crm" || normalized === "relationships")
    return "relationships";
  if (
    normalized === "demand" ||
    normalized === "sales" ||
    normalized === "orders"
  )
    return "sales";
  if (normalized === "procurement" || normalized === "inventory")
    return "inventory";
  if (normalized === "ops" || normalized === "operations") return "operations";
  if (normalized === "accounting") return "accounting";
  if (normalized === "dashboard") return "operations";
  return normalized || "general";
}

function choosePersonaLens(domain: string, rng: () => number): string {
  const options = PERSONA_LENSES[domain] ?? PERSONA_LENSES.default;
  return (
    options[Math.floor(rng() * options.length)] ?? PERSONA_LENSES.default[0]
  );
}

function scoreCandidate(
  candidate: Omit<ConfusedHumanCandidate, "priority">
): number {
  let score = 1;

  if (candidate.source === "oracle" || candidate.source === "chain") {
    score += 3;
  }

  if (candidate.uiPath) {
    score += 2;
  }

  if (candidate.implementationStatus?.toLowerCase() === "client-wired") {
    score += 2;
  }

  if (candidate.fixtureRoles.length > 0) {
    score += 1;
  }

  if (candidate.mappingWarnings.length > 0) {
    score -= 1;
  }

  return score;
}

function buildMatrixCandidates(rootDir: string): ConfusedHumanCandidate[] {
  const matrixPath = join(rootDir, "docs/reference/USER_FLOW_MATRIX.csv");
  const rows = readCsvObjects<MatrixRow>(matrixPath);

  return rows
    .filter(row => row["Flow Name"] && row["UI Entry Paths"])
    .filter(row => !/background\/scheduled/i.test(row["UI Entry Paths"]))
    .map((row, index) => {
      const roles = splitRoles(row.Roles);
      const mappedRoles = roles.map(mapRole);
      const fixtureRoles = [
        ...new Set(
          mappedRoles.flatMap(item =>
            item.fixtureRole ? [item.fixtureRole] : []
          )
        ),
      ];
      const mappingWarnings = mappedRoles.flatMap(item =>
        item.warning ? [item.warning] : []
      );
      const candidateBase = {
        id: `matrix-${slugify(row.Domain)}-${slugify(row["Flow Name"])}-${index + 1}`,
        domain: normalizeDomain(row.Domain),
        flowName: row["Flow Name"],
        area: row.Entity || row.Domain,
        source: "matrix" as const,
        sourceRef: `matrix:${row["tRPC Procedure"] || row["Flow Name"]}`,
        uiPath: row["UI Entry Paths"] || null,
        roles,
        fixtureRoles,
        mappingWarnings,
        businessPurpose: row["Business Purpose"] || undefined,
        knownIssues: row["Known Issues"] || null,
        implementationStatus: row["Implementation Status"] || null,
      };

      return {
        ...candidateBase,
        priority: scoreCandidate(candidateBase),
      };
    });
}

function buildChainCandidates(rootDir: string): ConfusedHumanCandidate[] {
  const definitionsDir = join(rootDir, "tests-e2e/chains/definitions");
  const chainFiles = walkFiles(definitionsDir, filePath =>
    filePath.endsWith(".ts")
  );
  const candidates: ConfusedHumanCandidate[] = [];

  for (const filePath of chainFiles) {
    const content = readFileSync(filePath, "utf8");
    const chainRegex = /chain_id:\s*"([^"]+)"[\s\S]*?description:\s*"([^"]+)"/g;
    const routeRegex = /route:([^"'\],]+)/;

    let match: RegExpExecArray | null;
    let ordinal = 0;
    while ((match = chainRegex.exec(content)) !== null) {
      ordinal += 1;
      const chainId = match[1];
      const description = match[2];
      const blockStart = match.index;
      const blockEnd = content.indexOf("phases:", blockStart);
      const block =
        blockEnd === -1
          ? content.slice(blockStart, blockStart + 400)
          : content.slice(blockStart, blockEnd);
      const routeMatch = block.match(routeRegex);
      const domain = normalizeDomain(chainId.split(".")[0] ?? "operations");
      const defaultRole =
        domain === "sales"
          ? "SalesManager"
          : domain === "inventory"
            ? "InventoryManager"
            : domain === "accounting"
              ? "AccountingManager"
              : "SuperAdmin";
      const mappingWarnings =
        domain === "operations"
          ? [
              "Operations chains currently use SuperAdmin as the closest QA fixture",
            ]
          : [];
      const candidateBase = {
        id: `chain-${slugify(chainId)}`,
        domain,
        flowName: chainId,
        area: description,
        source: "chain" as const,
        sourceRef: relative(rootDir, filePath),
        uiPath: routeMatch ? `/${routeMatch[1].replace(/^\/+/, "")}` : null,
        roles: [defaultRole],
        fixtureRoles: [defaultRole as QARole],
        mappingWarnings,
        businessPurpose: description,
        knownIssues: null,
        implementationStatus: "Anchored by chain definition",
      };
      candidates.push({
        ...candidateBase,
        priority: scoreCandidate(candidateBase) + (ordinal === 1 ? 1 : 0),
      });
    }
  }

  return candidates;
}

function buildOracleCandidates(rootDir: string): ConfusedHumanCandidate[] {
  const oraclesDir = join(rootDir, "tests-e2e/oracles");
  const oracleFiles = walkFiles(oraclesDir, filePath =>
    filePath.endsWith(".oracle.yaml")
  );

  return oracleFiles.map((filePath, index) => {
    const content = readFileSync(filePath, "utf8");
    const flowId =
      content.match(/flow_id:\s*"([^"]+)"/)?.[1] ?? relative(rootDir, filePath);
    const description =
      content.match(/description:\s*"([^"]+)"/)?.[1] ?? flowId;
    const role = (content.match(/role:\s*"([^"]+)"/)?.[1] ??
      "SuperAdmin") as QARole;
    const domain = normalizeDomain(
      relative(oraclesDir, filePath).split("/")[0] ?? "operations"
    );
    const candidateBase = {
      id: `oracle-${slugify(flowId)}-${index + 1}`,
      domain,
      flowName: flowId,
      area: description,
      source: "oracle" as const,
      sourceRef: relative(rootDir, filePath),
      uiPath: null,
      roles: [role],
      fixtureRoles: [role],
      mappingWarnings: [],
      businessPurpose: description,
      knownIssues: null,
      implementationStatus: "Anchored by oracle definition",
    };

    return {
      ...candidateBase,
      priority: scoreCandidate(candidateBase),
    };
  });
}

function buildSelectedRuns(
  candidates: ConfusedHumanCandidate[],
  count: number,
  seed: string
): ConfusedHumanRun[] {
  const rng = createRng(seed);
  const selected: ConfusedHumanCandidate[] = [];
  const chosenIds = new Set<string>();

  const byDomain = new Map<string, ConfusedHumanCandidate[]>();
  for (const candidate of candidates) {
    const bucket = byDomain.get(candidate.domain) ?? [];
    bucket.push(candidate);
    byDomain.set(candidate.domain, bucket);
  }

  for (const [, bucket] of [...byDomain.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    if (selected.length >= count) break;
    const best = [...bucket].sort((left, right) => {
      if (right.priority !== left.priority)
        return right.priority - left.priority;
      return left.id.localeCompare(right.id);
    })[0];
    if (best && !chosenIds.has(best.id)) {
      selected.push(best);
      chosenIds.add(best.id);
    }
  }

  const remaining = shuffle(
    candidates
      .filter(candidate => !chosenIds.has(candidate.id))
      .sort((left, right) => {
        if (right.priority !== left.priority)
          return right.priority - left.priority;
        return left.id.localeCompare(right.id);
      }),
    rng
  );

  for (const candidate of remaining) {
    if (selected.length >= count) break;
    selected.push(candidate);
    chosenIds.add(candidate.id);
  }

  return selected.slice(0, count).map((candidate, index) => {
    const fixtureRole = candidate.fixtureRoles[0] ?? null;
    const notes: string[] = [];
    if (candidate.businessPurpose) {
      notes.push(candidate.businessPurpose);
    }
    if (candidate.knownIssues) {
      notes.push(`Known issues: ${candidate.knownIssues}`);
    }

    return {
      runId: `${seed}-run-${String(index + 1).padStart(2, "0")}`,
      ordinal: index + 1,
      domain: candidate.domain,
      flowName: candidate.flowName,
      area: candidate.area,
      source: candidate.source,
      sourceRef: candidate.sourceRef,
      uiPath: candidate.uiPath,
      fixtureRole,
      roles: candidate.roles,
      personaLens: choosePersonaLens(candidate.domain, rng),
      mistakePattern:
        MISTAKE_PATTERNS[Math.floor(rng() * MISTAKE_PATTERNS.length)] ??
        MISTAKE_PATTERNS[0],
      interruption:
        INTERRUPTIONS[Math.floor(rng() * INTERRUPTIONS.length)] ??
        INTERRUPTIONS[0],
      priority: candidate.priority,
      mappingWarnings: candidate.mappingWarnings,
      notes,
    };
  });
}

export function buildConfusedHumanPacket(
  options: Pick<GeneratorOptions, "rootDir" | "count" | "seed">
): ConfusedHumanPacket {
  const matrixCandidates = buildMatrixCandidates(options.rootDir);
  const chainCandidates = buildChainCandidates(options.rootDir);
  const oracleCandidates = buildOracleCandidates(options.rootDir);
  const candidates = [
    ...matrixCandidates,
    ...chainCandidates,
    ...oracleCandidates,
  ];
  const selected = buildSelectedRuns(candidates, options.count, options.seed);
  const warnings = [...new Set(selected.flatMap(run => run.mappingWarnings))];

  const coverageByDomain = selected.reduce<Record<string, number>>(
    (acc, run) => {
      acc[run.domain] = (acc[run.domain] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return {
    runId: `${new Date().toISOString().slice(0, 10)}-human-qa-${options.seed}`,
    generatedAt: new Date().toISOString(),
    seed: options.seed,
    candidateCount: candidates.length,
    selectedCount: selected.length,
    candidatesBySource: {
      matrix: matrixCandidates.length,
      chain: chainCandidates.length,
      oracle: oracleCandidates.length,
    },
    coverageByDomain,
    warnings,
    selected,
  };
}

export function validateConfusedHumanPacket(packet: ConfusedHumanPacket): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (packet.candidateCount <= 0) {
    errors.push("Candidate rows must be greater than zero.");
  }
  if (packet.selectedCount <= 0) {
    errors.push("Generated runs must be greater than zero.");
  }
  if (packet.selected.length !== packet.selectedCount) {
    errors.push("selectedCount does not match selected array length.");
  }
  if (!packet.seed) {
    errors.push("Seed is required.");
  }

  return { valid: errors.length === 0, errors };
}

export function writePacketJson(
  packet: ConfusedHumanPacket,
  outputPath: string
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(packet, null, 2));
}

export function renderPacketText(packet: ConfusedHumanPacket): string {
  const lines = [
    `Run ID: ${packet.runId}`,
    `Seed: ${packet.seed}`,
    `Candidate rows: ${packet.candidateCount}`,
    `Generated runs: ${packet.selectedCount}`,
    "",
  ];

  for (const run of packet.selected) {
    lines.push(
      `${run.ordinal}. [${run.domain}] ${run.flowName}`,
      `   Source: ${run.source} (${run.sourceRef})`,
      `   UI: ${run.uiPath ?? "No direct UI path recorded"}`,
      `   Fixture: ${run.fixtureRole ?? "Unmapped"}`,
      `   Persona lens: ${run.personaLens}`,
      `   Mistake pattern: ${run.mistakePattern}`,
      `   Interruption: ${run.interruption}`,
      `   Roles: ${run.roles.join(", ") || "Unknown"}`,
      ...run.mappingWarnings.map(warning => `   Warning: ${warning}`),
      ...run.notes.map(note => `   Note: ${note}`),
      ""
    );
  }

  if (packet.warnings.length > 0) {
    lines.push("Warnings:");
    for (const warning of packet.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function readFlagValue(argv: string[], flagName: string): string | undefined {
  const index = argv.indexOf(flagName);
  if (index === -1) return undefined;
  return argv[index + 1];
}

export function parseGeneratorArgs(argv: string[]): GeneratorOptions {
  const seed =
    readFlagValue(argv, "--seed") ??
    new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = Number(readFlagValue(argv, "--count") ?? "12");
  const format = (readFlagValue(argv, "--format") ??
    "text") as FlowPacketFormat;
  const output = readFlagValue(argv, "--output");

  return {
    rootDir: process.cwd(),
    count: Number.isFinite(count) && count > 0 ? count : 12,
    seed,
    format: format === "json" ? "json" : "text",
    output,
  };
}
