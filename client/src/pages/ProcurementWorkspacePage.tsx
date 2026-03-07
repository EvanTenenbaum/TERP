import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
  type LinearWorkspaceTab,
} from "@/components/layout/LinearWorkspaceShell";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import ProductIntakeSlicePage from "@/components/uiux-slice/ProductIntakeSlicePage";
import InventoryBrowseSlicePage from "@/components/uiux-slice/InventoryBrowseSlicePage";
import PurchaseOrdersWorkSurface from "@/components/work-surface/PurchaseOrdersWorkSurface";
import DirectIntakeWorkSurface from "@/components/work-surface/DirectIntakeWorkSurface";

type ProcurementTab =
  | "purchase-orders"
  | "product-intake"
  | "receiving"
  | "inventory-browse";

const PROCUREMENT_TABS = [
  { value: "purchase-orders", label: "Purchase Orders" },
  { value: "product-intake", label: "Product Intake" },
  { value: "receiving", label: "Intake" },
  { value: "inventory-browse", label: "Inventory Browse" },
] as const satisfies readonly LinearWorkspaceTab<ProcurementTab>[];

export default function ProcurementWorkspacePage() {
  const { activeTab, setActiveTab } = useQueryTabState<ProcurementTab>({
    defaultTab: "purchase-orders",
    validTabs: PROCUREMENT_TABS.map(tab => tab.value),
  });

  useWorkspaceHomeTelemetry("procurement", activeTab);

  return (
    <LinearWorkspaceShell
      title="Procurement"
      description="Run the complete procurement spine from Purchase Order to Product Intake to Intake."
      section="Buy"
      activeTab={activeTab}
      tabs={PROCUREMENT_TABS}
      onTabChange={setActiveTab}
      meta={[
        {
          label: "Operational spine",
          value: "Purchase Order -> Product Intake -> Intake -> Corrections",
        },
        {
          label: "Mode",
          value:
            PROCUREMENT_TABS.find(tab => tab.value === activeTab)?.label ??
            activeTab,
        },
      ]}
    >
      <LinearWorkspacePanel value="purchase-orders">
        <PurchaseOrdersWorkSurface />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="product-intake">
        <ProductIntakeSlicePage />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="receiving">
        <DirectIntakeWorkSurface />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="inventory-browse">
        <InventoryBrowseSlicePage />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
