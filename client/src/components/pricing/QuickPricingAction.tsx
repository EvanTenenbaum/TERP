/**
 * QuickPricingAction Component (MEET-039)
 * Shows current price in quick actions with one-click access to pricing adjustment
 * Used in inventory browsers, product lists, and order line items
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign,
  Edit2,
  History,
  TrendingDown,
  TrendingUp,
  Percent,
  ChevronDown,
  Tag,
} from "lucide-react";
import {
  PriceAdjustmentDialog,
  type PriceAdjustmentParams,
} from "./PriceAdjustmentDialog";

interface QuickPricingActionProps {
  productId: number;
  productName: string;
  batchId?: number;
  currentPrice: number;
  originalPrice?: number;
  marginPercent?: number;
  hasAdjustment?: boolean;
  adjustmentType?: "DISCOUNT" | "MARKUP";
  adjustmentValue?: number;
  maxDiscountPercent: number;
  onPriceChange: (params: PriceAdjustmentParams) => void;
  onViewHistory?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export function QuickPricingAction({
  productId,
  productName,
  batchId,
  currentPrice,
  originalPrice,
  marginPercent,
  hasAdjustment = false,
  adjustmentType,
  adjustmentValue,
  maxDiscountPercent,
  onPriceChange,
  onViewHistory,
  disabled = false,
  compact = false,
}: QuickPricingActionProps) {
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);

  const fmt = (value: number) =>
    `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getMarginColor = (percent: number) => {
    if (percent < 0) return "text-red-600";
    if (percent < 10) return "text-yellow-600";
    if (percent < 20) return "text-green-600";
    return "text-green-700";
  };

  // Quick discount presets
  const quickDiscounts = [5, 10, 15];

  const handleQuickDiscount = (percent: number) => {
    if (percent > maxDiscountPercent) {
      return; // Don't apply if exceeds authority
    }

    onPriceChange({
      adjustmentType: "ITEM",
      targetId: batchId || productId,
      targetName: productName,
      originalPrice: originalPrice || currentPrice,
      adjustmentMode: "PERCENT",
      adjustmentValue: -percent,
      reason: "quick_discount",
    });
  };

  // Compact inline button
  if (compact) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 font-mono"
                onClick={() => setShowAdjustDialog(true)}
                disabled={disabled}
              >
                <span
                  className={hasAdjustment ? "line-through text-muted-foreground mr-1" : ""}
                >
                  {hasAdjustment ? fmt(originalPrice || currentPrice) : ""}
                </span>
                <span
                  className={
                    hasAdjustment
                      ? adjustmentType === "DISCOUNT"
                        ? "text-red-600"
                        : "text-green-600"
                      : ""
                  }
                >
                  {fmt(currentPrice)}
                </span>
                <Edit2 className="h-3 w-3 ml-1 opacity-50" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to adjust price</p>
              {marginPercent !== undefined && (
                <p className={`text-xs ${getMarginColor(marginPercent)}`}>
                  Margin: {marginPercent.toFixed(1)}%
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <PriceAdjustmentDialog
          open={showAdjustDialog}
          onOpenChange={setShowAdjustDialog}
          adjustmentType="ITEM"
          targetId={batchId || productId}
          targetName={productName}
          originalPrice={originalPrice || currentPrice}
          maxDiscountPercent={maxDiscountPercent}
          onApply={onPriceChange}
        />
      </>
    );
  }

  // Full dropdown with quick actions
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={disabled}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            <span className="font-mono">
              {hasAdjustment && (
                <span className="line-through text-muted-foreground text-xs mr-1">
                  {fmt(originalPrice || currentPrice)}
                </span>
              )}
              <span
                className={
                  hasAdjustment
                    ? adjustmentType === "DISCOUNT"
                      ? "text-red-600"
                      : "text-green-600"
                    : ""
                }
              >
                {fmt(currentPrice)}
              </span>
            </span>
            {hasAdjustment && adjustmentValue && (
              <Badge
                variant={adjustmentType === "DISCOUNT" ? "destructive" : "default"}
                className="ml-1 text-xs px-1"
              >
                {adjustmentType === "DISCOUNT" ? "-" : "+"}
                {Math.abs(adjustmentValue)}%
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* Current Price Info */}
          <div className="px-2 py-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Price</span>
              <span className="font-mono font-medium">{fmt(currentPrice)}</span>
            </div>
            {marginPercent !== undefined && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-muted-foreground text-xs">Margin</span>
                <Badge
                  variant="secondary"
                  className={`text-xs ${getMarginColor(marginPercent)}`}
                >
                  {marginPercent.toFixed(1)}%
                </Badge>
              </div>
            )}
          </div>

          <DropdownMenuSeparator />

          {/* Quick Discount Presets */}
          <div className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground mb-2">Quick Discount</p>
            <div className="flex gap-1">
              {quickDiscounts.map(percent => (
                <Button
                  key={percent}
                  variant={percent <= maxDiscountPercent ? "outline" : "ghost"}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  disabled={percent > maxDiscountPercent}
                  onClick={() => handleQuickDiscount(percent)}
                >
                  <Percent className="h-3 w-3 mr-0.5" />
                  {percent}
                </Button>
              ))}
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Custom Adjustment */}
          <DropdownMenuItem onClick={() => setShowAdjustDialog(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Custom Adjustment...
          </DropdownMenuItem>

          {/* View History */}
          {onViewHistory && (
            <DropdownMenuItem onClick={onViewHistory}>
              <History className="h-4 w-4 mr-2" />
              View Price History
            </DropdownMenuItem>
          )}

          {/* Clear Adjustment */}
          {hasAdjustment && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  onPriceChange({
                    adjustmentType: "ITEM",
                    targetId: batchId || productId,
                    targetName: productName,
                    originalPrice: originalPrice || currentPrice,
                    adjustmentMode: "FIXED",
                    adjustmentValue: 0,
                    reason: "reset",
                  })
                }
              >
                <Tag className="h-4 w-4 mr-2" />
                Reset to Original Price
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <PriceAdjustmentDialog
        open={showAdjustDialog}
        onOpenChange={setShowAdjustDialog}
        adjustmentType="ITEM"
        targetId={batchId || productId}
        targetName={productName}
        originalPrice={originalPrice || currentPrice}
        maxDiscountPercent={maxDiscountPercent}
        onApply={onPriceChange}
      />
    </>
  );
}

/**
 * QuickPricingBadge - Simple inline price display with adjustment indicator
 * For use in tables and lists where space is limited
 */
export function QuickPricingBadge({
  currentPrice,
  originalPrice,
  hasAdjustment = false,
  adjustmentType,
  onClick,
}: {
  currentPrice: number;
  originalPrice?: number;
  hasAdjustment?: boolean;
  adjustmentType?: "DISCOUNT" | "MARKUP";
  onClick?: () => void;
}) {
  const fmt = (value: number) =>
    `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (!hasAdjustment) {
    return (
      <Badge
        variant="outline"
        className="font-mono cursor-pointer hover:bg-muted"
        onClick={onClick}
      >
        {fmt(currentPrice)}
      </Badge>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1 cursor-pointer"
      onClick={onClick}
    >
      {originalPrice && (
        <span className="text-xs line-through text-muted-foreground font-mono">
          {fmt(originalPrice)}
        </span>
      )}
      <Badge
        variant={adjustmentType === "DISCOUNT" ? "destructive" : "default"}
        className="font-mono"
      >
        {adjustmentType === "DISCOUNT" ? (
          <TrendingDown className="h-3 w-3 mr-1" />
        ) : (
          <TrendingUp className="h-3 w-3 mr-1" />
        )}
        {fmt(currentPrice)}
      </Badge>
    </div>
  );
}
