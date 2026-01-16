/**
 * LineItemTable Component
 * Editable table for order line items with COGS and margin management
 * v2.0 Sales Order Enhancements
 */

import React from "react";
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

export interface LineItem {
  id?: number;
  batchId: number;
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

export function LineItemTable({
  items,
  clientId,
  onChange,
  onAddItem,
}: LineItemTableProps) {
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
    </div>
  );
}

