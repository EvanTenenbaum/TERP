/**
 * COGSInput Component
 * COGS input with override capability and reason tracking
 * v2.0 Sales Order Enhancements
 */

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
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

interface COGSInputProps {
  value: number;
  originalValue: number;
  isOverridden: boolean;
  reason?: string;
  onChange: (newValue: number, isOverridden: boolean, reason?: string) => void;
}

export function COGSInput({
  value,
  originalValue,
  isOverridden,
  reason,
  onChange,
}: COGSInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const [reasonInput, setReasonInput] = useState(reason || "");

  const fmt = (val: number) => `$${val.toFixed(2)}`;

  const handleSave = () => {
    const newValue = parseFloat(inputValue);
    if (!isNaN(newValue) && newValue > 0) {
      const isNowOverridden = newValue !== originalValue;
      onChange(newValue, isNowOverridden, isNowOverridden ? reasonInput : undefined);
      setIsEditing(false);
    }
  };

  const handleReset = () => {
    setInputValue(originalValue.toString());
    setReasonInput("");
    onChange(originalValue, false, undefined);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value.toString());
    setReasonInput(reason || "");
    setIsEditing(false);
  };

  return (
    <Popover open={isEditing} onOpenChange={setIsEditing}>
      <PopoverTrigger asChild>
        <div className="flex items-center justify-end gap-2 cursor-pointer hover:bg-muted px-2 py-1 rounded">
          <span className={isOverridden ? "font-semibold text-orange-600" : ""}>
            {fmt(value)}
          </span>
          {isOverridden && (
            <Badge variant="outline" className="text-xs">
              Override
            </Badge>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Edit COGS</h4>
            <p className="text-sm text-muted-foreground">
              Original: {fmt(originalValue)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cogs-input">COGS per Unit</Label>
            <Input
              id="cogs-input"
              type="number"
              step="0.01"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
          </div>

          {parseFloat(inputValue) !== originalValue && (
            <div className="space-y-2">
              <Label htmlFor="reason-input">
                Reason for Override <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason-input"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="e.g., Price negotiation, bulk discount..."
                rows={2}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={
                parseFloat(inputValue) !== originalValue && !reasonInput.trim()
              }
              className="flex-1"
            >
              Save
            </Button>
            {isOverridden && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>

          {isOverridden && reason && (
            <div className="text-sm p-2 bg-muted rounded">
              <p className="font-medium">Override Reason:</p>
              <p className="text-muted-foreground">{reason}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

