import { Button } from "@/components/ui/button";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "@/components/layout/LinearWorkspaceShell";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { ACCOUNTING_WORKSPACE } from "@/config/workspaces";
import AccountingDashboard from "@/pages/accounting/AccountingDashboard";
import InvoicesWorkSurface from "@/components/work-surface/InvoicesWorkSurface";
import Bills from "@/pages/accounting/Bills";
import Payments from "@/pages/accounting/Payments";
import GeneralLedger from "@/pages/accounting/GeneralLedger";
import ChartOfAccounts from "@/pages/accounting/ChartOfAccounts";
import Expenses from "@/pages/accounting/Expenses";
import BankAccounts from "@/pages/accounting/BankAccounts";
import BankTransactions from "@/pages/accounting/BankTransactions";
import FiscalPeriods from "@/pages/accounting/FiscalPeriods";

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
      activeTab={activeTab}
      tabs={ACCOUNTING_WORKSPACE.tabs}
      onTabChange={setActiveTab}
      meta={[
        {
          label: "Core flow",
          value: "Invoice / Bill -> Payment -> Ledger",
        },
        {
          label: "Current view",
          value:
            ACCOUNTING_WORKSPACE.tabs.find(tab => tab.value === activeTab)
              ?.label ?? activeTab,
        },
      ]}
      commandStrip={
        <>
          <Button
            size="sm"
            variant={activeTab === "invoices" ? "default" : "outline"}
            onClick={() => setActiveTab("invoices")}
          >
            Invoices
          </Button>
          <Button
            size="sm"
            variant={activeTab === "bills" ? "default" : "outline"}
            onClick={() => setActiveTab("bills")}
          >
            Bills
          </Button>
          <Button
            size="sm"
            variant={activeTab === "payments" ? "default" : "outline"}
            onClick={() => setActiveTab("payments")}
          >
            Payments
          </Button>
        </>
      }
    >
      <LinearWorkspacePanel value="dashboard">
        <AccountingDashboard embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="invoices">
        <InvoicesWorkSurface />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="bills">
        <Bills embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="payments">
        <Payments embedded />
      </LinearWorkspacePanel>
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
