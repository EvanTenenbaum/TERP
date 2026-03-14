import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
  type LinearWorkspaceTab,
} from "@/components/layout/LinearWorkspaceShell";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import PurchaseOrdersSlicePage from "@/components/uiux-slice/PurchaseOrdersSlicePage";
import { buildOperationsWorkspacePath } from "@/lib/workspaceRoutes";
import { Redirect } from "wouter";

type ProcurementTab = "purchase-orders";
type ProcurementQueryTab =
  | ProcurementTab
  | "product-intake"
  | "inventory-browse"
  | "receiving";

const PROCUREMENT_TABS = [
  { value: "purchase-orders", label: "Purchase Orders" },
] as const satisfies readonly LinearWorkspaceTab<ProcurementTab>[];

export default function ProcurementWorkspacePage() {
  const { activeTab, setActiveTab } = useQueryTabState<ProcurementQueryTab>({
    defaultTab: "purchase-orders",
    validTabs: [
      ...PROCUREMENT_TABS.map(tab => tab.value),
      "product-intake",
      "inventory-browse",
      "receiving",
    ],
  });

  useWorkspaceHomeTelemetry("procurement", activeTab);

  if (activeTab === "receiving" || activeTab === "product-intake") {
    return <Redirect to={buildOperationsWorkspacePath("receiving")} />;
  }

  if (activeTab === "inventory-browse") {
    return <Redirect to={buildOperationsWorkspacePath("inventory")} />;
  }

  return (
    <LinearWorkspaceShell
      title="Procurement"
      description="Create purchase orders here, then complete receiving and inventory work from Operations."
      section="Operations"
      activeTab={activeTab}
      tabs={PROCUREMENT_TABS}
      onTabChange={setActiveTab}
      meta={[
        {
          label: "Operational spine",
          value: "Purchase Order -> Receiving -> Inventory",
        },
        {
          label: "Downstream work",
          value: "Use Operations for receiving, shipping, and stock control",
        },
      ]}
    >
      <LinearWorkspacePanel value="purchase-orders">
        <PurchaseOrdersSlicePage />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
