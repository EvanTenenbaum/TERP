import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatCalendarDate,
  isCalendarDateToday,
  normalizeCalendarDate,
} from "./calendarDates";

describe("calendarDates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("preserves date-only strings", () => {
    expect(normalizeCalendarDate("2026-04-08")).toBe("2026-04-08");
  });

  it("normalizes ISO timestamps to UTC date keys", () => {
    expect(normalizeCalendarDate("2026-04-08T23:30:00.000Z")).toBe(
      "2026-04-08"
    );
  });

  it("returns null for invalid dates", () => {
    expect(normalizeCalendarDate("not-a-date")).toBeNull();
  });

  it("formats calendar dates without shifting the day", () => {
    expect(formatCalendarDate("2026-04-08")).not.toBe("-");
  });

  it("treats UTC timestamps on the same UTC calendar day as today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T23:30:00.000Z"));

    expect(isCalendarDateToday("2026-04-08T02:00:00.000Z")).toBe(true);
  });
});
