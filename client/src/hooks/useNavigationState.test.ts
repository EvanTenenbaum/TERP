/**
 * Tests for useNavigationState hook
 * ENH-001: Collapsible navigation groups
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigationState } from './useNavigationState';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useNavigationState', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('group collapse state', () => {
    it('should start with all groups expanded by default', () => {
      const { result } = renderHook(() => useNavigationState());
      expect(result.current.isGroupCollapsed('core')).toBe(false);
      expect(result.current.isGroupCollapsed('sales')).toBe(false);
      expect(result.current.isGroupCollapsed('fulfillment')).toBe(false);
      expect(result.current.isGroupCollapsed('finance')).toBe(false);
      expect(result.current.isGroupCollapsed('settings')).toBe(false);
    });

    it('should toggle group collapsed state', () => {
      const { result } = renderHook(() => useNavigationState());
      expect(result.current.isGroupCollapsed('sales')).toBe(false);
      act(() => { result.current.toggleGroup('sales'); });
      expect(result.current.isGroupCollapsed('sales')).toBe(true);
      act(() => { result.current.toggleGroup('sales'); });
      expect(result.current.isGroupCollapsed('sales')).toBe(false);
    });

    it('should collapse all groups', () => {
      const { result } = renderHook(() => useNavigationState());
      act(() => { result.current.collapseAll(); });
      expect(result.current.isGroupCollapsed('core')).toBe(true);
      expect(result.current.isGroupCollapsed('sales')).toBe(true);
      expect(result.current.isGroupCollapsed('fulfillment')).toBe(true);
      expect(result.current.isGroupCollapsed('finance')).toBe(true);
      expect(result.current.isGroupCollapsed('settings')).toBe(true);
    });

    it('should expand all groups', () => {
      const { result } = renderHook(() => useNavigationState());
      act(() => { result.current.collapseAll(); });
      act(() => { result.current.expandAll(); });
      expect(result.current.isGroupCollapsed('core')).toBe(false);
      expect(result.current.isGroupCollapsed('sales')).toBe(false);
    });
  });

  describe('pinned items', () => {
    it('should start with no pinned items', () => {
      const { result } = renderHook(() => useNavigationState());
      expect(result.current.pinnedPaths).toEqual([]);
      expect(result.current.isPinned('/orders')).toBe(false);
    });

    it('should toggle pinned state', () => {
      const { result } = renderHook(() => useNavigationState());
      act(() => { result.current.togglePin('/orders'); });
      expect(result.current.isPinned('/orders')).toBe(true);
      act(() => { result.current.togglePin('/orders'); });
      expect(result.current.isPinned('/orders')).toBe(false);
    });

    it('should allow multiple pinned items', () => {
      const { result } = renderHook(() => useNavigationState());
      act(() => {
        result.current.togglePin('/orders');
        result.current.togglePin('/clients');
        result.current.togglePin('/inventory');
      });
      expect(result.current.pinnedPaths).toHaveLength(3);
    });
  });

  describe('localStorage persistence', () => {
    it('should save state to localStorage', () => {
      const { result } = renderHook(() => useNavigationState());
      act(() => {
        result.current.toggleGroup('sales');
        result.current.togglePin('/orders');
      });
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json');
      const { result } = renderHook(() => useNavigationState());
      expect(result.current.isGroupCollapsed('sales')).toBe(false);
      expect(result.current.pinnedPaths).toEqual([]);
    });
  });
});
