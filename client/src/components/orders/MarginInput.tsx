/**
 * MarginInput Component
 * Margin input with % / $ toggle and source indicator
 * v2.0 Sales Order Enhancements
 */

import React, { useState } from "react";
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
  source: "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";
  isOverridden: boolean;
  onChange: (newMarginPercent: number, isOverridden: boolean) => void;
}

export function MarginInput({
  marginPercent,
  marginDollar,
  source,
  isOverridden: _isOverridden,
  onChange,
}: MarginInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputMode, setInputMode] = useState<"percent" | "dollar">("percent");
  const [inputValue, setInputValue] = useState(marginPercent.toString());

  const getSourceBadge = () => {
    switch (source) {
      case "CUSTOMER_PROFILE":
        return <Badge variant="default" className="text-xs">Profile</Badge>;
      case "DEFAULT":
        return <Badge variant="secondary" className="text-xs">Default</Badge>;
      case "MANUAL":
        return <Badge variant="outline" className="text-xs">Manual</Badge>;
    }
  };

  const getMarginColor = (percent: number) => {
    if (percent < 0) return "text-red-600";
    if (percent < 5) return "text-orange-600";
    if (percent < 15) return "text-yellow-600";
    if (percent < 30) return "text-green-600";
    return "text-green-700";
  };

  const handleSave = () => {
    const value = parseFloat(inputValue);
    if (!isNaN(value)) {
      // If in dollar mode, we'd need COGS to calculate percent
      // For now, we only support percent input
      onChange(value, true);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setInputValue(marginPercent.toString());
    setIsEditing(false);
  };

  return (
    <Popover open={isEditing} onOpenChange={setIsEditing}>
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
          <div>
            <h4 className="font-semibold mb-2">Edit Margin</h4>
            <p className="text-sm text-muted-foreground">
              Source: {source.replace("_", " ").toLowerCase()}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Input Mode</Label>
            <ToggleGroup
              type="single"
              value={inputMode}
              onValueChange={(value) => {
                if (value) setInputMode(value as "percent" | "dollar");
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="percent" aria-label="Percent">
                <Percent className="h-4 w-4 mr-2" />
                Percent
              </ToggleGroupItem>
              <ToggleGroupItem value="dollar" aria-label="Dollar" disabled>
                <DollarSign className="h-4 w-4 mr-2" />
                Dollar
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="margin-input">
              Margin {inputMode === "percent" ? "(%)" : "($)"}
            </Label>
            <Input
              id="margin-input"
              type="number"
              step={inputMode === "percent" ? "0.1" : "0.01"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
            <p className="text-xs text-muted-foreground">
              Negative values create a loss (discount)
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              className="flex-1"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
            >
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

