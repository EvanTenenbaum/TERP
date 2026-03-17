import { useEffect, useMemo, useState } from "react";
import type { CellValueChangedEvent, ColDef } from "ag-grid-community";
import { Package, RefreshCw, SquareArrowOutUpRight } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { buildOperationsWorkspacePath } from "@/lib/workspaceRoutes";
import {
  mapInventoryDetailToPilotRow,
  mapInventoryItemsToPilotRows,
  summarizeInventoryDetail,
  useSpreadsheetSelectionParam,
} from "@/lib/spreadsheet-native";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdjustQuantityDialog } from "@/components/AdjustQuantityDialog";
import {
  InspectorField,
  InspectorPanel,
  InspectorSection,
} from "@/components/work-surface/InspectorPanel";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { SpreadsheetPilotGrid } from "./SpreadsheetPilotGrid";

const STATUS_OPTIONS = [
  "AWAITING_INTAKE",
  "LIVE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED",
] as const;

const PAGE_SIZE = 100;

const formatCurrency = (value: number | null) =>
  value === null
    ? "-"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);

const formatQuantity = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

interface InventorySheetPilotSurfaceProps {
  onOpenClassic: (batchId?: number | null) => void;
}

interface InventoryLocationRow {
  id: string;
  locationLabel: string;
  quantity: number;
}

export function InventorySheetPilotSurface({
  onOpenClassic,
}: InventorySheetPilotSurfaceProps) {
  const [, setLocation] = useLocation();
  const { hasPermission } = usePermissions();
  const { selectedId: selectedBatchId, setSelectedId: setSelectedBatchId } =
    useSpreadsheetSelectionParam("batchId");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [loadedWindowCount, setLoadedWindowCount] = useState(1);

  const canUpdateInventory = hasPermission("inventory:update");

  useEffect(() => {
    setLoadedWindowCount(1);
  }, [search, statusFilter]);

  const loadedRowTarget = PAGE_SIZE * loadedWindowCount;

  const enhancedQuery = trpc.inventory.getEnhanced.useQuery({
    page: 1,
    pageSize: loadedRowTarget,
    cursor: 0,
    search: search || undefined,
    status: statusFilter === "ALL" ? undefined : [statusFilter],
    sortBy: "sku",
    sortOrder: "asc",
  });
  const dashboardQuery = trpc.inventory.dashboardStats.useQuery();
  const viewsQuery = trpc.inventory.views.list.useQuery();
  const detailQuery = trpc.inventory.getById.useQuery(selectedBatchId ?? 0, {
    enabled: selectedBatchId !== null,
  });

  const updateStatusMutation = trpc.inventory.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Batch status updated");
      void enhancedQuery.refetch();
      void detailQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const adjustQtyMutation = trpc.inventory.adjustQty.useMutation({
    onSuccess: () => {
      toast.success("Quantity updated");
      setAdjustDialogOpen(false);
      void enhancedQuery.refetch();
      void detailQuery.refetch();
      void dashboardQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to adjust quantity");
    },
  });

  const rows = useMemo(
    () => mapInventoryItemsToPilotRows(enhancedQuery.data?.items ?? []),
    [enhancedQuery.data?.items]
  );
  const totalItems = enhancedQuery.data?.summary.totalItems ?? rows.length;
  const hasMoreRows =
    Boolean(enhancedQuery.data?.pagination?.hasMore) ||
    rows.length < totalItems;

  const selectedRowOnGrid =
    rows.find(row => row.batchId === selectedBatchId) ?? null;
  const selectedFallbackRow = useMemo(
    () =>
      selectedRowOnGrid ? null : mapInventoryDetailToPilotRow(detailQuery.data),
    [detailQuery.data, selectedRowOnGrid]
  );
  const selectedRow = selectedRowOnGrid ?? selectedFallbackRow;
  const detailSummary = summarizeInventoryDetail(detailQuery.data);
  const views = viewsQuery.data?.items ?? [];
  const isDeepLinkedOutsideLoadedGrid =
    selectedBatchId !== null &&
    selectedRowOnGrid === null &&
    selectedRow !== null;

  const locationRows = useMemo<InventoryLocationRow[]>(
    () =>
      (detailQuery.data?.locations ?? []).map((location, index) => ({
        id: `${selectedBatchId ?? "batch"}-location-${index}`,
        locationLabel:
          location.site ||
          [location.zone, location.rack, location.shelf, location.bin]
            .filter(Boolean)
            .join(" / ") ||
          `Location ${index + 1}`,
        quantity:
          typeof location.qty === "number"
            ? location.qty
            : Number(location.qty ?? 0),
      })),
    [detailQuery.data?.locations, selectedBatchId]
  );

  const columnDefs = useMemo<ColDef<(typeof rows)[number]>[]>(
    () => [
      {
        field: "sku",
        headerName: "SKU",
        minWidth: 120,
        maxWidth: 140,
      },
      {
        field: "productSummary",
        headerName: "Product",
        flex: 1.3,
        minWidth: 280,
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 140,
        maxWidth: 150,
        editable: canUpdateInventory,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: [...STATUS_OPTIONS],
        },
      },
      {
        field: "availableQty",
        headerName: "Available",
        minWidth: 110,
        maxWidth: 120,
        valueFormatter: params => formatQuantity(Number(params.value ?? 0)),
      },
      {
        field: "onHandQty",
        headerName: "On Hand",
        minWidth: 110,
        maxWidth: 120,
        valueFormatter: params => formatQuantity(Number(params.value ?? 0)),
      },
      {
        field: "ageLabel",
        headerName: "Age",
        minWidth: 90,
        maxWidth: 100,
      },
    ],
    [canUpdateInventory]
  );

  const locationColumnDefs = useMemo<ColDef<InventoryLocationRow>[]>(
    () => [
      {
        field: "locationLabel",
        headerName: "Location",
        flex: 1.2,
        minWidth: 220,
      },
      {
        field: "quantity",
        headerName: "Qty",
        minWidth: 100,
        maxWidth: 120,
        valueFormatter: params => formatQuantity(Number(params.value ?? 0)),
      },
    ],
    []
  );

  const handleStatusEdit = (
    event: CellValueChangedEvent<(typeof rows)[number]>
  ) => {
    if (!event.data || !canUpdateInventory) {
      return;
    }

    const nextStatus = String(event.newValue || "").toUpperCase() as
      | "AWAITING_INTAKE"
      | "LIVE"
      | "ON_HOLD"
      | "QUARANTINED"
      | "SOLD_OUT"
      | "CLOSED";
    const previousStatus = String(event.oldValue || "").toUpperCase();
    if (!nextStatus || nextStatus === previousStatus) {
      return;
    }

    updateStatusMutation.mutate({
      id: event.data.batchId,
      status: nextStatus,
      reason: "Spreadsheet-native pilot status update",
    });
  };

  const statusBarLeft = (
    <span>
      {dashboardQuery.data?.totalUnits ?? 0} units across{" "}
      {dashboardQuery.data?.statusCounts
        ? Object.values(dashboardQuery.data.statusCounts).reduce(
            (sum, value) => sum + value,
            0
          )
        : rows.length}{" "}
      tracked batches
    </span>
  );

  const statusBarCenter = (
    <span>
      {selectedRow
        ? isDeepLinkedOutsideLoadedGrid
          ? `Loaded ${selectedRow.sku} from batchId outside the current loaded rows`
          : `Selected ${selectedRow.sku}`
        : `${rows.length} loaded rows of ${totalItems} · ${views.length} saved view${views.length === 1 ? "" : "s"}`}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search SKU, product, supplier"
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_OPTIONS.map(status => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline">Pilot: browse + two direct mutations</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setAdjustDialogOpen(true)}
            disabled={!canUpdateInventory || selectedRow === null}
          >
            <Package className="mr-2 h-4 w-4" />
            Adjust Qty
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setLocation(buildOperationsWorkspacePath("receiving"))
            }
          >
            Receiving Queue
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void enhancedQuery.refetch();
              void dashboardQuery.refetch();
              void detailQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
        <span className="text-sm font-medium text-foreground">
          {selectedRow
            ? `${selectedRow.sku} selected`
            : "Inventory pilot active"}
        </span>
        <span className="text-xs text-muted-foreground">
          The default sheet is width-disciplined: only the highest-yield browse
          columns stay visible, while deeper context moves into linked detail
          below.
        </span>
        {hasMoreRows ? (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setLoadedWindowCount(current => current + 1)}
          >
            Load More Rows
          </Button>
        ) : null}
      </div>

      <SpreadsheetPilotGrid
        title="Inventory Sheet"
        description="One main inventory table keeps SKU, product context, status, quantity, and age visible without forcing a wide default grid."
        rows={rows}
        columnDefs={columnDefs}
        getRowId={row => row.identity.rowKey}
        selectedRowId={selectedRow ? selectedRow.identity.rowKey : null}
        onSelectedRowChange={row => setSelectedBatchId(row?.batchId ?? null)}
        onCellValueChanged={handleStatusEdit}
        isLoading={enhancedQuery.isLoading}
        errorMessage={enhancedQuery.error?.message ?? null}
        emptyTitle="No inventory rows match this view"
        emptyDescription="Adjust the search or status filter, or switch back to the classic surface for the full inventory toolset."
        summary={
          <span>
            {rows.length} loaded rows out of {totalItems} filtered rows ·{" "}
            {views.length} saved view{views.length === 1 ? "" : "s"} ·{" "}
            {canUpdateInventory ? "status editing enabled" : "read-only mode"}
          </span>
        }
        headerActions={
          hasMoreRows ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLoadedWindowCount(current => current + 1)}
            >
              Load More
            </Button>
          ) : null
        }
        minHeight={420}
      />

      {selectedRow ? (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Product
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedRow.productSummary}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Available
            </div>
            <div className="mt-1 text-sm font-medium">
              {formatQuantity(selectedRow.availableQty)}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Locations
            </div>
            <div className="mt-1 text-sm font-medium">
              {detailSummary?.locationCount ?? 0}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Audit Events
            </div>
            <div className="mt-1 text-sm font-medium">
              {detailSummary?.auditLogCount ?? 0}
            </div>
          </div>
        </div>
      ) : null}

      <SpreadsheetPilotGrid
        title="Selected Batch Locations"
        description="This supporting table keeps storage context inline so the sheet can answer the next question without pushing routine work into the inspector."
        rows={locationRows}
        columnDefs={locationColumnDefs}
        getRowId={row => row.id}
        isLoading={detailQuery.isLoading}
        errorMessage={detailQuery.error?.message ?? null}
        emptyTitle="No batch selected"
        emptyDescription="Select a row above to load the current storage footprint for that batch."
        summary={
          selectedRow ? (
            <span>
              {selectedRow.sku} · {locationRows.length} linked storage rows
            </span>
          ) : undefined
        }
        minHeight={220}
      />

      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <span className="text-xs text-muted-foreground">
            {isDeepLinkedOutsideLoadedGrid
              ? "Loaded via batchId outside the current loaded rows. Use Load More to bring it into the grid."
              : "Click a row to inspect it."}{" "}
            Primary actions stay in the command strip; the inspector is for
            deeper batch context.
          </span>
        }
      />

      <InspectorPanel
        isOpen={selectedBatchId !== null}
        onClose={() => setSelectedBatchId(null)}
        title={selectedRow ? selectedRow.sku : "Batch Inspector"}
        subtitle={
          selectedRow?.productName ||
          (selectedBatchId ? `Batch #${selectedBatchId}` : "Select a batch")
        }
        headerActions={
          selectedRow ? (
            <Badge
              variant="outline"
              className={cn(
                "uppercase tracking-[0.12em]",
                selectedRow.status === "QUARANTINED" && "border-amber-300"
              )}
            >
              {selectedRow.status}
            </Badge>
          ) : null
        }
        footer={
          selectedBatchId !== null ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenClassic(selectedBatchId)}
            >
              <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
              Open Classic Detail
            </Button>
          ) : null
        }
      >
        {selectedBatchId !== null ? (
          <div className="space-y-4">
            {isDeepLinkedOutsideLoadedGrid ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                This inspector was loaded from the workbook URL. The selected
                batch is not in the current loaded grid rows yet.
              </div>
            ) : null}
            <InspectorSection title="Batch Summary">
              <InspectorField label="Product">
                <p>{selectedRow?.productName ?? "Loading..."}</p>
              </InspectorField>
              <InspectorField label="Supplier">
                <p>{selectedRow?.vendorName ?? "Loading..."}</p>
              </InspectorField>
              <InspectorField label="Brand">
                <p>{selectedRow?.brandName ?? "Loading..."}</p>
              </InspectorField>
              <InspectorField label="Current Location">
                <p>{detailSummary?.currentLocation ?? "Loading..."}</p>
              </InspectorField>
              <InspectorField label="Unit COGS">
                <p>{formatCurrency(selectedRow?.unitCogs ?? null)}</p>
              </InspectorField>
            </InspectorSection>

            <InspectorSection title="Evidence">
              <InspectorField label="Locations">
                <p>{String(detailSummary?.locationCount ?? 0)}</p>
              </InspectorField>
              <InspectorField label="Audit Events">
                <p>{String(detailSummary?.auditLogCount ?? 0)}</p>
              </InspectorField>
              <InspectorField label="Stock Status">
                <p>{selectedRow?.stockStatus ?? "Unknown"}</p>
              </InspectorField>
              <InspectorField label="Age">
                <p>{selectedRow?.ageLabel ?? "-"}</p>
              </InspectorField>
            </InspectorSection>
          </div>
        ) : null}
      </InspectorPanel>

      <AdjustQuantityDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        currentQuantity={selectedRow?.onHandQty ?? null}
        itemLabel={
          selectedRow ? `${selectedRow.sku} · ${selectedRow.productName}` : null
        }
        isPending={adjustQtyMutation.isPending}
        onSubmit={values => {
          if (!selectedRow) {
            return;
          }

          adjustQtyMutation.mutate({
            id: selectedRow.batchId,
            field: "onHandQty",
            adjustment: values.adjustment,
            adjustmentReason: values.adjustmentReason,
            notes: values.notes,
          });
        }}
      />
    </div>
  );
}

export default InventorySheetPilotSurface;
