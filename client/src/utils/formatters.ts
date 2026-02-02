/**
 * Utility functions for formatting numbers and values
 */

/**
 * Format a decimal number with 2 decimal places
 * @param value - The number to format
 * @returns Formatted string with 2 decimal places
 */
export function formatDecimal(value: number): string {
  return value.toFixed(2);
}
