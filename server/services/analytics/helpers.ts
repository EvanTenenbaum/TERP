/**
 * Analytics Service Helpers
 * Utility functions for analytics operations
 */

import type { DateRange } from "./types";

/**
 * Get date range based on period
 */
export function getDateRange(period: string): DateRange {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "day":
      startDate.setDate(startDate.getDate() - 1);
      break;
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "quarter":
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case "year":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case "all":
    default:
      startDate.setFullYear(2000); // Far in the past
      break;
  }

  return { startDate, endDate };
}

/**
 * Format data as CSV
 */
export function formatAsCSV(
  data: Record<string, unknown>[],
  headers: string[]
): string {
  const headerRow = headers.join(",");
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const value = row[h];
        if (value === null || value === undefined) return "";
        if (typeof value === "string" && value.includes(",")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(",")
  );
  return [headerRow, ...rows].join("\n");
}
