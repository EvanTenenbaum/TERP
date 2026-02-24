import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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

type ProcurementTab = "purchase-orders" | "product-intake" | "inventory-browse";

const PROCUREMENT_TABS = [
  { value: "purchase-orders", label: "Purchase Orders" },
  { value: "product-intake", label: "Product Intake" },
  { value: "inventory-browse", label: "Inventory Browse" },
] as const satisfies readonly LinearWorkspaceTab<ProcurementTab>[];

export default function ProcurementWorkspacePage() {
  const [, setLocation] = useLocation();
  const { activeTab, setActiveTab } = useQueryTabState<ProcurementTab>({
    defaultTab: "purchase-orders",
    validTabs: PROCUREMENT_TABS.map(tab => tab.value),
  });

  useWorkspaceHomeTelemetry("procurement", activeTab);

  return (
    <LinearWorkspaceShell
      title="Procurement"
      description="Run the complete procurement spine from Purchase Order to Product Intake to Received corrections."
      activeTab={activeTab}
      tabs={PROCUREMENT_TABS}
      onTabChange={setActiveTab}
      meta={[
        {
          label: "Operational spine",
          value: "Purchase Order -> Product Intake -> Receive -> Corrections",
        },
        {
          label: "Mode",
          value:
            PROCUREMENT_TABS.find(tab => tab.value === activeTab)?.label ??
            activeTab,
        },
      ]}
      commandStrip={
        <>
          <Button
            size="sm"
            variant={activeTab === "purchase-orders" ? "default" : "outline"}
            onClick={() => setActiveTab("purchase-orders")}
          >
            Purchase Orders
          </Button>
          <Button
            size="sm"
            variant={activeTab === "product-intake" ? "default" : "outline"}
            onClick={() => setActiveTab("product-intake")}
          >
            Product Intake
          </Button>
          <Button
            size="sm"
            variant={activeTab === "inventory-browse" ? "default" : "outline"}
            onClick={() => setActiveTab("inventory-browse")}
          >
            Inventory Browse
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLocation("/direct-intake")}
          >
            Direct Intake
          </Button>
        </>
      }
    >
      <LinearWorkspacePanel value="purchase-orders">
        <PurchaseOrdersWorkSurface />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="product-intake">
        <ProductIntakeSlicePage />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="inventory-browse">
        <InventoryBrowseSlicePage />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
