import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";

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
  // Wave 0 (pilot — already proven)
  orders: false,
  "create-order": false,
  // Wave 1
  inventory: false,
  "sales-sheets": false,
  payments: false,
  "client-ledger": false,
  // Wave 2
  intake: false,
  "purchase-orders": false,
  fulfillment: false,
  // Wave 3
  invoices: false,
  returns: false,
  quotes: false,
  samples: false,
};

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
      console.info(
        `[surface-mode-fallback] module=${module} from=sheet-native to=classic path=${pathname}`
      );
    }
  }, [pathname, surfaceMode]);

  const setSurfaceMode = useCallback(
    (nextMode: SpreadsheetSurfaceMode) => {
      const params = new URLSearchParams(search);
      if (!enabled || nextMode === "classic") {
        params.delete(SURFACE_PARAM);
      } else {
        params.set(SURFACE_PARAM, SHEET_NATIVE_VALUE);
      }

      setLocation(buildUrl(pathname, params));
    },
    [enabled, pathname, search, setLocation]
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
