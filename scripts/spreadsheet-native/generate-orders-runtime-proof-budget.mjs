import path from "node:path";
import {
  formatTimestamp,
  readTer795State,
  repoRoot,
  writeGeneratedFile,
} from "./orders-runtime-status-lib.mjs";

const state = readTer795State();
const targetPath = path.join(
  repoRoot,
  "docs/specs/spreadsheet-native-foundation/orders-runtime/PROOF_BUDGET.md",
);

const lines = [
  "# Orders Runtime Proof Budget",
  "",
  "_Generated file. Advisory only. Do not edit by hand._",
  "",
  `- Generated at: \`${formatTimestamp()}\``,
  `- Active gate: \`${state.gate}\``,
  `- Linear gate: \`${state.linear_gate}\``,
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
  `- Next row: \`${state.next_move.row}\``,
  `- Command shape: ${state.next_move.command_hint}`,
  `- Rule: ${state.next_move.cadence_rule}`,
  "",
  "## Guardrails",
  "",
  "- Keep `TER-796` sealed unless an isolated row-op rerun proves a real regression.",
  "- Keep `SALE-ORD-022` closed with evidence, but preserve the no-reload persistence caveat.",
  "- Keep `SALE-ORD-031` partial until a live Orders document surface exercises sort/filter.",
  `- Move to \`${state.next_move.row}\` next and keep row scope isolated.`,
  "- Treat this file as advisory only; `ter-795-state.json` is the machine-readable source for repeated TER-795 row status and next-move truth.",
  "",
  "## Source Inputs",
  "",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`",
];

writeGeneratedFile(targetPath, `${lines.join("\n")}\n`);
console.log(targetPath);
