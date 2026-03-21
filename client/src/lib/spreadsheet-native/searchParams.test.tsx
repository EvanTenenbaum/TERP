/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSpreadsheetSurfaceMode } from "./searchParams";

let mockPath = "/operations";
let mockSearch = "";
const mockSetLocation = vi.fn();
const mockTrackFallbackToClassic = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => [mockPath, mockSetLocation],
  useSearch: () => mockSearch,
}));

vi.mock("./surfaceTelemetry", () => ({
  trackFallbackToClassic: (...args: unknown[]) =>
    mockTrackFallbackToClassic(...args),
}));

describe("useSpreadsheetSurfaceMode", () => {
  beforeEach(() => {
    mockPath = "/operations";
    mockSearch = "";
    mockSetLocation.mockClear();
    mockTrackFallbackToClassic.mockClear();
  });

  it("uses sheet-native mode when enabled and requested", () => {
    mockSearch = "?tab=inventory&surface=sheet-native";

    const { result } = renderHook(() =>
      useSpreadsheetSurfaceMode({ enabled: true, ready: true })
    );

    expect(result.current.surfaceMode).toBe("sheet-native");
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it("keeps classic mode and strips stale sheet-native param when unavailable", () => {
    mockSearch = "?tab=inventory&surface=sheet-native";

    const { result } = renderHook(() =>
      useSpreadsheetSurfaceMode({ enabled: false, ready: true })
    );

    expect(result.current.surfaceMode).toBe("classic");
    expect(mockSetLocation).toHaveBeenCalledWith("/operations?tab=inventory", {
      replace: true,
    });
  });

  it("does not strip the sheet-native param until availability is ready", () => {
    mockSearch = "?tab=inventory&surface=sheet-native";

    const { result } = renderHook(() =>
      useSpreadsheetSurfaceMode({ enabled: false, ready: false })
    );

    expect(result.current.surfaceMode).toBe("classic");
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  describe("fallback tracking", () => {
    it("logs a fallback event when switching from sheet-native to classic", () => {
      mockPath = "/sales";
      mockSearch = "?tab=orders&surface=sheet-native";

      const { rerender } = renderHook(() =>
        useSpreadsheetSurfaceMode({ enabled: true, ready: true })
      );

      // Now switch to classic by removing the surface param
      mockSearch = "?tab=orders";
      rerender();

      expect(mockTrackFallbackToClassic).toHaveBeenCalledWith(
        "sales",
        "/sales"
      );
    });

    it("does not log when switching from classic to sheet-native", () => {
      mockPath = "/sales";
      mockSearch = "?tab=orders";

      const { rerender } = renderHook(() =>
        useSpreadsheetSurfaceMode({ enabled: true, ready: true })
      );

      // Switch to sheet-native
      mockSearch = "?tab=orders&surface=sheet-native";
      rerender();

      expect(mockTrackFallbackToClassic).not.toHaveBeenCalled();
    });

    it("does not log on initial mount with classic mode", () => {
      mockPath = "/sales";
      mockSearch = "?tab=orders";

      renderHook(() =>
        useSpreadsheetSurfaceMode({ enabled: true, ready: true })
      );

      expect(mockTrackFallbackToClassic).not.toHaveBeenCalled();
    });

    it("derives module name from the first path segment", () => {
      mockPath = "/operations/shipping";
      mockSearch = "?surface=sheet-native";

      const { rerender } = renderHook(() =>
        useSpreadsheetSurfaceMode({ enabled: true, ready: true })
      );

      mockSearch = "";
      rerender();

      expect(mockTrackFallbackToClassic).toHaveBeenCalledWith(
        "operations",
        "/operations/shipping"
      );
    });
  });
});
