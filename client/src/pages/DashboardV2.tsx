import DashboardLayout from "@/components/DashboardLayout";
import {
  SalesByClientWidget,
  TransactionSnapshotWidget,
  InventorySnapshotWidget,
  CashFlowWidget,
  TotalDebtWidget,
  SalesComparisonWidget,
  FreeformNoteWidget,
  MatchmakingOpportunitiesWidget,
} from "@/components/dashboard/widgets-v2";
import { ProfitabilityWidget } from "@/components/dashboard/widgets-v2/ProfitabilityWidget";

export default function DashboardV2() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your business metrics at a glance
          </p>
        </div>

        {/* Top Row - Client Analytics (Excel Screenshot 1) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesByClientWidget />
          <CashFlowWidget />
        </div>

        {/* Middle Row - Operations Dashboard (Excel Screenshot 2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionSnapshotWidget />
          <InventorySnapshotWidget />
        </div>

        {/* Bottom Row - Analysis & Debt */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesComparisonWidget />
          <TotalDebtWidget />
        </div>

        {/* Profitability Row */}
        <div className="grid grid-cols-1 gap-6">
          <ProfitabilityWidget />
        </div>

        {/* Matchmaking Opportunities Row */}
        <div className="grid grid-cols-1 gap-6">
          <MatchmakingOpportunitiesWidget />
        </div>

        {/* Freeform Note Widget - Full Width */}
        <div className="grid grid-cols-1 gap-6">
          <div className="h-[600px]">
            <FreeformNoteWidget />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
