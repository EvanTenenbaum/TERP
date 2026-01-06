import React, { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import type { ClientGridRow, ClientGridSummary } from "@/types/spreadsheet";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

interface ClientRow {
  id: number;
  name: string;
  teriCode?: string | null;
}

const currencyFormatter = (value: number): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const ClientGrid = React.memo(function ClientGrid() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const {
    data: clientsData,
    isLoading: clientsLoading,
    error: clientsError,
  } = trpc.clients.list.useQuery({ limit: 50 });

  useEffect(() => {
    if (!selectedClientId && clientsData?.items?.length) {
      setSelectedClientId(clientsData.items[0]?.id ?? null);
    }
  }, [clientsData?.items, selectedClientId]);

  const {
    data: gridData,
    isLoading,
    error,
    refetch,
  } = trpc.spreadsheet.getClientGridData.useQuery(
    { clientId: selectedClientId ?? 0 },
    { enabled: Boolean(selectedClientId) }
  );

  const columnDefs = useMemo<ColDef<ClientGridRow>[]>(
    () => [
      { headerName: "Date", field: "date", width: 130 },
      // TERP-SS-003: Renamed from "Order #" to "Vendor Code" - now displays batch.code
      { headerName: "Vendor Code", field: "vendorCode", width: 140 },
      { headerName: "Item", field: "item", flex: 1, minWidth: 200 },
      {
        headerName: "Qty",
        field: "qty",
        width: 100,
        valueFormatter: params => params.value?.toString() ?? "0",
      },
      {
        headerName: "Unit Price",
        field: "unitPrice",
        width: 130,
        valueFormatter: params => currencyFormatter(params.value ?? 0),
      },
      {
        headerName: "Total",
        field: "total",
        width: 140,
        valueFormatter: params => currencyFormatter(params.value ?? 0),
      },
      // TERP-SS-005: Display actual payment amount in the "In" column
      {
        headerName: "In",
        field: "paymentAmount",
        width: 120,
        valueFormatter: params =>
          params.value > 0 ? currencyFormatter(params.value) : "-",
        cellStyle: params =>
          params.value > 0
            ? { backgroundColor: "#d4edda", color: "#155724" }
            : undefined,
      },
      { headerName: "Terms", field: "payment", width: 110 },
      { headerName: "Note", field: "note", flex: 1, minWidth: 180 },
      {
        headerName: "Paid",
        field: "paid",
        width: 80,
        valueFormatter: params => (params.value ? "Yes" : "No"),
      },
      {
        headerName: "Invoiced",
        field: "invoiced",
        width: 100,
        valueFormatter: params => (params.value ? "Yes" : "No"),
      },
      {
        headerName: "Confirmed",
        field: "confirmed",
        width: 110,
        valueFormatter: params => (params.value ? "Yes" : "No"),
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef<ClientGridRow>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const summary: ClientGridSummary | undefined = gridData?.summary;

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between space-y-0">
        <div>
          <CardTitle>Client Grid</CardTitle>
          <p className="text-sm text-muted-foreground">
            Master-detail layout powered by existing orders router.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {summary && (
            <div className="text-sm text-muted-foreground flex gap-4">
              <span>
                Total:{" "}
                <span className="font-semibold text-foreground">
                  ${currencyFormatter(summary.total)}
                </span>
              </span>
              <span>
                Balance:{" "}
                <span className="font-semibold text-foreground">
                  ${currencyFormatter(summary.balance)}
                </span>
              </span>
              <span>
                YTD:{" "}
                <span className="font-semibold text-foreground">
                  ${currencyFormatter(summary.yearToDate)}
                </span>
              </span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={!selectedClientId}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="border-muted-foreground/20">
            <CardHeader>
              <CardTitle className="text-base">Clients</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {clientsError && (
                <div className="px-4 pb-4 text-sm text-destructive">
                  {clientsError.message}
                </div>
              )}
              <ScrollArea className="h-[520px]">
                <div className="flex flex-col divide-y">
                  {(clientsData?.items as ClientRow[] | undefined)?.map(
                    client => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className={`flex w-full flex-col items-start px-4 py-3 text-left transition hover:bg-muted ${selectedClientId === client.id ? "bg-muted" : ""}`}
                        disabled={clientsLoading}
                      >
                        <span className="font-medium text-sm text-foreground">
                          {client.name}
                        </span>
                        {client.teriCode && (
                          <span className="text-xs text-muted-foreground">
                            TERI: {client.teriCode}
                          </span>
                        )}
                      </button>
                    )
                  )}
                  {!clientsData?.items?.length && !clientsLoading && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      No clients available.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="ag-theme-alpine h-[600px] w-full">
            {error && (
              <div className="mb-3 text-sm text-destructive">
                {error.message}
              </div>
            )}
            <AgGridReact<ClientGridRow>
              rowData={gridData?.rows ?? []}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              animateRows
              pagination
              paginationPageSize={50}
              suppressLoadingOverlay={!isLoading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
