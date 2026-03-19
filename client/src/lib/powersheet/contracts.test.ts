import { describe, expect, it } from "vitest";
import {
  applyFieldValueToSelectedRows,
  clearFieldValueForSelectedRows,
  createPowersheetEditRejection,
  deleteSelectedRows,
  duplicateSelectedRows,
  fillDownSelectedRows,
  type PowersheetFieldPolicy,
  type PowersheetFieldPolicyMap,
  type PowersheetSelectionSet,
  type PowersheetSelectionSummary,
} from "./contracts";

interface TestRow {
  id: string;
  quantity: string;
  unitCost: string;
}

const baseRows: TestRow[] = [
  { id: "r1", quantity: "1", unitCost: "10" },
  { id: "r2", quantity: "2", unitCost: "20" },
  { id: "r3", quantity: "3", unitCost: "30" },
];

describe("fillDownSelectedRows", () => {
  it("copies top selected value into all selected rows", () => {
    const rows = fillDownSelectedRows({
      rows: baseRows,
      selectedRowIds: new Set(["r1", "r3"]),
      getRowId: row => row.id,
      field: "quantity",
    });

    expect(rows[0].quantity).toBe("1");
    expect(rows[2].quantity).toBe("1");
    expect(rows[1].quantity).toBe("2");
  });
});

describe("duplicateSelectedRows", () => {
  it("duplicates selected rows with new ids", () => {
    const rows = duplicateSelectedRows({
      rows: baseRows,
      selectedRowIds: new Set(["r2"]),
      getRowId: row => row.id,
      duplicateRow: row => ({ ...row, id: `${row.id}-copy` }),
    });

    expect(rows).toHaveLength(4);
    expect(rows[3]).toEqual({ id: "r2-copy", quantity: "2", unitCost: "20" });
  });
});

describe("deleteSelectedRows", () => {
  it("enforces minimum remaining row count", () => {
    const blocked = deleteSelectedRows({
      rows: baseRows,
      selectedRowIds: new Set(["r1", "r2", "r3"]),
      getRowId: row => row.id,
      minimumRows: 1,
    });

    expect(blocked).toEqual(baseRows);

    const allowed = deleteSelectedRows({
      rows: baseRows,
      selectedRowIds: new Set(["r1", "r2"]),
      getRowId: row => row.id,
      minimumRows: 1,
    });
    expect(allowed).toEqual([{ id: "r3", quantity: "3", unitCost: "30" }]);
  });
});

describe("powersheet anti-drift foundation contracts", () => {
  it("supports cell/range selection metadata alongside row selection", () => {
    const selection: PowersheetSelectionSet = {
      focusedCell: { rowIndex: 2, columnKey: "quantity" },
      focusedRowId: "r3",
      anchorCell: { rowIndex: 0, columnKey: "quantity" },
      ranges: [
        {
          anchor: { rowIndex: 0, columnKey: "quantity" },
          focus: { rowIndex: 2, columnKey: "unitCost" },
        },
      ],
      selectedRowIds: new Set(["r1", "r2", "r3"]),
    };

    expect(selection.focusedCell?.columnKey).toBe("quantity");
    expect(selection.focusedRowId).toBe("r3");
    expect(selection.ranges).toHaveLength(1);
    expect(selection.selectedRowIds.size).toBe(3);
  });

  it("captures field safety and surface-level selection summary", () => {
    const policy: PowersheetFieldPolicy = {
      copyAllowed: true,
      pasteAllowed: false,
      fillAllowed: false,
      singleEditAllowed: false,
      multiEditAllowed: false,
      surfaceLabel: "Orders queue",
    };
    const summary: PowersheetSelectionSummary = {
      selectedCellCount: 12,
      selectedRowCount: 3,
      hasDiscontiguousSelection: true,
      focusedSurface: "orders-document-grid",
    };

    expect(policy.pasteAllowed).toBe(false);
    expect(policy.surfaceLabel).toBe("Orders queue");
    expect(summary.hasDiscontiguousSelection).toBe(true);
    expect(summary.selectedCellCount).toBe(12);
  });

  it("supports reusable field policy maps for surface-specific editing rules", () => {
    const fieldPolicies: PowersheetFieldPolicyMap<TestRow> = {
      quantity: {
        copyAllowed: true,
        pasteAllowed: true,
        fillAllowed: true,
        singleEditAllowed: true,
        multiEditAllowed: true,
        surfaceLabel: "Orders document grid",
      },
      unitCost: {
        copyAllowed: true,
        pasteAllowed: true,
        fillAllowed: true,
        singleEditAllowed: true,
        multiEditAllowed: true,
        surfaceLabel: "Orders document grid",
      },
    };

    expect(fieldPolicies.quantity?.fillAllowed).toBe(true);
    expect(fieldPolicies.unitCost?.surfaceLabel).toBe("Orders document grid");
  });
});

describe("applyFieldValueToSelectedRows", () => {
  it("updates only selected rows for the requested field", () => {
    const rows = applyFieldValueToSelectedRows({
      rows: baseRows,
      selectedRowIds: new Set(["r1", "r3"]),
      getRowId: row => row.id,
      field: "unitCost",
      value: "99",
    });

    expect(rows).toEqual([
      { id: "r1", quantity: "1", unitCost: "99" },
      { id: "r2", quantity: "2", unitCost: "20" },
      { id: "r3", quantity: "3", unitCost: "99" },
    ]);
  });
});

describe("clearFieldValueForSelectedRows", () => {
  it("clears the selected field using the supplied replacement value", () => {
    const rows = clearFieldValueForSelectedRows({
      rows: baseRows,
      selectedRowIds: new Set(["r2"]),
      getRowId: row => row.id,
      field: "quantity",
      value: "0",
    });

    expect(rows[1].quantity).toBe("0");
    expect(rows[0].quantity).toBe("1");
  });
});

describe("createPowersheetEditRejection", () => {
  it("creates a structured rejection payload for blocked spreadsheet actions", () => {
    expect(
      createPowersheetEditRejection(
        "lineTotal",
        "workflow-owned",
        "Line totals are derived and cannot be edited directly."
      )
    ).toEqual({
      columnKey: "lineTotal",
      reason: "workflow-owned",
      message: "Line totals are derived and cannot be edited directly.",
    });
  });
});
