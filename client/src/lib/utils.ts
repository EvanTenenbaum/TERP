import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number or string as currency (USD)
 */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "$0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * UX-012: Date formatting utilities
 *
 * These functions are re-exported from @/lib/dateFormat for backward compatibility.
 * For new code, prefer importing directly from @/lib/dateFormat for access to additional
 * features like user preferences and style options.
 */
import {
  formatDate as _formatDate,
  formatDateTime as _formatDateTime,
  formatDateRange as _formatDateRange,
  formatRelativeTime as _formatRelativeTime,
} from "@/lib/dateFormat";

/**
 * Format a date value for display
 * @deprecated Use formatDate from @/lib/dateFormat for more options
 */
export function formatDate(
  value: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  // Maintain backward compatibility with Intl options
  if (options) {
    if (!value) return "-";
    const date = typeof value === "string" ? new Date(value) : value;
    if (date instanceof Date && isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }

  // Use centralized formatter with medium style
  const result = _formatDate(value, "medium");
  return result === "N/A" ? "-" : result;
}

/**
 * Format a date with time
 * @deprecated Use formatDateTime from @/lib/dateFormat for more options
 */
export function formatDateTime(value: Date | string | null | undefined): string {
  const result = _formatDateTime(value, "medium", "short");
  return result === "N/A" ? "-" : result;
}

/**
 * Format a date range (e.g., "Jan 1 - Jan 15, 2024")
 * @deprecated Use formatDateRange from @/lib/dateFormat for more options
 */
export function formatDateRange(
  startValue: Date | string | null | undefined,
  endValue: Date | string | null | undefined
): string {
  const result = _formatDateRange(startValue, endValue, "medium");
  return result === "N/A" ? "-" : result;
}

/**
 * Format a date in short format (e.g., "Jan 15" or "Jan 15, 2024")
 */
export function formatShortDate(
  value: Date | string | null | undefined,
  includeYear = false
): string {
  const style = includeYear ? "medium" : "short";
  const result = _formatDate(value, style);
  return result === "N/A" ? "-" : result;
}

/**
 * Format a relative date (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeDate(
  value: Date | string | null | undefined,
  thresholdDays = 7
): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (date instanceof Date && isNaN(date.getTime())) return "-";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  // If beyond threshold, use standard date format
  if (diffDays > thresholdDays) {
    return formatDate(date);
  }

  // Use centralized relative time formatter
  const result = _formatRelativeTime(value);
  return result === "N/A" ? "-" : result;
}
