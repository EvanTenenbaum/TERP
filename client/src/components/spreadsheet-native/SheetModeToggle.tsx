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
      className="linear-workspace-mode-toggle rounded-full border border-border/70 bg-background/90 p-0.5 shadow-sm"
      role="group"
      aria-label="Surface mode"
    >
      <Button
        size="sm"
        variant={surfaceMode === "sheet-native" ? "default" : "ghost"}
        className="h-8 rounded-full px-3 text-[11px] font-semibold"
        aria-pressed={surfaceMode === "sheet-native"}
        onClick={() => onSurfaceModeChange("sheet-native")}
      >
        Spreadsheet View
      </Button>
      <Button
        size="sm"
        variant={surfaceMode === "classic" ? "default" : "ghost"}
        className="h-8 rounded-full px-3 text-[11px] font-semibold"
        aria-pressed={surfaceMode === "classic"}
        onClick={() => onSurfaceModeChange("classic")}
      >
        Classic Surface
      </Button>
    </div>
  );
}

export default SheetModeToggle;
