import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { trpc } from "@/lib/trpc";
import { TrendingUp, DollarSign, Percent, Package } from "lucide-react";

export const ProfitabilityWidget = memo(function ProfitabilityWidget() {
  const { data: summary, isLoading } =
    trpc.inventory.profitability.summary.useQuery();
  const { data: topBatches } = trpc.inventory.profitability.top.useQuery(5);

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Profitability Analysis
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Profitability Analysis
        </h3>
        <EmptyState
          variant="analytics"
          size="sm"
          title="No profitability data"
          description="Profitability analysis will appear once sales are recorded"
        />
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-green-600" />
        Profitability Analysis
      </h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>Total Revenue</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalRevenue)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Gross Profit</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(summary.grossProfit)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Percent className="h-4 w-4" />
            <span>Avg Margin</span>
          </div>
          <div className="text-2xl font-bold">
            {formatPercent(summary.avgMargin)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>Units Sold</span>
          </div>
          <div className="text-2xl font-bold">
            {summary.totalUnits.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Top Profitable Batches */}
      {topBatches?.items && topBatches.items.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Top Profitable Batches</h4>
          <div className="space-y-2">
            {topBatches.items.map((batch, index) => (
              <div
                key={batch.batchId}
                className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <span className="font-mono">{batch.sku}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-600 font-semibold">
                    {formatCurrency(batch.grossProfit)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatPercent(batch.marginPercent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});
