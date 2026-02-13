import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrdersWorkSurface from "@/components/work-surface/OrdersWorkSurface";
import QuotesWorkSurface from "@/components/work-surface/QuotesWorkSurface";
import ReturnsPage from "@/pages/ReturnsPage";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { SALES_WORKSPACE } from "@/config/workspaces";

type SalesTab = (typeof SALES_WORKSPACE.tabs)[number]["value"];
const SALES_TABS = SALES_WORKSPACE.tabs.map(
  tab => tab.value
) as readonly SalesTab[];

export default function SalesWorkspacePage() {
  const { activeTab, setActiveTab } = useQueryTabState<SalesTab>({
    defaultTab: "orders",
    validTabs: SALES_TABS,
  });
  useWorkspaceHomeTelemetry("sales", activeTab);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {SALES_WORKSPACE.title}
        </h1>
        <p className="text-muted-foreground">{SALES_WORKSPACE.description}</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as SalesTab)}
      >
        <TabsList className="grid w-full grid-cols-3 gap-1">
          {SALES_WORKSPACE.tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <OrdersWorkSurface />
        </TabsContent>
        <TabsContent value="quotes" className="mt-4">
          <QuotesWorkSurface />
        </TabsContent>
        <TabsContent value="returns" className="mt-4">
          <ReturnsPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
