import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { useLocation } from "wouter";

export const OwnerQuickCardsWidget = memo(function OwnerQuickCardsWidget() {
  const [, setLocation] = useLocation();
  const {
    data: snapshot,
    isLoading: isSnapshotLoading,
    error: snapshotError,
  } = trpc.dashboard.getTransactionSnapshot.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const {
    data: inboxData,
    isLoading: isInboxLoading,
    error: inboxError,
  } = trpc.inbox.getMyItems.useQuery(
    { includeArchived: false, limit: 3, offset: 0 },
    { refetchInterval: 60000 }
  );
  const {
    data: inboxStats,
    isLoading: isInboxStatsLoading,
    error: inboxStatsError,
  } = trpc.inbox.getStats.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const isLoading = isSnapshotLoading || isInboxLoading || isInboxStatsLoading;
  const error = snapshotError || inboxError || inboxStatsError;

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const unreadCount = inboxStats?.unread ?? 0;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Today at a Glance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="generic"
            size="sm"
            title="Unable to load daily snapshot"
            description="Transaction or inbox data could not be loaded"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Today at a Glance
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Sales, cash, and inbox signals for your morning review.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/notifications")}
          className="text-xs"
        >
          Open Notifications <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : snapshot ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded border bg-muted/40 p-2 text-left hover:bg-muted/60 transition-colors"
                onClick={() => setLocation(buildSalesWorkspacePath("orders"))}
              >
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Sold Today
                </p>
                <p className="font-semibold font-mono text-base">
                  {formatCurrency(snapshot.today.sales)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {snapshot.today.sales > 0
                    ? `${formatCurrency(snapshot.thisWeek.sales)} this week`
                    : "No sales yet today"}
                </p>
              </button>
              <button
                className="rounded border bg-muted/40 p-2 text-left hover:bg-muted/60 transition-colors"
                onClick={() => setLocation("/inventory")}
              >
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Units Moved
                </p>
                <p className="font-semibold font-mono text-base">
                  {snapshot.today.unitsSold}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {snapshot.today.unitsSold > 0
                    ? `${snapshot.thisWeek.unitsSold} this week`
                    : "None shipped today"}
                </p>
              </button>
              <button
                className="rounded border bg-muted/40 p-2 text-left hover:bg-muted/60 transition-colors"
                onClick={() => setLocation("/accounting/payments")}
              >
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Cash In Today
                </p>
                <p className="font-semibold font-mono text-base">
                  {formatCurrency(snapshot.today.cashCollected)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {snapshot.today.cashCollected > 0
                    ? `${formatCurrency(snapshot.thisWeek.cashCollected)} this week`
                    : "No cash collected yet"}
                </p>
              </button>
              <button
                className={`rounded border p-2 text-left hover:bg-muted/60 transition-colors ${
                  unreadCount > 0
                    ? "bg-amber-50 border-amber-200"
                    : "bg-muted/40"
                }`}
                onClick={() => setLocation("/notifications")}
              >
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Inbox
                </p>
                <p className="font-semibold font-mono text-base">
                  {unreadCount} unread
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {unreadCount > 0
                    ? "Needs your attention"
                    : `${inboxStats?.total ?? 0} total items`}
                </p>
              </button>
            </div>

            {/* Inbox preview */}
            {inboxData?.items && inboxData.items.length > 0 && (
              <div className="rounded border bg-card p-2">
                <p className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
                  Next up in your inbox
                </p>
                <ol className="space-y-1.5 text-xs">
                  {inboxData.items.map((item, index) => (
                    <li key={item.id} className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">
                        {index + 1}.
                      </span>
                      <span className="line-clamp-1 text-foreground">
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ol>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-xs h-7"
                  onClick={() => setLocation("/notifications")}
                >
                  Go to Notifications <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}

            {(!inboxData?.items || inboxData.items.length === 0) && (
              <div className="rounded border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground font-medium">
                  Inbox is clear
                </p>
                <p className="text-xs text-muted-foreground">
                  Nothing waiting for your review.
                </p>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            variant="orders"
            size="sm"
            title="No transaction data"
            description="Today's snapshot appears once orders are recorded"
          />
        )}
      </CardContent>
    </Card>
  );
});
