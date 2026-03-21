/**
 * ClientLedgerPage (TER-813)
 *
 * Thin wrapper page that owns the SheetModeToggle and conditionally renders
 * either the sheet-native pilot surface or the classic ClientLedgerWorkSurface.
 *
 * Follows the exact pattern from SalesWorkspacePage:
 *   1. useSpreadsheetPilotAvailability — reads feature flag
 *   2. useSpreadsheetSurfaceMode — reads/writes ?surface=sheet-native URL param
 *   3. Renders SheetModeToggle in the header's command strip area
 *   4. Conditionally renders ClientLedgerPilotSurface or ClientLedgerWorkSurface
 */

import { lazy } from "react";
import {
  buildSurfaceAvailability,
  useSpreadsheetPilotAvailability,
  useSpreadsheetSurfaceMode,
} from "@/lib/spreadsheet-native";
import ClientLedgerWorkSurface from "@/components/work-surface/ClientLedgerWorkSurface";
import SheetModeToggle from "@/components/spreadsheet-native/SheetModeToggle";
import { PilotSurfaceBoundary } from "@/components/spreadsheet-native/PilotSurfaceBoundary";

const ClientLedgerPilotSurface = lazy(() =>
  import("@/components/spreadsheet-native/ClientLedgerPilotSurface").then(
    m => ({ default: m.ClientLedgerPilotSurface })
  )
);

export default function ClientLedgerPage() {
  // The client ledger always supports the pilot surface — no tab gating needed.
  const pilotSurfaceSupported = true;

  const { sheetPilotEnabled, availabilityReady } =
    useSpreadsheetPilotAvailability(pilotSurfaceSupported);

  const { surfaceMode, setSurfaceMode } = useSpreadsheetSurfaceMode(
    buildSurfaceAvailability(
      "client-ledger",
      sheetPilotEnabled,
      availabilityReady
    )
  );

  const handleOpenClassic = () => {
    setSurfaceMode("classic");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toggle strip — shown only when pilot is enabled */}
      {sheetPilotEnabled && (
        <div className="flex items-center justify-end px-4 py-2 border-b bg-muted/20">
          <SheetModeToggle
            enabled={sheetPilotEnabled}
            surfaceMode={surfaceMode}
            onSurfaceModeChange={setSurfaceMode}
          />
        </div>
      )}

      {/* Surface — pilot or classic */}
      <div className="flex-1 overflow-hidden">
        {surfaceMode === "sheet-native" ? (
          <PilotSurfaceBoundary fallback={<ClientLedgerWorkSurface />}>
            <ClientLedgerPilotSurface onOpenClassic={handleOpenClassic} />
          </PilotSurfaceBoundary>
        ) : (
          <ClientLedgerWorkSurface />
        )}
      </div>
    </div>
  );
}
