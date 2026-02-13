import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Lightbulb, DollarSign } from "lucide-react";

interface CogsAdjustmentItem {
  unitCogs?: number;
  unitPrice: number;
  quantity: number;
  cogsMode?: string;
  unitCogsMin?: string;
  unitCogsMax?: string;
}

interface CogsAdjustmentModalProps {
  item: CogsAdjustmentItem;
  clientDetails?: Record<string, unknown>;
  onClose: () => void;
  onSave: (updates: {
    unitCogs: number;
    overrideCogs: number;
    cogsSource: string;
    unitMargin: number;
    marginPercent: number;
    lineCogs: number;
    lineMargin: number;
  }) => void;
}

export function CogsAdjustmentModal({
  item,
  clientDetails: _clientDetails,
  onClose,
  onSave,
}: CogsAdjustmentModalProps) {
  const [customCogs, setCustomCogs] = useState(item.unitCogs || 0);

  // Calculate smart suggestion (midpoint for RANGE mode)
  const smartSuggestion = item.cogsMode === "RANGE" && item.unitCogsMin && item.unitCogsMax
    ? (parseFloat(item.unitCogsMin) + parseFloat(item.unitCogsMax)) / 2
    : item.unitCogs || 0;

  // Calculate margin with new COGS
  const newMargin = item.unitPrice - customCogs;
  const newMarginPercent = item.unitPrice > 0 ? (newMargin / item.unitPrice) * 100 : 0;

  // Get margin color
  const getMarginColor = (percent: number) => {
    if (percent >= 70) return "text-green-600";
    if (percent >= 50) return "text-green-500";
    if (percent >= 30) return "text-yellow-600";
    if (percent >= 15) return "text-orange-600";
    return "text-red-600";
  };

  const handleSave = () => {
    onSave({
      unitCogs: customCogs,
      overrideCogs: customCogs,
      cogsSource: "MANUAL",
      unitMargin: newMargin,
      marginPercent: newMarginPercent,
      lineCogs: item.quantity * customCogs,
      lineMargin: item.quantity * newMargin,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust COGS</DialogTitle>
          <DialogDescription>
            Customize the cost of goods sold for this item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Smart Suggestion */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Smart Suggestion</p>
                <p className="text-xs text-blue-700 mt-1">
                  {item.cogsMode === "RANGE"
                    ? "Using midpoint of COGS range"
                    : "Using fixed COGS from batch"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-lg font-bold text-blue-900">
                    ${smartSuggestion.toFixed(2)}
                  </span>
                  {customCogs !== smartSuggestion && (
                    <Button
                      onClick={() => setCustomCogs(smartSuggestion)}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      Use This
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Current Values */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Unit Price</p>
              <p className="font-semibold">${item.unitPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current COGS</p>
              <p className="font-semibold">${(item.unitCogs || 0).toFixed(2)}</p>
            </div>
          </div>

          <Separator />

          {/* COGS Input */}
          <div className="space-y-2">
            <Label htmlFor="custom-cogs">Custom COGS</Label>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Input
                id="custom-cogs"
                type="number"
                min="0"
                step="0.01"
                value={customCogs}
                onChange={(e) => setCustomCogs(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Visual Slider (for RANGE mode) */}
          {item.cogsMode === "RANGE" && item.unitCogsMin && item.unitCogsMax && (
            <div className="space-y-2">
              <Label>Adjust within range</Label>
              <Slider
                value={[customCogs]}
                onValueChange={([value]) => setCustomCogs(value)}
                min={parseFloat(item.unitCogsMin)}
                max={parseFloat(item.unitCogsMax)}
                step={0.01}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min: ${item.unitCogsMin}</span>
                <span>Max: ${item.unitCogsMax}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Real-time Margin Update */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">New Margin</span>
              <Badge variant="secondary" className="text-base">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className={getMarginColor(newMarginPercent)}>
                  {newMarginPercent.toFixed(1)}%
                </span>
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Unit Margin</p>
                <p className="font-semibold text-green-600">${newMargin.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Line Margin</p>
                <p className="font-semibold text-green-600">
                  ${(item.quantity * newMargin).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

