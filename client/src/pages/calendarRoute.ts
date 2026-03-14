export interface CalendarRouteContext {
  eventId: number | null;
}

export interface CalendarDialogRouteState {
  selectedEventId: number | null;
  isEventDialogOpen: boolean;
}

export function parseCalendarRouteContext(
  search: string
): CalendarRouteContext {
  const params = new URLSearchParams(search);
  const rawEventId = params.get("eventId");
  const eventId = rawEventId ? Number(rawEventId) : Number.NaN;

  return {
    eventId:
      Number.isInteger(eventId) && eventId > 0 ? eventId : null,
  };
}

export function deriveCalendarDialogRouteState(
  eventId: number | null
): CalendarDialogRouteState {
  return {
    selectedEventId: eventId,
    isEventDialogOpen: eventId !== null,
  };
}
