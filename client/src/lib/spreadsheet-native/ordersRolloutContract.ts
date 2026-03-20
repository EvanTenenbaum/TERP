import type { OrdersRolloutRequirementRecord } from "@shared/spreadsheetNativeContracts";

export const ordersRolloutRequirements: OrdersRolloutRequirementRecord[] = [
  {
    requirementId: "ORD-WF-001",
    group: "workflow-parity",
    userOutcome: "Find and assess the right order quickly.",
    userVisibleBehavior:
      "The Orders queue supports browse, filter, deep-link selection, and stable queue posture.",
    surface: "orders-queue",
    ownerClass: "orders-owned",
    implementationSource: "OrdersSheetPilotSurface queue mode",
    proofSource: "SALE-ORD-001 / SALE-ORD-002",
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    releaseStatus: "live-proven",
    linkedCapabilityIds: ["SALE-ORD-001", "SALE-ORD-002"],
  },
  {
    requirementId: "ORD-WF-002",
    group: "workflow-parity",
    userOutcome:
      "Keep support tables and inspectors synchronized with the active order.",
    userVisibleBehavior:
      "Linked line-items, status history, audit context, and inspector content stay aligned to the focused order.",
    surface: "orders-support-grid",
    ownerClass: "orders-owned",
    implementationSource: "OrdersSheetPilotSurface linked detail and inspector",
    proofSource: "SALE-ORD-002 / SALE-ORD-007",
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    releaseStatus: "live-proven",
    linkedCapabilityIds: ["SALE-ORD-002", "SALE-ORD-007"],
  },
  {
    requirementId: "ORD-WF-003",
    group: "workflow-parity",
    userOutcome: "Create and edit drafts without leaving sheet-native Orders.",
    userVisibleBehavior:
      "The Orders document sheet handles new draft creation, draft reopening, and in-place editing.",
    surface: "orders-document-grid",
    ownerClass: "orders-owned",
    implementationSource:
      "OrderCreatorPage mounted inside sheet-native Orders document mode",
    proofSource: "SALE-ORD-003 / SALE-ORD-004",
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-003", "SALE-ORD-004"],
  },
  {
    requirementId: "ORD-WF-004",
    group: "workflow-parity",
    userOutcome: "Save work safely and finalize only when ready.",
    userVisibleBehavior:
      "Autosave, save-state, unsaved-change protection, and finalize guardrails remain visible and trustworthy.",
    surface: "orders-document-grid",
    ownerClass: "orders-owned",
    implementationSource: "OrderCreatorPage save-state and finalize flow",
    proofSource: "SALE-ORD-005 / SALE-ORD-017",
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-005", "SALE-ORD-017"],
  },
  {
    requirementId: "ORD-WF-005",
    group: "workflow-parity",
    userOutcome:
      "Start from seeded business context instead of re-entering work.",
    userVisibleBehavior:
      "Quote, client, need, and sales-sheet entry paths open into the sheet-native document with the right context.",
    surface: "orders-document-grid",
    ownerClass: "orders-owned",
    implementationSource:
      "SalesWorkspacePage redirect plus OrderCreatorPage route hydration",
    proofSource: "SALE-ORD-016 / SALE-ORD-018",
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-016", "SALE-ORD-018"],
  },
  {
    requirementId: "ORD-WF-006",
    group: "workflow-parity",
    userOutcome:
      "Manage draft lifecycle safely from the sheet-native workflow.",
    userVisibleBehavior:
      "Users can reopen, delete, and confirm drafts from sheet-native Orders without unsafe fallback.",
    surface: "cross-surface",
    ownerClass: "orders-owned",
    implementationSource:
      "Orders queue actions plus document finalize return path",
    proofSource: "SALE-ORD-006 / SALE-ORD-015",
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-006", "SALE-ORD-015"],
  },
  {
    requirementId: "ORD-WF-007",
    group: "workflow-parity",
    userOutcome: "Continue downstream sales work from a confirmed order.",
    userVisibleBehavior:
      "Confirmed-order context persists in the queue and exposes accounting and shipping handoffs explicitly.",
    surface: "orders-queue",
    ownerClass: "orders-owned",
    implementationSource:
      "Orders queue confirmed context and linked handoff buttons",
    proofSource: "SALE-ORD-007 / SALE-ORD-009 / SALE-ORD-011",
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-007", "SALE-ORD-009", "SALE-ORD-011"],
  },
  {
    requirementId: "ORD-WF-008",
    group: "workflow-parity",
    userOutcome:
      "Convert quote-linked work into Orders without ownership ambiguity.",
    userVisibleBehavior:
      "Quote-to-order and sale-conversion entry paths are explicitly owned inside the Orders rollout contract and either land in sheet-native Orders or are reclassified with evidence.",
    surface: "cross-surface",
    ownerClass: "orders-owned",
    implementationSource:
      "SalesWorkspacePage route canonicalization plus OrderCreatorPage route-based quoteId hydration",
    proofSource: "SALE-ORD-012 / SALE-ORD-028",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-012", "SALE-ORD-028"],
  },
  {
    requirementId: "ORD-WF-009",
    group: "workflow-parity",
    userOutcome: "Manage document rows with spreadsheet-native speed.",
    userVisibleBehavior:
      "The Orders document grid supports row insert, row duplicate, and row delete without escaping the shared spreadsheet runtime.",
    surface: "orders-document-grid",
    ownerClass: "orders-owned",
    implementationSource:
      "PowersheetGrid row operations reusing existing Orders line-item semantics",
    proofSource: "SALE-ORD-032",
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-032"],
  },
  {
    requirementId: "ORD-SS-001",
    group: "spreadsheet-interaction",
    userOutcome:
      "Highlight a contiguous range by dragging like a real spreadsheet.",
    userVisibleBehavior:
      "Users can drag to select rectangular ranges in queue, support grids, and document grids.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource: "PowersheetGrid selection runtime",
    proofSource: "SALE-ORD-019",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-019"],
  },
  {
    requirementId: "ORD-SS-002",
    group: "spreadsheet-interaction",
    userOutcome: "Extend a range precisely with Shift.",
    userVisibleBehavior:
      "Shift-click and Shift-arrow extend the active range from the anchor cell.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource: "PowersheetGrid anchor and keyboard selection model",
    proofSource: "SALE-ORD-019",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-019"],
  },
  {
    requirementId: "ORD-SS-003",
    group: "spreadsheet-interaction",
    userOutcome:
      "Build discontiguous selections for fast comparison and editing.",
    userVisibleBehavior:
      "Cmd-click adds or removes cells or ranges without losing the existing selection.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource: "PowersheetGrid discontiguous selection model",
    proofSource: "SALE-ORD-019",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-019"],
  },
  {
    requirementId: "ORD-SS-004",
    group: "spreadsheet-interaction",
    userOutcome: "Select full row, column, or current grid scope quickly.",
    userVisibleBehavior:
      "Row headers, column headers, and Cmd+A behave consistently across Orders grids.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource: "PowersheetGrid selection scope controls",
    proofSource: "SALE-ORD-019",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-019"],
  },
  {
    requirementId: "ORD-SS-005",
    group: "spreadsheet-interaction",
    userOutcome: "Copy readable tabular values out of TERP reliably.",
    userVisibleBehavior:
      "Selected cells copy as rectangular tabular data from queue, support grids, and document grids.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource: "PowersheetGrid clipboard export contract",
    proofSource: "SALE-ORD-021",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-021"],
  },
  {
    requirementId: "ORD-SS-006",
    group: "spreadsheet-interaction",
    userOutcome: "Paste spreadsheet blocks into approved Orders cells.",
    userVisibleBehavior:
      "Rectangular paste maps from the active top-left cell and only updates approved editable fields.",
    surface: "orders-document-grid",
    ownerClass: "foundation-shared",
    implementationSource: "PowersheetGrid clipboard import and field policy",
    proofSource: "SALE-ORD-020 / SALE-ORD-021",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-020", "SALE-ORD-021"],
  },
  {
    requirementId: "ORD-SS-007",
    group: "spreadsheet-interaction",
    userOutcome: "Edit multiple cells efficiently instead of one-by-one.",
    userVisibleBehavior:
      "Approved queue and document fields support multi-cell updates without bypassing current validation or pricing logic.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource:
      "PowersheetGrid multi-cell edit and Orders field safety contract",
    proofSource: "SALE-ORD-020",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-020"],
  },
  {
    requirementId: "ORD-SS-008",
    group: "spreadsheet-interaction",
    userOutcome: "Repeat values across ranges with fill handle behavior.",
    userVisibleBehavior:
      "Approved cells expose drag-fill or an equivalent fill affordance with safe repeat/series behavior.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource: "PowersheetGrid fill behavior contract",
    proofSource: "SALE-ORD-022",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-022"],
  },
  {
    requirementId: "ORD-SS-009",
    group: "spreadsheet-interaction",
    userOutcome: "Recover confidently from spreadsheet edits.",
    userVisibleBehavior:
      "Undo and redo work for spreadsheet edits without breaking save-state or workflow guardrails.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource:
      "PowersheetGrid undo integration with existing work-surface hooks",
    proofSource: "SALE-ORD-020 / SALE-ORD-022",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-020", "SALE-ORD-022"],
  },
  {
    requirementId: "ORD-SS-010",
    group: "spreadsheet-interaction",
    userOutcome:
      "Clear or cut spreadsheet data predictably on approved fields.",
    userVisibleBehavior:
      "Cut, clear, and delete-cell actions behave consistently on approved editable cells and reject locked cells clearly.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource:
      "PowersheetGrid clear-cell and clipboard contracts with field-policy enforcement",
    proofSource: "SALE-ORD-029 / SALE-ORD-035",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-029", "SALE-ORD-035"],
  },
  {
    requirementId: "ORD-SS-011",
    group: "spreadsheet-interaction",
    userOutcome:
      "Move and edit like a real spreadsheet without relearning controls.",
    userVisibleBehavior:
      "Tab, Shift+Tab, Enter, Shift+Enter, and Escape behave consistently across Orders spreadsheet surfaces.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource:
      "PowersheetGrid edit-navigation model plus existing work-surface keyboard hooks",
    proofSource: "SALE-ORD-030",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-030"],
  },
  {
    requirementId: "ORD-SS-012",
    group: "spreadsheet-interaction",
    userOutcome:
      "Trust that sort and filter state will not silently retarget edits.",
    userVisibleBehavior:
      "Selection, paste, and fill targeting stay stable and safe after sort or filter changes.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource:
      "PowersheetGrid selection targeting and sort/filter safety rules",
    proofSource: "SALE-ORD-031 / SALE-ORD-035",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-031", "SALE-ORD-035"],
  },
  {
    requirementId: "ORD-SF-001",
    group: "surfacing-discoverability",
    userOutcome: "Understand the current spreadsheet state at a glance.",
    userVisibleBehavior:
      "Focused cell, anchor, contiguous range, and discontiguous selections are visibly legible.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource: "PowersheetGrid visual selection state",
    proofSource: "SALE-ORD-024",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-024"],
  },
  {
    requirementId: "ORD-SF-002",
    group: "surfacing-discoverability",
    userOutcome: "Know what is editable before trying to edit.",
    userVisibleBehavior:
      "Editable, locked, and workflow-owned cells are visually distinct before interaction.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource: "PowersheetGrid field-state styling contract",
    proofSource: "SALE-ORD-025",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-025"],
  },
  {
    requirementId: "ORD-SF-003",
    group: "surfacing-discoverability",
    userOutcome: "Stay oriented while selecting and editing.",
    userVisibleBehavior:
      "Selection scope, save state, and blocked/edit feedback remain visible in the sheet status and command areas.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource:
      "Work-surface status bar plus PowersheetGrid selection summary",
    proofSource: "SALE-ORD-024",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-024"],
  },
  {
    requirementId: "ORD-SF-004",
    group: "surfacing-discoverability",
    userOutcome: "Understand why a paste or fill was blocked.",
    userVisibleBehavior:
      "Blocked paste and fill attempts surface clear reasons instead of silently failing.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource:
      "PowersheetGrid partial-failure and blocked-field messaging",
    proofSource: "SALE-ORD-024 / SALE-ORD-025 / SALE-ORD-035",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-024", "SALE-ORD-025", "SALE-ORD-035"],
  },
  {
    requirementId: "ORD-SF-005",
    group: "surfacing-discoverability",
    userOutcome: "Learn the sheet-native interaction model without guessing.",
    userVisibleBehavior:
      "Keyboard affordances and modifier-based selection hints are surfaced in a stable hint system.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource: "KeyboardHintBar plus Orders-specific hint copy",
    proofSource: "SALE-ORD-026",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-026"],
  },
  {
    requirementId: "ORD-SF-006",
    group: "surfacing-discoverability",
    userOutcome:
      "Keep spreadsheet behavior consistent wherever Orders work actually happens.",
    userVisibleBehavior:
      "Queue, support grids, and document grids expose the same spreadsheet grammar and action reachability rather than drifting into different interaction models.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource:
      "Orders queue, support grids, and document-grid adoption of PowersheetGrid",
    proofSource: "SALE-ORD-023 / SALE-ORD-026",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-023", "SALE-ORD-026"],
  },
  {
    requirementId: "ORD-SF-007",
    group: "surfacing-discoverability",
    userOutcome:
      "Keep workflow actions explicit after spreadsheet interaction.",
    userVisibleBehavior:
      "Finalize, accounting, and shipping actions remain clearly surfaced and separate from cell editing.",
    surface: "cross-surface",
    ownerClass: "orders-owned",
    implementationSource: "Orders queue and document command strips",
    proofSource: "SALE-ORD-027",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    releaseStatus: "implemented",
    linkedCapabilityIds: ["SALE-ORD-027"],
  },
  {
    requirementId: "ORD-SF-008",
    group: "surfacing-discoverability",
    userOutcome:
      "Find the right spreadsheet affordances in every Orders surface that requires them.",
    userVisibleBehavior:
      "Queue, support grid, and document grid each expose a clear discoverability matrix for selection, clipboard, fill, save state, and workflow actions.",
    surface: "cross-surface",
    ownerClass: "foundation-shared",
    implementationSource:
      "Per-surface affordance matrix using WorkSurfaceStatusBar and KeyboardHintBar integration",
    proofSource: "SALE-ORD-026 / SALE-ORD-033",
    implementationStatus: "not-started",
    surfacingStatus: "not-started",
    releaseStatus: "open",
    linkedCapabilityIds: ["SALE-ORD-026", "SALE-ORD-033"],
  },
  {
    requirementId: "ORD-SF-009",
    group: "surfacing-discoverability",
    userOutcome:
      "Understand exactly what workflow actions will target before advancing work.",
    userVisibleBehavior:
      "Focused row, focused cell, selected range, and workflow-action targeting remain visibly unambiguous before finalize or handoff actions.",
    surface: "cross-surface",
    ownerClass: "orders-owned",
    implementationSource:
      "Orders queue, support grids, and document command surfaces coordinated with PowersheetGrid selection state",
    proofSource: "SALE-ORD-034",
    implementationStatus: "not-started",
    surfacingStatus: "not-started",
    releaseStatus: "open",
    linkedCapabilityIds: ["SALE-ORD-034"],
  },
];

export const ordersRolloutRequirementById = new Map(
  ordersRolloutRequirements.map(requirement => [
    requirement.requirementId,
    requirement,
  ])
);

export const ordersRolloutRequirementIds = ordersRolloutRequirements.map(
  requirement => requirement.requirementId
);
