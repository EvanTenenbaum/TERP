/**
 * AdvancedFilters Component
 * Provides comprehensive filtering and sorting for inventory in sales sheets
 * SALES-SHEET-IMPROVEMENTS: New component for advanced filtering capabilities
 */

import { useMemo, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";
import type {
  PricedInventoryItem,
  InventoryFilters,
  InventorySortConfig,
  DEFAULT_FILTERS,
} from "./types";

interface FilterOptions {
  categories: string[];
  grades: string[];
  strainFamilies: string[];
  vendors: string[];
  priceRange: { min: number; max: number };
}

interface AdvancedFiltersProps {
  filters: InventoryFilters;
  sort: InventorySortConfig;
  onFiltersChange: (filters: InventoryFilters) => void;
  onSortChange: (sort: InventorySortConfig) => void;
  inventory: PricedInventoryItem[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export function AdvancedFilters({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  inventory,
  isOpen,
  onOpenChange,
}: AdvancedFiltersProps) {
  // FIX: Local state for search with debouncing to prevent excessive re-filtering
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Sync local search with external filters when they change
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Debounce search updates
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ ...filters, search: localSearch });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [localSearch, filters, onFiltersChange]);

  // Extract unique filter options from inventory
  const filterOptions = useMemo<FilterOptions>(() => {
    const categories = new Set<string>();
    const grades = new Set<string>();
    const strainFamilies = new Set<string>();
    const vendors = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = 0;

    inventory.forEach((item) => {
      if (item.category) categories.add(item.category);
      if (item.grade) grades.add(item.grade);
      if (item.strainFamily) strainFamilies.add(item.strainFamily);
      if (item.vendor) vendors.add(item.vendor);
      if (item.retailPrice < minPrice) minPrice = item.retailPrice;
      if (item.retailPrice > maxPrice) maxPrice = item.retailPrice;
    });

    return {
      categories: Array.from(categories).sort(),
      grades: Array.from(grades).sort(),
      strainFamilies: Array.from(strainFamilies).sort(),
      vendors: Array.from(vendors).sort(),
      priceRange: {
        min: minPrice === Infinity ? 0 : Math.floor(minPrice),
        max: maxPrice === 0 ? 1000 : Math.ceil(maxPrice),
      },
    };
  }, [inventory]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categories.length > 0) count++;
    if (filters.grades.length > 0) count++;
    if (filters.strainFamilies.length > 0) count++;
    if (filters.vendors.length > 0) count++;
    if (filters.priceMin !== null || filters.priceMax !== null) count++;
    if (filters.inStockOnly) count++;
    return count;
  }, [filters]);

  // Handle multi-select toggle
  const toggleArrayFilter = useCallback(
    (
      key: "categories" | "grades" | "strainFamilies" | "vendors",
      value: string
    ) => {
      const currentValues = filters[key];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      onFiltersChange({ ...filters, [key]: newValues });
    },
    [filters, onFiltersChange]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    setLocalSearch(""); // FIX: Also reset local search state
    onFiltersChange({
      search: "",
      categories: [],
      grades: [],
      priceMin: null,
      priceMax: null,
      strainFamilies: [],
      vendors: [],
      inStockOnly: false,
    });
  }, [onFiltersChange]);

  // Handle price range change
  const handlePriceRangeChange = useCallback(
    (values: number[]) => {
      onFiltersChange({
        ...filters,
        priceMin: values[0] === filterOptions.priceRange.min ? null : values[0],
        priceMax: values[1] === filterOptions.priceRange.max ? null : values[1],
      });
    },
    [filters, filterOptions.priceRange, onFiltersChange]
  );

  // Sort field options
  const sortFields = [
    { value: "name", label: "Name" },
    { value: "category", label: "Category" },
    { value: "retailPrice", label: "Price" },
    { value: "quantity", label: "Quantity" },
    { value: "grade", label: "Grade" },
  ] as const;

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <div className="flex items-center gap-2">
          {/* Sort Controls */}
          <div className="flex items-center gap-1">
            <Select
              value={sort.field}
              onValueChange={(value) =>
                onSortChange({
                  ...sort,
                  field: value as InventorySortConfig["field"],
                })
              }
            >
              <SelectTrigger className="w-[120px] h-8">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortFields.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() =>
                onSortChange({
                  ...sort,
                  direction: sort.direction === "asc" ? "desc" : "asc",
                })
              }
            >
              {sort.direction === "asc" ? "A-Z" : "Z-A"}
            </Button>
          </div>

          {/* Reset Button */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <CollapsibleContent>
        <div className="border rounded-lg p-4 mb-4 space-y-4 bg-muted/30">
          {/* Row 1: Search and In Stock Toggle */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search-filter" className="text-xs">
                Search
              </Label>
              <Input
                id="search-filter"
                placeholder="Search by name, category, strain..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="h-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="in-stock-filter"
                checked={filters.inStockOnly}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, inStockOnly: checked })
                }
              />
              <Label htmlFor="in-stock-filter" className="text-sm cursor-pointer">
                In Stock Only
              </Label>
            </div>
          </div>

          {/* Row 2: Multi-select dropdowns */}
          <div className="flex flex-wrap gap-2">
            {/* Categories */}
            {filterOptions.categories.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    Category
                    {filters.categories.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1">
                        {filters.categories.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Categories</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {filterOptions.categories.map((category) => (
                    <DropdownMenuCheckboxItem
                      key={category}
                      checked={filters.categories.includes(category)}
                      onCheckedChange={() =>
                        toggleArrayFilter("categories", category)
                      }
                    >
                      {category}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Grades */}
            {filterOptions.grades.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    Grade
                    {filters.grades.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1">
                        {filters.grades.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-32">
                  <DropdownMenuLabel>Grades</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {filterOptions.grades.map((grade) => (
                    <DropdownMenuCheckboxItem
                      key={grade}
                      checked={filters.grades.includes(grade)}
                      onCheckedChange={() => toggleArrayFilter("grades", grade)}
                    >
                      {grade}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Strain Families */}
            {filterOptions.strainFamilies.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    Strain
                    {filters.strainFamilies.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1">
                        {filters.strainFamilies.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Strain Families</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {filterOptions.strainFamilies.map((strain) => (
                    <DropdownMenuCheckboxItem
                      key={strain}
                      checked={filters.strainFamilies.includes(strain)}
                      onCheckedChange={() =>
                        toggleArrayFilter("strainFamilies", strain)
                      }
                    >
                      {strain}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Vendors */}
            {filterOptions.vendors.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    Vendor
                    {filters.vendors.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1">
                        {filters.vendors.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Vendors</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {filterOptions.vendors.map((vendor) => (
                    <DropdownMenuCheckboxItem
                      key={vendor}
                      checked={filters.vendors.includes(vendor)}
                      onCheckedChange={() =>
                        toggleArrayFilter("vendors", vendor)
                      }
                    >
                      {vendor}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Row 3: Price Range */}
          {filterOptions.priceRange.max > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Price Range</Label>
                <span className="text-xs text-muted-foreground">
                  ${filters.priceMin ?? filterOptions.priceRange.min} - $
                  {filters.priceMax ?? filterOptions.priceRange.max}
                </span>
              </div>
              <Slider
                value={[
                  filters.priceMin ?? filterOptions.priceRange.min,
                  filters.priceMax ?? filterOptions.priceRange.max,
                ]}
                min={filterOptions.priceRange.min}
                max={filterOptions.priceRange.max}
                step={1}
                onValueChange={handlePriceRangeChange}
                className="w-full"
              />
            </div>
          )}

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Search: {filters.search}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, search: "" })}
                  />
                </Badge>
              )}
              {filters.categories.map((cat) => (
                <Badge key={cat} variant="secondary" className="gap-1">
                  {cat}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => toggleArrayFilter("categories", cat)}
                  />
                </Badge>
              ))}
              {filters.grades.map((grade) => (
                <Badge key={grade} variant="secondary" className="gap-1">
                  Grade: {grade}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => toggleArrayFilter("grades", grade)}
                  />
                </Badge>
              ))}
              {filters.strainFamilies.map((strain) => (
                <Badge key={strain} variant="secondary" className="gap-1">
                  {strain}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => toggleArrayFilter("strainFamilies", strain)}
                  />
                </Badge>
              ))}
              {filters.vendors.map((vendor) => (
                <Badge key={vendor} variant="secondary" className="gap-1">
                  {vendor}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => toggleArrayFilter("vendors", vendor)}
                  />
                </Badge>
              ))}
              {(filters.priceMin !== null || filters.priceMax !== null) && (
                <Badge variant="secondary" className="gap-1">
                  ${filters.priceMin ?? 0} - ${filters.priceMax ?? "∞"}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        priceMin: null,
                        priceMax: null,
                      })
                    }
                  />
                </Badge>
              )}
              {filters.inStockOnly && (
                <Badge variant="secondary" className="gap-1">
                  In Stock Only
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      onFiltersChange({ ...filters, inStockOnly: false })
                    }
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
