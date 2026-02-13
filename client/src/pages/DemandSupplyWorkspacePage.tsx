import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import NeedsManagementPage from "@/pages/NeedsManagementPage";
import InterestListPage from "@/pages/InterestListPage";
import MatchmakingServicePage from "@/pages/MatchmakingServicePage";
import VendorSupplyPage from "@/pages/VendorSupplyPage";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { DEMAND_SUPPLY_WORKSPACE } from "@/config/workspaces";

type DemandSupplyTab = (typeof DEMAND_SUPPLY_WORKSPACE.tabs)[number]["value"];
const DEMAND_SUPPLY_TABS = DEMAND_SUPPLY_WORKSPACE.tabs.map(
  tab => tab.value
) as readonly DemandSupplyTab[];

export default function DemandSupplyWorkspacePage() {
  const { activeTab, setActiveTab } = useQueryTabState<DemandSupplyTab>({
    defaultTab: "matchmaking",
    validTabs: DEMAND_SUPPLY_TABS,
  });
  useWorkspaceHomeTelemetry("demand-supply", activeTab);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {DEMAND_SUPPLY_WORKSPACE.title}
        </h1>
        <p className="text-muted-foreground">
          {DEMAND_SUPPLY_WORKSPACE.description}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as DemandSupplyTab)}
      >
        <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-4">
          {DEMAND_SUPPLY_WORKSPACE.tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="matchmaking" className="mt-4">
          <MatchmakingServicePage embedded />
        </TabsContent>
        <TabsContent value="needs" className="mt-4">
          <NeedsManagementPage embedded />
        </TabsContent>
        <TabsContent value="interest-list" className="mt-4">
          <InterestListPage />
        </TabsContent>
        <TabsContent value="vendor-supply" className="mt-4">
          <VendorSupplyPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
