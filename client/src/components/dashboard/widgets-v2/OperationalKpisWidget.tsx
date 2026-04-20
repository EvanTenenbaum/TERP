import { memo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Minus,
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
      className: "text-red-600",
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
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
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

  const openOrdersCount = data?.openOrders.count ?? 0;
  const openOrdersValue = data?.openOrders.totalValue ?? 0;
  const fulfilledTodayCount = data?.fulfilledToday.count ?? 0;
  const receivablesTotal = data?.outstandingReceivables.total ?? 0;
  const receivablesInvoices = data?.outstandingReceivables.invoiceCount ?? 0;
  const thisWeekCash = data?.cashCollected.thisWeek ?? 0;
  const lastWeekCash = data?.cashCollected.lastWeek ?? 0;
  const percentChange = data?.cashCollected.percentChange ?? 0;

  const cashTrend: Trend =
    percentChange > 0 ? "up" : percentChange < 0 ? "down" : "neutral";
  const cashTrendLabel = `${
    percentChange > 0 ? "+" : ""
  }${percentChange}% vs last week`;

  return (
    <div
      aria-label="Operational KPIs"
      className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
    >
      <KpiTile
        title="Open Orders"
        icon={ShoppingCart}
        value={formatNumber(openOrdersCount)}
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
        secondary={`Last week ${formatCurrency(lastWeekCash)}`}
        trend={{ direction: cashTrend, label: cashTrendLabel }}
        onClick={() => setLocation("/accounting/payments")}
        loading={isLoading}
      />
    </div>
  );
});
