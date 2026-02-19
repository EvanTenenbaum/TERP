import { useState, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2, Settings, Edit2, Info } from "lucide-react";

interface OrderItem {
  batchId: number;
  displayName: string;
  originalName: string;
  quantity: number;
  unitPrice: number;
  unitCogs?: number;
  cogsSource?: string;
  isSample: boolean;
  cogsMode?: string;
  unitCogsMin?: string;
  unitCogsMax?: string;
  lineTotal?: number;
  overridePrice?: number;
}

interface OrderItemCardProps {
  item: OrderItem;
  onRemove: () => void;
  onUpdate: (updates: Partial<OrderItem>) => void;
  onAdjustCogs: () => void;
}

export const OrderItemCard = memo(function OrderItemCard({
  item,
  onRemove,
  onUpdate,
  onAdjustCogs,
}: OrderItemCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(item.displayName);
  const [showCogsDetails, setShowCogsDetails] = useState(false);

  // Calculate line totals
  const lineTotal = item.quantity * item.unitPrice;
  const lineCogs = item.quantity * (item.unitCogs || 0);
  const lineMargin = lineTotal - lineCogs;
  const marginPercent = lineTotal > 0 ? (lineMargin / lineTotal) * 100 : 0;

  // Get margin color
  const getMarginColor = (percent: number) => {
    if (percent >= 70) return "bg-green-100 text-green-700 border-green-300";
    if (percent >= 50) return "bg-green-50 text-green-600 border-green-200";
    if (percent >= 30) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (percent >= 15) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  const handleSaveName = () => {
    onUpdate({ displayName: editedName });
    setIsEditingName(false);
  };

  return (
    <Card className="p-3 space-y-2 hover:shadow-md transition-shadow">
      {/* Header: Name + Margin Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={e => setEditedName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setEditedName(item.displayName);
                    setIsEditingName(false);
                  }
                }}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-sm font-medium hover:text-primary transition-colors text-left group flex items-center gap-1"
            >
              <span className="truncate">{item.displayName}</span>
              <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </button>
          )}
          {item.displayName !== item.originalName && (
            <p className="text-xs text-muted-foreground truncate">
              Original: {item.originalName}
            </p>
          )}
        </div>

        {/* Level 1: Just show margin badge (default) */}
        <Popover open={showCogsDetails} onOpenChange={setShowCogsDetails}>
          <PopoverTrigger asChild>
            <button
              className={`px-2 py-1 rounded-md border text-xs font-semibold transition-all ${getMarginColor(
                marginPercent
              )}`}
            >
              {marginPercent.toFixed(0)}%
            </button>
          </PopoverTrigger>
          {/* Level 2: Show COGS details on hover/click */}
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unit Price</span>
                <span className="font-medium">
                  ${item.unitPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unit COGS</span>
                <span className="font-medium">
                  ${(item.unitCogs || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unit Margin</span>
                <span className="font-medium text-green-600">
                  ${(item.unitPrice - (item.unitCogs || 0)).toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Info className="h-3 w-3" />
                  <span>COGS Source: {item.cogsSource || "Calculated"}</span>
                </div>
                {/* Level 3: Power user action */}
                <Button
                  onClick={() => {
                    setShowCogsDetails(false);
                    onAdjustCogs();
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Adjust COGS
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Quantity and Price Controls */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Quantity</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={item.quantity}
            onChange={e =>
              onUpdate({
                quantity: parseFloat(e.target.value) || 0,
                lineTotal: parseFloat(e.target.value) * item.unitPrice,
              })
            }
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Unit Price</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unitPrice}
            onChange={e =>
              onUpdate({
                unitPrice: parseFloat(e.target.value) || 0,
                lineTotal: item.quantity * parseFloat(e.target.value),
                overridePrice: parseFloat(e.target.value),
              })
            }
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Sample Toggle and Line Total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id={`sample-${item.batchId}`}
            checked={item.isSample}
            onCheckedChange={checked => onUpdate({ isSample: checked })}
          />
          <Label
            htmlFor={`sample-${item.batchId}`}
            className="text-xs cursor-pointer"
          >
            Sample
          </Label>
          {item.isSample && (
            <Badge variant="secondary" className="text-xs">
              Sample
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">${lineTotal.toFixed(2)}</span>
          <Button
            onClick={onRemove}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
});
