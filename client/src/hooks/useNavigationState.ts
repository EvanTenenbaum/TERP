/**
 * Navigation state persisted per user scope.
 *
 * Stores:
 * - collapsed navigation groups
 * - pinned quick-link paths
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { NavigationGroupKey } from "@/config/navigation";

const STORAGE_PREFIX = "terp-navigation-state";
const PATHS_KEY_SEPARATOR = "\u001f";
const ALL_GROUPS: NavigationGroupKey[] = [
  "sales",
  "inventory",
  "finance",
  "admin",
];

interface NavigationState {
  collapsedGroups: NavigationGroupKey[];
  pinnedPaths: string[];
}

export interface UseNavigationStateOptions {
  scopeKey?: string;
  maxPinnedPaths?: number;
  defaultPinnedPaths?: string[];
}

export interface UseNavigationStateReturn {
  isGroupCollapsed: (group: NavigationGroupKey) => boolean;
  toggleGroup: (group: NavigationGroupKey) => void;
  expandAll: () => void;
  collapseAll: () => void;
  isPinned: (path: string) => boolean;
  togglePin: (path: string) => void;
  setPinnedPaths: (paths: string[]) => void;
  pinnedPaths: string[];
}

function dedupe(paths: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const path of paths) {
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    result.push(path);
  }
  return result;
}

function buildPathsKey(paths?: string[]): string {
  const normalized = dedupe(paths ?? []);
  if (normalized.length === 0) {
    return "";
  }
  return normalized.join(PATHS_KEY_SEPARATOR);
}

function normalizeState(
  state: Partial<NavigationState>,
  maxPinnedPaths: number,
  defaultPinnedPaths: string[]
): NavigationState {
  const collapsedGroups = Array.isArray(state.collapsedGroups)
    ? state.collapsedGroups.filter((group): group is NavigationGroupKey =>
        ALL_GROUPS.includes(group as NavigationGroupKey)
      )
    : [];

  const pinnedPathsSource = Array.isArray(state.pinnedPaths)
    ? state.pinnedPaths
    : defaultPinnedPaths;
  const pinnedPaths = dedupe(pinnedPathsSource).slice(0, maxPinnedPaths);

  return {
    collapsedGroups,
    pinnedPaths,
  };
}

function loadState(
  storageKey: string,
  maxPinnedPaths: number,
  defaultPinnedPaths: string[]
): NavigationState {
  if (typeof window === "undefined") {
    return normalizeState({}, maxPinnedPaths, defaultPinnedPaths);
  }

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return normalizeState({}, maxPinnedPaths, defaultPinnedPaths);
    }

    const parsed = JSON.parse(stored) as Partial<NavigationState>;
    return normalizeState(parsed, maxPinnedPaths, defaultPinnedPaths);
  } catch {
    return normalizeState({}, maxPinnedPaths, defaultPinnedPaths);
  }
}

function saveState(storageKey: string, state: NavigationState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Ignore storage failures (private mode/quota exceeded).
  }
}

export function useNavigationState(
  options: UseNavigationStateOptions = {}
): UseNavigationStateReturn {
  const scopeKey = options.scopeKey ?? "anonymous";
  const maxPinnedPaths = options.maxPinnedPaths ?? 4;
  const defaultPinnedPathsKey = buildPathsKey(options.defaultPinnedPaths);
  const defaultPinnedPaths = useMemo(
    () =>
      defaultPinnedPathsKey
        ? defaultPinnedPathsKey.split(PATHS_KEY_SEPARATOR)
        : [],
    [defaultPinnedPathsKey]
  );
  const storageKey = `${STORAGE_PREFIX}:${scopeKey}`;

  const [state, setState] = useState<NavigationState>(() =>
    loadState(storageKey, maxPinnedPaths, defaultPinnedPaths)
  );

  useEffect(() => {
    setState(loadState(storageKey, maxPinnedPaths, defaultPinnedPaths));
  }, [defaultPinnedPaths, maxPinnedPaths, storageKey]);

  useEffect(() => {
    saveState(storageKey, state);
  }, [state, storageKey]);

  const isGroupCollapsed = useCallback(
    (group: NavigationGroupKey): boolean =>
      state.collapsedGroups.includes(group),
    [state.collapsedGroups]
  );

  const toggleGroup = useCallback((group: NavigationGroupKey): void => {
    setState(prev => {
      const collapsed = prev.collapsedGroups.includes(group);
      return {
        ...prev,
        collapsedGroups: collapsed
          ? prev.collapsedGroups.filter(item => item !== group)
          : [...prev.collapsedGroups, group],
      };
    });
  }, []);

  const expandAll = useCallback((): void => {
    setState(prev => ({ ...prev, collapsedGroups: [] }));
  }, []);

  const collapseAll = useCallback((): void => {
    setState(prev => ({ ...prev, collapsedGroups: [...ALL_GROUPS] }));
  }, []);

  const isPinned = useCallback(
    (path: string): boolean => state.pinnedPaths.includes(path),
    [state.pinnedPaths]
  );

  const setPinnedPaths = useCallback(
    (paths: string[]): void => {
      setState(prev => ({
        ...prev,
        pinnedPaths: dedupe(paths).slice(0, maxPinnedPaths),
      }));
    },
    [maxPinnedPaths]
  );

  const togglePin = useCallback(
    (path: string): void => {
      setState(prev => {
        if (prev.pinnedPaths.includes(path)) {
          return {
            ...prev,
            pinnedPaths: prev.pinnedPaths.filter(item => item !== path),
          };
        }

        if (prev.pinnedPaths.length >= maxPinnedPaths) {
          return {
            ...prev,
            pinnedPaths: [...prev.pinnedPaths.slice(1), path],
          };
        }

        return {
          ...prev,
          pinnedPaths: [...prev.pinnedPaths, path],
        };
      });
    },
    [maxPinnedPaths]
  );

  return useMemo(
    () => ({
      isGroupCollapsed,
      toggleGroup,
      expandAll,
      collapseAll,
      isPinned,
      togglePin,
      setPinnedPaths,
      pinnedPaths: state.pinnedPaths,
    }),
    [
      collapseAll,
      expandAll,
      isGroupCollapsed,
      isPinned,
      setPinnedPaths,
      state.pinnedPaths,
      toggleGroup,
      togglePin,
    ]
  );
}
