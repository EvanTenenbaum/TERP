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
 * Format a date value for display
 */
export function formatDate(
  value: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
}

/**
 * Format a date with time
 */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * UX-012: Additional date formatting utilities for consistent display
 */

/**
 * Format a date in short format (e.g., "Jan 15" or "Jan 15, 2024")
 */
export function formatShortDate(
  value: Date | string | null | undefined,
  includeYear = false
): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear && { year: "numeric" }),
  }).format(date);
}

/**
 * Format a date range (e.g., "Jan 1 - Jan 15, 2024")
 */
export function formatDateRange(
  startValue: Date | string | null | undefined,
  endValue: Date | string | null | undefined
): string {
  if (!startValue || !endValue) return "-";
  const startDate = typeof startValue === "string" ? new Date(startValue) : startValue;
  const endDate = typeof endValue === "string" ? new Date(endValue) : endValue;
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "-";

  const startFormatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(startDate);

  const endFormatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(endDate);

  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Format a relative date (e.g., "2 days ago", "in 3 hours")
 * Falls back to formatDate for dates beyond the threshold
 */
export function formatRelativeDate(
  value: Date | string | null | undefined,
  thresholdDays = 7
): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "-";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  // If beyond threshold, use standard date format
  if (diffDays > thresholdDays) {
    return formatDate(date);
  }

  // Use relative time formatter if supported
  try {
    const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, "minute");
    } else if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, "hour");
    } else {
      return rtf.format(Math.floor(diffMs / (1000 * 60 * 60 * 24)), "day");
    }
  } catch {
    return formatDate(date);
  }
}
