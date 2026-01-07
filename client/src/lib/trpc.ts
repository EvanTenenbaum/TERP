import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

/**
 * DATA-004: Query Optimization Guide
 * 
 * The QueryClient in main.tsx is already configured with good defaults:
 * - staleTime: 5 minutes (data considered fresh, won't refetch)
 * - gcTime: 10 minutes (unused data stays in cache)
 * - Smart retry logic with exponential backoff
 * 
 * Use these presets to override defaults for specific query types:
 */

/**
 * Recommended staleTime values by data type
 * Use with: trpc.xxx.useQuery(input, { staleTime: staleTimePresets.static })
 */
export const staleTimePresets = {
  /** Static data that rarely changes (system settings, permissions) */
  static: 10 * 60 * 1000,     // 10 minutes
  
  /** Semi-static data (client list, product catalog, pricing rules) */
  semiStatic: 5 * 60 * 1000,  // 5 minutes (default)
  
  /** Dynamic data that changes frequently (inventory, order status) */
  dynamic: 30 * 1000,         // 30 seconds
  
  /** Real-time data that should always be fresh */
  realtime: 0,                // Always refetch
} as const;

/**
 * Common query options for different scenarios
 */
export const queryOptions = {
  /** For dropdown/select data that doesn't change often */
  dropdown: {
    staleTime: staleTimePresets.static,
    gcTime: 15 * 60 * 1000, // Keep in cache longer
  },
  
  /** For dashboard widgets that should update periodically */
  dashboard: {
    staleTime: staleTimePresets.dynamic,
    refetchInterval: 60 * 1000, // Refetch every minute
  },
  
  /** For data that must always be current */
  realtime: {
    staleTime: staleTimePresets.realtime,
    refetchOnWindowFocus: true,
  },
} as const;

/**
 * Known Redundant Queries (DATA-004 Audit)
 *
 * The following pages make duplicate `clients.list` calls:
 * - Orders.tsx
 * - Quotes.tsx
 * - PurchaseOrdersPage.tsx
 * - SalesSheetCreatorPage.tsx
 * - OrderCreatorPage.tsx
 *
 * Recommendation: Create a shared ClientsProvider context or use
 * React Query's built-in deduplication (same query key = single request)
 *
 * See: docs/TECHNICAL_DEBT.md [DEBT-001]
 */

// ============================================================================
// OPTIMISTIC UPDATE PATTERNS (Wave 7 - Tech Debt Polish)
// ============================================================================

/**
 * Optimistic Update Pattern Example
 *
 * Use optimistic updates for operations where:
 * 1. The operation is likely to succeed
 * 2. Immediate UI feedback improves UX
 * 3. The data can be easily rolled back on failure
 *
 * Example usage for notification mark as read:
 *
 * ```tsx
 * const utils = trpc.useUtils();
 *
 * const markAsRead = trpc.notifications.markAsRead.useMutation({
 *   // Before the mutation runs
 *   onMutate: async ({ id }) => {
 *     // Cancel outgoing refetches to prevent race conditions
 *     await utils.notifications.list.cancel();
 *
 *     // Snapshot current data for rollback
 *     const previousNotifications = utils.notifications.list.getData();
 *
 *     // Optimistically update the cache
 *     utils.notifications.list.setData(undefined, (old) =>
 *       old?.map(n => n.id === id ? { ...n, read: true } : n)
 *     );
 *
 *     // Return context with previous value
 *     return { previousNotifications };
 *   },
 *
 *   // On error, rollback to previous state
 *   onError: (err, variables, context) => {
 *     if (context?.previousNotifications) {
 *       utils.notifications.list.setData(undefined, context.previousNotifications);
 *     }
 *   },
 *
 *   // Always refetch after error or success
 *   onSettled: () => {
 *     utils.notifications.list.invalidate();
 *   },
 * });
 * ```
 *
 * Best practices:
 * - Always cancel in-flight queries before optimistic update
 * - Always store previous state for rollback
 * - Always invalidate/refetch on settle to ensure consistency
 * - Keep optimistic updates simple - complex transformations can cause issues
 */

/**
 * Helper to create optimistic update options for common patterns
 *
 * Note: This is a template function showing the pattern structure.
 * In actual usage, you would use trpc.useUtils() to access the cache
 * and implement the update/rollback logic. See the example above.
 */
export function createOptimisticUpdateOptions<TData, TVariables>(
  _queryKey: unknown[],
  _updateFn: (oldData: TData | undefined, variables: TVariables) => TData | undefined
) {
  return {
    onMutate: async (_variables: TVariables) => {
      // This is a template - actual implementation would use trpc.useUtils()
      // See the example above for the full pattern
      return { previousData: undefined as TData | undefined };
    },
    onError: (
      _err: unknown,
      _vars: TVariables,
      context: { previousData: TData | undefined } | undefined
    ) => {
      // Rollback would happen here using trpc.useUtils()
      if (context?.previousData) {
        // utils.xxx.setData(undefined, context.previousData);
      }
    },
    onSettled: () => {
      // Invalidation would happen here using trpc.useUtils()
      // utils.xxx.invalidate();
    },
  };
}

