/**
 * Shared Pagination Utilities
 * FE-QA-002: Align Frontend/Backend Pagination Parameters
 *
 * Provides conversion utilities between page/pageSize (frontend-friendly)
 * and limit/offset (backend-friendly) pagination parameters.
 *
 * This utility ensures consistent pagination across the entire application
 * while allowing both frontend and backend to use their preferred formats.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Frontend-friendly pagination parameters (1-indexed)
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
}

/**
 * Backend-friendly pagination parameters (0-indexed offset)
 */
export interface OffsetParams {
  /** Number of items to skip */
  offset: number;
  /** Number of items to return */
  limit: number;
}

/**
 * Combined pagination parameters with both formats
 */
export interface NormalizedPagination {
  /** Page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Number of items to skip */
  offset: number;
  /** Number of items to return */
  limit: number;
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Converts page/pageSize to offset/limit
 *
 * @param params - Page-based pagination parameters
 * @returns Offset-based pagination parameters
 *
 * @example
 * ```typescript
 * const offsetParams = toOffset({ page: 3, pageSize: 20 });
 * // Result: { offset: 40, limit: 20 }
 * ```
 */
export function toOffset(params: PaginationParams): OffsetParams {
  return {
    offset: (params.page - 1) * params.pageSize,
    limit: params.pageSize,
  };
}

/**
 * Converts offset/limit to page/pageSize
 *
 * @param params - Offset-based pagination parameters
 * @returns Page-based pagination parameters
 *
 * @example
 * ```typescript
 * const pageParams = toPage({ offset: 40, limit: 20 });
 * // Result: { page: 3, pageSize: 20 }
 * ```
 */
export function toPage(params: OffsetParams): PaginationParams {
  return {
    page: Math.floor(params.offset / params.limit) + 1,
    pageSize: params.limit,
  };
}

/**
 * Normalizes pagination input to include both page/pageSize and offset/limit
 *
 * Handles multiple input formats:
 * - { page, pageSize } -> calculates offset/limit
 * - { offset, limit } -> calculates page/pageSize
 * - Partial inputs -> applies defaults
 * - No input -> returns default pagination (page 1, pageSize 20)
 *
 * @param input - Pagination input in any format
 * @returns Normalized pagination with all four parameters
 *
 * @example
 * ```typescript
 * // From page/pageSize
 * normalizePagination({ page: 3, pageSize: 20 });
 * // Result: { page: 3, pageSize: 20, offset: 40, limit: 20 }
 *
 * // From offset/limit
 * normalizePagination({ offset: 40, limit: 20 });
 * // Result: { page: 3, pageSize: 20, offset: 40, limit: 20 }
 *
 * // With defaults
 * normalizePagination({});
 * // Result: { page: 1, pageSize: 20, offset: 0, limit: 20 }
 * ```
 */
export function normalizePagination(input: any = {}): NormalizedPagination {
  // If both page and pageSize are provided, prefer them
  if ('page' in input && 'pageSize' in input && typeof input.page === 'number' && typeof input.pageSize === 'number') {
    const page = Math.max(1, input.page); // Ensure minimum page is 1
    const pageSize = Math.max(1, input.pageSize); // Ensure minimum pageSize is 1
    const offset = (page - 1) * pageSize;
    return { page, pageSize, offset, limit: pageSize };
  }

  // If both offset and limit are provided, use them
  if ('offset' in input && 'limit' in input && typeof input.offset === 'number' && typeof input.limit === 'number') {
    const offset = Math.max(0, input.offset); // Ensure offset is non-negative
    const limit = Math.max(1, input.limit); // Ensure minimum limit is 1
    const page = Math.floor(offset / limit) + 1;
    return { page, pageSize: limit, offset, limit };
  }

  // Default pagination
  return { page: 1, pageSize: 20, offset: 0, limit: 20 };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates pagination parameters and returns normalized values
 *
 * @param input - Pagination input to validate
 * @param options - Validation options
 * @returns Validated and normalized pagination
 *
 * @example
 * ```typescript
 * const validated = validatePagination(
 *   { page: 0, pageSize: 1000 },
 *   { minPageSize: 1, maxPageSize: 100 }
 * );
 * // Result: { page: 1, pageSize: 100, offset: 0, limit: 100 }
 * ```
 */
export function validatePagination(
  input: any = {},
  options: {
    minPageSize?: number;
    maxPageSize?: number;
    defaultPageSize?: number;
  } = {}
): NormalizedPagination {
  const {
    minPageSize = 1,
    maxPageSize = 500,
    defaultPageSize = 20,
  } = options;

  const normalized = normalizePagination(input);

  // Clamp pageSize to valid range
  let pageSize = normalized.pageSize;
  if (pageSize < minPageSize) pageSize = minPageSize;
  if (pageSize > maxPageSize) pageSize = maxPageSize;

  // Recalculate if pageSize was clamped
  if (pageSize !== normalized.pageSize) {
    return {
      page: normalized.page,
      pageSize,
      offset: (normalized.page - 1) * pageSize,
      limit: pageSize,
    };
  }

  return normalized;
}

/**
 * Type guard to check if input has page/pageSize format
 */
export function isPageBased(input: any): input is PaginationParams {
  return (
    typeof input === 'object' &&
    input !== null &&
    'page' in input &&
    'pageSize' in input &&
    typeof input.page === 'number' &&
    typeof input.pageSize === 'number'
  );
}

/**
 * Type guard to check if input has offset/limit format
 */
export function isOffsetBased(input: any): input is OffsetParams {
  return (
    typeof input === 'object' &&
    input !== null &&
    'offset' in input &&
    'limit' in input &&
    typeof input.offset === 'number' &&
    typeof input.limit === 'number'
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculates total pages from total items and page size
 */
export function calculateTotalPages(totalItems: number, pageSize: number): number {
  return Math.ceil(totalItems / pageSize);
}

/**
 * Checks if there are more items after the current page
 */
export function hasMoreItems(currentOffset: number, itemsReturned: number, totalItems: number): boolean {
  return currentOffset + itemsReturned < totalItems;
}

/**
 * Gets the range of items shown on the current page
 *
 * @returns Object with startItem and endItem (1-indexed)
 */
export function getItemRange(page: number, pageSize: number, totalItems: number): {
  startItem: number;
  endItem: number;
} {
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);
  return { startItem, endItem };
}

/**
 * Creates pagination metadata object compatible with backend responses
 */
export function createPaginationMeta(
  total: number,
  page: number,
  pageSize: number
): {
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
} {
  const totalPages = calculateTotalPages(total, pageSize);
  const offset = (page - 1) * pageSize;
  const hasMore = offset + pageSize < total;

  return {
    total,
    totalPages,
    currentPage: page,
    pageSize,
    hasMore,
  };
}
