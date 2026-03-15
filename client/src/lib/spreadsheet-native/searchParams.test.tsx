/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSpreadsheetSurfaceMode } from "./searchParams";

let mockPath = "/operations";
let mockSearch = "";
const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => [mockPath, mockSetLocation],
  useSearch: () => mockSearch,
}));

describe("useSpreadsheetSurfaceMode", () => {
  beforeEach(() => {
    mockPath = "/operations";
    mockSearch = "";
    mockSetLocation.mockClear();
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
});
