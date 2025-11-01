/**
 * Display Helper Functions
 * Utilities for formatting product names and display strings
 * 
 * Handles the flower vs non-flower product naming convention:
 * - Flower: strain name only (e.g., "Blue Dream")
 * - Non-flower: product name + strain (e.g., "Ceramic 510 Cart - OG Kush")
 */

export interface ProductInfo {
  category?: string | null;
  productName?: string | null;
  strain?: string | null;
  subcategory?: string | null;
  grade?: string | null;
}

/**
 * Check if a category is considered "flower"
 */
export function isFlowerCategory(category?: string | null): boolean {
  if (!category) return false;
  const cat = category.toLowerCase().trim();
  return cat === 'flower' || cat === 'flowers';
}

/**
 * Get display name for a product based on category
 * 
 * Rules:
 * - Flower: Show strain name only
 * - Non-Flower with both: Show "Product Name - Strain"
 * - Non-Flower with name only: Show product name
 * - Non-Flower with strain only: Show strain (fallback)
 * - Nothing: Show "Unknown Product"
 * 
 * @param item Product information object
 * @returns Formatted display name
 */
export function getProductDisplayName(item: ProductInfo): string {
  const isFlower = isFlowerCategory(item.category);
  
  if (isFlower) {
    // Flower: strain name is the product name
    return item.strain || 'Unknown Strain';
  } else {
    // Non-flower: combine product name and strain
    if (item.productName && item.strain) {
      return `${item.productName} - ${item.strain}`;
    } else if (item.productName) {
      return item.productName;
    } else if (item.strain) {
      // Fallback: if only strain is provided for non-flower
      return item.strain;
    }
    return 'Unknown Product';
  }
}

/**
 * Get full display string including category and grade
 * 
 * @param item Product information object
 * @returns Full formatted display string
 */
export function getFullDisplayName(item: ProductInfo): string {
  const baseName = getProductDisplayName(item);
  const parts = [baseName];
  
  if (item.subcategory) {
    parts.push(item.subcategory);
  } else if (item.category && !isFlowerCategory(item.category)) {
    parts.push(item.category);
  }
  
  if (item.grade) {
    parts.push(`Grade ${item.grade}`);
  }
  
  return parts.join(' • ');
}

/**
 * Validate product fields based on category
 * 
 * @param item Product information object
 * @returns Validation result with errors if any
 */
export function validateProductFields(item: ProductInfo): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const isFlower = isFlowerCategory(item.category);
  
  if (!item.category) {
    errors.push('Category is required');
  }
  
  if (isFlower) {
    // Flower: strain is required
    if (!item.strain) {
      errors.push('Strain is required for flower products');
    }
  } else {
    // Non-flower: product name OR strain is required (at least one)
    if (!item.productName && !item.strain) {
      errors.push('Product name or strain is required for non-flower products');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get search terms for a product (for matching/filtering)
 * 
 * @param item Product information object
 * @returns Array of search terms
 */
export function getProductSearchTerms(item: ProductInfo): string[] {
  const terms: string[] = [];
  
  if (item.strain) terms.push(item.strain.toLowerCase());
  if (item.productName) terms.push(item.productName.toLowerCase());
  if (item.category) terms.push(item.category.toLowerCase());
  if (item.subcategory) terms.push(item.subcategory.toLowerCase());
  if (item.grade) terms.push(item.grade.toLowerCase());
  
  return terms;
}

/**
 * Check if a product matches a search query
 * 
 * @param item Product information object
 * @param query Search query string
 * @returns True if product matches query
 */
export function matchesSearchQuery(item: ProductInfo, query: string): boolean {
  if (!query) return true;
  
  const searchTerms = getProductSearchTerms(item);
  const queryLower = query.toLowerCase().trim();
  
  return searchTerms.some(term => term.includes(queryLower));
}

