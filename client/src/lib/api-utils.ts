/**
 * API Response Utilities
 *
 * Type-safe utilities for extracting data from paginated API responses.
 * Handles both direct array responses and object-wrapped responses like
 * { invoices: [], total: 0 }
 *
 * @module api-utils
 */

/**
 * Type for paginated API responses that wrap arrays in an object
 * with a total count.
 */
export type PaginatedResponse<K extends string, T> = {
  [key in K]: T[];
} & { total: number };

/**
 * Extracts an array from a paginated API response.
 *
 * Handles multiple response formats:
 * - Direct arrays: Returns the array as-is
 * - Object responses: Extracts the array at the specified key
 * - Undefined/null: Returns empty array
 *
 * @template T - The type of items in the array
 * @param response - The API response (array, object with array property, or undefined)
 * @param key - The property name containing the array (e.g., 'invoices', 'bills')
 * @returns The extracted array, or empty array if extraction fails
 *
 * @example
 * // Object response
 * const invoices = extractArray(response, 'invoices');
 * // response = { invoices: [{id: 1}], total: 1 }
 * // returns [{id: 1}]
 *
 * @example
 * // Direct array response
 * const items = extractArray([{id: 1}], 'items');
 * // returns [{id: 1}]
 *
 * @example
 * // Undefined response
 * const items = extractArray(undefined, 'items');
 * // returns []
 */
export function extractArray<T>(
  response: T[] | Record<string, unknown> | undefined | null,
  key: string
): T[] {
  // Handle undefined/null inputs
  if (response === undefined || response === null) {
    return [];
  }

  // Handle direct array responses
  if (Array.isArray(response)) {
    return response;
  }

  // Handle object responses with array property
  if (typeof response === "object") {
    const items = response[key];
    if (Array.isArray(items)) {
      return items as T[];
    }
  }

  // Fallback to empty array
  return [];
}

/**
 * Type guard to check if a response is a paginated response object
 *
 * @template K - The key name for the array property
 * @template T - The type of items in the array
 * @param response - The response to check
 * @param key - The expected key for the array property
 * @returns True if response is a paginated object with the specified key
 */
export function isPaginatedResponse<K extends string, T>(
  response: unknown,
  key: K
): response is PaginatedResponse<K, T> {
  return (
    typeof response === "object" &&
    response !== null &&
    key in response &&
    Array.isArray((response as Record<string, unknown>)[key]) &&
    "total" in response &&
    typeof (response as Record<string, unknown>).total === "number"
  );
}

/**
 * Extracts the total count from a paginated response
 *
 * @param response - The API response
 * @returns The total count, or 0 if not available
 */
export function extractTotal(
  response: Record<string, unknown> | undefined | null
): number {
  if (!response || typeof response !== "object") {
    return 0;
  }

  const total = response.total;
  return typeof total === "number" ? total : 0;
}
