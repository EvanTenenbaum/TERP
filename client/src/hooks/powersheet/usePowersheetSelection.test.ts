/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePowersheetSelection } from "./usePowersheetSelection";

describe("usePowersheetSelection", () => {
  it("toggles a row selection", () => {
    const { result } = renderHook(() => usePowersheetSelection<string>());

    act(() => {
      result.current.toggleRow("row-1");
    });

    expect(result.current.isSelected("row-1")).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    act(() => {
      result.current.toggleRow("row-1");
    });

    expect(result.current.isSelected("row-1")).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it("sets explicit selection and deduplicates ids", () => {
    const { result } = renderHook(() => usePowersheetSelection<string>());

    act(() => {
      result.current.setSelection(["row-1", "row-2", "row-1"]);
    });

    expect(result.current.selectedRowIds).toEqual(["row-1", "row-2"]);
    expect(result.current.selectedCount).toBe(2);
  });

  it("toggleAll selects and clears all rows", () => {
    const { result } = renderHook(() => usePowersheetSelection<string>());

    act(() => {
      result.current.toggleAll(["row-1", "row-2"]);
    });
    expect(result.current.selectedRowIds).toEqual(["row-1", "row-2"]);

    act(() => {
      result.current.toggleAll(["row-1", "row-2"]);
    });
    expect(result.current.selectedRowIds).toEqual([]);
  });

  it("reconciles selection after row deletion by retaining only valid row ids", () => {
    const { result } = renderHook(() => usePowersheetSelection<string>());

    act(() => {
      result.current.setSelection(["row-1", "row-2", "row-3"]);
    });
    expect(result.current.selectedRowIds).toEqual(["row-1", "row-2", "row-3"]);

    const remainingRows = ["row-2"];
    act(() => {
      const reconciled = result.current.selectedRowIds.filter(id =>
        remainingRows.includes(id)
      );
      result.current.setSelection(reconciled);
    });

    expect(result.current.selectedRowIds).toEqual(["row-2"]);
    expect(result.current.selectedCount).toBe(1);
  });
});
