/**
 * MarginInput Component
 * Margin input with % / $ toggle and source indicator
 * v2.0 Sales Order Enhancements
 */

import React, { useCallback, useEffect, useState } from "react";
import { Percent, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface MarginInputProps {
  marginPercent: number;
  marginDollar: number;
  cogsPerUnit: number;
  source: "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";
  isOverridden: boolean;
  onChange: (
    newMarginPercent: number,
    isOverridden: boolean,
    unitPrice: number
  ) => void;
}

export function MarginInput({
  marginPercent,
  marginDollar,
  cogsPerUnit,
  source,
  isOverridden: _isOverridden,
  onChange,
}: MarginInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputMode, setInputMode] = useState<"percent" | "dollar">("dollar");
  const formatInputValue = useCallback(
    (mode: "percent" | "dollar"): string =>
      mode === "dollar" ? marginDollar.toFixed(2) : marginPercent.toFixed(1),
    [marginDollar, marginPercent]
  );
  const [inputValue, setInputValue] = useState(
    formatInputValue("dollar")
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (isEditing) {
      return;
    }
    setInputValue(formatInputValue(inputMode));
  }, [formatInputValue, inputMode, isEditing]);

  const roundToTwoDecimals = (value: number): number =>
    Math.round(value * 100) / 100;

  const marginPercentFromDollar = (value: number): number => {
    const retailPrice = cogsPerUnit + value;
    if (retailPrice <= 0) {
      return 0;
    }
    return roundToTwoDecimals((value / retailPrice) * 100);
  };

  const marginDollarFromPercent = (value: number): number => {
    if (cogsPerUnit <= 0) {
      return 0;
    }

    if (value >= 100) {
      return 0;
    }

    const retailPrice = cogsPerUnit / (1 - value / 100);
    return roundToTwoDecimals(retailPrice - cogsPerUnit);
  };

  const unitPriceFromDollar = (value: number): number =>
    roundToTwoDecimals(cogsPerUnit + value);

  const unitPriceFromPercent = (value: number): number => {
    if (cogsPerUnit <= 0 || value >= 100) {
      return roundToTwoDecimals(cogsPerUnit);
    }

    return roundToTwoDecimals(cogsPerUnit / (1 - value / 100));
  };

  const sourceLabel =
    source === "CUSTOMER_PROFILE"
      ? "Profile-priced"
      : source === "DEFAULT"
        ? "Fallback priced"
        : "Manual";

  const sourceDescription =
    source === "CUSTOMER_PROFILE"
      ? "This row is currently priced from the relationship profile. The value shown here is the resulting gross margin for this row's exact cost and price. The profile rule result is shown separately on the row, and the two numbers can differ because markup and gross margin use different formulas."
      : source === "DEFAULT"
        ? "No relationship pricing rule matched, so this row is following fallback pricing context from category or shared defaults."
        : "This row is using a manual gross-margin override.";

  const getSourceBadge = () => {
    switch (source) {
      case "CUSTOMER_PROFILE":
        return (
          <Badge variant="default" className="text-xs">
            Profile-priced
          </Badge>
        );
      case "DEFAULT":
        return (
          <Badge variant="secondary" className="text-xs">
            Fallback priced
          </Badge>
        );
      case "MANUAL":
        return (
          <Badge variant="outline" className="text-xs">
            Manual
          </Badge>
        );
    }
  };

  const getMarginColor = (percent: number) => {
    if (percent < 0) return "text-red-600";
    if (percent < 5) return "text-orange-600";
    if (percent < 15) return "text-yellow-600";
    if (percent < 30) return "text-green-600";
    return "text-green-700";
  };

  const validateInput = (): string | null => {
    const trimmed = inputValue.trim();
    const fieldLabel =
      inputMode === "percent" ? "Gross Margin (%)" : "Gross Margin ($)";
    if (!trimmed) {
      return `Field: ${fieldLabel}. Rule: value is required. Fix: enter a numeric value before saving.`;
    }

    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed)) {
      return `Field: ${fieldLabel}. Rule: must be numeric. Fix: enter only digits (for example ${inputMode === "percent" ? "12.5" : "12.50"}).`;
    }

    if (inputMode === "percent" && parsed < -100) {
      return "Field: Gross Margin (%). Rule: cannot be less than -100%. Fix: use a value between -100 and your target margin.";
    }

    if (inputMode === "percent" && parsed >= 100) {
      return "Field: Gross Margin (%). Rule: must stay below 100%. Fix: use a value below 100 or switch to dollar mode.";
    }

    if (inputMode === "dollar" && cogsPerUnit <= 0 && parsed !== 0) {
      return "Field: Gross Margin ($). Rule: dollar mode requires a positive COGS baseline. Fix: update COGS first or set margin to 0.";
    }

    return null;
  };

  const handleSave = () => {
    const errorMessage = validateInput();
    if (errorMessage) {
      setValidationMessage(errorMessage);
      return;
    }

    const value = parseFloat(inputValue);
    const marginPercentValue =
      inputMode === "dollar" ? marginPercentFromDollar(value) : value;
    const unitPriceValue =
      inputMode === "dollar"
        ? unitPriceFromDollar(value)
        : unitPriceFromPercent(value);
    onChange(marginPercentValue, true, unitPriceValue);
    setValidationMessage(null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(formatInputValue(inputMode));
    setValidationMessage(null);
    setIsEditing(false);
  };

  return (
    <Popover
      open={isEditing}
      onOpenChange={open => {
        setIsEditing(open);
        if (!open) {
          setValidationMessage(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <div className="flex flex-col items-end gap-1 cursor-pointer hover:bg-muted px-2 py-1 rounded">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${getMarginColor(marginPercent)}`}>
              {marginPercent.toFixed(1)}%
            </span>
            {getSourceBadge()}
          </div>
          <span className="text-xs text-muted-foreground">
            ${marginDollar.toFixed(2)}
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {validationMessage && (
            <div
              className="rounded-md border border-destructive/40 bg-destructive/10 p-2"
              role="alert"
            >
              <p className="text-sm font-medium text-destructive">
                Cannot save margin
              </p>
              <p className="text-xs text-destructive">{validationMessage}</p>
            </div>
          )}

          <div>
            <h4 className="font-semibold mb-2">Edit Gross Margin</h4>
            <p className="text-sm text-muted-foreground">
              Source: {sourceLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {sourceDescription}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Input Mode</Label>
            <ToggleGroup
              type="single"
              value={inputMode}
              onValueChange={value => {
                if (!value) return;
                const nextMode = value as "percent" | "dollar";
                const numericValue = parseFloat(inputValue);
                if (nextMode !== inputMode && Number.isFinite(numericValue)) {
                  const currentFormattedValue = formatInputValue(inputMode);
                  if (inputValue === currentFormattedValue) {
                    setInputValue(formatInputValue(nextMode));
                  } else if (nextMode === "dollar") {
                    const dollarValue = marginDollarFromPercent(numericValue);
                    setInputValue(dollarValue.toFixed(2));
                  } else {
                    const percentValue = marginPercentFromDollar(numericValue);
                    setInputValue(percentValue.toFixed(1));
                  }
                }
                setInputMode(nextMode);
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="percent" aria-label="Percent">
                <Percent className="h-4 w-4 mr-2" />
                Percent
              </ToggleGroupItem>
              <ToggleGroupItem value="dollar" aria-label="Dollar">
                <DollarSign className="h-4 w-4 mr-2" />
                Dollar
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="margin-input">
              Gross Margin {inputMode === "percent" ? "(%)" : "($)"}
            </Label>
            <Input
              id="margin-input"
              type="number"
              step={inputMode === "percent" ? "0.1" : "0.01"}
              value={inputValue}
              onChange={e => {
                setInputValue(e.target.value);
                if (validationMessage) {
                  setValidationMessage(null);
                }
              }}
              onKeyDown={e => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
            {validationMessage && (
              <p className="text-xs text-destructive">{validationMessage}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Negative values create a loss (discount)
            </p>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
          </div>

          {parseFloat(inputValue) < 0 && (
            <div className="text-sm p-2 bg-destructive/10 border border-destructive/20 rounded flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Negative Margin</p>
                <p className="text-muted-foreground">
                  This will result in a loss on this item
                </p>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
