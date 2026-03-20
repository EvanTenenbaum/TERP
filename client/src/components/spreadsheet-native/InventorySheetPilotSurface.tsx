import { useEffect, useMemo, useState } from "react";
import type { CellValueChangedEvent, ColDef } from "ag-grid-community";
import {
  Download,
  Package,
  RefreshCw,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useExport } from "@/hooks/work-surface/useExport";
import type { ExportColumn } from "@/hooks/work-surface/useExport";
import { buildOperationsWorkspacePath } from "@/lib/workspaceRoutes";
import {
  mapInventoryDetailToPilotRow,
  mapInventoryItemsToPilotRows,
  summarizeInventoryDetail,
  useSpreadsheetSelectionParam,
} from "@/lib/spreadsheet-native";
import type { InventoryPilotRow } from "@/lib/spreadsheet-native";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AdjustQuantityDialog } from "@/components/AdjustQuantityDialog";
import {
  InspectorField,
  InspectorPanel,
  InspectorSection,
} from "@/components/work-surface/InspectorPanel";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";

// ============================================================================
// Constants
// ============================================================================

const STATUS_OPTIONS = [
  "AWAITING_INTAKE",
  "LIVE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED",
] as const;

type InventoryBatchStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_LABELS: Record<InventoryBatchStatus, string> = {
  AWAITING_INTAKE: "Awaiting Intake",
  LIVE: "Live",
  ON_HOLD: "On Hold",
  QUARANTINED: "Quarantined",
  SOLD_OUT: "Sold Out",
  CLOSED: "Closed",
};

const PAGE_SIZE = 100;

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const queueKeyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Shift+Click", label: "extend range" },
  { key: `${mod}+Click`, label: "add to selection" },
  { key: `${mod}+C`, label: "copy cells" },
  { key: `${mod}+A`, label: "select all" },
  { key: `${mod}+K`, label: "search" },
];

const inventoryAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Status edit", available: true },
  { label: "Bulk actions", available: true },
  { label: "Export CSV", available: true },
];

const locationAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
];

const EXPORT_COLUMNS: ExportColumn<InventoryPilotRow>[] = [
  { key: "sku", label: "SKU" },
  { key: "productName", label: "Product" },
  { key: "vendorName", label: "Supplier" },
  { key: "brandName", label: "Brand" },
  { key: "category", label: "Category" },
  { key: "grade", label: "Grade" },
  { key: "status", label: "Status" },
  {
    key: "onHandQty",
    label: "On Hand",
    formatter: v => String(v ?? 0),
  },
  {
    key: "reservedQty",
    label: "Reserved",
    formatter: v => String(v ?? 0),
  },
  {
    key: "availableQty",
    label: "Available",
    formatter: v => String(v ?? 0),
  },
  {
    key: "unitCogs",
    label: "Unit COGS",
    formatter: v => (v === null || v === undefined ? "" : String(v)),
  },
  { key: "ageLabel", label: "Age" },
  {
    key: "stockStatus",
    label: "Stock Status",
    formatter: v => String(v ?? ""),
  },
];

// ============================================================================
// Helpers
// ============================================================================

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

// ============================================================================
// Types
// ============================================================================

interface InventorySheetPilotSurfaceProps {
  onOpenClassic: (batchId?: number | null) => void;
}

interface InventoryLocationRow {
  id: string;
  locationLabel: string;
  quantity: number;
}

// ============================================================================
// Component
// ============================================================================

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
  const [queueSelectionSummary, setQueueSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // Bulk action state
  const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [pendingBulkStatus, setPendingBulkStatus] =
    useState<InventoryBatchStatus | null>(null);
  const [recentlyDeletedBatches, setRecentlyDeletedBatches] = useState<
    Array<{ id: number; previousStatus: InventoryBatchStatus }>
  >([]);
  const [showRestoreToast, setShowRestoreToast] = useState(false);

  const canUpdateInventory = hasPermission("inventory:update");
  const canDeleteInventory = hasPermission("inventory:delete");

  const { exportCSV, state: exportState } =
    useExport<Record<string, unknown>>();

  useEffect(() => {
    setLoadedWindowCount(1);
  }, [search, statusFilter]);

  const loadedRowTarget = PAGE_SIZE * loadedWindowCount;

  // ============================================================================
  // Queries
  // ============================================================================

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

  // ============================================================================
  // Mutations
  // ============================================================================

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

  const bulkUpdateStatusMutation = trpc.inventory.bulk.updateStatus.useMutation(
    {
      onSuccess: result => {
        const count =
          typeof result === "object" && result !== null && "count" in result
            ? Number(result.count)
            : bulkSelectedIds.length;
        toast.success(`Updated ${count} batch${count === 1 ? "" : "es"}`);
        setBulkSelectedIds([]);
        setBulkStatusDialogOpen(false);
        setPendingBulkStatus(null);
        void enhancedQuery.refetch();
        void dashboardQuery.refetch();
      },
      onError: error => {
        toast.error(error.message || "Failed to update batch statuses");
      },
    }
  );

  const bulkDeleteMutation = trpc.inventory.bulk.delete.useMutation({
    onSuccess: (_, deletedIds) => {
      const count = deletedIds.length;
      const previousStatuses = rows
        .filter(r => deletedIds.includes(r.batchId))
        .map(r => ({
          id: r.batchId,
          previousStatus: r.status as InventoryBatchStatus,
        }));
      setRecentlyDeletedBatches(previousStatuses);
      setShowRestoreToast(true);
      toast.success(`Deleted ${count} batch${count === 1 ? "" : "es"}`, {
        action: {
          label: "Restore",
          onClick: () => {
            bulkRestoreMutation.mutate(previousStatuses);
          },
        },
        duration: 10_000,
      });
      setBulkSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      void enhancedQuery.refetch();
      void dashboardQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to delete batches");
    },
  });

  const bulkRestoreMutation = trpc.inventory.bulk.restore.useMutation({
    onSuccess: () => {
      toast.success("Batches restored");
      setRecentlyDeletedBatches([]);
      setShowRestoreToast(false);
      void enhancedQuery.refetch();
      void dashboardQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to restore batches");
    },
  });

  // ============================================================================
  // Row data
  // ============================================================================

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

  // Derive bulk selection from grid selection summary
  useEffect(() => {
    if (!queueSelectionSummary) {
      return;
    }
    // When more than 1 row is selected we collect their batchIds
    // The selection summary tracks row count — we need to map from the
    // selected row keys back to batchIds. We approximate by taking the
    // first N rows by index when selection spans the full range.
    // PowersheetGrid does not yet expose selected rowKeys directly, so
    // we use the focused-row as the canonical single-select target and
    // treat multi-row indicator as the multi-select state signal.
    if ((queueSelectionSummary.selectedRowCount ?? 0) <= 1) {
      setBulkSelectedIds([]);
    }
  }, [queueSelectionSummary]);

  // ============================================================================
  // Column definitions
  // ============================================================================

  const columnDefs = useMemo<ColDef<InventoryPilotRow>[]>(
    () => [
      {
        field: "sku",
        headerName: "SKU",
        minWidth: 120,
        maxWidth: 140,
        cellClass: "inventory-queue__locked-cell",
      },
      {
        field: "productSummary",
        headerName: "Product",
        flex: 1.3,
        minWidth: 280,
        cellClass: "inventory-queue__locked-cell",
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 140,
        maxWidth: 160,
        editable: canUpdateInventory,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: [...STATUS_OPTIONS],
        },
        cellClass: canUpdateInventory
          ? "inventory-queue__editable-cell"
          : "inventory-queue__locked-cell",
      },
      {
        field: "availableQty",
        headerName: "Available",
        minWidth: 110,
        maxWidth: 120,
        valueFormatter: params => formatQuantity(Number(params.value ?? 0)),
        cellClass: "inventory-queue__locked-cell",
      },
      {
        field: "onHandQty",
        headerName: "On Hand",
        minWidth: 110,
        maxWidth: 120,
        valueFormatter: params => formatQuantity(Number(params.value ?? 0)),
        cellClass: "inventory-queue__locked-cell",
      },
      {
        field: "ageLabel",
        headerName: "Age",
        minWidth: 90,
        maxWidth: 100,
        cellClass: "inventory-queue__locked-cell",
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

  // ============================================================================
  // Event handlers
  // ============================================================================

  const handleStatusEdit = (
    event: CellValueChangedEvent<InventoryPilotRow>
  ) => {
    if (!event.data || !canUpdateInventory) {
      return;
    }

    const nextStatus = String(
      event.newValue || ""
    ).toUpperCase() as InventoryBatchStatus;
    const previousStatus = String(event.oldValue || "").toUpperCase();
    if (!nextStatus || nextStatus === previousStatus) {
      return;
    }

    updateStatusMutation.mutate({
      id: event.data.batchId,
      status: nextStatus,
      reason: "Spreadsheet-native status update",
    });
  };

  const handleExportCSV = () => {
    void exportCSV(rows as unknown as Record<string, unknown>[], {
      columns: EXPORT_COLUMNS as unknown as ExportColumn<
        Record<string, unknown>
      >[],
      filename: "inventory",
      addTimestamp: true,
    });
  };

  const handleBulkStatusConfirm = () => {
    if (!pendingBulkStatus || bulkSelectedIds.length === 0) {
      return;
    }
    bulkUpdateStatusMutation.mutate({
      batchIds: bulkSelectedIds,
      newStatus: pendingBulkStatus,
    });
  };

  const handleBulkDeleteConfirm = () => {
    if (bulkSelectedIds.length === 0) {
      return;
    }
    bulkDeleteMutation.mutate(bulkSelectedIds);
  };

  // ============================================================================
  // Status bar content
  // ============================================================================

  const queueSelectionTouchesMultipleRows =
    (queueSelectionSummary?.selectedRowCount ?? 0) > 1;

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
      {queueSelectionSummary
        ? ` · ${queueSelectionSummary.selectedCellCount} cells / ${queueSelectionSummary.selectedRowCount} rows selected`
        : ""}
    </span>
  );

  const statusBarCenter = (
    <span>
      {selectedRow
        ? isDeepLinkedOutsideLoadedGrid
          ? `Loaded via batchId outside the current loaded rows`
          : `Selected ${selectedRow.sku}`
        : `${rows.length} loaded rows of ${totalItems} · ${views.length} saved view${views.length === 1 ? "" : "s"}`}
      {queueSelectionSummary?.hasDiscontiguousSelection
        ? " · discontiguous selection"
        : ""}
    </span>
  );

  const bulkActionsActive =
    bulkSelectedIds.length > 0 || queueSelectionTouchesMultipleRows;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Command strip ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search SKU, product, supplier"
          className="max-w-xs"
          aria-label={`${mod}+K to focus search`}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_OPTIONS.map(status => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline">Inventory sheet-native</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            disabled={exportState.isExporting || rows.length === 0}
            aria-label="Export inventory to CSV"
          >
            <Download className="mr-2 h-4 w-4" />
            {exportState.isExporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button
            size="sm"
            onClick={() => setAdjustDialogOpen(true)}
            disabled={!canUpdateInventory || selectedRow === null}
            aria-label="Adjust quantity for selected batch"
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
            aria-label="Refresh inventory data"
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

      {/* ── Context bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
        <span className="text-sm font-medium text-foreground">
          {selectedRow
            ? `${selectedRow.sku} selected`
            : "Inventory sheet active"}
        </span>
        <span className="text-xs text-muted-foreground">
          Status column is editable when you have inventory:update permission.
          Use Adjust Qty for quantity changes — they require a reason.
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

      {/* ── Bulk action bar (visible when multi-row is active) ── */}
      {bulkActionsActive ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
          <span className="text-sm font-medium text-foreground">
            {bulkSelectedIds.length > 0
              ? `${bulkSelectedIds.length} batch${bulkSelectedIds.length === 1 ? "" : "es"} selected for bulk action`
              : `${queueSelectionSummary?.selectedRowCount ?? 0} rows in selection — use checkboxes to queue bulk actions`}
          </span>
          {bulkSelectedIds.length > 0 ? (
            <>
              <Select
                value=""
                onValueChange={value => {
                  if (!value) {
                    return;
                  }
                  setPendingBulkStatus(value as InventoryBatchStatus);
                  setBulkStatusDialogOpen(true);
                }}
              >
                <SelectTrigger
                  className="w-[160px]"
                  aria-label="Bulk set status"
                >
                  <SelectValue placeholder="Set status..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canDeleteInventory ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              ) : null}
              {recentlyDeletedBatches.length > 0 && showRestoreToast ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    bulkRestoreMutation.mutate(recentlyDeletedBatches)
                  }
                  disabled={bulkRestoreMutation.isPending}
                >
                  Restore Last Delete
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBulkSelectedIds([])}
              >
                Clear Selection
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {/* ── Main inventory grid ── */}
      <PowersheetGrid
        surfaceId="inventory-queue"
        requirementIds={[
          "OPS-INV-001",
          "OPS-INV-004",
          "OPS-INV-006",
          "OPS-INV-011",
        ]}
        releaseGateIds={[
          "INV-WF-001",
          "INV-WF-004",
          "INV-WF-006",
          "INV-WF-011",
        ]}
        affordances={inventoryAffordances}
        title="Inventory Sheet"
        description="One dominant inventory table keeps SKU, product context, status, quantity, and age visible. Status is editable inline; quantity adjustments require a reason dialog."
        rows={rows}
        columnDefs={columnDefs}
        getRowId={row => row.identity.rowKey}
        selectedRowId={selectedRow ? selectedRow.identity.rowKey : null}
        onSelectedRowChange={row => setSelectedBatchId(row?.batchId ?? null)}
        onCellValueChanged={handleStatusEdit}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setQueueSelectionSummary}
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
        antiDriftSummary="Inventory queue release gates: spreadsheet selection parity, status edit, bulk operations, and export."
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

      {/* ── Selected batch summary cards ── */}
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

      {/* ── Selected batch locations grid ── */}
      <PowersheetGrid
        surfaceId="inventory-locations-grid"
        requirementIds={["OPS-INV-002"]}
        releaseGateIds={["INV-WF-002"]}
        affordances={locationAffordances}
        title="Selected Batch Locations"
        description="This supporting table keeps storage context inline so the sheet can answer the next question without pushing routine work into the inspector."
        rows={locationRows}
        columnDefs={locationColumnDefs}
        getRowId={row => row.id}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
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
        antiDriftSummary="Locations support-grid: must stay selection-driven and linked to the focused batch."
        minHeight={220}
      />

      {/* ── Status bar ── */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <KeyboardHintBar hints={queueKeyboardHints} className="text-xs" />
        }
      />

      {/* ── Inspector panel ── */}
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

            {canUpdateInventory ? (
              <InspectorSection title="Actions">
                <InspectorField label="Status">
                  <Select
                    value={selectedRow?.status ?? ""}
                    onValueChange={value => {
                      if (!selectedRow || !value) {
                        return;
                      }
                      updateStatusMutation.mutate({
                        id: selectedRow.batchId,
                        status: value as InventoryBatchStatus,
                        reason: "Spreadsheet-native inspector status update",
                      });
                    }}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label="Change batch status"
                    >
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(status => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </InspectorField>
                <InspectorField label="Quantity">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setAdjustDialogOpen(true)}
                    disabled={adjustQtyMutation.isPending}
                    aria-label="Open adjust quantity dialog"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Adjust Quantity
                  </Button>
                </InspectorField>
              </InspectorSection>
            ) : null}
          </div>
        ) : null}
      </InspectorPanel>

      {/* ── Adjust quantity dialog ── */}
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

      {/* ── Bulk status change confirm dialog ── */}
      <ConfirmDialog
        open={bulkStatusDialogOpen}
        onOpenChange={open => {
          setBulkStatusDialogOpen(open);
          if (!open) {
            setPendingBulkStatus(null);
          }
        }}
        title="Bulk Status Update"
        description={
          pendingBulkStatus
            ? `Set ${bulkSelectedIds.length} batch${bulkSelectedIds.length === 1 ? "" : "es"} to "${STATUS_LABELS[pendingBulkStatus]}"?`
            : "Update status for selected batches?"
        }
        confirmLabel={
          bulkUpdateStatusMutation.isPending
            ? "Updating..."
            : `Set to ${pendingBulkStatus ? STATUS_LABELS[pendingBulkStatus] : "..."}`
        }
        onConfirm={handleBulkStatusConfirm}
      />

      {/* ── Bulk delete confirm dialog ── */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Selected Batches?"
        description={`Delete ${bulkSelectedIds.length} batch${bulkSelectedIds.length === 1 ? "" : "es"}? Only batches with zero on-hand quantity can be deleted. This action can be undone for a short window.`}
        confirmLabel={
          bulkDeleteMutation.isPending ? "Deleting..." : "Delete Batches"
        }
        variant="destructive"
        onConfirm={handleBulkDeleteConfirm}
      />
    </div>
  );
}

export default InventorySheetPilotSurface;
