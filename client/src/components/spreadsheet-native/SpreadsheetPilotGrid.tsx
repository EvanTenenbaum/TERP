import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type {
  CellValueChangedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
} from "ag-grid-community";
import { themeAlpine } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";

interface SpreadsheetPilotGridProps<Row extends object> {
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
  minHeight = 320,
  onCellValueChanged,
}: SpreadsheetPilotGridProps<Row>) {
  const gridApiRef = useRef<GridApi<Row> | null>(null);

  const defaultColDef = useMemo<ColDef<Row>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      suppressMovable: false,
    }),
    []
  );

  const syncSelection = useCallback(() => {
    const gridApi = gridApiRef.current;
    if (!gridApi) {
      return;
    }

    gridApi.forEachNode(node => {
      const shouldSelect =
        selectedRowId !== null &&
        node.data !== undefined &&
        getRowId(node.data) === selectedRowId;
      node.setSelected(Boolean(shouldSelect), false);
    });
  }, [getRowId, selectedRowId]);

  useEffect(() => {
    syncSelection();
  }, [rows, selectedRowId, syncSelection]);

  const handleGridReady = (event: GridReadyEvent<Row>) => {
    gridApiRef.current = event.api;
    syncSelection();
  };

  const handleSelectionChanged = (event: SelectionChangedEvent<Row>) => {
    const selectedRow = event.api.getSelectedRows()[0] ?? null;
    onSelectedRowChange?.(selectedRow);
  };

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
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
            style={{ minHeight }}
            className="w-full overflow-hidden rounded-md"
          >
            <AgGridReact<Row>
              theme={themeAlpine}
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              animateRows
              rowSelection={{
                mode: "singleRow",
                checkboxes: false,
                enableClickSelection: true,
              }}
              onGridReady={handleGridReady}
              onSelectionChanged={handleSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              getRowId={params => getRowId(params.data)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SpreadsheetPilotGrid;
