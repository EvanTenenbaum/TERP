import { memo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRight, DollarSign, Clock, Wallet } from "lucide-react";
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Cash Decision Panel
          </CardTitle>
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
            <div
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setLocation("/accounting/cash-locations")}
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Cash on Hand</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400 font-mono">
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
                <p className="text-sm text-muted-foreground">
                  Scheduled Payables
                </p>
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400 font-mono">
                  {formatCurrency(data.scheduledPayables)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/20">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Available Cash</p>
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

            <p className="text-xs text-muted-foreground text-right">
              Updated {formatDateTime(data.lastUpdated, "short", "short")}
            </p>
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
