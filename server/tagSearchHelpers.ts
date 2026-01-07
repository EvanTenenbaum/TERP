/**
 * Tag Search Helper Functions
 * 
 * Extracted from advancedTagFeatures.ts for better modularity
 * Handles tokenization and evaluation of boolean tag search expressions
 */

import { getDb } from "./db";
import { tags, productTags } from "../drizzle/schema";
import { inArray, sql } from "drizzle-orm";
import { safeInArray } from "./lib/sqlSafety";

/**
 * Tokenize search expression
 * Splits expression into tokens for boolean evaluation
 */
export function tokenizeSearchExpression(expression: string): string[] {
  // Remove extra spaces and split by operators
  const normalized = expression.replace(/\s+/g, ' ').trim();
  const tokens = normalized.match(/\(|\)|AND|OR|NOT|[^\s()]+/g) || [];
  return tokens;
}

/**
 * Evaluate boolean expression
 * Simplified implementation - handles basic AND, OR, NOT
 * 
 * @param tokens - Tokenized search expression
 * @returns Array of product IDs matching the search criteria
 */
export async function evaluateBooleanExpression(tokens: string[]): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // For simplicity, we'll handle basic cases
  // A full implementation would build an AST and evaluate it
  
  const andTerms: string[] = [];
  const orTerms: string[] = [];
  const notTerms: string[] = [];
  
  let currentOperator = "AND";
  let negate = false;

  for (let i = 0; i < tokens.length; i++) {
    const term = tokens[i];

    if (term === "AND") {
      currentOperator = "AND";
    } else if (term === "OR") {
      currentOperator = "OR";
    } else if (term === "NOT") {
      negate = true;
    } else if (term !== "(" && term !== ")") {
      // It's a tag name
      if (negate) {
        notTerms.push(term.toLowerCase());
        negate = false;
      } else if (currentOperator === "OR") {
        orTerms.push(term.toLowerCase());
      } else {
        andTerms.push(term.toLowerCase());
      }
    }
  }

  // Get products matching the criteria
  let productIds: number[] = [];

  // Start with AND terms (must have all)
  if (andTerms.length > 0) {
    // Use inArray with lowercase comparison for safe SQL (prevents SQL injection)
    const andTags = await db.select()
      .from(tags)
      .where(inArray(sql`lower(${tags.name})`, andTerms));

    if (andTags.length === 0) return [];

    const andTagIds = andTags.map(t => t.id);

    // Get products that have ALL these tags
    // Use safeInArray for SQL safety - handles empty arrays gracefully
    const productTagsResult = await db.select()
      .from(productTags)
      .where(safeInArray(productTags.tagId, andTagIds));

    // Count how many required tags each product has
    const productTagCounts: Record<number, number> = {};
    for (const pt of productTagsResult) {
      productTagCounts[pt.productId] = (productTagCounts[pt.productId] || 0) + 1;
    }

    // Filter to products that have all required tags
    productIds = Object.entries(productTagCounts)
      .filter(([_, count]) => count === andTagIds.length)
      .map(([id, _]) => parseInt(id));
  }

  // Add OR terms (must have at least one)
  if (orTerms.length > 0) {
    // Use inArray with lowercase comparison for safe SQL (prevents SQL injection)
    const orTags = await db.select()
      .from(tags)
      .where(inArray(sql`lower(${tags.name})`, orTerms));

    const orTagIds = orTags.map(t => t.id);

    // Use safeInArray for SQL safety - handles empty arrays gracefully
    const orProductTags = await db.select()
      .from(productTags)
      .where(safeInArray(productTags.tagId, orTagIds));

    const orProductIds = Array.from(new Set(orProductTags.map(pt => pt.productId)));

    if (andTerms.length === 0) {
      productIds = orProductIds;
    } else {
      // Intersect with existing results
      productIds = productIds.filter(id => orProductIds.includes(id));
    }
  }

  // Remove NOT terms (must not have any)
  if (notTerms.length > 0) {
    // Use inArray with lowercase comparison for safe SQL (prevents SQL injection)
    const notTags = await db.select()
      .from(tags)
      .where(inArray(sql`lower(${tags.name})`, notTerms));

    const notTagIds = notTags.map(t => t.id);

    // Use safeInArray for SQL safety - handles empty arrays gracefully
    const notProductTags = await db.select()
      .from(productTags)
      .where(safeInArray(productTags.tagId, notTagIds));

    const notProductIds = new Set(notProductTags.map(pt => pt.productId));

    productIds = productIds.filter(id => !notProductIds.has(id));
  }

  return productIds;
}
