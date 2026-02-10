/**
 * Transaction Snapshot Widget
 * Reused as "Quick Cards" for owner workflow:
 * - Existing transaction snapshot API
 * - Existing inbox APIs
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export const TransactionSnapshotWidget = memo(
  function TransactionSnapshotWidget() {
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

    const isLoading =
      isSnapshotLoading || isInboxLoading || isInboxStatsLoading;
    const error = snapshotError || inboxError || inboxStatsError;

    const formatCurrency = (value: number) =>
      `$${value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;

    if (error) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              variant="generic"
              size="sm"
              title="Unable to load quick cards"
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
            <CardTitle className="text-lg font-semibold">Quick Cards</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Today&apos;s sales and inbox signals for first-pass morning
              triage.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/inbox")}
            className="text-xs"
          >
            Open Inbox <ArrowRight className="h-3 w-3 ml-1" />
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
                  onClick={() => setLocation("/orders")}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Sales Today
                  </p>
                  <p className="font-semibold font-mono text-base">
                    {formatCurrency(snapshot.today.sales)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Week: {formatCurrency(snapshot.thisWeek.sales)}
                  </p>
                </button>
                <button
                  className="rounded border bg-muted/40 p-2 text-left hover:bg-muted/60 transition-colors"
                  onClick={() => setLocation("/inventory")}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Units Sold
                  </p>
                  <p className="font-semibold font-mono text-base">
                    {snapshot.today.unitsSold}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Week: {snapshot.thisWeek.unitsSold}
                  </p>
                </button>
                <button
                  className="rounded border bg-muted/40 p-2 text-left hover:bg-muted/60 transition-colors"
                  onClick={() => setLocation("/accounting/payments")}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Cash Collected
                  </p>
                  <p className="font-semibold font-mono text-base">
                    {formatCurrency(snapshot.today.cashCollected)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Week: {formatCurrency(snapshot.thisWeek.cashCollected)}
                  </p>
                </button>
                <button
                  className="rounded border bg-muted/40 p-2 text-left hover:bg-muted/60 transition-colors"
                  onClick={() => setLocation("/inbox")}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Inbox Items
                  </p>
                  <p className="font-semibold font-mono text-base">
                    {inboxStats?.total ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {inboxStats?.unread ?? 0} unread
                  </p>
                </button>
              </div>

              <div className="rounded border bg-card p-2">
                <p className="text-xs font-semibold mb-1">Inbox Preview</p>
                {inboxData?.items && inboxData.items.length > 0 ? (
                  <ol className="space-y-1 text-xs text-muted-foreground">
                    {inboxData.items.map((item, index) => (
                      <li key={item.id} className="line-clamp-1">
                        {index + 1}. {item.title}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No pending inbox items
                  </p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              variant="orders"
              size="sm"
              title="No transaction data"
              description="Quick cards appear once orders and inbox activity exist"
            />
          )}
        </CardContent>
      </Card>
    );
  }
);
