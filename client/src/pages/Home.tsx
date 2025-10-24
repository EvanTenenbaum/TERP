import { useAuth } from "@/_core/hooks/useAuth";
import { KpiSummaryRow } from "@/components/dashboard/KpiSummaryRow";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { RecentQuotesWidget } from "@/components/dashboard/widgets/RecentQuotesWidget";
import { QuickActionsWidget } from "@/components/dashboard/widgets/QuickActionsWidget";
import { InventoryAlertsWidget } from "@/components/dashboard/widgets/InventoryAlertsWidget";
import { RevenueChartWidget } from "@/components/dashboard/widgets/RevenueChartWidget";

export default function Home() {
  const { user, loading, error, isAuthenticated } = useAuth();

  // Mock KPI data - in production, this would come from tRPC
  const kpiData = {
    totalRevenue: 127500,
    revenueChange: 18,
    activeOrders: 18,
    ordersChange: 8,
    inventoryValue: 342000,
    inventoryChange: 5,
    lowStockCount: 3,
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
      <KpiSummaryRow data={kpiData} loading={loading} />

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

