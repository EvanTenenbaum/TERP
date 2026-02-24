/**
 * LineItemTable Component
 * Editable table for order line items with COGS and margin management
 * v2.0 Sales Order Enhancements
 * WSQA-002: Added flexible lot selection via BatchSelectionDialog
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LineItemRow } from "./LineItemRow";
import {
  BatchSelectionDialog,
  type BatchAllocation,
} from "./BatchSelectionDialog";
import { calculateLineItem } from "@/hooks/orders/useOrderCalculations";
import { usePowersheetSelection } from "@/hooks/powersheet/usePowersheetSelection";
import type { PowersheetBulkActionContract } from "@/types/powersheet";

export interface LineItem {
  id?: number;
  batchId: number;
  batchSku?: string;
  productId?: number;
  productDisplayName?: string;
  quantity: number;
  cogsPerUnit: number;
  originalCogsPerUnit: number;
  isCogsOverridden: boolean;
  cogsOverrideReason?: string;
  marginPercent: number;
  marginDollar: number;
  isMarginOverridden: boolean;
  marginSource: "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";
  unitPrice: number;
  lineTotal: number;
  isSample: boolean;
}

interface LineItemTableProps {
  items: LineItem[];
  clientId: number | null;
  onChange: (items: LineItem[]) => void;
  onAddItem?: () => void;
}

// WSQA-002: State for batch selection dialog
interface LotSelectionState {
  isOpen: boolean;
  itemIndex: number;
  productId: number;
  productName: string;
  quantity: number;
}

const getRowSelectionId = (item: LineItem, index: number): string =>
  item.id
    ? `line:${item.id}`
    : `line:${index}:${item.batchId}:${item.productId ?? "unknown"}`;

export function LineItemTable({
  items,
  clientId,
  onChange,
  onAddItem,
}: LineItemTableProps) {
  // WSQA-002: Batch selection dialog state
  const [lotSelection, setLotSelection] = useState<LotSelectionState | null>(
    null
  );
  const [bulkMarginPercent, setBulkMarginPercent] = useState("");
  const [bulkCogsPerUnit, setBulkCogsPerUnit] = useState("");
  const tableRef = useRef<HTMLDivElement | null>(null);

  const rowSelectionIds = useMemo(
    () => items.map((item, index) => getRowSelectionId(item, index)),
    [items]
  );
  const rowSelection = usePowersheetSelection<string>();
  const selectedRowIdSet = useMemo(
    () => new Set(rowSelection.selectedRowIds),
    [rowSelection.selectedRowIds]
  );
  const selectedIndexes = useMemo(
    () =>
      rowSelectionIds
        .map((rowId, index) => (selectedRowIdSet.has(rowId) ? index : -1))
        .filter(index => index >= 0),
    [rowSelectionIds, selectedRowIdSet]
  );
  const allRowsSelected =
    rowSelectionIds.length > 0 &&
    rowSelection.selectedCount === rowSelectionIds.length;

  useEffect(() => {
    if (rowSelection.selectedCount === 0) {
      return;
    }
    const validSelection = rowSelection.selectedRowIds.every(rowId =>
      rowSelectionIds.includes(rowId)
    );
    if (!validSelection) {
      rowSelection.clearSelection();
    }
  }, [rowSelection, rowSelectionIds]);

  const focusQuantityTrigger = useCallback((rowIndex: number) => {
    const root = tableRef.current;
    if (!root) return;
    const node = root.querySelector(
      `[data-line-item-row-index="${rowIndex}"] [data-line-item-quantity-trigger]`
    );
    if (node instanceof HTMLElement) {
      node.focus();
    }
  }, []);

  const applyToSelected = useCallback(
    (updater: (row: LineItem) => LineItem): void => {
      if (selectedRowIdSet.size === 0) return;
      onChange(
        items.map((row, index) =>
          selectedRowIdSet.has(rowSelectionIds[index]) ? updater(row) : row
        )
      );
    },
    [items, onChange, rowSelectionIds, selectedRowIdSet]
  );

  const bulkActions = useMemo<PowersheetBulkActionContract<LineItem>>(
    () => ({
      selectedCount: rowSelection.selectedCount,
      applyToSelected,
      deleteSelected: () => {
        if (selectedRowIdSet.size === 0) return;
        const nextItems = items.filter(
          (_, index) => !selectedRowIdSet.has(rowSelectionIds[index])
        );
        onChange(nextItems);
        rowSelection.clearSelection();
        if (nextItems.length > 0) {
          requestAnimationFrame(() => focusQuantityTrigger(0));
        }
      },
      duplicateSelected: () => {
        if (selectedIndexes.length === 0) return;
        const duplicated = selectedIndexes.map(index => ({
          ...items[index],
          id: undefined,
        }));
        onChange([...items, ...duplicated]);
        rowSelection.clearSelection();
        requestAnimationFrame(() => {
          const firstDuplicatedIndex = items.length;
          focusQuantityTrigger(firstDuplicatedIndex);
        });
      },
    }),
    [
      applyToSelected,
      focusQuantityTrigger,
      items,
      onChange,
      rowSelection,
      rowSelectionIds,
      selectedIndexes,
      selectedRowIdSet,
    ]
  );

  const handleUpdateItem = (index: number, updates: Partial<LineItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
    rowSelection.clearSelection();
  };

  const handleClearAll = () => {
    rowSelection.clearSelection();
    onChange([]);
  };

  // WSQA-002: Open batch selection dialog for a line item
  const handleOpenLotSelection = useCallback(
    (index: number) => {
      const item = items[index];
      if (item.productId) {
        setLotSelection({
          isOpen: true,
          itemIndex: index,
          productId: item.productId,
          productName: item.productDisplayName || "Product",
          quantity: item.quantity,
        });
      }
    },
    [items]
  );

  // WSQA-002: Handle batch selection from dialog
  const handleBatchSelect = useCallback(
    (allocations: BatchAllocation[]) => {
      if (!lotSelection || allocations.length === 0) return;

      const { itemIndex } = lotSelection;
      const currentItem = items[itemIndex];

      // If single batch selected, update the existing line item
      if (allocations.length === 1) {
        const allocation = allocations[0];
        const updated = calculateLineItem(
          allocation.batchId,
          allocation.quantity,
          allocation.unitCost,
          currentItem.marginPercent
        );

        const newItems = [...items];
        newItems[itemIndex] = {
          ...currentItem,
          ...updated,
          batchId: allocation.batchId,
          cogsPerUnit: allocation.unitCost,
          originalCogsPerUnit: allocation.unitCost,
          isCogsOverridden: false,
        };
        onChange(newItems);
      } else {
        // Multiple batches: replace current item with multiple line items
        const newLineItems = allocations.map(allocation => {
          const updated = calculateLineItem(
            allocation.batchId,
            allocation.quantity,
            allocation.unitCost,
            currentItem.marginPercent
          );

          return {
            ...currentItem,
            ...updated,
            id: undefined, // New line items don't have IDs yet
            batchId: allocation.batchId,
            cogsPerUnit: allocation.unitCost,
            originalCogsPerUnit: allocation.unitCost,
            isCogsOverridden: false,
          };
        });

        // Replace the item at itemIndex with the new line items
        const newItems = [
          ...items.slice(0, itemIndex),
          ...newLineItems,
          ...items.slice(itemIndex + 1),
        ];
        onChange(newItems);
      }

      setLotSelection(null);
    },
    [items, lotSelection, onChange]
  );

  const handleBulkApplyMargin = useCallback(() => {
    const nextMargin = Number(bulkMarginPercent);
    if (!Number.isFinite(nextMargin) || nextMargin < 0) {
      return;
    }

    bulkActions.applyToSelected(item => {
      const updated = calculateLineItem(
        item.batchId,
        item.quantity,
        item.cogsPerUnit,
        nextMargin
      );
      return {
        ...item,
        ...updated,
        marginPercent: nextMargin,
        isMarginOverridden: true,
        marginSource: "MANUAL",
      };
    });
  }, [bulkActions, bulkMarginPercent]);

  const handleBulkApplyCogs = useCallback(() => {
    const nextCogs = Number(bulkCogsPerUnit);
    if (!Number.isFinite(nextCogs) || nextCogs <= 0) {
      return;
    }

    bulkActions.applyToSelected(item => {
      const updated = calculateLineItem(
        item.batchId,
        item.quantity,
        nextCogs,
        item.marginPercent
      );
      return {
        ...item,
        ...updated,
        cogsPerUnit: nextCogs,
        isCogsOverridden: nextCogs !== item.originalCogsPerUnit,
        cogsOverrideReason:
          nextCogs !== item.originalCogsPerUnit ? "Bulk override" : undefined,
      };
    });
  }, [bulkActions, bulkCogsPerUnit]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Line Items</h3>
        <div className="flex gap-2">
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={onAddItem}
            disabled={!clientId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {bulkActions.selectedCount > 0 && (
        <div className="rounded-lg border bg-muted/40 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {bulkActions.selectedCount} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkActions.duplicateSelected()}
            >
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkActions.deleteSelected()}
            >
              Delete
            </Button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Input
                value={bulkMarginPercent}
                onChange={event => setBulkMarginPercent(event.target.value)}
                placeholder="Margin %"
                className="h-8 w-24 text-right"
                inputMode="decimal"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkApplyMargin}
              >
                Apply Margin
              </Button>
              <Input
                value={bulkCogsPerUnit}
                onChange={event => setBulkCogsPerUnit(event.target.value)}
                placeholder="COGS"
                className="h-8 w-24 text-right"
                inputMode="decimal"
              />
              <Button size="sm" variant="outline" onClick={handleBulkApplyCogs}>
                Apply COGS
              </Button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground">
            {clientId
              ? "No items added yet. Click 'Add Item' to get started."
              : "Select a client first to add items."}
          </p>
        </div>
      ) : (
        <div ref={tableRef} className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    aria-label="Select all line items"
                    checked={
                      allRowsSelected
                        ? true
                        : rowSelection.selectedCount > 0
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={() =>
                      rowSelection.toggleAll(rowSelectionIds)
                    }
                  />
                </TableHead>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right w-[100px]">Qty</TableHead>
                <TableHead className="text-right w-[120px]">
                  COGS/Unit
                </TableHead>
                <TableHead className="text-right w-[120px]">Margin</TableHead>
                <TableHead className="text-right w-[120px]">
                  Price/Unit
                </TableHead>
                <TableHead className="text-right w-[120px]">Total</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const rowSelectionId = rowSelectionIds[index];
                return (
                  <LineItemRow
                    key={
                      item.id ||
                      `lineitem-${item.batchSku || item.productId}-${index}`
                    }
                    item={item}
                    index={index}
                    clientId={clientId}
                    selected={rowSelection.isSelected(rowSelectionId)}
                    onToggleSelected={checked => {
                      if (checked !== rowSelection.isSelected(rowSelectionId)) {
                        rowSelection.toggleRow(rowSelectionId);
                      }
                    }}
                    onUpdate={updates => handleUpdateItem(index, updates)}
                    onRemove={() => handleRemoveItem(index)}
                    onChangeLot={
                      item.productId
                        ? () => handleOpenLotSelection(index)
                        : undefined
                    }
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {items.length} item{items.length !== 1 ? "s" : ""} in order
          </span>
          <span className="font-medium text-foreground">
            Running total: $
            {items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)}
          </span>
        </div>
      )}

      {/* WSQA-002: Batch Selection Dialog for flexible lot selection */}
      {lotSelection && (
        <BatchSelectionDialog
          open={lotSelection.isOpen}
          onClose={() => setLotSelection(null)}
          productId={lotSelection.productId}
          productName={lotSelection.productName}
          quantityNeeded={lotSelection.quantity}
          onSelect={handleBatchSelect}
        />
      )}
    </div>
  );
}
