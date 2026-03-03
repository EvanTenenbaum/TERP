import { useCallback, useEffect, useState } from "react";
import {
  UI_DENSITY_CHANGE_EVENT,
  UI_DENSITY_STORAGE_KEY,
  initializeUiDensity,
  readUiDensity,
  writeUiDensity,
  type UiDensity,
} from "@/lib/uiDensity";

export function useUiDensity() {
  const [density, setDensityState] = useState<UiDensity>(() =>
    initializeUiDensity()
  );

  useEffect(() => {
    const handleDensityEvent = (event: Event) => {
      const detail = (event as Event & { detail?: unknown }).detail;
      if (detail === "compact" || detail === "comfortable") {
        setDensityState(detail);
        return;
      }
      setDensityState(readUiDensity());
    };

    const handleStorageEvent = (event: Event) => {
      const storageEvent = event as Event & { key?: string | null };
      if (
        storageEvent.key !== undefined &&
        storageEvent.key !== null &&
        storageEvent.key !== UI_DENSITY_STORAGE_KEY
      ) {
        return;
      }
      setDensityState(readUiDensity());
    };

    window.addEventListener(UI_DENSITY_CHANGE_EVENT, handleDensityEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(UI_DENSITY_CHANGE_EVENT, handleDensityEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  const setDensity = useCallback((nextDensity: UiDensity) => {
    writeUiDensity(nextDensity);
    setDensityState(nextDensity);
  }, []);

  const toggleDensity = useCallback(() => {
    setDensity(density === "compact" ? "comfortable" : "compact");
  }, [density, setDensity]);

  return {
    density,
    isCompact: density === "compact",
    setDensity,
    toggleDensity,
  } as const;
}
