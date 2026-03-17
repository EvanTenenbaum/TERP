import { Button } from "@/components/ui/button";
import type { SpreadsheetSurfaceMode } from "@/lib/spreadsheet-native";

interface SheetModeToggleProps {
  enabled: boolean;
  surfaceMode: SpreadsheetSurfaceMode;
  onSurfaceModeChange: (mode: SpreadsheetSurfaceMode) => void;
}

export function SheetModeToggle({
  enabled,
  surfaceMode,
  onSurfaceModeChange,
}: SheetModeToggleProps) {
  if (!enabled) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant={surfaceMode === "sheet-native" ? "default" : "outline"}
        onClick={() => onSurfaceModeChange("sheet-native")}
      >
        Sheet-Native Pilot
      </Button>
      <Button
        size="sm"
        variant={surfaceMode === "classic" ? "default" : "ghost"}
        onClick={() => onSurfaceModeChange("classic")}
      >
        Classic Surface
      </Button>
    </div>
  );
}

export default SheetModeToggle;
