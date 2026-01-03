import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardV3 from "./pages/DashboardV3";
import Inventory from "@/pages/Inventory";
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
import ClientsListPage from "@/pages/ClientsListPage";
import ClientProfilePage from "@/pages/ClientProfilePage";
import CreditSettingsPage from "@/pages/CreditSettingsPage";
import PricingRulesPage from "@/pages/PricingRulesPage";
import PricingProfilesPage from "@/pages/PricingProfilesPage";
import SalesSheetCreatorPage from "@/pages/SalesSheetCreatorPage";
import { NotificationPreferencesPage } from "@/pages/settings/NotificationPreferences";
import OrderCreatorPage from "@/pages/OrderCreatorPage";
import Orders from "@/pages/Orders";
import Quotes from "@/pages/Quotes";
import ComponentShowcase from "@/pages/ComponentShowcase";
import CogsSettingsPage from "@/pages/CogsSettingsPage";
import FeatureFlagsPage from "@/pages/settings/FeatureFlagsPage";
import AdminSetupPage from "@/pages/AdminSetupPage";
import NeedsManagementPage from "@/pages/NeedsManagementPage";
import InterestListPage from "@/pages/InterestListPage";
import VendorSupplyPage from "@/pages/VendorSupplyPage";
// DEPRECATED: VendorsPage and VendorProfilePage are replaced by redirects
// import VendorsPage from "@/pages/VendorsPage";
// import VendorProfilePage from "@/pages/VendorProfilePage";
import VendorRedirect from "@/components/VendorRedirect";
import { Redirect } from "wouter";
import PurchaseOrdersPage from "@/pages/PurchaseOrdersPage";
import ReturnsPage from "@/pages/ReturnsPage";
import SampleManagement from "@/pages/SampleManagement";
import LocationsPage from "@/pages/LocationsPage";
import MatchmakingServicePage from "@/pages/MatchmakingServicePage";
import Login from "@/pages/Login";
import Help from "@/pages/Help";
import VIPPortalConfigPage from "@/pages/VIPPortalConfigPage";
import VIPLogin from "@/pages/vip-portal/VIPLogin";
import VIPDashboard from "@/pages/vip-portal/VIPDashboard";
import ImpersonatePage from "@/pages/vip-portal/auth/ImpersonatePage";
import SessionEndedPage from "@/pages/vip-portal/SessionEndedPage";
import { TodoListsPage } from "@/pages/TodoListsPage";
import { TodoListDetailPage } from "@/pages/TodoListDetailPage";
import { InboxPage } from "@/pages/InboxPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import CalendarPage from "@/pages/CalendarPage";
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

function Router() {
  return (
    <Switch>
      {/* Public routes - no AppShell */}
      <Route path="/admin-setup" component={AdminSetupPage} />
      <Route path="/login" component={Login} />
      <Route path="/vip-portal/login" component={VIPLogin} />
      <Route path="/vip-portal/dashboard" component={VIPDashboard} />
      <Route path="/vip-portal/auth/impersonate" component={ImpersonatePage} />
      <Route path="/vip-portal/session-ended" component={SessionEndedPage} />
      <Route path="/vip-portal" component={VIPDashboard} />

      {/* Protected routes - wrapped in AppShell */}
      <Route>
        {() => (
          <AppShell>
            <Switch>
              <Route path="/" component={DashboardV3} />
              <Route path="/dashboard" component={DashboardV3} />
              <Route path="/inventory" component={Inventory} />
              <Route path="/inventory/:id" component={Inventory} />
              {/* Accounting - redirect /accounting to /accounting/dashboard */}
              <Route path="/accounting" component={AccountingDashboard} />
              <Route
                path="/accounting/dashboard"
                component={AccountingDashboard}
              />
              <Route
                path="/accounting/chart-of-accounts"
                component={ChartOfAccounts}
              />
              <Route
                path="/accounting/general-ledger"
                component={GeneralLedger}
              />
              <Route
                path="/accounting/fiscal-periods"
                component={FiscalPeriods}
              />
              <Route path="/accounting/invoices" component={Invoices} />
              <Route path="/accounting/bills" component={Bills} />
              <Route path="/accounting/payments" component={Payments} />
              <Route
                path="/accounting/bank-accounts"
                component={BankAccounts}
              />
              <Route
                path="/accounting/bank-transactions"
                component={BankTransactions}
              />
              <Route path="/accounting/expenses" component={Expenses} />
              <Route path="/clients" component={ClientsListPage} />
              <Route path="/clients/:id" component={ClientProfilePage} />
              <Route path="/pricing/rules" component={PricingRulesPage} />
              <Route path="/pricing/profiles" component={PricingProfilesPage} />
              <Route path="/sales-sheets" component={SalesSheetCreatorPage} />
              <Route path="/sales-portal" component={UnifiedSalesPortalPage} />
              <Route path="/orders" component={Orders} />
              <Route path="/pick-pack" component={PickPackPage} />
              <Route path="/photography" component={PhotographyPage} />
              <Route path="/orders/create" component={OrderCreatorPage} />
              <Route path="/quotes" component={Quotes} />
              <Route path="/settings/cogs" component={CogsSettingsPage} />
              <Route
                path="/settings/notifications"
                component={NotificationPreferencesPage}
              />
              <Route
                path="/settings/feature-flags"
                component={FeatureFlagsPage}
              />
              <Route path="/settings" component={Settings} />
              <Route path="/credit-settings" component={CreditSettingsPage} />
              <Route path="/needs" component={NeedsManagementPage} />
              <Route path="/interest-list" component={InterestListPage} />
              <Route path="/vendor-supply" component={VendorSupplyPage} />
              {/* DEPRECATED: /vendors routes redirect to /clients with supplier filter */}
              <Route path="/vendors/:id" component={VendorRedirect} />
              <Route path="/vendors">
                {() => <Redirect to="/clients?clientTypes=seller" />}
              </Route>
              <Route path="/purchase-orders" component={PurchaseOrdersPage} />
              <Route path="/returns" component={ReturnsPage} />
              <Route path="/samples" component={SampleManagement} />
              <Route path="/locations" component={LocationsPage} />
              <Route path="/matchmaking" component={MatchmakingServicePage} />
              <Route path="/live-shopping" component={LiveShoppingPage} />
              <Route
                path="/live-shopping/:sessionId"
                component={LiveShoppingPage}
              />
              <Route path="/spreadsheet-view" component={SpreadsheetViewPage} />
              <Route path="/help" component={Help} />
              <Route
                path="/clients/:clientId/vip-portal-config"
                component={VIPPortalConfigPage}
              />
              {/* Todo Lists - support both /todo and /todos */}
              <Route path="/todo" component={TodoListsPage} />
              <Route path="/todos" component={TodoListsPage} />
              <Route path="/todos/:listId" component={TodoListDetailPage} />
              <Route path="/notifications" component={NotificationsPage} />
              <Route path="/inbox" component={InboxPage} />
              <Route path="/calendar" component={CalendarPage} />
              <Route path="/workflow-queue" component={WorkflowQueuePage} />
              <Route path="/analytics" component={AnalyticsPage} />
              <Route path="/search" component={SearchResultsPage} />
              <Route path="/leaderboard" component={LeaderboardPage} />
              {/* Dev-only route for component showcase - only renders in development mode */}
              {import.meta.env.DEV && (
                <Route path="/dev/showcase" component={ComponentShowcase} />
              )}
              <Route path="/404" component={NotFound} />
              {/* Final fallback route */}
              <Route component={NotFound} />
            </Switch>
          </AppShell>
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
