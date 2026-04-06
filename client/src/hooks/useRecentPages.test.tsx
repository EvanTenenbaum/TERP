/**
 * @vitest-environment jsdom
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecentPages } from "./useRecentPages";

const mockUseLocation = vi.fn();
const mockUseSearch = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => mockUseLocation(),
  useSearch: () => mockUseSearch(),
}));

describe("useRecentPages", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseLocation.mockReset();
    mockUseSearch.mockReset();
  });

  it("tracks sales catalogues as a distinct recent page entry", () => {
    mockUseLocation.mockReturnValue(["/sales", vi.fn()]);
    mockUseSearch.mockReturnValue("?tab=sales-sheets");

    const { result } = renderHook(() => useRecentPages());

    expect(result.current.recentPages[0]).toMatchObject({
      path: "/sales?tab=sales-sheets",
      label: "Sales Catalogues",
    });
  });

  it("tracks live shopping separately from the generic sales workspace", () => {
    mockUseLocation.mockReturnValue(["/sales", vi.fn()]);
    mockUseSearch.mockReturnValue("?tab=live-shopping");

    const { result } = renderHook(() => useRecentPages());

    expect(result.current.recentPages[0]).toMatchObject({
      path: "/sales?tab=live-shopping",
      label: "Live Shopping",
    });
  });

  it("tracks product intake with the locked TERP terminology", () => {
    mockUseLocation.mockReturnValue(["/inventory", vi.fn()]);
    mockUseSearch.mockReturnValue("?tab=receiving");

    const { result } = renderHook(() => useRecentPages());

    expect(result.current.recentPages[0]).toMatchObject({
      path: "/inventory?tab=receiving",
      label: "Product Intake",
    });
  });
});
