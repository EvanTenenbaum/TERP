import { useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { SpreadsheetSurfaceMode } from "@/lib/spreadsheet-native";

interface SheetModeToggleProps {
  enabled: boolean;
  surfaceMode: SpreadsheetSurfaceMode;
  onSurfaceModeChange: (mode: SpreadsheetSurfaceMode) => void;
  /**
   * ID of the sheet-native surface panel (for aria-controls).
   * Defaults to "surface-panel-sheet-native".
   */
  sheetNativePanelId?: string;
  /**
   * ID of the classic surface panel (for aria-controls).
   * Defaults to "surface-panel-classic".
   */
  classicPanelId?: string;
}

export function SheetModeToggle({
  enabled,
  surfaceMode,
  onSurfaceModeChange,
  sheetNativePanelId = "surface-panel-sheet-native",
  classicPanelId = "surface-panel-classic",
}: SheetModeToggleProps) {
  const sheetNativeButtonRef = useRef<HTMLButtonElement>(null);
  const classicButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation: Arrow keys move between tabs, Home/End jump to first/last
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;

      if (key === "ArrowLeft" || key === "ArrowUp") {
        event.preventDefault();
        // Move to previous tab (wrap around)
        if (surfaceMode === "classic") {
          onSurfaceModeChange("sheet-native");
          sheetNativeButtonRef.current?.focus();
        } else {
          onSurfaceModeChange("classic");
          classicButtonRef.current?.focus();
        }
      } else if (key === "ArrowRight" || key === "ArrowDown") {
        event.preventDefault();
        // Move to next tab (wrap around)
        if (surfaceMode === "sheet-native") {
          onSurfaceModeChange("classic");
          classicButtonRef.current?.focus();
        } else {
          onSurfaceModeChange("sheet-native");
          sheetNativeButtonRef.current?.focus();
        }
      } else if (key === "Home") {
        event.preventDefault();
        onSurfaceModeChange("sheet-native");
        sheetNativeButtonRef.current?.focus();
      } else if (key === "End") {
        event.preventDefault();
        onSurfaceModeChange("classic");
        classicButtonRef.current?.focus();
      }
    },
    [surfaceMode, onSurfaceModeChange]
  );

  // Focus management when surfaceMode changes externally
  useEffect(() => {
    // No auto-focus on mount or external changes to avoid disrupting user flow
  }, [surfaceMode]);

  if (!enabled) {
    return null;
  }

  const sheetNativeSelected = surfaceMode === "sheet-native";
  const classicSelected = surfaceMode === "classic";

  return (
    <div
      className="linear-workspace-mode-toggle"
      role="tablist"
      aria-label="Surface mode"
      onKeyDown={handleKeyDown}
    >
      <Button
        ref={sheetNativeButtonRef}
        size="sm"
        variant={sheetNativeSelected ? "default" : "outline"}
        role="tab"
        aria-selected={sheetNativeSelected}
        aria-controls={sheetNativePanelId}
        tabIndex={sheetNativeSelected ? 0 : -1}
        onClick={() => onSurfaceModeChange("sheet-native")}
        id="tab-sheet-native"
      >
        Spreadsheet View
      </Button>
      <Button
        ref={classicButtonRef}
        size="sm"
        variant={classicSelected ? "default" : "outline"}
        role="tab"
        aria-selected={classicSelected}
        aria-controls={classicPanelId}
        tabIndex={classicSelected ? 0 : -1}
        onClick={() => onSurfaceModeChange("classic")}
        id="tab-classic"
      >
        Standard View
      </Button>
    </div>
  );
}

export default SheetModeToggle;
