import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import InventoryWorkSurface from "@/components/work-surface/InventoryWorkSurface";
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
      section="Buy"
      activeTab={activeTab}
      tabs={INVENTORY_WORKSPACE.tabs}
      onTabChange={tab => setActiveTab(tab)}
      meta={[
        { label: "Views", value: "Table + Gallery" },
        { label: "Focus", value: "Batch operations" },
      ]}
      commandStrip={
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLocation("/direct-intake")}
        >
          New Intake
        </Button>
      }
      className="min-h-[calc(100vh-8.5rem)]"
    >
      <LinearWorkspacePanel value="inventory">
        <div data-testid="inventory-header" className="contents">
          <InventoryWorkSurface />
        </div>
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
