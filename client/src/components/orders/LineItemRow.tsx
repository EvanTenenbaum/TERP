import React, { useState, memo } from "react";
import { Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { COGSInput } from "./COGSInput";
import { MarginInput } from "./MarginInput";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// import { useMarginLookup } from "@/hooks/orders/useMarginLookup";
import { calculateLineItem } from "@/hooks/orders/useOrderCalculations";

interface LineItem {
  id?: number;
  batchId: number;
  productId?: number; // WSQA-002: Product ID for flexible lot selection
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

interface LineItemRowProps {
  item: LineItem;
  index: number;
  clientId: number | null;
  onUpdate: (updates: Partial<LineItem>) => void;
  onRemove: () => void;
  onChangeLot?: () => void; // WSQA-002: Callback for lot selection
}

export const LineItemRow = memo(function LineItemRow({
  item,
  index,
  clientId: _clientId,
  onUpdate,
  onRemove,
  onChangeLot, // WSQA-002: Flexible lot selection
}: LineItemRowProps) {
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [qtyInput, setQtyInput] = useState(item.quantity.toString());

  // Format currency
  const fmt = (value: number) => `$${value.toFixed(2)}`;

  // FEAT-003: Handle quantity change with validation
  const handleQuantityChange = (newQty: number) => {
    // Validate: quantity must be greater than 0
    if (newQty > 0) {
      const updated = calculateLineItem(
        item.batchId,
        newQty,
        item.cogsPerUnit,
        item.marginPercent
      );
      onUpdate(updated);
    }
  };

  const handleQuantityBlur = () => {
    const qty = parseFloat(qtyInput);
    if (!isNaN(qty) && qty > 0) {
      handleQuantityChange(qty);
    } else {
      // Reset to original value if invalid
      setQtyInput(item.quantity.toString());
    }
    setIsEditingQty(false);
  };

  // FEAT-003: Handle keyboard navigation for quick entry
  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleQuantityBlur();
      // Focus next editable quantity field for quick entry
      const currentRow = (e.target as HTMLElement).closest('tr');
      const nextRow = currentRow?.nextElementSibling;
      if (nextRow) {
        // Click the next row's quantity cell to enable editing
        const nextQtyCell = nextRow.querySelector('td:nth-child(3) > div') as HTMLElement;
        nextQtyCell?.click();
      }
    } else if (e.key === "Escape") {
      setQtyInput(item.quantity.toString());
      setIsEditingQty(false);
    }
  };

  // Handle COGS change
  const handleCOGSChange = (newCOGS: number, isOverridden: boolean, reason?: string) => {
    const updated = calculateLineItem(
      item.batchId,
      item.quantity,
      newCOGS,
      item.marginPercent
    );
    onUpdate({
      ...updated,
      cogsPerUnit: newCOGS,
      isCogsOverridden: isOverridden,
      cogsOverrideReason: reason,
    });
  };

  // Handle margin change
  const handleMarginChange = (newMarginPercent: number, isOverridden: boolean) => {
    const updated = calculateLineItem(
      item.batchId,
      item.quantity,
      item.cogsPerUnit,
      newMarginPercent
    );
    onUpdate({
      ...updated,
      marginPercent: newMarginPercent,
      isMarginOverridden: isOverridden,
    });
  };

  // Warning badges
  const hasLowMargin = item.marginPercent < 5;
  const hasNegativeMargin = item.marginPercent < 0;

  return (
    <TableRow>
      {/* Index */}
      <TableCell className="font-medium text-muted-foreground">
        {index + 1}
      </TableCell>

      {/* FEAT-006: Product Name Primary, SKU/Batch Secondary */}
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">
            {item.productDisplayName || "Unknown Product"}
          </span>
          <span className="text-xs text-muted-foreground">
            ID: {item.batchId}
          </span>
          {item.isSample && (
            <Badge variant="secondary" className="w-fit mt-1">Sample</Badge>
          )}
        </div>
      </TableCell>

      {/* Quantity - FEAT-003: Enhanced with validation and keyboard navigation */}
      <TableCell className="text-right">
        {isEditingQty ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={handleQuantityBlur}
              onKeyDown={handleQuantityKeyDown}
              className="w-20 h-8 text-right"
              autoFocus
            />
          </div>
        ) : (
          <div
            className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
            onClick={() => setIsEditingQty(true)}
            title="Click to edit quantity"
          >
            {item.quantity}
          </div>
        )}
      </TableCell>

      {/* COGS/Unit */}
      <TableCell className="text-right">
        <COGSInput
          value={item.cogsPerUnit}
          originalValue={item.originalCogsPerUnit}
          isOverridden={item.isCogsOverridden}
          reason={item.cogsOverrideReason}
          onChange={handleCOGSChange}
        />
      </TableCell>

      {/* Margin */}
      <TableCell className="text-right">
        <MarginInput
          marginPercent={item.marginPercent}
          marginDollar={item.marginDollar}
          source={item.marginSource}
          isOverridden={item.isMarginOverridden}
          onChange={handleMarginChange}
        />
      </TableCell>

      {/* Price/Unit */}
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <span className="font-medium">{fmt(item.unitPrice)}</span>
          {(hasLowMargin || hasNegativeMargin) && (
            <Badge variant={hasNegativeMargin ? "destructive" : "secondary"} className="text-xs mt-1">
              {hasNegativeMargin ? "Loss" : "Low margin"}
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Total */}
      <TableCell className="text-right font-semibold">
        {fmt(item.lineTotal)}
      </TableCell>

      {/* Actions - WSQA-002: Added lot selection button */}
      <TableCell>
        <div className="flex items-center gap-1">
          {/* WSQA-002: Change Lot button - only show if productId available */}
          {item.productId && onChangeLot && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onChangeLot}
                    className="h-8 w-8 p-0"
                  >
                    <Package className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Change lot/batch</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});