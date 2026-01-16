/**
 * VendorBrandInfo Component - MEET-027
 *
 * Displays clarifying information about the distinction between
 * Vendor (business entity) and Brand (product line/farmer).
 *
 * A vendor can have multiple brands/farmers associated with them.
 */

import { InfoIcon, Building2, Tag } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getVendorBrandExplanation, getBrandLabel } from "@/lib/nomenclature";

interface VendorBrandInfoProps {
  /**
   * Display mode:
   * - "tooltip": Show as an info icon with tooltip
   * - "inline": Show as inline text
   * - "card": Show as a card with full explanation
   */
  mode?: "tooltip" | "inline" | "card";
  /**
   * Optional category context for dynamic Brand/Farmer terminology
   */
  category?: string;
}

/**
 * Info icon with tooltip explaining vendor vs brand distinction
 */
export function VendorBrandInfoTooltip({ category }: { category?: string }) {
  const explanation = getVendorBrandExplanation();
  const brandLabel = getBrandLabel(category);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <InfoIcon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span className="font-semibold">{explanation.vendorLabel}:</span>
            </div>
            <p className="text-muted-foreground ml-6">
              {explanation.vendorDescription}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Tag className="h-4 w-4 text-green-500" />
              <span className="font-semibold">{brandLabel}:</span>
            </div>
            <p className="text-muted-foreground ml-6">
              {category
                ? `The ${brandLabel.toLowerCase()} associated with this product.`
                : explanation.brandDescription}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline text explaining vendor vs brand
 */
export function VendorBrandInfoInline({ category }: { category?: string }) {
  const brandLabel = getBrandLabel(category);

  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium">Vendor</span> is the business entity.{" "}
      <span className="font-medium">{brandLabel}</span> is the product
      line/label.
    </p>
  );
}

/**
 * Card with full explanation of vendor vs brand distinction
 */
export function VendorBrandInfoCard({ category }: { category?: string }) {
  const explanation = getVendorBrandExplanation();
  const brandLabel = getBrandLabel(category);

  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <InfoIcon className="h-4 w-4" />
          Understanding Vendors and {brandLabel}s
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <div className="font-medium">{explanation.vendorLabel}</div>
            <p className="text-muted-foreground">
              {explanation.vendorDescription}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Tag className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <div className="font-medium">{brandLabel}</div>
            <p className="text-muted-foreground">
              {category
                ? `For ${category} products, this represents the ${brandLabel.toLowerCase()}.`
                : explanation.brandDescription}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main component that renders based on mode
 */
export function VendorBrandInfo({
  mode = "tooltip",
  category,
}: VendorBrandInfoProps) {
  switch (mode) {
    case "tooltip":
      return <VendorBrandInfoTooltip category={category} />;
    case "inline":
      return <VendorBrandInfoInline category={category} />;
    case "card":
      return <VendorBrandInfoCard category={category} />;
    default:
      return <VendorBrandInfoTooltip category={category} />;
  }
}

/**
 * Compact vendor with brands display for search results
 * MEET-030: Shows vendor with their associated brands
 */
interface VendorWithBrandsProps {
  vendorName: string;
  brands: Array<{ id: number; name: string; productCount?: number }>;
  category?: string;
  onBrandClick?: (brandId: number) => void;
  maxBrandsShown?: number;
}

export function VendorWithBrands({
  vendorName,
  brands,
  category,
  onBrandClick,
  maxBrandsShown = 3,
}: VendorWithBrandsProps) {
  const brandLabel = getBrandLabel(category);
  const visibleBrands = brands.slice(0, maxBrandsShown);
  const remainingCount = brands.length - maxBrandsShown;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{vendorName}</span>
      </div>
      {brands.length > 0 && (
        <div className="ml-6 space-y-1">
          <div className="text-xs text-muted-foreground">
            {brandLabel}s ({brands.length}):
          </div>
          <div className="flex flex-wrap gap-1">
            {visibleBrands.map((brand) => (
              <Badge
                key={brand.id}
                variant="secondary"
                className={
                  onBrandClick
                    ? "cursor-pointer hover:bg-secondary/80"
                    : undefined
                }
                onClick={() => onBrandClick?.(brand.id)}
              >
                {brand.name}
                {brand.productCount !== undefined && (
                  <span className="ml-1 opacity-60">({brand.productCount})</span>
                )}
              </Badge>
            ))}
            {remainingCount > 0 && (
              <Badge variant="outline">+{remainingCount} more</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorBrandInfo;
