import { memo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

type BatchStatus =
  | "LIVE"
  | "ON_HOLD"
  | "QUARANTINED"
  | "SOLD_OUT"
  | "CLOSED"
  | "AWAITING_INTAKE";

interface StatusConfig {
  label: string;
  badgeClassName: string;
  description: string;
}

const STATUS_CONFIG: Record<BatchStatus, StatusConfig> = {
  LIVE: {
    label: "Live",
    badgeClassName:
      "bg-[var(--success-bg)] text-[var(--success)] border-green-200 hover:bg-green-200",
    description: "Available for sale",
  },
  ON_HOLD: {
    label: "On Hold",
    badgeClassName:
      "bg-[var(--warning-bg)] text-[var(--warning)] border-yellow-200 hover:bg-yellow-200",
    description: "Temporarily withheld",
  },
  QUARANTINED: {
    label: "Quarantined",
    badgeClassName: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
    description: "Under investigation",
  },
  SOLD_OUT: {
    label: "Sold Out",
    badgeClassName:
      "bg-[var(--info-bg)] text-[var(--info)] border-blue-200 hover:bg-blue-200",
    description: "Fully depleted",
  },
  CLOSED: {
    label: "Closed",
    badgeClassName:
      "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200",
    description: "No longer active",
  },
  AWAITING_INTAKE: {
    label: "Awaiting Intake",
    badgeClassName:
      "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
    description: "Not yet received",
  },
};

const STATUS_ORDER: BatchStatus[] = [
  "LIVE",
  "AWAITING_INTAKE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED",
];

export const OwnerSkuStatusBrowserWidget = memo(
  function OwnerSkuStatusBrowserWidget() {
    const [, setLocation] = useLocation();
    const [isExpanded, setIsExpanded] = useState(false);

    const { data, isLoading, error } = trpc.inventory.dashboardStats.useQuery(
      undefined,
      {
        refetchInterval: 60000,
      }
    );

    const handleStatusClick = (status: BatchStatus) => {
      setLocation(`/inventory?tab=inventory&status=${status}`);
    };

    const statusCounts = data?.statusCounts;
    const totalSkus = statusCounts
      ? Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
      : 0;

    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(prev => !prev)}
                className="flex items-center gap-1.5 text-left group"
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
                <CardTitle className="text-base font-semibold group-hover:text-foreground transition-colors">
                  SKU Status Browser
                </CardTitle>
              </button>
              {!isLoading && statusCounts && totalSkus > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  {totalSkus} total
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/inventory")}
              className="text-xs shrink-0"
            >
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          {!isExpanded && (
            <p className="text-xs text-muted-foreground ml-6">
              Click to see SKU counts by status
            </p>
          )}
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {STATUS_ORDER.map(status => (
                  <Skeleton key={status} className="h-10 w-full" />
                ))}
              </div>
            ) : error ? (
              <EmptyState
                variant="inventory"
                size="sm"
                title="Unable to load SKU statuses"
                description="Inventory status data could not be loaded"
              />
            ) : statusCounts && totalSkus > 0 ? (
              <div className="space-y-1.5">
                {STATUS_ORDER.map(status => {
                  const count = statusCounts[status] ?? 0;
                  const config = STATUS_CONFIG[status];
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusClick(status)}
                      className="w-full flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-left hover:bg-muted/60 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium shrink-0 ${config.badgeClassName}`}
                        >
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {config.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-sm tabular-nums">
                          {count}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {count === 1 ? "SKU" : "SKUs"}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                variant="inventory"
                size="sm"
                title="No SKUs found"
                description="Batches will appear here once intake is recorded"
              />
            )}
          </CardContent>
        )}
      </Card>
    );
  }
);
