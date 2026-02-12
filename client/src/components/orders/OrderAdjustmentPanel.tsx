/**
 * OrderAdjustmentPanel Component
 * Order-level discount/markup with % / $ toggle
 * v2.0 Sales Order Enhancements
 */

import React, { useState } from "react";
import { Percent, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
// import { Badge } from "@/components/ui/badge";

export interface OrderAdjustment {
  amount: number;
  type: "PERCENT" | "DOLLAR";
  mode: "DISCOUNT" | "MARKUP";
}

interface OrderAdjustmentPanelProps {
  value: OrderAdjustment | null;
  subtotal: number;
  onChange: (adjustment: OrderAdjustment | null) => void;
  showOnDocument: boolean;
  onShowOnDocumentChange: (show: boolean) => void;
}

export function OrderAdjustmentPanel({
  value,
  subtotal,
  onChange,
  showOnDocument,
  onShowOnDocumentChange,
}: OrderAdjustmentPanelProps) {
  const [isEnabled, setIsEnabled] = useState(!!value);
  const [amount, setAmount] = useState(value?.amount.toString() || "0");
  const [type, setType] = useState<"PERCENT" | "DOLLAR">(
    value?.type || "PERCENT"
  );
  const [mode, setMode] = useState<"DISCOUNT" | "MARKUP">(
    value?.mode || "DISCOUNT"
  );

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      onChange(null);
    } else {
      const amt = parseFloat(amount) || 0;
      onChange({ amount: amt, type, mode });
    }
  };

  const handleUpdate = (overrides?: Partial<OrderAdjustment>) => {
    const currentMode = overrides?.mode ?? mode;
    const currentType = overrides?.type ?? type;
    const amt = parseFloat(amount) || 0;
    if (amt > 0) {
      onChange({ amount: amt, type: currentType, mode: currentMode });
    } else {
      onChange(null);
      setIsEnabled(false);
    }
  };

  const calculateAdjustmentAmount = () => {
    const amt = parseFloat(amount) || 0;
    if (type === "PERCENT") {
      return (subtotal * amt) / 100;
    }
    return amt;
  };

  const adjustmentAmount = calculateAdjustmentAmount();
  const isDiscount = mode === "DISCOUNT";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Order-Level Adjustment</CardTitle>
          <Switch checked={isEnabled} onCheckedChange={handleToggle} />
        </div>
      </CardHeader>
      {isEnabled && (
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={value => {
                if (value) {
                  const newMode = value as "DISCOUNT" | "MARKUP";
                  setMode(newMode);
                  handleUpdate({ mode: newMode });
                }
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="DISCOUNT" aria-label="Discount">
                <TrendingDown className="h-4 w-4 mr-2" />
                Discount
              </ToggleGroupItem>
              <ToggleGroupItem value="MARKUP" aria-label="Markup">
                <TrendingUp className="h-4 w-4 mr-2" />
                Markup
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Amount Type Toggle */}
          <div className="space-y-2">
            <Label>Amount Type</Label>
            <ToggleGroup
              type="single"
              value={type}
              onValueChange={value => {
                if (value) {
                  const newType = value as "PERCENT" | "DOLLAR";
                  setType(newType);
                  handleUpdate({ type: newType });
                }
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="PERCENT" aria-label="Percent">
                <Percent className="h-4 w-4 mr-2" />
                Percent
              </ToggleGroupItem>
              <ToggleGroupItem value="DOLLAR" aria-label="Dollar">
                <DollarSign className="h-4 w-4 mr-2" />
                Dollar
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="adjustment-amount">
              {mode === "DISCOUNT" ? "Discount" : "Markup"} Amount
            </Label>
            <Input
              id="adjustment-amount"
              type="number"
              step={type === "PERCENT" ? "0.1" : "0.01"}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onBlur={() => handleUpdate()}
              placeholder="0"
            />
          </div>

          {/* FEAT-004: Enhanced Calculated Amount with percentage equivalent */}
          {parseFloat(amount) > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {isDiscount ? "Total Discount:" : "Total Markup:"}
                </span>
                <span
                  className={`text-lg font-semibold ${isDiscount ? "text-red-600" : "text-green-600"}`}
                >
                  {isDiscount ? "-" : "+"}${adjustmentAmount.toFixed(2)}
                </span>
              </div>
              {type === "PERCENT" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {amount}% of ${subtotal.toFixed(2)} subtotal
                </p>
              )}
              {/* FEAT-004: Show percentage equivalent for dollar amounts */}
              {type === "DOLLAR" && subtotal > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Equivalent to{" "}
                  {((parseFloat(amount) / subtotal) * 100).toFixed(2)}% of $
                  {subtotal.toFixed(2)} subtotal
                </p>
              )}
            </div>
          )}

          {/* Show on Document Toggle */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <Label htmlFor="show-on-doc" className="cursor-pointer">
                Show on client document
              </Label>
              <p className="text-xs text-muted-foreground">
                Display {mode.toLowerCase()} on invoice/quote
              </p>
            </div>
            <Switch
              id="show-on-doc"
              checked={showOnDocument}
              onCheckedChange={onShowOnDocumentChange}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
