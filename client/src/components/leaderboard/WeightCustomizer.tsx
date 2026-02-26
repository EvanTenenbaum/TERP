/**
 * Weight Customizer Component
 * Allows users to customize metric weights for leaderboard scoring
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RotateCcw, Save, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface WeightCustomizerProps {
  clientType: "ALL" | "CUSTOMER" | "SUPPLIER" | "DUAL";
  onClose: () => void;
  onSave?: () => void;
}

const METRIC_LABELS: Record<string, { label: string; description: string }> = {
  ytd_revenue: {
    label: "YTD Revenue",
    description: "Year-to-date revenue contribution",
  },
  lifetime_value: {
    label: "All Time Value",
    description: "Total historical value",
  },
  average_order_value: {
    label: "Avg Order Value",
    description: "Average order size",
  },
  profit_margin: {
    label: "Profit Margin",
    description: "Profitability percentage",
  },
  order_frequency: {
    label: "Order Frequency",
    description: "Orders per period",
  },
  recency: { label: "Recency", description: "Days since last order" },
  on_time_payment_rate: {
    label: "On-Time Payment",
    description: "Payment reliability",
  },
  average_days_to_pay: {
    label: "Days to Pay",
    description: "Average payment speed",
  },
  credit_utilization: {
    label: "Credit Utilization",
    description: "Credit line usage",
  },
  yoy_growth: {
    label: "YoY Growth",
    description: "Year-over-year growth rate",
  },
};

export function WeightCustomizer({
  clientType,
  onClose,
  onSave,
}: WeightCustomizerProps) {
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: weightData, isLoading } = trpc.leaderboard.weights.get.useQuery(
    {
      clientType,
    }
  );

  const saveMutation = trpc.leaderboard.weights.save.useMutation({
    onSuccess: () => {
      setHasChanges(false);
      onSave?.();
    },
  });

  const resetMutation = trpc.leaderboard.weights.reset.useMutation({
    onSuccess: () => {
      setHasChanges(false);
      onSave?.();
    },
  });

  useEffect(() => {
    if (weightData?.weights) {
      setWeights(weightData.weights);
    }
  }, [weightData]);

  const handleWeightChange = (metric: string, value: number) => {
    setWeights(prev => ({ ...prev, [metric]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate({ clientType, weights });
  };

  const handleReset = () => {
    resetMutation.mutate({ clientType });
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const isValidTotal = Math.abs(totalWeight - 100) <= 1;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Customize Weights</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardTitle>
        <CardDescription>
          Adjust how different metrics contribute to the master score. Weights
          must sum to 100%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isValidTotal && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Weights must sum to 100%. Current total: {totalWeight.toFixed(0)}%
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {Object.entries(weights).map(([metric, value]) => {
            const config = METRIC_LABELS[metric];
            if (!config) return null;

            return (
              <div key={metric} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={metric} className="text-sm font-medium">
                    {config.label}
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {value.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id={metric}
                  min={0}
                  max={50}
                  step={1}
                  value={[value]}
                  onValueChange={([newValue]) =>
                    handleWeightChange(metric, newValue)
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {config.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm">
            Total:{" "}
            <span className={isValidTotal ? "text-green-600" : "text-red-600"}>
              {totalWeight.toFixed(0)}%
            </span>
            {weightData?.isCustom && (
              <span className="ml-2 text-muted-foreground">(customized)</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={resetMutation.isPending || !weightData?.isCustom}
            >
              {resetMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reset to Defaults
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending || !isValidTotal || !hasChanges}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Weights
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
