import { memo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Minus,
  Package,
  PackageCheck,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";

/**
 * TER-1055 — Operational KPI row
 *
 * Surfaces the four operating signals an owner checks first thing in the
 * morning. Each tile navigates to the workspace that owns the signal, so the
 * owner can drill straight from the dashboard into the actionable list.
 */

type Trend = "up" | "down" | "neutral";

interface KpiTileProps {
  title: string;
  icon: LucideIcon;
  value: string;
  secondary?: string;
  /**
   * Short label indicating the time window the value represents
   * (e.g. "Live", "Today", "Last 7 days"). Rendered as a small chip
   * next to the title so readers can interpret the number in context —
   * TER-1335. Omit to hide the chip entirely (e.g. skeleton placeholders).
   */
  period?: string;
  trend?: {
    direction: Trend;
    label: string;
  };
  onClick: () => void;
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Compact currency for large totals (e.g. "$34.2M", "$1.1B", "$950K").
 * Falls back to standard currency for values under 10,000. Always renders
 * "$0" for zero rather than the em-dash placeholder so the KPI never reads
 * as "no data" when the total really is zero.
 */
function formatCompactCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  const abs = Math.abs(value);
  if (abs < 10_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function trendVisual(direction: Trend) {
  if (direction === "up") {
    return {
      Icon: ArrowUpRight,
      className: "text-emerald-600",
    };
  }
  if (direction === "down") {
    return {
      Icon: ArrowDownRight,
      className: "text-destructive",
    };
  }
  return {
    Icon: Minus,
    className: "text-muted-foreground",
  };
}

const KpiTile = memo(function KpiTile({
  title,
  icon: Icon,
  value,
  secondary,
  period,
  trend,
  onClick,
  loading,
}: KpiTileProps) {
  const TrendIcon = trend ? trendVisual(trend.direction).Icon : null;
  const trendClass = trend ? trendVisual(trend.direction).className : "";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer transition-shadow duration-200 hover:border-primary/50 hover:shadow-md"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {title}
              </p>
              {period && (
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-0 text-[10px] font-normal uppercase tracking-wide text-muted-foreground"
                >
                  {period}
                </Badge>
              )}
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-24" />
            ) : (
              <p className="mt-2 text-2xl font-semibold tracking-tight font-mono">
                {value}
              </p>
            )}
            {!loading && secondary && (
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {secondary}
              </p>
            )}
            {!loading && trend && TrendIcon && (
              <div
                className={`mt-1 flex items-center text-xs font-medium ${trendClass}`}
              >
                <TrendIcon className="h-3 w-3 mr-1" />
                <span>{trend.label}</span>
              </div>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export const OperationalKpisWidget = memo(function OperationalKpisWidget() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } =
    trpc.dashboard.getOperationalKpis.useQuery(undefined, {
      refetchInterval: 60000,
    });
  // TER-1258: surface live inventory COGS value next to the operational
  // KPIs. The dashboard previously had a SimpleDashboard "Inventory Value"
  // stat that always rendered as "—" because it read a non-existent
  // `totalValue` field on the inventory stats response; when that dashboard
  // was retired in TER-1236 the KPI vanished entirely. Pull the canonical
  // inventory snapshot (sellable/LIVE batches only) so the tile shows a real
  // dollar figure, and treat zero as "$0" rather than the em-dash placeholder.
  const { data: inventorySnapshot, isLoading: inventoryLoading } =
    trpc.dashboard.getInventorySnapshot.useQuery(undefined, {
      refetchInterval: 60000,
    });

  if (error) {
    return (
      <Card>
        <CardContent className="p-5">
          <EmptyState
            variant="generic"
            size="sm"
            title="Unable to load operational KPIs"
            description="Dashboard metrics could not be loaded right now."
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <div
        aria-label="Operational KPIs"
        aria-busy="true"
        className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
      >
        <KpiTile
          title="Open Orders"
          icon={ShoppingCart}
          value=""
          period="Live"
          onClick={() => {}}
          loading
        />
        <KpiTile
          title="Fulfilled Today"
          icon={PackageCheck}
          value=""
          period="Today"
          onClick={() => {}}
          loading
        />
        <KpiTile
          title="Outstanding Receivables"
          icon={CircleDollarSign}
          value=""
          period="Live"
          onClick={() => {}}
          loading
        />
        <KpiTile
          title="Cash Collected (7d)"
          icon={Wallet}
          value=""
          period="Last 7 days"
          onClick={() => {}}
          loading
        />
        <KpiTile
          title="Inventory Value"
          icon={Package}
          value=""
          period="Live"
          onClick={() => {}}
          loading
        />
      </div>
    );
  }

  const openOrdersCount = data.openOrders.count;
  const openOrdersValue = data.openOrders.totalValue;
  const fulfilledTodayCount = data.fulfilledToday.count;
  const receivablesTotal = data.outstandingReceivables.total;
  const receivablesInvoices = data.outstandingReceivables.invoiceCount;
  const thisWeekCash = data.cashCollected.thisWeek;
  const lastWeekCash = data.cashCollected.lastWeek;
  const percentChange = data.cashCollected.percentChange;

  const cashTrend: Trend =
    percentChange === null
      ? "neutral"
      : percentChange > 0
        ? "up"
        : percentChange < 0
          ? "down"
          : "neutral";
  const cashTrendLabel =
    percentChange === null
      ? "N/A vs last week"
      : `${percentChange > 0 ? "+" : ""}${percentChange}% vs last week`;

  // TER-1258: treat missing/loading snapshot as "still resolving" so the tile
  // keeps its skeleton instead of flashing "$0" on first paint. A confirmed
  // zero from the server renders as "$0".
  const inventoryValue = inventorySnapshot?.totalValue ?? 0;
  const inventoryUnits = inventorySnapshot?.totalUnits ?? 0;
  const inventoryTileLoading = inventoryLoading && !inventorySnapshot;

  return (
    <div
      aria-label="Operational KPIs"
      className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
    >
      <KpiTile
        title="Open Orders"
        icon={ShoppingCart}
        value={formatNumber(openOrdersCount)}
        period="Live"
        secondary={
          openOrdersCount > 0
            ? `${formatCurrency(openOrdersValue)} in flight`
            : "No orders in flight"
        }
        onClick={() =>
          setLocation(buildSalesWorkspacePath("orders") + "?status=open")
        }
        loading={isLoading}
      />
      <KpiTile
        title="Fulfilled Today"
        icon={PackageCheck}
        value={formatNumber(fulfilledTodayCount)}
        period="Today"
        secondary={
          fulfilledTodayCount > 0
            ? "Shipped or delivered today"
            : "Nothing shipped yet"
        }
        onClick={() =>
          setLocation(
            buildSalesWorkspacePath("orders") + "?fulfillment=shipped"
          )
        }
        loading={isLoading}
      />
      <KpiTile
        title="Outstanding Receivables"
        icon={CircleDollarSign}
        value={formatCurrency(receivablesTotal)}
        period="Live"
        secondary={
          receivablesInvoices > 0
            ? `${receivablesInvoices} open invoice${
                receivablesInvoices === 1 ? "" : "s"
              }`
            : "No open invoices"
        }
        onClick={() => setLocation("/accounting/invoices")}
        loading={isLoading}
      />
      <KpiTile
        title="Cash Collected (7d)"
        icon={Wallet}
        value={formatCurrency(thisWeekCash)}
        period="Last 7 days"
        secondary={`Last week ${formatCurrency(lastWeekCash)}`}
        trend={{ direction: cashTrend, label: cashTrendLabel }}
        onClick={() => setLocation("/accounting/payments")}
        loading={isLoading}
      />
      <KpiTile
        title="Inventory Value"
        icon={Package}
        value={formatCompactCurrency(inventoryValue)}
        period="Live"
        secondary={
          inventoryUnits > 0
            ? `${formatNumber(Math.round(inventoryUnits))} live units`
            : "No live inventory"
        }
        onClick={() => setLocation("/inventory")}
        loading={inventoryTileLoading}
      />
    </div>
  );
});
