import { KpiCard } from "@/components/ui/kpi-card";
import { DollarSign, ShoppingCart, Package, AlertTriangle } from "lucide-react";

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

export function KpiSummaryRow({ data, loading }: KpiSummaryRowProps) {
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
      />

      <KpiCard
        title="Low Stock Alerts"
        value={data ? formatNumber(data.lowStockCount) : "0"}
        icon={AlertTriangle}
        loading={loading}
      />
    </div>
  );
}

