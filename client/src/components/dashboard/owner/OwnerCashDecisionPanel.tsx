import { memo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowRight,
  DollarSign,
  Clock,
  Wallet,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/dateFormat";

export const OwnerCashDecisionPanel = memo(function OwnerCashDecisionPanel() {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = trpc.cashAudit.getCashDashboard.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getCashSummary = (
    availableCash: number,
    scheduledPayables: number
  ): string => {
    if (availableCash < 0) {
      return `You're short ${formatCurrency(Math.abs(availableCash))} after scheduled bills.`;
    }
    if (scheduledPayables > 0 && availableCash < scheduledPayables * 0.2) {
      return `After paying bills, you have ${formatCurrency(availableCash)} left — running lean.`;
    }
    if (availableCash > 0) {
      return `You have ${formatCurrency(availableCash)} available after all scheduled bills.`;
    }
    return "Cash is fully committed to scheduled payments.";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Cash Position
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              What you have vs. what you owe
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/accounting/cash-locations")}
            className="text-xs"
          >
            Manage <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-6 w-28" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-6 w-36" />
              </div>
            </div>
          </div>
        ) : error ? (
          <EmptyState
            variant="generic"
            size="sm"
            title="Unable to load cash data"
            description="Please try refreshing the page"
          />
        ) : data ? (
          <div className="space-y-4">
            {/* Plain-language summary banner */}
            <div
              className={cn(
                "rounded-lg p-3 text-sm font-medium flex items-center gap-2",
                data.availableCash >= 0
                  ? "bg-[var(--success-bg)] text-[var(--success)] border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              )}
            >
              {data.availableCash >= 0 ? (
                <TrendingUp className="h-4 w-4 shrink-0" />
              ) : (
                <TrendingDown className="h-4 w-4 shrink-0" />
              )}
              <span>
                {getCashSummary(data.availableCash, data.scheduledPayables)}
              </span>
            </div>

            <div
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setLocation("/accounting/cash-locations")}
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-[var(--success-bg)] dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-[var(--success)] dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Cash on Hand</p>
                <p className="text-lg font-semibold text-[var(--success)] dark:text-green-400 font-mono">
                  {formatCurrency(data.totalCashOnHand)}
                </p>
              </div>
            </div>

            <div
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setLocation("/accounting/bills")}
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  Scheduled Payables
                </p>
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400 font-mono">
                  {formatCurrency(data.scheduledPayables)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bills already scheduled to go out
                </p>
              </div>
            </div>

            <div
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => setLocation("/accounting/cash-locations")}
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/20">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  Available After Bills
                </p>
                <p
                  className={cn(
                    "text-xl font-bold font-mono",
                    data.availableCash >= 0
                      ? "text-primary"
                      : "text-destructive"
                  )}
                >
                  {formatCurrency(data.availableCash)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Updated {formatDateTime(data.lastUpdated, "short", "short")}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/accounting/bills")}
                className="text-xs h-7"
              >
                Review Bills <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            variant="analytics"
            size="sm"
            title="No cash data"
            description="Cash data will appear once locations are configured"
          />
        )}
      </CardContent>
    </Card>
  );
});
