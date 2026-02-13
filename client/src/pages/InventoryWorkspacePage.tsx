import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryWorkSurface from "@/components/work-surface/InventoryWorkSurface";
import ProductsWorkSurface from "@/components/work-surface/ProductsWorkSurface";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { INVENTORY_WORKSPACE } from "@/config/workspaces";

type InventoryTab = (typeof INVENTORY_WORKSPACE.tabs)[number]["value"];
const INVENTORY_TABS = INVENTORY_WORKSPACE.tabs.map(
  tab => tab.value
) as readonly InventoryTab[];

export default function InventoryWorkspacePage() {
  const { activeTab, setActiveTab } = useQueryTabState<InventoryTab>({
    defaultTab: "inventory",
    validTabs: INVENTORY_TABS,
  });
  useWorkspaceHomeTelemetry("inventory", activeTab);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {INVENTORY_WORKSPACE.title}
        </h1>
        <p className="text-muted-foreground">
          {INVENTORY_WORKSPACE.description}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as InventoryTab)}
      >
        <TabsList className="grid w-full grid-cols-2 gap-1">
          {INVENTORY_WORKSPACE.tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          <InventoryWorkSurface />
        </TabsContent>
        <TabsContent value="products" className="mt-4">
          <ProductsWorkSurface />
        </TabsContent>
      </Tabs>
    </div>
  );
}
