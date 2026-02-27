import { describe, expect, it } from "vitest";
import {
  deleteSelectedRows,
  duplicateSelectedRows,
  fillDownSelectedRows,
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
