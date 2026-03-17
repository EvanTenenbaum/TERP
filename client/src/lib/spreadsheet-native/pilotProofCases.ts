import type {
  CapabilityProofCase,
  WorkbookAdapter,
} from "@shared/spreadsheetNativeContracts";
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
}

export interface PilotProofValidationResult {
  missingQueries: Map<string, string[]>;
  missingMutations: Map<string, string[]>;
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
  },
  {
    capabilityId: "SALE-ORD-003",
    workbook: "Sales",
    sheet: "Create Order",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "live-proven",
    routeOrEntry: "/sales?tab=create-order",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "create-order-proof.png",
    notes:
      "Current workbook composer remains the functional oracle for create-order behavior during step-5 work.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "SALE-ORD-004",
    workbook: "Sales",
    sheet: "Create Order",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=create-order&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "draft-edit-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed live draft editing, total recalculation, and save-state recovery in the current composer; quote-specific and undo coverage still need a separate pass.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "SALE-ORD-005",
    workbook: "Sales",
    sheet: "Create Order",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=create-order&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "finalize-guardrail-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed a blank composer keeps finalization unavailable until prerequisites exist; deeper credit and edge-case guardrails still need targeted proof.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "SALE-ORD-006",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "draft-lifecycle-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed the classic Orders queue still exposes Edit Draft, Confirm Order, and Delete Draft for live drafts; confirm execution itself still needs a targeted mutation pass.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "SALE-ORD-007",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "confirm-ship-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed confirmed-order context still loads in the classic Orders inspector, but no explicit downstream actions were visible on the tested record; this row now tracks the Sales-side confirm context only while shipping handoff is already closed under SALE-ORD-011.",
    coverageMode: "classic-adjacent",
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
    proofStatus: "live-proven",
    routeOrEntry: "/sales?tab=orders",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "draft-delete-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed a live draft delete from the classic Orders queue and verified that the temporary draft disappeared from the filtered draft list.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "SALE-ORD-016",
    workbook: "Sales",
    sheet: "Create Order",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=create-order&quoteId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "seeded-entry-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed quoteId-seeded entry into the current create-order surface; other seed modes still need separate proof.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "SALE-ORD-017",
    workbook: "Sales",
    sheet: "Create Order",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=create-order&draftId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "autosave-nav-guard-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed the autosave path on an active draft; the unsaved-navigation prompt remains a separate open proof.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "SALE-ORD-018",
    workbook: "Sales",
    sheet: "Create Order",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "live-proven",
    routeOrEntry: "/sales?tab=create-order&clientId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "customer-context-proof.png",
    notes:
      "March 15, 2026 staging proof confirmed the clientId-seeded create-order route shows customer, referral, credit, and pricing context in the live composer.",
    coverageMode: "classic-adjacent",
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
  }

  return { missingQueries, missingMutations };
}

export const pilotProofValidation = validatePilotProofCases(
  pilotWorkbookAdapters,
  pilotProofDefinitions
);
