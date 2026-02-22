import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import ClientsWorkSurface from "@/components/work-surface/ClientsWorkSurface";
import VendorsWorkSurface from "@/components/work-surface/VendorsWorkSurface";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { RELATIONSHIPS_WORKSPACE } from "@/config/workspaces";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "@/components/layout/LinearWorkspaceShell";

type RelationshipTab = (typeof RELATIONSHIPS_WORKSPACE.tabs)[number]["value"];
const RELATIONSHIP_TABS = RELATIONSHIPS_WORKSPACE.tabs.map(
  tab => tab.value
) as readonly RelationshipTab[];

export default function RelationshipsWorkspacePage() {
  const [, setLocation] = useLocation();
  const { activeTab, setActiveTab } = useQueryTabState<RelationshipTab>({
    defaultTab: "clients",
    validTabs: RELATIONSHIP_TABS,
  });
  useWorkspaceHomeTelemetry("relationships", activeTab);

  return (
    <LinearWorkspaceShell
      title={RELATIONSHIPS_WORKSPACE.title}
      description={RELATIONSHIPS_WORKSPACE.description}
      activeTab={activeTab}
      tabs={RELATIONSHIPS_WORKSPACE.tabs}
      onTabChange={tab => setActiveTab(tab)}
      meta={[
        { label: "Buyer records", value: "Clients" },
        { label: "Supplier records", value: "Suppliers" },
      ]}
      commandStrip={
        <>
          <Button size="sm" variant="outline" onClick={() => setLocation("/clients")}>
            Open Client List
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setActiveTab("suppliers")}>
            Jump to Suppliers
          </Button>
        </>
      }
    >
      <LinearWorkspacePanel value="clients">
        <ClientsWorkSurface />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="suppliers">
        <VendorsWorkSurface />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
