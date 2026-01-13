/**
 * PriceAdjustmentDialog Component (MEET-026, MEET-038)
 * Real-time price negotiation with instant UI updates
 * Includes notes field for audit trail
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  DollarSign,
  Percent,
  AlertTriangle,
  Tag,
} from "lucide-react";

export interface PriceAdjustmentParams {
  adjustmentType: "ITEM" | "CATEGORY" | "ORDER";
  targetId?: number;
  targetCategory?: string;
  targetName?: string;
  originalPrice: number;
  adjustmentMode: "PERCENT" | "FIXED";
  adjustmentValue: number;
  reason?: string;
  notes?: string;
}

interface PriceAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustmentType: "ITEM" | "CATEGORY" | "ORDER";
  targetId?: number;
  targetCategory?: string;
  targetName?: string;
  originalPrice: number;
  currentQuantity?: number;
  maxDiscountPercent: number;
  onApply: (params: PriceAdjustmentParams) => void;
}

export function PriceAdjustmentDialog({
  open,
  onOpenChange,
  adjustmentType,
  targetId,
  targetCategory,
  targetName,
  originalPrice,
  currentQuantity = 1,
  maxDiscountPercent,
  onApply,
}: PriceAdjustmentDialogProps) {
  const [mode, setMode] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState<string>("");
  const [isDiscount, setIsDiscount] = useState(true);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setValue("");
      setReason("");
      setNotes("");
      setError(null);
      setMode("PERCENT");
      setIsDiscount(true);
    }
  }, [open]);

  // Calculate new price in real-time
  const calculatedPrice = React.useMemo(() => {
    const numValue = parseFloat(value) || 0;
    const signedValue = isDiscount ? -numValue : numValue;

    if (mode === "PERCENT") {
      return originalPrice * (1 + signedValue / 100);
    } else {
      return originalPrice + signedValue;
    }
  }, [originalPrice, value, mode, isDiscount]);

  const priceChange = calculatedPrice - originalPrice;
  const percentChange = originalPrice > 0 ? (priceChange / originalPrice) * 100 : 0;
  const lineTotal = calculatedPrice * currentQuantity;
  const lineTotalChange = priceChange * currentQuantity;

  // Validate discount limit
  const exceedsLimit =
    isDiscount &&
    mode === "PERCENT" &&
    parseFloat(value) > maxDiscountPercent;

  const handleSubmit = () => {
    const numValue = parseFloat(value) || 0;

    if (numValue <= 0) {
      setError("Please enter a valid adjustment value");
      return;
    }

    if (exceedsLimit) {
      setError(
        `Discount exceeds your authority (max ${maxDiscountPercent}%)`
      );
      return;
    }

    if (calculatedPrice < 0.01) {
      setError("Price cannot be less than $0.01");
      return;
    }

    const signedValue = isDiscount ? -numValue : numValue;

    onApply({
      adjustmentType,
      targetId,
      targetCategory,
      targetName,
      originalPrice,
      adjustmentMode: mode,
      adjustmentValue: signedValue,
      reason,
      notes: notes || undefined,
    });

    onOpenChange(false);
  };

  const fmt = (value: number) =>
    `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Price Adjustment
          </DialogTitle>
          <DialogDescription>
            {adjustmentType === "ITEM" && (
              <>
                Adjust price for <strong>{targetName || `Item #${targetId}`}</strong>
              </>
            )}
            {adjustmentType === "CATEGORY" && (
              <>
                Adjust prices for category <strong>{targetCategory}</strong>
              </>
            )}
            {adjustmentType === "ORDER" && <>Adjust entire order total</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Price Preview - Real-time Update */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Original Price
              </span>
              <span className="font-medium">{fmt(originalPrice)}</span>
            </div>
            <div className="flex items-center justify-center text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">New Price</span>
              <span
                className={`text-xl font-bold ${
                  priceChange < 0
                    ? "text-red-600"
                    : priceChange > 0
                      ? "text-green-600"
                      : ""
                }`}
              >
                {fmt(calculatedPrice)}
              </span>
            </div>
            {priceChange !== 0 && (
              <div className="flex justify-end">
                <Badge
                  variant={priceChange < 0 ? "destructive" : "default"}
                  className="text-xs"
                >
                  {priceChange < 0 ? "" : "+"}
                  {fmt(priceChange)} ({percentChange.toFixed(1)}%)
                </Badge>
              </div>
            )}
            {currentQuantity > 1 && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Line Total ({currentQuantity} units)
                  </span>
                  <span className="font-medium">{fmt(lineTotal)}</span>
                </div>
                {lineTotalChange !== 0 && (
                  <div className="flex justify-end">
                    <Badge
                      variant={lineTotalChange < 0 ? "destructive" : "default"}
                      className="text-xs"
                    >
                      {lineTotalChange < 0 ? "" : "+"}
                      {fmt(lineTotalChange)}
                    </Badge>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Adjustment Type */}
          <div className="flex gap-2">
            <Button
              variant={isDiscount ? "default" : "outline"}
              size="sm"
              onClick={() => setIsDiscount(true)}
              className="flex-1"
            >
              Discount
            </Button>
            <Button
              variant={!isDiscount ? "default" : "outline"}
              size="sm"
              onClick={() => setIsDiscount(false)}
              className="flex-1"
            >
              Markup
            </Button>
          </div>

          {/* Adjustment Mode & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select
                value={mode}
                onValueChange={v => setMode(v as "PERCENT" | "FIXED")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Percentage
                    </div>
                  </SelectItem>
                  <SelectItem value="FIXED">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Fixed Amount
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={value}
                  onChange={e => {
                    setValue(e.target.value);
                    setError(null);
                  }}
                  placeholder={mode === "PERCENT" ? "10" : "5.00"}
                  className={`pr-8 ${exceedsLimit ? "border-red-500" : ""}`}
                  step={mode === "PERCENT" ? "1" : "0.01"}
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {mode === "PERCENT" ? "%" : "$"}
                </span>
              </div>
            </div>
          </div>

          {/* Discount Limit Warning */}
          {exceedsLimit && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your maximum discount authority is{" "}
                <strong>{maxDiscountPercent}%</strong>. This adjustment requires
                manager approval.
              </AlertDescription>
            </Alert>
          )}

          {/* Reason (Optional) */}
          <div className="space-y-2">
            <Label>
              Reason{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bulk_order">Bulk Order Discount</SelectItem>
                <SelectItem value="repeat_customer">
                  Repeat Customer Discount
                </SelectItem>
                <SelectItem value="price_match">
                  Price Match Competition
                </SelectItem>
                <SelectItem value="damaged_product">
                  Damaged/Imperfect Product
                </SelectItem>
                <SelectItem value="promotional">Promotional Offer</SelectItem>
                <SelectItem value="negotiation">
                  Customer Negotiation
                </SelectItem>
                <SelectItem value="clearance">Clearance Pricing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes (MEET-038) */}
          <div className="space-y-2">
            <Label>
              Notes{" "}
              <span className="text-muted-foreground text-xs">
                (for audit trail)
              </span>
            </Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any additional context or details about this adjustment..."
              rows={2}
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!value || exceedsLimit}
          >
            Apply Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
