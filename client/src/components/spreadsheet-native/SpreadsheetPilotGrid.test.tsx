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
    const suppressKeyboardEvent = vi.fn();
    const onFillStart = vi.fn();
    const onCellSelectionDeleteStart = vi.fn();
    const setFillValue = vi.fn();

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
        suppressCutToClipboard
        suppressKeyboardEvent={suppressKeyboardEvent}
        onFillStart={onFillStart}
        fillHandleOptions={{
          direction: "y",
          setFillValue,
        }}
        onCellSelectionDeleteStart={onCellSelectionDeleteStart}
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
        direction: "y",
        setFillValue,
      },
    });
    expect(lastAgGridProps?.processCellFromClipboard).toBe(
      processCellFromClipboard
    );
    expect(lastAgGridProps?.processDataFromClipboard).toBe(
      processDataFromClipboard
    );
    expect(lastAgGridProps?.sendToClipboard).toBe(sendToClipboard);
    expect(lastAgGridProps?.suppressCutToClipboard).toBe(true);
    expect(lastAgGridProps?.defaultColDef).toMatchObject({
      suppressKeyboardEvent,
    });
    expect(lastAgGridProps?.onFillStart).toBe(onFillStart);
    expect(lastAgGridProps?.onCellSelectionDeleteStart).toBe(
      onCellSelectionDeleteStart
    );
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
    expect(onSelectionSetChange).toHaveBeenCalledWith(
      expect.objectContaining({
        focusedRowId: "row-2",
      })
    );
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

  it("does not re-emit the same focused row on duplicate cell-range events", () => {
    lastAgGridProps = null;

    const onSelectedRowChange = vi.fn();

    render(
      <SpreadsheetPilotGrid<TestRow>
        title="Orders Queue"
        rows={[
          { id: "row-1", sku: "SKU-001" },
          { id: "row-2", sku: "SKU-002" },
        ]}
        columnDefs={columnDefs}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        selectionMode="cell-range"
        selectionSurface="orders-queue"
        selectedRowId="row-2"
        onSelectedRowChange={onSelectedRowChange}
      />
    );

    const fakeColumns = [{ getColId: () => "sku" }];
    const focusedCell: {
      rowIndex: number;
      column: (typeof fakeColumns)[number];
    } = {
      rowIndex: 1,
      column: fakeColumns[0],
    };
    const fakeApi = {
      getFocusedCell: () => focusedCell,
      getCellRanges: () => [],
      getSelectedRows: () => [],
      clearFocusedCell: vi.fn(),
      clearCellSelection: vi.fn(),
      getDisplayedRowAtIndex: (rowIndex: number) =>
        rowIndex === 1 ? { data: { id: "row-2", sku: "SKU-002" } } : null,
      getAllDisplayedColumns: () => fakeColumns,
      setFocusedCell: vi.fn(),
      forEachNode: (
        callback: (node: { data: TestRow; rowIndex: number }) => void
      ) => callback({ data: { id: "row-2", sku: "SKU-002" }, rowIndex: 1 }),
    };

    lastAgGridProps?.onGridReady?.({ api: fakeApi });
    expect(onSelectedRowChange).toHaveBeenCalledTimes(1);

    lastAgGridProps?.onCellFocused?.({ api: fakeApi });
    lastAgGridProps?.onCellSelectionChanged?.({ api: fakeApi });

    expect(onSelectedRowChange).toHaveBeenCalledTimes(1);
  });

  it("does not re-emit the same selection summary on equivalent rerenders", () => {
    lastAgGridProps = null;

    const onSelectionSummaryChange = vi.fn();
    const fakeColumns = [{ getColId: () => "sku" }];
    const focusedCell: {
      rowIndex: number;
      column: (typeof fakeColumns)[number];
    } = {
      rowIndex: 0,
      column: fakeColumns[0],
    };
    const fakeApi = {
      getFocusedCell: () => focusedCell,
      getCellRanges: () => [],
      getSelectedRows: () => [],
      clearFocusedCell: vi.fn(),
      clearCellSelection: vi.fn(),
      getDisplayedRowAtIndex: (rowIndex: number) =>
        rowIndex === 0 ? { data: { id: "row-1", sku: "SKU-001" } } : null,
      getAllDisplayedColumns: () => fakeColumns,
      setFocusedCell: vi.fn(),
      forEachNode: (
        callback: (node: { data: TestRow; rowIndex: number }) => void
      ) => callback({ data: { id: "row-1", sku: "SKU-001" }, rowIndex: 0 }),
    };

    const { rerender } = render(
      <SpreadsheetPilotGrid<TestRow>
        title="Inventory Sheet"
        rows={rows}
        columnDefs={columnDefs}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        selectionMode="cell-range"
        selectionSurface="inventory-management"
        selectedRowId="row-1"
        onSelectionSummaryChange={onSelectionSummaryChange}
      />
    );

    lastAgGridProps?.onGridReady?.({ api: fakeApi });
    expect(onSelectionSummaryChange).toHaveBeenCalledTimes(1);

    rerender(
      <SpreadsheetPilotGrid<TestRow>
        title="Inventory Sheet"
        rows={rows}
        columnDefs={columnDefs}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        selectionMode="cell-range"
        selectionSurface="inventory-management"
        selectedRowId="row-1"
        onSelectionSummaryChange={onSelectionSummaryChange}
      />
    );

    expect(onSelectionSummaryChange).toHaveBeenCalledTimes(1);
  });

  it("emits null when the controlled selected row is cleared in cell-range mode", () => {
    lastAgGridProps = null;

    const onSelectedRowChange = vi.fn();
    const fakeColumns = [{ getColId: () => "sku" }];
    let focusedCell: {
      rowIndex: number;
      column: (typeof fakeColumns)[number];
    } | null = null;
    const fakeApi = {
      getFocusedCell: () => focusedCell,
      getCellRanges: () => [],
      getSelectedRows: () => [],
      clearFocusedCell: vi.fn(() => {
        focusedCell = null;
      }),
      clearCellSelection: vi.fn(),
      getDisplayedRowAtIndex: (rowIndex: number) =>
        rowIndex === 0 ? { data: { id: "row-1", sku: "SKU-001" } } : null,
      getAllDisplayedColumns: () => fakeColumns,
      setFocusedCell: vi.fn(
        (rowIndex: number, column: (typeof fakeColumns)[number]) => {
          focusedCell = { rowIndex, column };
        }
      ),
      forEachNode: (
        callback: (node: { data: TestRow; rowIndex: number }) => void
      ) => callback({ data: { id: "row-1", sku: "SKU-001" }, rowIndex: 0 }),
    };

    const { rerender } = render(
      <SpreadsheetPilotGrid<TestRow>
        title="Orders Queue"
        rows={rows}
        columnDefs={columnDefs}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        selectionMode="cell-range"
        selectionSurface="orders-queue"
        selectedRowId="row-1"
        onSelectedRowChange={onSelectedRowChange}
      />
    );

    lastAgGridProps?.onGridReady?.({ api: fakeApi });

    rerender(
      <SpreadsheetPilotGrid<TestRow>
        title="Orders Queue"
        rows={rows}
        columnDefs={columnDefs}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        selectionMode="cell-range"
        selectionSurface="orders-queue"
        selectedRowId={null}
        onSelectedRowChange={onSelectedRowChange}
      />
    );

    expect(onSelectedRowChange).toHaveBeenLastCalledWith(null);
    expect(fakeApi.clearFocusedCell).toHaveBeenCalledTimes(1);
    expect(fakeApi.clearCellSelection).toHaveBeenCalledTimes(1);
    const callCountAfterClear = onSelectedRowChange.mock.calls.length;

    lastAgGridProps?.onCellFocused?.({ api: fakeApi });
    lastAgGridProps?.onCellSelectionChanged?.({ api: fakeApi });

    expect(onSelectedRowChange).toHaveBeenCalledTimes(callCountAfterClear);
  });

  it("ignores destroyed grid APIs instead of reading selection state after teardown", () => {
    lastAgGridProps = null;

    const onSelectionSetChange = vi.fn();
    const onSelectionSummaryChange = vi.fn();

    render(
      <SpreadsheetPilotGrid<TestRow>
        title="Orders Queue"
        rows={rows}
        columnDefs={columnDefs}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        selectionMode="cell-range"
        selectionSurface="orders-queue"
        onSelectionSetChange={onSelectionSetChange}
        onSelectionSummaryChange={onSelectionSummaryChange}
      />
    );

    const destroyedApi = {
      isDestroyed: () => true,
    };

    lastAgGridProps?.onGridReady?.({ api: destroyedApi });

    expect(onSelectionSetChange).not.toHaveBeenCalled();
    expect(onSelectionSummaryChange).not.toHaveBeenCalled();
  });
});
