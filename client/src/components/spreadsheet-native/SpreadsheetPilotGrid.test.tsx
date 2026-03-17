/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ColDef } from "ag-grid-community";
import { SpreadsheetPilotGrid } from "./SpreadsheetPilotGrid";

vi.mock("ag-grid-react", () => ({
  AgGridReact: () => <div data-testid="mock-ag-grid">Mock AG Grid</div>,
}));

interface TestRow {
  id: string;
  sku: string;
}

const rows: TestRow[] = [
  {
    id: "row-1",
    sku: "SKU-001",
  },
];

const columnDefs: ColDef<TestRow>[] = [
  {
    field: "sku",
    headerName: "SKU",
  },
];

describe("SpreadsheetPilotGrid", () => {
  it("applies an explicit grid height so AG Grid can render rows", () => {
    render(
      <SpreadsheetPilotGrid<TestRow>
        title="Inventory Sheet"
        rows={rows}
        columnDefs={columnDefs}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        minHeight={420}
      />
    );

    expect(screen.getByTestId("mock-ag-grid")).toBeInTheDocument();
    expect(screen.getByTestId("spreadsheet-pilot-grid-shell")).toHaveStyle({
      height: "420px",
      minHeight: "420px",
    });
  });
});
