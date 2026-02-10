import { Settings } from "lucide-react";
import {
  DashboardPreferencesProvider,
  useDashboardPreferences,
} from "@/contexts/DashboardPreferencesContext";
import { DashboardLayoutManager } from "@/components/dashboard/v3/DashboardLayoutManager";
import { CustomizationPanel } from "@/components/dashboard/v3/CustomizationPanel";
import { CommentWidget } from "@/components/comments/CommentWidget";
import { InboxWidget } from "@/components/inbox/InboxWidget";
import { Button } from "@/components/ui/button";

// Import v2 widgets (v3 widgets are being migrated)
import {
  SalesByClientWidget,
  CashFlowWidget,
  TransactionSnapshotWidget,
  InventorySnapshotWidget,
  TotalDebtWidget,
  SalesComparisonWidget,
  ProfitabilityWidget,
  MatchmakingOpportunitiesWidget,
  WorkflowQueueWidget,
  WorkflowActivityWidget,
  AvailableCashWidget,
  // FE-QA-011: Integrate unused dashboard widgets
  CashCollectedLeaderboard,
  ClientDebtLeaderboard,
  ClientProfitMarginLeaderboard,
  TopStrainFamiliesWidget,
  AgingInventoryWidget,
  SmartOpportunitiesWidget,
} from "@/components/dashboard/widgets-v2";

function DashboardContent() {
  const { widgets, setIsCustomizing } = useDashboardPreferences();

  const visibleWidgets = widgets.filter(w => w.isVisible);

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case "sales-by-client":
        return <SalesByClientWidget key={widgetId} />;
      case "cash-flow":
        return <CashFlowWidget key={widgetId} />;
      case "transaction-snapshot":
        return <TransactionSnapshotWidget key={widgetId} />;
      case "inventory-snapshot":
        return <InventorySnapshotWidget key={widgetId} />;
      case "total-debt":
        return <TotalDebtWidget key={widgetId} />;
      case "sales-comparison":
        return <SalesComparisonWidget key={widgetId} />;
      case "profitability":
        return <ProfitabilityWidget key={widgetId} />;
      case "matchmaking-opportunities":
        return <MatchmakingOpportunitiesWidget key={widgetId} />;
      case "inbox":
        return <InboxWidget key={widgetId} />;
      case "workflow-queue":
        return <WorkflowQueueWidget key={widgetId} />;
      case "workflow-activity":
        return <WorkflowActivityWidget key={widgetId} />;
      case "available-cash":
        return <AvailableCashWidget key={widgetId} />;
      // FE-QA-011: Integrate unused dashboard widgets
      case "cash-collected-leaderboard":
        return <CashCollectedLeaderboard key={widgetId} />;
      case "client-debt-leaderboard":
        return <ClientDebtLeaderboard key={widgetId} />;
      case "client-profit-margin-leaderboard":
        return <ClientProfitMarginLeaderboard key={widgetId} />;
      case "top-strain-families":
        return <TopStrainFamiliesWidget key={widgetId} />;
      case "aging-inventory":
        return <AgingInventoryWidget key={widgetId} />;
      case "smart-opportunities":
        return <SmartOpportunitiesWidget key={widgetId} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight text-foreground">
            Owner Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Start-of-day view for inventory risk, payables, cash, and client
            follow-up
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomizing(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Customize
          </Button>
          <CommentWidget commentableType="dashboard" commentableId={1} />
        </div>
      </div>

      <DashboardLayoutManager>
        {visibleWidgets.map(widget => (
          <div
            key={widget.id}
            className={`
              ${widget.size === "sm" ? "col-span-1 md:col-span-4 lg:col-span-4" : ""}
              ${widget.size === "md" ? "col-span-1 md:col-span-4 lg:col-span-6" : ""}
              ${widget.size === "lg" ? "col-span-1 md:col-span-8 lg:col-span-8" : ""}
              ${widget.size === "xl" ? "col-span-1 md:col-span-8 lg:col-span-12" : ""}
              ${!widget.size ? "col-span-1 md:col-span-4 lg:col-span-6" : ""}
            `}
          >
            {renderWidget(widget.id)}
          </div>
        ))}
      </DashboardLayoutManager>

      <CustomizationPanel />
    </div>
  );
}

export default function DashboardV3() {
  return (
    <DashboardPreferencesProvider>
      <DashboardContent />
    </DashboardPreferencesProvider>
  );
}
