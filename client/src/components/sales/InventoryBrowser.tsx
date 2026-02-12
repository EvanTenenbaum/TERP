import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, Plus, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { StrainFamilyIndicator } from "@/components/strain/StrainComponents";
import type {
  PricedInventoryItem,
  BatchStatus,
  NonSellableStatus,
} from "./types";
import { NON_SELLABLE_STATUSES } from "./types";

// TERP-0007: Non-sellable batch status UI configuration
const BATCH_STATUS_CONFIG: Record<
  BatchStatus,
  { label: string; color: string; warning: string }
> = {
  AWAITING_INTAKE: {
    label: "Awaiting Intake",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    warning: "Not yet available for sale",
  },
  ON_HOLD: {
    label: "On Hold",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    warning: "Temporarily unavailable",
  },
  QUARANTINED: {
    label: "Quarantined",
    color: "bg-red-100 text-red-800 border-red-200",
    warning: "Quality hold - do not sell",
  },
  LIVE: {
    label: "Live",
    color: "bg-green-100 text-green-800 border-green-200",
    warning: "",
  },
  PHOTOGRAPHY_COMPLETE: {
    label: "Ready",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    warning: "",
  },
  SOLD_OUT: {
    label: "Sold Out",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    warning: "No inventory available",
  },
  CLOSED: {
    label: "Closed",
    color: "bg-gray-200 text-gray-500 border-gray-300",
    warning: "Batch closed",
  },
};

/**
 * Type guard to check if a status is non-sellable
 * Returns true for AWAITING_INTAKE, ON_HOLD, or QUARANTINED statuses
 */
function isNonSellableStatus(status?: string): status is NonSellableStatus {
  if (!status) return false;
  return (NON_SELLABLE_STATUSES as readonly string[]).includes(status);
}

// Extended inventory item type for internal use (includes orderQuantity when added)
interface InventoryItemWithQuantity extends PricedInventoryItem {
  orderQuantity?: number;
}

// Minimal type for checking if an item is already selected (only id is needed)
interface SelectedItemRef {
  id: number;
}

interface InventoryBrowserProps {
  inventory: PricedInventoryItem[];
  isLoading: boolean;
  onAddItems: (items: InventoryItemWithQuantity[]) => void;
  /** Items already in the sheet - only id is needed for duplicate detection */
  selectedItems: SelectedItemRef[];
}

export function InventoryBrowser({
  inventory,
  isLoading,
  onAddItems,
  selectedItems,
}: InventoryBrowserProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // FEAT-003: Quick add quantity state - tracks quantity for each item
  const [quickQuantities, setQuickQuantities] = useState<
    Record<number, string>
  >({});

  // Filter inventory by search, ensuring items have valid data
  const filteredInventory = inventory.filter(item => {
    // Skip items without valid id or name
    if (!item || item.id === undefined || item.id === null || !item.name) {
      return false;
    }
    return (
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase()) ||
      item.strain?.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Check if item is already in sheet
  const isInSheet = (itemId: number) => {
    return selectedItems.some(item => item.id === itemId);
  };

  // Toggle item selection
  const toggleSelection = (itemId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedIds(newSelected);
  };

  // Select all visible items
  const selectAll = () => {
    const allIds = new Set(filteredInventory.map(item => item.id));
    setSelectedIds(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Add selected items to sheet
  const addSelectedToSheet = () => {
    const itemsToAdd = inventory.filter(item => selectedIds.has(item.id));
    onAddItems(itemsToAdd);
    setSelectedIds(new Set());
  };

  // FEAT-003: Add single item with optional quick quantity
  const addSingleItem = (
    item: PricedInventoryItem,
    customQuantity?: number
  ) => {
    const qty = customQuantity || parseFloat(quickQuantities[item.id]) || 1;

    // FEAT-003: Validate quantity doesn't exceed available stock
    const availableQty = item.quantity || 0;
    const finalQty = Math.min(qty, availableQty);

    const itemWithQuantity = { ...item, orderQuantity: finalQty };
    onAddItems([itemWithQuantity]);
    // Clear the quick quantity input after adding
    setQuickQuantities(prev => {
      const updated = { ...prev };
      delete updated[item.id];
      return updated;
    });
  };

  // FEAT-003: Update quick quantity for an item
  const updateQuickQuantity = (itemId: number, value: string) => {
    setQuickQuantities(prev => ({ ...prev, [itemId]: value }));
  };

  // Calculate markup percentage
  const calculateMarkup = (basePrice: number, retailPrice: number) => {
    if (basePrice === 0) return 0;
    return ((retailPrice - basePrice) / basePrice) * 100;
  };

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
            {/* TER-213: Redesigned as availability catalog */}
            <CardTitle>Availability Catalog</CardTitle>
            <CardDescription>
              Browse available inventory — filter by vendor, category, and stock
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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={selectAll}>
            <CheckSquare className="mr-2 h-4 w-4" />
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            <Square className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>

        <div className="rounded-md border max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Item</TableHead>
                {/* TER-213: Vendor column for availability catalog */}
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty Available</TableHead>
                <TableHead>Price/Unit</TableHead>
                <TableHead>Client Price</TableHead>
                <TableHead>Markup</TableHead>
                <TableHead className="w-24">Quick Qty</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-muted-foreground"
                  >
                    No inventory items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map(item => {
                  const markup = calculateMarkup(
                    item.basePrice,
                    item.retailPrice
                  );
                  const alreadyInSheet = isInSheet(item.id);
                  const quickQty = quickQuantities[item.id] || "";

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
                            {/* TERP-0007: Show batch status indicator for non-sellable items */}
                            {item.status &&
                              isNonSellableStatus(item.status) && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${BATCH_STATUS_CONFIG[item.status]?.color || ""}`}
                                  title={
                                    BATCH_STATUS_CONFIG[item.status]?.warning
                                  }
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {BATCH_STATUS_CONFIG[item.status]?.label ||
                                    item.status}
                                </Badge>
                              )}
                          </div>
                          {item.strainId && (
                            <StrainFamilyIndicator strainId={item.strainId} />
                          )}
                          {/* TERP-0007: Warning for non-sellable status */}
                          {item.status && isNonSellableStatus(item.status) && (
                            <span className="text-xs text-orange-600">
                              {BATCH_STATUS_CONFIG[item.status]?.warning}
                            </span>
                          )}
                          {item.quantity <= 0 &&
                            !isNonSellableStatus(item.status) && (
                              <span className="text-xs text-destructive">
                                Out of stock
                              </span>
                            )}
                        </div>
                      </TableCell>
                      {/* TER-213: Vendor column */}
                      <TableCell className="text-muted-foreground text-sm">
                        {item.vendor || "—"}
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
                      {/* FEAT-003: Quick Add Quantity Field */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Input
                            type="number"
                            min="0"
                            max={item.quantity}
                            step="0.01"
                            placeholder="1"
                            value={quickQty}
                            onChange={e =>
                              updateQuickQuantity(item.id, e.target.value)
                            }
                            onKeyDown={e => {
                              if (e.key === "Enter" && !alreadyInSheet) {
                                e.preventDefault();
                                addSingleItem(item);
                                // Focus next row's quantity input for quick entry
                                const currentRow = (
                                  e.target as HTMLElement
                                ).closest("tr");
                                const nextRow = currentRow?.nextElementSibling;
                                if (nextRow) {
                                  const nextInput = nextRow.querySelector(
                                    'input[type="number"]'
                                  ) as HTMLInputElement;
                                  nextInput?.focus();
                                }
                              }
                            }}
                            disabled={alreadyInSheet}
                            className="w-20 h-8 text-center"
                            title={`Available: ${item.quantity.toFixed(2)}`}
                          />
                          <span className="text-[10px] text-muted-foreground text-center">
                            / {item.quantity.toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addSingleItem(item)}
                          disabled={alreadyInSheet}
                          title={quickQty ? `Add ${quickQty}` : "Add 1"}
                        >
                          <Plus className="h-4 w-4" />
                          {quickQty && (
                            <span className="ml-1 text-xs">{quickQty}</span>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredInventory.length} of {inventory.length} items
        </div>
      </CardContent>
    </Card>
  );
}
