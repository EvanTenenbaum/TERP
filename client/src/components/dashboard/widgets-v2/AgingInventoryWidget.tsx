/**
 * Aging Inventory Widget
 * Sprint 4 Track A: 4.A.4 MEET-025 - Dashboard Aging Quick View
 *
 * Features:
 * - Uses getAgingSummary API endpoint
 * - Aging breakdown pie/donut chart
 * - Quick stats cards: fresh/moderate/aging/critical counts
 * - Top 5 oldest items list
 * - Click to navigate to filtered inventory view
 */

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  Leaf,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const COLORS = {
  FRESH: "#22c55e", // green-500
  MODERATE: "#eab308", // yellow-500
  AGING: "#f97316", // orange-500
  CRITICAL: "#ef4444", // red-500
};

const BRACKET_CONFIG = {
  fresh: {
    label: "Fresh (0-7d)",
    icon: Leaf,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  moderate: {
    label: "Moderate (8-14d)",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  aging: {
    label: "Aging (15-30d)",
    icon: AlertTriangle,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  critical: {
    label: "Critical (30+d)",
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

export const AgingInventoryWidget = memo(function AgingInventoryWidget() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = trpc.inventory.getAgingSummary.useQuery(
    undefined,
    { refetchInterval: 60000 } // Refresh every minute
  );

  // Prepare pie chart data
  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Fresh", value: data.summary.fresh.count, fill: COLORS.FRESH },
      { name: "Moderate", value: data.summary.moderate.count, fill: COLORS.MODERATE },
      { name: "Aging", value: data.summary.aging.count, fill: COLORS.AGING },
      { name: "Critical", value: data.summary.critical.count, fill: COLORS.CRITICAL },
    ].filter(item => item.value > 0);
  }, [data]);

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const navigateToFilteredInventory = (ageBracket: string) => {
    setLocation(`/inventory?ageBracket=${ageBracket.toUpperCase()}`);
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Inventory Aging
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="generic"
            size="sm"
            title="Failed to load aging data"
            description={error.message || "An error occurred"}
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Inventory Aging
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <Skeleton className="h-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Inventory Aging
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="inventory"
            size="sm"
            title="No inventory data"
            description="Add products to see aging analysis"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Inventory Aging
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(BRACKET_CONFIG) as [keyof typeof BRACKET_CONFIG, typeof BRACKET_CONFIG.fresh][]).map(
            ([key, config]) => {
              const summaryData = data.summary[key];
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => navigateToFilteredInventory(key)}
                  className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor} text-left hover:opacity-80 transition-opacity group`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className={`text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className={`text-xl font-bold ${config.color} mt-1`}>
                    {summaryData.count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summaryData.totalUnits.toFixed(0)} units
                  </p>
                </button>
              );
            }
          )}
        </div>

        {/* Aging Value Summary */}
        {data.agingItemsCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">
                  Items Over 2 Weeks Old
                </p>
                <p className="text-xs text-orange-600">
                  {data.agingItemsCount} batches - {formatCurrency(data.agingItemsValue)} value at risk
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/inventory?minAge=14")}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                View All
              </Button>
            </div>
          </div>
        )}

        {/* Pie Chart */}
        {chartData.length > 0 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} batches`, ""]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top 5 Oldest Items */}
        {data.topAgingItems && data.topAgingItems.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Top 5 Oldest Items
            </h4>
            <div className="space-y-2">
              {data.topAgingItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setLocation(`/inventory/${item.id}`)}
                  className="w-full flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors group"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium truncate max-w-[180px]">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        item.ageDays > 30
                          ? "bg-red-100 text-red-700 border-red-200"
                          : item.ageDays > 14
                            ? "bg-orange-100 text-orange-700 border-orange-200"
                            : "bg-yellow-100 text-yellow-700 border-yellow-200"
                      }
                    >
                      {item.ageDays}d
                    </Badge>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
