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
import {
  WorkspaceCommandStripLink,
  WorkspacePanelSkeleton,
} from "@/components/ui/operational-states";

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
      description={ACCOUNTING_WORKSPACE.description}
      section="Finance"
      activeTab={activeTab}
      tabs={ACCOUNTING_WORKSPACE.tabs}
      onTabChange={setActiveTab}
      meta={[
        {
          label: "Financial period",
          value: activeTab === "fiscal-periods" ? "Period controls" : "Current fiscal year",
        },
        {
          label: "Active lane",
          value:
            activeTab === "dashboard"
              ? "Receivables and payables summary"
              : activeTab === "payments"
                ? "Cash application"
                : activeTab === "general-ledger"
                  ? "Ledger review"
                  : "Accounting operations",
        },
        {
          label: "Flow",
          value: "Invoice -> Payment -> General Ledger",
        },
      ]}
      commandStrip={
        <div className="flex flex-wrap items-center gap-2">
          <WorkspaceCommandStripLink
            label="Dashboard"
            onClick={() => setActiveTab("dashboard")}
            active={activeTab === "dashboard"}
          />
          <WorkspaceCommandStripLink
            label="Invoices"
            onClick={() => setActiveTab("invoices")}
            active={activeTab === "invoices"}
          />
          <WorkspaceCommandStripLink
            label="Payments"
            onClick={() => setActiveTab("payments")}
            active={activeTab === "payments"}
          />
          <WorkspaceCommandStripLink
            label="Periods"
            onClick={() => setActiveTab("fiscal-periods")}
            active={activeTab === "fiscal-periods"}
          />
        </div>
      }
    >
      <LinearWorkspacePanel value="dashboard">
        <AccountingDashboard embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="invoices">
        <PilotSurfaceBoundary
          fallback={
            <WorkspacePanelSkeleton
              title="Loading invoices"
              data-testid="accounting-invoices-skeleton"
            />
          }
        >
          <InvoicesSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="bills">
        <PilotSurfaceBoundary
          fallback={
            <WorkspacePanelSkeleton
              title="Loading bills"
              data-testid="accounting-bills-skeleton"
            />
          }
        >
          <BillsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="payments">
        <PilotSurfaceBoundary
          fallback={
            <WorkspacePanelSkeleton
              title="Loading payments"
              data-testid="accounting-payments-skeleton"
            />
          }
        >
          <PaymentsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="general-ledger">
        <PilotSurfaceBoundary
          fallback={<WorkspacePanelSkeleton title="Loading general ledger" />}
        >
          <GeneralLedgerSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="chart-of-accounts">
        <PilotSurfaceBoundary
          fallback={<WorkspacePanelSkeleton title="Loading chart of accounts" />}
        >
          <ChartOfAccountsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="expenses">
        <PilotSurfaceBoundary
          fallback={<WorkspacePanelSkeleton title="Loading expenses" />}
        >
          <ExpensesSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="bank-accounts">
        <PilotSurfaceBoundary
          fallback={<WorkspacePanelSkeleton title="Loading bank accounts" />}
        >
          <BankAccountsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="bank-transactions">
        <PilotSurfaceBoundary
          fallback={<WorkspacePanelSkeleton title="Loading bank transactions" />}
        >
          <BankTransactionsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="fiscal-periods">
        <PilotSurfaceBoundary
          fallback={<WorkspacePanelSkeleton title="Loading fiscal periods" />}
        >
          <FiscalPeriodsSurface />
        </PilotSurfaceBoundary>
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
