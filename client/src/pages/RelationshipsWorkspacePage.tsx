import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientsWorkSurface from "@/components/work-surface/ClientsWorkSurface";
import VendorsWorkSurface from "@/components/work-surface/VendorsWorkSurface";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { RELATIONSHIPS_WORKSPACE } from "@/config/workspaces";

type RelationshipTab = (typeof RELATIONSHIPS_WORKSPACE.tabs)[number]["value"];
const RELATIONSHIP_TABS = RELATIONSHIPS_WORKSPACE.tabs.map(
  tab => tab.value
) as readonly RelationshipTab[];

export default function RelationshipsWorkspacePage() {
  const { activeTab, setActiveTab } = useQueryTabState<RelationshipTab>({
    defaultTab: "clients",
    validTabs: RELATIONSHIP_TABS,
  });
  useWorkspaceHomeTelemetry("relationships", activeTab);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {RELATIONSHIPS_WORKSPACE.title}
        </h1>
        <p className="text-muted-foreground">
          {RELATIONSHIPS_WORKSPACE.description}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as RelationshipTab)}
      >
        <TabsList className="grid w-full grid-cols-2 gap-1">
          {RELATIONSHIPS_WORKSPACE.tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <ClientsWorkSurface />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-4">
          <VendorsWorkSurface />
        </TabsContent>
      </Tabs>
    </div>
  );
}
