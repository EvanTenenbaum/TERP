import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  NAV_OPEN_GROUPS_CHANGE_EVENT,
  NAV_OPEN_GROUPS_STORAGE_KEY,
  getNavOpenGroups,
  setNavOpenGroups,
} from "@/lib/navState";

describe("navState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty array when nothing is persisted", () => {
    expect(getNavOpenGroups()).toEqual([]);
  });

  it("round-trips open group keys through localStorage", () => {
    setNavOpenGroups(["sales", "operations"]);

    expect(localStorage.getItem(NAV_OPEN_GROUPS_STORAGE_KEY)).toBe(
      JSON.stringify(["sales", "operations"])
    );
    expect(getNavOpenGroups()).toEqual(["sales", "operations"]);
  });

  it("returns an empty array when the stored value is not valid JSON", () => {
    localStorage.setItem(NAV_OPEN_GROUPS_STORAGE_KEY, "not-json");

    expect(getNavOpenGroups()).toEqual([]);
  });

  it("returns an empty array when the stored value is not an array", () => {
    localStorage.setItem(
      NAV_OPEN_GROUPS_STORAGE_KEY,
      JSON.stringify({ sales: true })
    );

    expect(getNavOpenGroups()).toEqual([]);
  });

  it("filters non-string entries from the persisted array", () => {
    localStorage.setItem(
      NAV_OPEN_GROUPS_STORAGE_KEY,
      JSON.stringify(["sales", 42, null, "finance"])
    );

    expect(getNavOpenGroups()).toEqual(["sales", "finance"]);
  });

  it("dispatches a change event on write", () => {
    const listener = vi.fn();
    window.addEventListener(NAV_OPEN_GROUPS_CHANGE_EVENT, listener);

    setNavOpenGroups(["relationships"]);

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as Event & { detail: string[] };
    expect(event.detail).toEqual(["relationships"]);

    window.removeEventListener(NAV_OPEN_GROUPS_CHANGE_EVENT, listener);
  });
});
