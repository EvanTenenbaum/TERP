import { lazy, Suspense, useMemo } from "react";
import OrdersWorkSurface from "@/components/work-surface/OrdersWorkSurface";
import QuotesWorkSurface from "@/components/work-surface/QuotesWorkSurface";
import SheetModeToggle from "@/components/spreadsheet-native/SheetModeToggle";
import { PilotSurfaceBoundary } from "@/components/spreadsheet-native/PilotSurfaceBoundary";
import { Button } from "@/components/ui/button";

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
const ReturnsPage = lazy(() => import("@/pages/ReturnsPage"));
const LiveShoppingPage = lazy(() => import("@/pages/LiveShoppingPage"));
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { SALES_WORKSPACE } from "@/config/workspaces";
import {
  buildOperationsWorkspacePath,
  buildSalesWorkspacePath,
  buildSheetNativeOrdersDocumentPath,
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
import { WorkspaceCommandStripLink } from "@/components/ui/operational-states";
import { Redirect, useLocation, useSearch } from "wouter";
import { Layers } from "lucide-react";

type BaseSalesTab = (typeof SALES_WORKSPACE.tabs)[number]["value"];
type SalesTab = BaseSalesTab | "create-order";
type SalesQueryTab = SalesTab | "pick-pack";
type PilotSurfaceMode = "classic" | "sheet-native";

const SALES_TABS_CONFIG_BASE = [
  ...SALES_WORKSPACE.tabs,
  { value: "create-order", label: "New Order" },
] as const satisfies readonly LinearWorkspaceTab<SalesTab>[];

const SALES_TABS = SALES_TABS_CONFIG_BASE.map(
  tab => tab.value
) as readonly SalesTab[];

const ORDER_DOCUMENT_PARAM_KEYS = [
  "orderId",
  "draftId",
  "quoteId",
  "clientId",
  "needId",
  "mode",
  "fromSalesSheet",
] as const;

const CLASSIC_ORDER_CONTEXT_PARAM_KEYS = [
  "clientId",
  "needId",
  "fromSalesSheet",
] as const;

const CLASSIC_ORDER_FALLBACK_PARAM_KEYS = ["clientId"] as const;

const CLASSIC_DOCUMENT_FALLBACK_PARAM_KEYS = [
  "draftId",
  "quoteId",
  "clientId",
  "needId",
  "mode",
  "fromSalesSheet",
] as const;

const SHIPPING_REDIRECT_PARAM_KEYS = ["orderId"] as const;

function pickParams<const TKeys extends readonly string[]>(
  searchParams: URLSearchParams,
  keys: TKeys
) {
  return Object.fromEntries(
    keys.flatMap(key => {
      const value = searchParams.get(key);
      return value ? [[key, value]] : [];
    })
  );
}

function shouldRenderPilotSurface(
  enabled: boolean,
  surfaceMode: PilotSurfaceMode,
  force = false
) {
  return enabled && (surfaceMode === "sheet-native" || force);
}

export default function SalesWorkspacePage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const { activeTab, setActiveTab } = useQueryTabState<SalesQueryTab>({
    defaultTab: "orders",
    validTabs: [...SALES_TABS, "pick-pack"],
  });
  const classicOrderContextParams = useMemo(
    () => pickParams(searchParams, CLASSIC_ORDER_CONTEXT_PARAM_KEYS),
    [searchParams]
  );
  const classicOrderFallbackParams = useMemo(
    () => pickParams(searchParams, CLASSIC_ORDER_FALLBACK_PARAM_KEYS),
    [searchParams]
  );
  const pickPackRedirectParams = useMemo(
    () => pickParams(searchParams, SHIPPING_REDIRECT_PARAM_KEYS),
    [searchParams]
  );
  const classicDocumentFallbackParams = useMemo(
    () => pickParams(searchParams, CLASSIC_DOCUMENT_FALLBACK_PARAM_KEYS),
    [searchParams]
  );
  const shouldRedirectSalesSheetsDocumentIntent = useMemo(
    () =>
      searchParams.get("tab") === "sales-sheets" &&
      (searchParams.get("ordersView") === "document" ||
        searchParams.has("draftId") ||
        searchParams.has("quoteId") ||
        searchParams.has("needId") ||
        searchParams.get("fromSalesSheet") === "true"),
    [searchParams]
  );
  const salesSheetsDocumentRedirect = useMemo(
    () =>
      shouldRedirectSalesSheetsDocumentIntent
        ? buildSheetNativeOrdersDocumentPath(
            pickParams(searchParams, ORDER_DOCUMENT_PARAM_KEYS)
          )
        : null,
    [searchParams, shouldRedirectSalesSheetsDocumentIntent]
  );
  const shouldForceSheetNativeOrdersSurface = useMemo(
    () =>
      searchParams.get("tab") === "orders" &&
      (searchParams.get("ordersView") === "document" ||
        searchParams.has("draftId") ||
        searchParams.has("quoteId") ||
        searchParams.has("needId") ||
        searchParams.get("fromSalesSheet") === "true"),
    [searchParams]
  );

  // BUG-008: When mode=quote is in the URL (from "New Quote" action),
  // relabel the create-order tab to "New Quote" so users understand context.
  const isQuoteMode =
    activeTab === "create-order" && searchParams.get("mode") === "quote";
  const SALES_TABS_CONFIG: readonly LinearWorkspaceTab<SalesTab>[] = useMemo(
    () =>
      isQuoteMode
        ? SALES_TABS_CONFIG_BASE.map(tab =>
            tab.value === "create-order" ? { ...tab, label: "New Quote" } : tab
          )
        : SALES_TABS_CONFIG_BASE,
    [isQuoteMode]
  );
  // Orders / create-order pilot (separate from sales-sheets to prevent cross-tab surfaceMode bleed)
  const ordersPilotSupported = activeTab === "orders";
  const { sheetPilotEnabled, availabilityReady } =
    useSpreadsheetPilotAvailability(ordersPilotSupported);
  const ordersPilotReady =
    sheetPilotEnabled && availabilityReady && ordersPilotSupported;
  const shouldShowOrdersPilotLoading =
    ordersPilotSupported &&
    shouldForceSheetNativeOrdersSurface &&
    !availabilityReady;
  const classicOrdersDocumentFallback = useMemo(() => {
    if (
      !shouldForceSheetNativeOrdersSurface ||
      !availabilityReady ||
      sheetPilotEnabled
    ) {
      return null;
    }

    const orderId = searchParams.get("orderId");
    if (orderId) {
      return buildSalesWorkspacePath("orders", {
        ...classicOrderFallbackParams,
        orderId,
      });
    }

    return buildSalesWorkspacePath(
      "create-order",
      classicDocumentFallbackParams
    );
  }, [
    availabilityReady,
    classicDocumentFallbackParams,
    classicOrderFallbackParams,
    searchParams,
    sheetPilotEnabled,
    shouldForceSheetNativeOrdersSurface,
  ]);
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
  const quotesPilotReady =
    quotesPilotEnabled && quotesAvailabilityReady && quotesPilotSupported;
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
  const returnsPilotReady =
    returnsPilotEnabled && returnsAvailabilityReady && returnsPilotSupported;
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

  const telemetryTab = shouldRedirectSalesSheetsDocumentIntent
    ? "sales-sheets-document-redirect"
    : activeTab === "pick-pack"
      ? "pick-pack-redirect"
      : activeTab;
  const returnsFallback = useMemo(
    () => (
      <Suspense
        fallback={
          <div className="p-4 text-sm text-muted-foreground">
            Loading returns...
          </div>
        }
      >
        <ReturnsPage embedded />
      </Suspense>
    ),
    []
  );

  useWorkspaceHomeTelemetry("sales", telemetryTab);

  if (salesSheetsDocumentRedirect) {
    return <Redirect to={salesSheetsDocumentRedirect} />;
  }

  if (classicOrdersDocumentFallback) {
    return <Redirect to={classicOrdersDocumentFallback} />;
  }

  if (activeTab === "pick-pack") {
    return (
      <Redirect
        to={buildOperationsWorkspacePath("shipping", pickPackRedirectParams)}
      />
    );
  }

  const commandStripToggle =
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
    ) : null;
  const shouldShowCommandStrip =
    commandStripToggle !== null || activeTab !== "sales-sheets";

  return (
    <LinearWorkspaceShell
      title={SALES_WORKSPACE.title}
      description={SALES_WORKSPACE.description}
      section="Sell"
      density="compact"
      activeTab={activeTab}
      tabs={SALES_TABS_CONFIG}
      onTabChange={tab => setActiveTab(tab)}
      meta={[
        {
          label: "Action lane",
          value:
            activeTab === "orders"
              ? "Quotes -> confirm -> collect"
              : activeTab === "returns"
                ? "Returns and resolution"
                : "Outbound sales coordination",
        },
        {
          label: "Primary queue",
          value:
            activeTab === "orders"
              ? "Confirmed orders"
              : activeTab === "quotes"
                ? "Quote follow-up"
                : activeTab === "sales-sheets"
                  ? "Shareable catalogue"
                  : "Operator workspace",
        },
      ]}
      commandStrip={
        shouldShowCommandStrip ? (
          <div className="flex flex-wrap items-center gap-2">
            {commandStripToggle}
            <WorkspaceCommandStripLink
              label="Sales Catalogue"
              onClick={() => setActiveTab("sales-sheets")}
              active={activeTab === "sales-sheets"}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={() => setActiveTab("create-order")}
              disabled={activeTab === "create-order"}
              aria-label="Open order composer"
            >
              <Layers className="mr-1 h-3 w-3" />
              Order Composer
            </Button>
          </div>
        ) : null
      }
    >
      <LinearWorkspacePanel value="orders">
        {shouldShowOrdersPilotLoading ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            Loading orders document...
          </div>
        ) : shouldRenderPilotSurface(
            ordersPilotReady,
            surfaceMode,
            shouldForceSheetNativeOrdersSurface
          ) ? (
          <Suspense
            fallback={
              <div className="p-4 text-sm text-muted-foreground">
                Loading orders...
              </div>
            }
          >
            <PilotSurfaceBoundary fallback={<OrdersWorkSurface />}>
              <OrdersSheetPilotSurface
                onOpenClassic={orderId =>
                  setLocation(
                    buildSalesWorkspacePath("orders", {
                      ...classicOrderContextParams,
                      orderId: orderId ?? undefined,
                    })
                  )
                }
              />
            </PilotSurfaceBoundary>
          </Suspense>
        ) : (
          <OrdersWorkSurface />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="quotes">
        {shouldRenderPilotSurface(quotesPilotReady, quotesSurfaceMode) ? (
          <Suspense
            fallback={
              <div className="p-4 text-sm text-muted-foreground">
                Loading quotes...
              </div>
            }
          >
            <PilotSurfaceBoundary fallback={<QuotesWorkSurface />}>
              <QuotesPilotSurface
                onOpenClassic={() => setQuotesSurfaceMode("classic")}
              />
            </PilotSurfaceBoundary>
          </Suspense>
        ) : (
          <QuotesWorkSurface />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="returns">
        {shouldRenderPilotSurface(returnsPilotReady, returnsSurfaceMode) ? (
          <Suspense
            fallback={
              <div className="p-4 text-sm text-muted-foreground">
                Loading returns...
              </div>
            }
          >
            <PilotSurfaceBoundary fallback={returnsFallback}>
              <ReturnsPilotSurface
                onOpenClassic={() => setReturnsSurfaceMode("classic")}
              />
            </PilotSurfaceBoundary>
          </Suspense>
        ) : (
          returnsFallback
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
        <Suspense
          fallback={
            <div className="p-4 text-sm text-muted-foreground">
              Loading live shopping...
            </div>
          }
        >
          <LiveShoppingPage />
        </Suspense>
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
