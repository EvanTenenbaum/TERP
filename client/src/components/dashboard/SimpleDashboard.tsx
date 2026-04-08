/**
 * SimpleDashboard - TER-615/616/617
 *
 * Simplified fixed 6-card dashboard replacing the customizable widget system.
 * Cards: Today's Orders, Open Invoices, Inventory Alerts, Pending Intake,
 *        Calendar Today, Quick Stats
 */

import { memo, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { formatDistanceToNow } from "date-fns";
import {
  ShoppingCart,
  FileText,
  AlertTriangle,
  Package,
  Calendar,
  TrendingUp,
  ArrowRight,
  Clock3,
  DollarSign,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  buildDashboardActivityFeed,
  buildDashboardOperationalKpis,
  DASHBOARD_ACTIVITY_STORAGE_KEY,
  type DashboardActivityItem,
  type DashboardAppointmentSummary,
  type DashboardOrderSummary,
  type DashboardPaymentSummary,
  type DashboardPurchaseOrderSummary,
} from "./dashboardActivity";

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
const PendingIntakeCard = memo(function PendingIntakeCard({
  purchaseOrders,
  isLoading,
}: {
  purchaseOrders: DashboardPurchaseOrderSummary[];
  isLoading: boolean;
}) {
  const [, setLocation] = useLocation();
  const pendingCount = purchaseOrders.filter(
    po =>
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
const CalendarTodayCard = memo(function CalendarTodayCard({
  appointments,
  isLoading,
}: {
  appointments: DashboardAppointmentSummary[];
  isLoading: boolean;
}) {
  const [, setLocation] = useLocation();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayAppts = appointments.filter(req => {
      if (req.status === "rejected" || req.status === "cancelled") return false;
      if (!req.requestedSlot) return false;
      const slot = new Date(req.requestedSlot);
      return slot >= todayStart && slot < todayEnd;
    });

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
                ? `Next: ${nextAppt.clientName ?? "Appointment"} at ${new Date(nextAppt.requestedSlot ?? Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
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

// --- Operational KPIs Card ---
const OperationalKpisCard = memo(function OperationalKpisCard({
  orders,
  purchaseOrders,
  appointments,
  isLoading,
}: {
  orders: DashboardOrderSummary[];
  purchaseOrders: DashboardPurchaseOrderSummary[];
  appointments: DashboardAppointmentSummary[];
  isLoading: boolean;
}) {
  const metrics = buildDashboardOperationalKpis({
    orders,
    purchaseOrders,
    appointments,
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Operational KPIs
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
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Expected deliveries</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.nextExpectedDeliveryLabel}
                </p>
              </div>
              <span className="font-medium tabular-nums">
                {metrics.expectedDeliveries}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Pending fulfillment</p>
                <p className="text-xs text-muted-foreground">
                  Ready to pick, pack, or ship
                </p>
              </div>
              <span className="font-medium tabular-nums">
                {metrics.pendingFulfillment}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Appointments today</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.nextAppointmentLabel}
                </p>
              </div>
              <span className="font-medium tabular-nums">
                {metrics.appointmentsToday}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

function getActivityIcon(item: DashboardActivityItem) {
  switch (item.kind) {
    case "payment":
      return DollarSign;
    case "intake":
      return Truck;
    case "order":
    default:
      return ShoppingCart;
  }
}

const RecentActivityCard = memo(function RecentActivityCard({
  orders,
  payments,
  purchaseOrders,
  lastVisitedAt,
  isLoading,
}: {
  orders: DashboardOrderSummary[];
  payments: DashboardPaymentSummary[];
  purchaseOrders: DashboardPurchaseOrderSummary[];
  lastVisitedAt: string | null;
  isLoading: boolean;
}) {
  const activityItems = buildDashboardActivityFeed({
    orders,
    payments,
    purchaseOrders,
    lastVisitedAt,
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Activity
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {lastVisitedAt
              ? "Since last dashboard visit"
              : "Last 24 hours of orders, payments, and intake"}
          </p>
        </div>
        <Clock3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : activityItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No new orders, payments, or intake activity since your last
            dashboard visit.
          </p>
        ) : (
          <ol className="space-y-2">
            {activityItems.map(item => {
              const Icon = getActivityIcon(item);

              return (
                <li
                  key={item.id}
                  className="rounded border bg-muted/30 px-3 py-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full border bg-background p-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
});

// --- Main SimpleDashboard ---
export const SimpleDashboard = memo(function SimpleDashboard() {
  const purchaseOrdersQuery = trpc.purchaseOrders.getAll.useQuery(
    { limit: 100, offset: 0 },
    { refetchInterval: 60000 }
  );
  const appointmentsQuery = trpc.appointmentRequests.list.useQuery(
    { limit: 20, offset: 0 },
    { refetchInterval: 60000 }
  );
  const ordersQuery = trpc.orders.getAll.useQuery(
    { orderType: "SALE", isDraft: false, limit: 100, offset: 0 },
    { refetchInterval: 60000 }
  );
  const paymentsQuery = trpc.accounting.payments.list.useQuery(
    { limit: 25, offset: 0 },
    { refetchInterval: 60000 }
  );
  const [lastVisitedAt, setLastVisitedAt] = useState<string | null>(null);

  useEffect(() => {
    const previousValue = window.localStorage.getItem(
      DASHBOARD_ACTIVITY_STORAGE_KEY
    );
    setLastVisitedAt(previousValue);
    window.localStorage.setItem(
      DASHBOARD_ACTIVITY_STORAGE_KEY,
      new Date().toISOString()
    );
  }, []);

  const purchaseOrders = Array.isArray(purchaseOrdersQuery.data)
    ? purchaseOrdersQuery.data
    : (purchaseOrdersQuery.data?.items ?? []);
  const appointments = appointmentsQuery.data?.requests ?? [];
  const orders = (ordersQuery.data?.items ?? []) as DashboardOrderSummary[];
  const payments = (paymentsQuery.data?.items ?? []) as DashboardPaymentSummary[];

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
        <PendingIntakeCard
          purchaseOrders={purchaseOrders}
          isLoading={purchaseOrdersQuery.isLoading}
        />
        <CalendarTodayCard
          appointments={appointments}
          isLoading={appointmentsQuery.isLoading}
        />
        <OperationalKpisCard
          orders={orders}
          purchaseOrders={purchaseOrders}
          appointments={appointments}
          isLoading={
            purchaseOrdersQuery.isLoading ||
            appointmentsQuery.isLoading ||
            ordersQuery.isLoading
          }
        />
      </div>

      <RecentActivityCard
        orders={orders}
        payments={payments}
        purchaseOrders={purchaseOrders}
        lastVisitedAt={lastVisitedAt}
        isLoading={
          purchaseOrdersQuery.isLoading ||
          ordersQuery.isLoading ||
          paymentsQuery.isLoading
        }
      />
    </div>
  );
});

export default SimpleDashboard;
