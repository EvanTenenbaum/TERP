import path from "node:path";
import {
  collectWorktreePressure,
  formatTimestamp,
  gateDocPathForGate,
  inferActiveGate,
  readTer795State,
  readText,
  relativeRepoPath,
  repoRoot,
  roadmapPathForGate,
  writeGeneratedFile,
} from "./orders-runtime-status-lib.mjs";

const state = readTer795State();
const activeGate = inferActiveGate();
const activeGateDocPath = gateDocPathForGate(activeGate);
const activeRoadmapPath = roadmapPathForGate(activeGate);
const activeGateDoc = readText(activeGateDocPath);
const activeRoadmap = readText(activeRoadmapPath);
const activeGateStatus = extractInlineValue(activeGateDoc, "Status");
const activeGateLinear = extractInlineValue(activeGateDoc, "Linear gate");
const activeGateNext = extractInlineValue(activeGateDoc, "Next");
const worktreePressure = collectWorktreePressure();
const evidencePaths =
  activeGate === "G2"
    ? state.evidence_paths || []
    : [
        relativeRepoPath(activeGateDocPath),
        relativeRepoPath(activeRoadmapPath),
        relativeRepoPath(path.join(repoRoot, "docs/specs/spreadsheet-native-foundation/orders-runtime/Documentation.md")),
        relativeRepoPath(path.join(repoRoot, "docs/specs/spreadsheet-native-foundation/orders-runtime/02-proof-row-map.csv")),
      ];
const terpWorkspaceRoot = path.resolve(repoRoot, "..", "..");
const targetPath = path.join(
  repoRoot,
  "docs/specs/spreadsheet-native-foundation/orders-runtime/ACTIVE_GATE_STATUS.md",
);

const activeBlockerSummary =
  activeGate === "G2"
    ? buildG2BlockerSummary(state)
    : `${activeGate} is the active gate. TER-795 / G2 is already \`${state.gate_verdict}\`, so current blockers and required proof now live in \`${relativeRepoPath(activeGateDocPath)}\` and \`${relativeRepoPath(activeRoadmapPath)}\`.`;

const nextUnblockLines =
  activeGate === "G2"
    ? [
        `- Next row: \`${state.next_move.row ?? "none"}\``,
        `- Next command: ${state.next_move.command_hint}`,
        `- Cadence rule: ${state.next_move.cadence_rule}`,
      ]
    : [
        `- Next focus: ${activeGateNext || `follow \`${relativeRepoPath(activeGateDocPath)}\` for the current open tranche.`}`,
        `- TER-795 state: \`${state.gate_verdict}\` with \`${state.remaining_rows.length}\` remaining rows.`,
        `- Cadence rule: Do not spend more TER-795 proof budget unless a new regression reopens G2; use ${activeGate}-specific proof artifacts for the active surfacing lane.`,
      ];

const lines = [
  "# Orders Runtime Active Gate Status",
  "",
  "_Generated file. Do not edit by hand._",
  "",
  `- Generated at: \`${formatTimestamp()}\``,
  `- Active gate: \`${activeGate}\``,
  `- Linear gate: \`${activeGateLinear || state.linear_gate}\``,
  `- Status: \`${activeGate === "G2" ? state.gate_verdict : activeGateStatus || "open"}\``,
  `- Active atomic card: \`${activeGate === "G2" ? state.active_atomic_card : "see active gate roadmap"}\``,
  `- Current build: \`${state.build.id}\``,
  `- Route: \`${state.build.route}\``,
  "",
  "## Use This Before Global Session Tracking",
  "",
  "For the Orders runtime initiative, this file is a local generated snapshot to check before `docs/ACTIVE_SESSIONS.md` when it is present or freshly regenerated.",
  "It is generated from `ter-795-state.json`, the synced gate artifacts, and current worktree state.",
  "Source of truth for repeated TER-795 row status, build truth, and next move is `ter-795-state.json`; gate narrative and tracker state still live in the synced gate doc and Linear.",
  "",
  "## Gate Snapshot",
  "",
  "- Scope: shared selection runtime, clipboard/fill contracts, edit navigation, row ops, and environment hardening.",
  `- Repo-backed execution contract: \`${relativeRepoPath(activeGateDocPath)}\` plus \`${relativeRepoPath(activeRoadmapPath)}\``,
  `- Active-gate operating model: \`1 coordinator + up to 2 read-only sidecars + at most 1 narrow writer\``,
  "",
  "## Current Blocker",
  "",
  activeBlockerSummary,
  "",
  "## Next Unblock",
  "",
  ...nextUnblockLines,
  "",
  "## Runtime Guards",
  "",
  `- Live-proven G2 rows: ${formatRowSummary(state.accepted_live_rows)}.`,
  `- TER-796 seal rule: keep \`TER-796\` sealed unless an isolated row-op rerun proves a real regression.`,
  `- SALE-ORD-022 guard: keep the closure packet honest; the probe proves shipped-route propagation, not a separate reload or persistence round-trip.`,
  `- SALE-ORD-031 guard: keep \`SALE-ORD-031\` partial until a live Orders document surface exercises sort/filter.`,
  `- TER-795 closure: keep G2 closed unless a new regression reopens one of the classified rows.`,
  "",
  "## Validation Commands",
  "",
  ...state.validation_commands.targeted.map((command) => `- \`${command}\``),
  ...state.validation_commands.ship.map((command) => `- \`${command}\``),
  "",
  "## Evidence Artifacts Present",
  "",
  ...(evidencePaths.length
    ? evidencePaths.map((item) => `- \`${formatEvidencePath(item)}\``)
    : ["- No evidence artifacts resolved from the current gate doc."]),
  "",
  "## Worktree Pressure",
  "",
  `- Total worktrees: \`${worktreePressure.worktreeCount}\``,
  `- Dirty worktrees: \`${worktreePressure.dirtyCount}\``,
  `- Dirty worktrees with 5+ entries: \`${worktreePressure.dirty5PlusCount}\``,
  `- Current worktree dirty entries excluding generator-owned outputs: \`${worktreePressure.currentWorktree?.dirtyCount ?? 0}\``,
  "",
  "Top dirty worktrees:",
  ...worktreePressure.dirtiest.map(
    (entry) =>
      `- \`${entry.dirtyCount}\` dirty -> \`${formatWorktreePath(entry.path)}\`${entry.branch ? ` (\`${entry.branch}\`)` : ""}`,
  ),
  "",
  "## Source Inputs",
  "",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`",
  `- \`${relativeRepoPath(activeGateDocPath)}\``,
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`",
  "- `docs/roadmaps/orders-spreadsheet-runtime/README.md`",
];

writeGeneratedFile(targetPath, `${lines.join("\n")}\n`);
console.log(targetPath);

function formatRowSummary(rows) {
  if (!rows?.length) {
    return "none";
  }
  return rows.map((row) => `\`${row}\``).join(", ");
}

function formatEvidencePath(filePath) {
  const absolutePath = path.resolve(repoRoot, filePath);
  return absolutePath.startsWith(repoRoot) ? relativeRepoPath(absolutePath) : filePath;
}

function buildG2BlockerSummary(currentState) {
  if (currentState.remaining_rows?.length) {
    return `${formatRowSummary(currentState.remaining_rows)} still need a closure packet or explicit limitation packet. \`SALE-ORD-031\` also stays partial until a live sort/filter surface exists.`;
  }

  return `No TER-795 rows remain in the active repair queue. G2 is \`${currentState.gate_verdict}\`, while any deferred blockers are documented as classified evidence rather than open gate blockers.`;
}

function formatWorktreePath(worktreePath) {
  const absolutePath = path.resolve(worktreePath);
  if (absolutePath.startsWith(terpWorkspaceRoot)) {
    return path.relative(terpWorkspaceRoot, absolutePath).replaceAll(path.sep, "/");
  }
  return absolutePath;
}

function extractInlineValue(markdown, label) {
  const match = markdown.match(new RegExp(`^- ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s+(?:\`([^\\n]+)\`|(.+))$`, "m"));
  return match ? (match[1] || match[2] || "").trim() : "";
}
