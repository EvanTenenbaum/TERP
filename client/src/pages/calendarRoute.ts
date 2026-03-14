export interface CalendarRouteContext {
  eventId: number | null;
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
