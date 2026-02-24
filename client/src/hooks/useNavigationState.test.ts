/**
 * Tests for useNavigationState hook
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNavigationState } from "./useNavigationState";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useNavigationState", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("group collapse state", () => {
    it("starts with all groups expanded", () => {
      const { result } = renderHook(() => useNavigationState());

      expect(result.current.isGroupCollapsed("sales")).toBe(false);
      expect(result.current.isGroupCollapsed("inventory")).toBe(false);
      expect(result.current.isGroupCollapsed("finance")).toBe(false);
      expect(result.current.isGroupCollapsed("admin")).toBe(false);
    });

    it("toggles group collapsed state", () => {
      const { result } = renderHook(() => useNavigationState());

      act(() => {
        result.current.toggleGroup("sales");
      });
      expect(result.current.isGroupCollapsed("sales")).toBe(true);

      act(() => {
        result.current.toggleGroup("sales");
      });
      expect(result.current.isGroupCollapsed("sales")).toBe(false);
    });

    it("collapses and expands all groups", () => {
      const { result } = renderHook(() => useNavigationState());

      act(() => {
        result.current.collapseAll();
      });

      expect(result.current.isGroupCollapsed("sales")).toBe(true);
      expect(result.current.isGroupCollapsed("inventory")).toBe(true);
      expect(result.current.isGroupCollapsed("finance")).toBe(true);
      expect(result.current.isGroupCollapsed("admin")).toBe(true);

      act(() => {
        result.current.expandAll();
      });

      expect(result.current.isGroupCollapsed("sales")).toBe(false);
      expect(result.current.isGroupCollapsed("inventory")).toBe(false);
      expect(result.current.isGroupCollapsed("finance")).toBe(false);
      expect(result.current.isGroupCollapsed("admin")).toBe(false);
    });
  });

  describe("pinned paths", () => {
    it("pins and unpins paths", () => {
      const { result } = renderHook(() => useNavigationState());

      act(() => {
        result.current.togglePin("/orders");
      });

      expect(result.current.isPinned("/orders")).toBe(true);
      expect(result.current.pinnedPaths).toContain("/orders");

      act(() => {
        result.current.togglePin("/orders");
      });

      expect(result.current.isPinned("/orders")).toBe(false);
      expect(result.current.pinnedPaths).not.toContain("/orders");
    });

    it("keeps only max pinned paths and drops oldest", () => {
      const { result } = renderHook(() =>
        useNavigationState({ maxPinnedPaths: 3 })
      );

      act(() => {
        result.current.togglePin("/one");
        result.current.togglePin("/two");
        result.current.togglePin("/three");
        result.current.togglePin("/four");
      });

      expect(result.current.pinnedPaths).toEqual(["/two", "/three", "/four"]);
    });

    it("supports setting pinned paths directly", () => {
      const { result } = renderHook(() =>
        useNavigationState({ maxPinnedPaths: 4 })
      );

      act(() => {
        result.current.setPinnedPaths(["/a", "/b", "/b", "/c", "/d", "/e"]);
      });

      expect(result.current.pinnedPaths).toEqual(["/a", "/b", "/c", "/d"]);
    });
  });

  describe("localStorage scope", () => {
    it("persists using scoped storage key", () => {
      const { result } = renderHook(() =>
        useNavigationState({ scopeKey: "user:42" })
      );

      act(() => {
        result.current.toggleGroup("sales");
        result.current.togglePin("/orders");
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const [storageKey, payload] =
        localStorageMock.setItem.mock.calls[
          localStorageMock.setItem.mock.calls.length - 1
        ];
      expect(storageKey).toBe("terp-navigation-state:user:42");

      const savedState = JSON.parse(payload);
      expect(savedState.collapsedGroups).toContain("sales");
      expect(savedState.pinnedPaths).toContain("/orders");
    });

    it("loads scoped state from localStorage", () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "terp-navigation-state:user:42") {
          return JSON.stringify({
            collapsedGroups: ["finance"],
            pinnedPaths: ["/orders", "/clients"],
          });
        }
        return null;
      });

      const { result } = renderHook(() =>
        useNavigationState({ scopeKey: "user:42" })
      );

      expect(result.current.isGroupCollapsed("finance")).toBe(true);
      expect(result.current.isPinned("/orders")).toBe(true);
      expect(result.current.isPinned("/clients")).toBe(true);
    });

    it("handles invalid localStorage payload", () => {
      localStorageMock.getItem.mockReturnValueOnce("invalid-json");

      const { result } = renderHook(() =>
        useNavigationState({ defaultPinnedPaths: ["/", "/orders/create"] })
      );

      expect(result.current.pinnedPaths).toEqual(["/", "/orders/create"]);
      expect(result.current.isGroupCollapsed("sales")).toBe(false);
    });

    it("isolates pinned quicklinks per scope key", () => {
      const { result: userA } = renderHook(() =>
        useNavigationState({ scopeKey: "user:A" })
      );
      const { result: userB } = renderHook(() =>
        useNavigationState({ scopeKey: "user:B" })
      );

      act(() => {
        userA.current.togglePin("/receiving");
      });

      expect(userA.current.isPinned("/receiving")).toBe(true);
      expect(userB.current.isPinned("/receiving")).toBe(false);
    });
  });
});
