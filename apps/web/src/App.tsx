import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";

// Main Pages
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import Reports from "@/pages/Reports";
import VisualMode from "@/pages/VisualMode";

// Sales
import Sales from "@/pages/Sales";
import NewOrder from "@/pages/sales/NewOrder";
import OrderList from "@/pages/sales/OrderList";
import OrderDetail from "@/pages/sales/OrderDetail";
import Pipeline from "@/pages/sales/Pipeline";
import Quotes from "@/pages/Quotes";
import QuoteDetail from "@/pages/QuoteDetail";
import SalesSheetsList from "@/pages/sales/SalesSheetsList";

// Clients
import ClientList from "@/pages/clients/ClientList";
import ClientProfile from "@/pages/clients/ClientProfile";

// Inventory
import InventoryGrid from "@/pages/inventory/InventoryGrid";
import BatchDetail from "@/pages/inventory/BatchDetail";
import Adjustments from "@/pages/inventory/Adjustments";
import CycleCount from "@/pages/inventory/CycleCount";
import Discrepancies from "@/pages/inventory/Discrepancies";
import Returns from "@/pages/inventory/Returns";

// Vendors
import VendorList from "@/pages/vendors/VendorList";
import VendorProfile from "@/pages/vendors/VendorProfile";
import NewPO from "@/pages/vendors/NewPO";
import POList from "@/pages/vendors/POList";
import PODetail from "@/pages/vendors/PODetail";

// Finance
import FinanceDashboard from "@/pages/finance/FinanceDashboard";
import ARTable from "@/pages/finance/ARTable";
import APTable from "@/pages/finance/APTable";
import InvoiceDetail from "@/pages/finance/InvoiceDetail";
import BillDetail from "@/pages/finance/BillDetail";
import VendorDetail from "@/pages/finance/VendorDetail";
import Payments from "@/pages/finance/Payments";
import AgingReport from "@/pages/finance/AgingReport";
import APAging from "@/pages/finance/APAging";

// Analytics
import DashboardsIndex from "@/pages/analytics/DashboardsIndex";
import DashboardDetail from "@/pages/analytics/DashboardDetail";

// Alerts
import AlertsDashboard from "@/pages/alerts/AlertsDashboard";

// Admin
import UserTable from "@/pages/admin/UserTable";
import UserDetail from "@/pages/admin/UserDetail";
import RoleMatrix from "@/pages/admin/RoleMatrix";
import ImportsWizard from "@/pages/admin/ImportsWizard";
import CronJobs from "@/pages/admin/CronJobs";
import PricingCenter from "@/pages/admin/PricingCenter";

// System
import SettingsDashboard from "@/pages/system/SettingsDashboard";
import AuditLog from "@/pages/system/AuditLog";
import NotificationSettings from "@/pages/system/NotificationSettings";
import BrandingSettings from "@/pages/system/BrandingSettings";
import ArchivingSettings from "@/pages/system/ArchivingSettings";
import HygieneSettings from "@/pages/system/HygieneSettings";
import RoundingSettings from "@/pages/system/RoundingSettings";
import ImportsManager from "@/pages/system/ImportsManager";
import ExportsManager from "@/pages/system/ExportsManager";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell><Navigate to="/dashboard" replace /></AppShell>} />
          <Route path="/dashboard" element={<AppShell><Dashboard /></AppShell>} />
          
          {/* Sales */}
          <Route path="/sales" element={<AppShell><Sales /></AppShell>} />
          <Route path="/sales/orders/new" element={<AppShell><NewOrder /></AppShell>} />
          <Route path="/sales/orders" element={<AppShell><OrderList /></AppShell>} />
          <Route path="/sales/orders/:orderId" element={<AppShell><OrderDetail /></AppShell>} />
          <Route path="/sales/pipeline" element={<AppShell><Pipeline /></AppShell>} />
          <Route path="/sales/sheets" element={<AppShell><SalesSheetsList /></AppShell>} />
          
          {/* Quotes */}
          <Route path="/quotes" element={<AppShell><Quotes /></AppShell>} />
          <Route path="/quotes/:id" element={<AppShell><QuoteDetail /></AppShell>} />
          
          {/* Clients */}
          <Route path="/clients" element={<AppShell><ClientList /></AppShell>} />
          <Route path="/clients/:clientId" element={<AppShell><ClientProfile /></AppShell>} />
          
          {/* Inventory */}
          <Route path="/inventory" element={<AppShell><InventoryGrid /></AppShell>} />
          <Route path="/inventory/batches/:batchId" element={<AppShell><BatchDetail /></AppShell>} />
          <Route path="/inventory/adjustments" element={<AppShell><Adjustments /></AppShell>} />
          <Route path="/inventory/cycle-count" element={<AppShell><CycleCount /></AppShell>} />
          <Route path="/inventory/discrepancies" element={<AppShell><Discrepancies /></AppShell>} />
          <Route path="/inventory/returns" element={<AppShell><Returns /></AppShell>} />
          
          {/* Vendors */}
          <Route path="/vendors" element={<AppShell><VendorList /></AppShell>} />
          <Route path="/vendors/pos" element={<AppShell><POList /></AppShell>} />
          <Route path="/vendors/po/new" element={<AppShell><NewPO /></AppShell>} />
          <Route path="/vendors/po/:poId" element={<AppShell><PODetail /></AppShell>} />
          <Route path="/vendors/:vendorId" element={<AppShell><VendorProfile /></AppShell>} />
          
          {/* Finance */}
          <Route path="/finance" element={<AppShell><FinanceDashboard /></AppShell>} />
          <Route path="/finance/ar" element={<AppShell><ARTable /></AppShell>} />
          <Route path="/finance/ap" element={<AppShell><APTable /></AppShell>} />
          <Route path="/finance/invoices/:invoiceId" element={<AppShell><InvoiceDetail /></AppShell>} />
          <Route path="/finance/bills/:billId" element={<AppShell><BillDetail /></AppShell>} />
          <Route path="/finance/aging" element={<AppShell><AgingReport /></AppShell>} />
          <Route path="/finance/payments" element={<AppShell><Payments /></AppShell>} />
          <Route path="/finance/vendors/:id" element={<AppShell><VendorDetail /></AppShell>} />
          <Route path="/finance/ap-aging" element={<AppShell><APAging /></AppShell>} />
          
          {/* Analytics */}
          <Route path="/analytics" element={<AppShell><DashboardsIndex /></AppShell>} />
          <Route path="/analytics/dashboards/:dashboardId" element={<AppShell><DashboardDetail /></AppShell>} />
          
          {/* Alerts */}
          <Route path="/alerts" element={<AppShell><AlertsDashboard /></AppShell>} />
          
          {/* Admin */}
          <Route path="/admin" element={<AppShell><UserTable /></AppShell>} />
          <Route path="/admin/users" element={<AppShell><UserTable /></AppShell>} />
          <Route path="/admin/users/:userId" element={<AppShell><UserDetail /></AppShell>} />
          <Route path="/admin/roles" element={<AppShell><RoleMatrix /></AppShell>} />
          <Route path="/admin/pricing" element={<AppShell><PricingCenter /></AppShell>} />
          <Route path="/admin/cron" element={<AppShell><CronJobs /></AppShell>} />
          <Route path="/admin/imports" element={<AppShell><ImportsWizard /></AppShell>} />
          
          {/* System */}
          <Route path="/system" element={<AppShell><SettingsDashboard /></AppShell>} />
          <Route path="/settings" element={<AppShell><SettingsDashboard /></AppShell>} />
          <Route path="/system/imports" element={<AppShell><ImportsManager /></AppShell>} />
          <Route path="/system/exports" element={<AppShell><ExportsManager /></AppShell>} />
          <Route path="/system/archiving" element={<AppShell><ArchivingSettings /></AppShell>} />
          <Route path="/system/rounding" element={<AppShell><RoundingSettings /></AppShell>} />
          <Route path="/system/notifications" element={<AppShell><NotificationSettings /></AppShell>} />
          <Route path="/system/branding" element={<AppShell><BrandingSettings /></AppShell>} />
          <Route path="/system/hygiene" element={<AppShell><HygieneSettings /></AppShell>} />
          <Route path="/system/audit" element={<AppShell><AuditLog /></AppShell>} />
          
          {/* Other */}
          <Route path="/reports" element={<AppShell><Reports /></AppShell>} />
          <Route path="/visual" element={<AppShell><VisualMode /></AppShell>} />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

