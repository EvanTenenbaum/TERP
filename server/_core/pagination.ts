/**
 * Pagination Utilities
 * PERF-003: Add Pagination to All List Endpoints
 * 
 * Provides reusable pagination schemas and helper functions for tRPC routers.
 * 
 * Usage:
 * - Import paginationInputSchema for input validation
 * - Use createPaginatedResponse to format paginated results
 * - Use cursorPaginationInputSchema for cursor-based pagination
 */

import { z } from 'zod';

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

/** Default number of items per page */
export const DEFAULT_PAGE_SIZE = 50;

/** Maximum allowed items per page */
export const MAX_PAGE_SIZE = 500;

/** Minimum allowed items per page */
export const MIN_PAGE_SIZE = 1;

// ============================================================================
// OFFSET-BASED PAGINATION
// ============================================================================

/**
 * Standard pagination input schema for offset-based pagination
 * Use this for most list endpoints
 */
export const paginationInputSchema = z.object({
  /** Number of items to return (default: 50, max: 500) */
  limit: z.number().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  /** Number of items to skip (default: 0) */
  offset: z.number().min(0).default(0),
});

/** Type for pagination input */
export type PaginationInput = z.infer<typeof paginationInputSchema>;

/**
 * Pagination metadata returned with paginated results
 */
export interface PaginationMeta {
  /** Total number of items across all pages */
  total: number;
  /** Number of items per page */
  limit: number;
  /** Number of items skipped */
  offset: number;
  /** Whether there are more items after this page */
  hasMore: boolean;
  /** Total number of pages */
  totalPages: number;
  /** Current page number (1-indexed) */
  currentPage: number;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  items: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

/**
 * Creates a paginated response with metadata
 * 
 * @param items - Array of items for the current page
 * @param total - Total count of all items (across all pages)
 * @param limit - Number of items per page
 * @param offset - Number of items skipped
 * @returns Paginated response with items and metadata
 * 
 * @example
 * ```typescript
 * const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(table);
 * const items = await db.select().from(table).limit(limit).offset(offset);
 * return createPaginatedResponse(items, count, limit, offset);
 * ```
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const hasMore = offset + items.length < total;

  return {
    items,
    pagination: {
      total,
      limit,
      offset,
      hasMore,
      totalPages,
      currentPage,
    },
  };
}

// ============================================================================
// CURSOR-BASED PAGINATION
// ============================================================================

/**
 * Cursor-based pagination input schema
 * Use this for very large datasets or infinite scroll UIs
 */
export const cursorPaginationInputSchema = z.object({
  /** Number of items to return (default: 50, max: 500) */
  limit: z.number().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  /** Cursor pointing to the last item of the previous page */
  cursor: z.string().optional(),
});

/** Type for cursor pagination input */
export type CursorPaginationInput = z.infer<typeof cursorPaginationInputSchema>;

/**
 * Cursor-based paginated response structure
 */
export interface CursorPaginatedResponse<T> {
  /** Array of items for the current page */
  items: T[];
  /** Cursor for the next page (null if no more items) */
  nextCursor: string | null;
  /** Whether there are more items after this page */
  hasMore: boolean;
}

/**
 * Creates a cursor-based paginated response
 * 
 * @param items - Array of items for the current page
 * @param nextCursor - Cursor for the next page (null if no more items)
 * @returns Cursor-based paginated response
 * 
 * @example
 * ```typescript
 * const items = await db.select().from(table)
 *   .where(cursor ? gt(table.id, parseInt(cursor)) : undefined)
 *   .limit(limit + 1)
 *   .orderBy(asc(table.id));
 * 
 * const hasMore = items.length > limit;
 * const pageItems = hasMore ? items.slice(0, limit) : items;
 * const nextCursor = hasMore ? pageItems[pageItems.length - 1].id.toString() : null;
 * 
 * return createCursorPaginatedResponse(pageItems, nextCursor);
 * ```
 */
export function createCursorPaginatedResponse<T>(
  items: T[],
  nextCursor: string | null
): CursorPaginatedResponse<T> {
  return {
    items,
    nextCursor,
    hasMore: nextCursor !== null,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extracts pagination parameters with defaults
 * Useful when pagination input is optional
 * 
 * @param input - Optional pagination input
 * @returns Pagination parameters with defaults applied
 */
export function getPaginationParams(input?: Partial<PaginationInput>): PaginationInput {
  return {
    limit: input?.limit ?? DEFAULT_PAGE_SIZE,
    offset: input?.offset ?? 0,
  };
}

/**
 * Calculates the page number from offset and limit
 * 
 * @param offset - Number of items skipped
 * @param limit - Number of items per page
 * @returns Page number (1-indexed)
 */
export function getPageNumber(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1;
}

/**
 * Calculates the offset from page number and limit
 * 
 * @param page - Page number (1-indexed)
 * @param limit - Number of items per page
 * @returns Offset value
 */
export function getOffsetFromPage(page: number, limit: number): number {
  return (page - 1) * limit;
}
