// @ts-nocheck - TEMPORARY: Type mismatch errors, needs Wave 1 fix
import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { PurchaseModal } from "@/components/inventory/PurchaseModal";
import { BatchDetailDrawer } from "@/components/inventory/BatchDetailDrawer";
import { EditBatchModal } from "@/components/inventory/EditBatchModal";
import { DataCardSection } from "@/components/data-cards";
import { StockLevelChart } from "@/components/inventory/StockLevelChart";
import { SearchHighlight } from "@/components/inventory/SearchHighlight";
import { AdvancedFilters } from "@/components/inventory/AdvancedFilters";
import { FilterChips } from "@/components/inventory/FilterChips";
import { useInventoryFilters } from "@/hooks/useInventoryFilters";
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
    if (selectedBatch !== null && (!match || params?.id !== selectedBatch.toString())) {
      setLocation(`/inventory/${selectedBatch}`);
    } else if (selectedBatch === null && match) {
      // If drawer is closed but we're on a batch URL, go back to list
      setLocation('/inventory');
    }
  }, [selectedBatch, match, params?.id, setLocation]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<number | null>(null);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<number>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<{ type: 'status' | 'delete'; value?: string }>({ type: 'status' });
  
  // Advanced filtering
  const { filters, updateFilter, clearAllFilters, hasActiveFilters, activeFilterCount } = useInventoryFilters();
  
  // Export handler
  const handleExport = () => {
    if (!filteredBatches || filteredBatches.length === 0) {
      toast.error('No data to export');
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
          id: batch?.id || '',
          sku: batch?.sku || '',
          productName: product?.nameCanonical || '',
          category: product?.category || '',
          subcategory: product?.subcategory || '',
          vendor: vendor?.name || '',
          brand: brand?.name || '',
          grade: batch?.grade || '',
          status: batch?.batchStatus || '',
          onHand: onHand.toFixed(2),
          reserved: reserved.toFixed(2),
          quarantine: quarantine.toFixed(2),
          hold: hold.toFixed(2),
          available: available.toFixed(2),
          unitCogs: batch?.unitCogs || '',
          totalValue: batch?.unitCogs ? (parseFloat(batch.unitCogs) * onHand).toFixed(2) : '',
          purchaseDate: batch?.createdAt ? new Date(batch.createdAt).toISOString().split('T')[0] : '',
          expirationDate: '', // Not available in batch schema
          location: '', // Location is in batchLocations table, not batch
        };
      });
      
      exportToCSVWithLabels(
        exportData,
        [
          { key: 'id', label: 'Batch ID' },
          { key: 'sku', label: 'SKU' },
          { key: 'productName', label: 'Product Name' },
          { key: 'category', label: 'Category' },
          { key: 'subcategory', label: 'Subcategory' },
          { key: 'vendor', label: 'Vendor' },
          { key: 'brand', label: 'Brand' },
          { key: 'grade', label: 'Grade' },
          { key: 'status', label: 'Status' },
          { key: 'onHand', label: 'On Hand' },
          { key: 'reserved', label: 'Reserved' },
          { key: 'quarantine', label: 'Quarantine' },
          { key: 'hold', label: 'On Hold' },
          { key: 'available', label: 'Available' },
          { key: 'unitCogs', label: 'Unit Cost' },
          { key: 'totalValue', label: 'Total Value' },
          { key: 'purchaseDate', label: 'Purchase Date' },
          { key: 'expirationDate', label: 'Expiration Date' },
          { key: 'location', label: 'Location' },
        ],
        'inventory'
      );
      toast.success(`Exported ${filteredBatches.length} batches`);
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    }
  };
  
  // Bulk action mutations
  const bulkUpdateStatusMutation = trpc.inventory.bulk.updateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`Updated ${data.updated} batches`);
      setSelectedBatchIds(new Set());
      setShowBulkConfirm(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update batches');
    },
  });
  
  const bulkDeleteMutation = trpc.inventory.bulk.delete.useMutation({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.deleted} batches`);
      setSelectedBatchIds(new Set());
      setShowBulkConfirm(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete batches');
    },
  });
  
  // Bulk action handlers
  const handleBulkStatusChange = (newStatus: string) => {
    setBulkAction({ type: 'status', value: newStatus });
    setShowBulkConfirm(true);
  };
  
  const handleBulkDelete = () => {
    setBulkAction({ type: 'delete' });
    setShowBulkConfirm(true);
  };
  
  const handleBulkConfirm = () => {
    const batchIds = Array.from(selectedBatchIds);
    
    if (bulkAction.type === 'status' && bulkAction.value) {
      bulkUpdateStatusMutation.mutate({
        batchIds,
        newStatus: bulkAction.value as any,
      });
    } else if (bulkAction.type === 'delete') {
      bulkDeleteMutation.mutate(batchIds);
    }
  };
  
  // Apply URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Handle category filter
    const category = params.get('category');
    if (category) {
      updateFilter('category', category);
    }
    
    // Handle status filter
    const status = params.get('status');
    if (status) {
      updateFilter('status', [status]);
    }
    
    // Handle stock level filter
    const stockLevel = params.get('stockLevel');
    if (stockLevel && (stockLevel === 'low_stock' || stockLevel === 'in_stock' || stockLevel === 'out_of_stock')) {
      updateFilter('stockLevel', stockLevel);
    }
    
    // Handle sort parameters
    const sortBy = params.get('sortBy');
    const sortOrder = params.get('sortOrder');
    if (sortBy && sortOrder) {
      // Note: This assumes sortState has a way to be set programmatically
      // If not, this can be handled differently
    }
    
    // Handle expiring within filter
    const expiringWithin = params.get('expiringWithin');
    if (expiringWithin) {
      // This would need to be added to the filters if not already present
      // For now, we'll skip this as it requires filter schema changes
    }
  }, []);
  
  // Sorting
  const { sortState, toggleSort, sortData } = useInventorySort();

  // Debounce search query (150ms as per spec)
  const debouncedSearch = useDebounce(searchQuery, 150);

  // Fetch inventory data
  const { data: inventoryResponse, isLoading } = trpc.inventory.list.useQuery({
    query: debouncedSearch || undefined,
    limit: 1000, // Increased limit to show all inventory
  });
  
  // Extract items from response (API returns { items, nextCursor, hasMore })
  const inventoryData = inventoryResponse?.items || [];

  // Fetch dashboard statistics
  const { data: dashboardStats } = trpc.inventory.dashboardStats.useQuery();

  // Apply advanced filters and sorting to inventory
  const filteredAndSortedInventory = useMemo(() => {
    if (!inventoryData) return [];
    
    const filtered = inventoryData.filter((item) => {
      const batch = item.batch;
      const product = item.product;
      const brand = item.brand;
      const vendor = item.vendor;
      
      if (!batch) return false;
      
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(batch.batchStatus)) {
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
      if (filters.vendor.length > 0 && !filters.vendor.includes(vendor?.name || "")) {
        return false;
      }
      
      // Brand filter
      if (filters.brand.length > 0 && !filters.brand.includes(brand?.name || "")) {
        return false;
      }
      
      // Grade filter
      if (filters.grade.length > 0 && !filters.grade.includes(batch.grade || "")) {
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
        if (filters.stockLevel === "out_of_stock" && available > 0) return false;
      }
      
      // COGS range filter
      if (filters.cogsRange.min !== null || filters.cogsRange.max !== null) {
        const cogs = batch.unitCogs ? parseFloat(batch.unitCogs) : 0;
        if (filters.cogsRange.min !== null && cogs < filters.cogsRange.min) return false;
        if (filters.cogsRange.max !== null && cogs > filters.cogsRange.max) return false;
      }
      
      return true;
    });
    
    // Apply sorting
    return sortData(filtered);
  }, [inventoryData, filters, sortData]);
  
  // Alias for backward compatibility
  const filteredInventory = filteredAndSortedInventory;
  const filteredBatches = filteredAndSortedInventory;

  // Calculate open tasks counters
  const openTasks = useMemo(() => {
    if (!inventoryData) return {
      awaitingIntake: 0,
      qcPending: 0,
      quarantined: 0,
      onHold: 0,
      lowStock: 0,
    };

    return {
      awaitingIntake: inventoryData.filter(
        (item) => item.batch?.batchStatus === "AWAITING_INTAKE"
      ).length,
      qcPending: 0, // QC_PENDING status removed
      quarantined: inventoryData.filter(
        (item) => item.batch?.batchStatus === "QUARANTINED"
      ).length,
      onHold: inventoryData.filter(
        (item) => item.batch?.batchStatus === "ON_HOLD"
      ).length,
      lowStock: inventoryData.filter((item) => {
        if (!item.batch) return false;
        const onHand = parseFloat(item.batch.onHandQty);
        const reserved = parseFloat(item.batch.reservedQty);
        const quarantine = parseFloat(item.batch.quarantineQty);
        const hold = parseFloat(item.batch.holdQty);
        const available = onHand - reserved - quarantine - hold;
        return available <= 100; // Low stock threshold
      }).length,
    };
  }, [inventoryData]);

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      AWAITING_INTAKE: { variant: "secondary", icon: Clock, label: "Awaiting Intake" },
      QC_PENDING: { variant: "secondary", icon: Clock, label: "QC Pending" },
      LIVE: { variant: "default", icon: CheckCircle, label: "Live" },
      ON_HOLD: { variant: "secondary", icon: Pause, label: "On Hold" },
      QUARANTINED: { variant: "destructive", icon: AlertCircle, label: "Quarantined" },
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
  const calculateAvailable = (batch: any) => {
    if (!batch) return 0;
    const onHand = parseFloat(batch.onHandQty);
    const reserved = parseFloat(batch.reservedQty);
    const quarantine = parseFloat(batch.quarantineQty);
    const hold = parseFloat(batch.holdQty);
    return Math.max(0, onHand - reserved - quarantine - hold);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage batches, track stock levels, and control product lifecycle
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <SavedViewsDropdown
            onApplyView={(filters) => {
              // Apply all filters from the saved view
              Object.entries(filters).forEach(([key, value]) => {
                updateFilter(key as any, value as any);
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
          <Button onClick={() => setShowPurchaseModal(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
        </div>
      </div>

      {/* Dashboard Statistics */}
      <DataCardSection moduleId="inventory" />

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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
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

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={filters}
        onUpdateFilter={updateFilter}
        vendors={Array.from(new Set(inventoryData?.map(i => i.vendor?.name).filter((v): v is string => Boolean(v)) || []))}
        brands={Array.from(new Set(inventoryData?.map(i => i.brand?.name).filter((b): b is string => Boolean(b)) || []))}
        categories={Array.from(new Set(inventoryData?.map(i => i.product?.category).filter((c): c is string => Boolean(c)) || []))}
        grades={Array.from(new Set(inventoryData?.map(i => i.batch?.grade).filter((g): g is string => Boolean(g)) || []))}
      />

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <FilterChips
          filters={filters}
          onRemoveFilter={(key, value) => {
            if (key === "status" && value) {
              updateFilter("status", filters.status.filter(s => s !== value));
            } else if (key === "vendor" && value) {
              updateFilter("vendor", filters.vendor.filter(v => v !== value));
            } else if (key === "brand" && value) {
              updateFilter("brand", filters.brand.filter(b => b !== value));
            } else if (key === "grade" && value) {
              updateFilter("grade", filters.grade.filter(g => g !== value));
            } else if (key === "paymentStatus" && value) {
              updateFilter("paymentStatus", filters.paymentStatus.filter(p => p !== value));
            } else {
              // For non-array filters, just clear them
              if (key === "category") updateFilter("category", null);
              if (key === "subcategory") updateFilter("subcategory", null);
              if (key === "location") updateFilter("location", null);
              if (key === "stockLevel") updateFilter("stockLevel", "all");
              if (key === "dateRange") updateFilter("dateRange", { from: null, to: null });
              if (key === "cogsRange") updateFilter("cogsRange", { min: null, max: null });
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
                    checked={selectedBatchIds.size === filteredBatches?.length && filteredBatches.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedBatchIds(new Set(filteredBatches?.map(b => b.batch?.id).filter(id => id !== undefined) as number[] || []));
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading inventory...
                  </TableCell>
                </TableRow>
              ) : !inventoryData || inventoryData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
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
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const batch = item.batch;
                  const product = item.product;
                  const brand = item.brand;
                  const vendor = item.vendor;

                  if (!batch) return null;

                  const available = calculateAvailable(batch);

                  return (
                    <TableRow
                      key={batch.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell
                        className="w-12"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedBatchIds.has(batch.id)}
                          onCheckedChange={(checked) => {
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
                        <SearchHighlight text={batch.sku} query={debouncedSearch} />
                      </TableCell>
                      <TableCell className="font-medium">
                        <SearchHighlight text={product?.nameCanonical || "Unknown"} query={debouncedSearch} />
                      </TableCell>
                      <TableCell>
                        <SearchHighlight text={brand?.name || "Unknown"} query={debouncedSearch} />
                      </TableCell>
                      <TableCell>
                        <SearchHighlight text={vendor?.name || "Unknown"} query={debouncedSearch} />
                      </TableCell>
                      <TableCell>
                        {batch.grade ? (
                          <Badge variant="outline">{batch.grade}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.batchStatus)}</TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex items-center justify-end gap-1">
                          {parseFloat(batch.onHandQty).toFixed(2)}
                          <AuditIcon type="inventory" entityId={batch.id} fieldName="onHandQty" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(batch.reservedQty).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span
                          className={
                            available <= 100 ? "text-orange-600 font-semibold" : ""
                          }
                        >
                          {available.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
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
                              onClick={(e) => {
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
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">Loading inventory...</div>
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
          ) : (
            filteredInventory.map((item) => {
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
                  onView={(id) => setSelectedBatch(id)}
                  onEdit={batch.batchStatus === "AWAITING_INTAKE" ? (id) => setEditingBatch(id) : undefined}
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
        title={bulkAction.type === 'delete' ? 'Delete Batches' : 'Update Status'}
        description={
          bulkAction.type === 'delete'
            ? 'Are you sure you want to delete these batches? This action cannot be undone.'
            : `Change status to ${bulkAction.value}?`
        }
        selectedCount={selectedBatchIds.size}
        actionLabel={bulkAction.type === 'delete' ? 'Delete' : 'Update'}
        onConfirm={handleBulkConfirm}
        variant={bulkAction.type === 'delete' ? 'destructive' : 'default'}
      />
    </div>
  );
}

