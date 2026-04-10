import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
  type LinearWorkspaceTab,
} from "@/components/layout/LinearWorkspaceShell";
import {
  OperationalEmptyState,
  WorkspaceCommandStripLink,
} from "@/components/ui/operational-states";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { PurchaseOrderSurface } from "@/components/spreadsheet-native/PurchaseOrderSurface";
import { buildOperationsWorkspacePath } from "@/lib/workspaceRoutes";
import { useLocation, useSearch } from "wouter";

type ProcurementTab = "purchase-orders";
type ProcurementQueryTab =
  | ProcurementTab
  | "product-intake"
  | "inventory-browse"
  | "receiving";

const PROCUREMENT_TABS = [
  { value: "purchase-orders", label: "Purchase Orders" },
] as const satisfies readonly LinearWorkspaceTab<ProcurementTab>[];

export default function ProcurementWorkspacePage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { activeTab, setActiveTab } = useQueryTabState<ProcurementQueryTab>({
    defaultTab: "purchase-orders",
    validTabs: [
      ...PROCUREMENT_TABS.map(tab => tab.value),
      "product-intake",
      "inventory-browse",
      "receiving",
    ],
  });
  const redirectParams = Object.fromEntries(
    Array.from(new URLSearchParams(search).entries()).filter(
      ([key]) => key !== "tab"
    )
  );

  useWorkspaceHomeTelemetry("procurement", activeTab);

  const redirectTarget =
    activeTab === "receiving" || activeTab === "product-intake"
      ? buildOperationsWorkspacePath("receiving", redirectParams)
      : activeTab === "inventory-browse"
        ? buildOperationsWorkspacePath("inventory", redirectParams)
        : null;
  const isRedirectContext = redirectTarget !== null;

  return (
    <LinearWorkspaceShell
      title="Procurement"
      description="Create purchase orders here, then continue product intake and inventory work from Operations."
      section="Operations"
      activeTab={isRedirectContext ? "purchase-orders" : activeTab}
      tabs={PROCUREMENT_TABS}
      onTabChange={setActiveTab}
      meta={[
        {
          label: "Primary queue",
          value: "Purchase order authoring",
        },
        {
          label: "Next move",
          value: isRedirectContext
            ? "Continue in Operations"
            : "Receive, inspect, and stock",
        },
        {
          label: "Receiving path",
          value: "Operations -> Product Intake",
        },
      ]}
      commandStrip={
        <div className="flex flex-wrap items-center gap-2">
          <WorkspaceCommandStripLink
            label="Purchase Orders"
            onClick={() => setActiveTab("purchase-orders")}
            active={!isRedirectContext}
          />
          <WorkspaceCommandStripLink
            label="Product Intake"
            onClick={() => setLocation(buildOperationsWorkspacePath("receiving"))}
          />
          <WorkspaceCommandStripLink
            label="Inventory"
            onClick={() => setLocation(buildOperationsWorkspacePath("inventory"))}
          />
        </div>
      }
    >
      <LinearWorkspacePanel value="purchase-orders">
        {isRedirectContext ? (
          <OperationalEmptyState
            variant="inventory"
            title="This workflow moved to Operations"
            description={
              activeTab === "inventory-browse"
                ? "Inventory browse now lives in the Operations workspace so purchasing and stock review stay in one place."
                : "Receiving and product intake now live in the Operations workspace so operators can move from PO to intake without losing context."
            }
            action={{
              label: "Open Operations",
              onClick: () => setLocation(redirectTarget),
            }}
            secondaryAction={{
              label: "Stay on Purchase Orders",
              onClick: () => setActiveTab("purchase-orders"),
            }}
            filterActive
          />
        ) : (
          <PurchaseOrderSurface />
        )}
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
