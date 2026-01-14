/**
 * Date Formatting Utility
 * Sprint 5.C.5: UX-012 - Fix Period Display Formatting
 *
 * Provides consistent date formatting across the application.
 * Supports user preferences and timezone handling.
 */

import {
  format,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  formatDistanceToNow,
} from "date-fns";

// Date format options
export type DateFormatStyle = "short" | "medium" | "long" | "full";
export type DateFormatPreference = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

// Default format based on locale (US default)
const DEFAULT_FORMAT: DateFormatPreference = "MM/DD/YYYY";

// Format patterns for each preference
const FORMAT_PATTERNS: Record<
  DateFormatPreference,
  Record<DateFormatStyle, string>
> = {
  "MM/DD/YYYY": {
    short: "MM/dd",
    medium: "MM/dd/yyyy",
    long: "MMMM d, yyyy",
    full: "EEEE, MMMM d, yyyy",
  },
  "DD/MM/YYYY": {
    short: "dd/MM",
    medium: "dd/MM/yyyy",
    long: "d MMMM yyyy",
    full: "EEEE, d MMMM yyyy",
  },
  "YYYY-MM-DD": {
    short: "MM-dd",
    medium: "yyyy-MM-dd",
    long: "MMMM d, yyyy",
    full: "EEEE, MMMM d, yyyy",
  },
};

// Time format patterns
const TIME_PATTERNS = {
  short: "h:mm a",
  medium: "h:mm:ss a",
  long: "HH:mm:ss",
};

/**
 * Get user's date format preference from localStorage or default
 */
export function getDateFormatPreference(): DateFormatPreference {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("dateFormatPreference");
    if (saved && saved in FORMAT_PATTERNS) {
      return saved as DateFormatPreference;
    }
  }
  return DEFAULT_FORMAT;
}

/**
 * Set user's date format preference
 */
export function setDateFormatPreference(
  preference: DateFormatPreference
): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("dateFormatPreference", preference);
  }
}

/**
 * Parse a date value (string, Date, or null)
 */
function parseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;

  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }

  try {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Format a date with consistent styling
 */
export function formatDate(
  date: Date | string | null | undefined,
  style: DateFormatStyle = "medium",
  preference?: DateFormatPreference
): string {
  const parsed = parseDate(date);
  if (!parsed) return "N/A";

  const pref = preference || getDateFormatPreference();
  const pattern = FORMAT_PATTERNS[pref][style];

  try {
    return format(parsed, pattern);
  } catch {
    return "Invalid date";
  }
}

/**
 * Format a date with time
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  dateStyle: DateFormatStyle = "medium",
  timeStyle: "short" | "medium" | "long" = "short",
  preference?: DateFormatPreference
): string {
  const parsed = parseDate(date);
  if (!parsed) return "N/A";

  const pref = preference || getDateFormatPreference();
  const datePattern = FORMAT_PATTERNS[pref][dateStyle];
  const timePattern = TIME_PATTERNS[timeStyle];

  try {
    return format(parsed, `${datePattern} ${timePattern}`);
  } catch {
    return "Invalid date";
  }
}

/**
 * Format a date range (period)
 */
export function formatDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
  style: DateFormatStyle = "medium",
  preference?: DateFormatPreference
): string {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start && !end) return "N/A";
  if (start && !end) return `${formatDate(start, style, preference)} - Present`;
  if (!start && end) return `Until ${formatDate(end, style, preference)}`;

  // Check if same day
  if (start && end) {
    const startDay = startOfDay(start);
    const endDay = startOfDay(end);

    if (startDay.getTime() === endDay.getTime()) {
      return formatDate(start, style, preference);
    }
  }

  return `${formatDate(start, style, preference)} - ${formatDate(end, style, preference)}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string | null | undefined,
  addSuffix: boolean = true
): string {
  const parsed = parseDate(date);
  if (!parsed) return "N/A";

  try {
    return formatDistanceToNow(parsed, { addSuffix });
  } catch {
    return "Invalid date";
  }
}

/**
 * Format time only
 */
export function formatTime(
  date: Date | string | null | undefined,
  style: "short" | "medium" | "long" = "short"
): string {
  const parsed = parseDate(date);
  if (!parsed) return "N/A";

  try {
    return format(parsed, TIME_PATTERNS[style]);
  } catch {
    return "Invalid time";
  }
}

/**
 * Get start of day in user's timezone
 */
export function getStartOfDay(
  date: Date | string | null | undefined
): Date | null {
  const parsed = parseDate(date);
  if (!parsed) return null;
  return startOfDay(parsed);
}

/**
 * Get end of day in user's timezone
 */
export function getEndOfDay(
  date: Date | string | null | undefined
): Date | null {
  const parsed = parseDate(date);
  if (!parsed) return null;
  return endOfDay(parsed);
}

/**
 * Format for API (ISO 8601)
 */
export function formatForAPI(
  date: Date | string | null | undefined
): string | null {
  const parsed = parseDate(date);
  if (!parsed) return null;
  return parsed.toISOString();
}

/**
 * Check if date is valid
 */
export function isValidDate(date: Date | string | null | undefined): boolean {
  return parseDate(date) !== null;
}

/**
 * Format a quarter (e.g., "Q1 2024")
 */
export function formatQuarter(
  date: Date | string | null | undefined
): string {
  const parsed = parseDate(date);
  if (!parsed) return "N/A";

  const quarter = Math.floor(parsed.getMonth() / 3) + 1;
  const year = parsed.getFullYear();
  return `Q${quarter} ${year}`;
}

/**
 * Format a month and year (e.g., "January 2024")
 */
export function formatMonthYear(
  date: Date | string | null | undefined,
  style: "short" | "long" = "long"
): string {
  const parsed = parseDate(date);
  if (!parsed) return "N/A";

  try {
    const pattern = style === "short" ? "MMM yyyy" : "MMMM yyyy";
    return format(parsed, pattern);
  } catch {
    return "Invalid date";
  }
}

export default {
  formatDate,
  formatDateTime,
  formatDateRange,
  formatRelativeTime,
  formatTime,
  formatQuarter,
  formatMonthYear,
  getDateFormatPreference,
  setDateFormatPreference,
  getStartOfDay,
  getEndOfDay,
  formatForAPI,
  isValidDate,
};
