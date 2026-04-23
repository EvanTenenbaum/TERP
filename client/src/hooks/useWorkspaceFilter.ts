/**
 * useWorkspaceFilter — UX v2 workspace filter URL state (TER-1310)
 *
 * Stores active workspace filter state in URL search params using the
 * `filter[key]=value` bracket notation so that links are deep-linkable:
 *
 *   /orders?filter[status]=pending&filter[owner]=evan
 *
 * Returns the parsed filter as a flat `Record<string, string>` map — callers
 * access individual filter facets via `filter["status"]`, `filter["owner"]`,
 * etc. Setting a value to `""`, `null`, or `undefined` removes that facet
 * from the URL. `clearFilter()` removes every `filter[*]` param in one shot
 * without disturbing unrelated params (e.g. `tab`, `page`).
 *
 * Wouter is used for URL state — same pattern as `useQueryTabState` and
 * `useTableUrlState` elsewhere in the codebase (TER-1212).
 *
 * Pair this with `<WorkspaceFilterBar>` (the container) rendered in the
 * `filterStrip` slot of `LinearWorkspaceShell`.
 *
 * See: docs/ux-review/02-Implementation_Strategy.md §4.3
 * Linear: TER-1310 (epic TER-1283)
 *
 * @example
 * ```tsx
 * const { filter, setFilter, clearFilter } = useWorkspaceFilter();
 *
 * // Read:
 * const status = filter["status"] ?? "all";
 *
 * // Patch a single facet:
 * setFilter({ status: "pending" });
 *
 * // Remove a facet:
 * setFilter({ status: "" });
 *
 * // Clear every filter:
 * clearFilter();
 * ```
 */

import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";

/** Regex matching the `filter[<key>]` URL param convention. */
const FILTER_PARAM_PATTERN = /^filter\[([^\]]+)\]$/;

/** Build the canonical URL param name for a filter facet. */
function filterParamKey(key: string): string {
  return `filter[${key}]`;
}

/**
 * Parsed filter map. Keys are facet names (e.g. "status", "owner"); values are
 * the current string value for that facet. Facets with empty/missing values
 * are omitted from the map.
 */
export type WorkspaceFilter = Record<string, string>;

/**
 * Patch payload for `setFilter`. Any facet whose value is `""`, `null`, or
 * `undefined` is removed from the URL; otherwise the facet is set/replaced.
 */
export type WorkspaceFilterPatch = Record<
  string,
  string | null | undefined
>;

export interface UseWorkspaceFilterReturn {
  /** Current filter map parsed from the URL. Always a stable snapshot. */
  filter: WorkspaceFilter;
  /** Merge the provided patch into the URL filter. */
  setFilter: (patch: WorkspaceFilterPatch) => void;
  /** Remove every `filter[*]` param from the URL in one call. */
  clearFilter: () => void;
}

/**
 * Strip any query-string portion off a wouter location. Wouter's
 * `useLocation` is usually path-only, but a few call sites concat search
 * strings before passing us back, so we defensively slice.
 */
function pathOnly(location: string): string {
  const queryIdx = location.indexOf("?");
  return queryIdx === -1 ? location : location.slice(0, queryIdx);
}

/**
 * Build a new URL from (path, params) — omits the `?` when there are no
 * params so we don't emit bare `/orders?`.
 */
function buildUrl(path: string, params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function useWorkspaceFilter(): UseWorkspaceFilterReturn {
  const [location, setLocation] = useLocation();
  const search = useSearch();

  const filter = useMemo<WorkspaceFilter>(() => {
    const params = new URLSearchParams(search);
    const parsed: WorkspaceFilter = {};
    params.forEach((value, key) => {
      const match = FILTER_PARAM_PATTERN.exec(key);
      if (match) {
        const facet = match[1];
        if (facet && value !== "") {
          parsed[facet] = value;
        }
      }
    });
    return parsed;
  }, [search]);

  const setFilter = useCallback(
    (patch: WorkspaceFilterPatch) => {
      const params = new URLSearchParams(search);
      for (const facet of Object.keys(patch)) {
        const value = patch[facet];
        const paramKey = filterParamKey(facet);
        if (value === null || value === undefined || value === "") {
          params.delete(paramKey);
        } else {
          params.set(paramKey, value);
        }
      }
      setLocation(buildUrl(pathOnly(location), params));
    },
    [location, search, setLocation]
  );

  const clearFilter = useCallback(() => {
    const params = new URLSearchParams(search);
    // Collect first, delete after — mutating during iteration is undefined.
    const keysToDelete: string[] = [];
    params.forEach((_value, key) => {
      if (FILTER_PARAM_PATTERN.test(key)) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      params.delete(key);
    }
    setLocation(buildUrl(pathOnly(location), params));
  }, [location, search, setLocation]);

  return { filter, setFilter, clearFilter };
}

export default useWorkspaceFilter;
