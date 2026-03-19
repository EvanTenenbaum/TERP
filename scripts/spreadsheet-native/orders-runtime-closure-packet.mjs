import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./orders-runtime-status-lib.mjs";

function sha256File(filePath) {
  if (!filePath || !existsSync(filePath)) {
    return null;
  }

  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function relativeArtifactPath(filePath) {
  if (!filePath) {
    return null;
  }

  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(repoRoot)) {
    return resolved;
  }
  return path.relative(repoRoot, resolved).replaceAll(path.sep, "/");
}

function artifactRecord(filePath) {
  if (!filePath) {
    return null;
  }

  return {
    relative_path: relativeArtifactPath(filePath),
    sha256: sha256File(filePath),
  };
}

function assertion(id, label, passed, expected, observed, failureImpact = "blocker") {
  return {
    id,
    label,
    passed,
    expected,
    observed,
    failure_impact: failureImpact,
  };
}

function suggestedVerdict(assertions) {
  const blockingFailures = assertions.filter(
    (item) => item.failure_impact === "blocker" && !item.passed,
  );
  return blockingFailures.length ? "partial" : "closed with evidence";
}

function parseSelectionSummary(selectionSummary) {
  const normalized = String(selectionSummary || "");
  const selectedCellCount = Number(normalized.match(/(\d+) selected cells/i)?.[1] || 0);
  const selectedRowCount = Number(normalized.match(/(\d+) rows in scope/i)?.[1] || 0);

  return {
    selectedCellCount,
    selectedRowCount,
    hasDiscontiguousSelection: /discontiguous selection/i.test(normalized),
  };
}

function parseRangeCount(selectionState) {
  const normalized = String(selectionState || "");
  const rangeCount = Number(normalized.match(/Ranges:\s*(\d+)/i)?.[1] || 0);
  return {
    rangeCount,
    hasFocusedCell: /Focused cell:\s*(?!none)/i.test(normalized),
  };
}

export function buildFillHandleClosurePacket({
  report,
  reportPath,
  rowId = "SALE-ORD-022",
  issue = "TER-771",
  deployCommit = null,
  persona = "sales-manager",
  priorReviewConclusion = null,
  latestReviewLabel = null,
  reloadPersistence = {
    status: "not_run",
    note: "The narrow fill-handle probe does not include a separate reload or persistence round-trip.",
  },
}) {
  const assertions = [
    assertion(
      "two-cell-range",
      "Range selection formed before drag",
      Boolean(String(report.selectionSummaryBeforeDrag || "").match(/\b2 selected cells\b/i)),
      "Selection summary reports 2 selected cells before drag.",
      report.selectionSummaryBeforeDrag || "missing",
    ),
    assertion(
      "fill-handle-visible",
      "Native fill handle is visible",
      Boolean(report.fillHandleVisible),
      "The native `.ag-fill-handle` is visible after selecting the source range.",
      report.fillHandleVisible ? "visible" : "not visible",
    ),
    assertion(
      "drag-lifecycle",
      "Drag lifecycle entered",
      Boolean(String(report.bodyClassDuringDrag || "").includes("ag-dragging-fill-handle")),
      "`body.className` contains `ag-dragging-fill-handle` during the drag.",
      report.bodyClassDuringDrag || "missing",
    ),
    assertion(
      "series-propagated",
      "Quantity series propagated to the target rows",
      report.dragApplied === true,
      "Quantity values after drag equal `3,4,5,6`.",
      Array.isArray(report.quantityValuesAfterDrag) ? report.quantityValuesAfterDrag.join(",") : "missing",
    ),
    assertion(
      "license-clean",
      "No AG Grid license warnings were recorded",
      Array.isArray(report.licenseWarnings) && report.licenseWarnings.length === 0,
      "No license warnings are emitted during the probe.",
      Array.isArray(report.licenseWarnings) ? report.licenseWarnings : ["missing"],
    ),
    assertion(
      "page-clean",
      "No page errors were recorded",
      Array.isArray(report.pageErrors) && report.pageErrors.length === 0,
      "No page errors are emitted during the probe.",
      Array.isArray(report.pageErrors) ? report.pageErrors : ["missing"],
    ),
  ];

  return {
    schema_version: 1,
    gate: "G2",
    row_id: rowId,
    issue,
    generated_at: new Date().toISOString(),
    command: "PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle",
    suggested_verdict: suggestedVerdict(assertions),
    acceptance_criteria: "Deployed-build proof that quantity fill propagates `3,4 -> 5,6` on the real Orders document route or an explicit limitation packet.",
    build: {
      id: report.version?.commit || null,
      deploy_commit: deployCommit,
      deployment_build_time: report.version?.buildTime || null,
    },
    route: report.route,
    persona,
    assertions,
    optional_checks: {
      reload_persistence: reloadPersistence,
    },
    artifacts: {
      report: artifactRecord(reportPath),
      screenshot: artifactRecord(report.screenshotPath),
    },
    summary: {
      selection_summary_before_drag: report.selectionSummaryBeforeDrag,
      selection_summary_after_drag: report.selectionSummaryAfterDrag,
      quantity_values_before_drag: report.quantityValuesBeforeDrag,
      quantity_values_after_drag: report.quantityValuesAfterDrag,
      ag_grid_warnings: report.agGridWarnings || [],
      page_errors: report.pageErrors || [],
    },
    prior_review: priorReviewConclusion
      ? {
          label: latestReviewLabel,
          conclusion: priorReviewConclusion,
        }
      : null,
  };
}

export function buildOrdersRuntimeG2ClosurePacket({
  report,
  reportPath,
  deployCommit = null,
  persona = "sales-manager",
}) {
  const tabNavigationPassed =
    report.documentRoute?.selectionStateAfterTab &&
    report.documentRoute?.selectionStateAfterShiftTab &&
    report.documentRoute?.selectionStateAfterEnter &&
    report.documentRoute?.selectionStateAfterShiftEnter &&
    report.documentRoute?.escapeRestoredValue === true;
  const rowOpsPassed =
    report.documentRoute?.duplicateDelta === 1 &&
    report.documentRoute?.quickAddDelta === 1 &&
    report.documentRoute?.deleteReturnedToBaseline === true;

  const assertions = [
    assertion(
      "queue-route-clean",
      "Queue route loads without AG Grid license blockers",
      !report.queueRoute?.loadingShellVisible &&
        Array.isArray(report.queueRoute?.licenseWarnings) &&
        report.queueRoute.licenseWarnings.length === 0,
      "Queue route renders without loading shell or license warnings.",
      {
        loading_shell_visible: report.queueRoute?.loadingShellVisible,
        license_warnings: report.queueRoute?.licenseWarnings || [],
      },
    ),
    assertion(
      "row-ops",
      "Duplicate, quick-add, and delete row operations complete and restore baseline",
      rowOpsPassed === true,
      "duplicateDelta=1, quickAddDelta=1, and deleteReturnedToBaseline=true.",
      {
        duplicate_delta: report.documentRoute?.duplicateDelta,
        quick_add_delta: report.documentRoute?.quickAddDelta,
        delete_returned_to_baseline: report.documentRoute?.deleteReturnedToBaseline,
      },
    ),
    assertion(
      "navigation",
      "Tab, Shift+Tab, Enter, Shift+Enter, and Escape behave through the shared runtime",
      tabNavigationPassed === true,
      "The document-route navigation states are all recorded and Escape restores the prior value.",
      {
        selection_after_tab: report.documentRoute?.selectionStateAfterTab,
        selection_after_shift_tab: report.documentRoute?.selectionStateAfterShiftTab,
        selection_after_enter: report.documentRoute?.selectionStateAfterEnter,
        selection_after_shift_enter: report.documentRoute?.selectionStateAfterShiftEnter,
        escape_restored_value: report.documentRoute?.escapeRestoredValue,
      },
    ),
  ];

  return {
    schema_version: 1,
    gate: "G2",
    packet_id: "orders-runtime-g2-bundle",
    generated_at: new Date().toISOString(),
    command: "pnpm proof:staging:orders-runtime:g2",
    suggested_verdict: suggestedVerdict(assertions),
    covered_rows: [
      {
        row_id: "SALE-ORD-030",
        row_state: tabNavigationPassed ? "live-proven" : "partial",
        acceptance_criteria: "Tab, Shift+Tab, Enter, Shift+Enter, and Escape proof on staging.",
      },
      {
        row_id: "SALE-ORD-032",
        row_state: rowOpsPassed ? "live-proven" : "partial",
        acceptance_criteria: "Duplicate, quick-add, and delete row-operation proof on staging.",
      },
    ],
    build: {
      id: report.version?.commit || null,
      deploy_commit: deployCommit,
      deployment_build_time: report.version?.buildTime || null,
    },
    route: report.documentRoute?.route || report.queueRoute?.route || null,
    persona,
    assertions,
    artifacts: {
      report: artifactRecord(reportPath),
      screenshots: Array.isArray(report.documentRoute?.screenshotPaths)
        ? report.documentRoute.screenshotPaths.map((item) => artifactRecord(item)).filter(Boolean)
        : [],
    },
    summary: {
      duplicate_delta: report.documentRoute?.duplicateDelta,
      quick_add_delta: report.documentRoute?.quickAddDelta,
      delete_returned_to_baseline: report.documentRoute?.deleteReturnedToBaseline,
      add_item_focused_inventory_search: report.documentRoute?.addItemFocusedInventorySearch,
      queue_license_warnings: report.queueRoute?.licenseWarnings || [],
      document_license_warnings: report.documentRoute?.licenseWarnings || [],
      page_errors: report.documentRoute?.pageErrors || [],
    },
  };
}

export function buildSelectionClosurePacket({
  report,
  reportPath,
  rowId = "SALE-ORD-019",
  issue = "TER-770",
  deployCommit = null,
  persona = "sales-manager",
}) {
  const queueDragSummary = parseSelectionSummary(report.queueRoute?.dragRange?.summary);
  const queueDragState = parseRangeCount(report.queueRoute?.dragRange?.state);
  const queueDiscontiguousSummary = parseSelectionSummary(
    report.queueRoute?.discontiguousRange?.summary,
  );
  const queueDiscontiguousState = parseRangeCount(
    report.queueRoute?.discontiguousRange?.state,
  );
  const queueColumnSummary = parseSelectionSummary(report.queueRoute?.columnScope?.summary);
  const queueGridSummary = parseSelectionSummary(report.queueRoute?.gridScope?.summary);
  const documentShiftSummary = parseSelectionSummary(
    report.documentRoute?.shiftRange?.summary,
  );
  const documentShiftState = parseRangeCount(report.documentRoute?.shiftRange?.state);
  const supportSurfaceSummary = parseSelectionSummary(
    report.supportSurface?.focusedSelection?.summary,
  );
  const supportSurfaceState = parseRangeCount(report.supportSurface?.focusedSelection?.state);

  const assertions = [
    assertion(
      "queue-drag-range",
      "Queue drag-selection forms a contiguous multi-row range",
      queueDragSummary.selectedCellCount >= 6 &&
        queueDragSummary.selectedRowCount >= 2 &&
        queueDragState.rangeCount === 1,
      "Queue drag-selection yields one contiguous rectangular range across at least two rows.",
      report.queueRoute?.dragRange || null,
    ),
    assertion(
      "document-shift-range",
      "Document Shift-range selection remains live through the shared runtime",
      documentShiftSummary.selectedCellCount >= 3 &&
        documentShiftSummary.selectedRowCount >= 3 &&
        documentShiftState.rangeCount === 1,
      "Document Shift-range selection yields at least 3 selected cells across 3 rows with one range.",
      report.documentRoute?.shiftRange || null,
    ),
    assertion(
      "queue-discontiguous",
      "Queue Cmd-click builds a discontiguous selection",
      queueDiscontiguousSummary.selectedCellCount >= 2 &&
        queueDiscontiguousSummary.selectedRowCount >= 2 &&
        queueDiscontiguousSummary.hasDiscontiguousSelection === true &&
        queueDiscontiguousState.rangeCount === 2,
      "Queue Cmd-click yields a discontiguous selection with two ranges.",
      report.queueRoute?.discontiguousRange || null,
    ),
    assertion(
      "queue-column-scope",
      "Queue column-header selection scopes one full column",
      queueColumnSummary.selectedRowCount >= 2 &&
        queueColumnSummary.selectedCellCount === queueColumnSummary.selectedRowCount,
      "Column-header selection yields one selected cell per row across the visible queue.",
      report.queueRoute?.columnScope || null,
    ),
    assertion(
      "queue-grid-scope",
      "Queue Cmd+A scopes the current grid",
      queueGridSummary.selectedRowCount >= 2 &&
        queueGridSummary.selectedCellCount > queueGridSummary.selectedRowCount,
      "Cmd+A yields a full-grid selection with more selected cells than selected rows.",
      report.queueRoute?.gridScope || null,
    ),
    assertion(
      "support-surface-visible",
      "Support surface renders visible cells and emits selection state",
      Number(report.supportSurface?.visibleCellCount || 0) >= 4 &&
        supportSurfaceSummary.selectedCellCount === 1 &&
        supportSurfaceSummary.selectedRowCount === 1 &&
        supportSurfaceState.rangeCount === 1,
      "Support surface shows at least four visible cells and emits focused single-cell selection state.",
      report.supportSurface || null,
    ),
    assertion(
      "license-clean",
      "No AG Grid license warnings were recorded",
      Array.isArray(report.licenseWarnings) && report.licenseWarnings.length === 0,
      "No license warnings are emitted during the probe.",
      Array.isArray(report.licenseWarnings) ? report.licenseWarnings : ["missing"],
    ),
    assertion(
      "page-clean",
      "No page errors were recorded",
      Array.isArray(report.pageErrors) && report.pageErrors.length === 0,
      "No page errors are emitted during the probe.",
      Array.isArray(report.pageErrors) ? report.pageErrors : ["missing"],
    ),
  ];

  return {
    schema_version: 1,
    gate: "G2",
    row_id: rowId,
    issue,
    generated_at: new Date().toISOString(),
    command: `PLAYWRIGHT_BASE_URL=${report.baseUrl} pnpm proof:staging:orders-selection`,
    suggested_verdict: suggestedVerdict(assertions),
    acceptance_criteria:
      "Queue drag-range, document Shift-range, Cmd discontiguous selection, and scope-selection proof on the live Orders surfaces.",
    build: {
      id: report.version?.commit || null,
      deploy_commit: deployCommit,
      deployment_build_time: report.version?.buildTime || null,
    },
    route: {
      queue: report.queueRoute?.route || null,
      document: report.documentRoute?.route || null,
    },
    persona,
    assertions,
    artifacts: {
      report: artifactRecord(reportPath),
      screenshots: Array.isArray(report.screenshotPaths)
        ? report.screenshotPaths.map((item) => artifactRecord(item)).filter(Boolean)
        : [],
    },
    summary: {
      queue_drag_range: report.queueRoute?.dragRange || null,
      queue_discontiguous_range: report.queueRoute?.discontiguousRange || null,
      queue_column_scope: report.queueRoute?.columnScope || null,
      queue_grid_scope: report.queueRoute?.gridScope || null,
      document_shift_range: report.documentRoute?.shiftRange || null,
      support_surface: report.supportSurface || null,
      ag_grid_warnings: report.agGridWarnings || [],
      page_errors: report.pageErrors || [],
    },
  };
}
