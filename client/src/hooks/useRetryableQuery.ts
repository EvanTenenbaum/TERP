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
import { useQueryClient, type UseQueryResult } from "@tanstack/react-query";

// Debug logging helpers - only logs in development to avoid console noise in production
const debugLog = import.meta.env.DEV
  ? (message: string, ...args: unknown[]) => console.log(message, ...args)
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

interface UseRetryableQueryResult<TData, TError> extends UseQueryResult<TData, TError> {
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
}

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
  const queryClient = useQueryClient();

  /**
   * Handle retry by invalidating cache and refetching
   * This preserves all React state unlike window.location.reload()
   */
  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      debugWarn("[useRetryableQuery] Max retries reached, not retrying");
      onMaxRetriesReached?.();
      return;
    }

    const attemptNumber = retryCount + 1;
    debugLog(`[useRetryableQuery] Retry attempt ${attemptNumber}/${maxRetries}`);

    setIsRetrying(true);
    setRetryCount(attemptNumber);
    onRetry?.(attemptNumber);

    try {
      // Invalidate the query cache to force a fresh fetch
      // Use the query key from the result
      if (queryResult.queryKey) {
        await queryClient.invalidateQueries({ queryKey: queryResult.queryKey });
      }

      // Trigger a refetch
      await queryResult.refetch();

      // If successful, call success callback
      if (!queryResult.isError) {
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
    queryClient,
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

  return {
    ...queryResult,
    // Override isLoading to include retry state
    isLoading: queryResult.isLoading || isRetrying,
    // Add retry-specific properties
    retryCount,
    maxRetries,
    canRetry,
    handleRetry,
    resetRetryCount,
    remainingRetries,
  };
}

export default useRetryableQuery;
