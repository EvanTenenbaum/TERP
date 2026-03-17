import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";

export type SpreadsheetPilotSurfaceMode = "classic" | "sheet-native";

export const SPREADSHEET_PILOT_SURFACE_PARAM = "surface";
export const SPREADSHEET_PILOT_SURFACE_VALUE = "sheet-native";

const resolvePositiveInteger = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const buildLocation = (pathname: string, params: URLSearchParams): string => {
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
};

export const resolveSpreadsheetPilotSurface = (
  search: string
): SpreadsheetPilotSurfaceMode => {
  const params = new URLSearchParams(search);
  return params.get(SPREADSHEET_PILOT_SURFACE_PARAM) ===
    SPREADSHEET_PILOT_SURFACE_VALUE
    ? "sheet-native"
    : "classic";
};

export function setSpreadsheetPilotSurfaceInSearch(
  search: string,
  nextMode: SpreadsheetPilotSurfaceMode
): string {
  const params = new URLSearchParams(search);
  if (nextMode === "sheet-native") {
    params.set(
      SPREADSHEET_PILOT_SURFACE_PARAM,
      SPREADSHEET_PILOT_SURFACE_VALUE
    );
  } else {
    params.delete(SPREADSHEET_PILOT_SURFACE_PARAM);
  }
  return params.toString();
}

export function setSpreadsheetPilotSelectionInSearch(
  search: string,
  paramName: string,
  value: number | null
): string {
  const params = new URLSearchParams(search);
  if (value === null) {
    params.delete(paramName);
  } else {
    params.set(paramName, String(value));
  }
  return params.toString();
}

export function useSpreadsheetPilotMode() {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();

  const mode = useMemo(() => resolveSpreadsheetPilotSurface(search), [search]);

  const setMode = useCallback(
    (nextMode: SpreadsheetPilotSurfaceMode) => {
      const nextSearch = setSpreadsheetPilotSurfaceInSearch(search, nextMode);
      setLocation(buildLocation(pathname, new URLSearchParams(nextSearch)));
    },
    [pathname, search, setLocation]
  );

  return {
    mode,
    isSheetNative: mode === "sheet-native",
    setMode,
  };
}

export function useSpreadsheetPilotSelectionParam(paramName: string) {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();

  const selectedId = useMemo(() => {
    const params = new URLSearchParams(search);
    return resolvePositiveInteger(params.get(paramName));
  }, [paramName, search]);

  const setSelectedId = useCallback(
    (nextId: number | null) => {
      const nextSearch = setSpreadsheetPilotSelectionInSearch(
        search,
        paramName,
        nextId
      );
      setLocation(buildLocation(pathname, new URLSearchParams(nextSearch)));
    },
    [paramName, pathname, search, setLocation]
  );

  return {
    selectedId,
    setSelectedId,
  };
}
