/**
 * Navigation State Management Hook
 * ENH-001: Collapsible navigation groups with localStorage persistence
 * 
 * Manages:
 * - Collapsed/expanded state for navigation groups
 * - Pinned items for quick access
 * - Persistence to localStorage
 */

import { useState, useCallback, useEffect } from 'react';

export type NavigationGroup = 'core' | 'sales' | 'fulfillment' | 'finance' | 'settings';

interface NavigationState {
  /** Groups that are currently collapsed */
  collapsedGroups: NavigationGroup[];
  /** Paths that are pinned to the top */
  pinnedPaths: string[];
}

const STORAGE_KEY = 'terp-navigation-state';

const DEFAULT_STATE: NavigationState = {
  collapsedGroups: [],
  pinnedPaths: [],
};

function loadState(): NavigationState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    
    const parsed = JSON.parse(stored) as Partial<NavigationState>;
    return {
      collapsedGroups: Array.isArray(parsed.collapsedGroups) ? parsed.collapsedGroups : [],
      pinnedPaths: Array.isArray(parsed.pinnedPaths) ? parsed.pinnedPaths : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: NavigationState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export interface UseNavigationStateReturn {
  isGroupCollapsed: (group: NavigationGroup) => boolean;
  toggleGroup: (group: NavigationGroup) => void;
  isPinned: (path: string) => boolean;
  togglePin: (path: string) => void;
  pinnedPaths: string[];
  expandAll: () => void;
  collapseAll: () => void;
}

export function useNavigationState(): UseNavigationStateReturn {
  const [state, setState] = useState<NavigationState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const isGroupCollapsed = useCallback(
    (group: NavigationGroup): boolean => state.collapsedGroups.includes(group),
    [state.collapsedGroups]
  );

  const toggleGroup = useCallback((group: NavigationGroup): void => {
    setState(prev => ({
      ...prev,
      collapsedGroups: prev.collapsedGroups.includes(group)
        ? prev.collapsedGroups.filter(g => g !== group)
        : [...prev.collapsedGroups, group],
    }));
  }, []);

  const isPinned = useCallback(
    (path: string): boolean => state.pinnedPaths.includes(path),
    [state.pinnedPaths]
  );

  const togglePin = useCallback((path: string): void => {
    setState(prev => ({
      ...prev,
      pinnedPaths: prev.pinnedPaths.includes(path)
        ? prev.pinnedPaths.filter(p => p !== path)
        : [...prev.pinnedPaths, path],
    }));
  }, []);

  const expandAll = useCallback((): void => {
    setState(prev => ({ ...prev, collapsedGroups: [] }));
  }, []);

  const collapseAll = useCallback((): void => {
    setState(prev => ({
      ...prev,
      collapsedGroups: ['core', 'sales', 'fulfillment', 'finance', 'settings'],
    }));
  }, []);

  return {
    isGroupCollapsed,
    toggleGroup,
    isPinned,
    togglePin,
    pinnedPaths: state.pinnedPaths,
    expandAll,
    collapseAll,
  };
}
