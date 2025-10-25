import { useAuth } from "@/_core/hooks/useAuth";
import {
  SalesByClientWidget,
  TransactionSnapshotWidget,
  InventorySnapshotWidget,
  CashFlowWidget,
  TotalDebtWidget,
  SalesComparisonWidget,
} from "@/components/dashboard/widgets-v2";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user?.name ? `, ${user.name}` : ""}! Your business metrics at a glance.
        </p>
      </div>

      {/* Top Row - Client Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesByClientWidget />
        <CashFlowWidget />
      </div>

      {/* Middle Row - Operations Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TransactionSnapshotWidget />
        <InventorySnapshotWidget />
      </div>

      {/* Bottom Row - Analysis & Debt */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesComparisonWidget />
        <TotalDebtWidget />
      </div>
    </div>
  );
}

