/**
 * VendorSearchWithBrands Component - MEET-030
 *
 * Search component for vendors that shows their associated brands.
 * Each vendor result displays an expandable list of brands with product counts.
 */

import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Building2,
  Tag,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
} from "lucide-react";
import { getBrandLabel } from "@/lib/nomenclature";
import { useDebounce } from "@/hooks/useDebounce";

interface VendorSearchResult {
  vendor: {
    clientId: number;
    name: string;
    teriCode: string | null;
    contactName: string | null;
    paymentTerms: string | null;
  };
  brands: Array<{
    id: number;
    name: string;
    productCount: number;
  }>;
}

interface VendorSearchWithBrandsProps {
  /**
   * Callback when a vendor is selected
   */
  onVendorSelect: (vendor: VendorSearchResult["vendor"]) => void;
  /**
   * Callback when a specific brand is clicked
   */
  onBrandSelect?: (vendorId: number, brandId: number, brandName: string) => void;
  /**
   * Optional placeholder text
   */
  placeholder?: string;
  /**
   * Whether to show the clear button
   */
  showClear?: boolean;
  /**
   * Initial search value
   */
  initialValue?: string;
  /**
   * Category context for dynamic Brand/Farmer terminology
   */
  category?: string;
  /**
   * Whether to auto-expand brand lists
   */
  autoExpandBrands?: boolean;
  /**
   * Maximum results to show
   */
  maxResults?: number;
}

/**
 * Single vendor result item with expandable brands
 */
function VendorResultItem({
  result,
  category,
  autoExpandBrands,
  onVendorSelect,
  onBrandSelect,
}: {
  result: VendorSearchResult;
  category?: string;
  autoExpandBrands?: boolean;
  onVendorSelect: (vendor: VendorSearchResult["vendor"]) => void;
  onBrandSelect?: (vendorId: number, brandId: number, brandName: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(autoExpandBrands || false);
  const brandLabel = getBrandLabel(category);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Vendor header */}
      <div
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
        onClick={() => onVendorSelect(result.vendor)}
      >
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-blue-500" />
          <div>
            <div className="font-medium">{result.vendor.name}</div>
            <div className="text-xs text-muted-foreground">
              {result.vendor.contactName && (
                <span>{result.vendor.contactName}</span>
              )}
              {result.vendor.paymentTerms && (
                <span className="ml-2">
                  Terms: {result.vendor.paymentTerms.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {result.brands.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <span className="text-xs mr-1">
              {result.brands.length} {brandLabel.toLowerCase()}
              {result.brands.length !== 1 ? "s" : ""}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Expanded brands list */}
      {isExpanded && result.brands.length > 0 && (
        <div className="border-t bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {brandLabel}s from this vendor:
          </div>
          <div className="flex flex-wrap gap-2">
            {result.brands.map((brand) => (
              <Badge
                key={brand.id}
                variant="secondary"
                className={
                  onBrandSelect
                    ? "cursor-pointer hover:bg-secondary/80"
                    : undefined
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onBrandSelect?.(
                    result.vendor.clientId,
                    brand.id,
                    brand.name
                  );
                }}
              >
                {brand.name}
                <span className="ml-1 opacity-60">({brand.productCount})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main VendorSearchWithBrands component
 */
export function VendorSearchWithBrands({
  onVendorSelect,
  onBrandSelect,
  placeholder = "Search vendors...",
  showClear = true,
  initialValue = "",
  category,
  autoExpandBrands = false,
  maxResults = 10,
}: VendorSearchWithBrandsProps) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Debounce search input
  const debouncedSearch = useDebounce(searchValue, 300);

  // Search vendors with brands
  const { data, isLoading, isFetching } = trpc.vendors.searchWithBrands.useQuery(
    { query: debouncedSearch, limit: maxResults },
    {
      enabled: debouncedSearch.length >= 2,
      staleTime: 30000, // 30 seconds
    }
  );

  const results = useMemo(() => {
    if (!data?.data) return [];
    return data.data as VendorSearchResult[];
  }, [data]);

  const handleClear = useCallback(() => {
    setSearchValue("");
    setIsDropdownOpen(false);
  }, []);

  const handleVendorSelect = useCallback(
    (vendor: VendorSearchResult["vendor"]) => {
      onVendorSelect(vendor);
      setIsDropdownOpen(false);
    },
    [onVendorSelect]
  );

  const handleBrandSelect = useCallback(
    (vendorId: number, brandId: number, brandName: string) => {
      onBrandSelect?.(vendorId, brandId, brandName);
    },
    [onBrandSelect]
  );

  const showResults = isDropdownOpen && debouncedSearch.length >= 2;

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          className="pl-9 pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {showClear && searchValue && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Results dropdown */}
      {showResults && (
        <Card className="absolute z-50 w-full mt-1 max-h-96 overflow-y-auto shadow-lg">
          <CardContent className="p-2 space-y-2">
            {isLoading ? (
              // Loading state
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </>
            ) : results.length === 0 ? (
              // No results
              <div className="p-4 text-center text-muted-foreground">
                No vendors found matching "{debouncedSearch}"
              </div>
            ) : (
              // Results list
              results.map((result) => (
                <VendorResultItem
                  key={result.vendor.clientId}
                  result={result}
                  category={category}
                  autoExpandBrands={autoExpandBrands}
                  onVendorSelect={handleVendorSelect}
                  onBrandSelect={handleBrandSelect}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Backdrop to close dropdown when clicking outside */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}

export default VendorSearchWithBrands;
