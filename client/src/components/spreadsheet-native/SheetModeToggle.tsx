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
    <div
      className="linear-workspace-mode-toggle"
      role="group"
      aria-label="Surface mode"
    >
      <Button
        size="sm"
        variant={surfaceMode === "sheet-native" ? "default" : "outline"}
        aria-pressed={surfaceMode === "sheet-native"}
        onClick={() => onSurfaceModeChange("sheet-native")}
      >
        Spreadsheet View
      </Button>
      <Button
        size="sm"
        variant={surfaceMode === "classic" ? "default" : "outline"}
        aria-pressed={surfaceMode === "classic"}
        onClick={() => onSurfaceModeChange("classic")}
      >
        Classic Surface
      </Button>
    </div>
  );
}

export default SheetModeToggle;
