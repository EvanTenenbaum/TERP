/**
 * Tests for query-backed tab state synchronization.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQueryTabState } from "./useQueryTabState";

let mockPath = "/sales";
let mockSearch = "";
const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => [mockPath, mockSetLocation],
  useSearch: () => mockSearch,
}));

describe("useQueryTabState", () => {
  beforeEach(() => {
    mockSetLocation.mockClear();
    mockPath = "/sales";
    mockSearch = "";
  });

  it("uses default tab when query has no tab", () => {
    const { result } = renderHook(() =>
      useQueryTabState({
        defaultTab: "orders",
        validTabs: ["orders", "quotes", "returns"] as const,
      })
    );

    expect(result.current.activeTab).toBe("orders");
  });

  it("uses query tab when it is valid", () => {
    mockSearch = "?tab=quotes";

    const { result } = renderHook(() =>
      useQueryTabState({
        defaultTab: "orders",
        validTabs: ["orders", "quotes", "returns"] as const,
      })
    );

    expect(result.current.activeTab).toBe("quotes");
  });

  it("falls back to default tab when query tab is invalid", () => {
    mockSearch = "?tab=invalid";

    const { result } = renderHook(() =>
      useQueryTabState({
        defaultTab: "orders",
        validTabs: ["orders", "quotes", "returns"] as const,
      })
    );

    expect(result.current.activeTab).toBe("orders");
  });

  it("sets a non-default tab while preserving existing query params", () => {
    mockSearch = "?status=open";

    const { result } = renderHook(() =>
      useQueryTabState({
        defaultTab: "orders",
        validTabs: ["orders", "quotes", "returns"] as const,
      })
    );

    act(() => {
      result.current.setActiveTab("quotes");
    });

    expect(mockSetLocation).toHaveBeenCalledWith(
      "/sales?status=open&tab=quotes"
    );
  });

  it("removes tab query when selecting the default tab", () => {
    mockSearch = "?tab=quotes&status=open";

    const { result } = renderHook(() =>
      useQueryTabState({
        defaultTab: "orders",
        validTabs: ["orders", "quotes", "returns"] as const,
      })
    );

    act(() => {
      result.current.setActiveTab("orders");
    });

    expect(mockSetLocation).toHaveBeenCalledWith("/sales?status=open");
  });
});
