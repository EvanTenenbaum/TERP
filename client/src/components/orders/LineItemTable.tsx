/**
 * LineItemTable Component
 * Editable table for order line items with COGS and margin management
 * v2.0 Sales Order Enhancements
 * WSQA-002: Added flexible lot selection via BatchSelectionDialog
 */

import React, { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LineItemRow } from "./LineItemRow";
import { BatchSelectionDialog, type BatchAllocation } from "./BatchSelectionDialog";
import { calculateLineItem } from "@/hooks/orders/useOrderCalculations";

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

export function LineItemTable({
  items,
  clientId,
  onChange,
  onAddItem,
}: LineItemTableProps) {
  // WSQA-002: Batch selection dialog state
  const [lotSelection, setLotSelection] = useState<LotSelectionState | null>(null);

  const handleUpdateItem = (index: number, updates: Partial<LineItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // WSQA-002: Open batch selection dialog for a line item
  const handleOpenLotSelection = useCallback((index: number) => {
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
  }, [items]);

  // WSQA-002: Handle batch selection from dialog
  const handleBatchSelect = useCallback((allocations: BatchAllocation[]) => {
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
  }, [items, lotSelection, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Line Items</h3>
        <div className="flex gap-2">
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
            >
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

      {items.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground">
            {clientId
              ? "No items added yet. Click 'Add Item' to get started."
              : "Select a client first to add items."}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right w-[100px]">Qty</TableHead>
                <TableHead className="text-right w-[120px]">COGS/Unit</TableHead>
                <TableHead className="text-right w-[120px]">Margin</TableHead>
                <TableHead className="text-right w-[120px]">Price/Unit</TableHead>
                <TableHead className="text-right w-[120px]">Total</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <LineItemRow
                  key={item.id || `lineitem-${item.batchSku || item.productId}-${index}`}
                  item={item}
                  index={index}
                  clientId={clientId}
                  onUpdate={(updates) => handleUpdateItem(index, updates)}
                  onRemove={() => handleRemoveItem(index)}
                  onChangeLot={item.productId ? () => handleOpenLotSelection(index) : undefined}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {items.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""} in order
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

