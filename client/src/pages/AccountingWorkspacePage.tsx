import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "@/components/layout/LinearWorkspaceShell";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { ACCOUNTING_WORKSPACE } from "@/config/workspaces";
import AccountingDashboard from "@/pages/accounting/AccountingDashboard";
import GeneralLedger from "@/pages/accounting/GeneralLedger";
import ChartOfAccounts from "@/pages/accounting/ChartOfAccounts";
import Expenses from "@/pages/accounting/Expenses";
import BankAccounts from "@/pages/accounting/BankAccounts";
import BankTransactions from "@/pages/accounting/BankTransactions";
import FiscalPeriods from "@/pages/accounting/FiscalPeriods";
import { lazy } from "react";
import { PilotSurfaceBoundary } from "@/components/spreadsheet-native/PilotSurfaceBoundary";

// Phase 1 unified surfaces
const InvoicesSurface = lazy(
  () => import("@/components/spreadsheet-native/InvoicesSurface")
);
const BillsSurface = lazy(
  () => import("@/components/spreadsheet-native/BillsSurface")
);
const PaymentsSurface = lazy(
  () => import("@/components/spreadsheet-native/PaymentsSurface")
);

type AccountingTab = (typeof ACCOUNTING_WORKSPACE.tabs)[number]["value"];
const ACCOUNTING_TABS = ACCOUNTING_WORKSPACE.tabs.map(
  tab => tab.value
) as readonly AccountingTab[];

export default function AccountingWorkspacePage() {
  const { activeTab, setActiveTab } = useQueryTabState<AccountingTab>({
    defaultTab: "dashboard",
    validTabs: ACCOUNTING_TABS,
  });

  useWorkspaceHomeTelemetry("accounting", activeTab);

  return (
    <LinearWorkspaceShell
      title={ACCOUNTING_WORKSPACE.title}
      description={ACCOUNTING_WORKSPACE.description}
      section="Finance"
      activeTab={activeTab}
      tabs={ACCOUNTING_WORKSPACE.tabs}
      onTabChange={setActiveTab}
      meta={[
        {
          label: "Record a payment",
          value: "Select an invoice, then use Record Payment",
        },
        {
          label: "Billing cycle",
          value: "Invoice -> Payment -> General Ledger",
        },
      ]}
    >
      <LinearWorkspacePanel value="dashboard">
        <AccountingDashboard embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="invoices">
        <PilotSurfaceBoundary
          fallback={
            <div className="p-4 text-muted-foreground">Loading invoices...</div>
          }
        >
          <InvoicesSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="bills">
        <PilotSurfaceBoundary
          fallback={
            <div className="p-4 text-muted-foreground">Loading bills...</div>
          }
        >
          <BillsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="payments">
        <PilotSurfaceBoundary
          fallback={
            <div className="p-4 text-muted-foreground">Loading payments...</div>
          }
        >
          <PaymentsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      {/* Phase 2-3 tabs remain classic until those phases are built */}
      <LinearWorkspacePanel value="general-ledger">
        <GeneralLedger embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="chart-of-accounts">
        <ChartOfAccounts embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="expenses">
        <Expenses embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="bank-accounts">
        <BankAccounts embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="bank-transactions">
        <BankTransactions embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="fiscal-periods">
        <FiscalPeriods embedded />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
