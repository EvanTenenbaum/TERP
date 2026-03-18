/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ColDef } from "ag-grid-community";
import { SpreadsheetPilotGrid } from "./SpreadsheetPilotGrid";

let lastAgGridProps: Record<string, unknown> | null = null;

vi.mock("ag-grid-react", () => ({
  AgGridReact: (props: Record<string, unknown>) => {
    lastAgGridProps = props;
    return <div data-testid="mock-ag-grid">Mock AG Grid</div>;
  },
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
    lastAgGridProps = null;

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
    expect(lastAgGridProps?.rowSelection).toMatchObject({
      mode: "singleRow",
      checkboxes: false,
      enableClickSelection: true,
    });
    expect(lastAgGridProps?.cellSelection).toBeUndefined();
    expect(lastAgGridProps?.defaultColDef).toMatchObject({
      suppressMovable: true,
    });
  });

  it("can opt into Enterprise-backed cell-range mode without breaking the shared shell", () => {
    lastAgGridProps = null;
    const processCellFromClipboard = vi.fn();
    const processDataFromClipboard = vi.fn();
    const sendToClipboard = vi.fn();

    render(
      <SpreadsheetPilotGrid<TestRow>
        title="Orders Document Grid"
        rows={rows}
        columnDefs={columnDefs}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        selectionMode="cell-range"
        selectionSurface="orders-document-grid"
        processCellFromClipboard={processCellFromClipboard}
        processDataFromClipboard={processDataFromClipboard}
        sendToClipboard={sendToClipboard}
      />
    );

    expect(screen.getByTestId("mock-ag-grid")).toBeInTheDocument();
    expect(lastAgGridProps?.rowSelection).toBeUndefined();
    expect(lastAgGridProps?.undoRedoCellEditing).toBe(true);
    expect(lastAgGridProps?.cellSelection).toMatchObject({
      enableHeaderHighlight: true,
      enableColumnSelection: true,
      handle: {
        mode: "fill",
        direction: "xy",
      },
    });
    expect(lastAgGridProps?.processCellFromClipboard).toBe(
      processCellFromClipboard
    );
    expect(lastAgGridProps?.processDataFromClipboard).toBe(
      processDataFromClipboard
    );
    expect(lastAgGridProps?.sendToClipboard).toBe(sendToClipboard);
  });

  it("can explicitly opt into column reordering when a surface allows it", () => {
    lastAgGridProps = null;

    render(
      <SpreadsheetPilotGrid<TestRow>
        title="Queue"
        rows={rows}
        columnDefs={columnDefs}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        allowColumnReorder
      />
    );

    expect(lastAgGridProps?.defaultColDef).toMatchObject({
      suppressMovable: false,
    });
  });

  it("emits shared selection summaries and preserves focused-row semantics in cell-range mode", () => {
    lastAgGridProps = null;

    const onSelectionSetChange = vi.fn();
    const onSelectionSummaryChange = vi.fn();
    const onSelectedRowChange = vi.fn();

    render(
      <SpreadsheetPilotGrid<TestRow>
        title="Orders Queue"
        rows={[
          { id: "row-1", sku: "SKU-001" },
          { id: "row-2", sku: "SKU-002" },
        ]}
        columnDefs={[
          {
            field: "sku",
            headerName: "SKU",
          },
          {
            field: "id",
            headerName: "ID",
          },
        ]}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        selectionMode="cell-range"
        selectionSurface="orders-queue"
        selectedRowId="row-2"
        onSelectionSetChange={onSelectionSetChange}
        onSelectionSummaryChange={onSelectionSummaryChange}
        onSelectedRowChange={onSelectedRowChange}
      />
    );

    const fakeColumns = [
      {
        getColId: () => "sku",
      },
      {
        getColId: () => "id",
      },
    ];
    const fakeRows = [
      { data: { id: "row-1", sku: "SKU-001" }, rowIndex: 0 },
      { data: { id: "row-2", sku: "SKU-002" }, rowIndex: 1 },
    ];
    let focusedCell: {
      rowIndex: number;
      column: (typeof fakeColumns)[number];
    } | null = null;

    const fakeApi = {
      getFocusedCell: () => focusedCell,
      getCellRanges: () => [
        {
          startRow: { rowIndex: 0 },
          endRow: { rowIndex: 1 },
          startColumn: fakeColumns[0],
          columns: fakeColumns,
        },
      ],
      getSelectedRows: () => [],
      getDisplayedRowAtIndex: (rowIndex: number) => fakeRows[rowIndex] ?? null,
      getAllDisplayedColumns: () => fakeColumns,
      setFocusedCell: vi.fn(
        (rowIndex: number, column: (typeof fakeColumns)[number]) => {
          focusedCell = {
            rowIndex,
            column,
          };
        }
      ),
      forEachNode: (callback: (node: (typeof fakeRows)[number]) => void) => {
        fakeRows.forEach(row => callback(row));
      },
    };

    lastAgGridProps?.onGridReady?.({ api: fakeApi });

    expect(fakeApi.setFocusedCell).toHaveBeenCalledWith(1, fakeColumns[0]);
    expect(onSelectionSetChange).toHaveBeenCalled();
    expect(onSelectionSummaryChange).toHaveBeenCalledWith({
      selectedCellCount: 4,
      selectedRowCount: 2,
      hasDiscontiguousSelection: false,
      focusedSurface: "orders-queue",
    });
    expect(onSelectedRowChange).toHaveBeenCalledWith({
      id: "row-2",
      sku: "SKU-002",
    });
  });
});
