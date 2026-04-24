import { useMemo } from "react";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
  type LinearWorkspaceTab,
} from "@/components/layout/LinearWorkspaceShell";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { PurchaseOrderSurface } from "@/components/spreadsheet-native/PurchaseOrderSurface";
import {
  buildOperationsWorkspacePath,
  buildProcurementWorkspacePath,
} from "@/lib/workspaceRoutes";
import { Redirect, useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";

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

  // TER-1060: read expectedToday param to pre-activate the "Expected Today" filter
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const expectedTodayParam = searchParams.get("expectedToday");
  const initialShowExpectedToday =
    expectedTodayParam === "1" || expectedTodayParam === "true";

  useWorkspaceHomeTelemetry("procurement", activeTab);

  if (activeTab === "receiving" || activeTab === "product-intake") {
    return (
      <Redirect
        to={buildOperationsWorkspacePath("receiving", redirectParams)}
      />
    );
  }

  if (activeTab === "inventory-browse") {
    return (
      <Redirect
        to={buildOperationsWorkspacePath("inventory", redirectParams)}
      />
    );
  }

  return (
    <LinearWorkspaceShell
      title="Buying"
      activeTab={activeTab}
      tabs={PROCUREMENT_TABS}
      onTabChange={setActiveTab}
      commandStrip={
        // TER-1060: Quick-nav shortcut into the "Expected Deliveries Today" filtered view
        <Button
          size="sm"
          variant={initialShowExpectedToday ? "default" : "outline"}
          className="text-xs"
          onClick={() =>
            setLocation(
              buildProcurementWorkspacePath(undefined, {
                expectedToday: initialShowExpectedToday ? undefined : "1",
              })
            )
          }
        >
          <Truck className="mr-1 h-3 w-3" />
          Expected Today
        </Button>
      }
    >
      <LinearWorkspacePanel value="purchase-orders">
        <PurchaseOrderSurface
          initialShowExpectedToday={initialShowExpectedToday}
        />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
