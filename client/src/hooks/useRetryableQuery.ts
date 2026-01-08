/**
 * useRetryableQuery Hook
 * BUG-045, BUG-048: Provides retry functionality without page reload
 *
 * This hook wraps tRPC query results to provide:
 * - Manual retry with state preservation (no page reload)
 * - Retry count tracking
 * - Max retries limit with callback
 * - User-friendly retry messaging
 *
 * Usage:
 * ```tsx
 * const inventoryQuery = trpc.salesSheets.getInventory.useQuery(
 *   { clientId },
 *   { enabled: !!clientId }
 * );
 *
 * const retryable = useRetryableQuery(inventoryQuery, {
 *   maxRetries: 3,
 *   onMaxRetriesReached: () => toast.error('Unable to load data'),
 * });
 *
 * if (retryable.isError) {
 *   return (
 *     <ErrorState
 *       onRetry={retryable.canRetry ? retryable.handleRetry : undefined}
 *       retryCount={retryable.retryCount}
 *       maxRetries={retryable.maxRetries}
 *     />
 *   );
 * }
 * ```
 */

import { useState, useCallback, useEffect } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

// Debug logging helpers - only logs in development to avoid console noise in production
const debugLog = import.meta.env.DEV
  ? (message: string, ...args: unknown[]) => console.info(message, ...args)
  : () => {};
const debugWarn = import.meta.env.DEV
  ? (message: string, ...args: unknown[]) => console.warn(message, ...args)
  : () => {};
const debugError = import.meta.env.DEV
  ? (message: string, ...args: unknown[]) => console.error(message, ...args)
  : () => {};

interface UseRetryableQueryOptions {
  /**
   * Maximum number of retry attempts allowed
   * @default 3
   */
  maxRetries?: number;

  /**
   * Callback when max retries have been reached
   */
  onMaxRetriesReached?: () => void;

  /**
   * Callback when retry is attempted
   */
  onRetry?: (attemptNumber: number) => void;

  /**
   * Callback when retry succeeds
   */
  onRetrySuccess?: () => void;
}

type UseRetryableQueryResult<TData, TError> = UseQueryResult<TData, TError> & {
  /**
   * Number of retry attempts made
   */
  retryCount: number;

  /**
   * Maximum retry attempts allowed
   */
  maxRetries: number;

  /**
   * Whether more retries are available
   */
  canRetry: boolean;

  /**
   * Handler to trigger a retry
   */
  handleRetry: () => Promise<void>;

  /**
   * Reset retry count (useful when inputs change)
   */
  resetRetryCount: () => void;

  /**
   * Number of remaining retry attempts
   */
  remainingRetries: number;
};

/**
 * Hook that wraps a tRPC query result with retry functionality
 * Preserves React state during retries (no page reload)
 */
export function useRetryableQuery<TData, TError>(
  queryResult: UseQueryResult<TData, TError>,
  options: UseRetryableQueryOptions = {}
): UseRetryableQueryResult<TData, TError> {
  const {
    maxRetries = 3,
    onMaxRetriesReached,
    onRetry,
    onRetrySuccess,
  } = options;

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  /**
   * Handle retry by refetching
   * This preserves all React state unlike window.location.reload()
   */
  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      debugWarn("[useRetryableQuery] Max retries reached, not retrying");
      onMaxRetriesReached?.();
      return;
    }

    const attemptNumber = retryCount + 1;
    debugLog(
      `[useRetryableQuery] Retry attempt ${attemptNumber}/${maxRetries}`
    );

    setIsRetrying(true);
    setRetryCount(attemptNumber);
    onRetry?.(attemptNumber);

    try {
      // Trigger a refetch - this bypasses cache by default
      const result = await queryResult.refetch();

      // If successful, call success callback
      if (result.isSuccess) {
        onRetrySuccess?.();
      }
    } catch (error) {
      debugError("[useRetryableQuery] Retry failed:", error);
    } finally {
      setIsRetrying(false);
    }
  }, [
    retryCount,
    maxRetries,
    queryResult,
    onMaxRetriesReached,
    onRetry,
    onRetrySuccess,
  ]);

  /**
   * Reset retry count - useful when query inputs change
   */
  const resetRetryCount = useCallback(() => {
    setRetryCount(0);
  }, []);

  /**
   * Reset retry count on successful query
   */
  useEffect(() => {
    if (queryResult.isSuccess && retryCount > 0) {
      debugLog("[useRetryableQuery] Query succeeded, resetting retry count");
      setRetryCount(0);
    }
  }, [queryResult.isSuccess, retryCount]);

  /**
   * Trigger callback when max retries reached after an error
   */
  useEffect(() => {
    if (queryResult.isError && retryCount >= maxRetries) {
      onMaxRetriesReached?.();
    }
  }, [queryResult.isError, retryCount, maxRetries, onMaxRetriesReached]);

  const canRetry = retryCount < maxRetries;
  const remainingRetries = Math.max(0, maxRetries - retryCount);

  // Spread the query result and add retry-specific properties
  // Note: isLoading includes retry state
  const isLoadingWithRetry = queryResult.isLoading || isRetrying;

  return {
    ...queryResult,
    isLoading: isLoadingWithRetry,
    retryCount,
    maxRetries,
    canRetry,
    handleRetry,
    resetRetryCount,
    remainingRetries,
  } as UseRetryableQueryResult<TData, TError>;
}

export default useRetryableQuery;
