import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageErrorBoundary } from "@/components/common/PageErrorBoundary";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Package,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Edit,
  Download,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
// Sprint 4 Track A imports
import {
  StockStatusBadge,
  type StockStatus,
} from "@/components/inventory/StockStatusBadge";
import {
  AgingBadge,
  getAgingRowClass,
  type AgeBracket,
} from "@/components/inventory/AgingBadge";
import { Toggle } from "@/components/ui/toggle";
import { useDebounce } from "@/hooks/useDebounce";
import { PurchaseModal } from "@/components/inventory/PurchaseModal";
import { BatchDetailDrawer } from "@/components/inventory/BatchDetailDrawer";
import { EditBatchModal } from "@/components/inventory/EditBatchModal";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { DataCardSection } from "@/components/data-cards";
import { StockLevelChart } from "@/components/inventory/StockLevelChart";
import { SearchHighlight } from "@/components/inventory/SearchHighlight";
import { AdvancedFilters } from "@/components/inventory/AdvancedFilters";
import { FilterChips } from "@/components/inventory/FilterChips";
import {
  useInventoryFilters,
  type InventoryFilters,
} from "@/hooks/useInventoryFilters";
import { useInventorySort } from "@/hooks/useInventorySort";
import { SortControls } from "@/components/inventory/SortControls";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import { SavedViewsDropdown } from "@/components/inventory/SavedViewsDropdown";
import { SaveViewModal } from "@/components/inventory/SaveViewModal";
import { exportToCSVWithLabels } from "@/utils/exportToCSV";
import { toast } from "sonner";
import { BulkActionsBar } from "@/components/inventory/BulkActionsBar";
import { BulkConfirmDialog } from "@/components/inventory/BulkConfirmDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AuditIcon } from "@/components/audit";

export default function Inventory() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/inventory/:id");
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize selectedBatch from URL parameter if present
  const [selectedBatch, setSelectedBatch] = useState<number | null>(() => {
    if (match && params?.id) {
      const id = parseInt(params.id, 10);
      return isNaN(id) ? null : id;
    }
    return null;
  });

  // Sync URL parameter to selectedBatch state when URL changes
  useEffect(() => {
    if (match && params?.id) {
      const id = parseInt(params.id, 10);
      if (!isNaN(id) && id !== selectedBatch) {
        setSelectedBatch(id);
      }
    } else if (!match && selectedBatch !== null) {
      // URL changed to /inventory without ID, close drawer
      setSelectedBatch(null);
    }
  }, [match, params?.id, selectedBatch]);

  // Update URL when selectedBatch changes programmatically
  useEffect(() => {
    if (
      selectedBatch !== null &&
      (!match || params?.id !== selectedBatch.toString())
    ) {
      setLocation(`/inventory/${selectedBatch}`);
    } else if (selectedBatch === null && match) {
      // If drawer is closed but we're on a batch URL, go back to list
      setLocation("/inventory");
    }
  }, [selectedBatch, match, params?.id, setLocation]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<number | null>(null);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<number>>(
    new Set()
  );
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  // Sprint 4 Track A: 4.A.5 ENH-008 - Image toggle state
  const [showImages, setShowImages] = useState(() => {
    try {
      return localStorage.getItem("terp-inventory-show-images") === "true";
    } catch {
      return false;
    }
  });
  // Sprint 4 Track A: 4.A.2 ENH-001 - Use enhanced API
  const [useEnhancedApi, _setUseEnhancedApi] = useState(true);
  // Sprint 4 Track A: 4.A.2 - Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  // Valid batch statuses for bulk operations
  const VALID_BATCH_STATUSES = [
    "AWAITING_INTAKE",
    "LIVE",
    "PHOTOGRAPHY_COMPLETE",
    "ON_HOLD",
    "QUARANTINED",
    "SOLD_OUT",
    "CLOSED",
  ] as const;
  type BatchStatus = (typeof VALID_BATCH_STATUSES)[number];

  const [bulkAction, setBulkAction] = useState<{
    type: "status" | "delete";
    value?: string;
  }>({ type: "status" });

  // Advanced filtering
  const {
    filters,
    updateFilter,
    clearAllFilters,
    hasActiveFilters,
    activeFilterCount,
  } = useInventoryFilters();

  // Export handler
  const handleExport = () => {
    if (!filteredBatches || filteredBatches.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      // Map the nested data structure to flat objects for CSV export
      const exportData = filteredBatches.map(item => {
        const batch = item.batch;
        const product = item.product;
        const brand = item.brand;
        const vendor = item.vendor;

        const onHand = batch ? parseFloat(batch.onHandQty) : 0;
        const reserved = batch ? parseFloat(batch.reservedQty) : 0;
        const quarantine = batch ? parseFloat(batch.quarantineQty) : 0;
        const hold = batch ? parseFloat(batch.holdQty) : 0;
        const available = onHand - reserved - quarantine - hold;

        return {
          id: batch?.id || "",
          sku: batch?.sku || "",
          productName: product?.nameCanonical || "",
          category: product?.category || "",
          subcategory: product?.subcategory || "",
          vendor: vendor?.name || "",
          brand: brand?.name || "",
          grade: batch?.grade || "",
          status: batch?.batchStatus || "",
          onHand: onHand.toFixed(2),
          reserved: reserved.toFixed(2),
          quarantine: quarantine.toFixed(2),
          hold: hold.toFixed(2),
          available: available.toFixed(2),
          unitCogs: batch?.unitCogs || "",
          totalValue: batch?.unitCogs
            ? (parseFloat(batch.unitCogs) * onHand).toFixed(2)
            : "",
          purchaseDate: batch?.createdAt
            ? new Date(batch.createdAt).toISOString().split("T")[0]
            : "",
          expirationDate: "", // Not available in batch schema
          location: "", // Location is in batchLocations table, not batch
        };
      });

      exportToCSVWithLabels(
        exportData,
        [
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
        "inventory"
      );
      toast.success(`Exported ${filteredBatches.length} batches`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Export failed";
      toast.error(message);
    }
  };

  // Bulk action mutations
  const bulkUpdateStatusMutation = trpc.inventory.bulk.updateStatus.useMutation(
    {
      onSuccess: data => {
        toast.success(`Updated ${data.updated} batches`);
        setSelectedBatchIds(new Set());
        setShowBulkConfirm(false);
      },
      onError: error => {
        toast.error(error.message || "Failed to update batches");
      },
    }
  );

  const bulkDeleteMutation = trpc.inventory.bulk.delete.useMutation({
    onSuccess: data => {
      toast.success(`Deleted ${data.deleted} batches`);
      setSelectedBatchIds(new Set());
      setShowBulkConfirm(false);
    },
    onError: error => {
      toast.error(error.message || "Failed to delete batches");
    },
  });

  // Bulk action handlers
  const handleBulkStatusChange = (newStatus: string) => {
    setBulkAction({ type: "status", value: newStatus });
    setShowBulkConfirm(true);
  };

  const handleBulkDelete = () => {
    setBulkAction({ type: "delete" });
    setShowBulkConfirm(true);
  };

  const handleBulkConfirm = () => {
    const batchIds = Array.from(selectedBatchIds);

    if (bulkAction.type === "status" && bulkAction.value) {
      // Runtime validation before type assertion (security fix)
      if (!VALID_BATCH_STATUSES.includes(bulkAction.value as BatchStatus)) {
        toast.error("Invalid status selected");
        return;
      }
      bulkUpdateStatusMutation.mutate({
        batchIds,
        newStatus: bulkAction.value as BatchStatus,
      });
    } else if (bulkAction.type === "delete") {
      bulkDeleteMutation.mutate(batchIds);
    }
  };

  // Apply URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Handle category filter
    const category = params.get("category");
    if (category) {
      updateFilter("category", category);
    }

    // Handle status filter
    const status = params.get("status");
    if (status) {
      updateFilter("status", [status]);
    }

    // Handle stock level filter
    const stockLevel = params.get("stockLevel");
    if (
      stockLevel &&
      (stockLevel === "low_stock" ||
        stockLevel === "in_stock" ||
        stockLevel === "out_of_stock")
    ) {
      updateFilter("stockLevel", stockLevel);
    }

    // Handle sort parameters
    const sortBy = params.get("sortBy");
    const sortOrder = params.get("sortOrder");
    if (sortBy && sortOrder) {
      // Note: This assumes sortState has a way to be set programmatically
      // If not, this can be handled differently
    }

    // Handle expiring within filter
    const expiringWithin = params.get("expiringWithin");
    if (expiringWithin) {
      // This would need to be added to the filters if not already present
      // For now, we'll skip this as it requires filter schema changes
    }
  }, [updateFilter]);

  // Sorting
  const { sortState, toggleSort, sortData } = useInventorySort();

  // Debounce search query (150ms as per spec)
  const debouncedSearch = useDebounce(searchQuery, 150);

  // Sprint 4 Track A: 4.A.5 ENH-008 - Persist image toggle preference
  useEffect(() => {
    try {
      localStorage.setItem("terp-inventory-show-images", showImages.toString());
    } catch {
      // Silently fail
    }
  }, [showImages]);

  // Sprint 4 Track A: 4.A.2 ENH-001 - Fetch enhanced inventory data with pagination
  const { data: enhancedResponse, isLoading: enhancedLoading } =
    trpc.inventory.getEnhanced.useQuery(
      {
        page: currentPage,
        pageSize,
        search: debouncedSearch || undefined,
        status: filters.status.length > 0 ? filters.status : undefined,
        category: filters.category || undefined,
        vendor: filters.vendor.length > 0 ? filters.vendor : undefined,
        brand: filters.brand.length > 0 ? filters.brand : undefined,
        grade: filters.grade.length > 0 ? filters.grade : undefined,
        stockStatus:
          filters.stockStatus !== "ALL" ? filters.stockStatus : undefined,
        ageBracket:
          filters.ageBracket !== "ALL" ? filters.ageBracket : undefined,
        batchId: filters.batchId || undefined,
        sortBy:
          sortState.column === "product"
            ? "productName"
            : sortState.column === "onHand"
              ? "onHand"
              : sortState.column === "available"
                ? "available"
                : sortState.column === "vendor"
                  ? "vendor"
                  : sortState.column === "brand"
                    ? "brand"
                    : sortState.column === "status"
                      ? "status"
                      : sortState.column === "sku"
                        ? "sku"
                        : "sku",
        sortOrder: sortState.direction || "desc",
      },
      {
        enabled: useEnhancedApi,
      }
    );

  // Fallback to legacy list API
  const { data: legacyResponse, isLoading: legacyLoading } =
    trpc.inventory.list.useQuery(
      {
        query: debouncedSearch || undefined,
        limit: 1000,
      },
      {
        enabled: !useEnhancedApi,
      }
    );

  const isLoading = useEnhancedApi ? enhancedLoading : legacyLoading;

  // Extract items from response - handle both enhanced and legacy APIs
  const inventoryData = useMemo(() => {
    if (useEnhancedApi && enhancedResponse) {
      // Transform enhanced API response to match legacy format for compatibility
      return enhancedResponse.items.map(item => ({
        batch: {
          id: item.id,
          sku: item.sku,
          code: item.code,
          batchStatus: item.status,
          grade: item.grade,
          onHandQty: item.onHandQty.toString(),
          reservedQty: item.reservedQty.toString(),
          quarantineQty: item.quarantineQty.toString(),
          holdQty: item.holdQty.toString(),
          unitCogs: item.unitCogs?.toString() || null,
          createdAt: item.receivedDate,
          // Sprint 4 Track A enhanced fields
          ageDays: item.ageDays,
          ageBracket: item.ageBracket,
          stockStatus: item.stockStatus,
          batchInfo: item.batchInfo,
          lastMovementDate: item.lastMovementDate,
        },
        product: {
          nameCanonical: item.productName,
          category: item.category,
          subcategory: item.subcategory,
        },
        vendor: {
          name: item.vendorName,
        },
        brand: {
          name: item.brandName,
        },
      }));
    }
    return legacyResponse?.items ?? [];
  }, [useEnhancedApi, enhancedResponse, legacyResponse]);

  // Sprint 4 Track A: Pagination info
  const paginationInfo = useMemo(() => {
    if (useEnhancedApi && enhancedResponse) {
      return {
        hasMore: enhancedResponse.pagination.hasMore,
        page: enhancedResponse.pagination.page,
        pageSize: enhancedResponse.pagination.pageSize,
        totalItems: enhancedResponse.summary.totalItems,
      };
    }
    return {
      hasMore: false,
      page: 1,
      pageSize: 1000,
      totalItems: inventoryData.length,
    };
  }, [useEnhancedApi, enhancedResponse, inventoryData.length]);

  // Sprint 4 Track A: Summary stats from enhanced API
  const summaryStats = useMemo(() => {
    if (useEnhancedApi && enhancedResponse) {
      return enhancedResponse.summary;
    }
    return null;
  }, [useEnhancedApi, enhancedResponse]);

  // Fetch dashboard statistics
  const { data: dashboardStats } = trpc.inventory.dashboardStats.useQuery();

  // Apply advanced filters and sorting to inventory
  const filteredAndSortedInventory = useMemo(() => {
    if (!inventoryData) return [];

    const filtered = inventoryData.filter(item => {
      const batch = item.batch;
      const product = item.product;
      const brand = item.brand;
      const vendor = item.vendor;

      if (!batch) return false;

      // Status filter
      if (
        filters.status.length > 0 &&
        !filters.status.includes(batch.batchStatus)
      ) {
        return false;
      }

      // Category filter
      if (filters.category && product?.category !== filters.category) {
        return false;
      }

      // Subcategory filter
      if (filters.subcategory && product?.subcategory !== filters.subcategory) {
        return false;
      }

      // Vendor filter
      if (
        filters.vendor.length > 0 &&
        !filters.vendor.includes(vendor?.name || "")
      ) {
        return false;
      }

      // Brand filter
      if (
        filters.brand.length > 0 &&
        !filters.brand.includes(brand?.name || "")
      ) {
        return false;
      }

      // Grade filter
      if (
        filters.grade.length > 0 &&
        !filters.grade.includes(batch.grade || "")
      ) {
        return false;
      }

      // Stock level filter
      if (filters.stockLevel !== "all") {
        const onHand = parseFloat(batch.onHandQty);
        const reserved = parseFloat(batch.reservedQty);
        const quarantine = parseFloat(batch.quarantineQty);
        const hold = parseFloat(batch.holdQty);
        const available = onHand - reserved - quarantine - hold;

        if (filters.stockLevel === "in_stock" && available <= 0) return false;
        if (filters.stockLevel === "low_stock" && available > 100) return false;
        if (filters.stockLevel === "out_of_stock" && available > 0)
          return false;
      }

      // COGS range filter
      if (filters.cogsRange.min !== null || filters.cogsRange.max !== null) {
        const cogs = batch.unitCogs ? parseFloat(batch.unitCogs) : 0;
        if (filters.cogsRange.min !== null && cogs < filters.cogsRange.min)
          return false;
        if (filters.cogsRange.max !== null && cogs > filters.cogsRange.max)
          return false;
      }

      return true;
    });

    // Apply sorting - type assertion needed for union type compatibility
    return sortData(filtered as Parameters<typeof sortData>[0]);
  }, [inventoryData, filters, sortData]);

  // Alias for backward compatibility
  const filteredInventory = filteredAndSortedInventory;
  const filteredBatches = filteredAndSortedInventory;

  // Calculate open tasks counters
  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive";
        icon: LucideIcon;
        label: string;
      }
    > = {
      AWAITING_INTAKE: {
        variant: "secondary",
        icon: Clock,
        label: "Awaiting Intake",
      },
      QC_PENDING: { variant: "secondary", icon: Clock, label: "QC Pending" },
      LIVE: { variant: "default", icon: CheckCircle, label: "Live" },
      ON_HOLD: { variant: "secondary", icon: Pause, label: "On Hold" },
      QUARANTINED: {
        variant: "destructive",
        icon: AlertCircle,
        label: "Quarantined",
      },
      SOLD_OUT: { variant: "secondary", icon: XCircle, label: "Sold Out" },
      CLOSED: { variant: "secondary", icon: XCircle, label: "Closed" },
    };

    const config = statusConfig[status] || statusConfig.LIVE;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Calculate available quantity
  const calculateAvailable = (
    batch?: {
      onHandQty?: string | number;
      reservedQty?: string | number;
      quarantineQty?: string | number;
      holdQty?: string | number;
    } | null
  ) => {
    if (!batch) return 0;
    const onHand = parseFloat(String(batch.onHandQty ?? 0));
    const reserved = parseFloat(String(batch.reservedQty ?? 0));
    const quarantine = parseFloat(String(batch.quarantineQty ?? 0));
    const hold = parseFloat(String(batch.holdQty ?? 0));
    return Math.max(0, onHand - reserved - quarantine - hold);
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="inventory-skeleton">
        <DashboardSkeleton />
        <Card>
          <TableSkeleton rows={8} columns={10} />
        </Card>
      </div>
    );
  }

  return (
    <PageErrorBoundary pageName="Inventory">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Inventory
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage batches, track stock levels, and control product lifecycle
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <SavedViewsDropdown
              onApplyView={(filters: Partial<InventoryFilters>) => {
                // Apply all filters from the saved view
                Object.entries(filters).forEach(([key, value]) => {
                  const typedKey = key as keyof InventoryFilters;
                  if (value !== undefined) {
                    updateFilter(
                      typedKey,
                      value as InventoryFilters[typeof typedKey]
                    );
                  }
                });
              }}
            />
            <Button
              onClick={() => setShowSaveViewModal(true)}
              variant="outline"
              disabled={!hasActiveFilters}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Save View
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              disabled={!filteredBatches || filteredBatches.length === 0}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => setShowPurchaseModal(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Intake
            </Button>
          </div>
        </div>

        {/* Dashboard Statistics - BUG-098 FIX: Use enhanced API summary when available */}
        {useEnhancedApi && enhancedResponse?.summary ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Items</div>
              <div className="text-2xl font-bold">{enhancedResponse.summary.totalItems.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total On Hand</div>
              <div className="text-2xl font-bold">{enhancedResponse.summary.totalOnHand.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Available Units</div>
              <div className="text-2xl font-bold">{enhancedResponse.summary.totalAvailable.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-2xl font-bold">
                ${enhancedResponse.summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </Card>
          </div>
        ) : (
          <DataCardSection moduleId="inventory" />
        )}

        {/* Stock Level Charts */}
        {dashboardStats && (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <StockLevelChart
              title="Stock Levels by Category"
              data={dashboardStats.categoryStats}
              maxItems={5}
            />
            <StockLevelChart
              title="Stock Levels by Subcategory"
              data={dashboardStats.subcategoryStats}
              maxItems={5}
            />
          </div>
        )}

        {/* Search Bar and Filter Status */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by SKU, batch code, or product name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Sprint 4 Track A: 4.A.5 ENH-008 - Image Toggle */}
          <Toggle
            pressed={showImages}
            onPressedChange={setShowImages}
            aria-label="Toggle images"
            className="gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Images</span>
          </Toggle>
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="whitespace-nowrap"
            >
              Clear All Filters ({activeFilterCount})
            </Button>
          )}
        </div>

        {/* Sprint 4 Track A: Summary Stats */}
        {summaryStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-green-600 font-medium">Optimal</p>
              <p className="text-2xl font-bold text-green-700">
                {summaryStats.byStockStatus.optimal}
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <p className="text-orange-600 font-medium">Low Stock</p>
              <p className="text-2xl font-bold text-orange-700">
                {summaryStats.byStockStatus.low}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <p className="text-red-600 font-medium">Critical</p>
              <p className="text-2xl font-bold text-red-700">
                {summaryStats.byStockStatus.critical}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-gray-600 font-medium">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-700">
                {summaryStats.byStockStatus.outOfStock}
              </p>
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        <AdvancedFilters
          filters={filters}
          onUpdateFilter={updateFilter}
          vendors={Array.from(
            new Set(
              inventoryData
                ?.map(i => i.vendor?.name)
                .filter((v): v is string => Boolean(v)) || []
            )
          )}
          brands={Array.from(
            new Set(
              inventoryData
                ?.map(i => i.brand?.name)
                .filter((b): b is string => Boolean(b)) || []
            )
          )}
          categories={Array.from(
            new Set(
              inventoryData
                ?.map(i => i.product?.category)
                .filter((c): c is string => Boolean(c)) || []
            )
          )}
          subcategories={Array.from(
            new Set(
              inventoryData
                ?.map(i => i.product?.subcategory)
                .filter((s): s is string => Boolean(s))
                .filter(s => !filters.category || inventoryData?.some(
                  item => item.product?.subcategory === s && item.product?.category === filters.category
                )) || []
            )
          )}
          grades={Array.from(
            new Set(
              inventoryData
                ?.map(i => i.batch?.grade)
                .filter((g): g is string => Boolean(g)) || []
            )
          )}
        />

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <FilterChips
            filters={filters}
            onRemoveFilter={(key, value) => {
              if (key === "status" && value) {
                updateFilter(
                  "status",
                  filters.status.filter(s => s !== value)
                );
              } else if (key === "vendor" && value) {
                updateFilter(
                  "vendor",
                  filters.vendor.filter(v => v !== value)
                );
              } else if (key === "brand" && value) {
                updateFilter(
                  "brand",
                  filters.brand.filter(b => b !== value)
                );
              } else if (key === "grade" && value) {
                updateFilter(
                  "grade",
                  filters.grade.filter(g => g !== value)
                );
              } else if (key === "paymentStatus" && value) {
                updateFilter(
                  "paymentStatus",
                  filters.paymentStatus.filter(p => p !== value)
                );
              } else {
                // For non-array filters, just clear them
                if (key === "category") updateFilter("category", null);
                if (key === "subcategory") updateFilter("subcategory", null);
                if (key === "location") updateFilter("location", null);
                if (key === "stockLevel") updateFilter("stockLevel", "all");
                if (key === "dateRange")
                  updateFilter("dateRange", { from: null, to: null });
                if (key === "cogsRange")
                  updateFilter("cogsRange", { min: null, max: null });
              }
            }}
            onClearAll={clearAllFilters}
          />
        )}

        {/* Inventory Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedBatchIds.size === filteredBatches?.length &&
                        filteredBatches.length > 0
                      }
                      onCheckedChange={checked => {
                        if (checked) {
                          setSelectedBatchIds(
                            new Set(
                              (filteredBatches
                                ?.map(b => b.batch?.id)
                                .filter(id => id !== undefined) as number[]) ||
                                []
                            )
                          );
                        } else {
                          setSelectedBatchIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>
                    <SortControls
                      column="sku"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={toggleSort}
                    >
                      SKU
                    </SortControls>
                  </TableHead>
                  <TableHead>
                    <SortControls
                      column="product"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={toggleSort}
                    >
                      Product
                    </SortControls>
                  </TableHead>
                  <TableHead>
                    <SortControls
                      column="brand"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={toggleSort}
                    >
                      Brand
                    </SortControls>
                  </TableHead>
                  <TableHead>
                    <SortControls
                      column="vendor"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={toggleSort}
                    >
                      Vendor
                    </SortControls>
                  </TableHead>
                  <TableHead>
                    <SortControls
                      column="grade"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={toggleSort}
                    >
                      Grade
                    </SortControls>
                  </TableHead>
                  <TableHead>
                    <SortControls
                      column="status"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={toggleSort}
                    >
                      Status
                    </SortControls>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortControls
                      column="onHand"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={toggleSort}
                      align="right"
                    >
                      On Hand
                    </SortControls>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortControls
                      column="reserved"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={toggleSort}
                      align="right"
                    >
                      Reserved
                    </SortControls>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortControls
                      column="available"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={toggleSort}
                      align="right"
                    >
                      Available
                    </SortControls>
                  </TableHead>
                  {/* Sprint 4 Track A: 4.A.2 ENH-001 - Stock Status Column */}
                  <TableHead>Stock Status</TableHead>
                  {/* Sprint 4 Track A: 4.A.3 MEET-024 - Age Column */}
                  <TableHead>Age</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      Loading inventory...
                    </TableCell>
                  </TableRow>
                ) : !inventoryData || inventoryData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No inventory found
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPurchaseModal(true)}
                        >
                          Create First Batch
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No matching inventory found
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Try adjusting your filters or search query
                        </p>
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearAllFilters}
                          >
                            Clear All Filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map(item => {
                    const batch = item.batch;
                    const product = item.product;
                    const brand = item.brand;
                    const vendor = item.vendor;

                    if (!batch) return null;

                    const available = calculateAvailable(batch);
                    // Sprint 4 Track A: 4.A.2 ENH-001 - Get enhanced fields
                    // Cast batch to extended type to access enhanced API fields
                    interface EnhancedBatch {
                      ageDays?: number;
                      ageBracket?: AgeBracket;
                      stockStatus?: StockStatus;
                    }
                    const enhancedBatch = batch as typeof batch & EnhancedBatch;
                    const ageDays = enhancedBatch.ageDays ?? 0;
                    const ageBracket = enhancedBatch.ageBracket;
                    const stockStatus = enhancedBatch.stockStatus;
                    // Sprint 4 Track A: 4.A.3 MEET-024 - Row highlighting for aging
                    const rowHighlightClass = getAgingRowClass(ageDays);

                    return (
                      <TableRow
                        key={batch.id}
                        className={`cursor-pointer hover:bg-muted/50 ${rowHighlightClass}`}
                      >
                        <TableCell
                          className="w-12"
                          onClick={e => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedBatchIds.has(batch.id)}
                            onCheckedChange={checked => {
                              const newSelected = new Set(selectedBatchIds);
                              if (checked) {
                                newSelected.add(batch.id);
                              } else {
                                newSelected.delete(batch.id);
                              }
                              setSelectedBatchIds(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell
                          className="font-mono text-sm"
                          onClick={() => setSelectedBatch(batch.id)}
                        >
                          <SearchHighlight
                            text={batch.sku}
                            query={debouncedSearch}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <SearchHighlight
                            text={product?.nameCanonical || "Unknown"}
                            query={debouncedSearch}
                          />
                        </TableCell>
                        <TableCell>
                          <SearchHighlight
                            text={brand?.name || "Unknown"}
                            query={debouncedSearch}
                          />
                        </TableCell>
                        <TableCell>
                          <SearchHighlight
                            text={vendor?.name || "Unknown"}
                            query={debouncedSearch}
                          />
                        </TableCell>
                        <TableCell>
                          {batch.grade ? (
                            <Badge variant="outline">{batch.grade}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(batch.batchStatus)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <div className="flex items-center justify-end gap-1">
                            {parseFloat(batch.onHandQty).toFixed(2)}
                            <AuditIcon
                              type="inventory"
                              entityId={batch.id}
                              fieldName="onHandQty"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(batch.reservedQty).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span
                            className={
                              available <= 100
                                ? "text-orange-600 font-semibold"
                                : ""
                            }
                          >
                            {available.toFixed(2)}
                          </span>
                        </TableCell>
                        {/* Sprint 4 Track A: 4.A.2 ENH-001 - Stock Status */}
                        <TableCell>
                          {stockStatus ? (
                            <StockStatusBadge
                              status={stockStatus}
                              showIcon={false}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        {/* Sprint 4 Track A: 4.A.3 MEET-024 - Age */}
                        <TableCell>
                          {ageDays > 0 ? (
                            <AgingBadge
                              ageDays={ageDays}
                              ageBracket={ageBracket}
                              variant="compact"
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedBatch(batch.id);
                              }}
                            >
                              View
                            </Button>
                            {batch.batchStatus === "AWAITING_INTAKE" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={e => {
                                  e.stopPropagation();
                                  setEditingBatch(batch.id);
                                }}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Intake
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {/* Sprint 4 Track A: 4.A.2 ENH-001 - Pagination */}
            {useEnhancedApi && paginationInfo && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, paginationInfo.totalItems)}{" "}
                  of {paginationInfo.totalItems} items
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={!paginationInfo.hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {isLoading ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  Loading inventory...
                </div>
              </Card>
            ) : !inventoryData || inventoryData.length === 0 ? (
              <Card className="p-8">
                <div className="flex flex-col items-center gap-4">
                  <Package className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No inventory found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPurchaseModal(true)}
                  >
                    Create First Batch
                  </Button>
                </div>
              </Card>
            ) : filteredInventory.length === 0 ? (
              <Card className="p-8">
                <div className="flex flex-col items-center gap-4">
                  <Package className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No matching inventory found
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    Try adjusting your filters or search query
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              filteredInventory.map(item => {
                const batch = item.batch;
                const product = item.product;
                const brand = item.brand;
                const vendor = item.vendor;

                if (!batch) return null;

                const available = calculateAvailable(batch);

                return (
                  <InventoryCard
                    key={batch.id}
                    batch={{
                      id: batch.id,
                      sku: batch.sku,
                      productName: product?.nameCanonical || "Unknown",
                      brandName: brand?.name || "Unknown",
                      vendorName: vendor?.name || "Unknown",
                      grade: batch.grade || "-",
                      status: batch.batchStatus,
                      onHandQty: batch.onHandQty,
                      reservedQty: batch.reservedQty,
                      availableQty: available.toString(),
                    }}
                    onView={id => setSelectedBatch(id)}
                    onEdit={
                      batch.batchStatus === "AWAITING_INTAKE"
                        ? id => setEditingBatch(id)
                        : undefined
                    }
                  />
                );
              })
            )}
          </div>
        </Card>

        {/* Intake Modal */}
        <PurchaseModal
          open={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={() => {
            // Refresh the list
          }}
        />

        {/* Batch Detail Drawer */}
        <BatchDetailDrawer
          batchId={selectedBatch}
          open={selectedBatch !== null}
          onClose={() => setSelectedBatch(null)}
        />

        {/* Edit Batch Modal */}
        {editingBatch && (
          <EditBatchModal
            batchId={editingBatch}
            open={editingBatch !== null}
            onClose={() => setEditingBatch(null)}
            onSuccess={() => {
              setEditingBatch(null);
              // Refresh will happen automatically via tRPC cache invalidation
            }}
          />
        )}

        {/* Save View Modal */}
        <SaveViewModal
          open={showSaveViewModal}
          onOpenChange={setShowSaveViewModal}
          filters={filters}
          onSuccess={() => {
            // Refresh will happen automatically via tRPC
          }}
        />

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedBatchIds.size}
          onClearSelection={() => setSelectedBatchIds(new Set())}
          onStatusChange={handleBulkStatusChange}
          onDelete={handleBulkDelete}
        />

        {/* Bulk Confirm Dialog */}
        <BulkConfirmDialog
          open={showBulkConfirm}
          onOpenChange={setShowBulkConfirm}
          title={
            bulkAction.type === "delete" ? "Delete Batches" : "Update Status"
          }
          description={
            bulkAction.type === "delete"
              ? "Are you sure you want to delete these batches? This action cannot be undone."
              : `Change status to ${bulkAction.value}?`
          }
          selectedCount={selectedBatchIds.size}
          actionLabel={bulkAction.type === "delete" ? "Delete" : "Update"}
          onConfirm={handleBulkConfirm}
          variant={bulkAction.type === "delete" ? "destructive" : "default"}
        />
      </div>
    </PageErrorBoundary>
  );
}
