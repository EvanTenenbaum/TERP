import { useAuth } from "@/_core/hooks/useAuth";
import {
  SalesByClientWidget,
  TransactionSnapshotWidget,
  InventorySnapshotWidget,
  CashFlowWidget,
  TotalDebtWidget,
  SalesComparisonWidget,
  CashCollectedLeaderboard,
  ClientDebtLeaderboard,
  ClientProfitMarginLeaderboard,
  FreeformNoteWidget,
} from "@/components/dashboard/widgets-v2";
import { DashboardCustomizer } from "@/components/dashboard/DashboardCustomizer";
import { SwipeableWidgetContainer } from "@/components/dashboard/SwipeableWidgetContainer";
import { useWidgetPreferences } from "@/hooks/useWidgetPreferences";

export default function Home() {
  const { user } = useAuth();
  const { widgets, enabledWidgets, savePreferences } = useWidgetPreferences();

  // Map widget IDs to components
  const widgetComponents: Record<string, React.ReactElement> = {
    "freeform-note": <FreeformNoteWidget key="freeform-note" />,
    "sales-by-client": <SalesByClientWidget key="sales-by-client" />,
    "cash-flow": <CashFlowWidget key="cash-flow" />,
    "sales-comparison": <SalesComparisonWidget key="sales-comparison" />,
    "transaction-snapshot": <TransactionSnapshotWidget key="transaction-snapshot" />,
    "inventory-snapshot": <InventorySnapshotWidget key="inventory-snapshot" />,
    "total-debt": <TotalDebtWidget key="total-debt" />,
    "cash-collected-leaderboard": <CashCollectedLeaderboard key="cash-collected-leaderboard" />,
    "client-debt-leaderboard": <ClientDebtLeaderboard key="client-debt-leaderboard" />,
    "client-profit-margin-leaderboard": <ClientProfitMarginLeaderboard key="client-profit-margin-leaderboard" />,
  };

  // Get enabled widget components
  const activeWidgets = enabledWidgets.map((w) => widgetComponents[w.id]).filter(Boolean);

  // Group widgets into rows of 2 for desktop
  const widgetRows: React.ReactElement[][] = [];
  for (let i = 0; i < activeWidgets.length; i += 2) {
    widgetRows.push(activeWidgets.slice(i, i + 2));
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back{user?.name ? `, ${user.name}` : ""}! Your business metrics at a glance.
          </p>
        </div>
        <DashboardCustomizer widgets={widgets} onSave={savePreferences} />
      </div>

      {/* Widgets - Swipeable on mobile, grid on desktop */}
      {activeWidgets.length > 0 ? (
        <div className="space-y-6">
          {widgetRows.map((row, rowIndex) => (
            <SwipeableWidgetContainer key={rowIndex}>
              {row}
            </SwipeableWidgetContainer>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No widgets enabled</p>
          <p className="text-sm mt-2">Click "Customize Dashboard" to add widgets</p>
        </div>
      )}
    </div>
  );
}

