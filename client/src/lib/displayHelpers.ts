/**
 * Display Helper Functions (Frontend)
 * Utilities for formatting product names and display strings in the UI
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

