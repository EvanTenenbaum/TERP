import React, { useCallback, useMemo, useState } from "react";
import type {
  ColDef,
  ICellRendererParams,
  RowSelectedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc, staleTimePresets } from "@/lib/trpc";
import { toast } from "sonner";
import type { PickPackGridRow, PickPackStats } from "@/types/spreadsheet";
import { Package, RefreshCw, CheckCircle, Clock, Loader2 } from "lucide-react";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PICKING: "bg-blue-100 text-blue-800",
  PACKED: "bg-green-100 text-green-800",
  READY: "bg-purple-100 text-purple-800",
};

const StatusCellRenderer = (params: ICellRendererParams<PickPackGridRow>) => {
  const status = params.data?.pickPackStatus || "PENDING";
  return <Badge className={statusColors[status]}>{status}</Badge>;
};

const ProgressCellRenderer = (params: ICellRendererParams<PickPackGridRow>) => {
  const packed = params.data?.packedCount ?? 0;
  const total = params.data?.itemCount ?? 0;
  const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground min-w-[60px]">
        {packed}/{total}
      </span>
    </div>
  );
};

const currencyFormatter = (value: number | null): string =>
  value !== null
    ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "-";

export const PickPackGrid = React.memo(function PickPackGrid() {
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch pick list data
  const {
    data: pickListData,
    isLoading,
    error,
    refetch,
  } = trpc.pickPack.getPickList.useQuery(
    { limit: 50 },
    {
      staleTime: staleTimePresets.dynamic,
      refetchInterval: autoRefresh ? 30000 : false, // Poll every 30s if auto-refresh is enabled
    }
  );

  // Fetch stats
  const { data: statsData, refetch: refetchStats } =
    trpc.pickPack.getStats.useQuery(undefined, {
      staleTime: staleTimePresets.dynamic,
      refetchInterval: autoRefresh ? 30000 : false,
    });

  // Mutations
  const updateStatus = trpc.pickPack.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      void refetch();
      void refetchStats();
    },
    onError: err => {
      toast.error(`Failed to update status: ${err.message}`);
    },
  });

  const markAllPacked = trpc.pickPack.markAllPacked.useMutation({
    onSuccess: () => {
      toast.success("Order marked as packed");
      void refetch();
      void refetchStats();
    },
    onError: err => {
      toast.error(`Failed to pack order: ${err.message}`);
    },
  });

  const markOrderReady = trpc.pickPack.markOrderReady.useMutation({
    onSuccess: () => {
      toast.success("Order marked as ready");
      void refetch();
      void refetchStats();
    },
    onError: err => {
      toast.error(`Failed to mark ready: ${err.message}`);
    },
  });

  // Transform data for the grid
  const rows = useMemo<PickPackGridRow[]>(() => {
    return (pickListData ?? []).map(order => ({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      clientId: order.clientId,
      clientName: order.clientName,
      orderDate: order.createdAt
        ? new Date(order.createdAt).toISOString().slice(0, 10)
        : null,
      itemCount: order.itemCount,
      packedCount: order.packedCount,
      bagCount: order.bagCount,
      pickPackStatus: order.pickPackStatus as PickPackGridRow["pickPackStatus"],
      total:
        typeof order.total === "string" ? parseFloat(order.total) : order.total,
    }));
  }, [pickListData]);

  // Stats
  const stats: PickPackStats = useMemo(() => {
    return (
      statsData ?? {
        pending: 0,
        picking: 0,
        packed: 0,
        ready: 0,
        total: 0,
      }
    );
  }, [statsData]);

  const columnDefs = useMemo<ColDef<PickPackGridRow>[]>(
    () => [
      {
        headerName: "",
        field: "orderId",
        width: 50,
        checkboxSelection: true,
        headerCheckboxSelection: true,
      },
      {
        headerName: "Order #",
        field: "orderNumber",
        width: 140,
      },
      {
        headerName: "Client",
        field: "clientName",
        flex: 1,
        minWidth: 180,
      },
      {
        headerName: "Date",
        field: "orderDate",
        width: 120,
      },
      {
        headerName: "Items",
        field: "itemCount",
        width: 100,
      },
      {
        headerName: "Progress",
        field: "packedCount",
        width: 160,
        cellRenderer: ProgressCellRenderer,
      },
      {
        headerName: "Bags",
        field: "bagCount",
        width: 80,
      },
      {
        headerName: "Status",
        field: "pickPackStatus",
        width: 120,
        cellRenderer: StatusCellRenderer,
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["PENDING", "PICKING", "PACKED", "READY"],
        },
      },
      {
        headerName: "Total",
        field: "total",
        width: 120,
        valueFormatter: params => currencyFormatter(params.value),
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef<PickPackGridRow>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const handleRowSelected = useCallback(
    (event: RowSelectedEvent<PickPackGridRow>) => {
      const selectedNodes = event.api.getSelectedNodes();
      const selectedIds = selectedNodes
        .map(node => node.data?.orderId)
        .filter((id): id is number => id !== undefined);
      setSelectedOrderIds(selectedIds);
    },
    []
  );

  const handleCellValueChanged = useCallback(
    (event: {
      data?: PickPackGridRow;
      colDef: ColDef<PickPackGridRow>;
      newValue: unknown;
    }) => {
      if (!event.data) return;

      if (event.colDef.field === "pickPackStatus") {
        const status = event.newValue as PickPackGridRow["pickPackStatus"];
        if (status) {
          updateStatus.mutate({
            orderId: event.data.orderId,
            status,
          });
        }
      }
    },
    [updateStatus]
  );

  const handlePackSelected = useCallback(() => {
    if (selectedOrderIds.length === 0) {
      toast.error("No orders selected");
      return;
    }

    // Pack each selected order
    for (const orderId of selectedOrderIds) {
      markAllPacked.mutate({ orderId });
    }
  }, [selectedOrderIds, markAllPacked]);

  const handleMarkReady = useCallback(() => {
    if (selectedOrderIds.length === 0) {
      toast.error("No orders selected");
      return;
    }

    // Mark each selected order as ready
    for (const orderId of selectedOrderIds) {
      markOrderReady.mutate({ orderId });
    }
  }, [selectedOrderIds, markOrderReady]);

  const handleRefresh = useCallback(() => {
    void refetch();
    void refetchStats();
  }, [refetch, refetchStats]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Pick & Pack Queue</CardTitle>
          <p className="text-sm text-muted-foreground">
            Real-time order fulfillment queue. Uses existing pick/pack
            procedures.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex gap-3 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-semibold">{stats.pending}</span>
            </div>
            <div className="flex items-center gap-1">
              <Loader2 className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Picking:</span>
              <span className="font-semibold">{stats.picking}</span>
            </div>
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Packed:</span>
              <span className="font-semibold">{stats.packed}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              <span className="text-muted-foreground">Ready:</span>
              <span className="font-semibold">{stats.ready}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? (
                <>
                  <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                  Auto
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Manual
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePackSelected}
              disabled={
                selectedOrderIds.length === 0 || markAllPacked.isPending
              }
            >
              <Package className="mr-1 h-4 w-4" />
              Pack Selected
            </Button>
            <Button
              size="sm"
              onClick={handleMarkReady}
              disabled={
                selectedOrderIds.length === 0 || markOrderReady.isPending
              }
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Mark Ready
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* BUG-091 FIX: Add proper loading/error/empty state handling */}
        {error && (
          <div className="mb-3 p-4 text-sm text-destructive bg-destructive/10 rounded-md">
            <p className="font-medium">Unable to load pick/pack queue</p>
            <p className="text-muted-foreground mt-1">
              {error.message || "Please try again or contact support."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-2"
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}
        {isLoading && !error && (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
              <p className="mt-2 text-sm text-muted-foreground">
                Loading pick/pack queue...
              </p>
            </div>
          </div>
        )}
        {!isLoading && !error && rows.length === 0 && (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No orders in the pick/pack queue
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Orders will appear here when they need to be fulfilled
              </p>
            </div>
          </div>
        )}
        {!isLoading && !error && rows.length > 0 && (
        <div className="ag-theme-alpine h-[600px] w-full">
          <AgGridReact<PickPackGridRow>
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows
            pagination
            paginationPageSize={25}
            rowSelection="multiple"
            onRowSelected={handleRowSelected}
            onCellValueChanged={handleCellValueChanged}
            getRowId={params => String(params.data.orderId)}
            suppressLoadingOverlay={!isLoading}
            rowClassRules={{
              "bg-yellow-50": params =>
                params.data?.pickPackStatus === "PENDING",
              "bg-blue-50": params => params.data?.pickPackStatus === "PICKING",
              "bg-green-50": params => params.data?.pickPackStatus === "PACKED",
              "bg-purple-50": params => params.data?.pickPackStatus === "READY",
            }}
          />
        </div>
        )}
      </CardContent>
    </Card>
  );
});
