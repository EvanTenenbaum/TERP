import { describe, expect, it } from "vitest";

import {
  deriveCalendarDialogRouteState,
  parseCalendarRouteContext,
} from "./calendarRoute";

describe("parseCalendarRouteContext", () => {
  it("returns an event id when the deep link is valid", () => {
    expect(parseCalendarRouteContext("?eventId=42")).toEqual({
      eventId: 42,
    });
  });

  it("drops invalid event ids", () => {
    expect(parseCalendarRouteContext("?eventId=abc")).toEqual({
      eventId: null,
    });
    expect(parseCalendarRouteContext("?eventId=0")).toEqual({
      eventId: null,
    });
  });

  it("derives dialog state from the route id", () => {
    expect(deriveCalendarDialogRouteState(42)).toEqual({
      selectedEventId: 42,
      isEventDialogOpen: true,
    });
    expect(deriveCalendarDialogRouteState(null)).toEqual({
      selectedEventId: null,
      isEventDialogOpen: false,
    });
  });
});
