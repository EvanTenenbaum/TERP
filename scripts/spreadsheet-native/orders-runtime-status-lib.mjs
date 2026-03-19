import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "..", "..");
export const ordersRuntimeDir = path.join(
  repoRoot,
  "docs/specs/spreadsheet-native-foundation/orders-runtime",
);
export const roadmapReadmePath = path.join(
  repoRoot,
  "docs/roadmaps/orders-spreadsheet-runtime/README.md",
);
export const implementPath = path.join(ordersRuntimeDir, "Implement.md");
export const manifestPath = path.join(ordersRuntimeDir, "01-issue-manifest.json");
export const metricsPath = path.join(ordersRuntimeDir, "execution-metrics.json");
export const ter795StatePath = path.join(ordersRuntimeDir, "ter-795-state.json");
export const proofRowMapPath = path.join(ordersRuntimeDir, "02-proof-row-map.csv");
export const g2GatePath = path.join(ordersRuntimeDir, "G2-runtime-gate.md");
export const roadmapG2Path = path.join(
  repoRoot,
  "docs/roadmaps/orders-spreadsheet-runtime/roadmap-1-g2-shared-runtime-foundation.md",
);
export const reviewContextJsonPath = path.join(ordersRuntimeDir, "adversarial-review-context.json");
export const reviewContextMarkdownPath = path.join(ordersRuntimeDir, "adversarial-review-context.md");

export function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

export function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

export function readTer795State() {
  return readJson(ter795StatePath);
}

function collectIndentedBullets(lines, startPrefix) {
  const startIndex = lines.findIndex((line) => line.startsWith(startPrefix));
  if (startIndex === -1) {
    return [];
  }

  const collected = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("  - ")) {
      const value = line.replace(/^  - /, "").trim();
      collected.push(value.replace(/^`(.+)`$/, "$1"));
      continue;
    }
    if (line.startsWith("- ") || line.trim() === "") {
      break;
    }
    break;
  }
  return collected;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractInlineValue(markdown, label) {
  const match = markdown.match(
    new RegExp(`^- ${escapeRegex(label)}:\\s+(?:\`([^\\n]+)\`|(.+))$`, "m"),
  );
  return match ? (match[1] || match[2] || "").trim() : "";
}

export function inferActiveGate() {
  const implement = readText(implementPath);
  const activeTranche = implement.match(/Active tranche:\s*`(G\d+)`/);
  if (activeTranche) {
    return activeTranche[1];
  }

  const roadmap = readText(roadmapReadmePath);
  const currentPartial = roadmap.match(/\|\s*`1`\s*\|.*\|\s*`(G\d+)`\s*\|.*\|\s*`partial`\s*\|/);
  return currentPartial ? currentPartial[1] : "G2";
}

export function loadOrdersRuntimeContext() {
  const activeGate = inferActiveGate();
  const gateDocPath = path.join(ordersRuntimeDir, `${activeGate}-runtime-gate.md`);
  const gateMarkdown = readText(gateDocPath);
  const gateLines = gateMarkdown.split("\n");
  const manifest = readJson(manifestPath);
  const metrics = readJson(metricsPath);
  const roadmap = readText(roadmapReadmePath);

  const evidenceItems = collectIndentedBullets(gateLines, "- Evidence list:");
  const validationCommands = collectIndentedBullets(gateLines, "- Validation commands:");
  const blockerItems = collectIndentedBullets(gateLines, "- Current blocker:");
  const nextUnblockMatch = gateMarkdown.match(/^- Next unblock:\s+(.+)$/m);
  const statusMatch = gateMarkdown.match(/^- Status:\s+`([^`]+)`/m);

  return {
    activeGate,
    gateDocPath,
    gateMarkdown,
    manifest,
    metrics,
    roadmap,
    scope: extractInlineValue(gateMarkdown, "Scope"),
    linearGate: extractInlineValue(gateMarkdown, "Linear gate"),
    status: statusMatch ? statusMatch[1] : "",
    evidenceItems,
    validationCommands,
    blockerItems,
    nextUnblock: nextUnblockMatch ? nextUnblockMatch[1].trim() : "",
  };
}

function parseWorktreeList(raw) {
  const entries = [];
  const blocks = raw.trim().split("\n\n").filter(Boolean);
  for (const block of blocks) {
    const entry = {};
    for (const line of block.split("\n")) {
      const [key, ...rest] = line.split(" ");
      entry[key] = rest.join(" ");
    }
    if (entry.worktree) {
      entries.push(entry);
    }
  }
  return entries;
}

const GENERATED_IGNORE_PATTERNS = [
  "docs/specs/spreadsheet-native-foundation/orders-runtime/ACTIVE_GATE_STATUS.md",
  "docs/specs/spreadsheet-native-foundation/orders-runtime/PROOF_BUDGET.md",
  "output/",
];

function parseStatusEntries(output) {
  if (!output.trim()) {
    return [];
  }

  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const pathSlice = line.startsWith("??") ? line.slice(3) : line.slice(3);
      return {
        line,
        relativePath: pathSlice.trim(),
      };
    });
}

function shouldIgnoreGeneratedStatus(relativePath) {
  return GENERATED_IGNORE_PATTERNS.some((pattern) => relativePath === pattern || relativePath.startsWith(pattern));
}

function dirtyEntriesForWorktree(worktreePath) {
  const output = execFileSync("git", ["-C", worktreePath, "status", "--short"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return parseStatusEntries(output).filter((entry) => !shouldIgnoreGeneratedStatus(entry.relativePath));
}

export function collectWorktreePressure() {
  const porcelain = execFileSync("git", ["worktree", "list", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const entries = parseWorktreeList(porcelain).map((entry) => {
    const dirtyEntries = dirtyEntriesForWorktree(entry.worktree);
    return {
      path: entry.worktree,
      branch: entry.branch || "",
      dirtyCount: dirtyEntries.length,
      isCurrent: path.resolve(entry.worktree) === path.resolve(repoRoot),
    };
  });

  const dirtyEntries = entries.filter((entry) => entry.dirtyCount > 0);
  const current = entries.find((entry) => entry.isCurrent) || null;
  const dirtiest = [...dirtyEntries]
    .sort((left, right) => right.dirtyCount - left.dirtyCount)
    .slice(0, 5)
    .map((entry) => ({
      path: entry.path,
      branch: entry.branch,
      dirtyCount: entry.dirtyCount,
    }));

  return {
    worktreeCount: entries.length,
    dirtyCount: dirtyEntries.length,
    dirty5PlusCount: dirtyEntries.filter((entry) => entry.dirtyCount >= 5).length,
    currentWorktree: current,
    dirtiest,
  };
}

export function parseManifestRuntimeGuardrails(nextRequiredRuntimeCheck) {
  if (!nextRequiredRuntimeCheck) {
    return {
      liveProvenRows: "",
      ter796SealRule: "",
      saleOrd022Rule: "",
      saleOrd031Rule: "",
      nextIndependentRow: "",
      nextCommand: "",
      limitationFallback: "",
    };
  }

  const liveProvenRows =
    nextRequiredRuntimeCheck.match(/Keep (.+?) as the only G2 rows currently safe to treat as live-proven/i)?.[1] || "";
  const ter796SealRule = nextRequiredRuntimeCheck.match(/(keep TER-796 sealed)/i)?.[1] || "";
  const saleOrd022Rule =
    nextRequiredRuntimeCheck.match(/(treat SALE-ORD-022[^.]+)\./i)?.[1] || "";
  const saleOrd031Rule =
    nextRequiredRuntimeCheck.match(/(keep SALE-ORD-031[^.]+)\./i)?.[1] || "";
  const nextIndependentRow =
    nextRequiredRuntimeCheck.match(/(move to SALE-ORD-019[^.]+)\./i)?.[1] || "";
  const nextCommand =
    nextRequiredRuntimeCheck.match(/`([^`]*proof:staging:orders-fill-handle[^`]*)`/)?.[1] || "";
  const limitationFallback =
    nextRequiredRuntimeCheck.match(/(freeze SALE-ORD-022[^.]+)\./i)?.[1] || "";

  return {
    liveProvenRows,
    ter796SealRule,
    saleOrd022Rule,
    saleOrd031Rule,
    nextIndependentRow,
    nextCommand,
    limitationFallback,
  };
}

export function relativeRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}

export function existingEvidencePaths(items) {
  return items
    .map((item) => item.match(/`([^`]+)`/)?.[1] || item)
    .filter((item) => item.includes("/"))
    .filter((item) => existsSync(path.join(repoRoot, item)));
}

export function formatTimestamp(date = new Date()) {
  return date.toISOString();
}

export function writeGeneratedFile(targetPath, content) {
  writeFileSync(targetPath, content, "utf8");
}

export function replaceMarkedBlock(text, marker, replacement) {
  const startToken = `<!-- ${marker}:START -->`;
  const endToken = `<!-- ${marker}:END -->`;
  const startIndex = text.indexOf(startToken);
  const endIndex = text.indexOf(endToken);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Missing marker block ${marker}.`);
  }

  const before = text.slice(0, startIndex + startToken.length);
  const after = text.slice(endIndex);
  return `${before}\n${replacement.trimEnd()}\n${after}`;
}
