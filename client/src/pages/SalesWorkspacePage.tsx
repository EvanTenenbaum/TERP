import OrdersWorkSurface from "@/components/work-surface/OrdersWorkSurface";
import QuotesWorkSurface from "@/components/work-surface/QuotesWorkSurface";
import OrdersSheetPilotSurface from "@/components/spreadsheet-native/OrdersSheetPilotSurface";
import ReturnsPage from "@/pages/ReturnsPage";
import OrderCreatorPage from "@/pages/OrderCreatorPage";
import SalesSheetCreatorPage from "@/pages/SalesSheetCreatorPage";
import LiveShoppingPage from "@/pages/LiveShoppingPage";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { SALES_WORKSPACE } from "@/config/workspaces";
import {
  buildOperationsWorkspacePath,
  buildSalesWorkspacePath,
} from "@/lib/workspaceRoutes";
import {
  useSpreadsheetPilotAvailability,
  useSpreadsheetSurfaceMode,
} from "@/lib/spreadsheet-native";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
  type LinearWorkspaceTab,
} from "@/components/layout/LinearWorkspaceShell";
import { Redirect, useLocation, useSearch } from "wouter";

type BaseSalesTab = (typeof SALES_WORKSPACE.tabs)[number]["value"];
type SalesTab = BaseSalesTab | "create-order";
type SalesQueryTab = SalesTab | "pick-pack";

const SALES_TABS_CONFIG = [
  ...SALES_WORKSPACE.tabs,
  { value: "create-order", label: "New Sales Order" },
] as const satisfies readonly LinearWorkspaceTab<SalesTab>[];

const SALES_TABS = SALES_TABS_CONFIG.map(
  tab => tab.value
) as readonly SalesTab[];

export default function SalesWorkspacePage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { activeTab, setActiveTab } = useQueryTabState<SalesQueryTab>({
    defaultTab: "orders",
    validTabs: [...SALES_TABS, "pick-pack"],
  });
  const redirectParams = Object.fromEntries(
    Array.from(new URLSearchParams(search).entries()).filter(
      ([key]) => key !== "tab"
    )
  );
  const pilotSurfaceSupported = activeTab === "orders";
  const { sheetPilotEnabled, availabilityReady } =
    useSpreadsheetPilotAvailability(pilotSurfaceSupported);
  const { surfaceMode } = useSpreadsheetSurfaceMode({
    enabled: sheetPilotEnabled,
    ready: availabilityReady,
  });
  useWorkspaceHomeTelemetry("sales", activeTab);

  if (activeTab === "pick-pack") {
    return (
      <Redirect to={buildOperationsWorkspacePath("shipping", redirectParams)} />
    );
  }

  return (
    <LinearWorkspaceShell
      title={SALES_WORKSPACE.title}
      description={SALES_WORKSPACE.description}
      section="Sell"
      activeTab={activeTab}
      tabs={SALES_TABS_CONFIG}
      onTabChange={tab => setActiveTab(tab)}
      meta={[{ label: "Primary flow", value: "Quote -> Order -> Shipping" }]}
    >
      <LinearWorkspacePanel value="orders">
        {surfaceMode === "sheet-native" ? (
          <OrdersSheetPilotSurface
            onOpenClassic={orderId =>
              setLocation(
                buildSalesWorkspacePath("orders", {
                  orderId: orderId ?? undefined,
                })
              )
            }
          />
        ) : (
          <OrdersWorkSurface />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="quotes">
        <QuotesWorkSurface />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="returns">
        <ReturnsPage embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="sales-sheets">
        <SalesSheetCreatorPage embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="live-shopping">
        <LiveShoppingPage />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="create-order">
        <OrderCreatorPage />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
