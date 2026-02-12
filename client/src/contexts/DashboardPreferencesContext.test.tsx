/**
 * DashboardPreferencesContext Tests
 *
 * Tests for the DashboardPreferencesContext to ensure proper layout and widget management,
 * specifically testing the fix for QA-033 (Custom layout blank dashboard issue).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { DashboardPreferencesProvider, useDashboardPreferences } from "./DashboardPreferencesContext";
import { LAYOUT_PRESETS, DEFAULT_LAYOUT_ID } from "@/lib/constants/dashboardPresets";

// Mock tRPC setup (local mock removed, relying on global setup.ts)
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

// Mock tRPC functions globally for this file's context
vi.mock("@/lib/trpc", () => ({
  trpc: {
    dashboardPreferences: {
      getPreferences: {
        useQuery: () => mockUseQuery(),
      },
      updatePreferences: {
        useMutation: () => mockUseMutation(),
      },
      resetPreferences: {
        useMutation: () => ({
          mutate: vi.fn(),
        }),
      },
    },
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("DashboardPreferencesContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Default mock implementations
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
    
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <DashboardPreferencesProvider>{children}</DashboardPreferencesProvider>
  );

  describe("QA-033: Custom Layout Blank Dashboard Fix", () => {
    it("should preserve widgets when switching to custom layout from operations", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      // Start with operations layout (default)
      expect(result.current.activeLayoutId).toBe(DEFAULT_LAYOUT_ID);
      const initialWidgets = [...result.current.widgets];
      expect(initialWidgets.length).toBeGreaterThan(0);

      // Switch to custom layout
      act(() => {
        result.current.setActiveLayout("custom");
      });

      // Verify layout changed to custom
      expect(result.current.activeLayoutId).toBe("custom");
      
      // Verify widgets are preserved (not replaced with empty array)
      expect(result.current.widgets.length).toBe(initialWidgets.length);
      expect(result.current.widgets).toEqual(initialWidgets);
    });

    it("should preserve widgets when switching to custom layout from executive", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      // Switch to executive layout first
      act(() => {
        result.current.setActiveLayout("executive");
      });

      expect(result.current.activeLayoutId).toBe("executive");
      const executiveWidgets = [...result.current.widgets];
      expect(executiveWidgets.length).toBeGreaterThan(0);

      // Switch to custom layout
      act(() => {
        result.current.setActiveLayout("custom");
      });

      // Verify layout changed to custom
      expect(result.current.activeLayoutId).toBe("custom");
      
      // Verify widgets from executive are preserved
      expect(result.current.widgets.length).toBe(executiveWidgets.length);
      expect(result.current.widgets).toEqual(executiveWidgets);
    });

    it("should preserve widgets when switching to custom layout from sales", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      // Switch to sales layout first
      act(() => {
        result.current.setActiveLayout("sales");
      });

      expect(result.current.activeLayoutId).toBe("sales");
      const salesWidgets = [...result.current.widgets];
      expect(salesWidgets.length).toBeGreaterThan(0);

      // Switch to custom layout
      act(() => {
        result.current.setActiveLayout("custom");
      });

      // Verify layout changed to custom
      expect(result.current.activeLayoutId).toBe("custom");
      
      // Verify widgets from sales are preserved
      expect(result.current.widgets.length).toBe(salesWidgets.length);
      expect(result.current.widgets).toEqual(salesWidgets);
    });

    it("should preserve custom widget modifications when switching to custom layout", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      // Start with operations layout
      const initialWidgets = [...result.current.widgets];
      
      // Toggle visibility of first widget (this automatically switches to custom)
      const firstWidgetId = initialWidgets[0].id;
      act(() => {
        result.current.toggleWidgetVisibility(firstWidgetId);
      });

      // Verify we're now on custom layout with modified widgets
      expect(result.current.activeLayoutId).toBe("custom");
      const modifiedWidgets = [...result.current.widgets];
      expect(modifiedWidgets[0].isVisible).toBe(!initialWidgets[0].isVisible);

      // Switch to another layout (e.g., sales)
      act(() => {
        result.current.setActiveLayout("sales");
      });

      expect(result.current.activeLayoutId).toBe("sales");

      // Switch back to custom
      act(() => {
        result.current.setActiveLayout("custom");
      });

      // Verify we're on custom layout and widgets are preserved from sales
      expect(result.current.activeLayoutId).toBe("custom");
      expect(result.current.widgets.length).toBeGreaterThan(0);
    });

    it("should have visible widgets when custom layout is active", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      // Switch to custom layout
      act(() => {
        result.current.setActiveLayout("custom");
      });

      // Verify there are visible widgets
      const visibleWidgets = result.current.widgets.filter(w => w.isVisible);
      expect(visibleWidgets.length).toBeGreaterThan(0);
    });
  });

  describe("Layout Preset Switching", () => {
    it("should replace widgets when switching to executive layout", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      act(() => {
        result.current.setActiveLayout("executive");
      });

      expect(result.current.activeLayoutId).toBe("executive");
      expect(result.current.widgets).toEqual(LAYOUT_PRESETS.executive.widgets);
    });

    it("should replace widgets when switching to operations layout", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      // Start with executive
      act(() => {
        result.current.setActiveLayout("executive");
      });

      // Switch to operations
      act(() => {
        result.current.setActiveLayout("operations");
      });

      expect(result.current.activeLayoutId).toBe("operations");
      expect(result.current.widgets).toEqual(LAYOUT_PRESETS.operations.widgets);
    });

    it("should replace widgets when switching to sales layout", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      act(() => {
        result.current.setActiveLayout("sales");
      });

      expect(result.current.activeLayoutId).toBe("sales");
      expect(result.current.widgets).toEqual(LAYOUT_PRESETS.sales.widgets);
    });
  });

  describe("Widget Visibility Toggle", () => {
    it("should toggle widget visibility and switch to custom layout", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      const _initialLayoutId = result.current.activeLayoutId;
      const firstWidget = result.current.widgets[0];
      const initialVisibility = firstWidget.isVisible;

      act(() => {
        result.current.toggleWidgetVisibility(firstWidget.id);
      });

      // Should switch to custom layout
      expect(result.current.activeLayoutId).toBe("custom");
      
      // Should toggle visibility
      const updatedWidget = result.current.widgets.find(w => w.id === firstWidget.id);
      expect(updatedWidget?.isVisible).toBe(!initialVisibility);
    });
  });

  describe("Widget Reordering", () => {
    it("should move widget up and switch to custom layout", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      const secondWidget = result.current.widgets[1];

      act(() => {
        result.current.moveWidgetUp(secondWidget.id);
      });

      // Should switch to custom layout
      expect(result.current.activeLayoutId).toBe("custom");
      
      // Widget should be moved up
      expect(result.current.widgets[0].id).toBe(secondWidget.id);
    });

    it("should move widget down and switch to custom layout", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      const firstWidget = result.current.widgets[0];

      act(() => {
        result.current.moveWidgetDown(firstWidget.id);
      });

      // Should switch to custom layout
      expect(result.current.activeLayoutId).toBe("custom");
      
      // Widget should be moved down
      expect(result.current.widgets[1].id).toBe(firstWidget.id);
    });
  });

  describe("Reset to Default", () => {
    it("should reset to default layout and widgets", () => {
      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      // Make some changes
      act(() => {
        result.current.setActiveLayout("executive");
      });

      act(() => {
        result.current.toggleWidgetVisibility(result.current.widgets[0].id);
      });

      // Reset
      act(() => {
        result.current.resetToDefault();
      });

      expect(result.current.activeLayoutId).toBe(DEFAULT_LAYOUT_ID);
      expect(result.current.widgets).toEqual(LAYOUT_PRESETS[DEFAULT_LAYOUT_ID].widgets);
    });
  });
});