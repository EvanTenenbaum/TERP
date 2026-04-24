import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  Download,
  DollarSign,
  CreditCard,
  Percent,
  Calendar,
  Loader2,
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
// Alert components available from @/components/ui/alert when needed
import { formatCurrency } from "@/lib/utils";
import {
  MetricCard,
  TopClientsTable,
  RevenueTrendsTable,
} from "@/components/analytics";
import {
  ErrorState,
  EmptyState,
  emptyStateConfigs,
} from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useLocation } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Period = "day" | "week" | "month" | "quarter" | "year" | "all";

/**
 * Format large revenue numbers for YAxis ticks (e.g. "$12.5k", "$1.2M").
 */
function formatCompactCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}

interface RevenueChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    payload?: { name: string; revenue: number; orders: number };
  }>;
}

function RevenueChartTooltip({
  active,
  label,
  payload,
}: RevenueChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-semibold text-foreground">{label}</div>
      <div className="text-muted-foreground">
        Revenue:{" "}
        <span className="font-medium text-foreground">
          {formatCurrency(point.revenue)}
        </span>
      </div>
      <div className="text-muted-foreground">
        Orders:{" "}
        <span className="font-medium text-foreground">
          {point.orders.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

const periodLabels: Record<Period, string> = {
  day: "Last 24 hours",
  week: "Last 7 days",
  month: "Last 30 days",
  quarter: "Last 90 days",
  year: "Last 12 months",
  all: "All time",
};

/**
 * Convert the selected Period into an explicit { startDate, endDate } window
 * so the client can pass matching filters to tRPC queries that accept date
 * bounds. "all" returns undefined bounds so the server treats the request as
 * unbounded.
 */
function getPeriodDateRange(period: Period): {
  startDate?: Date;
  endDate?: Date;
} {
  if (period === "all") {
    return { startDate: undefined, endDate: undefined };
  }

  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "day":
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "quarter":
      startDate.setDate(startDate.getDate() - 90);
      break;
    case "year":
      startDate.setDate(startDate.getDate() - 365);
      break;
  }

  return { startDate, endDate };
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [, setLocation] = useLocation();

  const { startDate: periodStart, endDate: periodEnd } = useMemo(
    () => getPeriodDateRange(period),
    [period]
  );
  const granularity: "day" | "month" =
    period === "day" || period === "week" ? "day" : "month";
  const revenueTrendsLimit = granularity === "day" ? 7 : 12;

  const { data, isLoading, error, refetch } =
    trpc.analytics.getExtendedSummary.useQuery({ period });
  const { data: revenueTrends, isLoading: trendsLoading } =
    trpc.analytics.getRevenueTrends.useQuery({
      granularity,
      limit: revenueTrendsLimit,
      startDate: periodStart,
      endDate: periodEnd,
    });
  const { data: topClients, isLoading: clientsLoading } =
    trpc.analytics.getTopClients.useQuery({
      limit: 10,
      sortBy: "revenue",
      startDate: periodStart,
      endDate: periodEnd,
    });

  const exportMutation = trpc.analytics.exportData.useMutation({
    onSuccess: result => {
      const blob = new Blob([result.data], { type: result.contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });

  const handleExport = (
    type: "summary" | "revenue" | "clients" | "inventory",
    format: "csv" | "json" = "csv"
  ) => {
    exportMutation.mutate({ type, format });
  };

  const chartData = useMemo(() => {
    if (!revenueTrends) return [];
    return revenueTrends.map(t => ({
      name: t.period,
      revenue: t.revenue,
      orders: t.orderCount,
    }));
  }, [revenueTrends]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Business intelligence and insights for your operations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("summary", "csv")}>
                Export Summary (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("revenue", "csv")}>
                Export Revenue Data (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("inventory", "csv")}
              >
                Export Inventory Data (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("clients", "csv")}>
                Export Clients Data (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {error && (
            <Card className="p-6">
              <ErrorState
                title="Failed to load analytics"
                description={
                  error.message ||
                  "An error occurred while loading analytics data."
                }
                onRetry={() => refetch()}
              />
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Revenue"
              href="/accounting"
              value={formatCurrency(data?.totalRevenue ?? 0)}
              subtitle="All time · from all orders"
              icon={DollarSign}
              isLoading={isLoading}
            />
            <MetricCard
              title={`Revenue (${periodLabels[period]})`}
              value={formatCurrency(data?.revenueThisPeriod ?? 0)}
              subtitle={`Period: ${periodLabels[period]}`}
              icon={BarChart3}
              isLoading={isLoading}
              trend={
                data?.growthRate !== undefined
                  ? { value: data.growthRate, label: "vs previous period" }
                  : undefined
              }
            />
            <MetricCard
              title="Avg Order Value"
              value={formatCurrency(data?.averageOrderValue ?? 0)}
              subtitle="All time · avg per order"
              icon={CreditCard}
              isLoading={isLoading}
            />
            <MetricCard
              title="Outstanding Balance"
              value={formatCurrency(data?.outstandingBalance ?? 0)}
              subtitle="All time · unpaid invoices"
              icon={Percent}
              isLoading={isLoading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Orders"
              href="/sales?tab=orders"
              value={(data?.totalOrders ?? 0).toLocaleString()}
              subtitle={
                period === "all"
                  ? "All time"
                  : `All time · ${(data?.ordersThisPeriod ?? 0).toLocaleString()} in ${periodLabels[period].toLowerCase()}`
              }
              icon={TrendingUp}
              isLoading={isLoading}
              trend={
                period !== "all" && data?.ordersGrowthRate !== undefined
                  ? {
                      value: data.ordersGrowthRate,
                      label: "orders vs previous period",
                    }
                  : undefined
              }
            />
            <MetricCard
              title="Active Clients"
              value={(data?.totalClients ?? 0).toLocaleString()}
              subtitle={
                period === "all"
                  ? "All time"
                  : `All time · ${(data?.newClientsThisPeriod ?? 0).toLocaleString()} new in ${periodLabels[period].toLowerCase()}`
              }
              icon={Users}
              isLoading={isLoading}
              trend={
                period !== "all" && data?.clientsGrowthRate !== undefined
                  ? {
                      value: data.clientsGrowthRate,
                      label: "new clients vs previous period",
                    }
                  : undefined
              }
            />
            <MetricCard
              title="Batches"
              value={(data?.totalInventoryItems ?? 0).toLocaleString()}
              subtitle="All time · active batches in inventory"
              icon={Package}
              isLoading={isLoading}
            />
            <MetricCard
              title="Payments Received"
              value={formatCurrency(data?.totalPaymentsReceived ?? 0)}
              subtitle="All time · total collected"
              icon={DollarSign}
              isLoading={isLoading}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>
                Revenue and order count over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <LoadingState message="Loading revenue trends..." size="sm" />
              ) : chartData.length > 0 ? (
                <div className="space-y-4">
                  <div
                    className="h-[220px] w-full"
                    role="img"
                    aria-label="Revenue trend bar chart"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          strokeOpacity={0.5}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={formatCompactCurrency}
                          width={64}
                        />
                        <Tooltip
                          cursor={{
                            fill: "hsl(var(--muted))",
                            opacity: 0.3,
                          }}
                          content={<RevenueChartTooltip />}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <RevenueTrendsTable data={chartData} maxRows={6} />
                </div>
              ) : (
                <EmptyState
                  {...emptyStateConfigs.analytics}
                  size="sm"
                  action={{
                    label: "Create your first order",
                    onClick: () =>
                      setLocation(buildSalesWorkspacePath("create-order")),
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sales Analytics</CardTitle>
                <CardDescription>
                  Track sales performance and trends over time
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <LoadingState message="Loading sales data..." size="sm" />
              ) : chartData.length > 0 ? (
                <RevenueTrendsTable data={chartData} />
              ) : (
                <EmptyState
                  variant="analytics"
                  title="No sales data"
                  description="No sales data available for the selected period."
                  size="sm"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Inventory Analytics</CardTitle>
                <CardDescription>
                  Monitor inventory levels and product performance
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                  title="Total Batches"
                  href="/inventory"
                  value={(data?.totalInventoryItems ?? 0).toLocaleString()}
                  subtitle="Active batches in stock"
                  icon={Package}
                  isLoading={isLoading}
                />
                <MetricCard
                  title="Inventory Value"
                  href="/inventory"
                  value={formatCurrency(data?.totalInventoryValue ?? 0)}
                  subtitle="Est. COGS value of on-hand inventory"
                  icon={DollarSign}
                  isLoading={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Clients</CardTitle>
                <CardDescription>
                  Your highest revenue generating clients
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <LoadingState message="Loading top clients..." size="sm" />
              ) : topClients && topClients.length > 0 ? (
                <TopClientsTable clients={topClients} />
              ) : (
                <EmptyState
                  variant="clients"
                  title="No client data"
                  description="No client data available. Start adding clients and orders to see analytics."
                  size="sm"
                  action={{
                    label: "View clients",
                    onClick: () => setLocation("/clients"),
                  }}
                />
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Total Clients"
              href="/clients"
              value={(data?.totalClients ?? 0).toLocaleString()}
              subtitle="All clients in system"
              icon={Users}
              isLoading={isLoading}
            />
            <MetricCard
              title="New Clients"
              value={(data?.newClientsThisPeriod ?? 0).toLocaleString()}
              subtitle={`Added in ${periodLabels[period].toLowerCase()}`}
              icon={Users}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
