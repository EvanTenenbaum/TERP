import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export type EffectiveCogsBasis = "LOW" | "MID" | "HIGH" | "MANUAL";

interface COGSInputProps {
  value: number;
  originalValue: number;
  isOverridden: boolean;
  reason?: string;
  cogsMode?: "FIXED" | "RANGE" | null;
  rangeMin?: number | null;
  rangeMax?: number | null;
  effectiveBasis?: EffectiveCogsBasis;
  isBelowVendorRange?: boolean;
  onChange: (next: {
    newValue: number;
    isOverridden: boolean;
    reason?: string;
    effectiveBasis: EffectiveCogsBasis;
    isBelowVendorRange: boolean;
  }) => void;
}

const RANGE_BASIS_OPTIONS: Array<{
  basis: Exclude<EffectiveCogsBasis, "MANUAL">;
  label: string;
}> = [
  { basis: "LOW", label: "Low" },
  { basis: "MID", label: "Mid" },
  { basis: "HIGH", label: "High" },
];

function currency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function resolveRangeValue(
  basis: Exclude<EffectiveCogsBasis, "MANUAL">,
  rangeMin: number,
  rangeMax: number
): number {
  if (basis === "LOW") return rangeMin;
  if (basis === "HIGH") return rangeMax;
  return (rangeMin + rangeMax) / 2;
}

export function COGSInput({
  value,
  originalValue,
  isOverridden,
  reason,
  cogsMode,
  rangeMin,
  rangeMax,
  effectiveBasis = "MANUAL",
  isBelowVendorRange = false,
  onChange,
}: COGSInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const [reasonInput, setReasonInput] = useState(reason || "");
  const [selectedBasis, setSelectedBasis] =
    useState<EffectiveCogsBasis>(effectiveBasis);

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  useEffect(() => {
    setReasonInput(reason || "");
  }, [reason]);

  useEffect(() => {
    setSelectedBasis(effectiveBasis);
  }, [effectiveBasis]);

  const supportsRange =
    cogsMode === "RANGE" &&
    typeof rangeMin === "number" &&
    typeof rangeMax === "number";

  const parsedInput = Number.parseFloat(inputValue);
  const normalizedInput = Number.isFinite(parsedInput) ? parsedInput : 0;
  const belowRange = supportsRange ? normalizedInput < (rangeMin ?? 0) : false;

  const summaryLabel = useMemo(() => {
    if (!supportsRange) {
      return isOverridden ? "Override" : "Fixed";
    }
    if (selectedBasis === "MANUAL") {
      return belowRange ? "Manual below range" : "Manual";
    }
    return selectedBasis;
  }, [belowRange, isOverridden, selectedBasis, supportsRange]);

  const handleSave = () => {
    if (!Number.isFinite(parsedInput) || parsedInput <= 0) {
      return;
    }

    const isNowOverridden = selectedBasis === "MANUAL";

    onChange({
      newValue: normalizedInput,
      isOverridden: isNowOverridden,
      reason:
        isNowOverridden || belowRange ? reasonInput.trim() || undefined : undefined,
      effectiveBasis: selectedBasis,
      isBelowVendorRange: belowRange,
    });
    setIsEditing(false);
  };

  const handleReset = () => {
    setInputValue(originalValue.toString());
    setReasonInput("");
    const resetBasis =
      effectiveBasis === "MANUAL"
        ? supportsRange
          ? "MID"
          : "MANUAL"
        : effectiveBasis;
    setSelectedBasis(resetBasis);
    onChange({
      newValue: originalValue,
      isOverridden: false,
      reason: undefined,
      effectiveBasis: resetBasis,
      isBelowVendorRange: false,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value.toString());
    setReasonInput(reason || "");
    setSelectedBasis(effectiveBasis);
    setIsEditing(false);
  };

  const applyBasis = (basis: Exclude<EffectiveCogsBasis, "MANUAL">) => {
    if (!supportsRange || rangeMin === null || rangeMax === null) {
      return;
    }
    setSelectedBasis(basis);
    setInputValue(resolveRangeValue(basis, rangeMin, rangeMax).toFixed(2));
    setReasonInput("");
  };

  return (
    <Popover open={isEditing} onOpenChange={setIsEditing}>
      <PopoverTrigger asChild>
        <div className="flex items-center justify-end gap-2 cursor-pointer hover:bg-muted px-2 py-1 rounded">
          <span className={isOverridden ? "font-semibold text-[var(--warning)]" : ""}>
            {currency(value)}
          </span>
          <Badge variant="outline" className="text-xs">
            {summaryLabel}
          </Badge>
          {isBelowVendorRange && (
            <Badge variant="destructive" className="text-xs">
              Below vendor
            </Badge>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[24rem]" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Edit COGS</h4>
            <p className="text-sm text-muted-foreground">
              Default: {currency(originalValue)}
            </p>
            {supportsRange && (
              <p className="text-sm text-muted-foreground">
                Vendor range: {currency(rangeMin ?? 0)} to{" "}
                {currency(rangeMax ?? 0)}
              </p>
            )}
          </div>

          {supportsRange && (
            <div className="space-y-2">
              <Label>Range Basis</Label>
              <div className="flex gap-2">
                {RANGE_BASIS_OPTIONS.map(option => (
                  <Button
                    key={option.basis}
                    type="button"
                    size="sm"
                    variant={
                      selectedBasis === option.basis ? "default" : "outline"
                    }
                    onClick={() => applyBasis(option.basis)}
                  >
                    {option.label}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={selectedBasis === "MANUAL" ? "default" : "outline"}
                  onClick={() => setSelectedBasis("MANUAL")}
                >
                  Manual
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cogs-input">COGS per Unit</Label>
            <Input
              id="cogs-input"
              type="number"
              step="0.01"
              value={inputValue}
              onChange={e => {
                setSelectedBasis("MANUAL");
                setInputValue(e.target.value);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
          </div>

          {belowRange && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <div>
                  This sale is below the vendor range. Save as a draft to check
                  with the farmer, or continue and the exception will be flagged
                  on the vendor record.
                </div>
              </div>
            </div>
          )}

          {(selectedBasis === "MANUAL" || belowRange) && (
            <div className="space-y-2">
              <Label htmlFor="reason-input">
                Reason {belowRange ? "(required)" : "(recommended)"}
              </Label>
              <Textarea
                id="reason-input"
                value={reasonInput}
                onChange={e => setReasonInput(e.target.value)}
                placeholder="e.g., farmer-approved discount for aging inventory"
                rows={2}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={
                !Number.isFinite(parsedInput) ||
                parsedInput <= 0 ||
                (belowRange && reasonInput.trim().length === 0)
              }
              className="flex-1"
            >
              Save
            </Button>
            {(isOverridden || effectiveBasis !== "MANUAL") && (
              <Button size="sm" variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
          </div>

          {reason && (
            <div className="text-sm p-2 bg-muted rounded">
              <p className="font-medium">Latest reason</p>
              <p className="text-muted-foreground">{reason}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
