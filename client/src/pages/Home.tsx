import { useAuth } from "@/_core/hooks/useAuth";
import { KpiSummaryRow } from "@/components/dashboard/KpiSummaryRow";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { RecentQuotesWidget } from "@/components/dashboard/widgets/RecentQuotesWidget";
import { QuickActionsWidget } from "@/components/dashboard/widgets/QuickActionsWidget";
import { InventoryAlertsWidget } from "@/components/dashboard/widgets/InventoryAlertsWidget";
import { RevenueChartWidget } from "@/components/dashboard/widgets/RevenueChartWidget";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, loading, error, isAuthenticated } = useAuth();

  // Fetch real KPI data from tRPC
  const { data: kpiData, isLoading: kpisLoading } = trpc.dashboard.getKpis.useQuery();

  // Default values while loading
  const displayKpiData = kpiData || {
    totalRevenue: 0,
    revenueChange: 0,
    activeOrders: 0,
    ordersChange: 0,
    inventoryValue: 0,
    inventoryChange: 0,
    lowStockCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user?.name ? `, ${user.name}` : ""}! Here's an overview of your business.
        </p>
      </div>

      {/* KPI Summary Row */}
      <KpiSummaryRow data={displayKpiData} loading={loading || kpisLoading} />

      {/* Dashboard Widgets */}
      <DashboardGrid columns={2}>
        <RecentQuotesWidget />
        <QuickActionsWidget />
        <InventoryAlertsWidget />
        <RevenueChartWidget />
      </DashboardGrid>
    </div>
  );
}

