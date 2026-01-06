import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calculator, TrendingUp, DollarSign, Percent } from "lucide-react";

interface PriceSimulationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: {
    id: number;
    sku: string;
    unitCogs: string | null;
    onHandQty: string;
  } | null;
  currentAvgPrice?: number;
}

export function PriceSimulationModal({
  open,
  onOpenChange,
  batch,
  currentAvgPrice = 0,
}: PriceSimulationModalProps) {
  const [simulatedPrice, setSimulatedPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");

  useEffect(() => {
    if (batch && open) {
      setQuantity(batch.onHandQty || "0");
      setSimulatedPrice(currentAvgPrice > 0 ? currentAvgPrice.toFixed(2) : "");
    }
  }, [batch, open, currentAvgPrice]);

  if (!batch) return null;

  const unitCost = parseFloat(batch.unitCogs || "0");
  const qty = parseFloat(quantity || "0");
  const newPrice = parseFloat(simulatedPrice || "0");

  // Current metrics
  const currentRevenue = currentAvgPrice * qty;
  const currentCost = unitCost * qty;
  const currentProfit = currentRevenue - currentCost;
  const currentMargin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;

  // Simulated metrics
  const simRevenue = newPrice * qty;
  const simCost = unitCost * qty;
  const simProfit = simRevenue - simCost;
  const simMargin = simRevenue > 0 ? (simProfit / simRevenue) * 100 : 0;

  // Deltas
  const revenueDelta = simRevenue - currentRevenue;
  const profitDelta = simProfit - currentProfit;
  const marginDelta = simMargin - currentMargin;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDelta = (value: number, isCurrency: boolean = true) => {
    const formatted = isCurrency ? formatCurrency(Math.abs(value)) : formatPercent(Math.abs(value));
    const sign = value >= 0 ? '+' : '-';
    const color = value >= 0 ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{sign}{formatted}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Price Simulation - {batch.sku}
          </DialogTitle>
          <DialogDescription>
            Test different pricing scenarios and see the impact on revenue and margins
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="simPrice">Simulated Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="simPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={simulatedPrice}
                  onChange={(e) => setSimulatedPrice(e.target.value)}
                  className="pl-9"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Comparison Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* Current Metrics */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Current Pricing</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Price per Unit</div>
                  <div className="text-lg font-semibold">{formatCurrency(currentAvgPrice)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Revenue</div>
                  <div className="text-lg font-semibold text-green-600">{formatCurrency(currentRevenue)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
                  <div className="text-lg font-semibold">{formatCurrency(currentCost)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Gross Profit</div>
                  <div className="text-lg font-semibold text-blue-600">{formatCurrency(currentProfit)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Margin</div>
                  <div className="text-lg font-semibold">{formatPercent(currentMargin)}</div>
                </div>
              </div>
            </Card>

            {/* Simulated Metrics */}
            <Card className="p-4 border-2 border-primary">
              <h3 className="font-semibold mb-3 text-sm text-primary">Simulated Pricing</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Price per Unit</div>
                  <div className="text-lg font-semibold">{formatCurrency(newPrice)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Revenue</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(simRevenue)}
                    <span className="text-sm ml-2">{formatDelta(revenueDelta)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
                  <div className="text-lg font-semibold">{formatCurrency(simCost)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Gross Profit</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(simProfit)}
                    <span className="text-sm ml-2">{formatDelta(profitDelta)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Margin</div>
                  <div className="text-lg font-semibold">
                    {formatPercent(simMargin)}
                    <span className="text-sm ml-2">{formatDelta(marginDelta, false)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Impact Summary */}
          <Card className="p-4 bg-muted/50">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Impact Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Revenue Change</div>
                <div className="text-xl font-bold">{formatDelta(revenueDelta)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Profit Change</div>
                <div className="text-xl font-bold">{formatDelta(profitDelta)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Margin Change</div>
                <div className="text-xl font-bold">{formatDelta(marginDelta, false)}</div>
              </div>
            </div>
          </Card>

          {/* Breakeven Analysis */}
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Breakeven Analysis
            </h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit Cost:</span>
                <span className="font-semibold">{formatCurrency(unitCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Breakeven Price:</span>
                <span className="font-semibold">{formatCurrency(unitCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Markup over Cost:</span>
                <span className="font-semibold">
                  {unitCost > 0 ? formatPercent(((newPrice - unitCost) / unitCost) * 100) : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

