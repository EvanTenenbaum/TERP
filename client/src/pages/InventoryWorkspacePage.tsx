import { lazy, Suspense } from "react";
import InventoryWorkSurface from "@/components/work-surface/InventoryWorkSurface";
import PurchaseOrdersSlicePage from "@/components/uiux-slice/PurchaseOrdersSlicePage";
import PickPackWorkSurface from "@/components/work-surface/PickPackWorkSurface";
import InventorySheetPilotSurface from "@/components/spreadsheet-native/InventorySheetPilotSurface";
import FulfillmentPilotSurface from "@/components/spreadsheet-native/FulfillmentPilotSurface";
import SheetModeToggle from "@/components/spreadsheet-native/SheetModeToggle";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { INVENTORY_WORKSPACE } from "@/config/workspaces";
import {
  buildOperationsWorkspacePath,
  normalizeOperationsTab,
  type OperationsTab,
} from "@/lib/workspaceRoutes";
import {
  useSpreadsheetPilotAvailability,
  useSpreadsheetSurfaceMode,
} from "@/lib/spreadsheet-native";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
  type LinearWorkspaceTab,
} from "@/components/layout/LinearWorkspaceShell";
import { PageLoading } from "@/components/ui/loading-state";
import { useLocation, useSearch } from "wouter";

const ReceivingPage = lazy(
  () => import("@/components/uiux-slice/ProductIntakeSlicePage")
);
const PhotographyPage = lazy(() => import("@/pages/PhotographyPage"));
const SampleManagement = lazy(() => import("@/pages/SampleManagement"));

type InventoryTab = (typeof INVENTORY_WORKSPACE.tabs)[number]["value"];
type InventoryQueryTab = OperationsTab | "intake" | "pick-pack";

const INVENTORY_TABS_CONFIG = [
  ...INVENTORY_WORKSPACE.tabs,
] as const satisfies readonly LinearWorkspaceTab<InventoryTab>[];

const INVENTORY_TABS = INVENTORY_TABS_CONFIG.map(
  tab => tab.value
) as readonly InventoryTab[];

export default function InventoryWorkspacePage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { activeTab: requestedTab, setActiveTab } =
    useQueryTabState<InventoryQueryTab>({
      defaultTab: "inventory",
      validTabs: [...INVENTORY_TABS, "intake", "pick-pack"],
    });
  const activeTab = normalizeOperationsTab(requestedTab) ?? "inventory";

  // Inventory tab pilot
  const pilotSurfaceSupported = activeTab === "inventory";
  const { sheetPilotEnabled, availabilityReady } =
    useSpreadsheetPilotAvailability(pilotSurfaceSupported);
  const { surfaceMode, setSurfaceMode } = useSpreadsheetSurfaceMode({
    enabled: sheetPilotEnabled,
    ready: availabilityReady,
  });

  // Shipping/Fulfillment tab pilot (TER-817)
  // Note: pass ready:false when the shipping tab is not active to prevent
  // useSpreadsheetSurfaceMode from stripping surface= params that belong to
  // the inventory tab's pilot hook (they share the same URL param).
  const fulfillmentPilotSupported = activeTab === "shipping";
  const {
    sheetPilotEnabled: fulfillmentPilotEnabled,
    availabilityReady: fulfillmentAvailabilityReady,
  } = useSpreadsheetPilotAvailability(fulfillmentPilotSupported);
  const {
    surfaceMode: fulfillmentSurfaceMode,
    setSurfaceMode: setFulfillmentSurfaceMode,
  } = useSpreadsheetSurfaceMode({
    enabled: fulfillmentPilotEnabled,
    ready: fulfillmentPilotSupported ? fulfillmentAvailabilityReady : false,
  });

  const receivingDraftId = new URLSearchParams(search).get("draftId");
  useWorkspaceHomeTelemetry("inventory", activeTab);

  return (
    <LinearWorkspaceShell
      title={INVENTORY_WORKSPACE.title}
      description={INVENTORY_WORKSPACE.description}
      section="Operations"
      activeTab={activeTab}
      tabs={INVENTORY_TABS_CONFIG}
      onTabChange={tab => setActiveTab(tab)}
      data-testid="inventory-header"
      commandStrip={
        activeTab === "inventory" ? (
          <SheetModeToggle
            enabled={sheetPilotEnabled}
            surfaceMode={surfaceMode}
            onSurfaceModeChange={setSurfaceMode}
          />
        ) : activeTab === "shipping" ? (
          // TER-817: Fulfillment sheet-native toggle
          <SheetModeToggle
            enabled={fulfillmentPilotEnabled}
            surfaceMode={fulfillmentSurfaceMode}
            onSurfaceModeChange={setFulfillmentSurfaceMode}
          />
        ) : null
      }
    >
      <LinearWorkspacePanel value="inventory">
        {surfaceMode === "sheet-native" ? (
          <InventorySheetPilotSurface
            onOpenClassic={batchId =>
              setLocation(
                buildOperationsWorkspacePath("inventory", {
                  batchId: batchId ?? undefined,
                })
              )
            }
          />
        ) : (
          <InventoryWorkSurface />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="shipping">
        {/* TER-817: Sheet-native fulfillment surface; classic always available as fallback */}
        {fulfillmentSurfaceMode === "sheet-native" ? (
          <FulfillmentPilotSurface
            onOpenClassic={() => setFulfillmentSurfaceMode("classic")}
          />
        ) : (
          <PickPackWorkSurface />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="receiving">
        {receivingDraftId ? (
          <Suspense fallback={<PageLoading message="Loading receiving..." />}>
            <ReceivingPage />
          </Suspense>
        ) : (
          <PurchaseOrdersSlicePage mode="receiving" />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="photography">
        <Suspense fallback={<PageLoading message="Loading photography..." />}>
          <PhotographyPage embedded />
        </Suspense>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="samples">
        <Suspense fallback={<PageLoading message="Loading samples..." />}>
          <SampleManagement embedded />
        </Suspense>
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
