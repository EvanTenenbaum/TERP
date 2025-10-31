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
 * @param strain - Strain name or alias
 * @returns Canonical strain name, or original if no alias found
 */
export function getCanonicalStrainName(
  strain: string | null | undefined
): string {
  if (!strain) return "";

  const normalized = normalizeStrainName(strain);

  // Check if this is already a canonical name
  if (STRAIN_ALIASES[normalized]) {
    return normalized;
  }

  // Check if this is an alias
  for (const [canonical, aliases] of Object.entries(STRAIN_ALIASES)) {
    if (aliases.includes(normalized)) {
      return canonical;
    }
  }

  // Not found in aliases, return normalized original
  return normalized;
}

/**
 * Check if two strain names match (considering aliases)
 * @param strain1 - First strain name
 * @param strain2 - Second strain name
 * @returns True if strains match (exact or via alias)
 */
export function strainsMatch(
  strain1: string | null | undefined,
  strain2: string | null | undefined
): boolean {
  if (!strain1 || !strain2) return false;

  const canonical1 = getCanonicalStrainName(strain1);
  const canonical2 = getCanonicalStrainName(strain2);

  return canonical1 === canonical2;
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
