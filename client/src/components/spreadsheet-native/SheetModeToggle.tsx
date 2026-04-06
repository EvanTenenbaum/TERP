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
      className="inline-flex items-center gap-2"
      aria-label="View mode toggle"
    >
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        View Mode
      </span>
      <Button
        size="sm"
        variant={surfaceMode === "sheet-native" ? "default" : "outline"}
        onClick={() => onSurfaceModeChange("sheet-native")}
      >
        Spreadsheet View
      </Button>
      <Button
        size="sm"
        variant={surfaceMode === "classic" ? "default" : "ghost"}
        onClick={() => onSurfaceModeChange("classic")}
      >
        Standard View
      </Button>
    </div>
  );
}

export default SheetModeToggle;
