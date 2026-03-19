import path from "node:path";
import {
  collectWorktreePressure,
  existingEvidencePaths,
  formatTimestamp,
  loadOrdersRuntimeContext,
  parseManifestRuntimeGuardrails,
  relativeRepoPath,
  repoRoot,
  writeGeneratedFile,
} from "./orders-runtime-status-lib.mjs";

const context = loadOrdersRuntimeContext();
const worktreePressure = collectWorktreePressure();
const evidencePaths = existingEvidencePaths(context.evidenceItems);
const runtimeGuardrails = parseManifestRuntimeGuardrails(
  context.manifest.latest_verification?.live_blocker?.next_required_runtime_check || "",
);
const nextCommand =
  runtimeGuardrails.nextCommand ||
  context.nextUnblock.match(/`([^`]*proof:staging:orders-fill-handle[^`]*)`/)?.[1] ||
  "";
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
  `- Active gate: \`${context.activeGate}\``,
  `- Linear gate: \`${context.linearGate}\``,
  `- Status: \`${context.status}\``,
  `- Active atomic card: \`${context.manifest.latest_verification?.active_atomic_card || "unknown"}\``,
  `- Current build: \`${context.manifest.latest_verification?.live_blocker?.build_id || "unknown"}\``,
  `- Route: \`${context.manifest.latest_verification?.live_blocker?.route || "unknown"}\``,
  "",
  "## Use This Before Global Session Tracking",
  "",
  "For the Orders runtime initiative, this file is a local generated snapshot to check before `docs/ACTIVE_SESSIONS.md` when it is present or freshly regenerated.",
  "It is generated from the active gate artifacts, the issue manifest, execution metrics, and current worktree state.",
  "Source of truth stays with the gate doc, issue manifest, execution metrics, and Linear.",
  "",
  "## Gate Snapshot",
  "",
  `- Scope: ${context.scope}`,
  `- Repo-backed execution contract: \`${relativeRepoPath(context.gateDocPath)}\` plus \`docs/roadmaps/orders-spreadsheet-runtime/README.md\``,
  `- Active-gate operating model: \`1 coordinator + up to 2 read-only sidecars + at most 1 narrow writer\``,
  "",
  "## Current Blocker",
  "",
  context.manifest.latest_verification?.live_blocker?.summary || "No live blocker summary recorded.",
  "",
  "## Next Unblock",
  "",
  ...(nextCommand ? [`- Next command: \`${nextCommand}\``] : ["- Next command: none recorded."]),
  `- Gate doc narrative: ${context.nextUnblock || "No gate-doc next unblock recorded."}`,
  "",
  "## Runtime Guards",
  "",
  ...(runtimeGuardrails.liveProvenRows
    ? [`- Live-proven rows only: ${runtimeGuardrails.liveProvenRows}.`]
    : ["- Live-proven rows only: not explicitly recorded in the manifest."]),
  ...(runtimeGuardrails.ter796SealRule
    ? [`- TER-796 seal rule: ${runtimeGuardrails.ter796SealRule}.`]
    : []),
  ...(runtimeGuardrails.saleOrd022Rule
    ? [`- SALE-ORD-022 guard: ${runtimeGuardrails.saleOrd022Rule}.`]
    : []),
  ...(runtimeGuardrails.saleOrd031Rule
    ? [`- SALE-ORD-031 guard: ${runtimeGuardrails.saleOrd031Rule}.`]
    : []),
  ...(runtimeGuardrails.nextIndependentRow
    ? [`- Next independent TER-795 row: ${runtimeGuardrails.nextIndependentRow}.`]
    : []),
  ...(runtimeGuardrails.limitationFallback
    ? [`- Limitation fallback: ${runtimeGuardrails.limitationFallback}.`]
    : []),
  "",
  "## Validation Commands",
  "",
  ...context.validationCommands.map((command) => `- \`${command}\``),
  "",
  "## Evidence Artifacts Present",
  "",
  ...(evidencePaths.length
    ? evidencePaths.map((item) => `- \`${item}\``)
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
    (entry) => `- \`${entry.dirtyCount}\` dirty -> \`${entry.path}\`${entry.branch ? ` (\`${entry.branch}\`)` : ""}`,
  ),
  "",
  "## Source Inputs",
  "",
  `- \`${relativeRepoPath(context.gateDocPath)}\``,
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`",
  "- `docs/roadmaps/orders-spreadsheet-runtime/README.md`",
];

writeGeneratedFile(targetPath, `${lines.join("\n")}\n`);
console.log(targetPath);
