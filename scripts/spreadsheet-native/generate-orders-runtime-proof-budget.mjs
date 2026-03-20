import path from "node:path";
import {
  formatTimestamp,
  gateDocPathForGate,
  inferActiveGate,
  readTer795State,
  readText,
  repoRoot,
  roadmapPathForGate,
  writeGeneratedFile,
} from "./orders-runtime-status-lib.mjs";

const state = readTer795State();
const activeGate = inferActiveGate();
const activeGateDocPath = gateDocPathForGate(activeGate);
const activeRoadmapPath = roadmapPathForGate(activeGate);
const activeGateDoc = readText(activeGateDocPath);
const activeGateLinear = extractInlineValue(activeGateDoc, "Linear gate");
const targetPath = path.join(
  repoRoot,
  "docs/specs/spreadsheet-native-foundation/orders-runtime/PROOF_BUDGET.md",
);

const nextProbeLines =
  state.remaining_rows.length > 0
    ? [
        `- Next row: \`${state.next_move.row ?? "none"}\``,
        `- Command shape: ${state.next_move.command_hint}`,
        `- Rule: ${state.next_move.cadence_rule}`,
      ]
    : [
        "- Next row: `none`",
        `- Command shape: Do not spend more TER-795 proof budget unless a regression reopens G2. Move active execution to \`${activeGate}\` via \`${path.relative(repoRoot, activeRoadmapPath).replaceAll(path.sep, "/")}\`.`,
        "- Rule: Keep TER-795 closed with evidence and use active-gate-specific proof artifacts for the next tranche.",
      ];

const lines = [
  "# Orders Runtime Proof Budget",
  "",
  "_Generated file. Advisory only. Do not edit by hand._",
  "",
  `- Generated at: \`${formatTimestamp()}\``,
  `- Active gate: \`${activeGate}\``,
  `- Linear gate: \`${activeGateLinear || state.linear_gate}\``,
  `- Active atomic card: \`${state.active_atomic_card}\``,
  `- Current build: \`${state.build.id}\``,
  "",
  "## Budget State",
  "",
  `- Remaining fresh deployed-build reruns: \`${state.proof_budget.fresh_deployed_reruns_remaining}\``,
  "  Spend it only after a new isolated runtime change or a new shipped build that changes the target row.",
  `- Broad G2 proof bundle: \`${state.proof_budget.broad_g2_bundle}\``,
  "  The broader Orders runtime packet already proved queue-route health plus the currently accepted row-op lanes. Do not reopen it for unrelated TER-795 rows.",
  `- Narrow fill-handle probe on the current build: \`${state.proof_budget.narrow_fill_probe}\``,
  "  The current shipped-build closure packet already covers `SALE-ORD-022`.",
  `- Local proofability: \`${state.proof_budget.local_proofability}\``,
  "  Use local probes to shape the next row packet before spending a live run.",
  "",
  "## Cheapest Next Probe",
  "",
  ...nextProbeLines,
  "",
  "## Guardrails",
  "",
  "- Keep `TER-796` sealed unless an isolated row-op rerun proves a real regression.",
  "- Keep `SALE-ORD-022` closed with evidence, but preserve the no-reload persistence caveat.",
  "- Keep `SALE-ORD-031` partial until a live Orders document surface exercises sort/filter.",
  `- Keep G2 / TER-795 \`${state.gate_verdict}\` unless a new regression reopens one of the classified rows.`,
  "- Treat this file as advisory only; `ter-795-state.json` is the machine-readable source for repeated TER-795 row status and next-move truth.",
  "",
  "## Source Inputs",
  "",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`",
  `- \`${path.relative(repoRoot, activeGateDocPath).replaceAll(path.sep, "/")}\``,
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`",
];

writeGeneratedFile(targetPath, `${lines.join("\n")}\n`);
console.log(targetPath);

function extractInlineValue(markdown, label) {
  const match = markdown.match(new RegExp(`^- ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s+(?:\`([^\\n]+)\`|(.+))$`, "m"));
  return match ? (match[1] || match[2] || "").trim() : "";
}
