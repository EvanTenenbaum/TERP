import { lazy, Suspense } from "react";
import InventoryWorkSurface from "@/components/work-surface/InventoryWorkSurface";
import DirectIntakeWorkSurface from "@/components/work-surface/DirectIntakeWorkSurface";
import PurchaseOrdersSlicePage from "@/components/uiux-slice/PurchaseOrdersSlicePage";
import PickPackWorkSurface from "@/components/work-surface/PickPackWorkSurface";
import InventorySheetPilotSurface from "@/components/spreadsheet-native/InventorySheetPilotSurface";
import FulfillmentPilotSurface from "@/components/spreadsheet-native/FulfillmentPilotSurface";
import IntakePilotSurface from "@/components/spreadsheet-native/IntakePilotSurface";
import { SamplesPilotSurface } from "@/components/spreadsheet-native/SamplesPilotSurface";
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
type InventoryQueryTab = OperationsTab | "pick-pack";

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
      validTabs: [...INVENTORY_TABS, "pick-pack"],
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

  // Intake tab pilot (TER-815)
  const intakePilotSupported = activeTab === "intake";
  const {
    sheetPilotEnabled: intakePilotEnabled,
    availabilityReady: intakeAvailabilityReady,
  } = useSpreadsheetPilotAvailability(intakePilotSupported);
  const {
    surfaceMode: intakeSurfaceMode,
    setSurfaceMode: setIntakeSurfaceMode,
  } = useSpreadsheetSurfaceMode({
    enabled: intakePilotEnabled,
    ready: intakeAvailabilityReady,
  });

  // Shipping/Fulfillment tab pilot (TER-817)
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
    ready: fulfillmentAvailabilityReady,
  });

  // Samples tab pilot (TER-821)
  const samplesPilotSupported = activeTab === "samples";
  const {
    sheetPilotEnabled: samplesPilotEnabled,
    availabilityReady: samplesAvailabilityReady,
  } = useSpreadsheetPilotAvailability(samplesPilotSupported);
  const {
    surfaceMode: samplesSurfaceMode,
    setSurfaceMode: setSamplesSurfaceMode,
  } = useSpreadsheetSurfaceMode({
    enabled: samplesPilotEnabled,
    ready: samplesAvailabilityReady,
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
        ) : activeTab === "intake" ? (
          <SheetModeToggle
            enabled={intakePilotEnabled}
            surfaceMode={intakeSurfaceMode}
            onSurfaceModeChange={setIntakeSurfaceMode}
          />
        ) : activeTab === "shipping" ? (
          <SheetModeToggle
            enabled={fulfillmentPilotEnabled}
            surfaceMode={fulfillmentSurfaceMode}
            onSurfaceModeChange={setFulfillmentSurfaceMode}
          />
        ) : activeTab === "samples" ? (
          <SheetModeToggle
            enabled={samplesPilotEnabled}
            surfaceMode={samplesSurfaceMode}
            onSurfaceModeChange={setSamplesSurfaceMode}
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
        {fulfillmentSurfaceMode === "sheet-native" ? (
          <FulfillmentPilotSurface
            onOpenClassic={() => setFulfillmentSurfaceMode("classic")}
          />
        ) : (
          <PickPackWorkSurface />
        )}
      </LinearWorkspacePanel>
      {/* TER-815: Direct Intake sheet-native surface.
          CRITICAL: This panel is DIRECT INTAKE only (no PO).
          PO-linked receiving stays in the "receiving" panel. */}
      <LinearWorkspacePanel value="intake">
        {intakeSurfaceMode === "sheet-native" ? (
          <IntakePilotSurface />
        ) : (
          <DirectIntakeWorkSurface />
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
        {samplesSurfaceMode === "sheet-native" ? (
          <SamplesPilotSurface />
        ) : (
          <Suspense fallback={<PageLoading message="Loading samples..." />}>
            <SampleManagement embedded />
          </Suspense>
        )}
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
