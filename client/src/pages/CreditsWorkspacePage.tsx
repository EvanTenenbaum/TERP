import { Button } from "@/components/ui/button";
import CreditsPage from "@/pages/CreditsPage";
import CreditSettingsPage from "@/pages/CreditSettingsPage";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { CREDITS_WORKSPACE } from "@/config/workspaces";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "@/components/layout/LinearWorkspaceShell";

type CreditsTab = (typeof CREDITS_WORKSPACE.tabs)[number]["value"];
const CREDITS_TABS = CREDITS_WORKSPACE.tabs.map(
  tab => tab.value
) as readonly CreditsTab[];

export default function CreditsWorkspacePage() {
  const { activeTab, setActiveTab } = useQueryTabState<CreditsTab>({
    defaultTab: "credits",
    validTabs: CREDITS_TABS,
  });
  useWorkspaceHomeTelemetry("credits", activeTab);

  return (
    <LinearWorkspaceShell
      title={CREDITS_WORKSPACE.title}
      description={CREDITS_WORKSPACE.description}
      activeTab={activeTab}
      tabs={CREDITS_WORKSPACE.tabs}
      onTabChange={tab => setActiveTab(tab)}
      meta={[
        { label: "Risk", value: "A/R exposure and limits" },
        { label: "Controls", value: "Credit policy settings" },
      ]}
      commandStrip={
        <>
          <Button size="sm" variant="outline" onClick={() => setActiveTab("credits")}>
            Open Credits
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setActiveTab("settings")}>
            Open Settings
          </Button>
        </>
      }
    >
      <LinearWorkspacePanel value="credits">
        <CreditsPage embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="settings">
        <CreditSettingsPage embedded />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
