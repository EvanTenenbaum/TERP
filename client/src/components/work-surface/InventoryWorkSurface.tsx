/**
 * InventoryWorkSurface - Work Surface implementation for Inventory
 * UXS-401: Aligns Inventory page with Work Surface patterns
 *
 * Features:
 * - Keyboard contract with arrow navigation
 * - Save state indicator
 * - Inspector panel for batch details
 * - Advanced filtering and sorting
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { INVENTORY_STATUS_TOKENS } from "../../lib/statusTokens";
import { formatInventoryAdjustmentReason } from "@shared/inventoryAdjustmentReasons";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DatabaseErrorState,
  EmptyState,
  ErrorState,
  NoSearchResults,
  isDatabaseError,
} from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PurchaseModal } from "@/components/inventory/PurchaseModal";
import { AdvancedFilters } from "@/components/inventory/AdvancedFilters";
import { FilterChips } from "@/components/inventory/FilterChips";
import { SavedViewsDropdown } from "@/components/inventory/SavedViewsDropdown";
import { SaveViewModal } from "@/components/inventory/SaveViewModal";
import {
  AdjustQuantityDialog,
  type AdjustQuantityDialogValues,
} from "@/components/AdjustQuantityDialog";
import {
  AgingBadge,
  getAgingRowClass,
  type AgeBracket,
} from "@/components/inventory/AgingBadge";
import {
  StockStatusBadge,
  type StockStatus,
} from "@/components/inventory/StockStatusBadge";
import { BatchGalleryCard } from "@/components/inventory/BatchGalleryCard";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import { KeyboardHintBar } from "@/components/work-surface/KeyboardHintBar";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import { useConcurrentEditDetection } from "@/hooks/work-surface/useConcurrentEditDetection";
import {
  useExport,
  usePowersheetSelection,
  useUndo,
} from "../../hooks/work-surface";
import {
  defaultFilters,
  useInventoryFilters,
  type InventoryFilters,
} from "@/hooks/useInventoryFilters";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  useInspectorPanel,
} from "./InspectorPanel";

// Icons
import {
  Search,
  Plus,
  Package,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
} from "lucide-react";

// Nomenclature utilities for dynamic Brand/Farmer labels (LEX-011)
import { getBrandLabel, getMixedBrandLabel } from "@/lib/nomenclature";

// ============================================================================
// TYPES
// ============================================================================

interface InventoryItem {
  batch?: {
    id: number;
    sku: string;
    batchStatus: string;
    grade?: string;
    onHandQty: string;
    reservedQty: string;
    quarantineQty: string;
    holdQty: string;
    unitCogs?: string;
    createdAt?: string;
    intakeDate?: string;
    version?: number;
    ageDays?: number;
    ageBracket?: AgeBracket;
    stockStatus?: StockStatus;
  };
  product?: {
    id: number;
    nameCanonical: string;
    category?: string;
    subcategory?: string;
  };
  vendor?: {
    id: number;
    name: string;
  };
  brand?: {
    id: number;
    name: string;
  };
}

interface InventoryExportRow {
  [key: string]: string;
  id: string;
  sku: string;
  productName: string;
  category: string;
  subcategory: string;
  vendor: string;
  brand: string;
  grade: string;
  status: string;
  onHand: string;
  reserved: string;
  quarantine: string;
  hold: string;
  available: string;
  unitCogs: string;
  totalValue: string;
  purchaseDate: string;
  expirationDate: string;
  location: string;
}

// Helper type for version tracking (batch contains id and version)
interface BatchVersionEntity {
  id: number;
  version: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// localStorage key for persisting search/sort state across page reloads
const INVENTORY_VIEW_STATE_KEY = "terp-inventory-view-v1";

const BATCH_STATUSES = [
  { value: "ALL", label: "All Statuses" },
  { value: "AWAITING_INTAKE", label: "Awaiting Intake" },
  { value: "LIVE", label: "Live" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "QUARANTINED", label: "Quarantined" },
  { value: "SOLD_OUT", label: "Sold Out" },
  { value: "CLOSED", label: "Closed" },
];

const STATUS_COLORS: Record<string, string> = {
  ...INVENTORY_STATUS_TOKENS,
  SOLD_OUT: "bg-gray-100 text-gray-800",
  CLOSED: "bg-gray-200 text-gray-600",
};

type InventoryBatchStatus =
  | "AWAITING_INTAKE"
  | "LIVE"
  | "ON_HOLD"
  | "QUARANTINED"
  | "SOLD_OUT"
  | "CLOSED";

const ACTIONABLE_BATCH_STATUSES = BATCH_STATUSES.filter(
  status => status.value !== "ALL"
) as Array<{ value: InventoryBatchStatus; label: string }>;

type BatchStatus = InventoryBatchStatus;
type InventoryViewMode = "table" | "gallery";

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: string | number | null | undefined): string => {
  const num = typeof value === "string" ? parseFloat(value) : value || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatQuantity = (value: string | number | null | undefined): string => {
  const num = typeof value === "string" ? parseFloat(value) : value || 0;
  return num.toFixed(2);
};

const parseSavedFilterDate = (value: unknown): Date | null => {
  if (!value) return null;
  const parsedDate = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const parseSavedFilterNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeSavedFilters = (
  savedFilters: Partial<InventoryFilters>
): InventoryFilters => {
  const dateRange = (savedFilters.dateRange ?? {}) as {
    from?: unknown;
    to?: unknown;
  };
  const cogsRange = (savedFilters.cogsRange ?? {}) as {
    min?: unknown;
    max?: unknown;
  };

  return {
    ...defaultFilters,
    ...savedFilters,
    dateRange: {
      from: parseSavedFilterDate(dateRange.from),
      to: parseSavedFilterDate(dateRange.to),
    },
    cogsRange: {
      min: parseSavedFilterNumber(cogsRange.min),
      max: parseSavedFilterNumber(cogsRange.max),
    },
    status: Array.isArray(savedFilters.status)
      ? savedFilters.status
      : defaultFilters.status,
    vendor: Array.isArray(savedFilters.vendor)
      ? savedFilters.vendor
      : defaultFilters.vendor,
    brand: Array.isArray(savedFilters.brand)
      ? savedFilters.brand
      : defaultFilters.brand,
    grade: Array.isArray(savedFilters.grade)
      ? savedFilters.grade
      : defaultFilters.grade,
    paymentStatus: Array.isArray(savedFilters.paymentStatus)
      ? savedFilters.paymentStatus
      : defaultFilters.paymentStatus,
  };
};

const normalizeStatus = (status: string | null | undefined): string =>
  String(status ?? "").toUpperCase();

function getInventoryStatusFilterExitMessage(params: {
  batchSku: string;
  activeStatuses: string[];
  toStatus: string;
}): string | null {
  if (params.activeStatuses.length === 0) {
    return null;
  }

  const normalizedStatuses = params.activeStatuses.map(normalizeStatus);
  const normalizedTarget = normalizeStatus(params.toStatus);
  if (normalizedStatuses.includes(normalizedTarget)) {
    return null;
  }

  const filterLabel = normalizedStatuses
    .map(status => status.toLowerCase())
    .join(", ");

  return `${params.batchSku} moved to ${normalizedTarget} and is now hidden by the ${filterLabel} filter. Clear or update filters to keep tracking it.`;
}

const calculateAvailable = (
  batch:
    | {
        onHandQty?: string | number;
        reservedQty?: string | number;
        quarantineQty?: string | number;
        holdQty?: string | number;
      }
    | undefined
): number => {
  const onHand = parseFloat(String(batch?.onHandQty ?? 0));
  const reserved = parseFloat(String(batch?.reservedQty ?? 0));
  const quarantine = parseFloat(String(batch?.quarantineQty ?? 0));
  const hold = parseFloat(String(batch?.holdQty ?? 0));
  return Math.max(0, onHand - reserved - quarantine - hold);
};

// ============================================================================
// STATUS BADGE
// ============================================================================

function BatchStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs", STATUS_COLORS[status] || STATUS_COLORS.LIVE)}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

// ============================================================================
// BATCH INSPECTOR
// ============================================================================

interface BatchInspectorProps {
  item: InventoryItem | null;
  onEdit: (batchId: number) => void;
  onStatusChange: (batchId: number, status: string) => void;
  onAdjustQuantity: (batchId: number) => void;
}

function BatchInspectorContent({
  item,
  onEdit,
  onStatusChange,
  onAdjustQuantity,
}: BatchInspectorProps) {
  if (!item || !item.batch) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p>Select a batch to view details</p>
      </div>
    );
  }

  const { batch, product, vendor, brand } = item;
  const onHand = parseFloat(batch.onHandQty || "0");
  const reserved = parseFloat(batch.reservedQty || "0");
  const quarantine = parseFloat(batch.quarantineQty || "0");
  const hold = parseFloat(batch.holdQty || "0");
  const available = onHand - reserved - quarantine - hold;
  const totalValue = batch.unitCogs ? onHand * parseFloat(batch.unitCogs) : 0;

  return (
    <div className="space-y-6">
      <InspectorSection title="Batch Information" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="SKU">
            <p className="font-semibold text-lg">{batch.sku}</p>
          </InspectorField>
          <InspectorField label="Status">
            <BatchStatusBadge status={batch.batchStatus} />
          </InspectorField>
        </div>

        <InspectorField label="Product">
          <p className="font-medium">{product?.nameCanonical || "Unknown"}</p>
          {product?.category && (
            <p className="text-sm text-muted-foreground">
              {product.category}{" "}
              {product.subcategory ? `/ ${product.subcategory}` : ""}
            </p>
          )}
        </InspectorField>

        {batch.grade && (
          <InspectorField label="Grade">
            <Badge variant="outline">{batch.grade}</Badge>
          </InspectorField>
        )}

        <div className="grid grid-cols-2 gap-4">
          {vendor && (
            <InspectorField label="Supplier">
              <p>{vendor.name}</p>
            </InspectorField>
          )}
          {brand && (
            <InspectorField label={getBrandLabel(product?.category)}>
              <p>{brand.name}</p>
            </InspectorField>
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="Quantities" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">On Hand</p>
            <p className="font-semibold text-lg">{formatQuantity(onHand)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Available</p>
            <p
              className={cn(
                "font-semibold text-lg",
                available <= 0 && "text-red-600"
              )}
            >
              {formatQuantity(available)}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Reserved</p>
            <p className="font-semibold">{formatQuantity(reserved)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">On Hold</p>
            <p className="font-semibold">{formatQuantity(hold)}</p>
          </div>
          {quarantine > 0 && (
            <div className="p-3 bg-red-50 rounded-lg col-span-2">
              <p className="text-xs text-red-600">Quarantined</p>
              <p className="font-semibold text-red-700">
                {formatQuantity(quarantine)}
              </p>
            </div>
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="Valuation">
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Unit Cost">
            <p className="font-semibold">{formatCurrency(batch.unitCogs)}</p>
          </InspectorField>
          <InspectorField label="Total Value">
            <p className="font-semibold text-green-600">
              {formatCurrency(totalValue)}
            </p>
          </InspectorField>
        </div>
      </InspectorSection>

      <InspectorSection title="Update Status">
        <div className="grid grid-cols-2 gap-2">
          {BATCH_STATUSES.filter(
            s => s.value !== "ALL" && s.value !== batch.batchStatus
          ).map(status => (
            <Button
              key={status.value}
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(batch.id, status.value)}
              className="justify-start text-xs"
            >
              <BatchStatusBadge status={status.value} />
            </Button>
          ))}
        </div>
      </InspectorSection>

      <InspectorSection title="Actions">
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            data-testid="adjust-qty-btn"
            onClick={() => onAdjustQuantity(batch.id)}
          >
            Adjust Quantity
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            data-testid="edit-batch-btn"
            onClick={() => onEdit(batch.id)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Batch
          </Button>
        </div>
      </InspectorSection>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InventoryWorkSurface() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pendingBulkDeleteRef = useRef<
    Array<{
      id: number;
      previousStatus: InventoryBatchStatus;
    }>
  >([]);

  // State — Initialize from localStorage for filter persistence
  const savedViewState = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(INVENTORY_VIEW_STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as {
        search?: string;
        sortColumn?: string | null;
        sortDirection?: string;
      };
    } catch {
      return null;
    }
  }, []);
  const [search, setSearch] = useState(() => savedViewState?.search ?? "");
  const [sortColumn, setSortColumn] = useState<string | null>(
    () => savedViewState?.sortColumn ?? null
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() => {
    const saved = savedViewState?.sortDirection;
    if (saved === "asc" || saved === "desc") return saved;
    return "desc";
  });
  const [inventoryViewMode, setInventoryViewMode] =
    useState<InventoryViewMode>("table");
  const [page, setPage] = useState(0);
  const [bulkStatus, setBulkStatus] = useState<InventoryBatchStatus>("LIVE");
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [showQtyAdjust, setShowQtyAdjust] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editBatchId, setEditBatchId] = useState<number | null>(null);
  const [editRack, setEditRack] = useState("");
  const [editStatus, setEditStatus] = useState<InventoryBatchStatus>("LIVE");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [primaryThumbByBatchId, setPrimaryThumbByBatchId] = useState<
    Record<number, string>
  >({});
  const pageSize = 50;
  const useEnhancedApi = true;
  const utils = trpc.useUtils();
  const { filters, updateFilter, clearAllFilters, hasActiveFilters } =
    useInventoryFilters();
  const { exportCSV, state: exportState } = useExport<InventoryExportRow>();

  // Persist search/sort state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        INVENTORY_VIEW_STATE_KEY,
        JSON.stringify({ search, sortColumn, sortDirection })
      );
    } catch {
      // Ignore storage failures.
    }
  }, [search, sortColumn, sortDirection]);

  // Work Surface hooks
  const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();
  const inspector = useInspectorPanel();
  const undo = useUndo({ enableKeyboard: false });

  // Concurrent edit detection for optimistic locking (UXS-705)
  const {
    handleError: handleConflictError,
    ConflictDialog,
    trackVersion,
  } = useConcurrentEditDetection<BatchVersionEntity>({
    entityType: "Batch",
    onRefresh: async () => {
      await Promise.all([
        refetchEnhanced(),
        refetchLegacy(),
        refetchDashboardStats(),
      ]);
    },
  });

  const enhancedSortBy = useMemo(() => {
    switch (sortColumn) {
      case "sku":
        return "sku";
      case "product":
        return "productName";
      case "brand":
        return "brand";
      case "vendor":
        return "vendor";
      case "grade":
        return "grade";
      case "status":
        return "status";
      case "onHandQty":
        return "onHand";
      case "reservedQty":
        return "available";
      case "availableQty":
        return "available";
      case "unitCogs":
        return "unitCogs";
      default:
        return "sku";
    }
  }, [sortColumn]);

  // Data queries
  const {
    data: enhancedData,
    isLoading: isEnhancedLoading,
    error: enhancedError,
    refetch: refetchEnhanced,
  } = trpc.inventory.getEnhanced.useQuery(
    {
      page: page + 1,
      pageSize,
      cursor: page * pageSize,
      search: search || undefined,
      status: filters.status.length > 0 ? filters.status : undefined,
      category: filters.category || undefined,
      subcategory: filters.subcategory || undefined,
      vendor: filters.vendor.length > 0 ? filters.vendor : undefined,
      brand: filters.brand.length > 0 ? filters.brand : undefined,
      grade: filters.grade.length > 0 ? filters.grade : undefined,
      stockLevel: filters.stockLevel !== "all" ? filters.stockLevel : undefined,
      minCogs: filters.cogsRange.min ?? undefined,
      maxCogs: filters.cogsRange.max ?? undefined,
      dateFrom: filters.dateRange.from ?? undefined,
      dateTo: filters.dateRange.to ?? undefined,
      location: filters.location ?? undefined,
      stockStatus:
        filters.stockStatus !== "ALL" ? filters.stockStatus : undefined,
      ageBracket: filters.ageBracket !== "ALL" ? filters.ageBracket : undefined,
      batchId: filters.batchId || undefined,
      sortBy: enhancedSortBy,
      sortOrder: sortDirection,
    },
    {
      enabled: useEnhancedApi,
    }
  );

  const {
    data: legacyData,
    isLoading: isLegacyLoading,
    error: legacyError,
    refetch: refetchLegacy,
  } = trpc.inventory.list.useQuery(
    {
      query: search || undefined,
      status:
        filters.status.length > 0
          ? (filters.status[0] as InventoryBatchStatus)
          : undefined,
      category: filters.category || undefined,
      limit: pageSize,
      cursor: page * pageSize,
    },
    {
      enabled: !useEnhancedApi,
    }
  );

  const {
    data: dashboardStats,
    error: dashboardStatsError,
    refetch: refetchDashboardStats,
  } = trpc.inventory.dashboardStats.useQuery();

  const refreshInventory = useCallback(async () => {
    await Promise.all([
      refetchEnhanced(),
      refetchLegacy(),
      refetchDashboardStats(),
    ]);
  }, [refetchEnhanced, refetchLegacy, refetchDashboardStats]);

  const normalizedItems = useMemo(() => {
    if (useEnhancedApi) {
      return (enhancedData?.items ?? []).map(
        (item): InventoryItem => ({
          batch: {
            id: item.id,
            sku: item.sku,
            batchStatus: item.status,
            grade: item.grade || undefined,
            onHandQty: String(item.onHandQty ?? 0),
            reservedQty: String(item.reservedQty ?? 0),
            quarantineQty: String(item.quarantineQty ?? 0),
            holdQty: String(item.holdQty ?? 0),
            unitCogs:
              item.unitCogs !== null && item.unitCogs !== undefined
                ? String(item.unitCogs)
                : undefined,
            createdAt: item.receivedDate
              ? new Date(item.receivedDate).toISOString()
              : undefined,
            intakeDate: item.receivedDate
              ? new Date(item.receivedDate).toISOString()
              : undefined,
            ageDays: (item as typeof item & { ageDays?: number }).ageDays,
            ageBracket: (item as typeof item & { ageBracket?: AgeBracket })
              .ageBracket,
            stockStatus: (item as typeof item & { stockStatus?: StockStatus })
              .stockStatus,
          },
          product: {
            id: 0,
            nameCanonical: item.productName || "Unknown Product",
            category: item.category || undefined,
            subcategory: item.subcategory || undefined,
          },
          vendor: item.vendorName
            ? { id: 0, name: item.vendorName }
            : undefined,
          brand: item.brandName ? { id: 0, name: item.brandName } : undefined,
        })
      );
    }
    return ((legacyData?.items ?? []) as unknown as InventoryItem[]) || [];
  }, [useEnhancedApi, enhancedData?.items, legacyData?.items]);

  const items = normalizedItems;
  const inventoryLoadError = useEnhancedApi
    ? (enhancedError ?? dashboardStatsError)
    : (legacyError ?? dashboardStatsError);
  const clientSideFilterActive =
    !useEnhancedApi &&
    (filters.stockLevel !== "all" ||
      filters.cogsRange.min !== null ||
      filters.cogsRange.max !== null ||
      filters.dateRange.from !== null ||
      filters.dateRange.to !== null ||
      filters.location !== null);

  const filteredItems = useMemo(() => {
    if (useEnhancedApi) {
      return items;
    }

    return items.filter(item => {
      const batch = item.batch;
      if (!batch) return false;

      const onHand = parseFloat(batch.onHandQty || "0");
      const reserved = parseFloat(batch.reservedQty || "0");
      const quarantine = parseFloat(batch.quarantineQty || "0");
      const hold = parseFloat(batch.holdQty || "0");
      const available = onHand - reserved - quarantine - hold;
      const unitCogs = parseFloat(batch.unitCogs || "0");

      if (filters.stockLevel !== "all") {
        if (filters.stockLevel === "in_stock" && available <= 0) return false;
        if (filters.stockLevel === "low_stock" && available > 50) return false;
        if (filters.stockLevel === "out_of_stock" && available > 0) {
          return false;
        }
      }

      if (filters.cogsRange.min !== null && unitCogs < filters.cogsRange.min) {
        return false;
      }
      if (filters.cogsRange.max !== null && unitCogs > filters.cogsRange.max) {
        return false;
      }

      if (filters.dateRange.from || filters.dateRange.to) {
        const receivedAt = batch.intakeDate || batch.createdAt;
        if (!receivedAt) return false;
        const receivedDate = new Date(receivedAt);
        if (Number.isNaN(receivedDate.getTime())) return false;

        if (filters.dateRange.from) {
          const from = new Date(filters.dateRange.from);
          from.setHours(0, 0, 0, 0);
          if (receivedDate < from) return false;
        }
        if (filters.dateRange.to) {
          const to = new Date(filters.dateRange.to);
          to.setHours(23, 59, 59, 999);
          if (receivedDate > to) return false;
        }
      }

      if (filters.location) {
        const locationQuery = filters.location.toLowerCase();
        const fallbackLocationText = [batch.sku, batch.id, batch.grade]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!fallbackLocationText.includes(locationQuery)) return false;
      }

      return true;
    });
  }, [
    useEnhancedApi,
    items,
    filters.stockLevel,
    filters.cogsRange.min,
    filters.cogsRange.max,
    filters.dateRange.from,
    filters.dateRange.to,
    filters.location,
  ]);

  const vendorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map(item => item.vendor?.name)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [items]
  );

  const brandOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map(item => item.brand?.name)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [items]
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map(item => item.product?.category)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [items]
  );

  const subcategoryOptions = useMemo(() => {
    const allSubcategories = Array.from(
      new Set(
        items
          .map(item => item.product?.subcategory)
          .filter((value): value is string => Boolean(value))
      )
    ).sort();

    if (!filters.category) {
      return allSubcategories;
    }

    return allSubcategories.filter(subcategory =>
      items.some(
        item =>
          item.product?.subcategory === subcategory &&
          item.product?.category === filters.category
      )
    );
  }, [items, filters.category]);

  const gradeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map(item => item.batch?.grade)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [items]
  );

  const hasMore = useEnhancedApi
    ? (enhancedData?.pagination.hasMore ?? false)
    : ((legacyData as { hasMore?: boolean } | undefined)?.hasMore ?? false);
  const totalCount = useEnhancedApi
    ? clientSideFilterActive
      ? filteredItems.length
      : (enhancedData?.summary.totalItems ?? filteredItems.length)
    : hasMore
      ? filteredItems.length + pageSize
      : filteredItems.length;
  const totalPages = useEnhancedApi
    ? Math.max(page + 1 + (hasMore ? 1 : 0), 1)
    : Math.max(Math.ceil(totalCount / pageSize), 1);
  const isLoading = useEnhancedApi ? isEnhancedLoading : isLegacyLoading;

  // Statistics
  const stats = useMemo(() => {
    const pageUnits = filteredItems.reduce(
      (sum, i) => sum + parseFloat(i.batch?.onHandQty || "0"),
      0
    );
    const pageValue = filteredItems.reduce((sum, i) => {
      const qty = parseFloat(i.batch?.onHandQty || "0");
      const cost = parseFloat(i.batch?.unitCogs || "0");
      return sum + qty * cost;
    }, 0);
    const liveCount = filteredItems.filter(
      i => i.batch?.batchStatus === "LIVE"
    ).length;
    return {
      total: filteredItems.length,
      totalUnits: dashboardStats?.totalUnits ?? pageUnits,
      totalValue: dashboardStats?.totalInventoryValue ?? pageValue,
      liveCount: dashboardStats?.statusCounts?.LIVE ?? liveCount,
    };
  }, [filteredItems, dashboardStats]);

  // Sort items
  const displayItems = useMemo(() => {
    if (!sortColumn) return filteredItems;
    return [...filteredItems].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortColumn) {
        case "sku":
          aVal = a.batch?.sku || "";
          bVal = b.batch?.sku || "";
          break;
        case "product":
          aVal = a.product?.nameCanonical || "";
          bVal = b.product?.nameCanonical || "";
          break;
        case "brand":
          aVal = a.brand?.name || "";
          bVal = b.brand?.name || "";
          break;
        case "vendor":
          aVal = a.vendor?.name || "";
          bVal = b.vendor?.name || "";
          break;
        case "grade":
          aVal = a.batch?.grade || "";
          bVal = b.batch?.grade || "";
          break;
        case "status":
          aVal = a.batch?.batchStatus || "";
          bVal = b.batch?.batchStatus || "";
          break;
        case "onHandQty":
          aVal = parseFloat(a.batch?.onHandQty || "0");
          bVal = parseFloat(b.batch?.onHandQty || "0");
          break;
        case "reservedQty":
          aVal = parseFloat(a.batch?.reservedQty || "0");
          bVal = parseFloat(b.batch?.reservedQty || "0");
          break;
        case "availableQty":
          aVal = calculateAvailable(a.batch);
          bVal = calculateAvailable(b.batch);
          break;
        case "unitCogs":
          aVal = parseFloat(a.batch?.unitCogs || "0");
          bVal = parseFloat(b.batch?.unitCogs || "0");
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortColumn, sortDirection]);

  // Shared powersheet selection (TER-283)
  const allBatchIds = useMemo(
    () =>
      displayItems
        .map(item => item.batch?.id)
        .filter((id): id is number => typeof id === "number"),
    [displayItems]
  );
  const visualBatchIds = useMemo(
    () => (inventoryViewMode === "gallery" ? allBatchIds.slice(0, 80) : []),
    [allBatchIds, inventoryViewMode]
  );
  const selection = usePowersheetSelection<number>({ visibleIds: allBatchIds });

  // Backward-compatible aliases
  const selectedBatchId = selection.activeId;
  const setSelectedBatchId = selection.setActiveId;
  const selectedIndex = selection.activeIndex;
  const setSelectedIndex = selection.setActiveIndex;

  // Selected item
  const selectedItem = useMemo(
    () => displayItems.find(i => i.batch?.id === selectedBatchId) || null,
    [displayItems, selectedBatchId]
  );

  const selectedBatchIds = selection.selectedIds;
  const allVisibleSelected = selection.allSelected;
  const someVisibleSelected = selection.someSelected;
  const toggleBatchSelection = selection.toggle;
  const toggleAllVisibleSelection = selection.toggleAll;

  // H1: Pre-compute eligible vs blocked sets for batch deletion
  const { _eligibleForDelete, blockedFromDelete } = useMemo(() => {
    const eligible = new Set<number>();
    const blocked = new Set<number>();
    for (const batchId of selectedBatchIds) {
      const item = items.find(i => i.batch?.id === batchId);
      const onHand = parseFloat(item?.batch?.onHandQty || "0");
      if (onHand > 0) {
        blocked.add(batchId);
      } else {
        eligible.add(batchId);
      }
    }
    return { _eligibleForDelete: eligible, blockedFromDelete: blocked };
  }, [selectedBatchIds, items]);

  // Status-filter-exit notification (TER-518 / XP-A-004-INV)
  const notifyStatusFilterExit = useCallback(
    (batch: { sku?: string; id: number }, newStatus: string) => {
      if (filters.status.length === 0) return;
      const exitMessage = getInventoryStatusFilterExitMessage({
        batchSku: batch.sku || `Batch ${batch.id}`,
        activeStatuses: filters.status,
        toStatus: newStatus,
      });
      if (exitMessage) {
        toast.info(exitMessage, { duration: 4000 });
      }
    },
    [filters.status]
  );

  // Mutations
  const undoStatusMutation = trpc.inventory.updateStatus.useMutation();
  const undoAdjustQtyMutation = trpc.inventory.adjustQty.useMutation();
  const restoreBulkDeleteMutation = trpc.inventory.bulk.restore.useMutation();

  const updateStatusMutation = trpc.inventory.updateStatus.useMutation({
    onMutate: () => setSaving("Updating status..."),
    onSuccess: () => {
      toast.success("Status updated");
      setSaved();
      setSuccessMessage("Batch updated successfully.");
      refreshInventory();
    },
    onError: (err: { message: string }) => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(err)) {
        toast.error(err.message || "Failed to update status");
        setError(err.message);
      }
    },
  });

  const bulkUpdateStatusMutation = trpc.inventory.bulk.updateStatus.useMutation(
    {
      onMutate: () => setSaving("Updating selected batches..."),
      onSuccess: result => {
        const updatedCount =
          typeof result?.updated === "number"
            ? result.updated
            : selectedBatchIds.size;
        toast.success(
          `Updated ${updatedCount} batch${updatedCount === 1 ? "" : "es"}`
        );
        selection.clear();
        setSaved();
        refreshInventory();
      },
      onError: err => {
        toast.error(err.message || "Failed to update selected batches");
        setError(err.message);
      },
    }
  );

  const bulkDeleteMutation = trpc.inventory.bulk.delete.useMutation({
    onMutate: batchIds => {
      setSaving("Deleting selected batches...");
      pendingBulkDeleteRef.current = batchIds.flatMap(batchId => {
        const currentStatus = items.find(item => item.batch?.id === batchId)
          ?.batch?.batchStatus;
        if (!currentStatus || currentStatus === "CLOSED") {
          return [];
        }
        return [
          {
            id: batchId,
            previousStatus: currentStatus as InventoryBatchStatus,
          },
        ];
      });
    },
    onSuccess: (result, batchIds) => {
      const deletedCount =
        typeof result?.deleted === "number" ? result.deleted : batchIds.length;
      const restorePayload = pendingBulkDeleteRef.current.filter(batch =>
        batchIds.includes(batch.id)
      );

      if (deletedCount > 0 && restorePayload.length > 0) {
        undo.registerAction({
          description: `Deleted ${deletedCount} batch${deletedCount === 1 ? "" : "es"}`,
          undo: async () => {
            const restoreResult =
              await restoreBulkDeleteMutation.mutateAsync(restorePayload);
            if (restoreResult.restored < restorePayload.length) {
              throw new Error(
                "One or more deleted batches could not be restored."
              );
            }
            await refreshInventory();
            setSaved();
          },
          duration: 10000,
        });
      } else if (deletedCount > 0) {
        toast.success(
          `Deleted ${deletedCount} batch${deletedCount === 1 ? "" : "es"}`
        );
      }

      pendingBulkDeleteRef.current = [];
      selection.clear();
      setShowBulkDeleteConfirm(false);
      setSaved();
      refreshInventory();
    },
    onError: err => {
      pendingBulkDeleteRef.current = [];
      setBulkDeleteError(
        err.message ||
          "Failed to delete selected batches. Check that all selected batches have zero on-hand quantity."
      );
      setError(err.message);
    },
  });

  const adjustQtyMutation = trpc.inventory.adjustQty.useMutation({
    onMutate: () => setSaving("Adjusting quantity..."),
    onSuccess: () => {
      toast.success("Quantity adjusted");
      setSaved();
      setShowQtyAdjust(false);
      setSuccessMessage("Inventory adjusted successfully.");
      refreshInventory();
    },
    onError: err => {
      toast.error(err.message || "Failed to adjust quantity");
      setError(err.message);
    },
  });

  // Track version for optimistic locking when batch is selected (UXS-705)
  useEffect(() => {
    if (selectedItem?.batch && selectedItem.batch.version !== undefined) {
      trackVersion({
        id: selectedItem.batch.id,
        version: selectedItem.batch.version,
      });
    }
  }, [selectedItem, trackVersion]);

  useEffect(() => {
    if (inventoryViewMode !== "gallery" || visualBatchIds.length === 0) {
      return;
    }

    const missingBatchIds = visualBatchIds.filter(
      batchId => !primaryThumbByBatchId[batchId]
    );
    if (missingBatchIds.length === 0) {
      return;
    }

    let cancelled = false;

    const loadThumbnails = async () => {
      const pairs = await Promise.all(
        missingBatchIds.map(async batchId => {
          try {
            const images = await utils.photography.getBatchImages.fetch({
              batchId,
            });
            const image = images[0];
            return [
              batchId,
              image?.thumbnailUrl ?? image?.imageUrl ?? "",
            ] as const;
          } catch {
            return [batchId, ""] as const;
          }
        })
      );

      if (cancelled) return;

      setPrimaryThumbByBatchId(prev => {
        const next = { ...prev };
        pairs.forEach(([batchId, imageUrl]) => {
          if (imageUrl) {
            next[batchId] = imageUrl;
          }
        });
        return next;
      });
    };

    void loadThumbnails();

    return () => {
      cancelled = true;
    };
  }, [
    inventoryViewMode,
    primaryThumbByBatchId,
    utils.photography.getBatchImages,
    visualBatchIds,
  ]);

  useEffect(() => {
    selection.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters, page]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  // Keyboard contract
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    isInspectorOpen: inspector.isOpen,
    onInspectorClose: inspector.close,
    onUndo: () => {
      void undo.undoLast();
    },
    customHandlers: {
      "cmd+k": (e?: ReactKeyboardEvent) => {
        e?.preventDefault();
        searchInputRef.current?.focus();
      },
      "ctrl+k": (e?: ReactKeyboardEvent) => {
        e?.preventDefault();
        searchInputRef.current?.focus();
      },
      arrowdown: (e?: ReactKeyboardEvent) => {
        e?.preventDefault();
        const newIndex = Math.min(displayItems.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        const item = displayItems[newIndex];
        if (item?.batch) setSelectedBatchId(item.batch.id);
      },
      arrowup: (e?: ReactKeyboardEvent) => {
        e?.preventDefault();
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        const item = displayItems[newIndex];
        if (item?.batch) setSelectedBatchId(item.batch.id);
      },
      enter: (e?: ReactKeyboardEvent) => {
        if (selectedItem) {
          e?.preventDefault();
          inspector.open();
        }
      },
    },
    onCancel: () => {
      if (inspector.isOpen) inspector.close();
    },
  });

  // Handlers
  const handleSort = useCallback(
    (column: string): void => {
      if (sortColumn === column) {
        setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(column);
        setSortDirection("desc");
      }
    },
    [sortColumn]
  );

  const handleEdit = useCallback(
    (batchId: number): void => {
      const editingBatch = items.find(
        item => item.batch?.id === batchId
      )?.batch;
      setEditBatchId(batchId);
      setEditStatus(
        (editingBatch?.batchStatus as InventoryBatchStatus | undefined) ??
          "LIVE"
      );
      setEditRack("");
      setShowEditDialog(true);
    },
    [items]
  );

  const handleStatusChange = useCallback(
    (batchId: number, newStatus: string): void => {
      const batch = items.find(item => item.batch?.id === batchId)?.batch;
      const previousStatus = items.find(item => item.batch?.id === batchId)
        ?.batch?.batchStatus;
      updateStatusMutation.mutate(
        {
          id: batchId,
          status: newStatus as BatchStatus,
        },
        {
          onSuccess: () => {
            if (!previousStatus || previousStatus === newStatus) return;
            notifyStatusFilterExit({ sku: batch?.sku, id: batchId }, newStatus);
            undo.registerAction({
              description: `Changed status to ${newStatus.replace(/_/g, " ")}`,
              undo: async () => {
                setSaving("Undoing status update...");
                await undoStatusMutation.mutateAsync({
                  id: batchId,
                  status: previousStatus as BatchStatus,
                });
                await refreshInventory();
                setSaved();
              },
              duration: 10000,
            });
          },
        }
      );
    },
    [
      items,
      notifyStatusFilterExit,
      undo,
      undoStatusMutation,
      updateStatusMutation,
      refreshInventory,
      setSaved,
      setSaving,
    ]
  );

  const handleAdjustQuantity = useCallback(
    (batchId: number) => {
      setSelectedBatchId(batchId);
      setShowQtyAdjust(true);
    },
    [setSelectedBatchId]
  );

  const handleSubmitAdjustQuantity = useCallback(
    ({ adjustment, adjustmentReason, notes }: AdjustQuantityDialogValues) => {
      if (!selectedBatchId || Number.isNaN(adjustment) || adjustment === 0) {
        toast.error("Enter a valid adjustment amount");
        return;
      }

      const batchId = selectedBatchId;
      const sku = selectedItem?.batch?.sku;
      const originalReasonLabel =
        formatInventoryAdjustmentReason(adjustmentReason);

      adjustQtyMutation.mutate(
        {
          id: batchId,
          field: "onHandQty",
          adjustment,
          adjustmentReason,
          notes,
        },
        {
          onSuccess: () => {
            undo.registerAction({
              description: `Adjusted quantity by ${adjustment} for ${sku || `batch ${batchId}`}`,
              undo: async () => {
                setSaving("Undoing quantity adjustment...");
                await undoAdjustQtyMutation.mutateAsync({
                  id: batchId,
                  field: "onHandQty",
                  adjustment: -adjustment,
                  adjustmentReason: "OTHER",
                  notes: notes
                    ? `Undo quantity adjustment (${originalReasonLabel}): ${notes}`
                    : `Undo quantity adjustment (${originalReasonLabel})`,
                });
                await refreshInventory();
                setSaved();
              },
              duration: 10000,
            });
          },
        }
      );
    },
    [
      selectedBatchId,
      selectedItem,
      adjustQtyMutation,
      undo,
      undoAdjustQtyMutation,
      refreshInventory,
      setSaved,
      setSaving,
    ]
  );

  const handleSubmitEditBatch = useCallback(() => {
    if (!editBatchId) {
      toast.error("No batch selected for update");
      return;
    }
    const previousStatus = items.find(item => item.batch?.id === editBatchId)
      ?.batch?.batchStatus;
    const batchSku = items.find(item => item.batch?.id === editBatchId)?.batch
      ?.sku;
    updateStatusMutation.mutate(
      {
        id: editBatchId,
        status: editStatus as BatchStatus,
      },
      {
        onSuccess: () => {
          if (!previousStatus || previousStatus === editStatus) return;
          notifyStatusFilterExit(
            { sku: batchSku, id: editBatchId },
            editStatus
          );
          undo.registerAction({
            description: `Edited status to ${editStatus.replace(/_/g, " ")}`,
            undo: async () => {
              setSaving("Undoing status update...");
              await undoStatusMutation.mutateAsync({
                id: editBatchId,
                status: previousStatus as BatchStatus,
              });
              await refreshInventory();
              setSaved();
            },
            duration: 10000,
          });
        },
      }
    );
    setShowEditDialog(false);
  }, [
    editBatchId,
    editStatus,
    items,
    notifyStatusFilterExit,
    undo,
    undoStatusMutation,
    updateStatusMutation,
    refreshInventory,
    setSaved,
    setSaving,
  ]);

  const handleApplyBulkStatus = useCallback(() => {
    const batchIds = Array.from(selectedBatchIds);
    if (!batchIds.length) return;

    const previousStatuses = batchIds
      .map(id => ({
        id,
        status: items.find(item => item.batch?.id === id)?.batch?.batchStatus,
      }))
      .filter(
        (entry): entry is { id: number; status: string } =>
          Boolean(entry.status) && entry.status !== bulkStatus
      );

    bulkUpdateStatusMutation.mutate(
      {
        batchIds,
        newStatus: bulkStatus,
      },
      {
        onSuccess: () => {
          // Notify if bulk status change moves batches outside the active filter
          if (filters.status.length > 0) {
            const normalizedTarget = normalizeStatus(bulkStatus);
            const normalizedActive = filters.status.map(normalizeStatus);
            if (!normalizedActive.includes(normalizedTarget)) {
              toast.info(
                `${previousStatuses.length} batch${previousStatuses.length === 1 ? "" : "es"} moved to ${normalizedTarget} and may be hidden by the current filter.`,
                { duration: 4000 }
              );
            }
          }

          if (!previousStatuses.length) return;
          undo.registerAction({
            description: `Updated status for ${previousStatuses.length} batch${previousStatuses.length === 1 ? "" : "es"}`,
            undo: async () => {
              setSaving("Undoing bulk status update...");
              for (const entry of previousStatuses) {
                await undoStatusMutation.mutateAsync({
                  id: entry.id,
                  status: entry.status as BatchStatus,
                });
              }
              await refreshInventory();
              setSaved();
            },
            duration: 10000,
          });
        },
      }
    );
  }, [
    selectedBatchIds,
    items,
    bulkStatus,
    filters.status,
    bulkUpdateStatusMutation,
    undo,
    undoStatusMutation,
    refreshInventory,
    setSaved,
    setSaving,
  ]);

  const handleBulkDelete = useCallback(() => {
    if (selectedBatchIds.size === 0) return;
    setBulkDeleteError(null);
    setShowBulkDeleteConfirm(true);
  }, [selectedBatchIds]);

  const handleConfirmBulkDelete = useCallback(() => {
    const batchIds = Array.from(selectedBatchIds).filter(
      id => !blockedFromDelete.has(id)
    );
    if (batchIds.length === 0) {
      setShowBulkDeleteConfirm(false);
      return;
    }
    bulkDeleteMutation.mutate(batchIds);
  }, [selectedBatchIds, blockedFromDelete, bulkDeleteMutation]);

  const handleExportCsv = useCallback(async () => {
    if (displayItems.length === 0) {
      toast.error("No data to export");
      return;
    }

    const rows: InventoryExportRow[] = displayItems.map(item => {
      const batch = item.batch;
      const product = item.product;
      const vendor = item.vendor;
      const brand = item.brand;

      const onHand = parseFloat(batch?.onHandQty || "0");
      const reserved = parseFloat(batch?.reservedQty || "0");
      const quarantine = parseFloat(batch?.quarantineQty || "0");
      const hold = parseFloat(batch?.holdQty || "0");
      const available = onHand - reserved - quarantine - hold;
      const unitCogs = parseFloat(batch?.unitCogs || "0");
      const receivedAt = batch?.intakeDate || batch?.createdAt;
      const purchaseDate =
        receivedAt && !Number.isNaN(new Date(receivedAt).getTime())
          ? new Date(receivedAt).toISOString().split("T")[0]
          : "";

      return {
        id: String(batch?.id ?? ""),
        sku: batch?.sku || "",
        productName: product?.nameCanonical || "",
        category: product?.category || "",
        subcategory: product?.subcategory || "",
        vendor: vendor?.name || "",
        brand: brand?.name || "",
        grade: batch?.grade || "",
        status: batch?.batchStatus || "",
        onHand: formatQuantity(onHand),
        reserved: formatQuantity(reserved),
        quarantine: formatQuantity(quarantine),
        hold: formatQuantity(hold),
        available: formatQuantity(available),
        unitCogs: batch?.unitCogs ? formatQuantity(unitCogs) : "",
        totalValue: batch?.unitCogs ? formatQuantity(unitCogs * onHand) : "",
        purchaseDate,
        expirationDate: "",
        location: "",
      };
    });

    try {
      await exportCSV(rows, {
        columns: [
          { key: "id", label: "Batch ID" },
          { key: "sku", label: "SKU" },
          { key: "productName", label: "Product Name" },
          { key: "category", label: "Category" },
          { key: "subcategory", label: "Subcategory" },
          { key: "vendor", label: "Supplier" },
          { key: "brand", label: getMixedBrandLabel(categoryOptions) },
          { key: "grade", label: "Grade" },
          { key: "status", label: "Status" },
          { key: "onHand", label: "On Hand" },
          { key: "reserved", label: "Reserved" },
          { key: "quarantine", label: "Quarantine" },
          { key: "hold", label: "On Hold" },
          { key: "available", label: "Available" },
          { key: "unitCogs", label: "Unit Cost" },
          { key: "totalValue", label: "Total Value" },
          { key: "purchaseDate", label: "Intake Date" },
          { key: "expirationDate", label: "Expiration Date" },
          { key: "location", label: "Location" },
        ],
        filename: "inventory",
        addTimestamp: true,
        confirmTruncation: ({ requestedRows, maxRows, truncatedRows }) =>
          window.confirm(
            `Export ${requestedRows.toLocaleString()} rows? ` +
              `This export is capped at ${maxRows.toLocaleString()} rows, so ${truncatedRows.toLocaleString()} row${truncatedRows === 1 ? "" : "s"} will be omitted.`
          ),
      });
      toast.success(
        `Exported ${rows.length} batch${rows.length === 1 ? "" : "es"}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      toast.error(message);
    }
  }, [displayItems, exportCSV, categoryOptions]);

  const handleApplySavedView = useCallback(
    (savedFilters: Partial<InventoryFilters>): void => {
      const normalizedFilters = normalizeSavedFilters(savedFilters);
      (Object.keys(normalizedFilters) as Array<keyof InventoryFilters>).forEach(
        key => {
          updateFilter(key, normalizedFilters[key]);
        }
      );
      setPage(0);
    },
    [updateFilter]
  );

  const handleRemoveFilterChip = useCallback(
    (key: Parameters<typeof updateFilter>[0], value?: string): void => {
      if (key === "status" && value) {
        updateFilter(
          "status",
          filters.status.filter(status => status !== value)
        );
        setPage(0);
        return;
      }
      if (key === "vendor" && value) {
        updateFilter(
          "vendor",
          filters.vendor.filter(vendor => vendor !== value)
        );
        setPage(0);
        return;
      }
      if (key === "brand" && value) {
        updateFilter(
          "brand",
          filters.brand.filter(brand => brand !== value)
        );
        setPage(0);
        return;
      }
      if (key === "grade" && value) {
        updateFilter(
          "grade",
          filters.grade.filter(grade => grade !== value)
        );
        setPage(0);
        return;
      }
      if (key === "paymentStatus" && value) {
        updateFilter(
          "paymentStatus",
          filters.paymentStatus.filter(status => status !== value)
        );
        setPage(0);
        return;
      }

      if (key === "category") updateFilter("category", null);
      if (key === "subcategory") updateFilter("subcategory", null);
      if (key === "location") updateFilter("location", null);
      if (key === "stockLevel") updateFilter("stockLevel", "all");
      if (key === "dateRange")
        updateFilter("dateRange", { from: null, to: null });
      if (key === "cogsRange")
        updateFilter("cogsRange", { min: null, max: null });
      if (key === "stockStatus") updateFilter("stockStatus", "ALL");
      if (key === "ageBracket") updateFilter("ageBracket", "ALL");
      if (key === "batchId") updateFilter("batchId", null);
      setPage(0);
    },
    [filters, updateFilter]
  );

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column)
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const inventorySummaryStats = [
    { label: "Rows in view", value: stats.total.toLocaleString() },
    { label: "Units in view", value: formatQuantity(stats.totalUnits) },
    { label: "Inventory value", value: formatCurrency(stats.totalValue) },
    { label: "Live batches", value: stats.liveCount.toLocaleString() },
  ] as const;

  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 px-6 py-4 border-b bg-background md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Package className="h-6 w-6" />
            Inventory
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage batches and stock levels
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap items-center justify-end gap-3">
            {SaveStateIndicator}
            <div
              className="inline-flex items-center rounded-md border bg-muted/30 p-1"
              role="group"
              aria-label="Inventory view mode"
            >
              <Button
                size="sm"
                variant={inventoryViewMode === "table" ? "secondary" : "ghost"}
                aria-pressed={inventoryViewMode === "table"}
                data-testid="inventory-view-table"
                onClick={() => setInventoryViewMode("table")}
              >
                Table
              </Button>
              <Button
                size="sm"
                variant={
                  inventoryViewMode === "gallery" ? "secondary" : "ghost"
                }
                aria-pressed={inventoryViewMode === "gallery"}
                data-testid="inventory-view-gallery"
                onClick={() => {
                  if (selectedBatchIds.size > 0) {
                    selection.clear();
                  }
                  setInventoryViewMode("gallery");
                }}
              >
                Gallery
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {inventorySummaryStats.map(item => (
              <div
                key={item.label}
                className="min-w-[120px] rounded-md border bg-muted/25 px-3 py-2"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground sm:text-base">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 px-6 py-3 border-b bg-muted/30">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search inventory... (Cmd+K)"
              aria-label="Search inventory"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
          <SavedViewsDropdown onApplyView={handleApplySavedView} />
          <Button
            variant="outline"
            onClick={() => setShowSaveViewModal(true)}
            disabled={!hasActiveFilters}
          >
            <Plus className="h-4 w-4 mr-2" />
            Save View
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void handleExportCsv();
            }}
            disabled={displayItems.length === 0 || exportState.isExporting}
          >
            {exportState.isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting {Math.round(exportState.progress)}%
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
          {/* TER-220: Unified intake entry point — navigate to Direct Intake */}
          <Button
            data-testid="new-batch-btn"
            onClick={() => setShowPurchaseModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Product Intake
          </Button>
        </div>

        {/* H3: Collapse filters during multi-select for focused selection mode */}
        {selectedBatchIds.size === 0 && (
          <AdvancedFilters
            filters={filters}
            onUpdateFilter={(key, value) => {
              updateFilter(key, value);
              setPage(0);
            }}
            vendors={vendorOptions}
            brands={brandOptions}
            categories={categoryOptions}
            subcategories={subcategoryOptions}
            grades={gradeOptions}
          />
        )}

        {selectedBatchIds.size === 0 && hasActiveFilters ? (
          <FilterChips
            filters={filters}
            onRemoveFilter={handleRemoveFilterChip}
            onClearAll={() => {
              clearAllFilters();
              setPage(0);
            }}
          />
        ) : null}
      </div>

      {successMessage && (
        <div
          data-testid="success-toast"
          className="toast-success mx-6 mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {successMessage}
        </div>
      )}

      {selectedBatchIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-6 py-2 border-b bg-muted/20">
          <Badge variant="secondary">{selectedBatchIds.size} selected</Badge>
          <Select
            value={bulkStatus}
            onValueChange={value =>
              setBulkStatus(value as InventoryBatchStatus)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Bulk status" />
            </SelectTrigger>
            <SelectContent>
              {ACTIONABLE_BATCH_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleApplyBulkStatus}
            disabled={bulkUpdateStatusMutation.isPending}
          >
            Apply Status
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={
                    bulkDeleteMutation.isPending || blockedFromDelete.size > 0
                  }
                  aria-label={
                    blockedFromDelete.size > 0
                      ? `Cannot delete: ${blockedFromDelete.size} batch${blockedFromDelete.size === 1 ? " has" : "es have"} remaining inventory`
                      : `Delete ${selectedBatchIds.size} selected batch${selectedBatchIds.size === 1 ? "" : "es"}`
                  }
                >
                  Delete Selected
                </Button>
              </TooltipTrigger>
              {blockedFromDelete.size > 0 && (
                <TooltipContent>
                  <p>
                    {blockedFromDelete.size} batch
                    {blockedFromDelete.size === 1 ? " has" : "es have"}{" "}
                    remaining inventory — reduce on-hand to 0 first
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {blockedFromDelete.size > 0 && (
            <span className="text-xs text-destructive" role="alert">
              {blockedFromDelete.size} batch
              {blockedFromDelete.size === 1 ? "" : "es"}{" "}
              {blockedFromDelete.size === 1 ? "has" : "have"} remaining
              inventory
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => selection.clear()}
            aria-label="Clear batch selection"
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* H2: Single error banner for bulk delete failures */}
      {bulkDeleteError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mx-6 mt-3 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{bulkDeleteError}</span>
          <div className="flex items-center gap-2">
            {blockedFromDelete.size === 1 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const blockedId = Array.from(blockedFromDelete)[0];
                  setBulkDeleteError(null);
                  selection.clear();
                  const blockedItem = items.find(
                    i => i.batch?.id === blockedId
                  );
                  if (blockedItem?.batch) {
                    setSelectedBatchId(blockedItem.batch.id);
                    inspector.open();
                  }
                }}
              >
                Adjust quantity
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setBulkDeleteError(null)}
              aria-label="Dismiss error"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* H3: Hide stats grid during selection for focused mode */}
      {selectedBatchIds.size === 0 &&
        (dashboardStats?.statusCounts ||
          enhancedData?.summary.byStockStatus) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-3 border-b bg-muted/10">
            <div className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">Critical</div>
              <div className="font-semibold">
                {enhancedData?.summary.byStockStatus.critical ?? 0}
              </div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">Low</div>
              <div className="font-semibold">
                {enhancedData?.summary.byStockStatus.low ?? 0}
              </div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">Optimal</div>
              <div className="font-semibold">
                {enhancedData?.summary.byStockStatus.optimal ?? 0}
              </div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">Out Of Stock</div>
              <div className="font-semibold">
                {enhancedData?.summary.byStockStatus.outOfStock ?? 0}
              </div>
            </div>
          </div>
        )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className={cn(
            "flex-1 overflow-auto transition-all duration-200",
            inspector.isOpen && "mr-96"
          )}
        >
          {isLoading ? (
            <LoadingState
              className="h-64"
              message="Loading inventory workspace..."
            />
          ) : inventoryLoadError ? (
            isDatabaseError(inventoryLoadError) ? (
              <DatabaseErrorState
                entity="inventory"
                errorMessage={inventoryLoadError.message}
                onRetry={() => {
                  void refreshInventory();
                }}
              />
            ) : (
              <ErrorState
                title="Unable to load inventory"
                description={inventoryLoadError.message}
                onRetry={() => {
                  void refreshInventory();
                }}
              />
            )
          ) : displayItems.length === 0 ? (
            hasActiveFilters || search ? (
              <NoSearchResults
                searchTerm={search || undefined}
                onClear={() => {
                  clearAllFilters();
                  setSearch("");
                  setPage(0);
                }}
              />
            ) : (
              <EmptyState
                variant="inventory"
                title="No inventory found"
                description="Intake products to start managing stock, locations, and availability."
                action={{
                  label: "Open Intake",
                  onClick: () => setShowPurchaseModal(true),
                }}
              />
            )
          ) : (
            <>
              {inventoryViewMode === "table" ? (
                <>
                  <div className="hidden md:block">
                    <Table
                      data-testid="inventory-table"
                      className="inventory-list"
                      aria-label="Inventory batches"
                    >
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox
                              checked={
                                allVisibleSelected
                                  ? true
                                  : someVisibleSelected
                                    ? "indeterminate"
                                    : false
                              }
                              onCheckedChange={toggleAllVisibleSelection}
                              aria-label="Select all visible rows"
                            />
                          </TableHead>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => handleSort("sku")}
                            role="columnheader"
                            aria-sort={
                              sortColumn === "sku"
                                ? sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                            tabIndex={0}
                            onKeyDown={(e: ReactKeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSort("sku");
                              }
                            }}
                          >
                            <span className="flex items-center">
                              SKU <SortIcon column="sku" />
                            </span>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => handleSort("product")}
                            role="columnheader"
                            aria-sort={
                              sortColumn === "product"
                                ? sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                            tabIndex={0}
                            onKeyDown={(e: ReactKeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSort("product");
                              }
                            }}
                          >
                            <span className="flex items-center">
                              Product <SortIcon column="product" />
                            </span>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => handleSort("brand")}
                            role="columnheader"
                            aria-sort={
                              sortColumn === "brand"
                                ? sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                            tabIndex={0}
                            onKeyDown={(e: ReactKeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSort("brand");
                              }
                            }}
                          >
                            <span className="flex items-center">
                              {getMixedBrandLabel(categoryOptions)}{" "}
                              <SortIcon column="brand" />
                            </span>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => handleSort("vendor")}
                            role="columnheader"
                            aria-sort={
                              sortColumn === "vendor"
                                ? sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                            tabIndex={0}
                            onKeyDown={(e: ReactKeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSort("vendor");
                              }
                            }}
                          >
                            <span className="flex items-center">
                              Supplier <SortIcon column="vendor" />
                            </span>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => handleSort("grade")}
                            role="columnheader"
                            aria-sort={
                              sortColumn === "grade"
                                ? sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                            tabIndex={0}
                            onKeyDown={(e: ReactKeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSort("grade");
                              }
                            }}
                          >
                            <span className="flex items-center">
                              Grade <SortIcon column="grade" />
                            </span>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => handleSort("status")}
                            role="columnheader"
                            aria-sort={
                              sortColumn === "status"
                                ? sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                            tabIndex={0}
                            onKeyDown={(e: ReactKeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSort("status");
                              }
                            }}
                          >
                            <span className="flex items-center">
                              Status <SortIcon column="status" />
                            </span>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer text-right"
                            onClick={() => handleSort("onHandQty")}
                            role="columnheader"
                            aria-sort={
                              sortColumn === "onHandQty"
                                ? sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                            tabIndex={0}
                            onKeyDown={(e: ReactKeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSort("onHandQty");
                              }
                            }}
                          >
                            <span className="flex items-center justify-end">
                              On Hand <SortIcon column="onHandQty" />
                            </span>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer text-right"
                            onClick={() => handleSort("reservedQty")}
                            role="columnheader"
                            aria-sort={
                              sortColumn === "reservedQty"
                                ? sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                            tabIndex={0}
                            onKeyDown={(e: ReactKeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSort("reservedQty");
                              }
                            }}
                          >
                            <span className="flex items-center justify-end">
                              Reserved <SortIcon column="reservedQty" />
                            </span>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer text-right"
                            onClick={() => handleSort("availableQty")}
                            role="columnheader"
                            aria-sort={
                              sortColumn === "availableQty"
                                ? sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                            tabIndex={0}
                            onKeyDown={(e: ReactKeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSort("availableQty");
                              }
                            }}
                          >
                            <span className="flex items-center justify-end">
                              Available <SortIcon column="availableQty" />
                            </span>
                          </TableHead>
                          <TableHead>Stock Status</TableHead>
                          <TableHead>Age</TableHead>
                          <TableHead
                            className="cursor-pointer text-right"
                            onClick={() => handleSort("unitCogs")}
                            role="columnheader"
                            aria-sort={
                              sortColumn === "unitCogs"
                                ? sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                            tabIndex={0}
                            onKeyDown={(e: ReactKeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSort("unitCogs");
                              }
                            }}
                          >
                            <span className="flex items-center justify-end">
                              Cost <SortIcon column="unitCogs" />
                            </span>
                          </TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayItems.map(
                          (item: InventoryItem, index: number) => {
                            const available = calculateAvailable(item.batch);
                            const ageDays = item.batch?.ageDays ?? 0;
                            const rowHighlightClass = getAgingRowClass(ageDays);

                            return (
                              <TableRow
                                key={item.batch?.id}
                                data-testid={
                                  item.product?.nameCanonical
                                    ? "batch-row"
                                    : undefined
                                }
                                className={cn(
                                  "cursor-pointer hover:bg-muted/50",
                                  rowHighlightClass,
                                  selectedBatchId === item.batch?.id &&
                                    "bg-muted",
                                  selectedIndex === index &&
                                    "ring-1 ring-inset ring-primary"
                                )}
                                onClick={() => {
                                  if (item.batch) {
                                    setSelectedBatchId(item.batch.id);
                                    setSelectedIndex(index);
                                    inspector.open();
                                  }
                                }}
                              >
                                <TableCell onClick={e => e.stopPropagation()}>
                                  <Checkbox
                                    checked={
                                      item.batch
                                        ? selectedBatchIds.has(item.batch.id)
                                        : false
                                    }
                                    onCheckedChange={checked => {
                                      if (!item.batch) return;
                                      toggleBatchSelection(
                                        item.batch.id,
                                        checked
                                      );
                                    }}
                                    aria-label={`Select batch ${item.batch?.sku ?? ""}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {item.batch?.sku}
                                </TableCell>
                                <TableCell>
                                  {item.product?.nameCanonical || "-"}
                                </TableCell>
                                <TableCell>{item.brand?.name || "-"}</TableCell>
                                <TableCell>
                                  {item.vendor?.name || "-"}
                                </TableCell>
                                <TableCell>
                                  {item.batch?.grade ? (
                                    <Badge variant="outline">
                                      {item.batch.grade}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <BatchStatusBadge
                                    status={item.batch?.batchStatus || "LIVE"}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatQuantity(item.batch?.onHandQty)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatQuantity(item.batch?.reservedQty)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span
                                    className={cn(
                                      available <= 100 &&
                                        "text-orange-600 font-semibold"
                                    )}
                                  >
                                    {formatQuantity(available)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {item.batch?.stockStatus ? (
                                    <StockStatusBadge
                                      status={item.batch.stockStatus}
                                      showIcon={false}
                                    />
                                  ) : (
                                    <span className="text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {ageDays > 0 ? (
                                    <AgingBadge
                                      ageDays={ageDays}
                                      ageBracket={item.batch?.ageBracket}
                                      variant="compact"
                                    />
                                  ) : (
                                    <span className="text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.batch?.unitCogs)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          }
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-3 p-3 md:hidden">
                    {displayItems.map((item, index) => {
                      if (!item.batch) return null;
                      const available = calculateAvailable(item.batch);

                      return (
                        <InventoryCard
                          key={item.batch.id}
                          batch={{
                            id: item.batch.id,
                            sku: item.batch.sku,
                            productName:
                              item.product?.nameCanonical || "Unknown",
                            brandName: item.brand?.name || "Unknown",
                            vendorName: item.vendor?.name || "Unknown",
                            category: item.product?.category,
                            grade: item.batch.grade || "-",
                            status: item.batch.batchStatus,
                            onHandQty: item.batch.onHandQty,
                            reservedQty: item.batch.reservedQty,
                            availableQty: available.toString(),
                          }}
                          onView={batchId => {
                            setSelectedBatchId(batchId);
                            setSelectedIndex(index);
                            inspector.open();
                          }}
                          onEdit={
                            item.batch.batchStatus === "AWAITING_INTAKE"
                              ? batchId => handleEdit(batchId)
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <div
                  className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3"
                  data-testid="inventory-gallery"
                >
                  {displayItems.map((item, index) => {
                    if (!item.batch) return null;

                    const batchId = item.batch.id;
                    const available = calculateAvailable(item.batch);

                    return (
                      <BatchGalleryCard
                        key={batchId}
                        sku={item.batch.sku}
                        productName={
                          item.product?.nameCanonical || "Unknown Product"
                        }
                        brandName={item.brand?.name || "-"}
                        vendorName={item.vendor?.name || "-"}
                        category={item.product?.category}
                        status={item.batch.batchStatus}
                        onHandQty={item.batch.onHandQty}
                        reservedQty={item.batch.reservedQty}
                        availableQty={available.toString()}
                        unitCogs={item.batch.unitCogs}
                        stockStatus={item.batch.stockStatus}
                        ageDays={item.batch.ageDays}
                        ageBracket={item.batch.ageBracket}
                        thumbnailUrl={primaryThumbByBatchId[batchId]}
                        onOpen={() => {
                          setSelectedBatchId(batchId);
                          setSelectedIndex(index);
                          inspector.open();
                        }}
                        onAdjustQuantity={() => handleAdjustQuantity(batchId)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages} ({totalCount} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage(p => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Inspector */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={selectedItem?.batch?.sku || "Batch Details"}
          subtitle={selectedItem?.product?.nameCanonical}
        >
          <div data-testid="batch-detail" className="batch-detail-panel">
            <BatchInspectorContent
              item={selectedItem}
              onEdit={handleEdit}
              onStatusChange={handleStatusChange}
              onAdjustQuantity={handleAdjustQuantity}
            />
          </div>
        </InspectorPanel>
      </div>

      <WorkSurfaceStatusBar
        left={`Page ${page + 1} of ${Math.max(totalPages, 1)} · ${totalCount} total`}
        center={
          selectedItem?.batch ? (
            `Selected: ${selectedItem.batch.sku}`
          ) : undo.state.canUndo ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void undo.undoLast()}
              aria-label="Undo last delete"
            >
              Undo last delete
            </Button>
          ) : selectedBatchIds.size > 0 ? (
            `${selectedBatchIds.size} selected`
          ) : undefined
        }
        right={
          <KeyboardHintBar
            hints={[
              { key: "Cmd/Ctrl+K", label: "Search" },
              { key: "↑↓", label: "Navigate" },
              { key: "Enter", label: "Inspect" },
              { key: "Esc", label: "Close" },
              { key: "Cmd/Ctrl+Z", label: "Undo" },
            ]}
          />
        }
      />

      {/* Concurrent Edit Conflict Dialog (UXS-705) */}
      <ConflictDialog />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title="Delete selected batches?"
        description={`Delete ${selectedBatchIds.size} selected batch${
          selectedBatchIds.size === 1 ? "" : "es"
        }? You'll be able to undo this action for 10 seconds.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmBulkDelete}
        isLoading={bulkDeleteMutation.isPending}
      />

      <AdjustQuantityDialog
        open={showQtyAdjust}
        onOpenChange={setShowQtyAdjust}
        currentQuantity={selectedItem?.batch?.onHandQty}
        itemLabel={
          selectedItem?.batch
            ? `Selected batch: ${selectedItem.batch.sku}`
            : undefined
        }
        isPending={adjustQtyMutation.isPending}
        onSubmit={handleSubmitAdjustQuantity}
      />

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update batch metadata and status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rack">Rack</Label>
              <Input
                id="rack"
                value={editRack}
                onChange={e => setEditRack(e.target.value)}
                placeholder="e.g., R2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editStatus}
                onValueChange={v => setEditStatus(v as InventoryBatchStatus)}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONABLE_BATCH_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEditBatch}>Update Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PurchaseModal
        open={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={() => {
          setSuccessMessage("Product intake created successfully.");
          refreshInventory();
        }}
      />

      <SaveViewModal
        open={showSaveViewModal}
        onOpenChange={setShowSaveViewModal}
        filters={filters}
        onSuccess={() => void 0}
      />
    </div>
  );
}

export default InventoryWorkSurface;
