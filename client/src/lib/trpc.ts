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

