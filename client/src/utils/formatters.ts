/**
 * REL-002: Safe Number Formatting Utilities
 *
 * Provides safe formatting for numbers that may be null, undefined, or NaN.
 * Prevents crashes from calling .toFixed() on invalid values.
 *
 * Usage:
 *   formatDecimal(null)      → "—"
 *   formatDecimal(42.567)    → "42.57"
 *   formatDecimal(0)         → "0.00"
 *   formatCurrency(null)     → "—"
 *   formatCurrency(42.5)     → "$42.50"
 */

/**
 * Safely formats a number to fixed decimal places.
 * Returns fallback string for null, undefined, NaN, or Infinity.
 *
 * @param value - The value to format (number, string, null, undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @param fallback - String to return for invalid values (default: "—")
 * @returns Formatted string or fallback
 */
export function formatDecimal(
  value: number | string | null | undefined,
  decimals: number = 2,
  fallback: string = "—"
): string {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return fallback;
  }

  // Convert string to number if needed
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // Handle NaN or Infinity
  if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
    return fallback;
  }

  return numValue.toFixed(decimals);
}

/**
 * Safely formats a currency value with $ prefix.
 * Returns fallback string for null, undefined, NaN, or Infinity.
 *
 * @param value - The value to format
 * @param fallback - String to return for invalid values (default: "—")
 * @returns Formatted currency string or fallback
 */
export function formatCurrency(
  value: number | string | null | undefined,
  fallback: string = "—"
): string {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return fallback;
  }

  // Convert string to number if needed
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // Handle NaN or Infinity
  if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
    return fallback;
  }

  return `$${numValue.toFixed(2)}`;
}

/**
 * Safely formats a percentage value.
 * Returns fallback string for null, undefined, NaN, or Infinity.
 *
 * @param value - The value to format (0.15 = 15%)
 * @param decimals - Number of decimal places (default: 1)
 * @param fallback - String to return for invalid values (default: "—")
 * @returns Formatted percentage string or fallback
 */
export function formatPercent(
  value: number | string | null | undefined,
  decimals: number = 1,
  fallback: string = "—"
): string {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return fallback;
  }

  // Convert string to number if needed
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // Handle NaN or Infinity
  if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
    return fallback;
  }

  return `${(numValue * 100).toFixed(decimals)}%`;
}

/**
 * Safely formats an integer (no decimal places).
 * Returns fallback string for null, undefined, NaN, or Infinity.
 *
 * @param value - The value to format
 * @param fallback - String to return for invalid values (default: "—")
 * @returns Formatted integer string or fallback
 */
export function formatInteger(
  value: number | string | null | undefined,
  fallback: string = "—"
): string {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return fallback;
  }

  // Convert string to number if needed
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // Handle NaN or Infinity
  if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
    return fallback;
  }

  return Math.round(numValue).toString();
}
