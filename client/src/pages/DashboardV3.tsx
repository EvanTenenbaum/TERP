import { useEffect } from "react";
import { Settings } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
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
} from "@/components/dashboard/widgets-v2";

function DashboardContent() {
  const { widgets, setIsCustomizing } = useDashboardPreferences();

  const visibleWidgets = widgets.filter(w => w.isVisible);

  // Debug logging
  useEffect(() => {
    console.log('Dashboard widgets updated:', {
      total: widgets.length,
      visible: visibleWidgets.length,
      widgets: widgets.map(w => ({ id: w.id, isVisible: w.isVisible }))
    });
  }, [widgets, visibleWidgets]);

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
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Action bar with customize button and comments - no duplicate header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomizing(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Customize Dashboard
            </Button>
          </div>
          <CommentWidget commentableType="dashboard" commentableId={1} />
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
    </DashboardLayout>
  );
}

export default function DashboardV3() {
  return (
    <DashboardPreferencesProvider>
      <DashboardContent />
    </DashboardPreferencesProvider>
  );
}
