import { lazy, Suspense } from "react";
import InventoryWorkSurface from "@/components/work-surface/InventoryWorkSurface";
import PickPackWorkSurface from "@/components/work-surface/PickPackWorkSurface";
import InventorySheetPilotSurface from "@/components/spreadsheet-native/InventorySheetPilotSurface";
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
import { useLocation } from "wouter";

const ReceivingPage = lazy(() => import("@/pages/IntakeReceipts"));
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
  const { activeTab: requestedTab, setActiveTab } =
    useQueryTabState<InventoryQueryTab>({
      defaultTab: "inventory",
      validTabs: [...INVENTORY_TABS, "intake", "pick-pack"],
    });
  const activeTab = normalizeOperationsTab(requestedTab) ?? "inventory";
  const pilotSurfaceSupported = activeTab === "inventory";
  const { sheetPilotEnabled, availabilityReady } =
    useSpreadsheetPilotAvailability(pilotSurfaceSupported);
  const { surfaceMode } = useSpreadsheetSurfaceMode({
    enabled: sheetPilotEnabled,
    ready: availabilityReady,
  });
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
        <PickPackWorkSurface />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="receiving">
        <Suspense fallback={<PageLoading message="Loading receiving..." />}>
          <ReceivingPage />
        </Suspense>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="photography">
        <Suspense fallback={<PageLoading message="Loading photography..." />}>
          <PhotographyPage />
        </Suspense>
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="samples">
        <Suspense fallback={<PageLoading message="Loading samples..." />}>
          <SampleManagement />
        </Suspense>
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}
