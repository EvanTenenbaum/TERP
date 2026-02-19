/**
 * Strain Name Matching Utility (Production Version)
 *
 * Provides fuzzy matching for strain names to ensure consistency
 * across different product SKUs and user inputs.
 *
 * Features:
 * - Exact match detection
 * - Fuzzy matching with similarity scores
 * - Normalization of strain names
 * - Suggestion system for close matches
 * - Transaction support for race condition prevention
 * - Input validation and error handling
 * - Performance optimizations
 */

import { getDb } from "./db";
import { strains } from "../drizzle/schema";
import { eq, like, or } from "drizzle-orm";
import { generateStrainULID } from "./ulid";
import { extractBaseStrainName } from "./strainFamilyDetector";
import { logger } from "./_core/logger";

/** Extract insert ID from MySQL result (handles both array and direct result formats) */
function extractInsertId(result: unknown): number {
  if (Array.isArray(result)) {
    const header = result[0] as { insertId?: number };
    return header?.insertId ?? 0;
  }
  if (result && typeof result === "object" && "insertId" in result) {
    return (result as { insertId: number }).insertId;
  }
  return 0;
}

/**
 * Normalize strain name for matching
 * Removes special characters, extra spaces, and converts to lowercase
 *
 * @throws Error if name is invalid
 */
export function normalizeStrainName(name: string): string {
  // Validation
  if (!name || typeof name !== "string") {
    throw new Error("Strain name must be a non-empty string");
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new Error("Strain name cannot be empty");
  }

  if (trimmed.length > 255) {
    throw new Error("Strain name cannot exceed 255 characters");
  }

  // Sanitize and normalize
  return trimmed
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, " ") // Normalize spaces
    .replace(/\s/g, "-") // Convert to slug
    .replace(/-+/g, "-") // Remove duplicate hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Calculate Levenshtein distance between two strings (space-optimized)
 * Used for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  // Optimization: If strings are too different in length, return early
  const lenDiff = Math.abs(str1.length - str2.length);
  if (lenDiff > 50) {
    return Math.max(str1.length, str2.length);
  }

  // Limit string length for performance (most strain names are < 50 chars)
  const maxLen = 100;
  const s1 = str1.substring(0, maxLen);
  const s2 = str2.substring(0, maxLen);

  const len1 = s1.length;
  const len2 = s2.length;

  // Use space-optimized algorithm (only need 2 rows instead of full matrix)
  let prevRow = new Array(len2 + 1);
  let currRow = new Array(len2 + 1);

  // Initialize first row
  for (let j = 0; j <= len2; j++) {
    prevRow[j] = j;
  }

  // Calculate distance
  for (let i = 1; i <= len1; i++) {
    currRow[0] = i;
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    // Swap rows
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[len2];
}

/**
 * Calculate similarity score between two strings (0-100)
 * 100 = exact match, 0 = completely different
 *
 * Improvements over basic Levenshtein:
 * - Handles word order differences
 * - Bonus for matching prefixes
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeStrainName(str1);
  const normalized2 = normalizeStrainName(str2);

  // Exact match
  if (normalized1 === normalized2) {
    return 100;
  }

  // Check word order (tokenize and sort)
  const tokens1 = normalized1.split("-").sort().join("-");
  const tokens2 = normalized2.split("-").sort().join("-");
  if (tokens1 === tokens2) {
    return 95; // Very high match (same words, different order)
  }

  // Levenshtein distance
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  let similarity = ((maxLength - distance) / maxLength) * 100;

  // Bonus for matching prefixes (common in strain names like "Blue Dream" vs "Blue Dream Haze")
  const prefixLen = Math.min(5, normalized1.length, normalized2.length);
  if (
    normalized1.substring(0, prefixLen) === normalized2.substring(0, prefixLen)
  ) {
    similarity = Math.min(100, similarity + 5);
  }

  return Math.round(similarity);
}

/**
 * Match result interface
 */
export interface StrainMatch {
  id: number;
  name: string;
  standardizedName: string;
  category: string | null;
  openthcId: string | null;
  similarity: number;
  matchType: "exact" | "fuzzy" | "partial";
}

/**
 * Find exact strain match
 */
export async function findExactStrainMatch(
  inputName: string
): Promise<StrainMatch | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const normalized = normalizeStrainName(inputName);

    // Try exact match on standardizedName
    const exactMatch = await db
      .select()
      .from(strains)
      .where(eq(strains.standardizedName, normalized))
      .limit(1);

    if (exactMatch.length > 0) {
      const strain = exactMatch[0];
      return {
        id: strain.id,
        name: strain.name,
        standardizedName: strain.standardizedName,
        category: strain.category,
        openthcId: strain.openthcId,
        similarity: 100,
        matchType: "exact",
      };
    }

    return null;
  } catch (error) {
    logger.error({ error }, "Error finding exact strain match");
    throw error;
  }
}

/**
 * Find fuzzy strain matches (OPTIMIZED)
 * Returns matches with similarity >= threshold (default 80%)
 */
export async function findFuzzyStrainMatches(
  inputName: string,
  threshold: number = 80,
  limit: number = 5
): Promise<StrainMatch[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Validate input
    if (!inputName || inputName.trim().length === 0) {
      return [];
    }

    const normalized = normalizeStrainName(inputName);

    // Use prefix match for better index usage (can use idx_strains_standardized)
    const prefix = normalized.substring(0, Math.min(5, normalized.length));

    // Query with optimized WHERE clause (uses indexes)
    const candidateStrains = await db
      .select()
      .from(strains)
      .where(
        or(
          like(strains.standardizedName, `${prefix}%`), // Prefix match (uses index)
          like(strains.name, `${inputName.substring(0, 5)}%`) // Prefix match (uses index)
        )
      )
      .limit(100); // Reduced from 1000 for performance

    // Calculate similarity for each candidate
    const matches: StrainMatch[] = [];

    for (const strain of candidateStrains) {
      const similarity = calculateSimilarity(inputName, strain.name);

      if (similarity >= threshold) {
        matches.push({
          id: strain.id,
          name: strain.name,
          standardizedName: strain.standardizedName,
          category: strain.category,
          openthcId: strain.openthcId,
          similarity,
          matchType: similarity === 100 ? "exact" : "fuzzy",
        });
      }
    }

    // Sort by similarity (highest first)
    matches.sort((a, b) => b.similarity - a.similarity);

    return matches.slice(0, limit);
  } catch (error) {
    logger.error({ error }, "Error finding fuzzy strain matches");
    throw error;
  }
}

/**
 * Find strain match with automatic or suggested assignment
 *
 * Returns:
 * - { action: 'auto', match } if exact match found (auto-assign)
 * - { action: 'suggest', matches } if fuzzy matches found (user confirmation needed)
 * - { action: 'create', normalized } if no matches found (create new strain)
 */
export async function matchStrainForAssignment(
  inputName: string,
  autoAssignThreshold: number = 95,
  suggestThreshold: number = 80
): Promise<
  | { action: "auto"; match: StrainMatch }
  | { action: "suggest"; matches: StrainMatch[] }
  | { action: "create"; normalized: string }
> {
  try {
    // Try exact match first
    const exactMatch = await findExactStrainMatch(inputName);
    if (exactMatch) {
      return { action: "auto", match: exactMatch };
    }

    // Try fuzzy matching
    const fuzzyMatches = await findFuzzyStrainMatches(
      inputName,
      suggestThreshold
    );

    if (fuzzyMatches.length > 0) {
      // If best match is above auto-assign threshold, auto-assign
      if (fuzzyMatches[0].similarity >= autoAssignThreshold) {
        return { action: "auto", match: fuzzyMatches[0] };
      }

      // Otherwise, suggest matches for user confirmation
      return { action: "suggest", matches: fuzzyMatches };
    }

    // No matches found, suggest creating new strain
    return { action: "create", normalized: normalizeStrainName(inputName) };
  } catch (error) {
    logger.error({ error }, "Error matching strain for assignment");
    throw error;
  }
}

/**
 * Search strains with fuzzy matching
 * Used for autocomplete/search functionality
 */
export async function searchStrains(
  query: string,
  limit: number = 10
): Promise<StrainMatch[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Validate input
    if (!query || query.trim().length === 0) {
      return [];
    }

    const normalized = normalizeStrainName(query);
    const prefix = normalized.substring(0, Math.min(5, normalized.length));

    // Get strains that start with or contain the query (uses indexes)
    const results = await db
      .select()
      .from(strains)
      .where(
        or(
          like(strains.standardizedName, `${prefix}%`),
          like(strains.name, `${query.substring(0, 5)}%`)
        )
      )
      .limit(limit * 2); // Get more for scoring

    // Calculate similarity and sort
    const matches: StrainMatch[] = results.map(strain => ({
      id: strain.id,
      name: strain.name,
      standardizedName: strain.standardizedName,
      category: strain.category,
      openthcId: strain.openthcId,
      similarity: calculateSimilarity(query, strain.name),
      matchType: "partial" as const,
    }));

    matches.sort((a, b) => b.similarity - a.similarity);

    return matches.slice(0, limit);
  } catch (error) {
    logger.error({ error }, "Error searching strains");
    throw error;
  }
}

/**
 * Get or create strain with fuzzy matching (PRODUCTION VERSION)
 *
 * This is the main function to use when assigning strains to products.
 * It will:
 * 1. Try to find exact match
 * 2. Try to find fuzzy match above threshold
 * 3. Create new strain if no match found (with transaction to prevent duplicates)
 *
 * Returns: { strainId, wasCreated, requiresConfirmation, matches }
 */
export async function getOrCreateStrain(
  inputName: string,
  category?: "indica" | "sativa" | "hybrid",
  autoAssignThreshold: number = 95
): Promise<{
  strainId: number | null;
  wasCreated: boolean;
  requiresConfirmation: boolean;
  matches: StrainMatch[];
}> {
  try {
    const matchResult = await matchStrainForAssignment(
      inputName,
      autoAssignThreshold
    );

    if (matchResult.action === "auto") {
      // Auto-assign to existing strain
      return {
        strainId: matchResult.match.id,
        wasCreated: false,
        requiresConfirmation: false,
        matches: [matchResult.match],
      };
    }

    if (matchResult.action === "suggest") {
      // Requires user confirmation
      return {
        strainId: null,
        wasCreated: false,
        requiresConfirmation: true,
        matches: matchResult.matches,
      };
    }

    // Create new strain with transaction to prevent race conditions
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const result = await db.transaction(async tx => {
      const normalized = normalizeStrainName(inputName);

      // Check again within transaction with row lock
      const existing = await tx
        .select()
        .from(strains)
        .where(eq(strains.standardizedName, normalized))
        .for("update")
        .limit(1);

      if (existing.length > 0) {
        // Another transaction created it between our check and now
        return {
          strainId: existing[0].id,
          wasCreated: false,
        };
      }

      // Generate ULID for new strain (compatible with OpenTHC format)
      const newULID = generateStrainULID();

      // Extract base strain name for family detection
      const baseName = extractBaseStrainName(inputName);

      // Find parent strain if base name exists
      let parentStrainId: number | null = null;
      if (baseName) {
        const parentStrain = await tx
          .select()
          .from(strains)
          .where(
            or(eq(strains.name, baseName), eq(strains.baseStrainName, baseName))
          )
          .limit(1);

        if (parentStrain.length > 0) {
          parentStrainId = parentStrain[0].id;
        } else if (inputName.toLowerCase() !== baseName.toLowerCase()) {
          // Create parent strain if it doesn't exist and this is a variant
          const parentULID = generateStrainULID();
          const parentResult = await tx.insert(strains).values({
            name: baseName,
            standardizedName: normalizeStrainName(baseName),
            category: category || null,
            description: null,
            aliases: null,
            openthcId: parentULID,
            openthcStub: normalizeStrainName(baseName),
            baseStrainName: baseName,
            parentStrainId: null,
          });
          parentStrainId = extractInsertId(parentResult);
        }
      }

      // Create new strain with family links
      const newStrain = await tx.insert(strains).values({
        name: inputName,
        standardizedName: normalized,
        category: category || null,
        description: null,
        aliases: null,
        openthcId: newULID,
        openthcStub: normalized,
        baseStrainName: baseName,
        parentStrainId: parentStrainId,
      });

      return {
        strainId: extractInsertId(newStrain),
        wasCreated: true,
      };
    });

    return {
      strainId: result.strainId,
      wasCreated: result.wasCreated,
      requiresConfirmation: false,
      matches: [],
    };
  } catch (error) {
    logger.error({ error }, "Error getting or creating strain");
    throw new Error(
      `Failed to process strain: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
