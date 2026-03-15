import { useEffect, useMemo, useState } from "react";
import type { CellValueChangedEvent, ColDef } from "ag-grid-community";
import { Package, RefreshCw, SquareArrowOutUpRight } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import {
  inventoryWorkbookAdapter,
  inventoryPilotColumnPresets,
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

const PAGE_SIZE = 100;

export function InventorySheetPilotSurface({
  onOpenClassic,
}: InventorySheetPilotSurfaceProps) {
  const { hasPermission } = usePermissions();
  const { selectedId: selectedBatchId, setSelectedId: setSelectedBatchId } =
    useSpreadsheetSelectionParam("batchId");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [page, setPage] = useState(1);

  const canUpdateInventory = hasPermission("inventory:update");

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const enhancedQuery = trpc.inventory.getEnhanced.useQuery({
    page,
    pageSize: PAGE_SIZE,
    cursor: (page - 1) * PAGE_SIZE,
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
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = Boolean(enhancedQuery.data?.pagination?.hasMore);

  const selectedRowOnPage =
    rows.find(row => row.batchId === selectedBatchId) ?? null;
  const selectedFallbackRow = useMemo(
    () =>
      selectedRowOnPage ? null : mapInventoryDetailToPilotRow(detailQuery.data),
    [detailQuery.data, selectedRowOnPage]
  );
  const selectedRow = selectedRowOnPage ?? selectedFallbackRow;
  const detailSummary = summarizeInventoryDetail(detailQuery.data);
  const views = viewsQuery.data?.items ?? [];
  const isDeepLinkedOutsideCurrentPage =
    selectedBatchId !== null &&
    selectedRowOnPage === null &&
    selectedRow !== null;

  const columnDefs = useMemo<ColDef<(typeof rows)[number]>[]>(
    () => [
      {
        field: "sku",
        headerName: "SKU",
        minWidth: 140,
      },
      {
        field: "productName",
        headerName: "Product",
        flex: 1.3,
        minWidth: 180,
      },
      {
        field: "vendorName",
        headerName: "Supplier",
        minWidth: 150,
      },
      {
        field: "brandName",
        headerName: "Brand",
        minWidth: 140,
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 150,
        editable: canUpdateInventory,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: [...STATUS_OPTIONS],
        },
      },
      {
        field: "onHandQty",
        headerName: "On Hand",
        minWidth: 110,
        valueFormatter: params => formatQuantity(Number(params.value ?? 0)),
      },
      {
        field: "availableQty",
        headerName: "Available",
        minWidth: 110,
        valueFormatter: params => formatQuantity(Number(params.value ?? 0)),
      },
      {
        field: "unitCogs",
        headerName: "Unit COGS",
        minWidth: 120,
        valueFormatter: params =>
          formatCurrency(
            params.value === null || params.value === undefined
              ? null
              : Number(params.value)
          ),
      },
    ],
    [canUpdateInventory]
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
        ? isDeepLinkedOutsideCurrentPage
          ? `Loaded ${selectedRow.sku} from batchId outside the current page`
          : `Selected ${selectedRow.sku}`
        : `Page ${page} of ${totalPages} · ${rows.length} visible rows · ${views.length} saved view${views.length === 1 ? "" : "s"}`}
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
        <Badge variant="secondary">
          {inventoryWorkbookAdapter.sheets[0]?.archetype} sheet
        </Badge>
        <Badge variant="outline">
          {inventoryPilotColumnPresets.length} locked column presets
        </Badge>
        <Badge variant="outline">limited browse + triage evaluation</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void enhancedQuery.refetch();
              void dashboardQuery.refetch();
              void detailQuery.refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenClassic(selectedBatchId)}
          >
            <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
            Classic Inventory
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        This internal sheet-native pilot is limited to browse, inspect, status
        update, and quantity adjustment. It shows one page at a time; use
        pagination or the classic inventory surface for the full toolset,
        including undo or reversal flows.
      </div>

      <SpreadsheetPilotGrid
        title="Inventory Sheet"
        description="Internal sheet-native evaluation for browse and triage behavior. Full inventory execution still lives in the classic surface."
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
            Page {page} of {totalPages} · {rows.length} visible rows out of{" "}
            {totalItems} filtered rows · {views.length} saved view
            {views.length === 1 ? "" : "s"} ·{" "}
            {canUpdateInventory ? "status editing enabled" : "read-only mode"}
          </span>
        }
        headerActions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedBatchId(null);
                setPage(currentPage => Math.max(1, currentPage - 1));
              }}
              disabled={!hasPreviousPage}
            >
              Previous Page
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedBatchId(null);
                setPage(currentPage => currentPage + 1);
              }}
              disabled={!hasNextPage}
            >
              Next Page
            </Button>
          </div>
        }
        minHeight={420}
      />

      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <span className="text-xs text-muted-foreground">
            {isDeepLinkedOutsideCurrentPage
              ? "Loaded via batchId outside the current page. Use page navigation to bring the row back into the visible grid."
              : "Click a row to inspect it."}{" "}
            Use the classic inventory surface for bulk actions, gallery, export,
            intake, and undo/reversal flows.
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
      >
        {selectedBatchId !== null ? (
          <div className="space-y-4">
            {isDeepLinkedOutsideCurrentPage ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                This inspector was loaded from the workbook URL. The selected
                batch is not on the current page of grid rows.
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
              <InspectorField label="Available Qty">
                <p>
                  {selectedRow
                    ? formatQuantity(selectedRow.availableQty)
                    : "Loading..."}
                </p>
              </InspectorField>
              <InspectorField label="Current Location">
                <p>{detailSummary?.currentLocation ?? "Loading..."}</p>
              </InspectorField>
            </InspectorSection>

            <InspectorSection title="Readiness">
              <InspectorField label="Locations">
                <p>{String(detailSummary?.locationCount ?? 0)}</p>
              </InspectorField>
              <InspectorField label="Audit Events">
                <p>{String(detailSummary?.auditLogCount ?? 0)}</p>
              </InspectorField>
              <InspectorField label="Stock Status">
                <p>{selectedRow?.stockStatus ?? "Unknown"}</p>
              </InspectorField>
            </InspectorSection>

            <InspectorSection title="Actions">
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setAdjustDialogOpen(true)}
                  disabled={!canUpdateInventory || selectedRow === null}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Adjust Quantity
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenClassic(selectedBatchId)}
                >
                  <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
                  Open Classic Detail
                </Button>
              </div>
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
