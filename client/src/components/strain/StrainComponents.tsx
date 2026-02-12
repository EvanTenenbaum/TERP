/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared Strain Components
 * 
 * Reusable UI components for displaying strain information consistently across the app.
 * Benefits:
 * - One-line usage anywhere
 * - Consistent styling
 * - Automatic data fetching
 * - Easy to update globally
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Info, TrendingUp, Package } from "lucide-react";
import {
  useStrainFamily,
  useClientStrainPreferences,
  useStrainSuggestions,
  useProductAvailability,
} from "@/hooks/useStrainHooks";

/**
 * Display strain family badge
 * 
 * @example
 * <StrainFamilyBadge strainId={product.strainId} />
 * // Renders: <Badge>Runtz family</Badge>
 */
export function StrainFamilyBadge({ 
  strainId 
}: { 
  strainId: number | null | undefined 
}) {
  const { data: family, isLoading } = useStrainFamily(strainId);
  
  if (isLoading || !family?.parent) return null;
  
  return (
    <Badge variant="outline" className="gap-1">
      <Info className="h-3 w-3" />
      {family.parent.name} family
    </Badge>
  );
}

/**
 * Display related products in the same strain family
 * 
 * @example
 * <RelatedProducts strainId={product.strainId} currentProductId={product.id} />
 */
export function RelatedProducts({ 
  strainId,
  currentProductId,
  onProductClick,
}: { 
  strainId: number | null | undefined;
  currentProductId?: number;
  onProductClick?: (productId: number) => void;
}) {
  const { alternatives, parent, isLoading } = useStrainSuggestions(strainId, currentProductId);
  
  if (isLoading || alternatives.length === 0) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4" />
          Other {parent?.name} Products
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alternatives.map((variant) => (
          <div
            key={variant.id}
            className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => onProductClick?.(variant.id)}
          >
            <div>
              <p className="font-medium text-sm">{variant.name}</p>
              {variant.category && (
                <p className="text-xs text-muted-foreground capitalize">
                  {variant.category}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Display out-of-stock alert with alternatives
 * 
 * @example
 * <OutOfStockAlert product={product} />
 */
export function OutOfStockAlert({ 
  product 
}: { 
  product: {
    id: number;
    name: string;
    strainId?: number | null;
    onHandQty?: string | number;
  }
}) {
  const { isOutOfStock, hasAlternatives, alternatives, parent } = useProductAvailability(product);
  
  if (!isOutOfStock) return null;
  
  return (
    <Alert>
      <AlertTitle>Out of Stock</AlertTitle>
      <AlertDescription>
        {hasAlternatives ? (
          <div className="mt-2 space-y-2">
            <p>Try these alternatives from the {parent?.name} family:</p>
            <div className="space-y-1">
              {alternatives.slice(0, 3).map((alt) => (
                <div key={alt.id} className="text-sm font-medium">
                  • {alt.name}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p>This product is currently out of stock.</p>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Display client's strain preferences chart
 * 
 * @example
 * <StrainPreferenceChart clientId={client.id} />
 */
export function StrainPreferenceChart({ 
  clientId 
}: { 
  clientId: number | null | undefined 
}) {
  const { data: preferences, isLoading } = useClientStrainPreferences(clientId);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Strain Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!preferences || preferences.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Strain Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No purchase history yet</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Strain Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {preferences.slice(0, 5).map((pref: any) => (
          <div key={pref.family_id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{pref.family_name}</span>
              <span className="text-muted-foreground">
                {pref.percentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={pref.percentage} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{pref.purchase_count} purchases</span>
              <span>${Number(pref.total_revenue).toFixed(0)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Compact strain family indicator (for tables/lists)
 * 
 * @example
 * <StrainFamilyIndicator strainId={product.strainId} />
 */
export function StrainFamilyIndicator({ 
  strainId 
}: { 
  strainId: number | null | undefined 
}) {
  const { data: family } = useStrainFamily(strainId);
  
  if (!family?.parent) return null;
  
  return (
    <span className="text-xs text-muted-foreground">
      ({family.parent.name})
    </span>
  );
}

/**
 * Strain category badge with color coding
 * 
 * @example
 * <StrainCategoryBadge category="indica" />
 */
export function StrainCategoryBadge({ 
  category 
}: { 
  category: string | null | undefined 
}) {
  if (!category) return null;
  
  const colors = {
    indica: "bg-purple-100 text-purple-800 border-purple-200",
    sativa: "bg-green-100 text-green-800 border-green-200",
    hybrid: "bg-blue-100 text-blue-800 border-blue-200",
  };
  
  const colorClass = colors[category.toLowerCase() as keyof typeof colors] || "bg-gray-100 text-gray-800";
  
  return (
    <Badge variant="outline" className={colorClass}>
      {category}
    </Badge>
  );
}

/**
 * Strain info tooltip (shows family and category)
 * 
 * @example
 * <StrainInfoTooltip strainId={product.strainId} />
 */
export function StrainInfo({ 
  strainId 
}: { 
  strainId: number | null | undefined 
}) {
  const { data: family } = useStrainFamily(strainId);
  
  if (!family) return null;
  
  return (
    <div className="flex items-center gap-2">
      {family.parent?.category && <StrainCategoryBadge category={family.parent.category} />}
      {family.parent && <StrainFamilyBadge strainId={strainId} />}
    </div>
  );
}

