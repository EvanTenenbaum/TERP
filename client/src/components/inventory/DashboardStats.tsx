import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, Package, Clock } from "lucide-react";

interface DashboardStatsProps {
  totalInventoryValue: number;
  avgValuePerUnit: number;
  totalUnits: number;
  awaitingIntakeCount: number;
  lowStockCount: number;
  onFilterChange: (filter: string | null) => void;
  activeFilter: string | null;
}

export function DashboardStats({
  totalInventoryValue,
  avgValuePerUnit,
  totalUnits,
  awaitingIntakeCount,
  lowStockCount,
  onFilterChange,
  activeFilter,
}: DashboardStatsProps) {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format currency with decimals
  const formatCurrencyDetailed = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format units
  const formatUnits = (units: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(units);
  };

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Inventory Value */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Inventory Value</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalInventoryValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatUnits(totalUnits)} total units
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-green-600" />
        </div>
      </Card>

      {/* Inventory Value per Unit */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avg Value per Unit</p>
            <p className="text-2xl font-bold mt-1">{formatCurrencyDetailed(avgValuePerUnit)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Average COGS
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-blue-600" />
        </div>
      </Card>

      {/* Batches Awaiting Intake */}
      <Card 
        className={`p-6 cursor-pointer transition-colors ${
          activeFilter === "AWAITING_INTAKE" 
            ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500" 
            : "hover:bg-muted/50"
        }`}
        onClick={() => onFilterChange(activeFilter === "AWAITING_INTAKE" ? null : "AWAITING_INTAKE")}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Awaiting Intake</p>
            <p className="text-2xl font-bold mt-1">{awaitingIntakeCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {awaitingIntakeCount === 1 ? "batch" : "batches"} pending
            </p>
          </div>
          <Clock className="h-8 w-8 text-orange-600" />
        </div>
      </Card>

      {/* Low Stock Items */}
      <Card 
        className={`p-6 cursor-pointer transition-colors ${
          activeFilter === "LOW_STOCK" 
            ? "bg-purple-50 border-purple-300 ring-2 ring-purple-500" 
            : "hover:bg-muted/50"
        }`}
        onClick={() => onFilterChange(activeFilter === "LOW_STOCK" ? null : "LOW_STOCK")}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
            <p className="text-2xl font-bold mt-1">{lowStockCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ≤100 units available
            </p>
          </div>
          <Package className="h-8 w-8 text-purple-600" />
        </div>
      </Card>
    </div>
  );
}

