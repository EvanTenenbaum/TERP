import ClientsWorkSurface from "@/components/work-surface/ClientsWorkSurface";
import VendorsWorkSurface from "@/components/work-surface/VendorsWorkSurface";
import { WorkspaceCommandStripLink } from "@/components/ui/operational-states";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { RELATIONSHIPS_WORKSPACE } from "@/config/workspaces";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "@/components/layout/LinearWorkspaceShell";
import { useLocation } from "wouter";

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
      section="Relationships"
      activeTab={activeTab}
      tabs={RELATIONSHIPS_WORKSPACE.tabs}
      onTabChange={tab => setActiveTab(tab)}
      meta={[
        { label: "Buyer records", value: "Clients" },
        { label: "Supplier records", value: "Suppliers" },
        {
          label: "Operator lens",
          value:
            activeTab === "clients"
              ? "Conversation and money readiness"
              : "Supplier continuity and intake context",
        },
      ]}
      commandStrip={
        <div className="flex flex-wrap items-center gap-2">
          <WorkspaceCommandStripLink
            label="Clients"
            onClick={() => setActiveTab("clients")}
            active={activeTab === "clients"}
          />
          <WorkspaceCommandStripLink
            label="Suppliers"
            onClick={() => setActiveTab("suppliers")}
            active={activeTab === "suppliers"}
          />
          <WorkspaceCommandStripLink
            label="Notifications"
            onClick={() => setLocation("/notifications")}
          />
        </div>
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
