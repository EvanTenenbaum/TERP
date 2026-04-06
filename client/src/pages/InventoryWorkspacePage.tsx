import { lazy, Suspense } from "react";
import { InventoryManagementSurface } from "@/components/spreadsheet-native/InventoryManagementSurface";
import DirectIntakeWorkSurface from "@/components/work-surface/DirectIntakeWorkSurface";
import { PurchaseOrderSurface } from "@/components/spreadsheet-native/PurchaseOrderSurface";
import PickPackWorkSurface from "@/components/work-surface/PickPackWorkSurface";
import SheetModeToggle from "@/components/spreadsheet-native/SheetModeToggle";
import { PilotSurfaceBoundary } from "@/components/spreadsheet-native/PilotSurfaceBoundary";

const FulfillmentPilotSurface = lazy(
  () => import("@/components/spreadsheet-native/FulfillmentPilotSurface")
);
const IntakePilotSurface = lazy(
  () => import("@/components/spreadsheet-native/IntakePilotSurface")
);
const SamplesPilotSurface = lazy(() =>
  import("@/components/spreadsheet-native/SamplesPilotSurface").then(m => ({
    default: m.SamplesPilotSurface,
  }))
);
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { INVENTORY_WORKSPACE } from "@/config/workspaces";
import {
  normalizeOperationsTab,
  type OperationsTab,
} from "@/lib/workspaceRoutes";
import {
  buildSurfaceAvailability,
  useSpreadsheetPilotAvailability,
  useSpreadsheetSurfaceMode,
} from "@/lib/spreadsheet-native";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
  type LinearWorkspaceTab,
} from "@/components/layout/LinearWorkspaceShell";
import { PageLoading } from "@/components/ui/loading-state";
import { useSearch } from "wouter";

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
  const search = useSearch();
  const { activeTab: requestedTab, setActiveTab } =
    useQueryTabState<InventoryQueryTab>({
      defaultTab: "inventory",
      validTabs: [...INVENTORY_TABS, "pick-pack"],
    });
  const activeTab = normalizeOperationsTab(requestedTab) ?? "inventory";

  // Intake tab pilot (TER-815)
  const intakePilotSupported = activeTab === "intake";
  const {
    sheetPilotEnabled: intakePilotEnabled,
    availabilityReady: intakeAvailabilityReady,
  } = useSpreadsheetPilotAvailability(intakePilotSupported);
  const {
    surfaceMode: intakeSurfaceMode,
    setSurfaceMode: setIntakeSurfaceMode,
  } = useSpreadsheetSurfaceMode(
    buildSurfaceAvailability(
      "intake",
      intakePilotEnabled,
      intakeAvailabilityReady && intakePilotSupported
    )
  );

  // Shipping/Fulfillment tab pilot (TER-817)
  const fulfillmentPilotSupported = activeTab === "shipping";
  const {
    sheetPilotEnabled: fulfillmentPilotEnabled,
    availabilityReady: fulfillmentAvailabilityReady,
  } = useSpreadsheetPilotAvailability(fulfillmentPilotSupported);
  const {
    surfaceMode: fulfillmentSurfaceMode,
    setSurfaceMode: setFulfillmentSurfaceMode,
  } = useSpreadsheetSurfaceMode(
    buildSurfaceAvailability(
      "fulfillment",
      fulfillmentPilotEnabled,
      fulfillmentAvailabilityReady && fulfillmentPilotSupported
    )
  );
  // Samples tab pilot
  const samplesPilotSupported = activeTab === "samples";
  const {
    sheetPilotEnabled: samplesPilotEnabled,
    availabilityReady: samplesAvailabilityReady,
  } = useSpreadsheetPilotAvailability(samplesPilotSupported);
  const {
    surfaceMode: samplesSurfaceMode,
    setSurfaceMode: setSamplesSurfaceMode,
  } = useSpreadsheetSurfaceMode(
    buildSurfaceAvailability(
      "samples",
      samplesPilotEnabled,
      samplesAvailabilityReady && samplesPilotSupported
    )
  );

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
        activeTab === "intake" ? (
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
        ) : null
      }
    >
      <LinearWorkspacePanel value="inventory">
        <InventoryManagementSurface />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="shipping">
        {fulfillmentSurfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<PickPackWorkSurface />}>
            <FulfillmentPilotSurface
              onOpenClassic={() => setFulfillmentSurfaceMode("classic")}
            />
          </PilotSurfaceBoundary>
        ) : (
          <PickPackWorkSurface />
        )}
      </LinearWorkspacePanel>
      {/* TER-815: Direct Intake sheet-native surface.
          CRITICAL: This panel is DIRECT INTAKE only (no PO).
          PO-linked receiving stays in the "receiving" panel. */}
      <LinearWorkspacePanel value="intake">
        {intakeSurfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<DirectIntakeWorkSurface />}>
            <IntakePilotSurface
              onOpenClassic={() => setIntakeSurfaceMode("classic")}
            />
          </PilotSurfaceBoundary>
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
          <PurchaseOrderSurface
            defaultStatusFilter={["CONFIRMED", "RECEIVING"]}
            autoLaunchReceivingOnRowClick
          />
        )}
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="photography">
        <Suspense fallback={<PageLoading message="Loading photography..." />}>
          <PhotographyPage embedded />
        </Suspense>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="samples">
        {samplesSurfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary
            fallback={
              <Suspense fallback={<PageLoading message="Loading samples..." />}>
                <SampleManagement embedded />
              </Suspense>
            }
          >
            <SamplesPilotSurface
              onOpenClassic={() => setSamplesSurfaceMode("classic")}
            />
          </PilotSurfaceBoundary>
        ) : (
          <Suspense fallback={<PageLoading message="Loading samples..." />}>
            <SampleManagement embedded />
          </Suspense>
        )}
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
