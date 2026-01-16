/**
 * Pagination Controls Component
 * PERF-003: Add Pagination to All List Endpoints
 * 
 * A mobile-optimized pagination component that integrates with the backend pagination system.
 * Provides page navigation, page size selection, and displays pagination info.
 * 
 * Mobile optimizations:
 * - Stacks vertically on small screens
 * - Hides first/last buttons on mobile to save space
 * - Compact page info display on mobile
 * - Touch-friendly button sizes (min 44px touch target)
 * - Responsive text sizing
 * 
 * @example
 * ```tsx
 * const [page, setPage] = useState(1);
 * const [pageSize, setPageSize] = useState(50);
 * 
 * <PaginationControls
 *   currentPage={page}
 *   totalPages={data.pagination.totalPages}
 *   totalItems={data.pagination.total}
 *   pageSize={pageSize}
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 * />
 * ```
 */

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface PaginationControlsProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Number of items per page */
  pageSize: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes (optional) */
  onPageSizeChange?: (pageSize: number) => void;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Whether to show page size selector */
  showPageSizeSelector?: boolean;
  /** Whether to show item count info */
  showItemCount?: boolean;
  /** Whether to show first/last page buttons (hidden on mobile by default) */
  showFirstLastButtons?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Compact mode for tight spaces (mobile-first) */
  compact?: boolean;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const PaginationControls = React.memo(function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  showPageSizeSelector = true,
  showItemCount = true,
  showFirstLastButtons = true,
  className,
  isLoading = false,
  compact = false,
}: PaginationControlsProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handleFirstPage = React.useCallback(() => {
    if (canGoPrevious) onPageChange(1);
  }, [canGoPrevious, onPageChange]);

  const handlePreviousPage = React.useCallback(() => {
    if (canGoPrevious) onPageChange(currentPage - 1);
  }, [canGoPrevious, currentPage, onPageChange]);

  const handleNextPage = React.useCallback(() => {
    if (canGoNext) onPageChange(currentPage + 1);
  }, [canGoNext, currentPage, onPageChange]);

  const handleLastPage = React.useCallback(() => {
    if (canGoNext) onPageChange(totalPages);
  }, [canGoNext, totalPages, onPageChange]);

  const handlePageSizeChange = React.useCallback((value: string) => {
    const newPageSize = parseInt(value, 10);
    onPageSizeChange?.(newPageSize);
    // Reset to first page when page size changes
    onPageChange(1);
  }, [onPageChange, onPageSizeChange]);

  if (totalItems === 0) {
    return null;
  }

  // Button size classes - ensure touch-friendly targets (min 44px)
  const buttonClasses = compact 
    ? "h-9 w-9 min-h-[44px] min-w-[44px]" 
    : "h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px]";

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 py-4",
        "sm:flex-row sm:justify-between sm:gap-4",
        className
      )}
    >
      {/* Item count info - responsive text */}
      {showItemCount && (
        <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left order-2 sm:order-1">
          {/* Mobile: compact format */}
          <span className="sm:hidden">
            {startItem.toLocaleString()}-{endItem.toLocaleString()} of {totalItems.toLocaleString()}
          </span>
          {/* Desktop: full format */}
          <span className="hidden sm:inline">
            Showing {startItem.toLocaleString()} - {endItem.toLocaleString()} of{" "}
            {totalItems.toLocaleString()} items
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 order-1 sm:order-2 w-full sm:w-auto">
        {/* Page size selector - hidden on mobile in compact mode */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className={cn(
            "flex items-center gap-2",
            compact && "hidden sm:flex"
          )}>
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              <span className="hidden sm:inline">Rows per page:</span>
              <span className="sm:hidden">Per page:</span>
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 w-[70px] min-h-[44px]">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Page navigation - touch-friendly buttons */}
        <div className="flex items-center gap-1 sm:gap-1">
          {/* First page button - hidden on mobile to save space */}
          {showFirstLastButtons && (
            <Button
              variant="outline"
              size="icon"
              className={cn(buttonClasses, "hidden sm:inline-flex")}
              onClick={handleFirstPage}
              disabled={!canGoPrevious || isLoading}
              aria-label="Go to first page"
            >
              <ChevronsLeftIcon className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="outline"
            size="icon"
            className={buttonClasses}
            onClick={handlePreviousPage}
            disabled={!canGoPrevious || isLoading}
            aria-label="Go to previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          {/* Page indicator - responsive */}
          <span className="flex items-center gap-1 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap min-w-[80px] sm:min-w-[100px] justify-center">
            <span className="sm:hidden">
              {currentPage}/{totalPages}
            </span>
            <span className="hidden sm:inline">
              Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
            </span>
          </span>

          <Button
            variant="outline"
            size="icon"
            className={buttonClasses}
            onClick={handleNextPage}
            disabled={!canGoNext || isLoading}
            aria-label="Go to next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>

          {/* Last page button - hidden on mobile to save space */}
          {showFirstLastButtons && (
            <Button
              variant="outline"
              size="icon"
              className={cn(buttonClasses, "hidden sm:inline-flex")}
              onClick={handleLastPage}
              disabled={!canGoNext || isLoading}
              aria-label="Go to last page"
            >
              <ChevronsRightIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * Hook for managing pagination state
 * FE-QA-002: Standardized to use page/pageSize with automatic offset/limit conversion
 *
 * @param initialPageSize - Initial page size (default: 50)
 * @returns Pagination state and controls with both page-based and offset-based parameters
 *
 * @example
 * ```tsx
 * const { page, pageSize, offset, limit, setPage, setPageSize } = usePagination();
 *
 * // Use with tRPC queries - can pass either format
 * const { data } = trpc.items.list.useQuery({
 *   limit,      // or pageSize
 *   offset,     // calculated automatically
 * });
 *
 * // Or use the convenience paginationParams object
 * const { paginationParams } = usePagination();
 * const { data } = trpc.items.list.useQuery(paginationParams);
 * ```
 */
export function usePagination(initialPageSize = 50) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  // Calculate offset using the standard formula
  const offset = React.useMemo(() => (page - 1) * pageSize, [page, pageSize]);

  // Provide limit as alias to pageSize for backend compatibility
  const limit = pageSize;

  const handlePageSizeChange = React.useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when page size changes
  }, []);

  const reset = React.useCallback(() => {
    setPage(1);
  }, []);

  // Convenience object with all pagination parameters
  const paginationParams = React.useMemo(() => ({
    page,
    pageSize,
    offset,
    limit,
  }), [page, pageSize, offset, limit]);

  return {
    page,
    pageSize,
    offset,
    limit,
    setPage,
    setPageSize: handlePageSizeChange,
    reset,
    paginationParams,
  };
}

export default PaginationControls;
