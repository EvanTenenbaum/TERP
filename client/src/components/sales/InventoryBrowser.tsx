import { useEffect, useMemo, useState } from "react";
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
import { Search, Plus, AlertTriangle } from "lucide-react";
import { StrainFamilyIndicator } from "@/components/strain/StrainComponents";
import {
  normalizePositiveIntegerWithin,
  parsePositiveInteger,
} from "@/lib/quantity";
import { toast } from "sonner";
import type {
  PricedInventoryItem,
  BatchStatus,
  NonSellableStatus,
} from "./types";
import { NON_SELLABLE_STATUSES } from "./types";
import {
  type PortableSalesCut,
  countActiveSalesFilters,
  isSalesInventorySellable,
  matchesSalesInventoryFilters,
  summarizeSalesFilters,
} from "./filtering";
import { STATUS_LABELS } from "@/components/spreadsheet-native/inventoryConstants";

// TERP-0007: Non-sellable batch status UI configuration
const BATCH_STATUS_CONFIG: Record<
  BatchStatus,
  { label: string; color: string; warning: string }
> = {
  AWAITING_INTAKE: {
    label: STATUS_LABELS.AWAITING_INTAKE,
    color: "bg-[var(--warning-bg)] text-[var(--warning)] border-yellow-200",
    warning: "Still incoming and not ready to sell",
  },
  ON_HOLD: {
    label: STATUS_LABELS.ON_HOLD,
    color: "bg-[var(--warning-bg)] text-[var(--warning)] border-orange-200",
    warning: "Temporarily unavailable",
  },
  QUARANTINED: {
    label: STATUS_LABELS.QUARANTINED,
    color: "bg-destructive/10 text-destructive border-red-200",
    warning: "Blocked pending quality review",
  },
  LIVE: {
    label: STATUS_LABELS.LIVE,
    color: "bg-[var(--success-bg)] text-[var(--success)] border-green-200",
    warning: "",
  },
  SOLD_OUT: {
    label: STATUS_LABELS.SOLD_OUT,
    color: "bg-gray-100 text-gray-600 border-gray-200",
    warning: "No inventory available",
  },
  CLOSED: {
    label: STATUS_LABELS.CLOSED,
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

function formatProfileRuleMarkup(priceMarkup: number): string {
  const sign = priceMarkup >= 0 ? "+" : "";
  return `${sign}${priceMarkup.toFixed(1)}% markup`;
}

function formatAppliedRulesSummary(
  appliedRules: Array<{ ruleId: number; ruleName: string; adjustment: string }>
): string | null {
  if (appliedRules.length === 0) {
    return null;
  }

  if (appliedRules.length === 1) {
    return `${appliedRules[0].ruleName} (${appliedRules[0].adjustment})`;
  }

  return `${appliedRules[0].ruleName} (${appliedRules[0].adjustment}) +${appliedRules.length - 1} more`;
}

function getAvailableUnits(item: PricedInventoryItem): number {
  return Math.max(0, Math.floor(item.quantity || 0));
}

function sanitizePriceInput(value: string): string {
  const sanitized = value.replace(/[^\d.]/g, "");
  const [whole, ...decimalParts] = sanitized.split(".");
  if (decimalParts.length === 0) {
    return whole;
  }

  return `${whole}.${decimalParts.join("")}`;
}

function parsePriceFilter(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  portableCut?: PortableSalesCut | null;
  onClearPortableCut?: () => void;
}

export function InventoryBrowser({
  inventory,
  isLoading,
  onAddItems,
  selectedItems,
  portableCut = null,
  onClearPortableCut,
}: InventoryBrowserProps) {
  const [search, setSearch] = useState("");
  const [minClientPrice, setMinClientPrice] = useState("");
  const [maxClientPrice, setMaxClientPrice] = useState("");
  const [includeUnavailable, setIncludeUnavailable] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // FEAT-003: Quick add quantity state - tracks quantity for each item
  const [quickQuantities, setQuickQuantities] = useState<
    Record<number, string>
  >({});

  const selectedItemIds = useMemo(
    () => new Set(selectedItems.map(item => item.id)),
    [selectedItems]
  );
  const normalizedSearch = search.trim().toLowerCase();
  const searchTerms = useMemo(
    () => normalizedSearch.split(/\s+/).filter(Boolean),
    [normalizedSearch]
  );
  const minPriceValue = parsePriceFilter(minClientPrice);
  const maxPriceValue = parsePriceFilter(maxClientPrice);
  const portableCutSummary = useMemo(
    () =>
      portableCut
        ? summarizeSalesFilters(portableCut.filters)
        : ([] as string[]),
    [portableCut]
  );

  useEffect(() => {
    setIncludeUnavailable(portableCut?.filters.includeUnavailable ?? false);
  }, [portableCut]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (!item || item.id === undefined || item.id === null || !item.name) {
        return false;
      }

      const availableUnits = getAvailableUnits(item);
      if (
        !includeUnavailable &&
        !isSalesInventorySellable({
          quantity: availableUnits,
          status: item.status,
        })
      ) {
        return false;
      }

      if (
        portableCut &&
        !matchesSalesInventoryFilters(item, portableCut.filters)
      ) {
        return false;
      }

      if (minPriceValue !== null && item.retailPrice < minPriceValue) {
        return false;
      }

      if (maxPriceValue !== null && item.retailPrice > maxPriceValue) {
        return false;
      }

      if (searchTerms.length === 0) {
        return true;
      }

      const searchIndex = [
        item.name,
        item.vendor,
        item.brand,
        item.category,
        item.subcategory,
        item.strain,
        item.strainFamily,
        item.batchSku,
        item.grade,
        item.status
          ? (BATCH_STATUS_CONFIG[item.status as BatchStatus]?.label ??
            item.status)
          : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchTerms.every(term => searchIndex.includes(term));
    });
  }, [
    inventory,
    includeUnavailable,
    minPriceValue,
    maxPriceValue,
    portableCut,
    searchTerms,
  ]);

  const selectableVisibleIds = useMemo(
    () =>
      filteredInventory
        .filter(item => {
          const availableUnits = getAvailableUnits(item);
          return (
            !selectedItemIds.has(item.id) &&
            isSalesInventorySellable({
              quantity: availableUnits,
              status: item.status,
            })
          );
        })
        .map(item => item.id),
    [filteredInventory, selectedItemIds]
  );

  const hasActiveFilters =
    search.length > 0 ||
    minClientPrice.length > 0 ||
    maxClientPrice.length > 0 ||
    includeUnavailable ||
    Boolean(portableCut && countActiveSalesFilters(portableCut.filters) > 0);

  const isInSheet = (itemId: number) => {
    return selectedItemIds.has(itemId);
  };

  useEffect(() => {
    const visibleIds = new Set(filteredInventory.map(item => item.id));
    setSelectedIds(prev => {
      let changed = false;
      const nextSelected = new Set<number>();

      prev.forEach(id => {
        if (visibleIds.has(id)) {
          nextSelected.add(id);
        } else {
          changed = true;
        }
      });

      return changed ? nextSelected : prev;
    });
  }, [filteredInventory]);

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
    const allIds = new Set(selectableVisibleIds);
    setSelectedIds(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Add selected items to sheet
  const addSelectedToSheet = () => {
    const itemsToAdd = inventory
      .filter(item => {
        const availableUnits = getAvailableUnits(item);
        return (
          selectedIds.has(item.id) &&
          !selectedItemIds.has(item.id) &&
          isSalesInventorySellable({
            quantity: availableUnits,
            status: item.status,
          })
        );
      })
      .map(item => {
        const availableUnits = getAvailableUnits(item);
        const requestedQty = normalizePositiveIntegerWithin(
          quickQuantities[item.id] || "1",
          availableUnits
        );
        return {
          ...item,
          orderQuantity: requestedQty ?? 1,
        };
      });
    onAddItems(itemsToAdd);
    setSelectedIds(new Set());
  };

  // FEAT-003: Add single item with optional quick quantity
  const addSingleItem = (
    item: PricedInventoryItem,
    customQuantity?: number
  ) => {
    const availableUnits = getAvailableUnits(item);
    if (
      !isSalesInventorySellable({
        quantity: availableUnits,
        status: item.status,
      })
    ) {
      toast.error("This batch is not ready to add to the order");
      return;
    }

    const parsedCustomQty =
      customQuantity !== undefined
        ? parsePositiveInteger(customQuantity)
        : parsePositiveInteger(quickQuantities[item.id] || "1");
    const finalQty = Math.min(parsedCustomQty ?? 1, availableUnits);

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
    const [integerPortion = ""] = value.split(".");
    const sanitized = integerPortion.replace(/[^\d]/g, "");
    setQuickQuantities(prev => ({ ...prev, [itemId]: sanitized }));
  };

  const clearFilters = () => {
    setSearch("");
    setMinClientPrice("");
    setMaxClientPrice("");
    setIncludeUnavailable(false);
    onClearPortableCut?.();
  };

  // Show gross margin so the browser matches pricing profiles and order rows.
  const calculateMargin = (basePrice: number, retailPrice: number) => {
    if (retailPrice <= 0) return 0;
    return ((retailPrice - basePrice) / retailPrice) * 100;
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
            <CardTitle>Availability Catalog</CardTitle>
            <CardDescription>
              Search product, grower, or cut and narrow by client price before
              adding lines to the order.
            </CardDescription>
            {portableCut && portableCutSummary.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-[11px]">
                  {portableCut.viewName
                    ? `Saved cut: ${portableCut.viewName}`
                    : "Catalogue cut applied"}
                </Badge>
                {portableCutSummary.slice(0, 4).map(summary => (
                  <Badge
                    key={summary}
                    variant="outline"
                    className="text-[10px] text-muted-foreground"
                  >
                    {summary}
                  </Badge>
                ))}
              </div>
            ) : null}
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
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product, grower, subcategory, strain, or grade"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Search availability catalog"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                inputMode="decimal"
                placeholder="Min $"
                value={minClientPrice}
                onChange={e =>
                  setMinClientPrice(sanitizePriceInput(e.target.value))
                }
                className="h-10 w-24"
                aria-label="Minimum client price"
              />
              <Input
                inputMode="decimal"
                placeholder="Max $"
                value={maxClientPrice}
                onChange={e =>
                  setMaxClientPrice(sanitizePriceInput(e.target.value))
                }
                className="h-10 w-24"
                aria-label="Maximum client price"
              />
              <label
                htmlFor="include-unavailable-batches"
                className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm"
              >
                <Checkbox
                  id="include-unavailable-batches"
                  checked={includeUnavailable}
                  onCheckedChange={checked =>
                    setIncludeUnavailable(Boolean(checked))
                  }
                />
                Include unavailable
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredInventory.length} of {inventory.length} batches
              {!includeUnavailable ? " • Ready to sell only" : ""}
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {selectableVisibleIds.length > 0 && (
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select Visible ({selectableVisibleIds.length})
                </Button>
              )}
              {selectedIds.size > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
              )}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {portableCut ? "Clear Cut + Filters" : "Clear Filters"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-md border max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-[210px]">Units to Add</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty Available</TableHead>
                <TableHead>Price/Unit</TableHead>
                <TableHead>Client Price</TableHead>
                <TableHead>Gross Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground space-y-2 py-8"
                  >
                    <div>No batches match this cut.</div>
                    <div className="text-xs">
                      Broaden the search, clear the price band, or include
                      unavailable batches.
                    </div>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="mt-2"
                      >
                        Reset filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map(item => {
                  const margin = calculateMargin(
                    item.basePrice,
                    item.retailPrice
                  );
                  const alreadyInSheet = isInSheet(item.id);
                  const quickQty = quickQuantities[item.id] || "";
                  const availableUnits = getAvailableUnits(item);
                  const readyToSell = isSalesInventorySellable({
                    quantity: availableUnits,
                    status: item.status,
                  });
                  const addDisabled = alreadyInSheet || !readyToSell;
                  const detailLine = [
                    item.vendor,
                    item.brand && item.brand !== item.vendor ? item.brand : null,
                    item.subcategory,
                    item.grade ? `Grade ${item.grade}` : null,
                    item.batchSku,
                  ]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <TableRow
                      key={item.id}
                      className={alreadyInSheet ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelection(item.id)}
                          disabled={addDisabled}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max={availableUnits}
                            step="1"
                            placeholder="1"
                            value={quickQty}
                            onChange={e =>
                              updateQuickQuantity(item.id, e.target.value)
                            }
                            onKeyDown={e => {
                              if (e.key === "Enter" && !addDisabled) {
                                e.preventDefault();
                                addSingleItem(item);
                                const currentRow = (
                                  e.target as HTMLElement
                                ).closest("tr");
                                const nextRow = currentRow?.nextElementSibling;
                                if (nextRow) {
                                  const nextInput = nextRow.querySelector(
                                    'input[aria-label*="Number of units"]'
                                  ) as HTMLInputElement | null;
                                  nextInput?.focus();
                                }
                              }
                            }}
                            disabled={addDisabled}
                            className="w-24 h-8 text-center"
                            title={`Available: ${availableUnits}`}
                            aria-label={`Number of units to add for ${item.name}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addSingleItem(item)}
                            disabled={addDisabled}
                            title={quickQty ? `Add ${quickQty}` : "Add 1"}
                            aria-label={`Quick add ${item.name}`}
                          >
                            <Plus className="h-4 w-4" />
                            {quickQty && (
                              <span className="ml-1 text-xs">{quickQty}</span>
                            )}
                          </Button>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          / {availableUnits}
                        </span>
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
                          {detailLine && (
                            <span className="text-xs text-muted-foreground">
                              {detailLine}
                            </span>
                          )}
                          {/* TERP-0007: Warning for non-sellable status */}
                          {item.status && isNonSellableStatus(item.status) && (
                            <span className="text-xs text-[var(--warning)]">
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
                      <TableCell className="text-muted-foreground text-sm">
                        {item.vendor || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.category || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>{availableUnits}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>${item.basePrice.toFixed(2)}</span>
                          {item.cogsMode === "RANGE" &&
                            typeof item.unitCogsMin === "number" &&
                            typeof item.unitCogsMax === "number" && (
                              <span className="text-xs text-muted-foreground">
                                {item.effectiveCogsBasis || "MID"} of $
                                {item.unitCogsMin.toFixed(2)} to $
                                {item.unitCogsMax.toFixed(2)}
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex flex-col">
                          <span>${item.retailPrice.toFixed(2)}</span>
                          {item.appliedRules.length > 0 && (
                            <>
                              <span
                                className="text-xs font-normal text-muted-foreground"
                                title={item.appliedRules
                                  .map(
                                    rule =>
                                      `${rule.ruleName} (${rule.adjustment})`
                                  )
                                  .join(", ")}
                              >
                                Profile{" "}
                                {item.appliedRules.length > 1
                                  ? "rules net"
                                  : "rule"}{" "}
                                {formatProfileRuleMarkup(item.priceMarkup)}
                              </span>
                              <span
                                className="text-xs font-normal text-muted-foreground"
                                title={item.appliedRules
                                  .map(
                                    rule =>
                                      `${rule.ruleName} (${rule.adjustment})`
                                  )
                                  .join(", ")}
                              >
                                Applied:{" "}
                                {formatAppliedRulesSummary(item.appliedRules)}
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={margin > 0 ? "default" : "secondary"}>
                          {margin > 0 ? "+" : ""}
                          {margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
