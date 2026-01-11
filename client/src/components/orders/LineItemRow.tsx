import React, { useState, memo } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { COGSInput } from "./COGSInput";
import { MarginInput } from "./MarginInput";
// import { useMarginLookup } from "@/hooks/orders/useMarginLookup";
import { calculateLineItem } from "@/hooks/orders/useOrderCalculations";

interface LineItem {
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

interface LineItemRowProps {
  item: LineItem;
  index: number;
  clientId: number | null;
  onUpdate: (updates: Partial<LineItem>) => void;
  onRemove: () => void;
}

export const LineItemRow = memo(function LineItemRow({
  item,
  index,
  clientId: _clientId,
  onUpdate,
  onRemove,
}: LineItemRowProps) {
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [qtyInput, setQtyInput] = useState(item.quantity.toString());

  // Format currency
  const fmt = (value: number) => `$${value.toFixed(2)}`;

  // Handle quantity change
  const handleQuantityChange = (newQty: number) => {
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
      setQtyInput(item.quantity.toString());
    }
    setIsEditingQty(false);
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

      {/* Quantity */}
      <TableCell className="text-right">
        {isEditingQty ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={handleQuantityBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuantityBlur();
                if (e.key === "Escape") {
                  setQtyInput(item.quantity.toString());
                  setIsEditingQty(false);
                }
              }}
              className="w-20 h-8 text-right"
              autoFocus
            />
          </div>
        ) : (
          <div
            className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
            onClick={() => setIsEditingQty(true)}
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

      {/* Actions */}
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});