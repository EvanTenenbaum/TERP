import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "@/components/layout/LinearWorkspaceShell";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { ACCOUNTING_WORKSPACE } from "@/config/workspaces";
import AccountingDashboard from "@/pages/accounting/AccountingDashboard";
import Expenses from "@/pages/accounting/Expenses";
import BankAccounts from "@/pages/accounting/BankAccounts";
import BankTransactions from "@/pages/accounting/BankTransactions";
import FiscalPeriods from "@/pages/accounting/FiscalPeriods";
import { lazy } from "react";
import { PilotSurfaceBoundary } from "@/components/spreadsheet-native/PilotSurfaceBoundary";

// Phase 1+2 unified surfaces
const InvoicesSurface = lazy(
  () => import("@/components/spreadsheet-native/InvoicesSurface")
);
const BillsSurface = lazy(
  () => import("@/components/spreadsheet-native/BillsSurface")
);
const PaymentsSurface = lazy(
  () => import("@/components/spreadsheet-native/PaymentsSurface")
);
const GeneralLedgerSurface = lazy(
  () => import("@/components/spreadsheet-native/GeneralLedgerSurface")
);
const ChartOfAccountsSurface = lazy(
  () => import("@/components/spreadsheet-native/ChartOfAccountsSurface")
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
      <LinearWorkspacePanel value="general-ledger">
        <PilotSurfaceBoundary
          fallback={
            <div className="p-4 text-muted-foreground">
              Loading general ledger...
            </div>
          }
        >
          <GeneralLedgerSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="chart-of-accounts">
        <PilotSurfaceBoundary
          fallback={
            <div className="p-4 text-muted-foreground">
              Loading chart of accounts...
            </div>
          }
        >
          <ChartOfAccountsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      {/* Phase 3 tabs remain classic until that phase is built */}
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
