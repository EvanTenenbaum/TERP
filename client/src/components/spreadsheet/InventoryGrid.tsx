import React, { useCallback, useMemo } from "react";
import type { CellValueChangedEvent, ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { InventoryGridRow } from "@/types/spreadsheet";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

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
  const {
    data,
    isLoading,
    error,
    refetch,
  } = trpc.spreadsheet.getInventoryGridData.useQuery({ limit: 200 });

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

  const columnDefs = useMemo<ColDef<InventoryGridRow>[]>(() => [
    { headerName: "Vendor Code", field: "vendorCode", width: 140 },
    { headerName: "Date", field: "lotDate", width: 130 },
    { headerName: "Source", field: "source", width: 140 },
    { headerName: "Category", field: "category", width: 140 },
    { headerName: "Item", field: "item", flex: 1, minWidth: 160 },
    {
      headerName: "Available",
      field: "available",
      width: 130,
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
      editable: false,
      valueFormatter: params => formatNumber(params.value ?? 0),
    },
    {
      headerName: "Sub",
      field: "sub",
      width: 120,
      valueFormatter: params => formatNumber(params.value ?? 0),
      editable: false,
    },
    { headerName: "Notes", field: "notes", flex: 1, minWidth: 200 },
    {
      headerName: "Confirm",
      field: "confirm",
      width: 150,
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: statusOptions,
      },
    },
  ], []);

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

        adjustQty.mutate({
          id: event.data.id,
          field: "onHandQty",
          adjustment: delta,
          reason: "Spreadsheet view edit",
        }, {
          onError: () => {
            event.node.setDataValue("available", currentAvailable);
          },
        });
        return;
      }

      if (event.colDef.field === "confirm") {
        const status = String(event.newValue || "") as typeof statusOptions[number];
        if (!status || !statusOptions.includes(status)) {
          event.node.setDataValue("confirm", event.oldValue);
          return;
        }
        updateStatus.mutate({
          id: event.data.id,
          status,
          reason: "Spreadsheet view status update",
        }, {
          onError: () => {
            event.node.setDataValue("confirm", event.oldValue);
          },
        });
      }
    },
    [adjustQty, updateStatus]
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
            Inline edits use existing inventory procedures with full validation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Total Available: <span className="font-semibold text-foreground">{formatNumber(totalAvailable)}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 text-sm text-destructive">
            {error.message}
          </div>
        )}
        <div className="ag-theme-alpine h-[600px] w-full">
          <AgGridReact<InventoryGridRow>
            rowData={data?.rows ?? []}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows
            pagination
            paginationPageSize={50}
            onCellValueChanged={handleCellValueChanged}
            suppressLoadingOverlay={!isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
});
