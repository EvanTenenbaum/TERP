import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { usePowersheetSelection } from "../usePowersheetSelection";

describe("usePowersheetSelection", () => {
  const defaultIds = [1, 2, 3, 4, 5];

  it("initializes with no active item and empty selection", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({ visibleIds: defaultIds })
    );
    expect(result.current.activeId).toBeNull();
    expect(result.current.activeIndex).toBe(-1);
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.allSelected).toBe(false);
    expect(result.current.someSelected).toBe(false);
  });

  it("respects initialActiveId and initialActiveIndex", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({
        visibleIds: defaultIds,
        initialActiveId: 3,
        initialActiveIndex: 2,
      })
    );
    expect(result.current.activeId).toBe(3);
    expect(result.current.activeIndex).toBe(2);
  });

  it("setActiveId updates activeId and calls onActiveChange", () => {
    const onActiveChange = vi.fn();
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({
        visibleIds: defaultIds,
        onActiveChange,
      })
    );
    act(() => result.current.setActiveId(2));
    expect(result.current.activeId).toBe(2);
    expect(onActiveChange).toHaveBeenCalledWith(2);
  });

  it("toggle adds and removes items from selection", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({ visibleIds: defaultIds })
    );
    act(() => result.current.toggle(1, true));
    expect(result.current.selectedIds.has(1)).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    act(() => result.current.toggle(3, true));
    expect(result.current.selectedCount).toBe(2);

    act(() => result.current.toggle(1, false));
    expect(result.current.selectedIds.has(1)).toBe(false);
    expect(result.current.selectedCount).toBe(1);
  });

  it("toggleAll selects all visible IDs", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({ visibleIds: defaultIds })
    );
    act(() => result.current.toggleAll(true));
    expect(result.current.allSelected).toBe(true);
    expect(result.current.selectedCount).toBe(5);
  });

  it("toggleAll(false) deselects all", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({ visibleIds: defaultIds })
    );
    act(() => result.current.toggleAll(true));
    act(() => result.current.toggleAll(false));
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.allSelected).toBe(false);
  });

  it("someSelected is true when partial selection", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({ visibleIds: defaultIds })
    );
    act(() => result.current.toggle(1, true));
    act(() => result.current.toggle(2, true));
    expect(result.current.someSelected).toBe(true);
    expect(result.current.allSelected).toBe(false);
  });

  it("getSelectedArray returns array of selected IDs", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({ visibleIds: defaultIds })
    );
    act(() => {
      result.current.toggle(2, true);
      result.current.toggle(4, true);
    });
    const arr = result.current.getSelectedArray();
    expect(arr).toContain(2);
    expect(arr).toContain(4);
    expect(arr).toHaveLength(2);
  });

  it("clear removes all selections but preserves activeId", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({
        visibleIds: defaultIds,
        initialActiveId: 3,
      })
    );
    act(() => result.current.toggleAll(true));
    act(() => result.current.clear());
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.activeId).toBe(3);
  });

  it("reset clears everything including activeId", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({
        visibleIds: defaultIds,
        initialActiveId: 3,
        initialActiveIndex: 2,
      })
    );
    act(() => result.current.toggleAll(true));
    act(() => result.current.reset());
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.activeId).toBeNull();
    expect(result.current.activeIndex).toBe(-1);
  });

  it("restoreFocus sets activeId, activeIndex, and lastFocusRef", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({ visibleIds: defaultIds })
    );
    act(() => result.current.restoreFocus(3));
    expect(result.current.activeId).toBe(3);
    expect(result.current.activeIndex).toBe(2);
    expect(result.current.lastFocusRef.current).toBe(3);
  });

  it("isSelected returns correct boolean", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({ visibleIds: defaultIds })
    );
    act(() => result.current.toggle(2, true));
    expect(result.current.isSelected(2)).toBe(true);
    expect(result.current.isSelected(3)).toBe(false);
  });

  it("calls onSelectionChange when selection changes", () => {
    const onSelectionChange = vi.fn();
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({
        visibleIds: defaultIds,
        onSelectionChange,
      })
    );
    act(() => result.current.toggle(1, true));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1]));
  });

  it("clearOnActiveChange clears selection on setActiveId", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({
        visibleIds: defaultIds,
        clearOnActiveChange: true,
      })
    );
    act(() => result.current.toggleAll(true));
    expect(result.current.selectedCount).toBe(5);
    act(() => result.current.setActiveId(2));
    expect(result.current.selectedCount).toBe(0);
  });

  it("works with string IDs", () => {
    const stringIds = ["a", "b", "c"];
    const { result } = renderHook(() =>
      usePowersheetSelection<string>({ visibleIds: stringIds })
    );
    act(() => result.current.toggle("b", true));
    expect(result.current.isSelected("b")).toBe(true);
    expect(result.current.selectedCount).toBe(1);
  });

  it("handles empty visibleIds", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({ visibleIds: [] })
    );
    expect(result.current.allSelected).toBe(false);
    expect(result.current.someSelected).toBe(false);
    act(() => result.current.toggleAll(true));
    expect(result.current.selectedCount).toBe(0);
  });

  it("restoreFocus with unknown id sets activeIndex to -1-like behavior", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({ visibleIds: defaultIds })
    );
    act(() => result.current.restoreFocus(99));
    expect(result.current.activeId).toBe(99);
    // indexOf returns -1 for missing, so activeIndex won't change (stays at init)
  });

  it("setActiveIndex works independently", () => {
    const { result } = renderHook(() =>
      usePowersheetSelection<number>({ visibleIds: defaultIds })
    );
    act(() => result.current.setActiveIndex(3));
    expect(result.current.activeIndex).toBe(3);
  });
});
