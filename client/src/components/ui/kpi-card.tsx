import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
}

const KpiCard = React.forwardRef<HTMLDivElement, KpiCardProps>(
  ({ className, title, value, change, icon: Icon, trend, loading, ...props }, ref) => {
    const getTrendColor = () => {
      if (!trend || trend === "neutral") return "text-muted-foreground";
      return trend === "up" ? "text-green-600" : "text-red-600";
    };

    const getTrendIcon = () => {
      if (!trend || trend === "neutral") return null;
      return trend === "up" ? "↑" : "↓";
    };

    return (
      <Card
        ref={ref}
        className={cn(
          "hover:shadow-md transition-shadow duration-200",
          className
        )}
        {...props}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" />
              ) : (
                <p className="mt-2 text-3xl font-bold tracking-tight">
                  {value}
                </p>
              )}
              {change && !loading && (
                <div className={cn("mt-1 flex items-center text-sm", getTrendColor())}>
                  <span className="mr-1">{getTrendIcon()}</span>
                  <span className="font-medium">{change.value}%</span>
                  <span className="ml-1 text-muted-foreground">{change.label}</span>
                </div>
              )}
            </div>
            {Icon && (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

KpiCard.displayName = "KpiCard";

export { KpiCard };

