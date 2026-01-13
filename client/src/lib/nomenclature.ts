/**
 * Nomenclature Utilities - ENH-007
 *
 * Provides dynamic terminology based on product category.
 * For Flower category products, "Brand" becomes "Farmer".
 * For all other categories, "Brand" remains "Brand".
 *
 * Usage:
 *   import { getBrandLabel } from "@/lib/nomenclature";
 *   const label = getBrandLabel(category); // "Farmer" or "Brand"
 */

/**
 * Categories that should use "Farmer" terminology instead of "Brand"
 * These represent products that come directly from growers/farmers
 */
const FARMER_CATEGORIES = [
  "flower",
  "pre-roll",
  "pre-rolls",
  "preroll",
  "prerolls",
  "indoor flower",
  "outdoor flower",
  "greenhouse flower",
  "smalls",
  "shake",
  "trim",
];

/**
 * Check if a category should use "Farmer" terminology
 *
 * @param category - Product category string
 * @returns true if the category represents a farmer-sourced product
 */
export function isFarmerCategory(category?: string | null): boolean {
  if (!category) return false;

  const normalizedCategory = category.toLowerCase().trim();

  return FARMER_CATEGORIES.some(
    (fc) =>
      normalizedCategory === fc ||
      normalizedCategory.includes(fc) ||
      fc.includes(normalizedCategory)
  );
}

/**
 * Get the appropriate label for brand/farmer based on category
 *
 * @param category - Product category (e.g., "Flower", "Concentrate", "Edible")
 * @returns "Farmer" for flower-related categories, "Brand" for all others
 *
 * @example
 *   getBrandLabel("Flower")     // "Farmer"
 *   getBrandLabel("Pre-Roll")   // "Farmer"
 *   getBrandLabel("Edible")     // "Brand"
 *   getBrandLabel("Concentrate") // "Brand"
 *   getBrandLabel(undefined)    // "Brand/Farmer"
 */
export function getBrandLabel(category?: string | null): string {
  if (!category) return "Brand/Farmer";
  return isFarmerCategory(category) ? "Farmer" : "Brand";
}

/**
 * Get the plural form of brand/farmer label
 *
 * @param category - Product category
 * @returns "Farmers" for flower-related categories, "Brands" for all others
 *
 * @example
 *   getBrandLabelPlural("Flower") // "Farmers"
 *   getBrandLabelPlural("Edible") // "Brands"
 */
export function getBrandLabelPlural(category?: string | null): string {
  return getBrandLabel(category) + "s";
}

/**
 * Get the lowercase form of brand/farmer label
 *
 * @param category - Product category
 * @returns "farmer" or "brand"
 */
export function getBrandLabelLower(category?: string | null): string {
  return getBrandLabel(category).toLowerCase();
}

/**
 * Get brand label for mixed categories (multiple categories in view)
 *
 * @param categories - Array of product categories
 * @returns "Brand/Farmer" if mixed, or specific label if all same type
 *
 * @example
 *   getMixedBrandLabel(["Flower", "Pre-Roll"])        // "Farmer"
 *   getMixedBrandLabel(["Edible", "Concentrate"])     // "Brand"
 *   getMixedBrandLabel(["Flower", "Edible"])          // "Brand/Farmer"
 */
export function getMixedBrandLabel(categories: (string | null | undefined)[]): string {
  const validCategories = categories.filter(Boolean) as string[];

  if (validCategories.length === 0) {
    return "Brand/Farmer";
  }

  const hasFarmer = validCategories.some(isFarmerCategory);
  const hasBrand = validCategories.some((c) => !isFarmerCategory(c));

  if (hasFarmer && hasBrand) {
    return "Brand/Farmer";
  }

  return hasFarmer ? "Farmer" : "Brand";
}

/**
 * Format brand name with appropriate label prefix
 *
 * @param brandName - The brand/farmer name
 * @param category - Product category
 * @returns Formatted string like "Farmer: Green Thumb" or "Brand: XYZ Co."
 *
 * @example
 *   formatBrandWithLabel("Green Thumb", "Flower")  // "Farmer: Green Thumb"
 *   formatBrandWithLabel("XYZ Co.", "Edible")      // "Brand: XYZ Co."
 */
export function formatBrandWithLabel(
  brandName: string,
  category?: string | null
): string {
  const label = getBrandLabel(category);
  return `${label}: ${brandName}`;
}

/**
 * Get placeholder text for brand/farmer input fields
 *
 * @param category - Product category
 * @returns Appropriate placeholder text
 *
 * @example
 *   getBrandPlaceholder("Flower") // "Select farmer..."
 *   getBrandPlaceholder("Edible") // "Select brand..."
 */
export function getBrandPlaceholder(category?: string | null): string {
  const label = getBrandLabelLower(category);
  if (!category) {
    return "Select brand/farmer...";
  }
  return `Select ${label}...`;
}

/**
 * Get helper text explaining brand/farmer terminology
 *
 * @param category - Product category
 * @returns Explanatory text for the user
 */
export function getBrandHelperText(category?: string | null): string {
  if (isFarmerCategory(category)) {
    return "The farmer or grower who produced this product";
  }
  return "The brand or manufacturer of this product";
}

// ============================================================================
// VENDOR / SUPPLIER TERMINOLOGY
// ============================================================================

/**
 * Get explanation text for vendor vs brand distinction
 * MEET-027: Clarify that Vendor is the business entity, Brand is the product line
 *
 * @returns Object with vendor and brand explanations
 */
export function getVendorBrandExplanation(): {
  vendorLabel: string;
  vendorDescription: string;
  brandLabel: string;
  brandDescription: string;
} {
  return {
    vendorLabel: "Vendor",
    vendorDescription:
      "The business entity you purchase from. A vendor can supply multiple brands/farmers.",
    brandLabel: "Brand/Farmer",
    brandDescription:
      "The product line or label. For flower products, this represents the farmer/grower.",
  };
}

/**
 * Get vendor context tooltip text
 *
 * @returns Tooltip text explaining vendor relationship
 */
export function getVendorTooltip(): string {
  return "Vendor is the company or business you purchase from. They may represent multiple brands or farmers.";
}

/**
 * Get brand/farmer context tooltip based on category
 *
 * @param category - Product category
 * @returns Tooltip text explaining brand/farmer relationship
 */
export function getBrandTooltip(category?: string | null): string {
  if (isFarmerCategory(category)) {
    return "Farmer is the grower who produced this flower product.";
  }
  return "Brand is the product line or label for this item.";
}

// ============================================================================
// COLUMN HEADER HELPERS
// ============================================================================

/**
 * Get dynamic column header for brand/farmer column in tables
 * Use this in table column definitions to show contextual headers
 *
 * @param rowCategories - Array of categories from visible rows
 * @returns Appropriate column header string
 */
export function getDynamicBrandColumnHeader(
  rowCategories: (string | null | undefined)[]
): string {
  return getMixedBrandLabel(rowCategories);
}

/**
 * Get column header info with tooltip for enhanced tables
 *
 * @param category - Single category or undefined for mixed
 * @returns Object with header text and tooltip
 */
export function getBrandColumnInfo(category?: string | null): {
  header: string;
  tooltip: string;
} {
  return {
    header: getBrandLabel(category),
    tooltip: getBrandTooltip(category),
  };
}
