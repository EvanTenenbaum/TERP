import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "@/components/layout/LinearWorkspaceShell";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { ACCOUNTING_WORKSPACE } from "@/config/workspaces";
import AccountingDashboard from "@/pages/accounting/AccountingDashboard";
import { lazy } from "react";
import { PilotSurfaceBoundary } from "@/components/spreadsheet-native/PilotSurfaceBoundary";

// All unified surfaces
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
const ExpensesSurface = lazy(
  () => import("@/components/spreadsheet-native/ExpensesSurface")
);
const BankAccountsSurface = lazy(
  () => import("@/components/spreadsheet-native/BankAccountsSurface")
);
const BankTransactionsSurface = lazy(
  () => import("@/components/spreadsheet-native/BankTransactionsSurface")
);
const FiscalPeriodsSurface = lazy(
  () => import("@/components/spreadsheet-native/FiscalPeriodsSurface")
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
      activeTab={activeTab}
      tabs={ACCOUNTING_WORKSPACE.tabs}
      onTabChange={setActiveTab}
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
      <LinearWorkspacePanel value="expenses">
        <PilotSurfaceBoundary
          fallback={
            <div className="p-4 text-muted-foreground">Loading expenses...</div>
          }
        >
          <ExpensesSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="bank-accounts">
        <PilotSurfaceBoundary
          fallback={
            <div className="p-4 text-muted-foreground">
              Loading bank accounts...
            </div>
          }
        >
          <BankAccountsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="bank-transactions">
        <PilotSurfaceBoundary
          fallback={
            <div className="p-4 text-muted-foreground">
              Loading bank transactions...
            </div>
          }
        >
          <BankTransactionsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="fiscal-periods">
        <PilotSurfaceBoundary
          fallback={
            <div className="p-4 text-muted-foreground">
              Loading fiscal periods...
            </div>
          }
        >
          <FiscalPeriodsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
