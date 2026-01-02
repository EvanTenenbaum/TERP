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

/**
 * Load navigation state from localStorage
 */
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

/**
 * Save navigation state to localStorage
 */
function saveState(state: NavigationState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

export interface UseNavigationStateReturn {
  /** Check if a group is collapsed */
  isGroupCollapsed: (group: NavigationGroup) => boolean;
  /** Toggle a group's collapsed state */
  toggleGroup: (group: NavigationGroup) => void;
  /** Check if a path is pinned */
  isPinned: (path: string) => boolean;
  /** Toggle a path's pinned state */
  togglePin: (path: string) => void;
  /** Get all pinned paths */
  pinnedPaths: string[];
  /** Expand all groups */
  expandAll: () => void;
  /** Collapse all groups */
  collapseAll: () => void;
}

/**
 * Hook for managing collapsible navigation state
 * 
 * @example
 * ```tsx
 * const { isGroupCollapsed, toggleGroup, isPinned, togglePin } = useNavigationState();
 * 
 * // Check if sales group is collapsed
 * if (isGroupCollapsed('sales')) { ... }
 * 
 * // Toggle the sales group
 * toggleGroup('sales');
 * 
 * // Pin a navigation item
 * togglePin('/orders');
 * ```
 */
export function useNavigationState(): UseNavigationStateReturn {
  const [state, setState] = useState<NavigationState>(loadState);

  // Persist state changes to localStorage
  useEffect(() => {
    saveState(state);
  }, [state]);

  const isGroupCollapsed = useCallback(
    (group: NavigationGroup): boolean => {
      return state.collapsedGroups.includes(group);
    },
    [state.collapsedGroups]
  );

  const toggleGroup = useCallback((group: NavigationGroup): void => {
    setState(prev => {
      const isCollapsed = prev.collapsedGroups.includes(group);
      return {
        ...prev,
        collapsedGroups: isCollapsed
          ? prev.collapsedGroups.filter(g => g !== group)
          : [...prev.collapsedGroups, group],
      };
    });
  }, []);

  const isPinned = useCallback(
    (path: string): boolean => {
      return state.pinnedPaths.includes(path);
    },
    [state.pinnedPaths]
  );

  const togglePin = useCallback((path: string): void => {
    setState(prev => {
      const isPinnedPath = prev.pinnedPaths.includes(path);
      return {
        ...prev,
        pinnedPaths: isPinnedPath
          ? prev.pinnedPaths.filter(p => p !== path)
          : [...prev.pinnedPaths, path],
      };
    });
  }, []);

  const expandAll = useCallback((): void => {
    setState(prev => ({
      ...prev,
      collapsedGroups: [],
    }));
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
