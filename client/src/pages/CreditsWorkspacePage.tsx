import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreditsPage from "@/pages/CreditsPage";
import CreditSettingsPage from "@/pages/CreditSettingsPage";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { CREDITS_WORKSPACE } from "@/config/workspaces";

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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {CREDITS_WORKSPACE.title}
        </h1>
        <p className="text-muted-foreground">{CREDITS_WORKSPACE.description}</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as CreditsTab)}
      >
        <TabsList className="grid w-full grid-cols-2 gap-1">
          {CREDITS_WORKSPACE.tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="credits" className="mt-4">
          <CreditsPage embedded />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <CreditSettingsPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
