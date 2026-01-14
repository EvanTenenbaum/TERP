/**
 * Subcategory Matching Utility (FEAT-020)
 *
 * Provides logic for matching and scoring subcategory relationships
 * in the cannabis product matching engine.
 *
 * Features:
 * - Exact subcategory matching
 * - Related subcategory scoring (e.g., Smalls, Trim, Shake)
 * - Configurable relationship mappings
 */

import { logger } from "../_core/logger";

/**
 * Define relationships between subcategories
 * Products from the same harvest often have multiple subcategories
 * that can substitute for each other at different match scores
 */
export const SUBCATEGORY_RELATIONSHIPS: Record<string, string[]> = {
  // Premium flower variants
  "Smalls": ["Trim", "Shake", "Popcorn"],
  "Popcorn": ["Smalls", "Trim"],

  // Trim and processing materials
  "Trim": ["Shake", "Smalls"],
  "Shake": ["Trim"],

  // Pre-rolls and processed products
  "Pre-Roll": ["Joints", "Blunts"],
  "Joints": ["Pre-Roll", "Blunts"],
  "Blunts": ["Pre-Roll", "Joints"],

  // Concentrates
  "Shatter": ["Wax", "Crumble", "Budder"],
  "Wax": ["Shatter", "Crumble", "Budder"],
  "Crumble": ["Wax", "Shatter", "Budder"],
  "Budder": ["Wax", "Shatter", "Crumble"],
  "Live Resin": ["Sauce", "Diamonds"],
  "Sauce": ["Live Resin", "Diamonds"],
  "Diamonds": ["Sauce", "Live Resin"],

  // Edibles
  "Gummies": ["Edibles", "Candies"],
  "Candies": ["Gummies", "Edibles"],
  "Chocolates": ["Edibles"],
  "Beverages": ["Drinks", "Tinctures"],
  "Drinks": ["Beverages"],

  // Topicals
  "Cream": ["Lotion", "Balm"],
  "Lotion": ["Cream", "Balm"],
  "Balm": ["Cream", "Lotion"],
};

/**
 * Calculate match score for subcategory comparison
 *
 * @param needSubcat - Subcategory requested by client
 * @param supplySubcat - Subcategory available in supply/inventory
 * @returns Score from 0-100 (100 = exact match, 50 = related, 0 = no match)
 */
export function calculateSubcategoryScore(
  needSubcat: string | null | undefined,
  supplySubcat: string | null | undefined
): number {
  // If either is null/undefined, no match
  if (!needSubcat || !supplySubcat) {
    return 0;
  }

  // Normalize for case-insensitive comparison
  const needNormalized = needSubcat.trim().toLowerCase();
  const supplyNormalized = supplySubcat.trim().toLowerCase();

  // Exact match
  if (needNormalized === supplyNormalized) {
    return 100;
  }

  // Check if they're related subcategories
  const relationships = SUBCATEGORY_RELATIONSHIPS[needSubcat] || [];
  const relatedMatch = relationships.find(
    related => related.toLowerCase() === supplyNormalized
  );

  if (relatedMatch) {
    // Related subcategories get 50 points
    return 50;
  }

  // Also check reverse relationship (if supply has need in its relationships)
  const reverseRelationships = SUBCATEGORY_RELATIONSHIPS[supplySubcat] || [];
  const reverseMatch = reverseRelationships.find(
    related => related.toLowerCase() === needNormalized
  );

  if (reverseMatch) {
    // Related subcategories get 50 points
    return 50;
  }

  // Check for partial string match (e.g., "Live Resin" contains "Resin")
  if (needNormalized.includes(supplyNormalized) || supplyNormalized.includes(needNormalized)) {
    return 30;
  }

  // No match
  return 0;
}

/**
 * Get all related subcategories for a given subcategory
 * Useful for search and recommendation features
 *
 * @param subcategory - The subcategory to find relationships for
 * @returns Array of related subcategory names
 */
export function getRelatedSubcategories(subcategory: string): string[] {
  if (!subcategory) return [];

  const relationships = SUBCATEGORY_RELATIONSHIPS[subcategory] || [];

  // Also check reverse relationships
  const reverseRelated: string[] = [];
  for (const [key, values] of Object.entries(SUBCATEGORY_RELATIONSHIPS)) {
    if (values.includes(subcategory) && key !== subcategory) {
      reverseRelated.push(key);
    }
  }

  // Combine and deduplicate
  return [...new Set([...relationships, ...reverseRelated])];
}

/**
 * Check if two subcategories are related
 *
 * @param subcat1 - First subcategory
 * @param subcat2 - Second subcategory
 * @returns true if they're related, false otherwise
 */
export function areSubcategoriesRelated(
  subcat1: string | null | undefined,
  subcat2: string | null | undefined
): boolean {
  if (!subcat1 || !subcat2) return false;

  const score = calculateSubcategoryScore(subcat1, subcat2);
  return score >= 50; // 50+ means related or exact match
}

/**
 * Get subcategory match reason for display in UI
 *
 * @param needSubcat - Subcategory requested by client
 * @param supplySubcat - Subcategory available in supply/inventory
 * @returns Human-readable match reason
 */
export function getSubcategoryMatchReason(
  needSubcat: string | null | undefined,
  supplySubcat: string | null | undefined
): string | null {
  const score = calculateSubcategoryScore(needSubcat, supplySubcat);

  if (score === 100) {
    return "Exact subcategory match";
  }

  if (score === 50) {
    return `Related subcategory (${supplySubcat} ≈ ${needSubcat})`;
  }

  if (score === 30) {
    return `Partial subcategory match (${supplySubcat} ~ ${needSubcat})`;
  }

  return null;
}

/**
 * Add a custom subcategory relationship
 * Useful for dynamic configuration
 *
 * @param subcategory - The main subcategory
 * @param relatedSubcategories - Array of related subcategories
 */
export function addSubcategoryRelationship(
  subcategory: string,
  relatedSubcategories: string[]
): void {
  try {
    SUBCATEGORY_RELATIONSHIPS[subcategory] = relatedSubcategories;
    logger.info({ subcategory, relatedSubcategories }, "Added custom subcategory relationship");
  } catch (error) {
    logger.error({ error, subcategory }, "Error adding subcategory relationship");
  }
}
