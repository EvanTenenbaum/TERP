import { lazy, Suspense, type FC } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import DashboardV3 from "./pages/DashboardV3";
import Inventory from "@/pages/Inventory";
import ProductsPage from "@/pages/ProductsPage";
import VendorsPage from "@/pages/VendorsPage";
import UsersPage from "@/pages/UsersPage";
import { AppShell } from "./components/layout/AppShell";
import Settings from "@/pages/Settings";
import AccountingDashboard from "@/pages/accounting/AccountingDashboard";
import ChartOfAccounts from "@/pages/accounting/ChartOfAccounts";
import GeneralLedger from "@/pages/accounting/GeneralLedger";
import FiscalPeriods from "@/pages/accounting/FiscalPeriods";
import Invoices from "@/pages/accounting/Invoices";
import Bills from "@/pages/accounting/Bills";
import Payments from "@/pages/accounting/Payments";
import BankAccounts from "@/pages/accounting/BankAccounts";
import BankTransactions from "@/pages/accounting/BankTransactions";
import Expenses from "@/pages/accounting/Expenses";
import CashLocations from "@/pages/CashLocations";
import ClientsListPage from "@/pages/ClientsListPage";
import ClientProfilePage from "@/pages/ClientProfilePage";
import ClientLedger from "@/pages/ClientLedger";
import CreditSettingsPage from "@/pages/CreditSettingsPage";
import PricingRulesPage from "@/pages/PricingRulesPage";
import PricingProfilesPage from "@/pages/PricingProfilesPage";
import SalesSheetCreatorPage from "@/pages/SalesSheetCreatorPage";
import SharedSalesSheetPage from "@/pages/SharedSalesSheetPage";
import { NotificationPreferencesPage } from "@/pages/settings/NotificationPreferences";
import OrderCreatorPage from "@/pages/OrderCreatorPage";
import Orders from "@/pages/Orders";
import Quotes from "@/pages/Quotes";
// Work Surface components for progressive rollout
import { WorkSurfaceGate } from "@/hooks/work-surface/useWorkSurfaceFeatureFlags";
import OrdersWorkSurface from "@/components/work-surface/OrdersWorkSurface";
import InvoicesWorkSurface from "@/components/work-surface/InvoicesWorkSurface";
import InventoryWorkSurface from "@/components/work-surface/InventoryWorkSurface";
import ClientsWorkSurface from "@/components/work-surface/ClientsWorkSurface";
import PurchaseOrdersWorkSurface from "@/components/work-surface/PurchaseOrdersWorkSurface";
import PickPackWorkSurface from "@/components/work-surface/PickPackWorkSurface";
import ClientLedgerWorkSurface from "@/components/work-surface/ClientLedgerWorkSurface";
import QuotesWorkSurface from "@/components/work-surface/QuotesWorkSurface";
import DirectIntakeWorkSurface from "@/components/work-surface/DirectIntakeWorkSurface";
import ComponentShowcase from "@/pages/ComponentShowcase";
import CogsSettingsPage from "@/pages/CogsSettingsPage";
import FeatureFlagsPage from "@/pages/settings/FeatureFlagsPage";
import AdminSetupPage from "@/pages/AdminSetupPage";
import NeedsManagementPage from "@/pages/NeedsManagementPage";
import InterestListPage from "@/pages/InterestListPage";
import VendorSupplyPage from "@/pages/VendorSupplyPage";
import VendorRedirect from "@/components/VendorRedirect";
import PurchaseOrdersPage from "@/pages/PurchaseOrdersPage";
import ReturnsPage from "@/pages/ReturnsPage";
import SampleManagement from "@/pages/SampleManagement";
import LocationsPage from "@/pages/LocationsPage";
import IntakeReceipts from "@/pages/IntakeReceipts"; // FEAT-008: Intake Verification System
import FarmerVerification from "@/pages/FarmerVerification"; // FEAT-008: Public farmer verification
import MatchmakingServicePage from "@/pages/MatchmakingServicePage";
import Login from "@/pages/Login";
import Help from "@/pages/Help";
import VIPPortalConfigPage from "@/pages/VIPPortalConfigPage";
import VIPLogin from "@/pages/vip-portal/VIPLogin";
import VIPDashboard from "@/pages/vip-portal/VIPDashboard";
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
import WorkflowQueuePage from "@/pages/WorkflowQueuePage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SearchResultsPage from "@/pages/SearchResultsPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import LiveShoppingPage from "@/pages/LiveShoppingPage";
import SpreadsheetViewPage from "@/pages/SpreadsheetViewPage";
import UnifiedSalesPortalPage from "@/pages/UnifiedSalesPortalPage";
import PickPackPage from "@/pages/PickPackPage";
import PhotographyPage from "@/pages/PhotographyPage";
import { QuickAddTaskModal } from "@/components/todos/QuickAddTaskModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { useState } from "react";
import { useLocation } from "wouter";
import { VersionChecker } from "@/components/VersionChecker";
import { PageErrorBoundary } from "@/components/common/PageErrorBoundary";

// Helper to wrap route components with error boundary
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withErrorBoundary = (Component: FC<any>) => () => (
  <PageErrorBoundary>
    <Component />
  </PageErrorBoundary>
);

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
                <Route path="/" component={withErrorBoundary(DashboardV3)} />
                <Route
                  path="/dashboard"
                  component={withErrorBoundary(DashboardV3)}
                />
                <Route
                  path="/inventory"
                  component={withErrorBoundary(() => (
                    <WorkSurfaceGate
                      flag="WORK_SURFACE_INVENTORY"
                      fallback={<Inventory />}
                    >
                      <InventoryWorkSurface />
                    </WorkSurfaceGate>
                  ))}
                />
                <Route
                  path="/inventory/:id"
                  component={withErrorBoundary(() => (
                    <WorkSurfaceGate
                      flag="WORK_SURFACE_INVENTORY"
                      fallback={<Inventory />}
                    >
                      <InventoryWorkSurface />
                    </WorkSurfaceGate>
                  ))}
                />
                <Route
                  path="/products"
                  component={withErrorBoundary(ProductsPage)}
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
                  component={withErrorBoundary(() => (
                    <WorkSurfaceGate
                      flag="WORK_SURFACE_ACCOUNTING"
                      fallback={<Invoices />}
                    >
                      <InvoicesWorkSurface />
                    </WorkSurfaceGate>
                  ))}
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
                  component={withErrorBoundary(() => (
                    <WorkSurfaceGate
                      flag="WORK_SURFACE_ORDERS"
                      fallback={<ClientsListPage />}
                    >
                      <ClientsWorkSurface />
                    </WorkSurfaceGate>
                  ))}
                />
                <Route
                  path="/clients/:id"
                  component={withErrorBoundary(ClientProfilePage)}
                />
                <Route
                  path="/clients/:clientId/ledger"
                  component={withErrorBoundary(() => (
                    <WorkSurfaceGate
                      flag="WORK_SURFACE_ACCOUNTING"
                      fallback={<ClientLedger />}
                    >
                      <ClientLedgerWorkSurface />
                    </WorkSurfaceGate>
                  ))}
                />
                <Route
                  path="/client-ledger"
                  component={withErrorBoundary(ClientLedger)}
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
                  component={withErrorBoundary(() => (
                    <WorkSurfaceGate
                      flag="WORK_SURFACE_ORDERS"
                      fallback={<Orders />}
                    >
                      <OrdersWorkSurface />
                    </WorkSurfaceGate>
                  ))}
                />
                <Route
                  path="/pick-pack"
                  component={withErrorBoundary(() => (
                    <WorkSurfaceGate
                      flag="WORK_SURFACE_INVENTORY"
                      fallback={<PickPackPage />}
                    >
                      <PickPackWorkSurface />
                    </WorkSurfaceGate>
                  ))}
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
                  path="/quotes"
                  component={withErrorBoundary(() => (
                    <WorkSurfaceGate
                      flag="WORK_SURFACE_ORDERS"
                      fallback={<Quotes />}
                    >
                      <QuotesWorkSurface />
                    </WorkSurfaceGate>
                  ))}
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
                  component={withErrorBoundary(CreditSettingsPage)}
                />
                <Route
                  path="/needs"
                  component={withErrorBoundary(NeedsManagementPage)}
                />
                <Route
                  path="/interest-list"
                  component={withErrorBoundary(InterestListPage)}
                />
                <Route
                  path="/vendor-supply"
                  component={withErrorBoundary(VendorSupplyPage)}
                />
                <Route
                  path="/vendors"
                  component={withErrorBoundary(VendorsPage)}
                />
                <Route
                  path="/vendors/:id"
                  component={withErrorBoundary(VendorRedirect)}
                />
                <Route
                  path="/purchase-orders"
                  component={withErrorBoundary(() => (
                    <WorkSurfaceGate
                      flag="WORK_SURFACE_INTAKE"
                      fallback={<PurchaseOrdersPage />}
                    >
                      <PurchaseOrdersWorkSurface />
                    </WorkSurfaceGate>
                  ))}
                />
                <Route
                  path="/returns"
                  component={withErrorBoundary(ReturnsPage)}
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
                <Route
                  path="/matchmaking"
                  component={withErrorBoundary(MatchmakingServicePage)}
                />
                <Route
                  path="/live-shopping"
                  component={withErrorBoundary(LiveShoppingPage)}
                />
                <Route
                  path="/spreadsheet-view"
                  component={withErrorBoundary(() => (
                    <WorkSurfaceGate
                      flag="WORK_SURFACE_INTAKE"
                      fallback={<SpreadsheetViewPage />}
                    >
                      <DirectIntakeWorkSurface />
                    </WorkSurfaceGate>
                  ))}
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
                <Route
                  path="/workflow-queue"
                  component={withErrorBoundary(WorkflowQueuePage)}
                />
                <Route
                  path="/analytics"
                  component={withErrorBoundary(AnalyticsPage)}
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
      description: "Create new order",
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
