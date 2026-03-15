/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSpreadsheetPilotAvailability } from "./pilotAvailability";

const mockRefetch = vi.fn();
let mockFlags: Record<string, boolean> = {};
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlags: () => ({
    flags: mockFlags,
    isLoading: mockIsLoading,
    error: mockError,
    refetch: mockRefetch,
  }),
}));

describe("useSpreadsheetPilotAvailability", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFlags = {};
    mockIsLoading = false;
    mockError = null;
    mockRefetch.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns classic availability immediately on non-pilot tabs", () => {
    const { result } = renderHook(() => useSpreadsheetPilotAvailability(false));

    expect(result.current).toEqual({
      availabilityReady: true,
      sheetPilotEnabled: false,
    });
    vi.advanceTimersByTime(30_000);
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it("polls for flag updates while the pilot is enabled on a pilot tab", () => {
    mockFlags = {
      "spreadsheet-native-pilot": true,
    };

    const { result } = renderHook(() => useSpreadsheetPilotAvailability(true));

    expect(result.current).toEqual({
      availabilityReady: true,
      sheetPilotEnabled: true,
    });

    vi.advanceTimersByTime(15_000);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(15_000);
    expect(mockRefetch).toHaveBeenCalledTimes(2);
  });

  it("does not start polling while feature availability is still loading", () => {
    mockIsLoading = true;

    const { result } = renderHook(() => useSpreadsheetPilotAvailability(true));

    expect(result.current).toEqual({
      availabilityReady: false,
      sheetPilotEnabled: false,
    });

    vi.advanceTimersByTime(30_000);
    expect(mockRefetch).not.toHaveBeenCalled();
  });
});
