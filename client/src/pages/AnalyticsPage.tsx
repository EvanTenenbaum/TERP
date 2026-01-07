import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, Package, AlertCircle, Loader2, Download, DollarSign, CreditCard, Percent, Calendar } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { MetricCard, TopClientsTable, RevenueTrendsTable } from "@/components/analytics";
import { ErrorState, EmptyState, emptyStateConfigs } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useLocation } from "wouter";

type Period = "day" | "week" | "month" | "quarter" | "year" | "all";

const periodLabels: Record<Period, string> = {
  day: "Last 24 Hours",
  week: "Last 7 Days",
  month: "Last 30 Days",
  quarter: "Last 90 Days",
  year: "Last Year",
  all: "All Time",
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [, setLocation] = useLocation();

  const { data, isLoading, error, refetch } = trpc.analytics.getExtendedSummary.useQuery({ period });
  const { data: revenueTrends, isLoading: trendsLoading } = trpc.analytics.getRevenueTrends.useQuery({
    granularity: period === "day" || period === "week" ? "day" : "month",
    limit: 12,
  });
  const { data: topClients, isLoading: clientsLoading } = trpc.analytics.getTopClients.useQuery({
    limit: 10,
    sortBy: "revenue",
  });

  const exportMutation = trpc.analytics.exportData.useMutation({
    onSuccess: (result) => {
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

  const handleExport = (type: "summary" | "revenue" | "clients" | "inventory", format: "csv" | "json" = "csv") => {
    exportMutation.mutate({ type, format });
  };

  const chartData = useMemo(() => {
    if (!revenueTrends) return [];
    return revenueTrends.map((t) => ({ name: t.period, revenue: t.revenue, orders: t.orderCount }));
  }, [revenueTrends]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Business intelligence and insights for your operations</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => handleExport("summary", "csv")} disabled={exportMutation.isPending}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
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
                description={error.message || "An error occurred while loading analytics data."}
                onRetry={() => refetch()}
              />
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Revenue" href="/accounting" value={formatCurrency(data?.totalRevenue ?? 0)} subtitle="Total from all orders" icon={DollarSign} isLoading={isLoading} />
            <MetricCard title="Period Revenue" value={formatCurrency(data?.revenueThisPeriod ?? 0)} icon={BarChart3} isLoading={isLoading}
              trend={data?.growthRate !== undefined ? { value: data.growthRate, label: "vs previous period" } : undefined} />
            <MetricCard title="Avg Order Value" value={formatCurrency(data?.averageOrderValue ?? 0)} subtitle="Average per order" icon={CreditCard} isLoading={isLoading} />
            <MetricCard title="Outstanding Balance" value={formatCurrency(data?.outstandingBalance ?? 0)} subtitle="Unpaid invoices" icon={Percent} isLoading={isLoading} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Orders" href="/orders" value={(data?.totalOrders ?? 0).toLocaleString()} subtitle={`${data?.ordersThisPeriod ?? 0} this period`} icon={TrendingUp} isLoading={isLoading} />
            <MetricCard title="Active Clients" value={(data?.totalClients ?? 0).toLocaleString()} subtitle={`${data?.newClientsThisPeriod ?? 0} new this period`} icon={Users} isLoading={isLoading} />
            <MetricCard title="Inventory Items" value={(data?.totalInventoryItems ?? 0).toLocaleString()} subtitle="Active batches in inventory" icon={Package} isLoading={isLoading} />
            <MetricCard title="Payments Received" value={formatCurrency(data?.totalPaymentsReceived ?? 0)} subtitle="Total collected" icon={DollarSign} isLoading={isLoading} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Revenue and order count over time</CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <LoadingState message="Loading revenue trends..." size="sm" />
              ) : chartData.length > 0 ? (
                <div className="space-y-4">
                  <RevenueTrendsTable data={chartData} maxRows={6} />
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleExport("revenue", "csv")} disabled={exportMutation.isPending}>
                      <Download className="h-4 w-4 mr-2" />Export Revenue Data
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  {...emptyStateConfigs.analytics}
                  size="sm"
                  action={{
                    label: "Create your first order",
                    onClick: () => setLocation("/orders/new"),
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
                <CardDescription>Track sales performance and trends over time</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport("revenue", "csv")} disabled={exportMutation.isPending}>
                <Download className="h-4 w-4 mr-2" />Export
              </Button>
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
                <CardDescription>Monitor inventory levels and product performance</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport("inventory", "csv")} disabled={exportMutation.isPending}>
                <Download className="h-4 w-4 mr-2" />Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard title="Total Inventory Items" value={(data?.totalInventoryItems ?? 0).toLocaleString()} subtitle="Active batches in stock" icon={Package} isLoading={isLoading} />
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inventory Value</CardTitle></CardHeader>
                  <CardContent>
                    <Package className="h-6 w-6 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Export inventory data for detailed analysis</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Clients</CardTitle>
                <CardDescription>Your highest revenue generating clients</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport("clients", "csv")} disabled={exportMutation.isPending}>
                <Download className="h-4 w-4 mr-2" />Export
              </Button>
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
                    label: "Add your first client",
                    onClick: () => setLocation("/clients/new"),
                  }}
                />
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard title="Total Clients" href="/clients" value={(data?.totalClients ?? 0).toLocaleString()} subtitle="All clients in system" icon={Users} isLoading={isLoading} />
            <MetricCard title="New Clients" value={(data?.newClientsThisPeriod ?? 0).toLocaleString()} subtitle={`Added in ${periodLabels[period].toLowerCase()}`} icon={Users} isLoading={isLoading} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
