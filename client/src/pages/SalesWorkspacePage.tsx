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

const SALES_TABS_CONFIG_BASE = [
  ...SALES_WORKSPACE.tabs,
  { value: "create-order", label: "Create Order" },
] as const satisfies readonly LinearWorkspaceTab<SalesTab>[];

const SALES_TABS = SALES_TABS_CONFIG_BASE.map(
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

  // BUG-008: When mode=quote is in the URL (from "New Quote" action),
  // relabel the create-order tab to "New Quote" so users understand context.
  const isQuoteMode =
    activeTab === "create-order" &&
    new URLSearchParams(search).get("mode") === "quote";
  const SALES_TABS_CONFIG: readonly LinearWorkspaceTab<SalesTab>[] = isQuoteMode
    ? SALES_TABS_CONFIG_BASE.map(tab =>
        tab.value === "create-order" ? { ...tab, label: "New Quote" } : tab
      )
    : SALES_TABS_CONFIG_BASE;
  // Orders / create-order pilot (separate from sales-sheets to prevent cross-tab surfaceMode bleed)
  const ordersPilotSupported =
    activeTab === "orders" || activeTab === "create-order";
  const { sheetPilotEnabled, availabilityReady } =
    useSpreadsheetPilotAvailability(ordersPilotSupported);
  const { surfaceMode, setSurfaceMode } = useSpreadsheetSurfaceMode(
    buildSurfaceAvailability(activeTab, sheetPilotEnabled, availabilityReady)
  );

  // Sales-sheets pilot — independent surface mode so orders default (sheet-native) doesn't bleed in
  const salesSheetsPilotSupported = activeTab === "sales-sheets";
  const {
    sheetPilotEnabled: salesSheetsPilotEnabled,
    availabilityReady: salesSheetsAvailabilityReady,
  } = useSpreadsheetPilotAvailability(salesSheetsPilotSupported);
  const {
    surfaceMode: salesSheetsSurfaceMode,
    setSurfaceMode: setSalesSheetsSurfaceMode,
  } = useSpreadsheetSurfaceMode(
    buildSurfaceAvailability(
      "sales-sheets",
      salesSheetsPilotEnabled,
      salesSheetsAvailabilityReady && salesSheetsPilotSupported
    )
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
        activeTab === "orders" || activeTab === "create-order" ? (
          <SheetModeToggle
            enabled={sheetPilotEnabled}
            surfaceMode={surfaceMode}
            onSurfaceModeChange={setSurfaceMode}
          />
        ) : activeTab === "sales-sheets" ? (
          <SheetModeToggle
            enabled={salesSheetsPilotEnabled}
            surfaceMode={salesSheetsSurfaceMode}
            onSurfaceModeChange={setSalesSheetsSurfaceMode}
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
        {salesSheetsPilotEnabled &&
        salesSheetsSurfaceMode === "sheet-native" ? (
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
