/**
 * InventoryBrowser Component
 * Browse and select inventory items for sales sheets with advanced filtering
 * SALES-SHEET-IMPROVEMENTS: Integrated advanced filtering and sorting
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckSquare, Square, Package } from "lucide-react";
import { StrainFamilyIndicator } from "@/components/strain/StrainComponents";
import { AdvancedFilters } from "./AdvancedFilters";
import type {
  PricedInventoryItem,
  InventoryFilters,
  InventorySortConfig,
} from "./types";
import { DEFAULT_FILTERS, DEFAULT_SORT } from "./types";

interface InventoryBrowserProps {
  inventory: PricedInventoryItem[];
  isLoading: boolean;
  onAddItems: (items: PricedInventoryItem[]) => void;
  selectedItems: PricedInventoryItem[];
  // Optional: external filter/sort control for saved views
  filters?: InventoryFilters;
  sort?: InventorySortConfig;
  onFiltersChange?: (filters: InventoryFilters) => void;
  onSortChange?: (sort: InventorySortConfig) => void;
}

// Apply filters to inventory
function applyFilters(
  item: PricedInventoryItem,
  filters: InventoryFilters
): boolean {
  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    const matchesSearch =
      item.name?.toLowerCase().includes(searchLower) ||
      item.category?.toLowerCase().includes(searchLower) ||
      item.strain?.toLowerCase().includes(searchLower) ||
      item.strainFamily?.toLowerCase().includes(searchLower) ||
      item.vendor?.toLowerCase().includes(searchLower) ||
      item.grade?.toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;
  }

  // Category filter
  if (filters.categories.length > 0) {
    if (!item.category || !filters.categories.includes(item.category)) {
      return false;
    }
  }

  // Grade filter
  if (filters.grades.length > 0) {
    if (!item.grade || !filters.grades.includes(item.grade)) {
      return false;
    }
  }

  // Strain family filter
  if (filters.strainFamilies.length > 0) {
    if (
      !item.strainFamily ||
      !filters.strainFamilies.includes(item.strainFamily)
    ) {
      return false;
    }
  }

  // Vendor filter
  if (filters.vendors.length > 0) {
    if (!item.vendor || !filters.vendors.includes(item.vendor)) {
      return false;
    }
  }

  // Price range filter
  if (filters.priceMin !== null && item.retailPrice < filters.priceMin) {
    return false;
  }
  if (filters.priceMax !== null && item.retailPrice > filters.priceMax) {
    return false;
  }

  // In stock filter
  if (filters.inStockOnly && item.quantity <= 0) {
    return false;
  }

  return true;
}

// Apply sorting to inventory
function applySorting(
  a: PricedInventoryItem,
  b: PricedInventoryItem,
  sort: InventorySortConfig
): number {
  const direction = sort.direction === "asc" ? 1 : -1;

  switch (sort.field) {
    case "name":
      return direction * (a.name || "").localeCompare(b.name || "");
    case "category":
      return direction * (a.category || "").localeCompare(b.category || "");
    case "retailPrice":
      return direction * (a.retailPrice - b.retailPrice);
    case "quantity":
      return direction * (a.quantity - b.quantity);
    case "basePrice":
      return direction * (a.basePrice - b.basePrice);
    case "grade":
      return direction * (a.grade || "").localeCompare(b.grade || "");
    default:
      return 0;
  }
}

export function InventoryBrowser({
  inventory,
  isLoading,
  onAddItems,
  selectedItems,
  filters: externalFilters,
  sort: externalSort,
  onFiltersChange: externalOnFiltersChange,
  onSortChange: externalOnSortChange,
}: InventoryBrowserProps) {
  // Internal state for when not controlled externally
  const [internalFilters, setInternalFilters] =
    useState<InventoryFilters>(DEFAULT_FILTERS);
  const [internalSort, setInternalSort] =
    useState<InventorySortConfig>(DEFAULT_SORT);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Use external or internal state
  const filters = externalFilters ?? internalFilters;
  const sort = externalSort ?? internalSort;
  const onFiltersChange = externalOnFiltersChange ?? setInternalFilters;
  const onSortChange = externalOnSortChange ?? setInternalSort;

  // Filter and sort inventory
  const filteredInventory = useMemo(() => {
    // First, filter out invalid items
    const validItems = inventory.filter(
      (item) => item && item.id !== undefined && item.id !== null && item.name
    );

    // Apply filters
    const filtered = validItems.filter((item) => applyFilters(item, filters));

    // Apply sorting
    return filtered.sort((a, b) => applySorting(a, b, sort));
  }, [inventory, filters, sort]);

  // Check if item is already in sheet
  const isInSheet = useCallback(
    (itemId: number) => {
      return selectedItems.some((item) => item.id === itemId);
    },
    [selectedItems]
  );

  // Toggle item selection
  const toggleSelection = useCallback((itemId: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Select all visible items (that aren't already in sheet)
  const selectAll = useCallback(() => {
    const selectableIds = filteredInventory
      .filter((item) => !isInSheet(item.id))
      .map((item) => item.id);
    setSelectedIds(new Set(selectableIds));
  }, [filteredInventory, isInSheet]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Add selected items to sheet
  const addSelectedToSheet = useCallback(() => {
    const itemsToAdd = inventory.filter((item) => selectedIds.has(item.id));
    onAddItems(itemsToAdd);
    setSelectedIds(new Set());
  }, [inventory, selectedIds, onAddItems]);

  // Add single item to sheet
  const addSingleItem = useCallback(
    (item: PricedInventoryItem) => {
      onAddItems([item]);
    },
    [onAddItems]
  );

  // Calculate markup percentage
  const calculateMarkup = (basePrice: number, retailPrice: number) => {
    if (basePrice === 0) return 0;
    return ((retailPrice - basePrice) / basePrice) * 100;
  };

  // Calculate stats for filtered inventory
  const stats = useMemo(() => {
    const totalValue = filteredInventory.reduce(
      (sum, item) => sum + item.retailPrice * item.quantity,
      0
    );
    const avgPrice =
      filteredInventory.length > 0
        ? filteredInventory.reduce((sum, item) => sum + item.retailPrice, 0) /
          filteredInventory.length
        : 0;
    return { totalValue, avgPrice };
  }, [filteredInventory]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading inventory...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory
            </CardTitle>
            <CardDescription>
              Browse and select items to add to the sales sheet
            </CardDescription>
          </div>
          {selectedIds.size > 0 && (
            <Button onClick={addSelectedToSheet}>
              <Plus className="mr-2 h-4 w-4" />
              Add Selected ({selectedIds.size})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Advanced Filters */}
        <AdvancedFilters
          filters={filters}
          sort={sort}
          onFiltersChange={onFiltersChange}
          onSortChange={onSortChange}
          inventory={inventory}
          isOpen={filtersOpen}
          onOpenChange={setFiltersOpen}
        />

        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            <CheckSquare className="mr-2 h-4 w-4" />
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            <Square className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>

        {/* Inventory Table */}
        <div className="rounded-md border max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Retail Price</TableHead>
                <TableHead>Markup</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground"
                  >
                    {inventory.length === 0
                      ? "No inventory items available"
                      : "No items match the current filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const markup = calculateMarkup(item.basePrice, item.retailPrice);
                  const alreadyInSheet = isInSheet(item.id);

                  return (
                    <TableRow
                      key={item.id}
                      className={alreadyInSheet ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelection(item.id)}
                          disabled={alreadyInSheet}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {item.name}
                            {alreadyInSheet && (
                              <Badge variant="secondary" className="text-xs">
                                In Sheet
                              </Badge>
                            )}
                          </div>
                          {item.strainId && (
                            <StrainFamilyIndicator strainId={item.strainId} />
                          )}
                          {item.quantity <= 0 && (
                            <span className="text-xs text-destructive">
                              Out of stock
                            </span>
                          )}
                          {item.vendor && (
                            <span className="text-xs text-muted-foreground">
                              {item.vendor}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.category || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.quantity.toFixed(2)}</TableCell>
                      <TableCell>${item.basePrice.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">
                        ${item.retailPrice.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={markup > 0 ? "default" : "secondary"}>
                          {markup > 0 ? "+" : ""}
                          {markup.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addSingleItem(item)}
                          disabled={alreadyInSheet}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
          <span>
            Showing {filteredInventory.length} of {inventory.length} items
          </span>
          <div className="flex gap-4">
            <span>Total Value: ${stats.totalValue.toLocaleString()}</span>
            <span>Avg Price: ${stats.avgPrice.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
