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
import { lazy } from "react";
import SheetModeToggle from "@/components/spreadsheet-native/SheetModeToggle";
import { PilotSurfaceBoundary } from "@/components/spreadsheet-native/PilotSurfaceBoundary";

const PaymentsPilotSurface = lazy(
  () => import("@/components/spreadsheet-native/PaymentsPilotSurface")
);
const InvoicesPilotSurface = lazy(
  () => import("@/components/spreadsheet-native/InvoicesPilotSurface")
);
import {
  buildSurfaceAvailability,
  useSpreadsheetPilotAvailability,
  useSpreadsheetSurfaceMode,
} from "@/lib/spreadsheet-native";

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

  // Sheet-native pilot: supported on the payments and invoices tabs
  const pilotSurfaceSupported =
    activeTab === "payments" || activeTab === "invoices";
  const { sheetPilotEnabled, availabilityReady } =
    useSpreadsheetPilotAvailability(pilotSurfaceSupported);
  const { surfaceMode, setSurfaceMode } = useSpreadsheetSurfaceMode(
    buildSurfaceAvailability(activeTab, sheetPilotEnabled, availabilityReady)
  );

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
      commandStrip={
        pilotSurfaceSupported ? (
          <SheetModeToggle
            enabled={sheetPilotEnabled}
            surfaceMode={surfaceMode}
            onSurfaceModeChange={setSurfaceMode}
          />
        ) : null
      }
    >
      <LinearWorkspacePanel value="dashboard">
        <AccountingDashboard embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="invoices">
        {surfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<InvoicesWorkSurface />}>
            <InvoicesPilotSurface
              onOpenClassic={() => setSurfaceMode("classic")}
            />
          </PilotSurfaceBoundary>
        ) : (
          <InvoicesWorkSurface />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="bills">
        <Bills embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="payments">
        {surfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<Payments embedded />}>
            <PaymentsPilotSurface
              onOpenClassic={() => setSurfaceMode("classic")}
            />
          </PilotSurfaceBoundary>
        ) : (
          <Payments embedded />
        )}
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
