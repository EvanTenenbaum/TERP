import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  inventoryWorkbookAdapter,
  mapInventoryDetailToPilotRow,
  mapInventoryItemsToPilotRows,
  mapOrderLineItemsToPilotRows,
  mapOrdersToPilotRows,
  pilotWorkbookAdapters,
} from "./pilotContracts";
import {
  pilotP0P1CapabilityProofCases,
  pilotProofDefinitions,
  pilotProofValidation,
} from "./pilotProofCases";
import { ordersRolloutRequirementById } from "./ordersRolloutContract";

function parseCsv(content: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      if (currentRow.some(value => value.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  const [header, ...dataRows] = rows;
  return dataRows.map(row =>
    Object.fromEntries(header.map((key, index) => [key, row[index] ?? ""]))
  );
}

function readLedgerCapabilityIds(filename: string) {
  const filePath = path.resolve(
    process.cwd(),
    "docs/specs/spreadsheet-native-ledgers",
    filename
  );
  const rows = parseCsv(readFileSync(filePath, "utf8"));
  return rows
    .filter(row => row["Criticality"] === "P0" || row["Criticality"] === "P1")
    .map(row => row["Capability ID"]);
}

function readPilotProofRows() {
  const filePath = path.resolve(
    process.cwd(),
    "docs/specs/spreadsheet-native-ledgers/pilot-proof-cases.csv"
  );
  return parseCsv(readFileSync(filePath, "utf8"));
}

function readSurfaceDetectionReport() {
  const filePath = path.resolve(
    process.cwd(),
    "docs/specs/spreadsheet-native-ledgers/sheet-native-surface-detection-2026-03-15.json"
  );
  return JSON.parse(readFileSync(filePath, "utf8")) as Array<{
    id: string;
    detectedSurface:
      | "sheet-native-pilot"
      | "classic-oracle"
      | "unknown"
      | "unauthenticated";
  }>;
}

describe("spreadsheet-native pilot contracts", () => {
  it("covers every P0 and P1 pilot ledger capability with a proof case", () => {
    const expectedIds = new Set([
      ...readLedgerCapabilityIds(
        "operations-inventory-sheet-capability-ledger.csv"
      ),
      ...readLedgerCapabilityIds("sales-orders-sheet-capability-ledger.csv"),
    ]);
    const actualIds = new Set(
      pilotP0P1CapabilityProofCases.map(proofCase => proofCase.capabilityId)
    );

    expect(actualIds).toEqual(expectedIds);
  });

  it("only references query and mutation contracts that exist", () => {
    expect(Array.from(pilotProofValidation.missingQueries.entries())).toEqual(
      []
    );
    expect(Array.from(pilotProofValidation.missingMutations.entries())).toEqual(
      []
    );
    expect(
      Array.from(pilotProofValidation.missingRequirements.entries())
    ).toEqual([]);
  });

  it("maps every Orders release-gate proof row back to at least one rollout requirement", () => {
    const ordersReleaseRows = pilotProofDefinitions.filter(
      definition =>
        definition.capabilityId.startsWith("SALE-ORD-") &&
        definition.coverageMode === "sheet-native-direct"
    );

    for (const definition of ordersReleaseRows) {
      expect(definition.requirementIds?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("keeps proof-to-requirement mappings reciprocal with the canonical rollout contract", () => {
    const ordersProofRows = pilotProofDefinitions.filter(definition =>
      definition.capabilityId.startsWith("SALE-ORD-")
    );

    for (const definition of ordersProofRows) {
      for (const requirementId of definition.requirementIds ?? []) {
        const requirement = ordersRolloutRequirementById.get(requirementId);
        expect(requirement).toBeDefined();
        expect(requirement?.linkedCapabilityIds).toContain(
          definition.capabilityId
        );
      }
    }
  });

  it("includes the anti-drift spreadsheet and surfacing release gates in the P0/P1 proof set", () => {
    const requiredCapabilityIds = [
      "SALE-ORD-019",
      "SALE-ORD-020",
      "SALE-ORD-021",
      "SALE-ORD-022",
      "SALE-ORD-023",
      "SALE-ORD-024",
      "SALE-ORD-025",
      "SALE-ORD-026",
      "SALE-ORD-027",
      "SALE-ORD-028",
      "SALE-ORD-029",
      "SALE-ORD-030",
      "SALE-ORD-031",
      "SALE-ORD-032",
      "SALE-ORD-033",
      "SALE-ORD-034",
      "SALE-ORD-035",
    ];
    const actualIds = new Set(
      pilotP0P1CapabilityProofCases.map(proofCase => proofCase.capabilityId)
    );

    for (const capabilityId of requiredCapabilityIds) {
      expect(actualIds.has(capabilityId)).toBe(true);
    }
  });

  it("keeps the checked-in proof CSV aligned with the machine-readable proof definitions", () => {
    const csvRowsByCapabilityId = new Map(
      readPilotProofRows().map(row => [row.capabilityId, row])
    );

    for (const definition of pilotProofDefinitions) {
      const csvRow = csvRowsByCapabilityId.get(definition.capabilityId);
      expect(csvRow).toBeDefined();
      expect(csvRow?.proofStatus).toBe(definition.proofStatus);
      expect(csvRow?.routeOrEntry).toBe(definition.routeOrEntry);
      expect(csvRow?.requiredArtifact).toBe(definition.requiredArtifact);
      expect((csvRow?.notes ?? "").length).toBeGreaterThan(0);
      expect((definition.notes ?? "").length).toBeGreaterThan(0);
    }
  });

  it("keeps one workbook adapter per pilot workbook with stable sheet ownership", () => {
    expect(pilotWorkbookAdapters).toHaveLength(2);
    expect(inventoryWorkbookAdapter.workbook.id).toBe("operations");
    expect(
      pilotWorkbookAdapters.find(adapter => adapter.workbook.id === "sales")
        ?.sheets[0]?.primaryOwnerSurface
    ).toBe("Sales -> Orders");
  });

  it("prevents sheet-native direct rows from claiming live proof while staging still serves classic oracle surfaces", () => {
    const detectionById = new Map(
      readSurfaceDetectionReport().map(result => [
        result.id,
        result.detectedSurface,
      ])
    );

    const groupedCapabilityIds = new Map<string, string[]>([
      [
        "sales-orders-sheet-pilot",
        ["SALE-ORD-001", "SALE-ORD-002", "SALE-ORD-009", "SALE-ORD-011"],
      ],
      [
        "inventory-sheet-pilot",
        ["OPS-INV-001", "OPS-INV-002", "OPS-INV-004", "OPS-INV-005"],
      ],
    ]);

    for (const [surfaceId, capabilityIds] of groupedCapabilityIds.entries()) {
      const detectedSurface = detectionById.get(surfaceId);
      expect(detectedSurface).toBeDefined();
      expect(["classic-oracle", "sheet-native-pilot"]).toContain(
        detectedSurface
      );

      const proofDefinitions = pilotProofDefinitions.filter(definition =>
        capabilityIds.includes(definition.capabilityId)
      );

      expect(proofDefinitions).toHaveLength(capabilityIds.length);

      if (detectedSurface === "classic-oracle") {
        expect(
          proofDefinitions.every(
            definition =>
              definition.proofStatus !== "live-proven" &&
              definition.notes?.includes("deployment-gated")
          )
        ).toBe(true);
      }
    }
  });

  it("normalizes inventory, order, and line-item rows into stable identities", () => {
    const inventoryRows = mapInventoryItemsToPilotRows([
      {
        id: 12,
        sku: "BATCH-12",
        productName: "Blue Dream",
        category: "Flower",
        subcategory: "Indoor",
        vendorName: "North Farm",
        brandName: "North Brand",
        grade: "A",
        status: "LIVE",
        onHandQty: "22.5",
        reservedQty: "2",
        quarantineQty: "1",
        holdQty: "0.5",
        unitCogs: "320",
        receivedDate: "2026-03-01T00:00:00.000Z",
        stockStatus: "OPTIMAL",
        version: 3,
      } as never,
    ]);
    expect(inventoryRows[0]).toMatchObject({
      batchId: 12,
      availableQty: 19,
      productSummary: "Blue Dream · North Farm / North Brand / A",
      ageLabel: expect.stringMatching(/\d+d/),
    });
    expect(inventoryRows[0]?.identity.rowKey).toBe("batch:12");

    const orderRows = mapOrdersToPilotRows({
      orders: [
        {
          id: 55,
          orderNumber: "SO-55",
          clientId: 8,
          orderType: "SALE",
          fulfillmentStatus: "READY_FOR_PACKING",
          total: "1200.50",
          lineItems: [{ id: 1 }],
          createdAt: "2026-03-01T00:00:00.000Z",
          confirmedAt: null,
          invoiceId: null,
          version: 5,
        } as never,
      ],
      clientNamesById: new Map([[8, "Atlas Labs"]]),
      lane: "confirmed",
    });
    expect(orderRows[0]).toMatchObject({
      clientName: "Atlas Labs",
      lineItemCount: 1,
      stageLabel: "Confirmed",
      nextStepLabel: "Accounting",
    });
    expect(orderRows[0]?.identity.rowKey).toBe("order:55");

    const lineRows = mapOrderLineItemsToPilotRows({
      order: { id: 55 } as never,
      lineItems: [
        {
          id: 9,
          batchId: 12,
          batchSku: "BATCH-12",
          productDisplayName: "Blue Dream",
          quantity: "4",
          unitPrice: "300",
          lineTotal: "1200",
          isSample: false,
        } as never,
      ],
    });
    expect(lineRows[0]).toMatchObject({
      orderId: 55,
      lineItemId: 9,
    });
    expect(lineRows[0]?.identity.rowKey).toBe("orderLineItem:9");

    expect(
      mapOrderLineItemsToPilotRows({
        order: { id: 55 } as never,
        lineItems: undefined as never,
      })
    ).toEqual([]);
  });

  it("builds a deep-link fallback inventory row from detail data", () => {
    const detailRow = mapInventoryDetailToPilotRow({
      batch: {
        id: 999,
        version: 4,
        sku: "BATCH-999",
        grade: "A",
        batchStatus: "LIVE",
        onHandQty: "15",
        reservedQty: "3",
        unitCogs: "220.5",
        createdAt: "2026-03-02T00:00:00.000Z",
      },
      locations: [],
      auditLogs: [],
      availableQty: "12",
    } as never);

    expect(detailRow).toMatchObject({
      batchId: 999,
      sku: "BATCH-999",
      status: "LIVE",
      onHandQty: 15,
      reservedQty: 3,
      availableQty: 12,
      unitCogs: 220.5,
    });
    expect(detailRow?.identity.rowKey).toBe("batch:999");
  });
});
