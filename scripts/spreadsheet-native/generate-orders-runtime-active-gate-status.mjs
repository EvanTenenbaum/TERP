import path from "node:path";
import {
  collectWorktreePressure,
  formatTimestamp,
  readTer795State,
  relativeRepoPath,
  repoRoot,
  writeGeneratedFile,
} from "./orders-runtime-status-lib.mjs";

const state = readTer795State();
const worktreePressure = collectWorktreePressure();
const evidencePaths = state.evidence_paths || [];
const terpWorkspaceRoot = path.resolve(repoRoot, "..", "..");
const targetPath = path.join(
  repoRoot,
  "docs/specs/spreadsheet-native-foundation/orders-runtime/ACTIVE_GATE_STATUS.md",
);

const lines = [
  "# Orders Runtime Active Gate Status",
  "",
  "_Generated file. Do not edit by hand._",
  "",
  `- Generated at: \`${formatTimestamp()}\``,
  `- Active gate: \`${state.gate}\``,
  `- Linear gate: \`${state.linear_gate}\``,
  `- Status: \`${state.gate_verdict}\``,
  `- Active atomic card: \`${state.active_atomic_card}\``,
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
  "- Repo-backed execution contract: `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md` plus `docs/roadmaps/orders-spreadsheet-runtime/README.md`",
  `- Active-gate operating model: \`1 coordinator + up to 2 read-only sidecars + at most 1 narrow writer\``,
  "",
  "## Current Blocker",
  "",
  `${formatRowSummary(state.remaining_rows)} still need a closure packet or explicit limitation packet. \`SALE-ORD-031\` also stays partial until a live sort/filter surface exists.`,
  "",
  "## Next Unblock",
  "",
  `- Next row: \`${state.next_move.row}\``,
  `- Next command: ${state.next_move.command_hint}`,
  `- Cadence rule: ${state.next_move.cadence_rule}`,
  "",
  "## Runtime Guards",
  "",
  `- Live-proven rows only: ${formatRowSummary(state.accepted_live_rows)}.`,
  `- TER-796 seal rule: keep \`TER-796\` sealed unless an isolated row-op rerun proves a real regression.`,
  `- SALE-ORD-022 guard: keep the closure packet honest; the probe proves shipped-route propagation, not a separate reload or persistence round-trip.`,
  `- SALE-ORD-031 guard: keep \`SALE-ORD-031\` partial until a live Orders document surface exercises sort/filter.`,
  `- Next independent TER-795 row: move to \`${state.next_move.row}\` next.`,
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
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`",
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

function formatWorktreePath(worktreePath) {
  const absolutePath = path.resolve(worktreePath);
  if (absolutePath.startsWith(terpWorkspaceRoot)) {
    return path.relative(terpWorkspaceRoot, absolutePath).replaceAll(path.sep, "/");
  }
  return absolutePath;
}
