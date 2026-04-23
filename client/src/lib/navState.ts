/**
 * Persisted sidebar navigation open-group state.
 *
 * Stores which navigation groups the user has expanded in the sidebar so that
 * the selection survives full page reloads and in-app navigation. This follows
 * the same synchronous `localStorage` + `CustomEvent` pattern used by
 * {@link ./uiDensity.ts}.
 *
 * Gated by the `ux.v2.nav-persist` feature flag at the call site.
 *
 * See: docs/ux-review/02-Implementation_Strategy.md §4.6
 * Linear: TER-1306
 */

export const NAV_OPEN_GROUPS_STORAGE_KEY = "terp.nav.open-groups.v1";
export const NAV_OPEN_GROUPS_CHANGE_EVENT = "terp-nav-open-groups-change";

function hasLocalStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

/**
 * Read the persisted list of open navigation group keys.
 *
 * Returns an empty array when nothing has been persisted, when the value
 * cannot be parsed, or when `localStorage` is unavailable (e.g. during SSR).
 * The read is synchronous and is expected to complete in <1ms.
 */
export function getNavOpenGroups(): string[] {
  if (!hasLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(NAV_OPEN_GROUPS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

/**
 * Persist the list of open navigation group keys and notify listeners.
 *
 * Writes synchronously to `localStorage` and dispatches a
 * {@link NAV_OPEN_GROUPS_CHANGE_EVENT} `CustomEvent` so that other instances
 * of the sidebar (or diagnostic tooling) can react without a page reload.
 */
export function setNavOpenGroups(groups: string[]): void {
  if (hasLocalStorage()) {
    try {
      window.localStorage.setItem(
        NAV_OPEN_GROUPS_STORAGE_KEY,
        JSON.stringify(groups)
      );
    } catch {
      // Ignore quota / privacy-mode failures — persistence is best-effort.
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new window.CustomEvent(NAV_OPEN_GROUPS_CHANGE_EVENT, {
        detail: groups,
      })
    );
  }
}
