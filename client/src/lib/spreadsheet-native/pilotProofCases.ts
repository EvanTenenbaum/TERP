import type {
  CapabilityProofCase,
  RequirementImplementationStatus,
  RequirementSurfacingStatus,
  WorkbookAdapter,
} from "@shared/spreadsheetNativeContracts";
import { ordersRolloutRequirementById } from "./ordersRolloutContract";
import { pilotWorkbookAdapters } from "./pilotContracts";

export type PilotCoverageMode =
  | "sheet-native-direct"
  | "classic-adjacent"
  | "adjacent-owned"
  | "resolved-adjacent"
  | "ownership-blocked";

export interface PilotProofDefinition extends CapabilityProofCase {
  workbook: string;
  sheet: string;
  routeOrEntry: string;
  persona: string;
  coverageMode: PilotCoverageMode;
  queryContractIds?: string[];
  mutationContractIds?: string[];
  implementationStatus?: RequirementImplementationStatus;
  surfacingStatus?: RequirementSurfacingStatus;
  surfacedArtifactIds?: string[];
}

export interface PilotProofValidationResult {
  missingQueries: Map<string, string[]>;
  missingMutations: Map<string, string[]>;
  missingRequirements: Map<string, string[]>;
}

export const pilotProofDefinitions: PilotProofDefinition[] = [
  {
    capabilityId: "SALE-ORD-001",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "live-proven",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "queue-filter-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed the live sheet-native Orders pilot supports in-place queue browse and filtering.",
    coverageMode: "sheet-native-direct",
    queryContractIds: ["clients.list", "orders.getAll"],
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    requirementIds: ["ORD-WF-001"],
  },
  {
    capabilityId: "SALE-ORD-002",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "live-proven",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native&orderId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "inspector-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed live inspector and deep-link behavior on the sheet-native Orders pilot.",
    coverageMode: "sheet-native-direct",
    queryContractIds: [
      "orders.getOrderWithLineItems",
      "orders.getOrderStatusHistory",
      "orders.getAuditLog",
      "accounting.ledger.list",
    ],
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    requirementIds: ["ORD-WF-001", "ORD-WF-002"],
  },
  {
    capabilityId: "SALE-ORD-003",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "code-proven",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native&ordersView=document",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "create-order-proof.png",
    notes:
      "March 17, 2026 local implementation moved new-draft entry into the sheet-native Orders document mode; staging proof is still required before this row can close as live-proven.",
    coverageMode: "sheet-native-direct",
    queryContractIds: ["clients.list", "salesSheets.getInventory"],
    mutationContractIds: ["orders.createDraftEnhanced"],
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-WF-003"],
  },
  {
    capabilityId: "SALE-ORD-004",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "code-proven",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "draft-edit-proof.png",
    notes:
      "March 17, 2026 local implementation routes draft editing through the sheet-native Orders document mode with the existing recalculation and undo logic preserved; live staging proof is still pending.",
    coverageMode: "sheet-native-direct",
    queryContractIds: [
      "orders.getOrderWithLineItems",
      "salesSheets.getInventory",
      "clients.getById",
    ],
    mutationContractIds: ["orders.updateDraftEnhanced"],
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-WF-003"],
  },
  {
    capabilityId: "SALE-ORD-005",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "code-proven",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "finalize-guardrail-proof.png",
    notes:
      "March 17, 2026 local implementation keeps credit checks, validation, and finalize guardrails inside the sheet-native Orders document mode; live staging proof is still pending.",
    coverageMode: "sheet-native-direct",
    mutationContractIds: [
      "credit.checkOrderCredit",
      "orders.finalizeDraft",
      "orders.updateDraftEnhanced",
    ],
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-WF-004"],
  },
  {
    capabilityId: "SALE-ORD-006",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "code-proven",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "draft-lifecycle-proof.png",
    notes:
      "March 17, 2026 local implementation keeps draft edit entry and draft delete on the sheet-native Orders queue, while confirm/finalize stays inside the sheet-native document mode; live staging proof is still pending.",
    coverageMode: "sheet-native-direct",
    mutationContractIds: ["orders.deleteDraftOrder", "orders.finalizeDraft"],
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-WF-006"],
  },
  {
    capabilityId: "SALE-ORD-007",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "code-proven",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native&orderId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "confirm-ship-proof.png",
    notes:
      "March 17, 2026 local implementation returns finalized orders to the sheet-native queue with confirmed-order context preserved; shipping and accounting remain explicit handoffs while live staging proof is still pending.",
    coverageMode: "sheet-native-direct",
    queryContractIds: ["orders.getOrderWithLineItems", "orders.getAuditLog"],
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-WF-002", "ORD-WF-007"],
  },
  {
    capabilityId: "SALE-ORD-008",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Accounting",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&orderId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "invoice-generation-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed the classic Orders surface still exposes the Generate Invoice entry point; invoice creation execution remains an Accounting-owned follow-on proof.",
    coverageMode: "adjacent-owned",
  },
  {
    capabilityId: "SALE-ORD-009",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Accounting",
    criticality: "P1",
    proofStatus: "live-proven",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native&orderId=:id",
    persona: "qa.accounting@terp.test",
    requiredArtifact: "accounting-handoff-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed the live sheet-native Orders pilot hands the selected order into Accounting payment context with order identity preserved.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    requirementIds: ["ORD-WF-007"],
  },
  {
    capabilityId: "SALE-ORD-010",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Returns",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=returns",
    persona: "qa.salesrep@terp.test",
    requiredArtifact: "returns-handoff-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed the Returns owner surface is still live with a Process Return entry point; return execution remains an adjacent-owned follow-on proof.",
    coverageMode: "adjacent-owned",
  },
  {
    capabilityId: "SALE-ORD-011",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Operations -> Shipping",
    criticality: "P1",
    proofStatus: "live-proven",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native&orderId=:id",
    persona: "qa.fulfillment@terp.test",
    requiredArtifact: "shipping-handoff-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed the live sheet-native Orders pilot hands the selected order into the consolidated shipping workspace at /inventory?tab=shipping with order identity preserved.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "surfaced-and-proven",
    requirementIds: ["ORD-WF-007"],
  },
  {
    capabilityId: "SALE-ORD-012",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=quotes",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "conversion-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed the adjacent Quotes workbook still exposes the Convert to Sales Order dialog; executing the conversion mutation still needs a separate targeted pass.",
    coverageMode: "classic-adjacent",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-WF-008"],
  },
  {
    capabilityId: "SALE-ORD-013",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "blocked",
    routeOrEntry: "/sales?tab=orders",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "recurring-owner-note.md",
    notes: "Recurring-order ownership remains outside the pilot build path.",
    coverageMode: "ownership-blocked",
  },
  {
    capabilityId: "SALE-ORD-014",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Accounting",
    criticality: "P1",
    proofStatus: "blocked",
    routeOrEntry: "/sales?tab=orders&orderId=:id",
    persona: "qa.accounting@terp.test",
    requiredArtifact: "output-ownership-note.md",
    notes:
      "Invoice output execution is Accounting-owned; the visible but inert Orders-surface affordance is not counted as preserved.",
    coverageMode: "resolved-adjacent",
  },
  {
    capabilityId: "SALE-ORD-015",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "code-proven",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "draft-delete-proof.png",
    notes:
      "March 17, 2026 local implementation adds draft deletion directly to the sheet-native Orders queue; live staging proof is still required before this row can close.",
    coverageMode: "sheet-native-direct",
    mutationContractIds: ["orders.deleteDraftOrder"],
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-WF-006"],
  },
  {
    capabilityId: "SALE-ORD-016",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "code-proven",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&quoteId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "seeded-entry-proof.png",
    notes:
      "March 17, 2026 local implementation preserves quote, client, need, and sales-sheet seeded entry in the sheet-native Orders document mode; live staging proof is still pending.",
    coverageMode: "sheet-native-direct",
    queryContractIds: [
      "orders.getOrderWithLineItems",
      "clients.getById",
      "salesSheets.getInventory",
    ],
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-WF-005"],
  },
  {
    capabilityId: "SALE-ORD-017",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "code-proven",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "autosave-nav-guard-proof.png",
    notes:
      "March 17, 2026 local implementation keeps autosave, save-state, keyboard save/finalize, and unsaved-navigation protection inside the sheet-native Orders document mode; live staging proof is still pending.",
    coverageMode: "sheet-native-direct",
    mutationContractIds: [
      "orders.createDraftEnhanced",
      "orders.updateDraftEnhanced",
    ],
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-WF-004"],
  },
  {
    capabilityId: "SALE-ORD-018",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "code-proven",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&clientId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "customer-context-proof.png",
    notes:
      "March 17, 2026 local implementation keeps client-seeded customer, referral, credit, and pricing context inside the sheet-native Orders document mode; live staging proof is still pending.",
    coverageMode: "sheet-native-direct",
    queryContractIds: ["clients.getById", "salesSheets.getInventory"],
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-WF-005"],
  },
  {
    capabilityId: "SALE-ORD-019",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "selection-range-parity-proof.png",
    notes:
      "March 18, 2026 staging proof on draft 618 confirmed document-mode focused selection plus Shift-range extension through the shared PowersheetGrid runtime after live row duplication. Queue drag-range, Cmd discontiguous selection, and row or column scope proof are still required before this row can close.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SS-001", "ORD-SS-002", "ORD-SS-003", "ORD-SS-004"],
  },
  {
    capabilityId: "SALE-ORD-020",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "multi-cell-edit-proof.png",
    notes:
      "March 18, 2026 staging proof on draft 618 confirmed live document-grid editing, row duplication, and range selection continue to run through the shared PowersheetGrid runtime without replacing Orders orchestration. This row stays partial until multi-cell clipboard, pricing recalculation, autosave, and undo are fully proven on staging.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SS-006", "ORD-SS-007", "ORD-SS-009"],
  },
  {
    capabilityId: "SALE-ORD-021",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "clipboard-parity-proof.png",
    notes:
      "March 17, 2026 local implementation wired clipboard hooks through the shared SpreadsheetPilotGrid and added document-grid paste validation plus blocked-field messaging for approved editable cells. March 18 staging proof still reads browser clipboard state back as empty and leaves validPasteMethod as none, so this row stays partial until copy and rectangular paste are proven on staging across the queue, support, and document surfaces.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SS-005", "ORD-SS-006"],
  },
  {
    capabilityId: "SALE-ORD-022",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "fill-parity-proof.png",
    notes:
      "March 17, 2026 local implementation enabled fill-handle behavior on the shared Orders document grid for approved editable fields. This row stays partial until safe fill behavior is exercised on staging and field-policy restrictions are proven in the live surface.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SS-008", "ORD-SS-009"],
  },
  {
    capabilityId: "SALE-ORD-023",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "surface-consistency-proof.png",
    notes:
      "March 17, 2026 runtime work moved queue, support, and the sheet-native document line-item surface onto the shared PowersheetGrid adapter. This row stays partial until all three surfaces are proven together on staging with consistent spreadsheet behavior.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SF-006"],
  },
  {
    capabilityId: "SALE-ORD-024",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "selection-visibility-proof.png",
    notes:
      "March 18, 2026 staging proof on draft 618 confirmed visible selection summary, selected-row counts, running totals, and blocked invalid-edit feedback in document mode. Queue/support focus, save-state, and cross-surface visibility proof are still pending.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SF-001", "ORD-SF-003", "ORD-SF-004"],
  },
  {
    capabilityId: "SALE-ORD-025",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "field-state-visibility-proof.png",
    notes:
      "March 18, 2026 staging proof on draft 618 confirmed document-mode locked product and batch cells remain distinct from editable quantity, COGS, and margin cells while blocked edits surface a clear rejection. Cross-surface field-state proof is still required before this gate can close.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SF-002", "ORD-SF-004"],
  },
  {
    capabilityId: "SALE-ORD-026",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "discoverability-proof.png",
    notes:
      "March 17, 2026 runtime work surfaced the Orders sheet/classic toggle and began exposing selection state plus document-grid actions in the shared grid chrome, so discoverability is no longer zero. This row stays partial until queue, support, and document surfaces all expose discoverable spreadsheet affordances and hinting.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SF-005", "ORD-SF-006", "ORD-SF-008"],
  },
  {
    capabilityId: "SALE-ORD-027",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "implemented-not-surfaced",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "explicit-workflow-actions-proof.png",
    notes:
      "Finalize, accounting, and shipping actions already exist in sheet-native Orders, but this row stays open until their separation from spreadsheet editing is explicitly surfaced and proven.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SF-007"],
  },
  {
    capabilityId: "SALE-ORD-028",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "blocked",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&quoteId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "sheet-native-conversion-proof.png",
    notes:
      "Conversion parity is now an explicit Orders rollout gate. This row remains blocked until quote-to-order conversion ownership is explicit and the sheet-native Orders flow proves the mutation path or is reclassified with evidence.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "not-started",
    surfacingStatus: "not-started",
    requirementIds: ["ORD-WF-008"],
  },
  {
    capabilityId: "SALE-ORD-029",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "cut-clear-delete-proof.png",
    notes:
      "March 17, 2026 local implementation added document-grid clear-style actions for approved fields plus structured edit rejection for locked or invalid spreadsheet edits. This row stays partial until cut, clear, and blocked-cell behavior are proven end-to-end on staging.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SS-010"],
  },
  {
    capabilityId: "SALE-ORD-030",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "live-proven",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "edit-navigation-proof.png",
    notes:
      "March 18, 2026 staging build build-mmweo1fu proved Tab, Shift+Tab, Enter, Shift+Enter, and Escape on draft 618 through the shared document-grid runtime. The durable evidence bundle is output/playwright/orders-runtime-g2/2026-03-18/orders-runtime-g2-report.json plus the accompanying screenshots.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SS-011"],
  },
  {
    capabilityId: "SALE-ORD-031",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "sort-filter-safe-targeting-proof.png",
    notes:
      "March 17, 2026 local implementation hardened the document grid against silent retargeting by disabling sort/filter controls there and validating full paste rectangles before accepting data. This row stays partial until queue, support, and document surfaces are all proven safe on staging.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SS-012"],
  },
  {
    capabilityId: "SALE-ORD-032",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "live-proven",
    routeOrEntry:
      "/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "row-operations-proof.png",
    notes:
      "March 18, 2026 staging build build-mmweo1fu proved duplicate, quick-add, and delete row operations on draft 618 through the shared document-grid runtime. The durable evidence bundle is output/playwright/orders-runtime-g2/2026-03-18/orders-runtime-g2-report.json plus the accompanying screenshots.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-WF-009"],
  },
  {
    capabilityId: "SALE-ORD-033",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "blocked",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "per-surface-discoverability-proof.png",
    notes:
      "Per-surface discoverability is now a release gate. This row remains blocked until queue, support-grid, and document-grid affordance matrices are surfaced and proven independently.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "not-started",
    surfacingStatus: "not-started",
    requirementIds: ["ORD-SF-008"],
  },
  {
    capabilityId: "SALE-ORD-034",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "blocked",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "workflow-ambiguity-proof.png",
    notes:
      "Workflow ambiguity is now a release gate. This row remains blocked until focused row, focused cell, selected range, and workflow-action targeting stay visibly unambiguous before finalize or handoff actions.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "not-started",
    surfacingStatus: "not-started",
    requirementIds: ["ORD-SF-009"],
  },
  {
    capabilityId: "SALE-ORD-035",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "failure-mode-proof-bundle.md",
    notes:
      "March 18, 2026 staging proof on draft 618 confirmed blocked invalid inline quantity edits now revert immediately to the last valid grid state while surfacing the rejection message, instead of leaking stale invalid values until reload. This row stays partial until mixed editable/locked paste, blocked fill, invalid multi-cell partial failure, undo across autosave, and hidden-row protection are also proven on staging.",
    coverageMode: "sheet-native-direct",
    implementationStatus: "implemented",
    surfacingStatus: "implemented-not-surfaced",
    requirementIds: ["ORD-SS-010", "ORD-SS-012", "ORD-SF-004"],
  },
  {
    capabilityId: "OPS-INV-001",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P0",
    proofStatus: "live-proven",
    routeOrEntry: "/operations?tab=inventory&surface=sheet-native",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "inventory-browse-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed the live sheet-native Inventory pilot supports browse and in-grid filtering.",
    coverageMode: "sheet-native-direct",
    queryContractIds: ["inventory.getEnhanced", "inventory.dashboardStats"],
  },
  {
    capabilityId: "OPS-INV-002",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P0",
    proofStatus: "live-proven",
    routeOrEntry: "/operations?tab=inventory&surface=sheet-native&batchId=:id",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "inventory-inspector-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed live inspector and batchId deep-link behavior on the sheet-native Inventory pilot.",
    coverageMode: "sheet-native-direct",
    queryContractIds: ["inventory.getById"],
  },
  {
    capabilityId: "OPS-INV-003",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/operations?tab=inventory",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "add-inventory-proof.png",
    notes:
      "March 15, 2026 staging proof only confirmed the classic inventory surface still exposes the Open Receiving Queue intake handoff; the actual Add Inventory modal flow in this row remains unproven.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "OPS-INV-004",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/operations?tab=inventory&surface=sheet-native&batchId=:id",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "status-edit-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed live status mutation on the sheet-native Inventory pilot and reverted the test change after capture; undo, audit, and conflict parity still need proof.",
    coverageMode: "sheet-native-direct",
    mutationContractIds: ["inventory.updateStatus"],
  },
  {
    capabilityId: "OPS-INV-005",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/operations?tab=inventory&surface=sheet-native&batchId=:id",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "adjust-qty-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed live quantity adjustment on the sheet-native Inventory pilot and reverted the test change after capture; undo, audit, and race-condition coverage still remain open.",
    coverageMode: "sheet-native-direct",
    mutationContractIds: ["inventory.adjustQty"],
  },
  {
    capabilityId: "OPS-INV-006",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry: "/operations?tab=inventory",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "bulk-action-proof.png",
    notes:
      "[live-failing] March 15, 2026 staging proof confirmed live delete-eligibility gating and the confirmation flow, but the actual inventory.bulk.delete mutation currently fails with a staging 500, so this row is explicitly not preserved yet.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "OPS-INV-007",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P1",
    proofStatus: "code-proven",
    routeOrEntry: "/operations?tab=inventory",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "movement-history-proof.png",
    notes: "Movement history remains classic-adjacent during step 5.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "OPS-INV-008",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Accounting",
    criticality: "P1",
    proofStatus: "blocked",
    routeOrEntry: "/operations?tab=inventory",
    persona: "qa.accounting@terp.test",
    requiredArtifact: "valuation-ownership-note.md",
    notes:
      "Official valuation remains Accounting-owned and intentionally outside first-sheet execution ownership.",
    coverageMode: "resolved-adjacent",
  },
  {
    capabilityId: "OPS-INV-009",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Locations / Storage",
    criticality: "P1",
    proofStatus: "blocked",
    routeOrEntry: "/operations?tab=inventory",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "transfer-ownership-note.md",
    notes:
      "Transfer execution is owned by Locations / Storage and remains an adjacent handoff, not an ownership blocker.",
    coverageMode: "resolved-adjacent",
  },
  {
    capabilityId: "OPS-INV-010",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Locations / Storage",
    criticality: "P1",
    proofStatus: "blocked",
    routeOrEntry: "/settings?tab=locations",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "location-admin-note.md",
    notes:
      "Location administration is owned by Locations / Storage and remains outside the first inventory sheet by design.",
    coverageMode: "resolved-adjacent",
  },
  {
    capabilityId: "OPS-INV-011",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P2",
    proofStatus: "partial",
    routeOrEntry: "/operations?tab=inventory",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "views-gallery-export-proof.png",
    notes:
      "Saved views, gallery, and export remain classic-adjacent during step 5.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "OPS-INV-012",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P2",
    proofStatus: "code-proven",
    routeOrEntry: "/operations?tab=inventory",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "intake-media-proof.png",
    notes: "Intake media remains classic-adjacent during step 5.",
    coverageMode: "classic-adjacent",
  },
];

export const pilotCapabilityProofCases: CapabilityProofCase[] =
  pilotProofDefinitions.map(
    ({
      capabilityId,
      criticality,
      ownerSurface,
      proofStatus,
      requiredArtifact,
      notes,
    }) => ({
      capabilityId,
      criticality,
      ownerSurface,
      proofStatus,
      requiredArtifact,
      notes,
    })
  );

export const pilotP0P1CapabilityProofCases = pilotCapabilityProofCases.filter(
  proofCase => proofCase.criticality === "P0" || proofCase.criticality === "P1"
);

export const pilotProofDefinitionByCapabilityId = new Map(
  pilotProofDefinitions.map(definition => [definition.capabilityId, definition])
);

export function validatePilotProofCases(
  workbookAdapters: WorkbookAdapter[],
  proofDefinitions: PilotProofDefinition[]
): PilotProofValidationResult {
  const queryIds = new Set(
    workbookAdapters.flatMap(adapter => adapter.queries.map(query => query.id))
  );
  const mutationIds = new Set(
    workbookAdapters.flatMap(adapter =>
      adapter.mutations.map(mutation => mutation.id)
    )
  );

  const missingQueries = new Map<string, string[]>();
  const missingMutations = new Map<string, string[]>();
  const missingRequirements = new Map<string, string[]>();

  for (const definition of proofDefinitions) {
    const unresolvedQueries = (definition.queryContractIds ?? []).filter(
      queryId => !queryIds.has(queryId)
    );
    if (unresolvedQueries.length > 0) {
      missingQueries.set(definition.capabilityId, unresolvedQueries);
    }

    const unresolvedMutations = (definition.mutationContractIds ?? []).filter(
      mutationId => !mutationIds.has(mutationId)
    );
    if (unresolvedMutations.length > 0) {
      missingMutations.set(definition.capabilityId, unresolvedMutations);
    }

    const unresolvedRequirements = (definition.requirementIds ?? []).filter(
      requirementId => !ordersRolloutRequirementById.has(requirementId)
    );
    if (unresolvedRequirements.length > 0) {
      missingRequirements.set(definition.capabilityId, unresolvedRequirements);
    }
  }

  return { missingQueries, missingMutations, missingRequirements };
}

export const pilotProofValidation = validatePilotProofCases(
  pilotWorkbookAdapters,
  pilotProofDefinitions
);
