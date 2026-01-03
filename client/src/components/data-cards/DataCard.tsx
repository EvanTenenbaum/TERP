/**
 * DataCard Component
 * Individual clickable card displaying a single metric
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MetricConfig, MetricResult } from "@/lib/data-cards/types";
import { formatValue, formatTrend } from "@/lib/data-cards/formatters";
import { trackCardClick } from "@/lib/data-cards/analytics";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { memo, type HTMLAttributes, type KeyboardEvent } from "react";

interface DataCardProps extends HTMLAttributes<HTMLDivElement> {
  metric: MetricConfig;
  data: MetricResult;
  onClick?: () => void;
  isLoading?: boolean;
}

export const DataCard = memo(function DataCard({
  metric,
  data,
  onClick,
  isLoading,
  ...rest
}: DataCardProps) {
  const Icon = metric.icon;
  const formattedValue = formatValue(data.value, metric.format);

  const handleClick = () => {
    if (onClick && !isLoading) {
      // Track card click for analytics
      const destination = metric.destination?.path || "#";
      trackCardClick(
        metric.id.split("_")[0], // Extract module ID from metric ID
        metric.id,
        destination
      );
      onClick();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onClick && !isLoading) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        onClick &&
          !isLoading &&
          "cursor-pointer hover:shadow-lg hover:scale-[1.02]",
        onClick &&
          !isLoading &&
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isLoading && "opacity-60 cursor-wait"
      )}
      tabIndex={onClick && !isLoading ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? `View ${metric.label} details` : metric.label}
      {...rest}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.label}
        </CardTitle>
        <Icon className={cn("h-4 w-4", metric.color)} aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div
            className="text-2xl font-bold"
            aria-label={`Value: ${formattedValue}`}
          >
            {isLoading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              formattedValue
            )}
          </div>

          {!isLoading && data.subtext && (
            <p className="text-xs text-muted-foreground">{data.subtext}</p>
          )}

          {!isLoading && data.trend && (
            <div className="flex items-center gap-1 text-xs">
              {data.trend.direction === "up" && (
                <TrendingUp
                  className="h-3 w-3 text-green-600"
                  aria-hidden="true"
                />
              )}
              {data.trend.direction === "down" && (
                <TrendingDown
                  className="h-3 w-3 text-red-600"
                  aria-hidden="true"
                />
              )}
              {data.trend.direction === "flat" && (
                <Minus className="h-3 w-3 text-gray-600" aria-hidden="true" />
              )}
              <span
                className={cn(
                  data.trend.direction === "up" && "text-green-600",
                  data.trend.direction === "down" && "text-red-600",
                  data.trend.direction === "flat" && "text-gray-600"
                )}
                aria-label={`Trend: ${formatTrend(data.trend)}`}
              >
                {formatTrend(data.trend)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
