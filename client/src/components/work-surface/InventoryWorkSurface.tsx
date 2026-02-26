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
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { INVENTORY_STATUS_TOKENS } from "../../lib/statusTokens";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PurchaseModal } from "@/components/inventory/PurchaseModal";
import { AdvancedFilters } from "@/components/inventory/AdvancedFilters";
import { FilterChips } from "@/components/inventory/FilterChips";
import { SavedViewsDropdown } from "@/components/inventory/SavedViewsDropdown";
import { SaveViewModal } from "@/components/inventory/SaveViewModal";
import {
  AgingBadge,
  getAgingRowClass,
  type AgeBracket,
} from "@/components/inventory/AgingBadge";
import {
  StockStatusBadge,
  type StockStatus,
} from "@/components/inventory/StockStatusBadge";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import { useConcurrentEditDetection } from "@/hooks/work-surface/useConcurrentEditDetection";
import {
  useExport,
  usePowersheetSelection,
  useUndo,
  useValidationTiming,
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

const BATCH_STATUSES = [
  { value: "ALL", label: "All Statuses" },
  { value: "AWAITING_INTAKE", label: "Awaiting Intake" },
  { value: "LIVE", label: "Live" },
  { value: "PHOTOGRAPHY_COMPLETE", label: "Photo Complete" },
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
  | "PHOTOGRAPHY_COMPLETE"
  | "ON_HOLD"
  | "QUARANTINED"
  | "SOLD_OUT"
  | "CLOSED";

const ACTIONABLE_BATCH_STATUSES = BATCH_STATUSES.filter(
  status => status.value !== "ALL"
) as Array<{ value: InventoryBatchStatus; label: string }>;

type BatchStatus = InventoryBatchStatus;

const qtyAdjustmentSchema = z.object({
  adjustment: z
    .string()
    .trim()
    .min(1, "Enter an adjustment amount")
    .refine(value => !Number.isNaN(Number(value)), "Enter a valid number")
    .refine(value => Number(value) !== 0, "Adjustment cannot be zero"),
  reason: z.string().trim().min(1, "Enter an adjustment reason"),
});

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
            <InspectorField label="Brand">
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

  // State
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [bulkStatus, setBulkStatus] = useState<InventoryBatchStatus>("LIVE");
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [showQtyAdjust, setShowQtyAdjust] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [qtyAdjustment, setQtyAdjustment] = useState("");
  const [qtyReason, setQtyReason] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editBatchId, setEditBatchId] = useState<number | null>(null);
  const [editRack, setEditRack] = useState("");
  const [editStatus, setEditStatus] = useState<InventoryBatchStatus>("LIVE");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const pageSize = 50;
  const useEnhancedApi = true;
  const { filters, updateFilter, clearAllFilters, hasActiveFilters } =
    useInventoryFilters();
  const { exportCSV, state: exportState } = useExport<InventoryExportRow>();

  // Work Surface hooks
  const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();
  const inspector = useInspectorPanel();
  const undo = useUndo({ enableKeyboard: false });
  const {
    handleChange: handleQtyFieldChange,
    handleBlur: handleQtyFieldBlur,
    validateAll: validateQtyFields,
    getFieldState: getQtyFieldState,
    reset: resetQtyValidation,
  } = useValidationTiming({
    schema: qtyAdjustmentSchema,
    initialValues: { adjustment: "", reason: "" },
  });

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
        return "productName";
      case "status":
        return "status";
      case "onHandQty":
        return "onHand";
      case "reservedQty":
        return "available";
      case "availableQty":
        return "available";
      case "unitCogs":
        return "available";
      default:
        return "sku";
    }
  }, [sortColumn]);

  // Data queries
  const {
    data: enhancedData,
    isLoading: isEnhancedLoading,
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

  const { data: dashboardStats, refetch: refetchDashboardStats } =
    trpc.inventory.dashboardStats.useQuery();

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
  const clientSideFilterActive =
    filters.stockLevel !== "all" ||
    filters.cogsRange.min !== null ||
    filters.cogsRange.max !== null ||
    filters.dateRange.from !== null ||
    filters.dateRange.to !== null ||
    filters.location !== null;

  const filteredItems = useMemo(() => {
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
        if (filters.stockLevel === "low_stock" && available > 100) return false;
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

  // Mutations
  const undoStatusMutation = trpc.inventory.updateStatus.useMutation();
  const undoAdjustQtyMutation = trpc.inventory.adjustQty.useMutation();

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
    onMutate: () => setSaving("Deleting selected batches..."),
    onSuccess: result => {
      const deletedCount =
        typeof result?.deleted === "number"
          ? result.deleted
          : selectedBatchIds.size;
      toast.success(
        `Deleted ${deletedCount} batch${deletedCount === 1 ? "" : "es"}`
      );
      selection.clear();
      setShowBulkDeleteConfirm(false);
      setSaved();
      refreshInventory();
    },
    onError: err => {
      toast.error(err.message || "Failed to delete selected batches");
      setError(err.message);
    },
  });

  const adjustQtyMutation = trpc.inventory.adjustQty.useMutation({
    onMutate: () => setSaving("Adjusting quantity..."),
    onSuccess: () => {
      toast.success("Quantity adjusted");
      setSaved();
      setShowQtyAdjust(false);
      setQtyAdjustment("");
      setQtyReason("");
      resetQtyValidation();
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
      setQtyAdjustment("");
      setQtyReason("");
      resetQtyValidation();
      setShowQtyAdjust(true);
    },
    [resetQtyValidation, setSelectedBatchId]
  );

  const handleSubmitAdjustQuantity = useCallback(() => {
    const validation = validateQtyFields();
    if (!validation.isValid) {
      toast.error(validation.errors.adjustment || validation.errors.reason);
      return;
    }

    const adjustment = Number.parseFloat(qtyAdjustment);
    if (!selectedBatchId || Number.isNaN(adjustment) || adjustment === 0) {
      toast.error("Enter a valid adjustment amount");
      return;
    }
    const batchId = selectedBatchId;
    const reason = qtyReason.trim();
    const sku = selectedItem?.batch?.sku;

    adjustQtyMutation.mutate(
      {
        id: batchId,
        field: "onHandQty",
        adjustment,
        reason,
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
                reason: `Undo quantity adjustment: ${reason}`,
              });
              await refreshInventory();
              setSaved();
            },
            duration: 10000,
          });
        },
      }
    );
  }, [
    validateQtyFields,
    qtyAdjustment,
    selectedBatchId,
    qtyReason,
    selectedItem,
    adjustQtyMutation,
    undo,
    undoAdjustQtyMutation,
    refreshInventory,
    setSaved,
    setSaving,
  ]);

  const handleSubmitEditBatch = useCallback(() => {
    if (!editBatchId) {
      toast.error("No batch selected for update");
      return;
    }
    const previousStatus = items.find(item => item.batch?.id === editBatchId)
      ?.batch?.batchStatus;
    updateStatusMutation.mutate(
      {
        id: editBatchId,
        status: editStatus as BatchStatus,
      },
      {
        onSuccess: () => {
          if (!previousStatus || previousStatus === editStatus) return;
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
    bulkUpdateStatusMutation,
    undo,
    undoStatusMutation,
    refreshInventory,
    setSaved,
    setSaving,
  ]);

  const handleBulkDelete = useCallback(() => {
    if (selectedBatchIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  }, [selectedBatchIds]);

  const handleConfirmBulkDelete = useCallback(() => {
    const batchIds = Array.from(selectedBatchIds);
    if (batchIds.length === 0) {
      setShowBulkDeleteConfirm(false);
      return;
    }
    bulkDeleteMutation.mutate(batchIds);
  }, [selectedBatchIds, bulkDeleteMutation]);

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
          { key: "vendor", label: "Vendor" },
          { key: "brand", label: "Brand" },
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
      });
      toast.success(
        `Exported ${rows.length} batch${rows.length === 1 ? "" : "es"}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      toast.error(message);
    }
  }, [displayItems, exportCSV]);

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

  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 px-6 py-4 border-b bg-background md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Package className="h-6 w-6" />
            Inventory
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage batches and stock levels
          </p>
        </div>
        <div className="flex items-center gap-4">
          {SaveStateIndicator}
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>
              Page Rows:{" "}
              <span className="font-semibold text-foreground">
                {stats.total}
              </span>
            </span>
            <span>
              Units:{" "}
              <span className="font-semibold text-foreground">
                {formatQuantity(stats.totalUnits)}
              </span>
            </span>
            <span>
              Value:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(stats.totalValue)}
              </span>
            </span>
            <span>
              Live:{" "}
              <span className="font-semibold text-foreground">
                {stats.liveCount}
              </span>
            </span>
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

        {hasActiveFilters ? (
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
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
          >
            Delete Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => selection.clear()}>
            Clear Selection
          </Button>
        </div>
      )}

      {(dashboardStats?.statusCounts ||
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
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-medium">No inventory found</p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table data-testid="inventory-table" className="inventory-list">
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
                      >
                        <span className="flex items-center">
                          SKU <SortIcon column="sku" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("product")}
                      >
                        <span className="flex items-center">
                          Product <SortIcon column="product" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("brand")}
                      >
                        <span className="flex items-center">
                          Brand <SortIcon column="brand" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("vendor")}
                      >
                        <span className="flex items-center">
                          Vendor <SortIcon column="vendor" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("grade")}
                      >
                        <span className="flex items-center">
                          Grade <SortIcon column="grade" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("status")}
                      >
                        <span className="flex items-center">
                          Status <SortIcon column="status" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right"
                        onClick={() => handleSort("onHandQty")}
                      >
                        <span className="flex items-center justify-end">
                          On Hand <SortIcon column="onHandQty" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right"
                        onClick={() => handleSort("reservedQty")}
                      >
                        <span className="flex items-center justify-end">
                          Reserved <SortIcon column="reservedQty" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right"
                        onClick={() => handleSort("availableQty")}
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
                      >
                        <span className="flex items-center justify-end">
                          Cost <SortIcon column="unitCogs" />
                        </span>
                      </TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayItems.map((item: InventoryItem, index: number) => {
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
                            selectedBatchId === item.batch?.id && "bg-muted",
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
                                toggleBatchSelection(item.batch.id, checked);
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
                          <TableCell>{item.vendor?.name || "-"}</TableCell>
                          <TableCell>
                            {item.batch?.grade ? (
                              <Badge variant="outline">
                                {item.batch.grade}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
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
                              <span className="text-muted-foreground">-</span>
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
                              <span className="text-muted-foreground">-</span>
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
                    })}
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
                        productName: item.product?.nameCanonical || "Unknown",
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
        left={`Page ${page + 1} of ${totalPages} | ${totalCount} total batches`}
        center={`${selectedBatchIds.size} selected${undo.state.canUndo ? " | Undo available" : ""}`}
        right="Cmd/Ctrl+K Search | Arrows Navigate | Enter Inspect | Esc Close | Cmd/Ctrl+Z Undo"
      />

      {/* Concurrent Edit Conflict Dialog (UXS-705) */}
      <ConflictDialog />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title="Delete selected batches?"
        description={`Delete ${selectedBatchIds.size} selected batch${
          selectedBatchIds.size === 1 ? "" : "es"
        }? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmBulkDelete}
        isLoading={bulkDeleteMutation.isPending}
      />

      <Dialog
        open={showQtyAdjust}
        onOpenChange={open => {
          setShowQtyAdjust(open);
          if (!open) {
            setQtyAdjustment("");
            setQtyReason("");
            resetQtyValidation();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Quantity</DialogTitle>
            <DialogDescription>
              Enter a positive or negative value to adjust on-hand quantity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qty-adjustment">Adjustment Amount</Label>
              <Input
                id="qty-adjustment"
                data-testid="qty-adjustment"
                type="number"
                placeholder="e.g., -5"
                value={qtyAdjustment}
                onChange={e => {
                  setQtyAdjustment(e.target.value);
                  handleQtyFieldChange("adjustment", e.target.value);
                }}
                onBlur={() => handleQtyFieldBlur("adjustment")}
                className={cn(
                  getQtyFieldState("adjustment").showError && "border-red-500"
                )}
              />
              {getQtyFieldState("adjustment").showError && (
                <p className="text-xs text-red-500 mt-1">
                  {getQtyFieldState("adjustment").error}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty-reason">Reason</Label>
              <Input
                id="qty-reason"
                data-testid="qty-reason"
                placeholder="Reason for adjustment"
                value={qtyReason}
                onChange={e => {
                  setQtyReason(e.target.value);
                  handleQtyFieldChange("reason", e.target.value);
                }}
                onBlur={() => handleQtyFieldBlur("reason")}
                className={cn(
                  getQtyFieldState("reason").showError && "border-red-500"
                )}
              />
              {getQtyFieldState("reason").showError && (
                <p className="text-xs text-red-500 mt-1">
                  {getQtyFieldState("reason").error}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQtyAdjust(false)}>
              Cancel
            </Button>
            <Button
              data-testid="submit-adjustment"
              onClick={handleSubmitAdjustQuantity}
              disabled={adjustQtyMutation.isPending}
            >
              {adjustQtyMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
