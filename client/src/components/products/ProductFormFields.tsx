/**
 * ProductFormFields Component - MEET-040
 * Reusable form fields for product creation/editing
 *
 * Features:
 * - Name field with validation
 * - Category dropdown (searchable)
 * - Brand dropdown (searchable)
 * - Subcategory field (conditional on category)
 * - Required field indicators
 * - Validation feedback
 */

import React, { useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronsUpDown, AlertCircle, Loader2 } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductFormData {
  name: string;
  category: string;
  brandId: number | null;
  subcategory?: string;
  strainId?: number | null;
  uomSellable?: string;
  description?: string;
}

export interface ProductFormFieldsProps {
  /** Current form values */
  values: ProductFormData;
  /** Callback when values change */
  onChange: (values: ProductFormData) => void;
  /** Validation errors keyed by field name */
  errors?: Partial<Record<keyof ProductFormData, string>>;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Which fields to show (defaults to all) */
  showFields?: (keyof ProductFormData)[];
  /** Additional CSS classes */
  className?: string;
  /** Layout mode: 'vertical' (default) or 'grid' */
  layout?: "vertical" | "grid";
  /** Whether to show strain field */
  showStrain?: boolean;
  /** Whether to show UOM field */
  showUom?: boolean;
  /** Whether to show description field */
  showDescription?: boolean;
}

// Standard product categories with subcategories (fallback if database not available)
// NOTE: These should match the defaults in server/services/seedDefaults.ts
const PRODUCT_CATEGORIES: Record<string, string[]> = {
  Flower: [
    "Tops/Colas",
    "Smalls/Popcorn",
    "Trim",
    "Shake",
    "Larf",
    "Machine Trim",
    "Hand Trim",
    "Outdoor",
    "Deps",
    "Indoor",
  ],
  Concentrates: [
    "Shatter",
    "Wax",
    "Live Resin",
    "Rosin",
    "Diamonds",
    "Distillate",
    "Crumble",
    "Budder",
  ],
  Edibles: ["Gummies", "Chocolates", "Beverages", "Baked Goods"],
  Vapes: ["Cartridge", "All in One"],
  "Bulk Oil": [],
  "Manufactured Products": ["Preroll", "Edible", "Tincture", "Topical", "Accessory"],
};

// Unit of measure options
const UOM_OPTIONS = [
  { value: "EA", label: "Each (EA)" },
  { value: "G", label: "Gram (G)" },
  { value: "OZ", label: "Ounce (OZ)" },
  { value: "LB", label: "Pound (LB)" },
  { value: "ML", label: "Milliliter (ML)" },
  { value: "MG", label: "Milligram (MG)" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductFormFields({
  values,
  onChange,
  errors = {},
  disabled = false,
  className,
  layout = "vertical",
  showStrain = false,
  showUom = false,
  showDescription = false,
}: ProductFormFieldsProps): React.ReactElement {
  // Fetch brands for dropdown
  const { data: brands, isLoading: brandsLoading } =
    trpc.productCatalogue.getBrands.useQuery();

  // Fetch strains for dropdown (if needed)
  const { data: strains, isLoading: strainsLoading } =
    trpc.productCatalogue.getStrains.useQuery(undefined, {
      enabled: showStrain,
    });

  // Fetch categories with subcategories
  const { data: categoriesData } = trpc.settings.categories.list.useQuery();

  // Fetch subcategories for the selected category
  const { data: subcategoriesData } = trpc.settings.subcategories.list.useQuery(
    { categoryId: values.category ?
      categoriesData?.find(c => c.name === values.category)?.id :
      undefined
    },
    { enabled: !!values.category && !!categoriesData }
  );

  // State for searchable dropdowns
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [brandOpen, setBrandOpen] = React.useState(false);
  const [strainOpen, setStrainOpen] = React.useState(false);

  // Get subcategories based on selected category from database or fallback to hardcoded
  const subcategories = useMemo(() => {
    if (!values.category) return [];
    // Use database subcategories if available
    if (subcategoriesData && subcategoriesData.length > 0) {
      return subcategoriesData.map(sub => sub.name);
    }
    // Fallback to hardcoded categories for backwards compatibility
    return PRODUCT_CATEGORIES[values.category] || [];
  }, [values.category, subcategoriesData]);

  // Handle field changes
  const handleChange = useCallback(
    <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
      const newValues = { ...values, [field]: value };

      // Clear subcategory if category changes
      if (field === "category" && value !== values.category) {
        newValues.subcategory = "";
      }

      onChange(newValues);
    },
    [values, onChange]
  );

  // Selected brand name for display
  const selectedBrandName = useMemo(() => {
    if (!values.brandId || !brands) return null;
    return brands.find(b => b.id === values.brandId)?.name;
  }, [values.brandId, brands]);

  // Selected strain name for display
  const selectedStrainName = useMemo(() => {
    if (!values.strainId || !strains) return null;
    return strains.find(s => s.id === values.strainId)?.name;
  }, [values.strainId, strains]);

  const isGrid = layout === "grid";

  return (
    <div
      className={cn(
        "space-y-4",
        isGrid && "grid grid-cols-2 gap-4 space-y-0",
        className
      )}
    >
      {/* Product Name */}
      <div className={cn("space-y-2", isGrid && "col-span-2")}>
        <Label htmlFor="product-name">
          Product Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="product-name"
          value={values.name}
          onChange={e => handleChange("name", e.target.value)}
          placeholder="Enter product name"
          disabled={disabled}
          className={cn(errors.name && "border-destructive")}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "product-name-error" : undefined}
        />
        {errors.name && (
          <p
            id="product-name-error"
            className="text-xs text-destructive flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Category (Searchable) */}
      <div className="space-y-2">
        <Label>
          Category <span className="text-destructive">*</span>
        </Label>
        <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={categoryOpen}
              disabled={disabled}
              className={cn(
                "w-full justify-between font-normal",
                !values.category && "text-muted-foreground",
                errors.category && "border-destructive"
              )}
            >
              {values.category || "Select category"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
              <CommandInput placeholder="Search categories..." />
              <CommandList>
                <CommandEmpty>No category found.</CommandEmpty>
                <CommandGroup>
                  {Object.keys(PRODUCT_CATEGORIES).map(cat => (
                    <CommandItem
                      key={cat}
                      value={cat}
                      onSelect={() => {
                        handleChange("category", cat);
                        setCategoryOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          values.category === cat ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {cat}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors.category && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.category}
          </p>
        )}
      </div>

      {/* Brand (Searchable) */}
      <div className="space-y-2">
        <Label>
          Brand <span className="text-destructive">*</span>
        </Label>
        <Popover open={brandOpen} onOpenChange={setBrandOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={brandOpen}
              disabled={disabled || brandsLoading}
              className={cn(
                "w-full justify-between font-normal",
                !values.brandId && "text-muted-foreground",
                errors.brandId && "border-destructive"
              )}
            >
              {brandsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                selectedBrandName || "Select brand"
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
              <CommandInput placeholder="Search brands..." />
              <CommandList>
                <CommandEmpty>No brand found.</CommandEmpty>
                <CommandGroup>
                  {brands?.map(brand => (
                    <CommandItem
                      key={brand.id}
                      value={brand.name}
                      onSelect={() => {
                        handleChange("brandId", brand.id);
                        setBrandOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          values.brandId === brand.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {brand.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors.brandId && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.brandId}
          </p>
        )}
      </div>

      {/* Subcategory (Conditional on Category) */}
      {subcategories.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="product-subcategory">Subcategory</Label>
          <Select
            value={values.subcategory || ""}
            onValueChange={v => handleChange("subcategory", v)}
            disabled={disabled}
          >
            <SelectTrigger
              id="product-subcategory"
              className={cn(errors.subcategory && "border-destructive")}
            >
              <SelectValue placeholder="Select subcategory (optional)" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map(sub => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Strain (Optional, Searchable) */}
      {showStrain && (
        <div className="space-y-2">
          <Label>Strain</Label>
          <Popover open={strainOpen} onOpenChange={setStrainOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={strainOpen}
                disabled={disabled || strainsLoading}
                className={cn(
                  "w-full justify-between font-normal",
                  !values.strainId && "text-muted-foreground"
                )}
              >
                {strainsLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  selectedStrainName || "Select strain (optional)"
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Search strains..." />
                <CommandList>
                  <CommandEmpty>No strain found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value=""
                      onSelect={() => {
                        handleChange("strainId", null);
                        setStrainOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !values.strainId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="text-muted-foreground">No strain</span>
                    </CommandItem>
                    {strains?.map(strain => (
                      <CommandItem
                        key={strain.id}
                        value={strain.name}
                        onSelect={() => {
                          handleChange("strainId", strain.id);
                          setStrainOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            values.strainId === strain.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span>{strain.name}</span>
                        {strain.category && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({strain.category})
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* UOM (Optional) */}
      {showUom && (
        <div className="space-y-2">
          <Label htmlFor="product-uom">Unit of Measure</Label>
          <Select
            value={values.uomSellable || "EA"}
            onValueChange={v => handleChange("uomSellable", v)}
            disabled={disabled}
          >
            <SelectTrigger id="product-uom">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {UOM_OPTIONS.map(uom => (
                <SelectItem key={uom.value} value={uom.value}>
                  {uom.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Description (Optional) */}
      {showDescription && (
        <div className={cn("space-y-2", isGrid && "col-span-2")}>
          <Label htmlFor="product-description">Description</Label>
          <Textarea
            id="product-description"
            value={values.description || ""}
            onChange={e => handleChange("description", e.target.value)}
            placeholder="Enter product description (optional)"
            disabled={disabled}
            rows={3}
          />
        </div>
      )}
    </div>
  );
}

export default ProductFormFields;

// Export category data for use elsewhere
export { PRODUCT_CATEGORIES, UOM_OPTIONS };
