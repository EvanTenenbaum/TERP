/**
 * InventoryManagementSurface
 *
 * Unified sheet-native surface for inventory management.
 * Replaces both InventoryWorkSurface (classic) and InventorySheetPilotSurface (pilot).
 *
 * Layout: Toolbar → Action Bar → Advanced Filters → Grid/Gallery → Summary Cards → Status Bar
 *         + InspectorPanel (on demand) + AdjustmentContextDrawer (on qty edit)
 *
 * Spec: docs/superpowers/plans/2026-03-27-sales-catalogue-unified-surface.md
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CellValueChangedEvent, ColDef } from "ag-grid-community";
import {
  Download,
  Filter,
  Grid3X3,
  Image,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useExport } from "@/hooks/work-surface/useExport";
import type { ExportColumn } from "@/hooks/work-surface/useExport";
import {
  mapInventoryDetailToPilotRow,
  mapInventoryItemsToPilotRows,
  summarizeInventoryDetail,
  useSpreadsheetSelectionParam,
} from "@/lib/spreadsheet-native";
import type { InventoryPilotRow } from "@/lib/spreadsheet-native";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
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
import { AdjustmentContextDrawer } from "./AdjustmentContextDrawer";
import type { InventoryAdjustmentReason } from "@shared/inventoryAdjustmentReasons";
import {
  InventoryAdvancedFilters,
  createDefaultInventoryFilters,
  hasActiveFilters,
  filtersToQueryInput,
  type InventoryFilterState,
} from "./InventoryAdvancedFilters";
import { InventoryGalleryView } from "./InventoryGalleryView";
import {
  STATUS_OPTIONS,
  STATUS_LABELS,
  mod,
  type InventoryBatchStatus,
} from "./inventoryConstants";

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 100;

const keyboardHints: KeyboardHint[] = [
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
  { label: "Grade edit", available: true },
  { label: "COGS edit", available: true },
  { label: "Qty adjust", available: true },
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

type ViewMode = "grid" | "gallery";

interface AdjustDrawerState {
  isOpen: boolean;
  batchId: number;
  sku: string;
  productName: string;
  previousValue: number;
  currentValue: number;
}

interface InventoryLocationRow {
  id: string;
  locationLabel: string;
  quantity: number;
}

// ============================================================================
// Component
// ============================================================================

export function InventoryManagementSurface() {
  const { hasPermission } = usePermissions();
  const { selectedId: selectedBatchId, setSelectedId: setSelectedBatchId } =
    useSpreadsheetSelectionParam("batchId");

  // View & filter state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<InventoryFilterState>(
    createDefaultInventoryFilters
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loadedWindowCount, setLoadedWindowCount] = useState(1);
  const [queueSelectionSummary, setQueueSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // Bulk action state
  const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [pendingBulkStatus, setPendingBulkStatus] =
    useState<InventoryBatchStatus | null>(null);
  // Adjustment drawer state
  const [adjustDrawerState, setAdjustDrawerState] =
    useState<AdjustDrawerState | null>(null);

  // Saved views state
  const [currentViewId, setCurrentViewId] = useState<number | null>(null);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [saveViewShared, setSaveViewShared] = useState(false);

  const canUpdateInventory = hasPermission("inventory:update");
  const canDeleteInventory = hasPermission("inventory:delete");

  const { exportCSV, state: exportState } =
    useExport<Record<string, unknown>>();

  // Reset loaded rows when filters change
  useEffect(() => {
    setLoadedWindowCount(1);
  }, [filters]);

  const loadedRowTarget = PAGE_SIZE * loadedWindowCount;

  // ============================================================================
  // Queries
  // ============================================================================

  const queryInput = useMemo(() => filtersToQueryInput(filters), [filters]);

  const enhancedQuery = trpc.inventory.getEnhanced.useQuery({
    page: 1,
    pageSize: loadedRowTarget,
    cursor: 0,
    ...queryInput,
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
      void dashboardQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const adjustQtyMutation = trpc.inventory.adjustQty.useMutation({
    onSuccess: () => {
      toast.success("Quantity updated");
      setAdjustDrawerState(null);
      void enhancedQuery.refetch();
      void detailQuery.refetch();
      void dashboardQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to adjust quantity");
      void enhancedQuery.refetch(); // revert optimistic cell
    },
  });

  const updateBatchMutation = trpc.inventory.updateBatch.useMutation({
    onSuccess: () => {
      toast.success("Batch updated");
      void enhancedQuery.refetch();
      void detailQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to update batch");
      void enhancedQuery.refetch(); // revert optimistic cell
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
      void enhancedQuery.refetch();
      void dashboardQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to restore batches");
    },
  });

  const saveViewMutation = trpc.inventory.views.save.useMutation({
    onSuccess: result => {
      toast.success("View saved");
      setSaveViewDialogOpen(false);
      setSaveViewName("");
      setSaveViewShared(false);
      void viewsQuery.refetch();
      if (result && typeof result === "object" && "id" in result) {
        setCurrentViewId(Number(result.id));
      }
    },
    onError: error => {
      toast.error(error.message || "Failed to save view");
    },
  });

  const deleteViewMutation = trpc.inventory.views.delete.useMutation({
    onSuccess: () => {
      toast.success("View deleted");
      void viewsQuery.refetch();
      setCurrentViewId(null);
    },
    onError: error => {
      toast.error(error.message || "Failed to delete view");
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
    if (!queueSelectionSummary) return;
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
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "productSummary",
        headerName: "Product",
        flex: 1.3,
        minWidth: 280,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "vendorName",
        headerName: "Supplier",
        minWidth: 130,
        maxWidth: 160,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "brandName",
        headerName: "Brand",
        minWidth: 120,
        maxWidth: 150,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "grade",
        headerName: "Grade",
        minWidth: 100,
        maxWidth: 120,
        editable: canUpdateInventory,
        cellClass: canUpdateInventory
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
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
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      },
      {
        field: "onHandQty",
        headerName: "On Hand",
        minWidth: 110,
        maxWidth: 120,
        editable: canUpdateInventory,
        valueFormatter: params => formatQuantity(Number(params.value ?? 0)),
        cellClass: canUpdateInventory
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      },
      {
        field: "reservedQty",
        headerName: "Reserved",
        minWidth: 100,
        maxWidth: 120,
        valueFormatter: params => formatQuantity(Number(params.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "availableQty",
        headerName: "Available",
        minWidth: 110,
        maxWidth: 120,
        valueFormatter: params => formatQuantity(Number(params.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "unitCogs",
        headerName: "COGS",
        minWidth: 100,
        maxWidth: 120,
        editable: canUpdateInventory,
        valueFormatter: params => formatCurrency(params.value ?? null),
        cellClass: canUpdateInventory
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      },
      {
        field: "ageLabel",
        headerName: "Age",
        minWidth: 90,
        maxWidth: 100,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "stockStatus",
        headerName: "Stock",
        minWidth: 90,
        maxWidth: 110,
        cellClass: "powersheet-cell--locked",
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

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<InventoryPilotRow>) => {
      if (!event.data || !canUpdateInventory) return;

      const field = event.colDef.field as string;
      const version =
        typeof event.data.identity.recordVersion === "number"
          ? event.data.identity.recordVersion
          : undefined;

      if (field === "status") {
        const nextStatus = String(
          event.newValue || ""
        ).toUpperCase() as InventoryBatchStatus;
        const previousStatus = String(event.oldValue || "").toUpperCase();
        if (!nextStatus || nextStatus === previousStatus) return;

        updateStatusMutation.mutate({
          id: event.data.batchId,
          status: nextStatus,
          reason: "Spreadsheet status update",
          version,
        });
      } else if (field === "onHandQty") {
        // Open adjustment drawer instead of committing directly
        const prevVal = Number(event.oldValue ?? 0);
        const newVal = Number(event.newValue ?? 0);
        if (prevVal === newVal) return;

        setAdjustDrawerState({
          isOpen: true,
          batchId: event.data.batchId,
          sku: event.data.sku,
          productName: event.data.productName,
          previousValue: prevVal,
          currentValue: newVal,
        });
      } else if (field === "grade") {
        const newGrade = String(event.newValue ?? "").trim();
        const oldGrade = String(event.oldValue ?? "").trim();
        if (newGrade === oldGrade) return;

        updateBatchMutation.mutate({
          id: event.data.batchId,
          grade: newGrade || null,
          reason: "Spreadsheet grade update",
          version,
        });
      } else if (field === "unitCogs") {
        const newCogs = Number(event.newValue);
        if (isNaN(newCogs) || newCogs < 0) {
          void enhancedQuery.refetch(); // revert
          toast.error("COGS must be a non-negative number");
          return;
        }

        updateBatchMutation.mutate({
          id: event.data.batchId,
          ticket: newCogs,
          reason: `COGS updated to ${newCogs}`,
          version,
        });
      }
    },
    [
      canUpdateInventory,
      updateStatusMutation,
      updateBatchMutation,
      enhancedQuery,
    ]
  );

  const handleAdjustDrawerApply = useCallback(
    (context: { reason: InventoryAdjustmentReason; notes: string }) => {
      if (!adjustDrawerState) return;

      const delta =
        adjustDrawerState.currentValue - adjustDrawerState.previousValue;
      adjustQtyMutation.mutate({
        id: adjustDrawerState.batchId,
        field: "onHandQty",
        adjustment: delta,
        adjustmentReason: context.reason,
        notes: context.notes,
      });
    },
    [adjustDrawerState, adjustQtyMutation]
  );

  const handleAdjustDrawerCancel = useCallback(() => {
    setAdjustDrawerState(null);
    void enhancedQuery.refetch(); // revert optimistic cell edit
  }, [enhancedQuery]);

  const handleExportCSV = useCallback(() => {
    void exportCSV(rows as unknown as Record<string, unknown>[], {
      columns: EXPORT_COLUMNS as unknown as ExportColumn<
        Record<string, unknown>
      >[],
      filename: "inventory",
      addTimestamp: true,
    });
  }, [exportCSV, rows]);

  const handleBulkStatusConfirm = useCallback(() => {
    if (!pendingBulkStatus || bulkSelectedIds.length === 0) return;
    bulkUpdateStatusMutation.mutate({
      batchIds: bulkSelectedIds,
      newStatus: pendingBulkStatus,
    });
  }, [pendingBulkStatus, bulkSelectedIds, bulkUpdateStatusMutation]);

  const handleBulkDeleteConfirm = useCallback(() => {
    if (bulkSelectedIds.length === 0) return;
    bulkDeleteMutation.mutate(bulkSelectedIds);
  }, [bulkSelectedIds, bulkDeleteMutation]);

  const handleGalleryOpenInspector = useCallback(
    (batchId: number) => setSelectedBatchId(batchId),
    [setSelectedBatchId]
  );

  const handleGalleryAdjustQty = useCallback(
    (batchId: number) => {
      // Select the batch to open the inspector panel where the user can
      // use the "Adjust Quantity" section. Opening the drawer directly
      // from gallery would result in a zero-delta (previousValue === currentValue).
      setSelectedBatchId(batchId);
    },
    [setSelectedBatchId]
  );

  // ============================================================================
  // Derived
  // ============================================================================

  const queueSelectionTouchesMultipleRows =
    (queueSelectionSummary?.selectedRowCount ?? 0) > 1;
  const bulkActionsActive =
    bulkSelectedIds.length > 0 || queueSelectionTouchesMultipleRows;

  const dashStats = dashboardQuery.data;
  const filtersActive = hasActiveFilters(filters);

  const statusBarLeft = (
    <span>
      {dashStats?.totalUnits ?? 0} units across{" "}
      {dashStats?.statusCounts
        ? Object.values(dashStats.statusCounts).reduce(
            (sum, value) => sum + value,
            0
          )
        : rows.length}{" "}
      batches
      {queueSelectionSummary
        ? ` · ${queueSelectionSummary.selectedCellCount} cells / ${queueSelectionSummary.selectedRowCount} rows selected`
        : ""}
    </span>
  );

  const statusBarCenter = (
    <span>
      {selectedRow
        ? isDeepLinkedOutsideLoadedGrid
          ? "Loaded via batchId outside the current loaded rows"
          : `Selected ${selectedRow.sku}`
        : `${rows.length} loaded rows of ${totalItems} · ${views.length} saved view${views.length === 1 ? "" : "s"}`}
      {queueSelectionSummary?.hasDiscontiguousSelection
        ? " · discontiguous selection"
        : ""}
    </span>
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex h-full">
      {/* Main content column */}
      <div className="flex flex-1 flex-col gap-1.5">
        {/* ── 1. Toolbar ── */}
        <div className="flex items-center gap-3 px-3 py-1">
          <span className="text-sm font-semibold">Inventory</span>
          {dashStats && (
            <>
              <Badge variant="outline" className="text-xs">
                {dashStats.statusCounts
                  ? Object.values(dashStats.statusCounts).reduce(
                      (sum, v) => sum + v,
                      0
                    )
                  : 0}{" "}
                batches
              </Badge>
              <Badge variant="outline" className="text-xs">
                {formatQuantity(dashStats.totalUnits ?? 0)} units
              </Badge>
              <Badge variant="outline" className="text-xs">
                {formatCurrency(dashStats.totalInventoryValue ?? null)} value
              </Badge>
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "outline"}
              className="h-7 px-2"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "gallery" ? "default" : "outline"}
              className="h-7 px-2"
              onClick={() => setViewMode("gallery")}
              aria-label="Gallery view"
            >
              <Image className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              onClick={handleExportCSV}
              disabled={exportState.isExporting || rows.length === 0}
              aria-label="Export inventory to CSV"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {exportState.isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </div>

        {/* ── 2. Action Bar ── */}
        <div className="flex items-center gap-2 px-3 py-0.5">
          <Input
            value={filters.search}
            onChange={e =>
              setFilters(prev => ({ ...prev, search: e.target.value }))
            }
            placeholder="Search SKU, product, supplier..."
            className="h-7 max-w-xs text-xs"
          />
          <Select
            value={
              filters.statuses.length === 1 ? filters.statuses[0] : "__all__"
            }
            onValueChange={val =>
              setFilters(prev => ({
                ...prev,
                statuses: val === "__all__" ? [] : [val],
              }))
            }
          >
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {STATUS_OPTIONS.map(status => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={filtersActive ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setFiltersOpen(prev => !prev)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filters
            {filtersActive && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px]">!</Badge>
            )}
          </Button>
          <Select
            value={
              currentViewId !== null ? String(currentViewId) : "__default__"
            }
            onValueChange={val => {
              if (val === "__default__") {
                setFilters(createDefaultInventoryFilters());
                setCurrentViewId(null);
              } else {
                const viewId = Number(val);
                const view = views.find(v => v.id === viewId);
                if (view) {
                  setFilters({
                    ...createDefaultInventoryFilters(),
                    ...(view.filters as Partial<InventoryFilterState>),
                  });
                  setCurrentViewId(viewId);
                }
              }
            }}
          >
            <SelectTrigger
              className="h-7 w-[160px] text-xs"
              aria-label="Saved views"
            >
              <SelectValue placeholder="Saved Views" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__default__">Default (no view)</SelectItem>
              {views.map(view => (
                <SelectItem key={view.id} value={String(view.id)}>
                  {view.name}
                  {view.isShared ? " (shared)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={!hasActiveFilters(filters)}
            onClick={() => setSaveViewDialogOpen(true)}
          >
            Save View
          </Button>
          {currentViewId !== null && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[9px] text-red-500"
              disabled={deleteViewMutation.isPending}
              onClick={() => {
                deleteViewMutation.mutate(currentViewId);
              }}
            >
              Delete View
            </Button>
          )}

          {/* Bulk actions (right side) */}
          {bulkActionsActive && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {bulkSelectedIds.length > 0
                  ? `${bulkSelectedIds.length} selected`
                  : `${queueSelectionSummary?.selectedRowCount ?? 0} rows`}
              </span>
              {bulkSelectedIds.length > 0 && (
                <>
                  <Select
                    value=""
                    onValueChange={value => {
                      if (!value) return;
                      setPendingBulkStatus(value as InventoryBatchStatus);
                      setBulkStatusDialogOpen(true);
                    }}
                  >
                    <SelectTrigger
                      className="h-7 w-[140px] text-xs"
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
                  {canDeleteInventory && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                      disabled={bulkDeleteMutation.isPending}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setBulkSelectedIds([])}
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── 3. Advanced Filters ── */}
        <InventoryAdvancedFilters
          filters={filters}
          onFiltersChange={setFilters}
          isOpen={filtersOpen}
          onOpenChange={setFiltersOpen}
        />

        {/* ── 4. Main Content (Grid / Gallery) ── */}
        {viewMode === "grid" ? (
          <PowersheetGrid
            surfaceId="inventory-management"
            requirementIds={[
              "OPS-INV-001",
              "OPS-INV-004",
              "OPS-INV-006",
              "OPS-INV-011",
            ]}
            affordances={inventoryAffordances}
            title="Inventory Sheet"
            description="Unified inventory management grid with inline editing for status, grade, on-hand qty, and COGS."
            rows={rows}
            columnDefs={columnDefs}
            getRowId={row => row.identity.rowKey}
            selectedRowId={selectedRow ? selectedRow.identity.rowKey : null}
            onSelectedRowChange={row =>
              setSelectedBatchId(row?.batchId ?? null)
            }
            onCellValueChanged={handleCellValueChanged}
            selectionMode="cell-range"
            enableFillHandle={false}
            enableUndoRedo={true}
            onSelectionSummaryChange={setQueueSelectionSummary}
            isLoading={enhancedQuery.isLoading}
            errorMessage={enhancedQuery.error?.message ?? null}
            emptyTitle="No inventory rows match this view"
            emptyDescription="Adjust filters or search terms to see inventory data."
            summary={
              <span>
                {rows.length} loaded rows out of {totalItems} filtered rows ·{" "}
                {canUpdateInventory
                  ? "status, grade, qty, COGS editing enabled"
                  : "read-only mode"}
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
        ) : (
          <InventoryGalleryView
            rows={rows}
            onOpenInspector={handleGalleryOpenInspector}
            onAdjustQty={handleGalleryAdjustQty}
          />
        )}

        {/* ── 5. Selected Batch Summary Cards ── */}
        {selectedRow && (
          <div className="grid gap-3 px-3 md:grid-cols-4">
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
                Stock
              </div>
              <div className="mt-1 text-sm font-medium">
                {formatQuantity(selectedRow.onHandQty)} on hand ·{" "}
                {formatQuantity(selectedRow.reservedQty)} reserved ·{" "}
                {formatQuantity(selectedRow.availableQty)} available
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Valuation
              </div>
              <div className="mt-1 text-sm font-medium">
                {formatCurrency(selectedRow.unitCogs)} / unit
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Locations
              </div>
              <div className="mt-1 text-sm font-medium">
                {detailSummary?.locationCount ?? 0} location
                {(detailSummary?.locationCount ?? 0) !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        )}

        {/* ── 6. Status Bar + Keyboard Hints ── */}
        <WorkSurfaceStatusBar
          left={statusBarLeft}
          center={statusBarCenter}
          right={<KeyboardHintBar hints={keyboardHints} className="text-xs" />}
        />

        {/* ── 7. Inspector Panel ── */}
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
              <Button variant="outline" className="w-full">
                <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
                Open Full Detail
              </Button>
            ) : null
          }
        >
          {selectedBatchId !== null ? (
            <div className="space-y-4">
              {isDeepLinkedOutsideLoadedGrid && (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  This inspector was loaded from the workbook URL. The selected
                  batch is not in the current loaded grid rows yet.
                </div>
              )}

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
                <InspectorField label="Grade">
                  <p>{selectedRow?.grade || "—"}</p>
                </InspectorField>
                <InspectorField label="Unit COGS">
                  <p>{formatCurrency(selectedRow?.unitCogs ?? null)}</p>
                </InspectorField>
              </InspectorSection>

              <InspectorSection title="Quantities">
                <InspectorField label="On Hand">
                  <p>{formatQuantity(selectedRow?.onHandQty ?? 0)}</p>
                </InspectorField>
                <InspectorField label="Reserved">
                  <p>{formatQuantity(selectedRow?.reservedQty ?? 0)}</p>
                </InspectorField>
                <InspectorField label="Available">
                  <p>{formatQuantity(selectedRow?.availableQty ?? 0)}</p>
                </InspectorField>
                <InspectorField label="Stock Status">
                  <p>{selectedRow?.stockStatus ?? "Unknown"}</p>
                </InspectorField>
                <InspectorField label="Age">
                  <p>{selectedRow?.ageLabel ?? "-"}</p>
                </InspectorField>
              </InspectorSection>

              <InspectorSection title="Valuation">
                <InspectorField label="Unit COGS">
                  <p>{formatCurrency(selectedRow?.unitCogs ?? null)}</p>
                </InspectorField>
                <InspectorField label="Total Value">
                  <p>
                    {selectedRow?.unitCogs !== null &&
                    selectedRow?.unitCogs !== undefined
                      ? formatCurrency(
                          selectedRow.unitCogs * (selectedRow?.onHandQty ?? 0)
                        )
                      : "-"}
                  </p>
                </InspectorField>
              </InspectorSection>

              {/* Locations sub-grid */}
              {locationRows.length > 0 && (
                <InspectorSection title="Locations">
                  <PowersheetGrid
                    surfaceId="inventory-locations-grid"
                    requirementIds={["OPS-INV-002"]}
                    affordances={locationAffordances}
                    title="Batch Locations"
                    description="Storage locations for this batch."
                    rows={locationRows}
                    columnDefs={locationColumnDefs}
                    getRowId={row => row.id}
                    selectionMode="cell-range"
                    enableFillHandle={false}
                    enableUndoRedo={false}
                    isLoading={detailQuery.isLoading}
                    errorMessage={detailQuery.error?.message ?? null}
                    emptyTitle="No locations"
                    emptyDescription="This batch has no linked storage locations."
                    summary={
                      <span>{locationRows.length} linked storage rows</span>
                    }
                    minHeight={160}
                  />
                </InspectorSection>
              )}

              {canUpdateInventory && (
                <InspectorSection title="Actions">
                  <InspectorField label="Status">
                    <Select
                      value={selectedRow?.status ?? ""}
                      onValueChange={value => {
                        if (!selectedRow || !value) return;
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
                </InspectorSection>
              )}
            </div>
          ) : null}
        </InspectorPanel>

        {/* ── 9. Confirm Dialogs ── */}
        <ConfirmDialog
          open={bulkStatusDialogOpen}
          onOpenChange={open => {
            setBulkStatusDialogOpen(open);
            if (!open) setPendingBulkStatus(null);
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

        {/* ── Save View Dialog ── */}
        <Dialog
          open={saveViewDialogOpen}
          onOpenChange={open => {
            setSaveViewDialogOpen(open);
            if (!open) {
              setSaveViewName("");
              setSaveViewShared(false);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Current View</DialogTitle>
              <DialogDescription>
                Save the current filters as a named view for quick access later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="save-view-name">View name</Label>
                <Input
                  id="save-view-name"
                  value={saveViewName}
                  onChange={e => setSaveViewName(e.target.value.slice(0, 100))}
                  placeholder="e.g. Live THCA only"
                  maxLength={100}
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-view-shared"
                  checked={saveViewShared}
                  onCheckedChange={checked =>
                    setSaveViewShared(checked === true)
                  }
                />
                <Label htmlFor="save-view-shared" className="cursor-pointer">
                  Share with team
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSaveViewDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!saveViewName.trim() || saveViewMutation.isPending}
                onClick={() => {
                  saveViewMutation.mutate({
                    name: saveViewName.trim(),
                    filters: filters as unknown as Record<string, unknown>,
                    isShared: saveViewShared,
                  });
                }}
              >
                {saveViewMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── 8. Adjustment Context Drawer (right side) ── */}
      {adjustDrawerState?.isOpen && (
        <AdjustmentContextDrawer
          isOpen={adjustDrawerState.isOpen}
          batchId={adjustDrawerState.batchId}
          sku={adjustDrawerState.sku}
          productName={adjustDrawerState.productName}
          previousValue={adjustDrawerState.previousValue}
          currentValue={adjustDrawerState.currentValue}
          isPending={adjustQtyMutation.isPending}
          onApply={handleAdjustDrawerApply}
          onCancel={handleAdjustDrawerCancel}
        />
      )}
    </div>
  );
}

export default InventoryManagementSurface;
