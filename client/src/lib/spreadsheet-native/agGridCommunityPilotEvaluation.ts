export type RuntimeProofStatus = "pass" | "conditional-pass" | "fail";

export interface RuntimeProofScenario {
  id:
    | "multi-table-coordination"
    | "keyboard-first-flow"
    | "guarded-paste-and-bulk-edit"
    | "safe-fill-behavior"
    | "locked-cells-by-permission"
    | "dropdown-and-autocomplete-editors"
    | "validation-presentation"
    | "inspector-integration"
    | "deep-linkable-selection-state"
    | "pilot-scale-performance";
  status: RuntimeProofStatus;
  rationale: string;
}

export interface RuntimeProofEvaluation {
  runtime: "ag-grid-community";
  scope: string;
  evaluatedAt: string;
  overallDecision: "go" | "conditional-go" | "no-go";
  scenarios: RuntimeProofScenario[];
  reopenTriggers: string[];
}

export const agGridCommunityPilotEvaluation: RuntimeProofEvaluation = {
  runtime: "ag-grid-community",
  scope:
    "Inventory registry sheet and Orders queue sheet only. Document-sheet composer replacement stays out of this runtime closure.",
  evaluatedAt: "2026-03-14",
  overallDecision: "conditional-go",
  scenarios: [
    {
      id: "multi-table-coordination",
      status: "pass",
      rationale:
        "The pilot surfaces coordinate one primary AG Grid with supporting tables and right-rail context driven by shared selected-record query params.",
    },
    {
      id: "keyboard-first-flow",
      status: "pass",
      rationale:
        "Row navigation, selection, and focus remain keyboard-usable through AG Grid defaults plus explicit command-strip actions.",
    },
    {
      id: "guarded-paste-and-bulk-edit",
      status: "conditional-pass",
      rationale:
        "Bulk edit is preserved through explicit command-strip actions. Raw spreadsheet-style paste is intentionally not exposed as a primary pilot affordance yet.",
    },
    {
      id: "safe-fill-behavior",
      status: "fail",
      rationale:
        "AG Grid Community does not provide the fill-handle/range-selection behavior required for full spreadsheet-native drag-fill parity.",
    },
    {
      id: "locked-cells-by-permission",
      status: "pass",
      rationale:
        "Pilot surfaces keep editability scoped to approved columns and gate state-changing actions by permission before interaction.",
    },
    {
      id: "dropdown-and-autocomplete-editors",
      status: "pass",
      rationale:
        "Pilot inventory status editing uses in-grid select editors, and linked composer-side lookup editors remain in the existing order document flow.",
    },
    {
      id: "validation-presentation",
      status: "pass",
      rationale:
        "Status bars, inspector messaging, disabled actions, and linked handoffs preserve explicit readiness and blocked-state visibility.",
    },
    {
      id: "inspector-integration",
      status: "pass",
      rationale:
        "Selected rows drive dedicated inspector/detail surfaces without forcing a route change or page swap.",
    },
    {
      id: "deep-linkable-selection-state",
      status: "pass",
      rationale:
        "Both pilots persist the active record in the workbook URL through `batchId` and `orderId` query params.",
    },
    {
      id: "pilot-scale-performance",
      status: "conditional-pass",
      rationale:
        "The pilot surfaces cap primary grids at bounded page sizes and reuse existing query contracts, but this still requires live browser proof on staging-like data.",
    },
  ],
  reopenTriggers: [
    "Replacing the create-order composer with a true document-sheet editor",
    "Adding drag-fill or range-selection as a user-facing promise",
    "Promoting raw clipboard paste to a primary editing path",
  ],
};
