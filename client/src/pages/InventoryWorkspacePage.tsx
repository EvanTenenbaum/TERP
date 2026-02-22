import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import InventoryWorkSurface from "@/components/work-surface/InventoryWorkSurface";
import ProductsWorkSurface from "@/components/work-surface/ProductsWorkSurface";
import InventoryBrowseSlicePage from "@/components/uiux-slice/InventoryBrowseSlicePage";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { INVENTORY_WORKSPACE } from "@/config/workspaces";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "@/components/layout/LinearWorkspaceShell";

type InventoryTab = (typeof INVENTORY_WORKSPACE.tabs)[number]["value"];
const INVENTORY_TABS = INVENTORY_WORKSPACE.tabs.map(
  tab => tab.value
) as readonly InventoryTab[];

export default function InventoryWorkspacePage() {
  const [, setLocation] = useLocation();
  const { activeTab, setActiveTab } = useQueryTabState<InventoryTab>({
    defaultTab: "inventory",
    validTabs: INVENTORY_TABS,
  });
  useWorkspaceHomeTelemetry("inventory", activeTab);

  return (
    <LinearWorkspaceShell
      title={INVENTORY_WORKSPACE.title}
      description={INVENTORY_WORKSPACE.description}
      activeTab={activeTab}
      tabs={INVENTORY_WORKSPACE.tabs}
      onTabChange={tab => setActiveTab(tab)}
      meta={[
        { label: "Primary", value: "Inventory positions" },
        { label: "Secondary", value: "Product catalog" },
      ]}
      commandStrip={
        <>
          <Button size="sm" variant="outline" onClick={() => setLocation("/direct-intake")}>
            New Intake
          </Button>
          <Button size="sm" variant="outline" onClick={() => setActiveTab("browse")}>
            Browse SKU Grid
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setActiveTab("products")}>
            Jump to Products
          </Button>
        </>
      }
      className="min-h-[calc(100vh-8.5rem)]"
    >
      <LinearWorkspacePanel value="inventory">
        <div data-testid="inventory-header" className="contents">
          <InventoryWorkSurface />
        </div>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="browse">
        <InventoryBrowseSlicePage />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="products">
        <ProductsWorkSurface />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
