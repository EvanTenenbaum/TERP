/**
 * Shared Clients Data Hook
 * DATA-004: Eliminates redundant clients.list queries across pages
 *
 * This hook provides a centralized way to fetch and cache client data,
 * leveraging React Query's built-in deduplication and caching.
 *
 * Usage:
 *   const { clients, isLoading, getClientName } = useClientsData();
 *
 * Benefits:
 * - Single source of truth for client data
 * - Automatic deduplication of concurrent requests
 * - Shared cache across all components
 * - Consistent loading states
 * - Helper functions for common operations
 */

import { useMemo } from "react";
import { trpc } from "../lib/trpc";

export interface ClientBasic {
  id: number;
  name: string | null;
  email?: string | null;
  phone?: string | null;
  teriCode?: string | null;
}

interface UseClientsDataOptions {
  /** Whether to fetch clients (default: true) */
  enabled?: boolean;
  /** Filter by client types */
  clientTypes?: ("buyer" | "seller")[];
  /** Maximum number of clients to fetch (default: 1000) */
  limit?: number;
}

interface UseClientsDataReturn {
  /** Array of clients */
  clients: ClientBasic[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Get client name by ID */
  getClientName: (clientId: number | null | undefined) => string;
  /** Get client by ID */
  getClientById: (
    clientId: number | null | undefined
  ) => ClientBasic | undefined;
  /** Map of client ID to client for O(1) lookups */
  clientsMap: Map<number, ClientBasic>;
}

/**
 * Hook for fetching and caching client data
 *
 * Uses React Query's built-in deduplication - multiple components
 * calling this hook will share the same request and cache.
 */
export function useClientsData(
  options: UseClientsDataOptions = {}
): UseClientsDataReturn {
  const { enabled = true, clientTypes, limit = 1000 } = options;

  // Fetch clients with shared cache key
  // React Query will deduplicate concurrent requests automatically
  const {
    data: clientsData,
    isLoading,
    error,
  } = trpc.clients.list.useQuery(
    {
      limit,
      ...(clientTypes && { clientTypes }),
    },
    {
      enabled,
      // Use staleTime from trpc config (5 minutes for reference data)
      // This prevents refetching on every component mount
    }
  );

  // Normalize the response (handle both array and paginated formats)
  const clients = useMemo(() => {
    if (!clientsData) return [];
    return Array.isArray(clientsData) ? clientsData : (clientsData.items ?? []);
  }, [clientsData]);

  // Create a map for O(1) lookups
  const clientsMap = useMemo(() => {
    const map = new Map<number, ClientBasic>();
    for (const client of clients) {
      map.set(client.id, client);
    }
    return map;
  }, [clients]);

  // Helper to get client name by ID
  const getClientName = useMemo(() => {
    return (clientId: number | null | undefined): string => {
      if (clientId === null || clientId === undefined) return "Unknown";
      const client = clientsMap.get(clientId);
      return client?.name ?? "Unknown";
    };
  }, [clientsMap]);

  // Helper to get client by ID
  const getClientById = useMemo(() => {
    return (clientId: number | null | undefined): ClientBasic | undefined => {
      if (clientId === null || clientId === undefined) return undefined;
      return clientsMap.get(clientId);
    };
  }, [clientsMap]);

  return {
    clients,
    isLoading,
    error: error as Error | null,
    getClientName,
    getClientById,
    clientsMap,
  };
}

/**
 * Hook specifically for supplier (seller) clients
 * Convenience wrapper around useClientsData
 */
export function useSuppliersData(
  options: Omit<UseClientsDataOptions, "clientTypes"> = {}
) {
  return useClientsData({
    ...options,
    clientTypes: ["seller"],
  });
}

/**
 * Hook specifically for customer (buyer) clients
 * Convenience wrapper around useClientsData
 */
export function useCustomersData(
  options: Omit<UseClientsDataOptions, "clientTypes"> = {}
) {
  return useClientsData({
    ...options,
    clientTypes: ["buyer"],
  });
}

export default useClientsData;
