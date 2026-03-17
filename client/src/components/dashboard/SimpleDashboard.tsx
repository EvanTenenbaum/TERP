/**
 * SimpleDashboard - TER-615/616/617
 *
 * Simplified fixed 6-card dashboard replacing the customizable widget system.
 * Cards: Today's Orders, Open Invoices, Inventory Alerts, Pending Intake,
 *        Calendar Today, Quick Stats
 */

import { memo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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
          Today&apos;s Orders
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
              {snapshot?.today.unitsSold ?? 0} units &middot;{" "}
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
              onClick={() => setLocation("/accounting")}
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
    <div className="space-y-6">
      {/* TER-617: Simple header — title + current date only */}
      <div>
        <h1 className="text-2xl font-semibold leading-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{formatDate()}</p>
      </div>

      {/* TER-615/616: Fixed 6-card grid — no customization */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TodaysOrdersCard />
        <OpenInvoicesCard />
        <InventoryAlertsCard />
        <PendingIntakeCard />
        <CalendarTodayCard />
        <QuickStatsCard />
      </div>
    </div>
  );
});

export default SimpleDashboard;
