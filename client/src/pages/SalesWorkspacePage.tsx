import OrdersWorkSurface from "@/components/work-surface/OrdersWorkSurface";
import QuotesWorkSurface from "@/components/work-surface/QuotesWorkSurface";
import PickPackWorkSurface from "@/components/work-surface/PickPackWorkSurface";
import ReturnsPage from "@/pages/ReturnsPage";
import OrderCreatorPage from "@/pages/OrderCreatorPage";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { SALES_WORKSPACE } from "@/config/workspaces";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
  type LinearWorkspaceTab,
} from "@/components/layout/LinearWorkspaceShell";

type BaseSalesTab = (typeof SALES_WORKSPACE.tabs)[number]["value"];
type SalesTab = BaseSalesTab | "create-order" | "pick-pack";

const SALES_TABS_CONFIG = [
  ...SALES_WORKSPACE.tabs,
  { value: "create-order", label: "New Sales Order" },
  { value: "pick-pack", label: "Pick & Pack" },
] as const satisfies readonly LinearWorkspaceTab<SalesTab>[];

const SALES_TABS = SALES_TABS_CONFIG.map(
  tab => tab.value
) as readonly SalesTab[];

export default function SalesWorkspacePage() {
  const { activeTab, setActiveTab } = useQueryTabState<SalesTab>({
    defaultTab: "orders",
    validTabs: SALES_TABS,
  });
  useWorkspaceHomeTelemetry("sales", activeTab);

  return (
    <LinearWorkspaceShell
      title={SALES_WORKSPACE.title}
      description={SALES_WORKSPACE.description}
      section="Sell"
      activeTab={activeTab}
      tabs={SALES_TABS_CONFIG}
      onTabChange={tab => setActiveTab(tab)}
      meta={[
        { label: "Primary flow", value: "Quote -> Order -> Fulfillment" },
      ]}
    >
      <LinearWorkspacePanel value="orders">
        <OrdersWorkSurface />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="quotes">
        <QuotesWorkSurface />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="returns">
        <ReturnsPage embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="create-order">
        <OrderCreatorPage />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="pick-pack">
        <PickPackWorkSurface />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
