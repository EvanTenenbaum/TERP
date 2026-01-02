import { KpiCard } from "@/components/ui/kpi-card";
import { DollarSign, ShoppingCart, Package, AlertTriangle } from "lucide-react";
import { memo } from "react";

interface KpiData {
  totalRevenue: number;
  revenueChange: number;
  activeOrders: number;
  ordersChange: number;
  inventoryValue: number;
  inventoryChange: number;
  lowStockCount: number;
}

interface KpiSummaryRowProps {
  data?: KpiData;
  loading?: boolean;
}

/**
 * KPI Summary Row with clickable cards
 * ACT-001: Cards navigate to relevant pages when clicked
 */
export const KpiSummaryRow = memo(function KpiSummaryRow({ data, loading }: KpiSummaryRowProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total Revenue"
        value={data ? formatCurrency(data.totalRevenue) : "$0"}
        change={
          data
            ? {
                value: data.revenueChange,
                label: "from last month",
              }
            : undefined
        }
        icon={DollarSign}
        trend={
          data
            ? data.revenueChange > 0
              ? "up"
              : data.revenueChange < 0
              ? "down"
              : "neutral"
            : "neutral"
        }
        loading={loading}
        href="/accounting"
      />

      <KpiCard
        title="Active Orders"
        value={data ? formatNumber(data.activeOrders) : "0"}
        change={
          data
            ? {
                value: data.ordersChange,
                label: "from last month",
              }
            : undefined
        }
        icon={ShoppingCart}
        trend={
          data
            ? data.ordersChange > 0
              ? "up"
              : data.ordersChange < 0
              ? "down"
              : "neutral"
            : "neutral"
        }
        loading={loading}
        href="/orders?status=active"
      />

      <KpiCard
        title="Inventory Value"
        value={data ? formatCurrency(data.inventoryValue) : "$0"}
        change={
          data
            ? {
                value: data.inventoryChange,
                label: "from last month",
              }
            : undefined
        }
        icon={Package}
        trend={
          data
            ? data.inventoryChange > 0
              ? "up"
              : data.inventoryChange < 0
              ? "down"
              : "neutral"
            : "neutral"
        }
        loading={loading}
        href="/inventory"
      />

      <KpiCard
        title="Low Stock Alerts"
        value={data ? formatNumber(data.lowStockCount) : "0"}
        icon={AlertTriangle}
        loading={loading}
        href="/inventory?filter=low-stock"
      />
    </div>
  );
});