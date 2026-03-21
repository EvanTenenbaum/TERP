import { lazy } from "react";
import OrdersWorkSurface from "@/components/work-surface/OrdersWorkSurface";
import QuotesWorkSurface from "@/components/work-surface/QuotesWorkSurface";
import SheetModeToggle from "@/components/spreadsheet-native/SheetModeToggle";
import { PilotSurfaceBoundary } from "@/components/spreadsheet-native/PilotSurfaceBoundary";

const OrdersSheetPilotSurface = lazy(
  () => import("@/components/spreadsheet-native/OrdersSheetPilotSurface")
);
const SalesSheetsPilotSurface = lazy(
  () => import("@/components/spreadsheet-native/SalesSheetsPilotSurface")
);
const QuotesPilotSurface = lazy(
  () => import("@/components/spreadsheet-native/QuotesPilotSurface")
);
const ReturnsPilotSurface = lazy(
  () => import("@/components/spreadsheet-native/ReturnsPilotSurface")
);
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
  buildSurfaceAvailability,
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
      ([key]) => key !== "tab" && key !== "classic"
    )
  );
  const pilotSurfaceSupported =
    activeTab === "orders" ||
    activeTab === "create-order" ||
    activeTab === "sales-sheets";
  const { sheetPilotEnabled, availabilityReady } =
    useSpreadsheetPilotAvailability(pilotSurfaceSupported);
  const { surfaceMode, setSurfaceMode } = useSpreadsheetSurfaceMode(
    buildSurfaceAvailability(activeTab, sheetPilotEnabled, availabilityReady)
  );
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
      commandStrip={
        activeTab === "orders" ||
        activeTab === "create-order" ||
        activeTab === "sales-sheets" ? (
          <SheetModeToggle
            enabled={sheetPilotEnabled}
            surfaceMode={surfaceMode}
            onSurfaceModeChange={setSurfaceMode}
          />
        ) : null
      }
    >
      <LinearWorkspacePanel value="orders">
        {surfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<OrdersWorkSurface />}>
            <OrdersSheetPilotSurface
              onOpenClassic={orderId =>
                setLocation(
                  buildSalesWorkspacePath("orders", {
                    orderId: orderId ?? undefined,
                  })
                )
              }
            />
          </PilotSurfaceBoundary>
        ) : (
          <OrdersWorkSurface />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="quotes">
        {sheetPilotEnabled && surfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<QuotesWorkSurface />}>
            <QuotesPilotSurface
              onOpenClassic={() => setSurfaceMode("classic")}
            />
          </PilotSurfaceBoundary>
        ) : (
          <QuotesWorkSurface />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="returns">
        {sheetPilotEnabled && surfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<ReturnsPage embedded />}>
            <ReturnsPilotSurface
              onOpenClassic={() => setSurfaceMode("classic")}
            />
          </PilotSurfaceBoundary>
        ) : (
          <ReturnsPage embedded />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="sales-sheets">
        {sheetPilotEnabled && surfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<SalesSheetCreatorPage embedded />}>
            <SalesSheetsPilotSurface
              onOpenClassic={() =>
                setLocation(buildSalesWorkspacePath("sales-sheets"))
              }
            />
          </PilotSurfaceBoundary>
        ) : (
          <SalesSheetCreatorPage embedded />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="live-shopping">
        <LiveShoppingPage />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="create-order">
        {sheetPilotEnabled && surfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<OrderCreatorPage />}>
            <OrdersSheetPilotSurface
              forceDocumentMode
              onOpenClassic={orderId =>
                setLocation(
                  buildSalesWorkspacePath("create-order", {
                    orderId: orderId ?? undefined,
                  })
                )
              }
            />
          </PilotSurfaceBoundary>
        ) : (
          <OrderCreatorPage />
        )}
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
