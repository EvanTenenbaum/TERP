/**
 * Reusable Strain Hooks
 * 
 * These hooks provide consistent, cached access to strain data across all components.
 * Benefits:
 * - One-line usage in any component
 * - Automatic caching via tRPC
 * - Consistent error handling
 * - Type-safe
 */

import { trpc } from "@/lib/trpc";

/**
 * Get strain with complete family information
 * 
 * @example
 * const { data: strain, isLoading } = useStrainFamily(product.strainId);
 * if (strain?.parent) {
 *   return <Badge>{strain.parent.name} family</Badge>;
 * }
 */
export function useStrainFamily(strainId: number | null | undefined) {
  return trpc.strains.getFamily.useQuery(
    { strainId: strainId ?? 0 },
    { 
      enabled: !!strainId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

/**
 * Get all variants in a strain family
 * 
 * @example
 * const { data: family } = useStrainFamilyVariants(strainId);
 * console.log(`${family.variantCount} variants of ${family.parent.name}`);
 */
export function useStrainFamilyVariants(strainId: number | null | undefined) {
  return trpc.strains.getFamily.useQuery(
    { strainId: strainId ?? 0 },
    { 
      enabled: !!strainId,
      select: (data) => ({
        parent: data?.parent,
        variants: data?.variants || [],
        variantCount: (data?.variants?.length || 1) - 1,
      }),
    }
  );
}

/**
 * Get alternative products in the same strain family
 * 
 * @example
 * const { alternatives } = useStrainSuggestions(product.strainId, product.id);
 * if (outOfStock && alternatives.length > 0) {
 *   return <Alert>Try these alternatives: {alternatives.map(a => a.name)}</Alert>;
 * }
 */
export function useStrainSuggestions(
  strainId: number | null | undefined,
  _excludeProductId?: number
) {
  const family = useStrainFamily(strainId);
  
  return {
    alternatives: family.data?.variants.filter(v => v.id !== strainId) || [],
    parent: family.data?.parent,
    isVariant: !!family.data?.parent,
    isLoading: family.isLoading,
    error: family.error,
  };
}

/**
 * Get client's strain family preferences
 * 
 * @example
 * const { data: preferences } = useClientStrainPreferences(clientId);
 * preferences?.forEach(pref => {
 *   console.log(`${pref.family_name}: ${pref.percentage}%`);
 * });
 */
export function useClientStrainPreferences(clientId: number | null | undefined) {
  return trpc.analytics.clientStrainPreferences.useQuery(
    { clientId: clientId ?? 0 },
    { 
      enabled: !!clientId,
      staleTime: 10 * 60 * 1000, // 10 minutes (changes slowly)
    }
  );
}

/**
 * Get strain family statistics
 * 
 * @example
 * const { data: stats } = useStrainFamilyStats(familyId);
 * console.log(`${stats.variant_count} variants, ${stats.product_count} products`);
 */
export function useStrainFamilyStats(familyId: number | null | undefined) {
  return trpc.strains.getFamilyStats.useQuery(
    { familyId: familyId ?? 0 },
    { 
      enabled: !!familyId,
      staleTime: 5 * 60 * 1000,
    }
  );
}

/**
 * Get products in a strain family
 * 
 * @example
 * const { data: products } = useStrainFamilyProducts(familyId);
 * products?.forEach(p => console.log(p.name, p.total_inventory));
 */
export function useStrainFamilyProducts(
  familyId: number | null | undefined,
  includeOutOfStock = false
) {
  return trpc.strains.getProductsByFamily.useQuery(
    { familyId: familyId ?? 0, includeOutOfStock },
    { 
      enabled: !!familyId,
      staleTime: 2 * 60 * 1000, // 2 minutes (inventory changes frequently)
    }
  );
}

/**
 * Fuzzy search for strains
 * 
 * @example
 * const { data: matches } = useStrainSearch(searchQuery);
 * matches?.forEach(m => console.log(m.name, m.similarity));
 */
export function useStrainSearch(
  query: string,
  category?: string,
  _threshold = 90
) {
  return trpc.strains.fuzzySearch.useQuery(
    { query }, // category and threshold not supported by API
    { 
      enabled: query.length >= 2,
      staleTime: 30 * 1000, // 30 seconds
    }
  );
}

/**
 * Get top selling strain families
 * 
 * @example
 * const { data: topFamilies } = useTopStrainFamilies(10);
 * topFamilies?.forEach(f => console.log(f.family_name, f.total_revenue));
 */
export function useTopStrainFamilies(
  limit = 10,
  startDate?: Date,
  endDate?: Date
) {
  return trpc.analytics.topStrainFamilies.useQuery(
    { limit, startDate, endDate },
    { 
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );
}

/**
 * Get strain family trends over time
 * 
 * @example
 * const { data: trends } = useStrainFamilyTrends(familyId, 6);
 * trends?.forEach(t => console.log(t.month, t.total_revenue));
 */
export function useStrainFamilyTrends(
  familyId: number | null | undefined,
  months = 6
) {
  return trpc.analytics.strainFamilyTrends.useQuery(
    { familyId: familyId ?? 0, months },
    { 
      enabled: !!familyId,
      staleTime: 30 * 60 * 1000, // 30 minutes (historical data)
    }
  );
}

/**
 * Check if product is out of stock and get alternatives
 * 
 * @example
 * const { isOutOfStock, alternatives } = useProductAvailability(product);
 * if (isOutOfStock) {
 *   return <Alert>Out of stock. Try: {alternatives.map(a => a.name)}</Alert>;
 * }
 */
export function useProductAvailability(product: {
  id: number;
  strainId?: number | null;
  onHandQty?: string | number;
}) {
  const suggestions = useStrainSuggestions(product.strainId, product.id);
  
  const onHandQty = typeof product.onHandQty === 'string' 
    ? parseFloat(product.onHandQty) 
    : product.onHandQty || 0;
  
  const isOutOfStock = onHandQty <= 0;
  
  return {
    isOutOfStock,
    alternatives: isOutOfStock ? suggestions.alternatives : [],
    hasAlternatives: isOutOfStock && suggestions.alternatives.length > 0,
    parent: suggestions.parent,
  };
}

