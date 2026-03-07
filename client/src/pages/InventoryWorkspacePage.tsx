import InventoryWorkSurface from "@/components/work-surface/InventoryWorkSurface";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { INVENTORY_WORKSPACE } from "@/config/workspaces";

type InventoryTab = (typeof INVENTORY_WORKSPACE.tabs)[number]["value"];
const INVENTORY_TABS = INVENTORY_WORKSPACE.tabs.map(
  tab => tab.value
) as readonly InventoryTab[];

export default function InventoryWorkspacePage() {
  const { activeTab } = useQueryTabState<InventoryTab>({
    defaultTab: "inventory",
    validTabs: INVENTORY_TABS,
  });
  useWorkspaceHomeTelemetry("inventory", activeTab);

  return (
    <div
      data-testid="inventory-header"
      className="linear-workspace-shell min-h-[calc(100vh-8.5rem)]"
    >
      <h1 className="sr-only">{INVENTORY_WORKSPACE.title}</h1>
      <InventoryWorkSurface />
    </div>
  );
}
