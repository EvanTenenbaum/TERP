const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function toUtcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`;
}

export function normalizeCalendarDate(
  value: Date | string | null | undefined
): string | null {
  if (!value) return null;
  if (typeof value === "string" && DATE_ONLY_PATTERN.test(value)) {
    return value;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toUtcDateKey(parsed);
}

export function getTodayCalendarDate(): string {
  return toUtcDateKey(new Date());
}

export function formatCalendarDate(
  value: Date | string | null | undefined
): string {
  const normalized = normalizeCalendarDate(value);
  if (!normalized) return "-";

  const parsed = new Date(`${normalized}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

export function isCalendarDateToday(
  value: Date | string | null | undefined
): boolean {
  const normalized = normalizeCalendarDate(value);
  return normalized !== null && normalized === getTodayCalendarDate();
}

export function isCalendarDatePast(
  value: Date | string | null | undefined
): boolean {
  const normalized = normalizeCalendarDate(value);
  return normalized !== null && normalized < getTodayCalendarDate();
}
