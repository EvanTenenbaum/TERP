import React, { useCallback, useMemo, useRef } from "react";
import type {
  CellValueChangedEvent,
  ColDef,
  GridReadyEvent,
  GridApi,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { InventoryGridRow } from "@/types/spreadsheet";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// AG-Grid Community Edition - No license required
// Row grouping removed in favor of sorting by Date/Vendor

const statusOptions = [
  "AWAITING_INTAKE",
  "LIVE",
  "PHOTOGRAPHY_COMPLETE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED",
] as const;

const numberParser = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumber = (value: number): string => value.toLocaleString();

export const InventoryGrid = React.memo(function InventoryGrid() {
  const gridApiRef = useRef<GridApi<InventoryGridRow> | null>(null);

  const { data, isLoading, error, refetch } =
    trpc.spreadsheet.getInventoryGridData.useQuery({ limit: 200 });

  const adjustQty = trpc.inventory.adjustQty.useMutation({
    onSuccess: () => {
      toast.success("Quantity updated");
      void refetch();
    },
  });

  const updateStatus = trpc.inventory.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      void refetch();
    },
  });

  // TERP-SS-009: Mutation for updating ticket (unitCogs)
  const updateBatch = trpc.inventory.updateBatch.useMutation({
    onSuccess: (_, variables) => {
      const field = variables.ticket !== undefined ? "Ticket" : "Notes";
      toast.success(`${field} updated`);
      void refetch();
    },
  });

  const onGridReady = useCallback((event: GridReadyEvent<InventoryGridRow>) => {
    gridApiRef.current = event.api;
    // Apply default sort by Date (desc) then Vendor for logical grouping
    event.api.applyColumnState({
      state: [
        { colId: "lotDate", sort: "desc", sortIndex: 0 },
        { colId: "vendorCode", sort: "asc", sortIndex: 1 },
      ],
      defaultState: { sort: null },
    });
  }, []);

  // Column definitions - Community edition (no row grouping)
  // TERP-SS-006: Color coding for batch status preserved
  const columnDefs = useMemo<ColDef<InventoryGridRow>[]>(
    () => [
      {
        headerName: "Date",
        field: "lotDate",
        width: 130,
        sort: "desc",
        sortIndex: 0,
      },
      {
        headerName: "Vendor",
        field: "vendorCode",
        width: 140,
        sort: "asc",
        sortIndex: 1,
      },
      { headerName: "Source", field: "source", width: 140 },
      { headerName: "Category", field: "category", width: 140 },
      { headerName: "Item", field: "item", flex: 1, minWidth: 160 },
      {
        headerName: "Available",
        field: "available",
        width: 130,
        // TERP-SS-009: Editable field
        editable: true,
        valueFormatter: params => formatNumber(params.value ?? 0),
        valueParser: params => numberParser(params.newValue),
      },
      {
        headerName: "Intake",
        field: "intake",
        width: 120,
        valueFormatter: params => formatNumber(params.value ?? 0),
        editable: false,
      },
      {
        headerName: "Ticket",
        field: "ticket",
        width: 120,
        // TERP-SS-009: Editable field
        editable: true,
        valueFormatter: params => formatNumber(params.value ?? 0),
        valueParser: params => numberParser(params.newValue),
      },
      {
        headerName: "Sub",
        field: "sub",
        width: 120,
        valueFormatter: params => formatNumber(params.value ?? 0),
        editable: false,
      },
      {
        headerName: "Notes",
        field: "notes",
        flex: 1,
        minWidth: 200,
        // TERP-SS-009: Editable field
        editable: true,
      },
      {
        headerName: "Confirm",
        field: "confirm",
        width: 150,
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: statusOptions,
        },
        // TERP-SS-006: Color coding for batch status
        cellStyle: params => {
          const value = params.value;
          // Color coding for batch status: "C" (Curing) = Orange, "Ofc" (Office) = Cyan
          if (value === "C") {
            return { backgroundColor: "#fed7aa", color: "#9a3412" }; // Orange/Tan
          }
          if (value === "Ofc") {
            return { backgroundColor: "#a5f3fc", color: "#0e7490" }; // Cyan/Teal
          }
          return undefined;
        },
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef<InventoryGridRow>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<InventoryGridRow>) => {
      if (!event.data) return;

      // TERP-SS-009: Handle Available column edits
      if (event.colDef.field === "available") {
        const parsedNew = numberParser(event.newValue);
        if (parsedNew === null) {
          toast.error("Please enter a valid number");
          event.node.setDataValue("available", event.oldValue);
          return;
        }

        const currentAvailable = Number(event.oldValue);
        const delta = parsedNew - currentAvailable;
        if (delta === 0) return;

        adjustQty.mutate(
          {
            id: event.data.id,
            field: "onHandQty",
            adjustment: delta,
            reason: "Spreadsheet view edit",
          },
          {
            onError: () => {
              event.node.setDataValue("available", currentAvailable);
            },
          }
        );
        return;
      }

      // TERP-SS-009: Handle Ticket column edits
      if (event.colDef.field === "ticket") {
        const parsedNew = numberParser(event.newValue);
        if (parsedNew === null) {
          toast.error("Please enter a valid number for ticket price");
          event.node.setDataValue("ticket", event.oldValue);
          return;
        }

        if (parsedNew < 0) {
          toast.error("Ticket price cannot be negative");
          event.node.setDataValue("ticket", event.oldValue);
          return;
        }

        const currentTicket = Number(event.oldValue);
        if (parsedNew === currentTicket) return;

        updateBatch.mutate(
          {
            id: event.data.id,
            ticket: parsedNew,
            reason: "Spreadsheet view ticket edit",
          },
          {
            onError: () => {
              event.node.setDataValue("ticket", currentTicket);
            },
          }
        );
        return;
      }

      // TERP-SS-009: Handle Notes column edits
      if (event.colDef.field === "notes") {
        const newNotes =
          event.newValue !== null && event.newValue !== undefined
            ? String(event.newValue)
            : null;
        const oldNotes =
          event.oldValue !== null && event.oldValue !== undefined
            ? String(event.oldValue)
            : null;

        if (newNotes === oldNotes) return;

        updateBatch.mutate(
          {
            id: event.data.id,
            notes: newNotes,
            reason: "Spreadsheet view notes edit",
          },
          {
            onError: () => {
              event.node.setDataValue("notes", oldNotes);
            },
          }
        );
        return;
      }

      // Handle Confirm (status) column edits
      if (event.colDef.field === "confirm") {
        const status = String(
          event.newValue || ""
        ) as (typeof statusOptions)[number];
        if (!status || !statusOptions.includes(status)) {
          event.node.setDataValue("confirm", event.oldValue);
          return;
        }
        updateStatus.mutate(
          {
            id: event.data.id,
            status,
            reason: "Spreadsheet view status update",
          },
          {
            onError: () => {
              event.node.setDataValue("confirm", event.oldValue);
            },
          }
        );
      }
    },
    [adjustQty, updateStatus, updateBatch]
  );

  const totalAvailable = useMemo(() => {
    return (data?.rows ?? []).reduce((sum, row) => sum + row.available, 0);
  }, [data?.rows]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Inventory Grid</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sorted by Date and Vendor. Click column headers to re-sort.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Total Available:{" "}
            <span className="font-semibold text-foreground">
              {formatNumber(totalAvailable)}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 text-sm text-destructive">{error.message}</div>
        )}
        {!isLoading && !error && (!data?.rows || data.rows.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground mb-2">
              No inventory data available
            </p>
            <p className="text-sm text-muted-foreground">
              Add inventory batches to see them in the spreadsheet view
            </p>
          </div>
        ) : (
          <div className="ag-theme-alpine h-[600px] w-full">
            <AgGridReact<InventoryGridRow>
              rowData={data?.rows ?? []}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              // Row identity for efficient updates
              getRowId={params => String(params.data.id)}
              animateRows={false} // Disable for better performance
              pagination
              paginationPageSize={50}
              onCellValueChanged={handleCellValueChanged}
              onGridReady={onGridReady}
              suppressLoadingOverlay={!isLoading}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
});
