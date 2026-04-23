import { Button } from "@/components/ui/button";
import type { SpreadsheetSurfaceMode } from "@/lib/spreadsheet-native";
import { useRef, type KeyboardEvent } from "react";

interface SheetModeToggleProps {
  enabled: boolean;
  surfaceMode: SpreadsheetSurfaceMode;
  onSurfaceModeChange: (mode: SpreadsheetSurfaceMode) => void;
}

const MODES: SpreadsheetSurfaceMode[] = ["sheet-native", "classic"];

export function SheetModeToggle({
  enabled,
  surfaceMode,
  onSurfaceModeChange,
}: SheetModeToggleProps) {
  const sheetNativeButtonRef = useRef<HTMLButtonElement>(null);
  const classicButtonRef = useRef<HTMLButtonElement>(null);

  if (!enabled) {
    return null;
  }

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentMode: SpreadsheetSurfaceMode
  ) => {
    const currentIndex = MODES.indexOf(currentMode);
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        nextIndex = (currentIndex + 1) % MODES.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        nextIndex = (currentIndex - 1 + MODES.length) % MODES.length;
        break;
      case "Home":
        event.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        event.preventDefault();
        nextIndex = MODES.length - 1;
        break;
    }

    if (nextIndex !== null) {
      const nextMode = MODES[nextIndex];
      onSurfaceModeChange(nextMode);
      // Focus the newly selected tab
      const nextButton =
        nextMode === "sheet-native"
          ? sheetNativeButtonRef.current
          : classicButtonRef.current;
      nextButton?.focus();
    }
  };

  return (
    <div
      className="linear-workspace-mode-toggle"
      role="tablist"
      aria-label="Surface view mode"
    >
      <Button
        ref={sheetNativeButtonRef}
        size="sm"
        variant={surfaceMode === "sheet-native" ? "default" : "outline"}
        role="tab"
        aria-selected={surfaceMode === "sheet-native"}
        aria-controls="surface-panel"
        tabIndex={surfaceMode === "sheet-native" ? 0 : -1}
        onClick={() => onSurfaceModeChange("sheet-native")}
        onKeyDown={e => handleKeyDown(e, "sheet-native")}
      >
        Spreadsheet View
      </Button>
      <Button
        ref={classicButtonRef}
        size="sm"
        variant={surfaceMode === "classic" ? "default" : "outline"}
        role="tab"
        aria-selected={surfaceMode === "classic"}
        aria-controls="surface-panel"
        tabIndex={surfaceMode === "classic" ? 0 : -1}
        onClick={() => onSurfaceModeChange("classic")}
        onKeyDown={e => handleKeyDown(e, "classic")}
      >
        Standard View
      </Button>
    </div>
  );
}

export default SheetModeToggle;
