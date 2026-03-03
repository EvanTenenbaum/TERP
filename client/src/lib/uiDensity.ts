export type UiDensity = "comfortable" | "compact";

export const UI_DENSITY_STORAGE_KEY = "terp.ui-density.v1";
export const UI_DENSITY_CHANGE_EVENT = "terp-ui-density-change";
const UI_DENSITY_ATTRIBUTE = "data-view-density";

function isUiDensity(value: unknown): value is UiDensity {
  return value === "comfortable" || value === "compact";
}

export function readUiDensity(): UiDensity {
  if (
    typeof window === "undefined" ||
    typeof window.localStorage === "undefined"
  ) {
    return "compact";
  }

  const stored = window.localStorage.getItem(UI_DENSITY_STORAGE_KEY);
  return isUiDensity(stored) ? stored : "compact";
}

export function applyUiDensity(density: UiDensity): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute(UI_DENSITY_ATTRIBUTE, density);
}

export function writeUiDensity(density: UiDensity): void {
  if (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  ) {
    window.localStorage.setItem(UI_DENSITY_STORAGE_KEY, density);
  }
  applyUiDensity(density);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new window.CustomEvent(UI_DENSITY_CHANGE_EVENT, {
        detail: density,
      })
    );
  }
}

export function initializeUiDensity(): UiDensity {
  const density = readUiDensity();
  applyUiDensity(density);
  return density;
}
