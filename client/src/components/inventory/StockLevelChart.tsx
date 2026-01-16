import { useMemo } from "react";
import { Card } from "@/components/ui/card";

interface StockLevelData {
  name: string;
  units: number;
  value: number;
}

interface StockLevelChartProps {
  title: string;
  data: StockLevelData[];
  maxItems?: number;
}

export function StockLevelChart({ title, data, maxItems = 5 }: StockLevelChartProps) {
  // Get top N items by value
  const topItems = useMemo(() => {
    return data.slice(0, maxItems);
  }, [data, maxItems]);

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    return Math.max(...topItems.map(item => item.value), 1);
  }, [topItems]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format units
  const formatUnits = (units: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(units);
  };

  if (topItems.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-sm text-muted-foreground">No data available</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-4">
        {topItems.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;

          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate flex-1">{item.name}</span>
                <span className="text-muted-foreground ml-2 whitespace-nowrap">
                  {formatUnits(item.units)} units
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold whitespace-nowrap min-w-[80px] text-right">
                  {formatCurrency(item.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {data.length > maxItems && (
        <p className="text-xs text-muted-foreground mt-4">
          Showing top {maxItems} of {data.length} items
        </p>
      )}
    </Card>
  );
}

