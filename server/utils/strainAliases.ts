/**
 * Strain Aliases Utility
 * Maps common strain abbreviations and alternate names to their canonical forms
 *
 * This solves the problem where:
 * - "GSC" should match "Girl Scout Cookies"
 * - "GDP" should match "Granddaddy Purple"
 * - "GG4" should match "Gorilla Glue #4"
 */

/**
 * Strain alias mappings
 * Key: Canonical name (lowercase)
 * Value: Array of aliases (lowercase)
 */
export const STRAIN_ALIASES: Record<string, string[]> = {
  // Popular abbreviations
  "girl scout cookies": ["gsc", "girl scout cookie"],
  "granddaddy purple": ["gdp", "grand daddy purple", "granddaddy purp"],
  "gorilla glue": ["gg", "gg4", "gorilla glue #4", "original glue"],
  "og kush": ["og", "original gangster kush"],
  "sour diesel": ["sour d", "sour deez"],
  "blue dream": ["bd"],
  "green crack": ["green kush", "cush"],
  "ak-47": ["ak47", "ak 47"],
  "white widow": ["ww"],
  "northern lights": ["nl", "northern light"],
  "super lemon haze": ["slh"],
  trainwreck: ["train wreck"],
  "pineapple express": ["pe"],
  "jack herer": ["jh"],
  "durban poison": ["dp"],

  // Common variants
  "wedding cake": ["pink cookies", "triangle mints"],
  gelato: ["larry bird"],
  "do-si-dos": ["dosidos", "dosi dos", "do si dos"],
  zkittlez: ["skittles", "zkittles"],
  runtz: ["runts"],
  sherbet: ["sherbert", "sunset sherbet"],
  cookies: ["cookie", "girl scout cookies"],

  // OG Family (handled separately by strain family, but aliases help)
  "sfv og": ["san fernando valley og"],
  "tahoe og": ["tahoe og kush"],
  "fire og": ["fire og kush"],
};

/**
 * Normalize strain name for comparison
 * - Lowercase
 * - Trim whitespace
 * - Normalize multiple spaces to single space
 * - Remove special characters (except #)
 */
export function normalizeStrainName(strain: string | null | undefined): string {
  if (!strain) return "";

  return strain
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Multiple spaces to single
    .replace(/[^\w\s#-]/g, "") // Remove special chars except # and -
    .trim();
}

/**
 * Get canonical strain name from potential alias
 * Preserves variant numbers (e.g., "GG4" -> "gorilla glue", but "Gorilla Glue #4" stays "gorilla glue #4")
 * @param strain - Strain name or alias
 * @returns Canonical strain name, or original if no alias found
 */
export function getCanonicalStrainName(
  strain: string | null | undefined
): string {
  if (!strain) return "";

  const normalized = normalizeStrainName(strain);

  // Extract variant number if present
  const variant = normalized.match(/#(\d+)/);
  const variantSuffix = variant ? ` #${variant[1]}` : "";

  // Get base name without variant for alias lookup
  const baseName = normalized.replace(/#\d+/g, "").trim();

  // Check if base is already a canonical name
  if (STRAIN_ALIASES[baseName]) {
    return baseName + variantSuffix;
  }

  // Check if base is an alias
  for (const [canonical, aliases] of Object.entries(STRAIN_ALIASES)) {
    if (aliases.includes(baseName)) {
      return canonical + variantSuffix;
    }
  }

  // Not found in aliases, return normalized original (with variant)
  return normalized;
}

/**
 * Check if two strain names match (considering aliases and variants)
 * Now uses variant-aware matching by default.
 * @param strain1 - First strain name
 * @param strain2 - Second strain name
 * @returns True if strains match (exact, via alias, or with variants)
 */
export function strainsMatch(
  strain1: string | null | undefined,
  strain2: string | null | undefined
): boolean {
  // Use variant-aware matching by default
  return strainsMatchWithVariants(strain1, strain2);
}

/**
 * Check if strain name partially matches (for fuzzy matching)
 * Examples:
 * - "Blue Dream" partially matches "Blue Dream #5"
 * - "OG Kush" partially matches "SFV OG Kush"
 */
export function strainsPartiallyMatch(
  strain1: string | null | undefined,
  strain2: string | null | undefined
): boolean {
  if (!strain1 || !strain2) return false;

  const canonical1 = getCanonicalStrainName(strain1);
  const canonical2 = getCanonicalStrainName(strain2);

  // Check if one contains the other
  return canonical1.includes(canonical2) || canonical2.includes(canonical1);
}

/**
 * Extract base strain name without numbered variant
 * Examples:
 * - "Blue Dream #5" -> "blue dream"
 * - "Gorilla Glue #4" -> "gorilla glue"
 * - "OG Kush" -> "og kush"
 * @param strain - Strain name
 * @returns Base strain name without variant number
 */
export function getBaseStrainName(strain: string | null | undefined): string {
  if (!strain) return "";

  const normalized = normalizeStrainName(strain);

  // Remove numbered variant pattern (#1, #2, #4, etc.)
  const withoutVariant = normalized.replace(/#\d+/g, "").trim();

  return withoutVariant;
}

/**
 * Extract variant number from strain name
 * Examples:
 * - "Blue Dream #5" -> "5"
 * - "Gorilla Glue #4" -> "4"
 * - "OG Kush" -> null
 * @param strain - Strain name
 * @returns Variant number or null if no variant
 */
export function getStrainVariant(
  strain: string | null | undefined
): string | null {
  if (!strain) return null;

  const normalized = normalizeStrainName(strain);
  const match = normalized.match(/#(\d+)/);

  return match ? match[1] : null;
}

/**
 * Check if two strains match considering numbered variants
 * Matching rules:
 * - Exact match (same base, same variant or both no variant): TRUE
 * - Base match with one having variant, other not: TRUE
 * - Same base but different variants: FALSE
 *
 * Examples:
 * - "Blue Dream" + "Blue Dream #5" = TRUE (base matches, one generic)
 * - "Blue Dream #5" + "Blue Dream #5" = TRUE (exact match)
 * - "Blue Dream #5" + "Blue Dream #6" = FALSE (different variants)
 * - "GSC" + "Girl Scout Cookies #3" = TRUE (alias match, one generic)
 *
 * @param strain1 - First strain name
 * @param strain2 - Second strain name
 * @returns True if strains match considering variants
 */
export function strainsMatchWithVariants(
  strain1: string | null | undefined,
  strain2: string | null | undefined
): boolean {
  if (!strain1 || !strain2) return false;

  // Get canonical names first (handles aliases like GSC -> Girl Scout Cookies)
  const canonical1 = getCanonicalStrainName(strain1);
  const canonical2 = getCanonicalStrainName(strain2);

  // Get base names (without variant numbers)
  const base1 = getBaseStrainName(canonical1);
  const base2 = getBaseStrainName(canonical2);

  // If base names don't match, no match
  if (base1 !== base2) return false;

  // Base names match, check variants
  const variant1 = getStrainVariant(canonical1);
  const variant2 = getStrainVariant(canonical2);

  // If both have no variant, it's a match
  if (!variant1 && !variant2) return true;

  // If one has variant and other doesn't, it's a match (generic + specific)
  if (!variant1 || !variant2) return true;

  // Both have variants, they must match
  return variant1 === variant2;
}

/**
 * Get all known aliases for a strain
 * @param strain - Strain name
 * @returns Array of aliases (including canonical name)
 */
export function getStrainAliases(strain: string | null | undefined): string[] {
  if (!strain) return [];

  const canonical = getCanonicalStrainName(strain);
  const aliases = STRAIN_ALIASES[canonical] || [];

  return [canonical, ...aliases];
}

/**
 * Normalize grade for comparison
 * Handles variations like:
 * - "A+" = "A Plus" = "A+"
 * - "B" = "B Grade" = "b"
 */
export function normalizeGrade(grade: string | null | undefined): string {
  if (!grade) return "";

  return grade
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*plus\s*/gi, "+")
    .replace(/\s*minus\s*/gi, "-")
    .replace(/\s*grade\s*/gi, "")
    .replace(/\s+/g, "") // Remove any remaining spaces
    .trim();
}

/**
 * Normalize category for comparison
 */
export function normalizeCategory(category: string | null | undefined): string {
  if (!category) return "";

  return category.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Normalize unit for comparison
 * - "lbs" = "lb" = "pounds" = "pound"
 * - "oz" = "ounce" = "ounces"
 * - "g" = "gram" = "grams"
 */
export function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return "lb"; // Default to pounds

  const normalized = unit.toLowerCase().trim();

  // Pounds
  if (["lb", "lbs", "pound", "pounds"].includes(normalized)) {
    return "lb";
  }

  // Ounces
  if (["oz", "ounce", "ounces"].includes(normalized)) {
    return "oz";
  }

  // Grams
  if (["g", "gram", "grams"].includes(normalized)) {
    return "g";
  }

  // Kilograms
  if (["kg", "kilo", "kilogram", "kilograms"].includes(normalized)) {
    return "kg";
  }

  return normalized;
}
