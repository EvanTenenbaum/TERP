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
import OrderCreatorPage from "@/pages/OrderCreatorPage";
import Orders from "@/pages/Orders";
import CogsSettingsPage from "@/pages/CogsSettingsPage";
import NeedsManagementPage from "@/pages/NeedsManagementPage";
import VendorSupplyPage from "@/pages/VendorSupplyPage";
import VendorsPage from "@/pages/VendorsPage";
import VendorProfilePage from "@/pages/VendorProfilePage";
import MatchmakingServicePage from "@/pages/MatchmakingServicePage";
import Login from "@/pages/Login";
import Help from "@/pages/Help";
import VIPPortalConfigPage from "@/pages/VIPPortalConfigPage";
import VIPLogin from "@/pages/vip-portal/VIPLogin";
import VIPDashboard from "@/pages/vip-portal/VIPDashboard";
import { TodoListsPage } from "@/pages/TodoListsPage";
import { TodoListDetailPage } from "@/pages/TodoListDetailPage";
import { InboxPage } from "@/pages/InboxPage";
import CalendarPage from "@/pages/CalendarPage";
import { QuickAddTaskModal } from "@/components/todos/QuickAddTaskModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useState } from "react";

function Router() {
  return (
    <Switch>
      {/* Public routes - no AppShell */}
      <Route path="/login" component={Login} />
      <Route path="/vip-portal/login" component={VIPLogin} />
      <Route path="/vip-portal/dashboard" component={VIPDashboard} />

      {/* Protected routes - wrapped in AppShell */}
      <Route>
        {() => (
          <AppShell>
            <Switch>
              <Route path="/" component={DashboardV3} />
              <Route path="/dashboard" component={DashboardV3} />
              <Route path="/inventory" component={Inventory} />
              <Route path="/inventory/:id" component={Inventory} />
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
              <Route path="/orders" component={Orders} />
              <Route path="/orders/create" component={OrderCreatorPage} />
              <Route path="/settings/cogs" component={CogsSettingsPage} />
              <Route path="/settings" component={Settings} />
              <Route path="/credit-settings" component={CreditSettingsPage} />
              <Route path="/needs" component={NeedsManagementPage} />
              <Route path="/vendor-supply" component={VendorSupplyPage} />
              <Route path="/vendors/:id" component={VendorProfilePage} />
              <Route path="/vendors" component={VendorsPage} />
              <Route path="/matchmaking" component={MatchmakingServicePage} />
              <Route path="/help" component={Help} />
              <Route
                path="/clients/:clientId/vip-portal-config"
                component={VIPPortalConfigPage}
              />
              <Route path="/todos" component={TodoListsPage} />
              <Route path="/todos/:listId" component={TodoListDetailPage} />
              <Route path="/inbox" component={InboxPage} />
              <Route path="/calendar" component={CalendarPage} />
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
  const [showQuickAddTask, setShowQuickAddTask] = useState(false);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "t",
      ctrl: true,
      shift: true,
      callback: () => setShowQuickAddTask(true),
      description: "Quick add task",
    },
  ]);

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <QuickAddTaskModal
            isOpen={showQuickAddTask}
            onClose={() => setShowQuickAddTask(false)}
          />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
