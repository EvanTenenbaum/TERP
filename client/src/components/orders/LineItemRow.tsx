import React, { useState, memo } from "react";
import { Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { COGSInput } from "./COGSInput";
import type { EffectiveCogsBasis } from "./COGSInput";
import { MarginInput } from "./MarginInput";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// import { useMarginLookup } from "@/hooks/orders/useMarginLookup";
import { calculateLineItemFromRetailPrice } from "@/hooks/orders/useOrderCalculations";
import { parsePositiveInteger } from "@/lib/quantity";

interface AppliedPricingRule {
  ruleId: number;
  ruleName: string;
  adjustment: string;
}

interface LineItem {
  id?: number;
  batchId: number;
  productId?: number; // WSQA-002: Product ID for flexible lot selection
  productDisplayName?: string;
  quantity: number;
  cogsPerUnit: number;
  originalCogsPerUnit: number;
  cogsMode?: "FIXED" | "RANGE";
  unitCogsMin?: number | null;
  unitCogsMax?: number | null;
  effectiveCogsBasis?: EffectiveCogsBasis;
  originalRangeMin?: number | null;
  originalRangeMax?: number | null;
  isBelowVendorRange?: boolean;
  belowRangeReason?: string;
  isCogsOverridden: boolean;
  cogsOverrideReason?: string;
  marginPercent: number;
  marginDollar: number;
  isMarginOverridden: boolean;
  marginSource: "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";
  profilePriceAdjustmentPercent?: number | null;
  appliedRules?: AppliedPricingRule[];
  unitPrice: number;
  lineTotal: number;
  isSample: boolean;
}

interface LineItemRowProps {
  item: LineItem;
  index: number;
  clientId: number | null;
  selected?: boolean;
  showCogs?: boolean;
  showMargin?: boolean;
  onToggleSelected?: (selected: boolean) => void;
  onUpdate: (updates: Partial<LineItem>) => void;
  onRemove: () => void;
  onChangeLot?: () => void; // WSQA-002: Callback for lot selection
}

export const LineItemRow = memo(function LineItemRow({
  item,
  index,
  clientId: _clientId,
  selected = false,
  showCogs = true,
  showMargin = true,
  onToggleSelected,
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
    const normalizedQty = parsePositiveInteger(newQty);
    if (normalizedQty === null) {
      return;
    }

    onUpdate({
      ...item,
      ...calculateLineItemFromRetailPrice(
        item.batchId,
        normalizedQty,
        item.cogsPerUnit,
        item.unitPrice
      ),
    });
  };

  const handleQuantityBlur = () => {
    const qty = parsePositiveInteger(qtyInput);
    if (qty !== null) {
      handleQuantityChange(qty);
    } else {
      // Reset to original value if invalid
      setQtyInput(item.quantity.toString());
    }
    setIsEditingQty(false);
  };

  // FEAT-003: Handle keyboard navigation for quick entry
  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const focusQuantityInSiblingRow = (
      sibling: Element | null | undefined
    ): void => {
      if (!sibling) return;
      const trigger = sibling.querySelector(
        "[data-line-item-quantity-trigger]"
      );
      if (trigger instanceof HTMLElement) {
        trigger.focus();
      }
    };

    if (e.key === "Enter") {
      e.preventDefault();
      handleQuantityBlur();
      // Focus next editable quantity field for quick entry
      const currentRow = (e.target as HTMLElement).closest("tr");
      const nextRow = currentRow?.nextElementSibling;
      focusQuantityInSiblingRow(nextRow);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const currentRow = (e.target as HTMLElement).closest("tr");
      focusQuantityInSiblingRow(currentRow?.nextElementSibling);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const currentRow = (e.target as HTMLElement).closest("tr");
      focusQuantityInSiblingRow(currentRow?.previousElementSibling);
    } else if (e.key === "Escape") {
      setQtyInput(item.quantity.toString());
      setIsEditingQty(false);
    }
  };

  // Handle COGS change
  const handleCOGSChange = (next: {
    newValue: number;
    isOverridden: boolean;
    reason?: string;
    effectiveBasis: EffectiveCogsBasis;
    isBelowVendorRange: boolean;
  }) => {
    const updated = calculateLineItemFromRetailPrice(
      item.batchId,
      item.quantity,
      next.newValue,
      item.unitPrice
    );
    onUpdate({
      ...item,
      ...updated,
      cogsPerUnit: next.newValue,
      isCogsOverridden: next.isOverridden,
      cogsOverrideReason: next.reason,
      effectiveCogsBasis: next.effectiveBasis,
      isBelowVendorRange: next.isBelowVendorRange,
      belowRangeReason: next.reason,
    });
  };

  // Handle margin change
  const handleMarginChange = (
    newMarginPercent: number,
    isOverridden: boolean,
    unitPrice: number
  ) => {
    const updated = calculateLineItemFromRetailPrice(
      item.batchId,
      item.quantity,
      item.cogsPerUnit,
      unitPrice
    );
    onUpdate({
      ...item,
      ...updated,
      marginPercent: newMarginPercent,
      isMarginOverridden: isOverridden,
      marginSource: isOverridden
        ? "MANUAL"
        : item.marginSource === "MANUAL"
          ? "CUSTOMER_PROFILE"
          : item.marginSource,
    });
  };

  // Warning badges
  const hasLowMargin = showMargin && item.marginPercent < 5;
  const hasNegativeMargin = showMargin && item.marginPercent < 0;
  const showProfileAdjustment =
    item.marginSource === "CUSTOMER_PROFILE" &&
    !item.isMarginOverridden &&
    !item.isCogsOverridden &&
    item.effectiveCogsBasis !== "MANUAL" &&
    item.originalCogsPerUnit > 0;
  const profileAdjustmentPercent = showProfileAdjustment
    ? (item.profilePriceAdjustmentPercent ??
      ((item.unitPrice - item.originalCogsPerUnit) / item.originalCogsPerUnit) *
        100)
    : null;
  const pricingSourceLabel =
    item.marginSource === "CUSTOMER_PROFILE"
      ? "Price from profile rule"
      : item.marginSource === "DEFAULT"
        ? "Price from shared default"
        : "Price manually overridden";
  const cogsSourceLabel =
    item.isCogsOverridden || item.effectiveCogsBasis === "MANUAL"
      ? item.isCogsOverridden
        ? "Manual cost entry"
        : "Weighted lot allocation cost"
      : item.effectiveCogsBasis
        ? `Using ${item.effectiveCogsBasis.toLowerCase()} supplier range`
        : "Using saved supplier cost";
  const appliedRuleSummary =
    item.appliedRules && item.appliedRules.length > 0
      ? item.appliedRules.length === 1
        ? `${item.appliedRules[0].ruleName} (${item.appliedRules[0].adjustment})`
        : `${item.appliedRules[0].ruleName} (${item.appliedRules[0].adjustment}) +${item.appliedRules.length - 1} more`
      : null;
  const appliedRuleTitle =
    item.appliedRules && item.appliedRules.length > 0
      ? item.appliedRules
          .map(rule => `${rule.ruleName} (${rule.adjustment})`)
          .join(", ")
      : undefined;

  return (
    <TableRow
      data-line-item-row-index={index}
      className={selected ? "bg-muted/50" : undefined}
    >
      {/* Selection */}
      <TableCell className="w-[36px] py-2">
        <Checkbox
          checked={selected}
          onCheckedChange={checked => onToggleSelected?.(checked === true)}
          aria-label={`Select line item ${index + 1}`}
        />
      </TableCell>

      {/* Index */}
      <TableCell className="py-2 font-medium text-muted-foreground text-xs">
        {index + 1}
      </TableCell>

      {/* FEAT-006: Product Name Primary, SKU/Batch Secondary */}
      <TableCell className="py-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm leading-tight">
            {item.productDisplayName || "Unknown Product"}
          </span>
          <span className="text-xs text-muted-foreground">
            ID: {item.batchId}
          </span>
          {item.cogsMode === "RANGE" &&
            typeof item.originalRangeMin === "number" &&
            typeof item.originalRangeMax === "number" && (
              <span className="text-xs text-muted-foreground">
                Vendor range ${item.originalRangeMin.toFixed(2)} to $
                {item.originalRangeMax.toFixed(2)}
              </span>
            )}
          <span className="text-xs text-muted-foreground">
            {pricingSourceLabel}
          </span>
          {profileAdjustmentPercent !== null && (
            <span
              className="text-xs text-muted-foreground"
              title={appliedRuleTitle}
            >
              Profile{" "}
              {item.appliedRules && item.appliedRules.length > 1
                ? "rules net"
                : "rule"}{" "}
              {profileAdjustmentPercent >= 0 ? "+" : ""}
              {profileAdjustmentPercent.toFixed(1)}% markup
            </span>
          )}
          {appliedRuleSummary && (
            <span
              className="text-xs text-muted-foreground"
              title={appliedRuleTitle}
            >
              Applied: {appliedRuleSummary}
            </span>
          )}
          {showCogs ? (
            <span className="text-xs text-muted-foreground">
              {cogsSourceLabel}
            </span>
          ) : null}
          {item.isSample && (
            <Badge variant="secondary" className="w-fit mt-1">
              Sample
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Quantity - FEAT-003: Enhanced with validation and keyboard navigation */}
      <TableCell className="text-right py-2">
        {isEditingQty ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              min="1"
              step="1"
              value={qtyInput}
              onChange={e => setQtyInput(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={handleQuantityBlur}
              onKeyDown={handleQuantityKeyDown}
              onFocus={e => e.target.select()}
              className="w-16 h-7 text-right text-sm"
              autoFocus
            />
          </div>
        ) : (
          <div
            tabIndex={0}
            className="cursor-pointer hover:bg-muted px-2 py-1 rounded text-sm"
            onClick={() => setIsEditingQty(true)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsEditingQty(true);
              }
            }}
            title="Click to edit quantity"
            data-line-item-quantity-trigger
          >
            {item.quantity}
          </div>
        )}
      </TableCell>

      {/* COGS/Unit */}
      {showCogs ? (
        <TableCell className="text-right py-2">
          <COGSInput
            value={item.cogsPerUnit}
            originalValue={item.originalCogsPerUnit}
            isOverridden={item.isCogsOverridden}
            reason={item.belowRangeReason || item.cogsOverrideReason}
            cogsMode={item.cogsMode}
            rangeMin={item.originalRangeMin}
            rangeMax={item.originalRangeMax}
            effectiveBasis={item.effectiveCogsBasis}
            isBelowVendorRange={item.isBelowVendorRange}
            onChange={handleCOGSChange}
          />
        </TableCell>
      ) : null}

      {/* Margin */}
      {showMargin ? (
        <TableCell className="text-right py-2">
          <MarginInput
            marginPercent={item.marginPercent}
            marginDollar={item.marginDollar}
            cogsPerUnit={item.cogsPerUnit}
            source={item.marginSource}
            isOverridden={item.isMarginOverridden}
            onChange={handleMarginChange}
          />
        </TableCell>
      ) : null}

      {/* Price/Unit */}
      <TableCell className="text-right py-2">
        <div className="flex flex-col items-end">
          <span className="font-medium">{fmt(item.unitPrice)}</span>
          {(hasLowMargin || hasNegativeMargin) && (
            <Badge
              variant={hasNegativeMargin ? "destructive" : "secondary"}
              className="text-xs mt-1"
            >
              {hasNegativeMargin ? "Loss" : "Low margin"}
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Total */}
      <TableCell className="text-right py-2 font-semibold">
        {fmt(item.lineTotal)}
      </TableCell>

      {/* Actions - WSQA-002: Added lot selection button */}
      <TableCell className="py-2">
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
