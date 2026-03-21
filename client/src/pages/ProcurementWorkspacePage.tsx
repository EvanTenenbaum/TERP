import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
  type LinearWorkspaceTab,
} from "@/components/layout/LinearWorkspaceShell";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import PurchaseOrdersSlicePage from "@/components/uiux-slice/PurchaseOrdersSlicePage";
import PurchaseOrdersPilotSurface from "@/components/spreadsheet-native/PurchaseOrdersPilotSurface";
import SheetModeToggle from "@/components/spreadsheet-native/SheetModeToggle";
import { buildOperationsWorkspacePath } from "@/lib/workspaceRoutes";
import {
  useSpreadsheetPilotAvailability,
  useSpreadsheetSurfaceMode,
} from "@/lib/spreadsheet-native";
import { Redirect, useLocation, useSearch } from "wouter";

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
  const [, setLocation] = useLocation();
  const search = useSearch();
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

  const pilotSurfaceSupported = activeTab === "purchase-orders";
  const { sheetPilotEnabled, availabilityReady } =
    useSpreadsheetPilotAvailability(pilotSurfaceSupported);
  const { surfaceMode, setSurfaceMode } = useSpreadsheetSurfaceMode({
    enabled: sheetPilotEnabled,
    ready: availabilityReady,
  });

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
      title="Procurement"
      description="Create purchase orders here, then complete receiving and inventory work from Operations."
      section="Operations"
      activeTab={activeTab}
      tabs={PROCUREMENT_TABS}
      onTabChange={setActiveTab}
      meta={[
        {
          label: "Operational spine",
          value: "Purchase Order -> Receiving -> Inventory",
        },
        {
          label: "Downstream work",
          value: "Use Operations for receiving, shipping, and stock control",
        },
      ]}
      commandStrip={
        activeTab === "purchase-orders" ? (
          <SheetModeToggle
            enabled={sheetPilotEnabled}
            surfaceMode={surfaceMode}
            onSurfaceModeChange={setSurfaceMode}
          />
        ) : null
      }
    >
      <LinearWorkspacePanel value="purchase-orders">
        {surfaceMode === "sheet-native" ? (
          <PurchaseOrdersPilotSurface
            onOpenClassic={poId =>
              setLocation(
                `/purchase-orders${poId !== null && poId !== undefined ? `?poId=${poId}` : ""}`
              )
            }
          />
        ) : (
          <PurchaseOrdersSlicePage />
        )}
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
