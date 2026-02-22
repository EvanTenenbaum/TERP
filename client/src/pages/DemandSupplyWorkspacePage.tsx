import { Button } from "@/components/ui/button";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import NeedsManagementPage from "@/pages/NeedsManagementPage";
import InterestListPage from "@/pages/InterestListPage";
import MatchmakingServicePage from "@/pages/MatchmakingServicePage";
import VendorSupplyPage from "@/pages/VendorSupplyPage";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { DEMAND_SUPPLY_WORKSPACE } from "@/config/workspaces";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "@/components/layout/LinearWorkspaceShell";

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
    <LinearWorkspaceShell
      title={DEMAND_SUPPLY_WORKSPACE.title}
      description={DEMAND_SUPPLY_WORKSPACE.description}
      activeTab={activeTab}
      tabs={DEMAND_SUPPLY_WORKSPACE.tabs}
      onTabChange={tab => setActiveTab(tab)}
      meta={[
        { label: "Primary", value: "Matching supply with demand" },
        { label: "Current view", value: DEMAND_SUPPLY_WORKSPACE.tabs.find(tab => tab.value === activeTab)?.label ?? activeTab },
      ]}
      commandStrip={
        <>
          <Button size="sm" variant="outline" onClick={() => setActiveTab("matchmaking")}>
            Open Matchmaking
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setActiveTab("vendor-supply")}>
            Jump to Vendor Supply
          </Button>
        </>
      }
    >
      <LinearWorkspacePanel value="matchmaking">
        <MatchmakingServicePage embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="needs">
        <NeedsManagementPage embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="interest-list">
        <InterestListPage />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="vendor-supply">
        <VendorSupplyPage embedded />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
