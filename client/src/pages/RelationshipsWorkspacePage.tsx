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
  const { activeTab, setActiveTab } = useQueryTabState<RelationshipTab>({
    defaultTab: "clients",
    validTabs: RELATIONSHIP_TABS,
  });
  useWorkspaceHomeTelemetry("relationships", activeTab);

  return (
    <LinearWorkspaceShell
      title={RELATIONSHIPS_WORKSPACE.title}
      description="Move between buyers and suppliers with the two-way context operators actually need."
      section="Relationships"
      activeTab={activeTab}
      tabs={RELATIONSHIPS_WORKSPACE.tabs}
      onTabChange={tab => setActiveTab(tab)}
      meta={[
        { label: "Buyer view", value: "Clients" },
        { label: "Supplier view", value: "Suppliers" },
      ]}
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
