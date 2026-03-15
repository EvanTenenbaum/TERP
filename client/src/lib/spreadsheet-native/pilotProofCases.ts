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
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "queue-filter-proof.png",
    notes:
      "The base Orders sheet request still resolved to the classic workbook surface in March 14, 2026 staging detection, so direct pilot live proof is deployment-gated while browse and filter behavior continues to use the current workbook as an oracle.",
    coverageMode: "sheet-native-direct",
    queryContractIds: ["clients.list", "orders.getAll"],
  },
  {
    capabilityId: "SALE-ORD-002",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native&orderId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "inspector-proof.png",
    notes:
      "The base Orders sheet request still resolved to the classic workbook surface in March 14, 2026 staging detection, so direct pilot live proof for inspector and deep-link behavior remains deployment-gated.",
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
    notes: "Draft editing remains in the current workbook composer for now.",
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
    notes: "Finalize guardrails remain composer-owned during the step-5 pilot.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "SALE-ORD-006",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Sales -> Orders",
    criticality: "P0",
    proofStatus: "code-proven",
    routeOrEntry: "/sales?tab=orders",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "draft-lifecycle-proof.png",
    notes:
      "Draft confirm and delete remain classic/workbook-adjacent during step 5.",
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
      "Confirm remains classic-adjacent while shipping execution hands off to the Operations-owned surface.",
    coverageMode: "adjacent-owned",
  },
  {
    capabilityId: "SALE-ORD-008",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Accounting",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&orderId=:id",
    persona: "qa.accounting@terp.test",
    requiredArtifact: "invoice-generation-proof.png",
    notes:
      "Generate Invoice remains a workbook-adjacent launch from Sales into Accounting-owned invoice truth.",
    coverageMode: "adjacent-owned",
  },
  {
    capabilityId: "SALE-ORD-009",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Accounting",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native&orderId=:id",
    persona: "qa.accounting@terp.test",
    requiredArtifact: "accounting-handoff-proof.png",
    notes:
      "Payment execution is owned by Accounting and intended to launch from the sheet pilot, but the base Orders sheet request still resolved to the classic workbook surface in March 14, 2026 staging detection, so direct pilot live proof is deployment-gated.",
    coverageMode: "sheet-native-direct",
  },
  {
    capabilityId: "SALE-ORD-010",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Returns",
    criticality: "P1",
    proofStatus: "code-proven",
    routeOrEntry: "/sales?tab=returns",
    persona: "qa.salesrep@terp.test",
    requiredArtifact: "returns-handoff-proof.png",
    notes:
      "Returns remain in their owned surface and are not recreated in the pilot sheet.",
    coverageMode: "adjacent-owned",
  },
  {
    capabilityId: "SALE-ORD-011",
    workbook: "Sales",
    sheet: "Orders",
    ownerSurface: "Operations -> Shipping",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=orders&surface=sheet-native&orderId=:id",
    persona: "qa.fulfillment@terp.test",
    requiredArtifact: "shipping-handoff-proof.png",
    notes:
      "Shipping handoff is intended to launch from the sheet pilot into the Operations surface, but the base Orders sheet request still resolved to the classic workbook surface in March 14, 2026 staging detection, so direct pilot live proof is deployment-gated.",
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
      "Quote-to-order conversion currently lives on the adjacent Quotes workbook surface and now has a verified live entry point.",
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
    proofStatus: "code-proven",
    routeOrEntry: "/sales?tab=orders",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "draft-delete-proof.png",
    notes: "Draft delete remains classic-adjacent during step 5.",
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
    notes: "Seeded composer entry remains in the current create-order surface.",
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
      "Autosave and unsaved-change protection remain composer-owned in step 5.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "SALE-ORD-018",
    workbook: "Sales",
    sheet: "Create Order",
    ownerSurface: "Sales -> Orders",
    criticality: "P1",
    proofStatus: "partial",
    routeOrEntry: "/sales?tab=create-order&clientId=:id",
    persona: "qa.salesmanager@terp.test",
    requiredArtifact: "customer-context-proof.png",
    notes:
      "Customer, pricing, credit, and referral context remain composer sidecars.",
    coverageMode: "classic-adjacent",
  },
  {
    capabilityId: "OPS-INV-001",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/operations?tab=inventory&surface=sheet-native",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "inventory-browse-proof.png",
    notes:
      "The base Inventory sheet request still resolved to the classic workbook surface in March 14, 2026 staging detection, so direct pilot live proof is deployment-gated while browse and triage behavior continues to use the current workbook as an oracle.",
    coverageMode: "sheet-native-direct",
    queryContractIds: ["inventory.getEnhanced", "inventory.dashboardStats"],
  },
  {
    capabilityId: "OPS-INV-002",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P0",
    proofStatus: "partial",
    routeOrEntry: "/operations?tab=inventory&surface=sheet-native&batchId=:id",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "inventory-inspector-proof.png",
    notes:
      "The base Inventory sheet request still resolved to the classic workbook surface in March 14, 2026 staging detection, so direct pilot live proof for inspector and deep-link behavior remains deployment-gated.",
    coverageMode: "sheet-native-direct",
    queryContractIds: ["inventory.getById"],
  },
  {
    capabilityId: "OPS-INV-003",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P0",
    proofStatus: "code-proven",
    routeOrEntry: "/operations?tab=inventory",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "add-inventory-proof.png",
    notes: "Add Inventory remains classic-adjacent during step 5.",
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
      "Status editing remains one of the intended direct pilot mutations, but the base Inventory sheet request still resolved to the classic workbook surface in March 14, 2026 staging detection, so direct pilot live proof is deployment-gated.",
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
      "Quantity adjustment remains an intended direct pilot mutation via dialog and inspector, with undo or reversal staying classic-adjacent for now, but the base Inventory sheet request still resolved to the classic workbook surface in March 14, 2026 staging detection, so direct pilot live proof is deployment-gated.",
    coverageMode: "sheet-native-direct",
    mutationContractIds: ["inventory.adjustQty"],
  },
  {
    capabilityId: "OPS-INV-006",
    workbook: "Operations",
    sheet: "Inventory",
    ownerSurface: "Operations -> Inventory",
    criticality: "P1",
    proofStatus: "code-proven",
    routeOrEntry: "/operations?tab=inventory",
    persona: "qa.inventory@terp.test",
    requiredArtifact: "bulk-action-proof.png",
    notes: "Bulk actions remain classic-adjacent during step 5.",
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
