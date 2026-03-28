import { lazy, Suspense } from "react";
import OrdersWorkSurface from "@/components/work-surface/OrdersWorkSurface";
import QuotesWorkSurface from "@/components/work-surface/QuotesWorkSurface";
import SheetModeToggle from "@/components/spreadsheet-native/SheetModeToggle";
import { PilotSurfaceBoundary } from "@/components/spreadsheet-native/PilotSurfaceBoundary";

const OrdersSheetPilotSurface = lazy(
  () => import("@/components/spreadsheet-native/OrdersSheetPilotSurface")
);
const SalesCatalogueSurface = lazy(
  () => import("@/components/spreadsheet-native/SalesCatalogueSurface")
);
const SalesOrderSurface = lazy(
  () => import("@/components/spreadsheet-native/SalesOrderSurface")
);
const QuotesPilotSurface = lazy(
  () => import("@/components/spreadsheet-native/QuotesPilotSurface")
);
const ReturnsPilotSurface = lazy(
  () => import("@/components/spreadsheet-native/ReturnsPilotSurface")
);
import ReturnsPage from "@/pages/ReturnsPage";
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
  const ordersPilotSupported = activeTab === "orders";
  const { sheetPilotEnabled, availabilityReady } =
    useSpreadsheetPilotAvailability(ordersPilotSupported);
  const { surfaceMode, setSurfaceMode } = useSpreadsheetSurfaceMode(
    buildSurfaceAvailability(
      "orders",
      sheetPilotEnabled,
      availabilityReady && ordersPilotSupported
    )
  );

  const quotesPilotSupported = activeTab === "quotes";
  const {
    sheetPilotEnabled: quotesPilotEnabled,
    availabilityReady: quotesAvailabilityReady,
  } = useSpreadsheetPilotAvailability(quotesPilotSupported);
  const {
    surfaceMode: quotesSurfaceMode,
    setSurfaceMode: setQuotesSurfaceMode,
  } = useSpreadsheetSurfaceMode(
    buildSurfaceAvailability(
      "quotes",
      quotesPilotEnabled,
      quotesAvailabilityReady && quotesPilotSupported
    )
  );

  const returnsPilotSupported = activeTab === "returns";
  const {
    sheetPilotEnabled: returnsPilotEnabled,
    availabilityReady: returnsAvailabilityReady,
  } = useSpreadsheetPilotAvailability(returnsPilotSupported);
  const {
    surfaceMode: returnsSurfaceMode,
    setSurfaceMode: setReturnsSurfaceMode,
  } = useSpreadsheetSurfaceMode(
    buildSurfaceAvailability(
      "returns",
      returnsPilotEnabled,
      returnsAvailabilityReady && returnsPilotSupported
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
        activeTab === "orders" ? (
          <SheetModeToggle
            enabled={sheetPilotEnabled}
            surfaceMode={surfaceMode}
            onSurfaceModeChange={setSurfaceMode}
          />
        ) : activeTab === "quotes" ? (
          <SheetModeToggle
            enabled={quotesPilotEnabled}
            surfaceMode={quotesSurfaceMode}
            onSurfaceModeChange={setQuotesSurfaceMode}
          />
        ) : activeTab === "returns" ? (
          <SheetModeToggle
            enabled={returnsPilotEnabled}
            surfaceMode={returnsSurfaceMode}
            onSurfaceModeChange={setReturnsSurfaceMode}
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
        {quotesPilotEnabled && quotesSurfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<QuotesWorkSurface />}>
            <QuotesPilotSurface
              onOpenClassic={() => setQuotesSurfaceMode("classic")}
            />
          </PilotSurfaceBoundary>
        ) : (
          <QuotesWorkSurface />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="returns">
        {returnsPilotEnabled && returnsSurfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<ReturnsPage embedded />}>
            <ReturnsPilotSurface
              onOpenClassic={() => setReturnsSurfaceMode("classic")}
            />
          </PilotSurfaceBoundary>
        ) : (
          <ReturnsPage embedded />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="sales-sheets">
        <Suspense
          fallback={
            <div className="p-4 text-sm text-muted-foreground">
              Loading catalogue...
            </div>
          }
        >
          <SalesCatalogueSurface />
        </Suspense>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="live-shopping">
        <LiveShoppingPage />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="create-order">
        <Suspense
          fallback={
            <div className="p-4 text-sm text-muted-foreground">
              Loading order...
            </div>
          }
        >
          <SalesOrderSurface />
        </Suspense>
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
