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

import { useLocation } from "wouter";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CellValueChangedEvent, ColDef } from "ag-grid-community";
import {
  Columns3,
  Download,
  Filter,
  Grid3X3,
  Image,
  ShoppingCart,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  extractItems,
  mapInventoryDetailToPilotRow,
  mapInventoryItemsToPilotRows,
  summarizeInventoryDetail,
  useSpreadsheetSelectionParam,
} from "@/lib/spreadsheet-native";
import type { InventoryPilotRow } from "@/lib/spreadsheet-native";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import type {
  PowersheetSelectionSet,
  PowersheetSelectionSummary,
} from "@/lib/powersheet/contracts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MonoId } from "@/components/ui/mono-id";
import type { ClientOption } from "@/components/ui/client-combobox";
import { ClientCombobox } from "@/components/ui/client-combobox";
import {
  getBatchStatusLabel,
  getBatchStatusClass,
  getGradeClass,
} from "@/lib/statusTokens";
import {
  StockStatusBadge,
  getStockStatusLabel,
  type StockStatus,
} from "@/components/inventory/StockStatusBadge";
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
import { InventoryKanbanBoard } from "../inventory/InventoryKanbanBoard";
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

const surfacePanelClass =
  "rounded-xl border border-border/70 bg-card/80 shadow-sm";

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
  {
    key: "unitPrice",
    label: "Unit Price",
    formatter: v => (v === null || v === undefined ? "" : String(v)),
  },
  {
    key: "marginPercent",
    label: "Margin %",
    formatter: v => {
      if (v === null || v === undefined) return "";
      const margin = Number(v);
      return Number.isFinite(margin) ? `${margin.toFixed(1)}%` : "";
    },
  },
  { key: "ageLabel", label: "Age" },
  {
    key: "stockStatus",
    label: "Stock Status",
    formatter: v => getStockStatusLabel(v as string | null | undefined),
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

type ViewMode = "board" | "grid" | "gallery";

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

interface OrderFromBatchState {
  batchId: number;
  productName: string;
  sku: string;
  unitCogs: number;
}

// ============================================================================
// Component
// ============================================================================

export function InventoryManagementSurface() {
  const { hasPermission } = usePermissions();
  const { selectedId: selectedBatchId, setSelectedId: setSelectedBatchId } =
    useSpreadsheetSelectionParam("batchId");

  // View & filter state - default to board, persist in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem("inventory-view-mode");
    if (stored === "board" || stored === "grid" || stored === "gallery") {
      return stored;
    }
    return "board";
  });
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

  // Order from inventory drawer state
  const [, setLocation] = useLocation();
  const [orderFromBatch, setOrderFromBatch] =
    useState<OrderFromBatchState | null>(null);
  const [orderClientId, setOrderClientId] = useState<number | null>(null);
  const [orderQty, setOrderQty] = useState<string>("");
  // TER-1053: Target an existing draft order or create a new one
  const [orderTargetMode, setOrderTargetMode] = useState<"new" | "existing">(
    "new"
  );
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);

  // Saved views state
  const [currentViewId, setCurrentViewId] = useState<number | null>(null);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [saveViewShared, setSaveViewShared] = useState(false);
  const [inspectorTargetQty, setInspectorTargetQty] = useState("");

  const canUpdateInventory = hasPermission("inventory:update");
  const canDeleteInventory = hasPermission("inventory:delete");

  const { exportCSV, state: exportState } =
    useExport<Record<string, unknown>>();

  // Reset loaded rows when filters change
  useEffect(() => {
    setLoadedWindowCount(1);
  }, [filters]);

  // Persist viewMode to localStorage
  useEffect(() => {
    localStorage.setItem("inventory-view-mode", viewMode);
  }, [viewMode]);

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
  const buyersQuery = trpc.clients.list.useQuery(
    { limit: 1000 },
    { enabled: orderFromBatch !== null }
  );
  // TER-1053: Load existing SALE drafts so users can append this batch to
  // an in-progress order instead of always creating a new one.
  const draftOrdersQuery = trpc.orders.getAll.useQuery(
    { isDraft: true, orderType: "SALE", limit: 50 },
    { enabled: orderFromBatch !== null }
  );
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

  const createOrderMutation = trpc.orders.createDraftEnhanced.useMutation({
    onSuccess: result => {
      setOrderFromBatch(null);
      setOrderClientId(null);
      setOrderQty("");
      toast.success(`Draft order ${result.orderNumber} created`, {
        action: {
          label: "Go to Order →",
          onClick: () => setLocation(`/sales?orderId=${result.orderId}`),
        },
        duration: 8000,
      });
    },
    onError: error => {
      toast.error(error.message || "Failed to create order");
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
      selectedBatchId !== null && !selectedRowOnGrid
        ? mapInventoryDetailToPilotRow(detailQuery.data)
        : null,
    [detailQuery.data, selectedBatchId, selectedRowOnGrid]
  );
  const selectedRow = selectedRowOnGrid ?? selectedFallbackRow;
  const detailSummary = summarizeInventoryDetail(detailQuery.data);
  const views = viewsQuery.data?.items ?? [];
  const isDeepLinkedOutsideLoadedGrid =
    selectedBatchId !== null &&
    selectedRowOnGrid === null &&
    selectedRow !== null;
  const rowKeyToBatchId = useMemo(
    () => new Map(rows.map(row => [row.identity.rowKey, row.batchId] as const)),
    [rows]
  );
  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map(row => row.category).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );
  const subcategoryOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map(row => row.subcategory).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );
  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Map(
          rows
            .filter(row => row.vendorName)
            .map(row => [
              row.vendorName,
              { id: row.vendorName, name: row.vendorName },
            ])
        ).values()
      ),
    [rows]
  );
  const brandOptions = useMemo(
    () =>
      Array.from(
        new Map(
          rows
            .filter(row => row.brandName)
            .map(row => [
              row.brandName,
              { id: row.brandName, name: row.brandName },
            ])
        ).values()
      ),
    [rows]
  );
  const gradeOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map(row => row.grade).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );
  const selectedOnHandQty = selectedRow?.onHandQty ?? null;

  const buyerClientOptions = useMemo<ClientOption[]>(() => {
    const data = buyersQuery.data;
    const items = Array.isArray(data) ? data : (data?.items ?? []);
    return (
      items as Array<{
        id: number;
        name: string;
        email?: string | null;
        isBuyer?: boolean | null;
      }>
    )
      .filter(c => c.isBuyer !== false)
      .map(c => ({ id: c.id, name: c.name, email: c.email ?? null }));
  }, [buyersQuery.data]);

  // TER-1053: Map draft orders to display options for the target selector.
  // Drafts are ordered newest-first so the most recent draft is highlighted.
  const draftOrderOptions = useMemo(() => {
    const drafts = extractItems(
      draftOrdersQuery.data as
        | Array<{
            id: number;
            orderNumber: string;
            clientId: number | null;
            createdAt?: string | Date | null;
          }>
        | {
            items?: Array<{
              id: number;
              orderNumber: string;
              clientId: number | null;
              createdAt?: string | Date | null;
            }>;
          }
        | null
        | undefined
    );
    const buyers = Array.isArray(buyersQuery.data)
      ? buyersQuery.data
      : (buyersQuery.data?.items ?? []);
    const nameById = new Map(
      (buyers as Array<{ id: number; name: string }>).map(c => [c.id, c.name])
    );
    return drafts
      .map(draft => ({
        id: draft.id,
        orderNumber: draft.orderNumber,
        clientId: draft.clientId,
        clientName: draft.clientId
          ? (nameById.get(draft.clientId) ?? "Unknown client")
          : "No client",
        createdAt: draft.createdAt ?? null,
      }))
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
  }, [draftOrdersQuery.data, buyersQuery.data]);

  useEffect(() => {
    if (selectedBatchId === null || selectedOnHandQty === null) {
      setInspectorTargetQty("");
      return;
    }
    setInspectorTargetQty(String(selectedOnHandQty));
  }, [selectedBatchId, selectedOnHandQty]);

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

  // Derive bulk selection from actual selected row ids.
  const handleSelectionSetChange = useCallback(
    (selectionSet: PowersheetSelectionSet) => {
      const ids = Array.from(selectionSet.selectedRowIds)
        .map(rowId => rowKeyToBatchId.get(rowId))
        .filter((id): id is number => typeof id === "number");
      setBulkSelectedIds(ids);
    },
    [rowKeyToBatchId]
  );

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
        cellRenderer: (params: { value: string }) => (
          <MonoId value={params.value ?? ""} />
        ),
      },
      {
        field: "productSummary",
        headerName: "Product",
        flex: 1.3,
        minWidth: 280,
        cellClass: "powersheet-cell--locked",
        cellRenderer: (params: {
          data?: InventoryPilotRow;
          value?: string;
        }) => {
          if (!params.data) return params.value ?? "-";
          return (
            <div className="flex flex-col gap-0.5 py-1">
              <div className="font-medium text-sm leading-tight">
                {params.data.productName}
              </div>
              {(params.data.vendorName !== "-" ||
                params.data.brandName !== "-") && (
                <div className="text-xs text-muted-foreground leading-tight">
                  {[params.data.vendorName, params.data.brandName]
                    .filter(v => v && v !== "-")
                    .join(" / ")}
                </div>
              )}
            </div>
          );
        },
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
        cellRenderer: (params: { value: string }) => {
          if (!params.value) return null;
          const cls = getGradeClass(params.value);
          return (
            <span
              className={cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-xs",
                cls
              )}
            >
              {params.value}
            </span>
          );
        },
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
        cellRenderer: (params: { value: string }) => {
          if (!params.value) return null;
          const label = getBatchStatusLabel(params.value);
          const cls = getBatchStatusClass(params.value);
          return (
            <span
              className={cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-xs",
                cls
              )}
            >
              {label}
            </span>
          );
        },
      },
      {
        field: "onHandQty",
        headerName: "On Hand",
        minWidth: 110,
        maxWidth: 120,
        editable: canUpdateInventory,
        valueFormatter: params => formatQuantity(Number(params.value ?? 0)),
        cellClass: canUpdateInventory
          ? "powersheet-cell--editable tabular-nums text-right"
          : "powersheet-cell--locked tabular-nums text-right",
        cellClassRules: {
          "text-amber-700 font-semibold": (params: {
            data?: InventoryPilotRow;
          }) => {
            const s = params.data?.stockStatus;
            return s === "LOW" || s === "CRITICAL";
          },
        },
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
        field: "unitPrice",
        headerName: "Price",
        minWidth: 100,
        maxWidth: 120,
        valueFormatter: params => formatCurrency(params.value ?? null),
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "marginPercent",
        headerName: "Margin",
        minWidth: 100,
        maxWidth: 120,
        valueFormatter: params => {
          if (params.value === null || params.value === undefined) {
            return "-";
          }
          const margin = Number(params.value);
          if (!Number.isFinite(margin)) {
            return "-";
          }
          return `${margin.toFixed(1)}%`;
        },
        cellClass: "powersheet-cell--locked",
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
        headerName: "Stock Status",
        minWidth: 120,
        maxWidth: 150,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params =>
          getStockStatusLabel(params.value as string | null | undefined),
        cellRenderer: (params: { value: string | null | undefined }) => {
          if (!params.value) return null;
          return (
            <StockStatusBadge
              status={params.value as StockStatus}
              showIcon={false}
            />
          );
        },
      },
      {
        headerName: "",
        field: "batchId",
        minWidth: 80,
        maxWidth: 80,
        sortable: false,
        filter: false,
        resizable: false,
        cellClass: "powersheet-cell--locked flex items-center justify-center",
        cellRenderer: (params: { data?: InventoryPilotRow }) => {
          const row = params.data;
          if (!row) return null;
          return (
            <button
              type="button"
              title="Add to order"
              aria-label={`Add ${row.sku} to order`}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={e => {
                e.stopPropagation();
                setOrderFromBatch({
                  batchId: row.batchId,
                  productName: row.productName,
                  sku: row.sku,
                  unitCogs: row.unitCogs ?? 0,
                });
                setOrderClientId(null);
                setOrderQty("");
                setOrderTargetMode("new");
                setSelectedDraftId(null);
              }}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
            </button>
          );
        },
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
      setSelectedBatchId(batchId);
      setViewMode("grid");
    },
    [setSelectedBatchId, setViewMode]
  );

  const handleInspectorReviewAdjustment = useCallback(() => {
    if (!selectedRow) return;
    const nextValue = Number(inspectorTargetQty);
    if (!Number.isFinite(nextValue)) {
      toast.error("Enter a valid on-hand quantity before reviewing.");
      return;
    }
    if (nextValue === selectedRow.onHandQty) {
      toast.error(
        "Change the on-hand quantity before opening the adjustment review."
      );
      return;
    }
    setAdjustDrawerState({
      isOpen: true,
      batchId: selectedRow.batchId,
      sku: selectedRow.sku,
      productName: selectedRow.productName,
      previousValue: selectedRow.onHandQty,
      currentValue: nextValue,
    });
  }, [inspectorTargetQty, selectedRow]);

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
        <div
          className={`${surfacePanelClass} flex flex-wrap items-start gap-3 px-3 py-2`}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
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
                    {formatCurrency(dashStats.totalInventoryValue ?? null)}{" "}
                    value
                  </Badge>
                </>
              )}
            </div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Inventory operations
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant={viewMode === "board" ? "default" : "outline"}
              className="h-7 px-2"
              onClick={() => setViewMode("board")}
              aria-label="Board view"
            >
              <Columns3 className="h-3.5 w-3.5" />
            </Button>
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
        <div
          className={`${surfacePanelClass} mx-0.5 flex flex-wrap items-center gap-2 px-3 py-2`}
        >
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
              <SelectValue placeholder="Available now" />
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
              <SelectItem value="__default__">
                Default (available now)
              </SelectItem>
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
          <div className="ml-auto flex items-center gap-2">
            {bulkActionsActive && (
              <span className="text-xs font-medium text-muted-foreground">
                {bulkSelectedIds.length > 0
                  ? `${bulkSelectedIds.length} selected`
                  : `${queueSelectionSummary?.selectedRowCount ?? 0} rows`}
              </span>
            )}
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
          {!bulkActionsActive && (
            <span className="ml-auto text-xs text-muted-foreground">
              {filtersActive
                ? "Filters active"
                : "Search, filter, or switch views"}
            </span>
          )}
          {currentViewId !== null && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[9px] text-destructive"
              disabled={deleteViewMutation.isPending}
              onClick={() => {
                deleteViewMutation.mutate(currentViewId);
              }}
            >
              Delete View
            </Button>
          )}
        </div>

        {/* ── 3. Advanced Filters ── */}
        <InventoryAdvancedFilters
          filters={filters}
          onFiltersChange={setFilters}
          isOpen={filtersOpen}
          onOpenChange={setFiltersOpen}
          categoryOptions={categoryOptions}
          subcategoryOptions={subcategoryOptions}
          supplierOptions={supplierOptions}
          brandOptions={brandOptions}
          gradeOptions={gradeOptions}
        />

        {/* ── 4. Main Content (Board / Grid / Gallery) ── */}
        {viewMode === "board" ? (
          <div className={`${surfacePanelClass} flex-1 min-h-[500px]`}>
            <InventoryKanbanBoard
              batches={rows.map(row => ({
                batchId: row.batchId,
                sku: row.sku,
                productName: row.productName,
                vendorName: row.vendorName,
                brandName: row.brandName,
                onHandQty: row.onHandQty,
                unitPrice: row.unitPrice,
                status: row.status,
              }))}
              onBatchClick={setSelectedBatchId}
            />
          </div>
        ) : viewMode === "grid" ? (
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
            selectedRowId={selectedRowOnGrid?.identity.rowKey ?? null}
            onSelectedRowChange={row =>
              setSelectedBatchId(row?.batchId ?? null)
            }
            onCellValueChanged={handleCellValueChanged}
            selectionMode="cell-range"
            enableFillHandle={false}
            enableUndoRedo={true}
            onSelectionSetChange={handleSelectionSetChange}
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
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Product
              </div>
              <div className="mt-1 text-sm font-medium">
                {selectedRow.productSummary}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Stock
              </div>
              <div className="mt-1 text-sm font-medium">
                {formatQuantity(selectedRow.onHandQty)} on hand ·{" "}
                {formatQuantity(selectedRow.reservedQty)} reserved ·{" "}
                {formatQuantity(selectedRow.availableQty)} available
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Valuation
              </div>
              <div className="mt-1 text-sm font-medium">
                {formatCurrency(selectedRow.unitCogs)} / unit ·{" "}
                {selectedRow.unitCogs !== null &&
                selectedRow.unitCogs !== undefined
                  ? formatCurrency(selectedRow.unitCogs * selectedRow.onHandQty)
                  : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card px-3 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Locations
              </div>
              <button
                type="button"
                className="mt-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setSelectedBatchId(selectedRow.batchId)}
              >
                {detailSummary?.locationCount ?? 0} location
                {(detailSummary?.locationCount ?? 0) !== 1 ? "s" : ""} →
              </button>
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
          trapFocus={false}
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
                <div className="rounded-md border border-blue-200 bg-[var(--info-bg)] px-3 py-2 text-sm text-[var(--info)]">
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
                  <p>
                    {selectedRow?.stockStatus
                      ? getStockStatusLabel(selectedRow.stockStatus)
                      : "Unknown"}
                  </p>
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
                  <InspectorField label="Adjust Quantity">
                    <div className="space-y-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={inspectorTargetQty}
                        onChange={event =>
                          setInspectorTargetQty(event.target.value)
                        }
                        aria-label="New on-hand quantity"
                      />
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleInspectorReviewAdjustment}
                      >
                        Review Adjustment
                      </Button>
                    </div>
                  </InspectorField>
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

      {/* ── 8b. Add to Order Drawer (TER-1053) ── */}
      <Sheet
        open={!!orderFromBatch}
        onOpenChange={open => {
          if (!open) {
            setOrderFromBatch(null);
            setOrderClientId(null);
            setOrderQty("");
            setOrderTargetMode("new");
            setSelectedDraftId(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-[560px] flex-col overflow-hidden p-0 sm:max-w-[560px]"
        >
          <SheetHeader className="flex-shrink-0 border-b px-5 py-4">
            <SheetTitle className="text-sm font-semibold">
              Add to Order — {orderFromBatch?.productName}
            </SheetTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono">{orderFromBatch?.sku}</span>
            </p>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-5">
            <p className="mb-4 text-sm text-muted-foreground">
              {draftOrderOptions.length > 0
                ? "Append this batch to an existing draft, or start a new order."
                : "Select a client and enter a quantity to start a new draft order from this batch."}
            </p>
            <div className="space-y-4">
              {draftOrderOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="order-target-mode">Target</Label>
                  <Select
                    value={
                      orderTargetMode === "existing" && selectedDraftId !== null
                        ? `existing:${selectedDraftId}`
                        : "new"
                    }
                    onValueChange={value => {
                      if (value === "new") {
                        setOrderTargetMode("new");
                        setSelectedDraftId(null);
                        return;
                      }
                      if (value.startsWith("existing:")) {
                        const id = Number(value.slice("existing:".length));
                        if (Number.isFinite(id)) {
                          setOrderTargetMode("existing");
                          setSelectedDraftId(id);
                        }
                      }
                    }}
                  >
                    <SelectTrigger
                      id="order-target-mode"
                      className="h-8 text-sm"
                      aria-label="Choose order target"
                    >
                      <SelectValue placeholder="Select target..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        Create new draft order
                      </SelectItem>
                      {draftOrderOptions.map(draft => (
                        <SelectItem
                          key={draft.id}
                          value={`existing:${draft.id}`}
                        >
                          {draft.orderNumber} · {draft.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {orderTargetMode === "existing" && selectedDraftId !== null ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Opens the order editor with this batch pre-added. You can
                    adjust quantity and pricing before saving the draft.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (!orderFromBatch || selectedDraftId === null) return;
                      const target = draftOrderOptions.find(
                        d => d.id === selectedDraftId
                      );
                      setLocation(
                        buildSalesWorkspacePath("create-order", {
                          draftId: selectedDraftId,
                          batchId: orderFromBatch.batchId,
                        })
                      );
                      toast.success(
                        target
                          ? `Adding ${orderFromBatch.sku} to ${target.orderNumber}`
                          : `Adding ${orderFromBatch.sku} to draft`
                      );
                      setOrderFromBatch(null);
                      setOrderClientId(null);
                      setOrderQty("");
                      setOrderTargetMode("new");
                      setSelectedDraftId(null);
                    }}
                  >
                    Add to{" "}
                    {draftOrderOptions.find(d => d.id === selectedDraftId)
                      ?.orderNumber ?? "draft"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="order-client">Client</Label>
                    <ClientCombobox
                      value={orderClientId}
                      onValueChange={setOrderClientId}
                      clients={buyerClientOptions}
                      placeholder="Select a client..."
                      isLoading={buyersQuery.isLoading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="order-qty">Quantity</Label>
                    <Input
                      id="order-qty"
                      type="number"
                      inputMode="decimal"
                      min={1}
                      value={orderQty}
                      onChange={e => setOrderQty(e.target.value)}
                      placeholder="e.g. 100"
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={
                      !orderClientId ||
                      !orderQty ||
                      Number(orderQty) <= 0 ||
                      createOrderMutation.isPending
                    }
                    onClick={() => {
                      if (!orderFromBatch || !orderClientId) return;
                      const qty = Number(orderQty);
                      if (!Number.isFinite(qty) || qty <= 0) return;
                      createOrderMutation.mutate({
                        orderType: "SALE",
                        clientId: orderClientId,
                        lineItems: [
                          {
                            batchId: orderFromBatch.batchId,
                            batchSku: orderFromBatch.sku,
                            quantity: qty,
                            cogsPerUnit: orderFromBatch.unitCogs,
                          },
                        ],
                      });
                    }}
                  >
                    {createOrderMutation.isPending
                      ? "Creating..."
                      : "Create Draft Order"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
