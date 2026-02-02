/**
 * REL-001: Standardized Money Parsing Utilities
 *
 * Provides consistent handling of null, undefined, and string money values
 * across the codebase. These utilities replace unsafe parseFloat calls.
 */

/**
 * Parse a money value, returning null for invalid/missing values
 * Use when null represents "not set" vs zero
 *
 * @param value - The value to parse (string, number, null, undefined)
 * @returns Parsed number or null
 */
export function parseMoneyOrNull(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
    return null;
  }

  return numValue;
}

/**
 * Parse a money value, returning 0 for invalid/missing values
 * Use for calculations where missing = zero
 *
 * @param value - The value to parse (string, number, null, undefined)
 * @returns Parsed number or 0
 */
export function parseMoneyOrZero(
  value: string | number | null | undefined
): number {
  const result = parseMoneyOrNull(value);
  return result === null ? 0 : result;
}

/**
 * Format a money value for display
 * Returns "—" for null/undefined, "$0.00" for explicit zero
 *
 * @param value - The value to format
 * @param fallback - String to return for null/undefined (default: "—")
 * @returns Formatted currency string
 */
export function formatMoney(
  value: number | string | null | undefined,
  fallback: string = "—"
): string {
  const parsed = parseMoneyOrNull(value);

  if (parsed === null) {
    return fallback;
  }

  return `$${parsed.toFixed(2)}`;
}

/**
 * Format a decimal value for display
 * Returns "—" for null/undefined
 *
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 * @param fallback - String to return for null/undefined (default: "—")
 * @returns Formatted decimal string
 */
export function formatDecimal(
  value: number | string | null | undefined,
  decimals: number = 2,
  fallback: string = "—"
): string {
  const parsed = parseMoneyOrNull(value);

  if (parsed === null) {
    return fallback;
  }

  return parsed.toFixed(decimals);
}
