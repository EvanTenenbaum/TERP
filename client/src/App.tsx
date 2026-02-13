import {
  lazy,
  Suspense,
  type FC,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import DashboardHomePage from "./pages/DashboardHomePage";
import UsersPage from "@/pages/UsersPage";
import { AppShell } from "./components/layout/AppShell";
import Settings from "@/pages/Settings";
import AccountingDashboard from "@/pages/accounting/AccountingDashboard";
import ChartOfAccounts from "@/pages/accounting/ChartOfAccounts";
import GeneralLedger from "@/pages/accounting/GeneralLedger";
import FiscalPeriods from "@/pages/accounting/FiscalPeriods";
import Bills from "@/pages/accounting/Bills";
import Payments from "@/pages/accounting/Payments";
import BankAccounts from "@/pages/accounting/BankAccounts";
import BankTransactions from "@/pages/accounting/BankTransactions";
import Expenses from "@/pages/accounting/Expenses";
import CashLocations from "@/pages/CashLocations";
import ClientProfilePage from "@/pages/ClientProfilePage";
import CreditsWorkspacePage from "@/pages/CreditsWorkspacePage";
import DemandSupplyWorkspacePage from "@/pages/DemandSupplyWorkspacePage";
import InventoryWorkspacePage from "@/pages/InventoryWorkspacePage";
import RelationshipsWorkspacePage from "@/pages/RelationshipsWorkspacePage";
import SalesWorkspacePage from "@/pages/SalesWorkspacePage";
import PricingRulesPage from "@/pages/PricingRulesPage";
import PricingProfilesPage from "@/pages/PricingProfilesPage";
import SalesSheetCreatorPage from "@/pages/SalesSheetCreatorPage";
import SharedSalesSheetPage from "@/pages/SharedSalesSheetPage";
import { NotificationPreferencesPage } from "@/pages/settings/NotificationPreferences";
import OrderCreatorPage from "@/pages/OrderCreatorPage";
// Work Surface components - legacy pages removed, using WorkSurface directly
import InvoicesWorkSurface from "@/components/work-surface/InvoicesWorkSurface";
import InventoryWorkSurface from "@/components/work-surface/InventoryWorkSurface";
import PurchaseOrdersWorkSurface from "@/components/work-surface/PurchaseOrdersWorkSurface";
import PickPackWorkSurface from "@/components/work-surface/PickPackWorkSurface";
import ClientLedgerWorkSurface from "@/components/work-surface/ClientLedgerWorkSurface";
import DirectIntakeWorkSurface from "@/components/work-surface/DirectIntakeWorkSurface";
import ComponentShowcase from "@/pages/ComponentShowcase";
import CogsSettingsPage from "@/pages/CogsSettingsPage";
import FeatureFlagsPage from "@/pages/settings/FeatureFlagsPage";
import AdminSetupPage from "@/pages/AdminSetupPage";
import VendorRedirect from "@/components/VendorRedirect";
import SampleManagement from "@/pages/SampleManagement";
import LocationsPage from "@/pages/LocationsPage";
import IntakeReceipts from "@/pages/IntakeReceipts"; // FEAT-008: Intake Verification System
import FarmerVerification from "@/pages/FarmerVerification"; // FEAT-008: Public farmer verification
import Login from "@/pages/Login";
import Help from "@/pages/Help";
import VIPPortalConfigPage from "@/pages/VIPPortalConfigPage";
import VIPLogin from "@/pages/vip-portal/VIPLogin";
import VIPDashboard from "@/pages/vip-portal/VIPDashboard";
import AlertsPage from "@/pages/AlertsPage"; // NAV-017: Alerts page
import ShrinkageReportPage from "@/pages/ShrinkageReportPage"; // NAV-018: Shrinkage report page
import ImpersonatePage from "@/pages/vip-portal/auth/ImpersonatePage";
import SessionEndedPage from "@/pages/vip-portal/SessionEndedPage";
import AccountPage from "@/pages/AccountPage";
import { TodoListsPage } from "@/pages/TodoListsPage";
import { TodoListDetailPage } from "@/pages/TodoListDetailPage";
import { InboxPage } from "@/pages/InboxPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
// MEET-049 FIX: Use lazy loading to isolate CalendarPage import
// This prevents calendar code errors from breaking the entire navigation
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
// Sprint 4 Track D: Scheduling System
const SchedulingPage = lazy(() => import("@/pages/SchedulingPage"));
// MEET-048: Hour Tracking / Time Clock
const TimeClockPage = lazy(() => import("@/pages/TimeClockPage"));
import WorkflowQueuePage from "@/pages/WorkflowQueuePage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SearchResultsPage from "@/pages/SearchResultsPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import LiveShoppingPage from "@/pages/LiveShoppingPage";
import UnifiedSalesPortalPage from "@/pages/UnifiedSalesPortalPage";
import PhotographyPage from "@/pages/PhotographyPage";
import { QuickAddTaskModal } from "@/components/todos/QuickAddTaskModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { resolveRelationshipsTab } from "@/lib/navigation/consolidation";
import { trackLegacyRouteRedirect } from "@/lib/navigation/routeUsageTelemetry";
import { useLocation, Redirect, useSearch } from "wouter";
import { VersionChecker } from "@/components/VersionChecker";
import { PageErrorBoundary } from "@/components/common/PageErrorBoundary";

// Helper to wrap route components with error boundary
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withErrorBoundary = (Component: FC<any>) => () => (
  <PageErrorBoundary>
    <Component />
  </PageErrorBoundary>
);

function useTrackLegacyRedirect(params: {
  from: string;
  to: string;
  tab?: string;
  search?: string;
}) {
  const { from, to, tab, search } = params;
  const trackedDestinationsRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    const destinationKey = `${from}|${to}`;
    if (trackedDestinationsRef.current.has(destinationKey)) {
      return;
    }

    trackLegacyRouteRedirect({ from, to, tab, search });
    trackedDestinationsRef.current.add(destinationKey);
  }, [from, to, tab, search]);
}

// QA-003 FIX: Helper component for legacy route redirects that preserves query params
const RedirectWithSearch = (from: string, to: string) => {
  const RedirectComponent: FC = () => {
    const search = useSearch();
    const destination = `${to}${search || ""}`;

    useTrackLegacyRedirect({
      from,
      to: destination,
      search: search || undefined,
    });

    return <Redirect to={destination} />;
  };
  return RedirectComponent;
};

// Helper for legacy route consolidation that preserves existing query params
const RedirectWithTab = (from: string, to: string, tab: string) => {
  const RedirectComponent: FC = () => {
    const search = useSearch();
    const params = new URLSearchParams(search);

    params.set("tab", tab);

    const query = params.toString();
    const destination = `${to}${query ? `?${query}` : ""}`;

    useTrackLegacyRedirect({
      from,
      to: destination,
      tab: params.get("tab") ?? undefined,
      search: search || undefined,
    });

    return <Redirect to={destination} />;
  };

  return RedirectComponent;
};

// Legacy compatibility: route old client/vendor list entry points into consolidated Relationships workspace.
const RedirectClientsToRelationships: FC = () => {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const resolvedTab = resolveRelationshipsTab(search);
  params.set("tab", resolvedTab);

  const query = params.toString();
  const destination = `/relationships${query ? `?${query}` : ""}`;

  useTrackLegacyRedirect({
    from: "/clients",
    to: destination,
    tab: resolvedTab,
    search: search || undefined,
  });

  return <Redirect to={destination} />;
};

// MEET-049 FIX: Helper for lazy-loaded components (adds Suspense)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withLazyErrorBoundary = (Component: FC<any>) => () => (
  <PageErrorBoundary>
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full p-8">
          Loading...
        </div>
      }
    >
      <Component />
    </Suspense>
  </PageErrorBoundary>
);

function Router() {
  return (
    <Switch>
      {/* Public routes - no AppShell */}
      <Route
        path="/admin-setup"
        component={withErrorBoundary(AdminSetupPage)}
      />
      <Route path="/login" component={withErrorBoundary(Login)} />
      <Route path="/vip-portal/login" component={withErrorBoundary(VIPLogin)} />
      <Route
        path="/shared/sales-sheet/:token"
        component={withErrorBoundary(SharedSalesSheetPage)}
      />
      {/* FEAT-008: Public farmer verification page */}
      <Route
        path="/intake/verify/:token"
        component={withErrorBoundary(FarmerVerification)}
      />
      <Route
        path="/vip-portal/dashboard"
        component={withErrorBoundary(VIPDashboard)}
      />
      <Route
        path="/vip-portal/auth/impersonate"
        component={withErrorBoundary(ImpersonatePage)}
      />
      <Route
        path="/vip-portal/session-ended"
        component={withErrorBoundary(SessionEndedPage)}
      />
      <Route path="/vip-portal" component={withErrorBoundary(VIPDashboard)} />

      {/* Protected routes - wrapped in AppShell and ProtectedRoute */}
      <Route>
        {() => (
          <ProtectedRoute>
            <AppShell>
              <Switch>
                <Route
                  path="/"
                  component={withErrorBoundary(DashboardHomePage)}
                />
                <Route
                  path="/dashboard"
                  component={withErrorBoundary(DashboardHomePage)}
                />
                <Route
                  path="/sales"
                  component={withErrorBoundary(SalesWorkspacePage)}
                />
                <Route
                  path="/relationships"
                  component={withErrorBoundary(RelationshipsWorkspacePage)}
                />
                <Route
                  path="/demand-supply"
                  component={withErrorBoundary(DemandSupplyWorkspacePage)}
                />
                <Route
                  path="/inventory"
                  component={withErrorBoundary(InventoryWorkspacePage)}
                />
                <Route
                  path="/inventory/:id"
                  component={withErrorBoundary(InventoryWorkSurface)}
                />
                <Route
                  path="/products"
                  component={RedirectWithTab(
                    "/products",
                    "/inventory",
                    "products"
                  )}
                />
                {/* Accounting - redirect /accounting to /accounting/dashboard */}
                <Route
                  path="/accounting"
                  component={withErrorBoundary(AccountingDashboard)}
                />
                <Route
                  path="/accounting/dashboard"
                  component={withErrorBoundary(AccountingDashboard)}
                />
                <Route
                  path="/accounting/chart-of-accounts"
                  component={withErrorBoundary(ChartOfAccounts)}
                />
                <Route
                  path="/accounting/general-ledger"
                  component={withErrorBoundary(GeneralLedger)}
                />
                <Route
                  path="/accounting/fiscal-periods"
                  component={withErrorBoundary(FiscalPeriods)}
                />
                <Route
                  path="/accounting/invoices"
                  component={withErrorBoundary(InvoicesWorkSurface)}
                />
                <Route
                  path="/accounting/bills"
                  component={withErrorBoundary(Bills)}
                />
                <Route
                  path="/accounting/payments"
                  component={withErrorBoundary(Payments)}
                />
                <Route
                  path="/accounting/bank-accounts"
                  component={withErrorBoundary(BankAccounts)}
                />
                <Route
                  path="/accounting/bank-transactions"
                  component={withErrorBoundary(BankTransactions)}
                />
                <Route
                  path="/accounting/expenses"
                  component={withErrorBoundary(Expenses)}
                />
                {/* FEAT-007: Cash Audit System */}
                <Route
                  path="/accounting/cash-locations"
                  component={withErrorBoundary(CashLocations)}
                />
                <Route
                  path="/clients"
                  component={RedirectClientsToRelationships}
                />
                <Route
                  path="/clients/:id"
                  component={withErrorBoundary(ClientProfilePage)}
                />
                <Route
                  path="/clients/:clientId/ledger"
                  component={withErrorBoundary(ClientLedgerWorkSurface)}
                />
                <Route
                  path="/client-ledger"
                  component={withErrorBoundary(ClientLedgerWorkSurface)}
                />
                <Route path="/users" component={withErrorBoundary(UsersPage)} />
                <Route
                  path="/pricing/rules"
                  component={withErrorBoundary(PricingRulesPage)}
                />
                <Route
                  path="/pricing/profiles"
                  component={withErrorBoundary(PricingProfilesPage)}
                />
                <Route
                  path="/sales-sheets"
                  component={withErrorBoundary(SalesSheetCreatorPage)}
                />
                <Route
                  path="/sales-portal"
                  component={withErrorBoundary(UnifiedSalesPortalPage)}
                />
                <Route
                  path="/orders"
                  component={RedirectWithTab("/orders", "/sales", "orders")}
                />
                <Route
                  path="/pick-pack"
                  component={withErrorBoundary(PickPackWorkSurface)}
                />
                <Route
                  path="/photography"
                  component={withErrorBoundary(PhotographyPage)}
                />
                <Route
                  path="/orders/create"
                  component={withErrorBoundary(OrderCreatorPage)}
                />
                <Route
                  path="/orders/new"
                  component={withErrorBoundary(OrderCreatorPage)}
                />
                <Route
                  path="/quotes"
                  component={RedirectWithTab("/quotes", "/sales", "quotes")}
                />
                <Route
                  path="/settings/cogs"
                  component={withErrorBoundary(CogsSettingsPage)}
                />
                <Route
                  path="/settings/notifications"
                  component={withErrorBoundary(NotificationPreferencesPage)}
                />
                <Route
                  path="/settings/feature-flags"
                  component={withErrorBoundary(FeatureFlagsPage)}
                />
                <Route
                  path="/settings"
                  component={withErrorBoundary(Settings)}
                />
                <Route
                  path="/account"
                  component={withErrorBoundary(AccountPage)}
                />
                <Route
                  path="/credit-settings"
                  component={RedirectWithTab(
                    "/credit-settings",
                    "/credits",
                    "settings"
                  )}
                />
                {/* NAV-017: Credits management page */}
                <Route
                  path="/credits/manage"
                  component={RedirectWithTab(
                    "/credits/manage",
                    "/credits",
                    "credits"
                  )}
                />
                <Route
                  path="/credits"
                  component={withErrorBoundary(CreditsWorkspacePage)}
                />
                <Route
                  path="/needs"
                  component={RedirectWithTab(
                    "/needs",
                    "/demand-supply",
                    "needs"
                  )}
                />
                <Route
                  path="/interest-list"
                  component={RedirectWithTab(
                    "/interest-list",
                    "/demand-supply",
                    "interest-list"
                  )}
                />
                <Route
                  path="/vendor-supply"
                  component={RedirectWithTab(
                    "/vendor-supply",
                    "/demand-supply",
                    "vendor-supply"
                  )}
                />
                <Route
                  path="/vendors"
                  component={RedirectWithTab(
                    "/vendors",
                    "/relationships",
                    "suppliers"
                  )}
                />
                <Route
                  path="/vendors/:id"
                  component={withErrorBoundary(VendorRedirect)}
                />
                <Route
                  path="/purchase-orders"
                  component={withErrorBoundary(PurchaseOrdersWorkSurface)}
                />
                <Route
                  path="/returns"
                  component={RedirectWithTab("/returns", "/sales", "returns")}
                />
                <Route
                  path="/samples"
                  component={withErrorBoundary(SampleManagement)}
                />
                <Route
                  path="/locations"
                  component={withErrorBoundary(LocationsPage)}
                />
                {/* FEAT-008: Intake Verification System */}
                <Route
                  path="/intake-receipts"
                  component={withErrorBoundary(IntakeReceipts)}
                />
                {/* ROUTE-001: Direct Intake WorkSurface */}
                <Route
                  path="/direct-intake"
                  component={withErrorBoundary(DirectIntakeWorkSurface)}
                />
                <Route
                  path="/matchmaking"
                  component={RedirectWithTab(
                    "/matchmaking",
                    "/demand-supply",
                    "matchmaking"
                  )}
                />
                <Route
                  path="/live-shopping"
                  component={withErrorBoundary(LiveShoppingPage)}
                />
                <Route
                  path="/spreadsheet-view"
                  component={withErrorBoundary(DirectIntakeWorkSurface)}
                />
                <Route path="/help" component={withErrorBoundary(Help)} />
                <Route
                  path="/clients/:clientId/vip-portal-config"
                  component={withErrorBoundary(VIPPortalConfigPage)}
                />
                {/* Todo Lists - support both /todo and /todos */}
                <Route
                  path="/todo"
                  component={withErrorBoundary(TodoListsPage)}
                />
                <Route
                  path="/todos"
                  component={withErrorBoundary(TodoListsPage)}
                />
                <Route
                  path="/todos/:listId"
                  component={withErrorBoundary(TodoListDetailPage)}
                />
                <Route
                  path="/notifications"
                  component={withErrorBoundary(NotificationsPage)}
                />
                <Route path="/inbox" component={withErrorBoundary(InboxPage)} />
                {/* MEET-049 FIX: Use lazy loading wrapper for isolated calendar loading */}
                <Route
                  path="/calendar"
                  component={withLazyErrorBoundary(CalendarPage)}
                />
                {/* Sprint 4 Track D: Scheduling System */}
                <Route
                  path="/scheduling"
                  component={withLazyErrorBoundary(SchedulingPage)}
                />
                {/* MEET-048: Hour Tracking / Time Clock */}
                <Route
                  path="/time-clock"
                  component={withLazyErrorBoundary(TimeClockPage)}
                />
                <Route
                  path="/workflow-queue"
                  component={withErrorBoundary(WorkflowQueuePage)}
                />
                <Route
                  path="/analytics"
                  component={withErrorBoundary(AnalyticsPage)}
                />
                {/* NAV-017: Alerts page */}
                <Route
                  path="/alerts"
                  component={withErrorBoundary(AlertsPage)}
                />
                {/* NAV-018: Shrinkage report page */}
                <Route
                  path="/reports/shrinkage"
                  component={withErrorBoundary(ShrinkageReportPage)}
                />
                <Route
                  path="/search"
                  component={withErrorBoundary(SearchResultsPage)}
                />
                <Route
                  path="/leaderboard"
                  component={withErrorBoundary(LeaderboardPage)}
                />
                {/* Dev-only route for component showcase - only renders in development mode */}
                {import.meta.env.DEV && (
                  <Route
                    path="/dev/showcase"
                    component={withErrorBoundary(ComponentShowcase)}
                  />
                )}

                {/* E2E-FIX: Legacy route redirects for backward compatibility */}
                {/* QA-003 FIX: Preserve query parameters during redirect */}
                <Route
                  path="/invoices"
                  component={RedirectWithSearch(
                    "/invoices",
                    "/accounting/invoices"
                  )}
                />
                <Route
                  path="/client-needs"
                  component={RedirectWithSearch("/client-needs", "/needs")}
                />
                <Route
                  path="/ar-ap"
                  component={RedirectWithSearch("/ar-ap", "/accounting")}
                />
                <Route
                  path="/reports"
                  component={RedirectWithSearch("/reports", "/analytics")}
                />
                <Route
                  path="/pricing-rules"
                  component={RedirectWithSearch(
                    "/pricing-rules",
                    "/pricing/rules"
                  )}
                />
                <Route
                  path="/system-settings"
                  component={RedirectWithSearch(
                    "/system-settings",
                    "/settings"
                  )}
                />
                <Route
                  path="/feature-flags"
                  component={RedirectWithSearch(
                    "/feature-flags",
                    "/settings/feature-flags"
                  )}
                />
                <Route
                  path="/todo-lists"
                  component={RedirectWithSearch("/todo-lists", "/todos")}
                />

                <Route path="/404" component={withErrorBoundary(NotFound)} />
                {/* Final fallback route */}
                <Route component={withErrorBoundary(NotFound)} />
              </Switch>
            </AppShell>
          </ProtectedRoute>
        )}
      </Route>
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const [, setLocation] = useLocation();
  const [showQuickAddTask, setShowQuickAddTask] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Global keyboard shortcuts (ENH-001)
  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      callback: () => setShowCommandPalette(true),
      description: "Open command palette",
    },
    {
      key: "n",
      ctrl: true,
      callback: () => setLocation("/orders/create"),
      description: "Create new sale",
    },
    {
      key: "t",
      ctrl: true,
      shift: true,
      callback: () => setShowQuickAddTask(true),
      description: "Quick add task",
    },
    {
      key: "?",
      callback: () => setShowKeyboardShortcuts(true),
      description: "Show keyboard shortcuts",
    },
  ]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <VersionChecker />
          <Router />
          <CommandPalette
            open={showCommandPalette}
            onOpenChange={setShowCommandPalette}
          />
          <QuickAddTaskModal
            isOpen={showQuickAddTask}
            onClose={() => setShowQuickAddTask(false)}
          />
          <KeyboardShortcutsModal
            open={showKeyboardShortcuts}
            onOpenChange={setShowKeyboardShortcuts}
          />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
