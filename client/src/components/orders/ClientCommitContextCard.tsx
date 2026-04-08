import { useMemo } from "react";
import { Clock3, ExternalLink, FileStack, Tags } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientCommitContextCardProps {
  clientId: number;
  canViewPricingContext: boolean;
  onOpenMoney: () => void;
  onOpenPricing: () => void;
  onOpenOverview: () => void;
}

function formatMoney(value: string | number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatShortDate(value: Date | string | null | undefined): string {
  if (!value) return "No orders yet";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No orders yet";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLastTouch(value: string | null | undefined): string {
  if (!value) return "No recent touch";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No recent touch";

  const dayDiff = Math.floor(
    (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (dayDiff <= 0) return "Touched today";
  if (dayDiff === 1) return "Touched yesterday";
  return `Touched ${dayDiff}d ago`;
}

export function ClientCommitContextCard({
  clientId,
  canViewPricingContext,
  onOpenMoney,
  onOpenPricing,
  onOpenOverview,
}: ClientCommitContextCardProps) {
  const shellQuery = trpc.relationshipProfile.getShell.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );
  const recentOrdersQuery =
    trpc.orderEnhancements.getRecentOrdersForReorder.useQuery(
      { clientId, limit: 3 },
      { enabled: clientId > 0 }
    );

  const shell = shellQuery.data;
  const recentOrders = useMemo(() => {
    if (!recentOrdersQuery.data?.success) return [];
    return (recentOrdersQuery.data.orders ?? []).slice(0, 3);
  }, [recentOrdersQuery.data]);

  const creditLimit = shell?.financials.creditLimit ?? 0;
  const currentBalance = shell?.financials.balance?.computedBalance ?? 0;
  const availableCredit =
    creditLimit > 0 ? Math.max(creditLimit - currentBalance, 0) : null;

  if (shellQuery.isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!shell) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Customer context is unavailable right now.
        </CardContent>
      </Card>
    );
  }

  const combinedDrafts =
    shell.openArtifacts.salesSheetDrafts + shell.openArtifacts.orderDrafts;

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Customer Context
              </p>
              <h3 className="truncate text-base font-semibold">{shell.name}</h3>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                <span>{formatLastTouch(shell.lastTouchAt)}</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              {shell.roles.slice(0, 3).map(role => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          </div>

          {shell.referrer?.name ? (
            <p className="text-xs text-muted-foreground">
              Referred by {shell.referrer.name}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Credit Limit
            </p>
            <p className="mt-1 text-sm font-semibold">
              {creditLimit > 0 ? formatMoney(creditLimit) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Balance
            </p>
            <p className="mt-1 text-sm font-semibold">
              {formatMoney(currentBalance)}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Available
            </p>
            <p className="mt-1 text-sm font-semibold">
              {availableCredit !== null ? formatMoney(availableCredit) : "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Open Quotes
            </p>
            <p className="mt-1 text-sm font-semibold">
              {shell.openArtifacts.openQuotes}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Drafts
            </p>
            <p className="mt-1 text-sm font-semibold">{combinedDrafts}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Needs
            </p>
            <p className="mt-1 text-sm font-semibold">
              {shell.openArtifacts.activeNeeds}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Tags className="h-3.5 w-3.5" />
            Recent Sales
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map(order => (
                <div
                  key={order.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {order.orderNumber || `Order #${order.id}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(order.confirmedAt || order.createdAt)}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium">
                    {formatMoney(order.total)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No confirmed sales yet.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={onOpenOverview}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Overview
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={onOpenMoney}
          >
            <FileStack className="mr-2 h-4 w-4" />
            Money
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={onOpenPricing}
            disabled={!canViewPricingContext}
          >
            <Tags className="mr-2 h-4 w-4" />
            Pricing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ClientCommitContextCard;
