import path from "node:path";
import {
  formatTimestamp,
  loadOrdersRuntimeContext,
  parseManifestRuntimeGuardrails,
  relativeRepoPath,
  repoRoot,
  writeGeneratedFile,
} from "./orders-runtime-status-lib.mjs";

const context = loadOrdersRuntimeContext();
const runtimeGuardrails = parseManifestRuntimeGuardrails(
  context.manifest.latest_verification?.live_blocker?.next_required_runtime_check || "",
);
const targetPath = path.join(
  repoRoot,
  "docs/specs/spreadsheet-native-foundation/orders-runtime/PROOF_BUDGET.md",
);

const notes = context.metrics.notes || [];
const narrowProbeValidated = notes.find((note) =>
  note.includes("narrow probe was validated once against the current staging build"),
);
const localFillProof = notes.find((note) =>
  note.includes("local sheet-native fill drag probe records"),
);
const nextRuntimeCheck =
  context.manifest.latest_verification?.live_blocker?.next_required_runtime_check ||
  context.nextUnblock ||
  "No next runtime check recorded.";
const cheapestCommand =
  runtimeGuardrails.nextCommand ||
  "PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle";

const lines = [
  "# Orders Runtime Proof Budget",
  "",
  "_Generated file. Advisory only. Do not edit by hand._",
  "",
  `- Generated at: \`${formatTimestamp()}\``,
  `- Active gate: \`${context.activeGate}\``,
  `- Linear gate: \`${context.linearGate}\``,
  `- Active atomic card: \`${context.manifest.latest_verification?.active_atomic_card || "unknown"}\``,
  `- Current build: \`${context.manifest.latest_verification?.live_blocker?.build_id || "unknown"}\``,
  "",
  "## Budget State",
  "",
  "- Remaining fresh deployed-build reruns: `1`",
  "  Spend it only on a fresh deployed build or after a new isolated TER-795 proof/runtime change.",
  "- Broad G2 proof bundle: `spent`",
  "  The broader Orders runtime packet already proved queue-route health, duplicate, quick-add, delete, and keyboard navigation. Do not rerun it for the current TER-795 fill tranche.",
  "- Narrow fill-handle probe on the current build: `spent on current build`",
  `  ${narrowProbeValidated || "The narrow fill-handle probe has already been exercised on the current deployed build."}`,
  "- Local proofability: `green locally, not yet green on a deployed build`",
  `  ${localFillProof || "The local writer worktree has already browser-proved the repaired vertical fill path."}`,
  "",
  "## Cheapest Next Probe",
  "",
  `- Command: \`${cheapestCommand}\``,
  `- Rule: ${nextRuntimeCheck}`,
  "",
  "## Guardrails",
  "",
  `- Keep \`TER-796\` sealed${runtimeGuardrails.ter796SealRule ? "." : " unless an isolated row-op rerun proves a real regression."}`,
  ...(runtimeGuardrails.saleOrd022Rule
    ? [`- SALE-ORD-022 guard: ${runtimeGuardrails.saleOrd022Rule}.`]
    : []),
  ...(runtimeGuardrails.saleOrd031Rule
    ? [`- SALE-ORD-031 guard: ${runtimeGuardrails.saleOrd031Rule}.`]
    : []),
  ...(runtimeGuardrails.nextIndependentRow
    ? [`- Next independent TER-795 row: ${runtimeGuardrails.nextIndependentRow}.`]
    : []),
  "- Do not reopen the broad G2 staging bundle for the current fill tranche.",
  `- If the next fresh deployed-build pass still fails, ${runtimeGuardrails.limitationFallback || "freeze `SALE-ORD-022` as an explicit limitation packet before moving to the remaining TER-795 rows"}.`,
  "- Treat this file as advisory only; source-of-truth updates still belong in the gate doc, manifest, metrics, and Linear.",
  "",
  "## Source Inputs",
  "",
  `- \`${relativeRepoPath(context.gateDocPath)}\``,
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`",
  "- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`",
];

writeGeneratedFile(targetPath, `${lines.join("\n")}\n`);
console.log(targetPath);
