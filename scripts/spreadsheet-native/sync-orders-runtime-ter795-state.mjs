import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  g2GatePath,
  implementPath,
  proofRowMapPath,
  readTer795State,
  readText,
  relativeRepoPath,
  replaceMarkedBlock,
  reviewContextJsonPath,
  reviewContextMarkdownPath,
  roadmapG2Path,
  repoRoot,
  ter795StatePath,
  writeGeneratedFile,
} from "./orders-runtime-status-lib.mjs";
import {
  buildFillHandleClosurePacket,
  buildOrdersRuntimeG2ClosurePacket,
} from "./orders-runtime-closure-packet.mjs";

function formatRowList(rows) {
  if (!rows.length) {
    return "none";
  }
  if (rows.length === 1) {
    return `\`${rows[0]}\``;
  }
  if (rows.length === 2) {
    return `\`${rows[0]}\` and \`${rows[1]}\``;
  }
  return `${rows.slice(0, -1).map((row) => `\`${row}\``).join(", ")}, and \`${rows.at(-1)}\``;
}

function relativeOrAbsolute(filePath) {
  if (!filePath) {
    return null;
  }
  const resolved = path.resolve(filePath);
  return resolved.startsWith(repoRoot) ? relativeRepoPath(resolved) : resolved;
}

function toBulletLines(items, formatter = (item) => item) {
  return items.map((item) => `  - ${formatter(item)}`);
}

function loadJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function writePacketIfPossible(packetPath, builder) {
  const absolutePacketPath = path.join(repoRoot, packetPath);
  const packet = builder();
  if (!packet) {
    return null;
  }
  writeGeneratedFile(absolutePacketPath, `${JSON.stringify(packet, null, 2)}\n`);
  return packet;
}

function syncClosurePackets(state) {
  const fillReportRelativePath =
    "output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-report.json";
  const g2ReportRelativePath =
    "output/playwright/orders-runtime-g2/2026-03-18/orders-runtime-g2-report.json";
  const latestReview = state.review_context?.prior_reviews?.at(-1) || null;

  if (existsSync(path.join(repoRoot, fillReportRelativePath))) {
    writePacketIfPossible(
      "output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-closure-packet.json",
      () =>
        buildFillHandleClosurePacket({
          report: loadJson(fillReportRelativePath),
          reportPath: path.join(repoRoot, fillReportRelativePath),
          deployCommit: state.build.deploy_commit,
          persona: state.build.persona,
          priorReviewConclusion: latestReview?.conclusion || null,
          latestReviewLabel: latestReview?.review_label || null,
        }),
    );
  }

  if (existsSync(path.join(repoRoot, g2ReportRelativePath))) {
    writePacketIfPossible(
      "output/playwright/orders-runtime-g2/2026-03-18/orders-runtime-g2-closure-packet.json",
      () =>
        buildOrdersRuntimeG2ClosurePacket({
          report: loadJson(g2ReportRelativePath),
          reportPath: path.join(repoRoot, g2ReportRelativePath),
          deployCommit: state.build.deploy_commit,
          persona: state.build.persona,
        }),
    );
  }
}

function syncProofRowMap(state) {
  const byRow = new Map(state.row_verdicts.map((item) => [item.row, item]));
  const lines = readText(proofRowMapPath).trimEnd().split("\n");
  const csvEscape = (value) => {
    const normalized = String(value ?? "");
    if (!normalized.includes(",") && !normalized.includes("\"")) {
      return normalized;
    }
    return `"${normalized.replaceAll("\"", "\"\"")}"`;
  };
  const nextLines = lines.map((line, index) => {
    if (index === 0) {
      return line;
    }
    const cells = line.match(/("([^"]|"")*"|[^,]+)/g) || [];
    const [row, ownerClass, currentState, gate, primaryIssue, requiredEvidence] = cells.map((cell) =>
      cell?.startsWith("\"") ? cell.slice(1, -1).replaceAll("\"\"", "\"") : cell,
    );
    const rowState = byRow.get(row);
    if (!rowState) {
      return line;
    }
    return [
      row,
      ownerClass,
      rowState.row_state,
      gate,
      primaryIssue,
      rowState.required_evidence || requiredEvidence,
    ]
      .map(csvEscape)
      .join(",");
  });
  writeGeneratedFile(proofRowMapPath, `${nextLines.join("\n")}\n`);
}

function buildGateSection(state) {
  const partialRows = state.remaining_rows || [];
  const hasRemainingRows = partialRows.length > 0;
  const evidenceLines = [
    ...toBulletLines(state.evidence_paths, (item) => `\`${relativeOrAbsolute(item)}\``),
    ...toBulletLines(
      [
        hasRemainingRows
          ? `current atomic-card truth: \`TER-794\` and \`TER-796\` are closed with evidence; \`TER-795\` remains partial on ${formatRowList(partialRows)}`
          : "current atomic-card truth: `TER-794`, `TER-795`, and `TER-796` are all closed with evidence",
      ],
      (item) => item,
    ),
  ];
  const validationLines = [
    ...toBulletLines(state.validation_commands.targeted, (item) => `\`${item}\``),
    ...toBulletLines(state.validation_commands.ship, (item) => `\`${item}\``),
  ];
  const blockerLines = [
    `  - staging build \`${state.build.id}\` is the current live reference build, backed by deployment \`${state.build.deployment_id}\` for commit \`${state.build.deploy_commit}\``,
    `  - ${formatRowList(state.accepted_live_rows)} are now the only G2 rows safe to treat as directly live-proven from staging evidence`,
    `  - \`SALE-ORD-022\` is closed with evidence via the narrow fill probe packet at \`${relativeOrAbsolute(state.row_verdicts.find((row) => row.row === "SALE-ORD-022")?.packet_path)}\``,
    `  - \`SALE-ORD-031\` stays partial with a code-proven limitation because the live Orders document grid still disables sort/filter`,
    hasRemainingRows
      ? `  - the remaining unresolved TER-795 rows are ${formatRowList(partialRows)}`
      : "  - no TER-795 rows remain unresolved; deferred blocker rows are classified and no longer hold G2 open",
  ];

  return [
    "- Evidence list:",
    ...evidenceLines,
    "- Validation commands:",
    ...validationLines,
    "- Current blocker:",
    ...blockerLines,
    hasRemainingRows
      ? `- G2 remains partial because ${formatRowList(partialRows)} still need a closure packet or explicit limitation packet`
      : "- G2 is closed with evidence because all 9 TER-795 rows are now classified and any remaining blockers are explicitly documented as deferred, non-gate-blocking evidence.",
    `- Status: \`${state.gate_verdict}\``,
    hasRemainingRows
      ? `- Next unblock: keep \`${state.active_atomic_card}\` active, keep \`SALE-ORD-031\` partial with its limitation note, and move to \`${state.next_move.row}\` as the next independent TER-795 row. Do not reopen \`TER-796\` unless a future isolated row-op rerun reproduces a real regression.`
      : "- Next unblock: keep TER-795 sealed, do not reopen TER-796 unless a future isolated row-op rerun reproduces a real regression, and move active execution to the G5 surfacing gate.",
  ].join("\n");
}

function buildImplementSnapshot(state) {
  return [
    `- Updated at: \`${state.updated_at}\``,
    `- Active atomic card: \`${state.active_atomic_card}\``,
    `- Live reference build: \`${state.build.id}\` via deployment \`${state.build.deployment_id}\` for commit \`${state.build.deploy_commit}\``,
    `- Directly live-proven G2 rows: ${formatRowList(state.accepted_live_rows)}`,
    `- Remaining TER-795 rows: ${formatRowList(state.remaining_rows)}`,
    `- Next move: \`${state.next_move.row ?? "none"}\` — ${state.next_move.summary}`,
    `- Cadence rule: ${state.next_move.cadence_rule}`,
  ].join("\n");
}

function buildRepairQueue(state) {
  return state.repair_queue.map((item) => `  - ${item}`).join("\n");
}

function buildRoadmapStatusBlock(state) {
  return [
    "- Gate: `G2`",
    "- Linear gate: `TER-788`",
    `- Current verdict: \`${state.gate_verdict}\``,
    `- Execution state: \`${state.execution_state}\``,
    "- Prerequisites: Roadmap 0 `closed with evidence`",
    "- Gate file: [G2-runtime-gate.md](../../specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md)",
  ].join("\n");
}

function buildCurrentTruth(state) {
  return state.current_truth.map((item) => `- ${item}`).join("\n");
}

function buildReviewContext(state) {
  const packetSummaries = state.row_verdicts
    .filter((row) => row.packet_path && existsSync(path.join(repoRoot, row.packet_path)))
    .map((row) => {
      const packet = loadJson(row.packet_path);
      return {
        row: row.row,
        row_state: row.row_state,
        packet_path: row.packet_path,
        suggested_verdict: packet.suggested_verdict,
        command: packet.command,
        assertions: packet.assertions?.map((item) => ({
          id: item.id,
          label: item.label,
          passed: item.passed,
        })),
      };
    });

  const jsonPayload = {
    generated_at: new Date().toISOString(),
    source_state: relativeRepoPath(ter795StatePath),
    active_atomic_card: state.active_atomic_card,
    gate_verdict: state.gate_verdict,
    build: state.build,
    accepted_live_rows: state.accepted_live_rows,
    remaining_rows: state.remaining_rows,
    next_move: state.next_move,
    acceptance_rows: state.review_context?.acceptance_rows || [],
    prior_reviews: state.review_context?.prior_reviews || [],
    packet_summaries: packetSummaries,
  };

  const markdownLines = [
    "# Orders Runtime Adversarial Review Context",
    "",
    "_Generated from `ter-795-state.json`. Attach this context before bounded adversarial reviews._",
    "",
    `- Active atomic card: \`${state.active_atomic_card}\``,
    `- Gate verdict: \`${state.gate_verdict}\``,
    `- Live reference build: \`${state.build.id}\` via deployment \`${state.build.deployment_id}\``,
    `- Deploy commit: \`${state.build.deploy_commit}\``,
    `- Persona: \`${state.build.persona}\``,
    `- Next move: \`${state.next_move.row ?? "none"}\` — ${state.next_move.summary}`,
    "",
    "## Accepted Rows",
    "",
    ...state.accepted_live_rows.map((row) => `- \`${row}\``),
    "",
    "## Remaining Rows",
    "",
    ...(state.remaining_rows.length
      ? state.remaining_rows.map((row) => `- \`${row}\``)
      : ["- none"]),
    "",
    "## Acceptance Criteria",
    "",
    ...(state.review_context?.acceptance_rows || []).map(
      (item) => `- \`${item.row}\`: ${item.acceptance}`,
    ),
    "",
    "## Prior Review Conclusions",
    "",
    ...(state.review_context?.prior_reviews || []).map(
      (item) => `- \`${item.review_label || "prior review"}\`: ${item.conclusion}`,
    ),
    "",
    "## Probe Packets",
    "",
    ...(packetSummaries.length
      ? packetSummaries.map(
          (item) =>
            `- \`${item.row}\` -> \`${relativeOrAbsolute(item.packet_path)}\` (${item.suggested_verdict})`,
        )
      : ["- No packet summaries are currently available."]),
  ];

  writeGeneratedFile(reviewContextJsonPath, `${JSON.stringify(jsonPayload, null, 2)}\n`);
  writeGeneratedFile(reviewContextMarkdownPath, `${markdownLines.join("\n")}\n`);
}

function syncGate(state) {
  const next = replaceMarkedBlock(
    readText(g2GatePath),
    "GENERATED:TER-795:GATE",
    buildGateSection(state),
  );
  writeGeneratedFile(g2GatePath, next);
}

function syncImplement(state) {
  let next = replaceMarkedBlock(
    readText(implementPath),
    "GENERATED:TER-795:IMPLEMENT-SNAPSHOT",
    buildImplementSnapshot(state),
  );
  next = replaceMarkedBlock(next, "GENERATED:TER-795:REPAIR-QUEUE", buildRepairQueue(state));
  writeGeneratedFile(implementPath, next);
}

function syncRoadmap(state) {
  let next = replaceMarkedBlock(
    readText(roadmapG2Path),
    "GENERATED:TER-795:ROADMAP-STATUS",
    buildRoadmapStatusBlock(state),
  );
  next = replaceMarkedBlock(next, "GENERATED:TER-795:ROADMAP-TRUTH", buildCurrentTruth(state));
  writeGeneratedFile(roadmapG2Path, next);
}

function main() {
  const state = readTer795State();
  syncClosurePackets(state);
  syncProofRowMap(state);
  syncGate(state);
  syncImplement(state);
  syncRoadmap(state);
  buildReviewContext(state);

  console.log(
    JSON.stringify(
      {
        state: relativeRepoPath(ter795StatePath),
        gate: relativeRepoPath(g2GatePath),
        implement: relativeRepoPath(implementPath),
        roadmap: relativeRepoPath(roadmapG2Path),
        proof_row_map: relativeRepoPath(proofRowMapPath),
        review_context: relativeRepoPath(reviewContextMarkdownPath),
      },
      null,
      2,
    ),
  );
}

main();
