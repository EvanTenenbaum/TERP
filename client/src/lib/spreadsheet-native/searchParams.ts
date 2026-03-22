import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trackFallbackToClassic } from "./surfaceTelemetry";

export type SpreadsheetSurfaceMode = "classic" | "sheet-native";

const SURFACE_PARAM = "surface";
const SHEET_NATIVE_VALUE = "sheet-native";

/**
 * Per-module default surface mode configuration.
 * When a module is set to true here, it defaults to sheet-native
 * without needing ?surface=sheet-native in the URL.
 * Users can still override with ?surface=classic.
 *
 * Flip modules from false → true after QA + soak period confirms
 * low fallback rate (<5% classic usage over 2 weeks).
 */
export const SHEET_NATIVE_DEFAULTS: Record<string, boolean> = {
  // Wave 0 (pilot — G1-G5 closed, G6 partial)
  orders: true,
  "create-order": false,
  // Wave 1-3: flip individually after <5% fallback over 2 weeks
  inventory: false,
  "sales-sheets": false,
  payments: false,
  "client-ledger": false,
  intake: false,
  "purchase-orders": false,
  fulfillment: false,
  invoices: false,
  returns: false,
  quotes: false,
  samples: false,
};

/** Build the availability config for useSpreadsheetSurfaceMode with the per-module default */
export function buildSurfaceAvailability(
  moduleId: string,
  enabled: boolean,
  ready?: boolean
): SpreadsheetSurfaceAvailability {
  return {
    enabled,
    ready,
    defaultSheetNative: SHEET_NATIVE_DEFAULTS[moduleId] ?? false,
  };
}

function buildUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

interface SpreadsheetSurfaceAvailability {
  enabled: boolean;
  ready?: boolean;
  /** When true, default to sheet-native when no URL param is set */
  defaultSheetNative?: boolean;
}

function resolveAvailability(
  availability: boolean | SpreadsheetSurfaceAvailability
) {
  if (typeof availability === "boolean") {
    return {
      enabled: availability,
      ready: true,
      defaultSheetNative: false,
    };
  }

  return {
    enabled: availability.enabled,
    ready: availability.ready ?? true,
    defaultSheetNative: availability.defaultSheetNative ?? false,
  };
}

export function useSpreadsheetSurfaceMode(
  availability: boolean | SpreadsheetSurfaceAvailability
) {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();
  const { enabled, ready, defaultSheetNative } =
    resolveAvailability(availability);

  const surfaceMode = useMemo<SpreadsheetSurfaceMode>(() => {
    if (!enabled) {
      return "classic";
    }

    const params = new URLSearchParams(search);
    const urlValue = params.get(SURFACE_PARAM);

    // Explicit URL param takes precedence
    if (urlValue === SHEET_NATIVE_VALUE) {
      return "sheet-native";
    }
    if (urlValue === "classic") {
      return "classic";
    }

    // No URL param: use per-module default
    return defaultSheetNative ? "sheet-native" : "classic";
  }, [defaultSheetNative, enabled, search]);

  useEffect(() => {
    if (enabled || !ready) {
      return;
    }

    const params = new URLSearchParams(search);
    if (params.get(SURFACE_PARAM) !== SHEET_NATIVE_VALUE) {
      return;
    }

    params.delete(SURFACE_PARAM);
    setLocation(buildUrl(pathname, params), { replace: true });
  }, [enabled, pathname, ready, search, setLocation]);

  const previousModeRef = useRef<SpreadsheetSurfaceMode>(surfaceMode);

  useEffect(() => {
    const previousMode = previousModeRef.current;
    previousModeRef.current = surfaceMode;

    if (previousMode === "sheet-native" && surfaceMode === "classic") {
      const module = pathname.split("/").filter(Boolean)[0] ?? "unknown";
      trackFallbackToClassic(module, pathname);
    }
  }, [pathname, surfaceMode]);

  const setSurfaceMode = useCallback(
    (nextMode: SpreadsheetSurfaceMode) => {
      const params = new URLSearchParams(search);
      if (!enabled) {
        params.delete(SURFACE_PARAM);
      } else if (nextMode === "classic" && defaultSheetNative) {
        // When default is sheet-native, must explicitly write ?surface=classic
        // to override — deleting the param would re-resolve to sheet-native
        params.set(SURFACE_PARAM, "classic");
      } else if (nextMode === "sheet-native" && !defaultSheetNative) {
        params.set(SURFACE_PARAM, SHEET_NATIVE_VALUE);
      } else {
        // Toggling back to the module's default — remove the override
        params.delete(SURFACE_PARAM);
      }

      setLocation(buildUrl(pathname, params));
    },
    [defaultSheetNative, enabled, pathname, search, setLocation]
  );

  return { surfaceMode, setSurfaceMode };
}

function updateSelectionParam(
  pathname: string,
  paramKey: string,
  value: number | string | null
) {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (value === null || value === "") {
    params.delete(paramKey);
  } else {
    params.set(paramKey, String(value));
  }

  window.history.replaceState({}, "", buildUrl(pathname, params));
}

export function useSpreadsheetSelectionParam(paramKey: string) {
  const [pathname] = useLocation();
  const search = useSearch();

  const getSearchValue = useCallback(() => {
    const params = new URLSearchParams(search);
    const raw = params.get(paramKey);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [paramKey, search]);

  const [selectedId, setSelectedIdState] = useState<number | null>(
    getSearchValue
  );

  useEffect(() => {
    setSelectedIdState(getSearchValue());
  }, [getSearchValue]);

  const setSelectedId = useCallback(
    (nextId: number | null) => {
      setSelectedIdState(nextId);
      updateSelectionParam(pathname, paramKey, nextId);
    },
    [paramKey, pathname]
  );

  return { selectedId, setSelectedId };
}
