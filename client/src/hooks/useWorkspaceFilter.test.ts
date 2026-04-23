/**
 * Tests for useWorkspaceFilter (TER-1310).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkspaceFilter } from "./useWorkspaceFilter";

let mockPath = "/orders";
let mockSearch = "";
const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => [mockPath, mockSetLocation],
  useSearch: () => mockSearch,
}));

describe("useWorkspaceFilter", () => {
  beforeEach(() => {
    mockSetLocation.mockClear();
    mockPath = "/orders";
    mockSearch = "";
  });

  it("returns an empty filter when no filter params are present", () => {
    const { result } = renderHook(() => useWorkspaceFilter());
    expect(result.current.filter).toEqual({});
  });

  it("parses filter[key]=value pairs from the URL", () => {
    // URLSearchParams encodes `[` / `]` as %5B / %5D when serialized; the
    // browser also accepts the unencoded form in the address bar. We support
    // both — the encoded form is what wouter forwards to us after navigation.
    mockSearch = "?filter%5Bstatus%5D=pending&filter%5Bowner%5D=evan";

    const { result } = renderHook(() => useWorkspaceFilter());

    expect(result.current.filter).toEqual({
      status: "pending",
      owner: "evan",
    });
  });

  it("also parses unencoded filter[key]=value pairs (deep link from address bar)", () => {
    mockSearch = "?filter[status]=pending";

    const { result } = renderHook(() => useWorkspaceFilter());

    expect(result.current.filter).toEqual({ status: "pending" });
  });

  it("ignores non-filter params when reading", () => {
    mockSearch = "?tab=quotes&filter%5Bstatus%5D=pending&page=2";

    const { result } = renderHook(() => useWorkspaceFilter());

    expect(result.current.filter).toEqual({ status: "pending" });
  });

  it("sets a filter facet via setFilter()", () => {
    const { result } = renderHook(() => useWorkspaceFilter());

    act(() => {
      result.current.setFilter({ status: "pending" });
    });

    expect(mockSetLocation).toHaveBeenCalledTimes(1);
    const nextUrl = mockSetLocation.mock.calls[0][0] as string;
    expect(nextUrl.startsWith("/orders?")).toBe(true);
    const nextParams = new URLSearchParams(nextUrl.split("?")[1]);
    expect(nextParams.get("filter[status]")).toBe("pending");
  });

  it("preserves unrelated search params when setting a filter", () => {
    mockSearch = "?tab=quotes&page=2";

    const { result } = renderHook(() => useWorkspaceFilter());

    act(() => {
      result.current.setFilter({ status: "pending" });
    });

    const nextUrl = mockSetLocation.mock.calls[0][0] as string;
    const nextParams = new URLSearchParams(nextUrl.split("?")[1]);
    expect(nextParams.get("tab")).toBe("quotes");
    expect(nextParams.get("page")).toBe("2");
    expect(nextParams.get("filter[status]")).toBe("pending");
  });

  it("removes a facet when set to empty string", () => {
    mockSearch = "?filter%5Bstatus%5D=pending&filter%5Bowner%5D=evan";

    const { result } = renderHook(() => useWorkspaceFilter());

    act(() => {
      result.current.setFilter({ status: "" });
    });

    const nextUrl = mockSetLocation.mock.calls[0][0] as string;
    const nextParams = new URLSearchParams(nextUrl.split("?")[1]);
    expect(nextParams.has("filter[status]")).toBe(false);
    expect(nextParams.get("filter[owner]")).toBe("evan");
  });

  it("removes a facet when set to null/undefined", () => {
    mockSearch = "?filter%5Bstatus%5D=pending";

    const { result } = renderHook(() => useWorkspaceFilter());

    act(() => {
      result.current.setFilter({ status: null });
    });

    const nextUrl = mockSetLocation.mock.calls[0][0] as string;
    expect(nextUrl).toBe("/orders");
  });

  it("clearFilter() removes every filter[*] param but keeps other params", () => {
    mockSearch =
      "?tab=quotes&filter%5Bstatus%5D=pending&filter%5Bowner%5D=evan&page=2";

    const { result } = renderHook(() => useWorkspaceFilter());

    act(() => {
      result.current.clearFilter();
    });

    const nextUrl = mockSetLocation.mock.calls[0][0] as string;
    const nextParams = new URLSearchParams(nextUrl.split("?")[1]);
    expect(nextParams.has("filter[status]")).toBe(false);
    expect(nextParams.has("filter[owner]")).toBe(false);
    expect(nextParams.get("tab")).toBe("quotes");
    expect(nextParams.get("page")).toBe("2");
  });

  it("emits a bare path (no trailing '?') when every param is removed", () => {
    mockSearch = "?filter%5Bstatus%5D=pending";

    const { result } = renderHook(() => useWorkspaceFilter());

    act(() => {
      result.current.clearFilter();
    });

    expect(mockSetLocation).toHaveBeenCalledWith("/orders");
  });

  it("setFilter() can patch multiple facets at once", () => {
    const { result } = renderHook(() => useWorkspaceFilter());

    act(() => {
      result.current.setFilter({ status: "pending", owner: "evan" });
    });

    const nextUrl = mockSetLocation.mock.calls[0][0] as string;
    const nextParams = new URLSearchParams(nextUrl.split("?")[1]);
    expect(nextParams.get("filter[status]")).toBe("pending");
    expect(nextParams.get("filter[owner]")).toBe("evan");
  });

  it("setFilter() overwrites an existing facet value", () => {
    mockSearch = "?filter%5Bstatus%5D=pending";

    const { result } = renderHook(() => useWorkspaceFilter());

    act(() => {
      result.current.setFilter({ status: "shipped" });
    });

    const nextUrl = mockSetLocation.mock.calls[0][0] as string;
    const nextParams = new URLSearchParams(nextUrl.split("?")[1]);
    expect(nextParams.get("filter[status]")).toBe("shipped");
  });

  it("strips any stale query-string off of the wouter location before rebuilding", () => {
    mockPath = "/orders?stale=true";
    mockSearch = "?filter%5Bstatus%5D=pending";

    const { result } = renderHook(() => useWorkspaceFilter());

    act(() => {
      result.current.setFilter({ owner: "evan" });
    });

    const nextUrl = mockSetLocation.mock.calls[0][0] as string;
    // Path portion must not include the stale `?stale=true` — we rebuild
    // exclusively from the current `useSearch()` snapshot.
    expect(nextUrl.split("?")[0]).toBe("/orders");
    expect(nextUrl).not.toContain("stale=true");
  });
});
