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

  it("labels draft order routes as records instead of the generic composer", () => {
    mockUseLocation.mockReturnValue(["/sales", vi.fn()]);
    mockUseSearch.mockReturnValue("?tab=create-order&draftId=55");

    const { result } = renderHook(() => useRecentPages());

    expect(result.current.recentPages[0]).toMatchObject({
      path: "/sales?tab=create-order&draftId=55",
      label: "Draft Order #55",
    });
  });

  it("labels invoice deep links as record-level recent items", () => {
    mockUseLocation.mockReturnValue(["/accounting", vi.fn()]);
    mockUseSearch.mockReturnValue("?tab=invoices&id=91");

    const { result } = renderHook(() => useRecentPages());

    expect(result.current.recentPages[0]).toMatchObject({
      path: "/accounting?tab=invoices&id=91",
      label: "Invoice #91",
    });
  });
});
