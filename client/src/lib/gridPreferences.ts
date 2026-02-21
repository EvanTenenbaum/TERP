export type GridViewMode = "DENSE" | "COMFORTABLE" | "VISUAL";

export interface GridPreferenceState {
  viewMode: GridViewMode;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
}

const STORAGE_PREFIX = "terp.grid-preferences.v1";

function key(gridType: string, userId?: number | string | null): string {
  return `${STORAGE_PREFIX}:${userId ?? "anon"}:${gridType}`;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadGridPreference(
  gridType: string,
  userId?: number | string | null
): GridPreferenceState | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key(gridType, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GridPreferenceState;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      viewMode:
        parsed.viewMode === "DENSE" ||
        parsed.viewMode === "COMFORTABLE" ||
        parsed.viewMode === "VISUAL"
          ? parsed.viewMode
          : "COMFORTABLE",
      columnOrder: Array.isArray(parsed.columnOrder) ? parsed.columnOrder : [],
      columnVisibility:
        parsed.columnVisibility && typeof parsed.columnVisibility === "object"
          ? parsed.columnVisibility
          : {},
    };
  } catch {
    return null;
  }
}

export function saveGridPreference(
  gridType: string,
  preference: GridPreferenceState,
  userId?: number | string | null
): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key(gridType, userId), JSON.stringify(preference));
}

export function clearGridPreference(
  gridType: string,
  userId?: number | string | null
): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(key(gridType, userId));
}
