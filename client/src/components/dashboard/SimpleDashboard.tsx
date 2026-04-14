/**
 * SimpleDashboard - TER-615/616/617
 *
 * Simplified fixed 6-card dashboard replacing the customizable widget system.
 * Cards: Today's Orders, Open Invoices, Inventory Alerts, Pending Intake,
 *        Calendar Today, Quick Stats
 *
 * Wave 4 (420-fork): Added WorkQueue as primary content above KPI cards,
 * plus a compact quick stats strip.
 */

import { memo, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import {
  ShoppingCart,
  FileText,
  AlertTriangle,
  Package,
  Calendar,
  TrendingUp,
  ArrowRight,
  Clock,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkQueue, type WorkQueueItem } from "@/components/dashboard/WorkQueue";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}


// --- Today's Orders Card ---
const TodaysOrdersCard = memo(function TodaysOrdersCard() {
  const [, setLocation] = useLocation();
  const { data: snapshot, isLoading } =
    trpc.dashboard.getTransactionSnapshot.useQuery(undefined, {
      refetchInterval: 60000,
    });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Today&apos;s Sales
        </CardTitle>
        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {formatCurrency(snapshot?.today.sales ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {snapshot?.today.unitsSold ?? 0} invoices &middot;{" "}
              {formatCurrency(snapshot?.thisWeek.sales ?? 0)} this week
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs px-0"
              onClick={() => setLocation(buildSalesWorkspacePath("orders"))}
            >
              View orders <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
});

// --- Open Invoices Card ---
const OpenInvoicesCard = memo(function OpenInvoicesCard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.dashboard.getTotalDebt.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const arTotal = data?.totalDebtOwedToMe ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Open Invoices
        </CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{formatCurrency(arTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total accounts receivable
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs px-0"
              onClick={() => setLocation("/accounting?tab=invoices")}
            >
              View AR <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
});

// --- Inventory Alerts Card ---
const InventoryAlertsCard = memo(function InventoryAlertsCard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.inventory.dashboardStats.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  // Use statusCounts to derive inventory health signals
  const statusCounts: Record<string, number> = data?.statusCounts ?? {};
  const liveCount = statusCounts["LIVE"] ?? 0;
  const totalBatches = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  // Treat QUARANTINED + ON_HOLD as "needs attention"
  const lowStockCount =
    (statusCounts["QUARANTINED"] ?? 0) + (statusCounts["ON_HOLD"] ?? 0);

  return (
    <Card
      className={`hover:shadow-md transition-shadow ${lowStockCount > 0 ? "border-amber-200" : ""}`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Inventory Alerts
        </CardTitle>
        <AlertTriangle
          className={`h-4 w-4 ${lowStockCount > 0 ? "text-amber-500" : "text-muted-foreground"}`}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{lowStockCount}</div>
              {lowStockCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-800 text-xs"
                >
                  Low Stock
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {liveCount} live batches &middot; {totalBatches} total
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs px-0"
              onClick={() => setLocation("/inventory")}
            >
              View inventory <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
});

// --- Pending Intake Card ---
const PendingIntakeCard = memo(function PendingIntakeCard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.purchaseOrders.getAll.useQuery(
    { limit: 100, offset: 0 },
    { refetchInterval: 60000 }
  );

  const items = Array.isArray(data) ? data : (data?.items ?? []);
  const pendingCount = items.filter(
    (po: { purchaseOrderStatus?: string }) =>
      po.purchaseOrderStatus === "SENT" ||
      po.purchaseOrderStatus === "CONFIRMED" ||
      po.purchaseOrderStatus === "RECEIVING"
  ).length;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Pending Intake
        </CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Purchase order{pendingCount !== 1 ? "s" : ""} awaiting receipt
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs px-0"
              onClick={() => setLocation("/purchase-orders")}
            >
              View POs <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
});

// --- Calendar Today Card ---
const CalendarTodayCard = memo(function CalendarTodayCard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.appointmentRequests.list.useQuery(
    { limit: 20, offset: 0 },
    { refetchInterval: 60000 }
  );

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayAppts =
    data?.requests.filter(req => {
      if (req.status === "rejected" || req.status === "cancelled") return false;
      const slot = new Date(req.requestedSlot);
      return slot >= todayStart && slot < todayEnd;
    }) ?? [];

  const nextAppt = todayAppts[0];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Calendar Today
        </CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{todayAppts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {nextAppt
                ? `Next: ${nextAppt.clientName ?? "Appointment"} at ${new Date(nextAppt.requestedSlot).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : "No appointments today"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs px-0"
              onClick={() => setLocation("/calendar")}
            >
              View calendar <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
});

// --- Work Queue Section ---
const WorkQueueSection = memo(function WorkQueueSection() {

  const { data: draftOrdersData, isLoading: draftLoading } =
    trpc.orders.getAll.useQuery(
      { isDraft: true },
      { refetchInterval: 60000 }
    );

  const { data: invoiceSummary, isLoading: invoiceLoading } =
    trpc.invoices.getSummary.useQuery(undefined, { refetchInterval: 60000 });

  const { data: inventoryStats, isLoading: inventoryLoading } =
    trpc.inventory.dashboardStats.useQuery(undefined, { refetchInterval: 60000 });

  const { data: posData, isLoading: posLoading } =
    trpc.purchaseOrders.getAll.useQuery(
      { limit: 100, offset: 0 },
      { refetchInterval: 60000 }
    );

  const isLoading =
    draftLoading || invoiceLoading || inventoryLoading || posLoading;

  const items: WorkQueueItem[] = useMemo(() => {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result: WorkQueueItem[] = [];

    // 1. Stale draft orders (isDraft=true, createdAt >24h ago)
    const allDrafts = Array.isArray(draftOrdersData)
      ? draftOrdersData
      : (draftOrdersData?.items ?? []);
    const staleDrafts = allDrafts.filter((o: { createdAt?: string | Date | null }) => {
      if (!o.createdAt) return false;
      const created = new Date(o.createdAt);
      return created < cutoff24h;
    });
    if (staleDrafts.length > 0) {
      result.push({
        id: "stale-drafts",
        urgency: staleDrafts.length > 5 ? "critical" : "warning",
        icon: Clock,
        label: `${staleDrafts.length} order${staleDrafts.length !== 1 ? "s" : ""} awaiting confirmation — draft >24h`,
        count: staleDrafts.length,
        href: buildSalesWorkspacePath("orders"),
      });
    }

    // 2. Overdue invoices (status=OVERDUE in invoice summary)
    const overdueRow = invoiceSummary?.byStatus.find(r => r.status === "OVERDUE");
    const overdueCount = overdueRow?.count ?? 0;
    const overdueAmount = overdueRow?.amountDue ?? 0;
    if (overdueCount > 0) {
      result.push({
        id: "overdue-invoices",
        urgency: "critical",
        icon: FileText,
        label: `${overdueCount} invoice${overdueCount !== 1 ? "s" : ""} overdue`,
        count: overdueCount,
        value: overdueAmount > 0 ? `$${overdueAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : undefined,
        href: "/accounting?tab=invoices",
      });
    }

    // 3. Low stock / at-risk batches
    const statusCounts: Record<string, number> =
      inventoryStats?.statusCounts ?? {};
    const lowStockCount =
      (statusCounts["QUARANTINED"] ?? 0) + (statusCounts["ON_HOLD"] ?? 0);
    if (lowStockCount > 0) {
      result.push({
        id: "low-stock",
        urgency: "warning",
        icon: TrendingDown,
        label: `${lowStockCount} batch${lowStockCount !== 1 ? "es" : ""} on hold or quarantined — may block open orders`,
        count: lowStockCount,
        href: "/inventory",
      });
    }

    // 4. POs ready for intake
    const posItems = Array.isArray(posData)
      ? posData
      : (posData?.items ?? []);
    const posForIntake = posItems.filter(
      (po: { purchaseOrderStatus?: string }) =>
        po.purchaseOrderStatus === "SENT" ||
        po.purchaseOrderStatus === "CONFIRMED" ||
        po.purchaseOrderStatus === "RECEIVING"
    );
    if (posForIntake.length > 0) {
      result.push({
        id: "po-intake",
        urgency: "info",
        icon: Package,
        label: `${posForIntake.length} PO${posForIntake.length !== 1 ? "s" : ""} ready for intake`,
        count: posForIntake.length,
        href: "/purchase-orders",
      });
    }

    return result;
  }, [draftOrdersData, invoiceSummary, inventoryStats, posData]);

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Today&apos;s Work
        </h2>
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="space-y-px p-1">
            <Skeleton className="h-11 w-full rounded" />
            <Skeleton className="h-11 w-full rounded" />
            <Skeleton className="h-11 w-full rounded" />
          </div>
        ) : (
          <WorkQueue items={items} />
        )}
      </div>
    </div>
  );
});

// --- Quick Stats Strip ---
const QuickStatsStrip = memo(function QuickStatsStrip() {
  const { data: snapshot, isLoading: snapshotLoading } =
    trpc.dashboard.getTransactionSnapshot.useQuery(undefined, {
      refetchInterval: 60000,
    });
  const { data: debtData, isLoading: debtLoading } =
    trpc.dashboard.getTotalDebt.useQuery(undefined, {
      refetchInterval: 60000,
    });
  const { data: inventoryStats, isLoading: inventoryLoading } =
    trpc.inventory.dashboardStats.useQuery(undefined, { refetchInterval: 60000 });

  // Count live/active batches as a proxy for "active orders" count
  const statusCounts: Record<string, number> =
    inventoryStats?.statusCounts ?? {};
  const activeBatchCount = statusCounts["LIVE"] ?? 0;
  const arTotal = debtData?.totalDebtOwedToMe ?? 0;

  // Revenue MTD: use thisMonth if available, fall back to thisWeek
  const revenueMtd =
    (snapshot as { thisMonth?: { sales?: number } } | undefined)?.thisMonth
      ?.sales ?? snapshot?.thisWeek.sales;

  const inventoryValue =
    (inventoryStats as { totalValue?: number } | undefined)?.totalValue;

  const isLoading = snapshotLoading || debtLoading || inventoryLoading;

  const stats = [
    {
      label: "Revenue MTD",
      value: isLoading
        ? null
        : revenueMtd !== null && revenueMtd !== undefined
          ? formatCurrency(revenueMtd)
          : "—",
    },
    {
      label: "Open AR",
      value: isLoading ? null : formatCurrency(arTotal),
    },
    {
      label: "Inventory Value",
      value: isLoading
        ? null
        : inventoryValue !== null && inventoryValue !== undefined
          ? formatCurrency(inventoryValue)
          : "—",
    },
    {
      label: "Live Batches",
      value: isLoading ? null : String(activeBatchCount),
    },
  ];

  return (
    <div className="flex items-center gap-6 px-1 mb-6 text-sm">
      {stats.map(stat => (
        <div key={stat.label} className="flex flex-col">
          <span className="text-[0.68rem] uppercase tracking-wide text-muted-foreground font-medium">
            {stat.label}
          </span>
          {stat.value === null ? (
            <Skeleton className="h-5 w-16 mt-0.5" />
          ) : (
            <span className="text-base font-semibold tabular-nums">
              {stat.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
});

// --- Quick Stats Card ---
const QuickStatsCard = memo(function QuickStatsCard() {
  const { data: snapshot, isLoading } =
    trpc.dashboard.getTransactionSnapshot.useQuery(undefined, {
      refetchInterval: 60000,
    });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Quick Stats
        </CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Cash collected today
              </span>
              <span className="font-medium tabular-nums">
                {formatCurrency(snapshot?.today.cashCollected ?? 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">This week</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(snapshot?.thisWeek.sales ?? 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Units sold today</span>
              <span className="font-medium tabular-nums">
                {snapshot?.today.unitsSold ?? 0}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// --- Main SimpleDashboard ---
export const SimpleDashboard = memo(function SimpleDashboard() {
  return (
    <div className="space-y-2">
      {/* TER-617: Simple header — title only (date moved to WorkQueue header) */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold leading-tight text-foreground">
          Dashboard
        </h1>
      </div>

      {/* Wave 4: Work queue — primary actionable content */}
      <WorkQueueSection />

      {/* Wave 4: Quick stats strip */}
      <QuickStatsStrip />

      {/* TER-615/616: Fixed KPI cards — secondary context */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-0.5">
          Overview
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TodaysOrdersCard />
          <OpenInvoicesCard />
          <InventoryAlertsCard />
          <PendingIntakeCard />
          <CalendarTodayCard />
          <QuickStatsCard />
        </div>
      </div>
    </div>
  );
});

export default SimpleDashboard;
