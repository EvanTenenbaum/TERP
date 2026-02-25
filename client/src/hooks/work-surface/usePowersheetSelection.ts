/**
 * TER-283/284/285/286: Shared Powersheet Selection Hook
 *
 * Provides unified selection state for Work Surface patterns:
 * - Single-item active focus (activeId)
 * - Multi-select with Set<T> (selectedIds)
 * - Toggle / toggleAll / clear / reset
 * - Backward-compatible with existing component aliases
 *
 * Generic over T to support both numeric IDs (batches, orders)
 * and string IDs (draft line UUIDs).
 */
import React, { useState, useCallback, useRef, useMemo } from "react";

export interface UsePowersheetSelectionOptions<T extends string | number> {
  /** IDs currently visible in the list (for toggleAll scope) */
  visibleIds: T[];
  /** Initial active (focused) item */
  initialActiveId?: T | null;
  /** Initial active index */
  initialActiveIndex?: number;
  /** Called when activeId changes */
  onActiveChange?: (id: T | null) => void;
  /** Called when selectedIds changes */
  onSelectionChange?: (ids: Set<T>) => void;
  /** If true, clear multi-selection when activeId changes */
  clearOnActiveChange?: boolean;
}

export interface UsePowersheetSelectionReturn<T extends string | number> {
  activeId: T | null;
  setActiveId: (id: T | null) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  selectedIds: Set<T>;
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  toggle: (id: T, checked: boolean | "indeterminate") => void;
  toggleAll: (checked: boolean | "indeterminate") => void;
  isSelected: (id: T) => boolean;
  getSelectedArray: () => T[];
  clear: () => void;
  reset: () => void;
  restoreFocus: (id: T) => void;
  lastFocusRef: React.MutableRefObject<T | null>;
}

export function usePowersheetSelection<T extends string | number>(
  options: UsePowersheetSelectionOptions<T>
): UsePowersheetSelectionReturn<T> {
  const {
    visibleIds,
    initialActiveId = null,
    initialActiveIndex = -1,
    onActiveChange,
    onSelectionChange,
    clearOnActiveChange = false,
  } = options;

  const [activeId, setActiveIdRaw] = useState<T | null>(initialActiveId);
  const [activeIndex, setActiveIndex] = useState<number>(initialActiveIndex);
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());
  const lastFocusRef = useRef<T | null>(null);

  const setActiveId = useCallback(
    (id: T | null) => {
      setActiveIdRaw(id);
      onActiveChange?.(id);
      if (clearOnActiveChange) {
        setSelectedIds(new Set());
      }
    },
    [onActiveChange, clearOnActiveChange]
  );

  const selectedCount = selectedIds.size;

  const allSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id)),
    [visibleIds, selectedIds]
  );

  const someSelected = useMemo(
    () => visibleIds.some(id => selectedIds.has(id)) && !allSelected,
    [visibleIds, selectedIds, allSelected]
  );

  const toggle = useCallback(
    (id: T, checked: boolean | "indeterminate") => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (checked === true) {
          next.add(id);
        } else {
          next.delete(id);
        }
        onSelectionChange?.(next);
        return next;
      });
    },
    [onSelectionChange]
  );

  const toggleAll = useCallback(
    (checked: boolean | "indeterminate") => {
      if (checked === true) {
        const next = new Set(visibleIds);
        setSelectedIds(next);
        onSelectionChange?.(next);
      } else {
        const next = new Set<T>();
        setSelectedIds(next);
        onSelectionChange?.(next);
      }
    },
    [visibleIds, onSelectionChange]
  );

  const isSelected = useCallback((id: T) => selectedIds.has(id), [selectedIds]);

  const getSelectedArray = useCallback(
    () => Array.from(selectedIds),
    [selectedIds]
  );

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    onSelectionChange?.(new Set());
  }, [onSelectionChange]);

  const reset = useCallback(() => {
    setActiveIdRaw(null);
    setActiveIndex(-1);
    setSelectedIds(new Set());
    onActiveChange?.(null);
    onSelectionChange?.(new Set());
  }, [onActiveChange, onSelectionChange]);

  const restoreFocus = useCallback(
    (id: T) => {
      lastFocusRef.current = id;
      setActiveIdRaw(id);
      const idx = visibleIds.indexOf(id);
      if (idx >= 0) {
        setActiveIndex(idx);
      }
      onActiveChange?.(id);
    },
    [visibleIds, onActiveChange]
  );

  return {
    activeId,
    setActiveId,
    activeIndex,
    setActiveIndex,
    selectedIds,
    selectedCount,
    allSelected,
    someSelected,
    toggle,
    toggleAll,
    isSelected,
    getSelectedArray,
    clear,
    reset,
    restoreFocus,
    lastFocusRef,
  };
}
