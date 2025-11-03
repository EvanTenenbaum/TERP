/**
 * useMarginLookup Hook
 * Fetches margin for product with fallback logic
 * v2.0 Sales Order Enhancements
 */

import { trpc } from "@/lib/trpc";

export type MarginSource = "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";

export interface MarginResult {
  margin: number | null;
  source: MarginSource;
}

/**
 * Hook to get margin for a product
 * Uses customer profile → default → manual fallback logic
 */
export function useMarginLookup(clientId: number, productCategory: string) {
  const { data, isLoading, error } = trpc.ordersEnhancedV2.getMarginForProduct.useQuery(
    {
      clientId,
      productCategory,
    },
    {
      enabled: !!clientId && !!productCategory,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  return {
    margin: data?.margin ?? null,
    source: data?.source ?? "MANUAL",
    isLoading,
    error,
  };
}

/**
 * Hook to calculate price from COGS and margin
 */
export function usePriceCalculation(cogs: number, marginPercent: number) {
  const { data, isLoading } = trpc.ordersEnhancedV2.calculatePrice.useQuery(
    {
      cogs,
      marginPercent,
    },
    {
      enabled: cogs > 0 && marginPercent !== undefined,
    }
  );

  return {
    price: data?.price ?? 0,
    marginDollar: data?.marginDollar ?? 0,
    isLoading,
  };
}

