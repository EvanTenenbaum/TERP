import "@/lib/ag-grid";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type {
  CellSelectionDeleteEndEvent,
  CellSelectionDeleteStartEvent,
  CellFocusedEvent,
  ProcessCellForExportParams,
  ProcessDataFromClipboardParams,
  CellSelectionChangedEvent,
  CellValueChangedEvent,
  CellRange,
  ColDef,
  CutEndEvent,
  CutStartEvent,
  FillHandleOptions,
  FillEndEvent,
  FillStartEvent,
  GridApi,
  GridReadyEvent,
  PasteEndEvent,
  PasteStartEvent,
  SendToClipboardParams,
  SelectionChangedEvent,
} from "ag-grid-community";
import { themeAlpine } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import type {
  PowersheetSelectionSet,
  PowersheetSelectionSummary,
} from "@/lib/powersheet/contracts";

export type SpreadsheetPilotGridSelectionMode = "single-row" | "cell-range";

function isGridApiDestroyed<Row extends object>(gridApi: GridApi<Row> | null) {
  if (!gridApi) {
    return true;
  }

  const apiWithLifecycle = gridApi as GridApi<Row> & {
    isDestroyed?: () => boolean;
  };
  return apiWithLifecycle.isDestroyed?.() ?? false;
}

function getFocusedCellCoordinate<Row extends object>(
  gridApi: GridApi<Row>
): PowersheetSelectionSet["focusedCell"] {
  const focusedCell = gridApi.getFocusedCell();
  if (!focusedCell) {
    return null;
  }

  return {
    rowIndex: focusedCell.rowIndex,
    columnKey: focusedCell.column.getColId(),
  };
}

function addRangeRowIds<Row extends object>(
  selectedRowIds: Set<string>,
  gridApi: GridApi<Row>,
  range: CellRange,
  getRowId: (row: Row) => string
) {
  const startRowIndex = range.startRow?.rowIndex;
  const endRowIndex = range.endRow?.rowIndex;
  if (startRowIndex === undefined || endRowIndex === undefined) {
    return;
  }

  const minRowIndex = Math.min(startRowIndex, endRowIndex);
  const maxRowIndex = Math.max(startRowIndex, endRowIndex);
  for (let rowIndex = minRowIndex; rowIndex <= maxRowIndex; rowIndex += 1) {
    const rowNode = gridApi.getDisplayedRowAtIndex(rowIndex);
    if (rowNode?.data) {
      selectedRowIds.add(getRowId(rowNode.data));
    }
  }
}

function buildSelectionSet<Row extends object>(
  gridApi: GridApi<Row>,
  getRowId: (row: Row) => string
): PowersheetSelectionSet {
  const ranges = (gridApi.getCellRanges() ?? [])
    .map(range => {
      const startRowIndex = range.startRow?.rowIndex;
      const endRowIndex = range.endRow?.rowIndex;
      const startColumnKey = range.startColumn?.getColId();
      const endColumnKey =
        range.columns[range.columns.length - 1]?.getColId() ??
        range.startColumn?.getColId();

      if (
        startRowIndex === undefined ||
        endRowIndex === undefined ||
        !startColumnKey ||
        !endColumnKey
      ) {
        return null;
      }

      return {
        anchor: {
          rowIndex: startRowIndex,
          columnKey: startColumnKey,
        },
        focus: {
          rowIndex: endRowIndex,
          columnKey: endColumnKey,
        },
      };
    })
    .filter(
      (range): range is PowersheetSelectionSet["ranges"][number] =>
        range !== null
    );

  const focusedCell = getFocusedCellCoordinate(gridApi);
  let focusedRowId: string | null = null;
  const selectedRowIds = new Set(
    gridApi
      .getSelectedRows()
      .map(row => getRowId(row))
      .filter((rowId): rowId is string => Boolean(rowId))
  );

  for (const range of gridApi.getCellRanges() ?? []) {
    addRangeRowIds(selectedRowIds, gridApi, range, getRowId);
  }

  if (focusedCell) {
    const focusedRowNode = gridApi.getDisplayedRowAtIndex(focusedCell.rowIndex);
    if (focusedRowNode?.data) {
      focusedRowId = getRowId(focusedRowNode.data);
      selectedRowIds.add(focusedRowId);
    }
  }

  return {
    focusedCell,
    focusedRowId,
    anchorCell: ranges[0]?.anchor ?? focusedCell,
    ranges,
    selectedRowIds,
  };
}

function buildSelectionSummary<Row extends object>(
  gridApi: GridApi<Row>,
  selectionSet: PowersheetSelectionSet,
  focusedSurface: PowersheetSelectionSummary["focusedSurface"]
): PowersheetSelectionSummary {
  const selectedCellKeys = new Set<string>();

  for (const range of gridApi.getCellRanges() ?? []) {
    const startRowIndex = range.startRow?.rowIndex;
    const endRowIndex = range.endRow?.rowIndex;
    if (startRowIndex === undefined || endRowIndex === undefined) {
      continue;
    }

    const minRowIndex = Math.min(startRowIndex, endRowIndex);
    const maxRowIndex = Math.max(startRowIndex, endRowIndex);

    for (let rowIndex = minRowIndex; rowIndex <= maxRowIndex; rowIndex += 1) {
      range.columns.forEach(column => {
        const columnKey = column.getColId();
        selectedCellKeys.add(`${rowIndex}:${columnKey}`);
      });
    }
  }

  if (selectedCellKeys.size === 0 && selectionSet.focusedCell) {
    selectedCellKeys.add(
      `${selectionSet.focusedCell.rowIndex}:${selectionSet.focusedCell.columnKey}`
    );
  }

  return {
    selectedCellCount: selectedCellKeys.size,
    selectedRowCount: selectionSet.selectedRowIds.size,
    hasDiscontiguousSelection: selectionSet.ranges.length > 1,
    focusedSurface,
  };
}

function focusSelectedRowCell<Row extends object>(
  gridApi: GridApi<Row>,
  selectedRowId: string | null,
  getRowId: (row: Row) => string
) {
  if (!selectedRowId || isGridApiDestroyed(gridApi)) {
    return;
  }

  const focusColumn = gridApi.getAllDisplayedColumns()[0];
  if (!focusColumn) {
    return;
  }

  let matchedRowIndex: number | null = null;
  gridApi.forEachNode(node => {
    if (matchedRowIndex !== null || !node.data) {
      return;
    }

    if (getRowId(node.data) === selectedRowId) {
      matchedRowIndex = node.rowIndex ?? null;
    }
  });

  if (matchedRowIndex === null) {
    return;
  }

  const focusedCell = gridApi.getFocusedCell();
  if (
    focusedCell?.rowIndex === matchedRowIndex &&
    focusedCell.column.getColId() === focusColumn.getColId()
  ) {
    return;
  }

  gridApi.setFocusedCell(matchedRowIndex, focusColumn);
}

export interface SpreadsheetPilotGridProps<Row extends object> {
  title: string;
  description?: string;
  rows: Row[];
  columnDefs: ColDef<Row>[];
  getRowId: (row: Row) => string;
  selectedRowId?: string | null;
  onSelectedRowChange?: (row: Row | null) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  emptyTitle: string;
  emptyDescription: string;
  headerActions?: ReactNode;
  summary?: ReactNode;
  minHeight?: number;
  onCellValueChanged?: (event: CellValueChangedEvent<Row>) => void;
  selectionMode?: SpreadsheetPilotGridSelectionMode;
  selectionSurface?: PowersheetSelectionSummary["focusedSurface"];
  enableFillHandle?: boolean;
  fillHandleOptions?: Omit<FillHandleOptions<Row>, "mode">;
  enableUndoRedo?: boolean;
  allowColumnReorder?: boolean;
  enterNavigatesVertically?: boolean;
  enterNavigatesVerticallyAfterEdit?: boolean;
  stopEditingWhenCellsLoseFocus?: boolean;
  processCellForClipboard?: (
    params: ProcessCellForExportParams<Row>
  ) => unknown;
  processCellFromClipboard?: (
    params: ProcessCellForExportParams<Row>
  ) => unknown;
  processDataFromClipboard?: (
    params: ProcessDataFromClipboardParams<Row>
  ) => string[][] | null;
  sendToClipboard?: (params: SendToClipboardParams<Row>) => void;
  suppressCutToClipboard?: boolean;
  suppressKeyboardEvent?: NonNullable<ColDef<Row>["suppressKeyboardEvent"]>;
  onCutStart?: (event: CutStartEvent<Row>) => void;
  onCutEnd?: (event: CutEndEvent<Row>) => void;
  onPasteStart?: (event: PasteStartEvent<Row>) => void;
  onPasteEnd?: (event: PasteEndEvent<Row>) => void;
  onFillStart?: (event: FillStartEvent<Row>) => void;
  onFillEnd?: (event: FillEndEvent<Row>) => void;
  onCellSelectionDeleteStart?: (
    event: CellSelectionDeleteStartEvent<Row>
  ) => void;
  onCellSelectionDeleteEnd?: (event: CellSelectionDeleteEndEvent<Row>) => void;
  onSelectionSetChange?: (selectionSet: PowersheetSelectionSet) => void;
  onSelectionSummaryChange?: (
    selectionSummary: PowersheetSelectionSummary
  ) => void;
  rowHeight?: number;
}

export function SpreadsheetPilotGrid<Row extends object>({
  title,
  description,
  rows,
  columnDefs,
  getRowId,
  selectedRowId = null,
  onSelectedRowChange,
  isLoading = false,
  errorMessage = null,
  emptyTitle,
  emptyDescription,
  headerActions,
  summary,
  minHeight = 520,
  onCellValueChanged,
  selectionMode = "single-row",
  selectionSurface,
  enableFillHandle = true,
  fillHandleOptions,
  enableUndoRedo = true,
  allowColumnReorder = false,
  enterNavigatesVertically = false,
  enterNavigatesVerticallyAfterEdit = false,
  stopEditingWhenCellsLoseFocus = false,
  processCellForClipboard,
  processCellFromClipboard,
  processDataFromClipboard,
  sendToClipboard,
  suppressCutToClipboard = false,
  suppressKeyboardEvent,
  onCutStart,
  onCutEnd,
  onPasteStart,
  onPasteEnd,
  onFillStart,
  onFillEnd,
  onCellSelectionDeleteStart,
  onCellSelectionDeleteEnd,
  onSelectionSetChange,
  onSelectionSummaryChange,
  rowHeight: rowHeightProp,
}: SpreadsheetPilotGridProps<Row>) {
  const gridApiRef = useRef<GridApi<Row> | null>(null);
  const isCellRangeMode = selectionMode === "cell-range";

  useEffect(() => {
    return () => {
      gridApiRef.current = null;
    };
  }, []);

  const defaultColDef = useMemo<ColDef<Row>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      suppressMovable: !allowColumnReorder,
      suppressKeyboardEvent,
    }),
    [allowColumnReorder, suppressKeyboardEvent]
  );

  const emitSelectionState = useCallback(
    (gridApi: GridApi<Row>) => {
      if (!isCellRangeMode || isGridApiDestroyed(gridApi)) {
        return;
      }

      const selectionSet = buildSelectionSet(gridApi, getRowId);
      onSelectionSetChange?.(selectionSet);

      if (selectionSurface) {
        onSelectionSummaryChange?.(
          buildSelectionSummary(gridApi, selectionSet, selectionSurface)
        );
      }

      if (selectionSet.focusedCell) {
        const focusedRowNode = gridApi.getDisplayedRowAtIndex(
          selectionSet.focusedCell.rowIndex
        );
        onSelectedRowChange?.(focusedRowNode?.data ?? null);
      }
    },
    [
      getRowId,
      isCellRangeMode,
      onSelectedRowChange,
      onSelectionSetChange,
      onSelectionSummaryChange,
      selectionSurface,
    ]
  );

  const syncSelection = useCallback(() => {
    const gridApi = gridApiRef.current;
    if (!gridApi || isGridApiDestroyed(gridApi)) {
      return;
    }
    const activeGridApi: GridApi<Row> = gridApi;

    if (isCellRangeMode) {
      focusSelectedRowCell(activeGridApi, selectedRowId, getRowId);
      emitSelectionState(activeGridApi);
      return;
    }

    activeGridApi.forEachNode(node => {
      const shouldSelect =
        selectedRowId !== null &&
        node.data !== undefined &&
        getRowId(node.data) === selectedRowId;
      node.setSelected(Boolean(shouldSelect), false);
    });
  }, [emitSelectionState, getRowId, isCellRangeMode, selectedRowId]);

  useEffect(() => {
    syncSelection();
  }, [rows, selectedRowId, syncSelection]);

  const handleGridReady = (event: GridReadyEvent<Row>) => {
    gridApiRef.current = event.api;
    syncSelection();
    emitSelectionState(event.api);
  };

  const handleSelectionChanged = (event: SelectionChangedEvent<Row>) => {
    if (isCellRangeMode || isGridApiDestroyed(event.api)) {
      return;
    }

    const selectedRow = event.api.getSelectedRows()[0] ?? null;
    onSelectedRowChange?.(selectedRow);
  };

  const handleCellFocused = (event: CellFocusedEvent<Row>) => {
    emitSelectionState(event.api);
  };

  const handleCellSelectionChanged = (
    event: CellSelectionChangedEvent<Row>
  ) => {
    emitSelectionState(event.api);
  };

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
          {summary ? (
            <div className="text-xs text-muted-foreground">{summary}</div>
          ) : null}
        </div>
        {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState message={`Loading ${title.toLowerCase()}...`} />
        ) : errorMessage ? (
          <EmptyState
            variant="spreadsheet"
            title={`Unable to load ${title.toLowerCase()}`}
            description={errorMessage}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            variant="spreadsheet"
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div
            data-testid="spreadsheet-pilot-grid-shell"
            style={{ height: minHeight, minHeight }}
            className="w-full overflow-hidden rounded-md"
          >
            <AgGridReact<Row>
              theme={themeAlpine}
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={rowHeightProp ?? 28}
              headerHeight={32}
              animateRows
              rowSelection={
                isCellRangeMode
                  ? undefined
                  : {
                      mode: "singleRow",
                      checkboxes: false,
                      enableClickSelection: true,
                    }
              }
              cellSelection={
                isCellRangeMode
                  ? {
                      enableHeaderHighlight: true,
                      enableColumnSelection: true,
                      handle: enableFillHandle
                        ? {
                            mode: "fill",
                            direction: "xy",
                            ...fillHandleOptions,
                          }
                        : {
                            mode: "range",
                          },
                    }
                  : undefined
              }
              undoRedoCellEditing={isCellRangeMode ? enableUndoRedo : false}
              enterNavigatesVertically={enterNavigatesVertically}
              enterNavigatesVerticallyAfterEdit={
                enterNavigatesVerticallyAfterEdit
              }
              stopEditingWhenCellsLoseFocus={stopEditingWhenCellsLoseFocus}
              processCellForClipboard={processCellForClipboard}
              processCellFromClipboard={processCellFromClipboard}
              processDataFromClipboard={processDataFromClipboard}
              sendToClipboard={sendToClipboard}
              suppressCutToClipboard={suppressCutToClipboard}
              onGridReady={handleGridReady}
              onSelectionChanged={handleSelectionChanged}
              onCellFocused={handleCellFocused}
              onCellSelectionChanged={handleCellSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              onCutStart={onCutStart}
              onCutEnd={onCutEnd}
              onPasteStart={onPasteStart}
              onPasteEnd={onPasteEnd}
              onFillStart={onFillStart}
              onFillEnd={onFillEnd}
              onCellSelectionDeleteStart={onCellSelectionDeleteStart}
              onCellSelectionDeleteEnd={onCellSelectionDeleteEnd}
              getRowId={params => getRowId(params.data)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SpreadsheetPilotGrid;
