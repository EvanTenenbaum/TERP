/**
 * Global Search Router
 * Provides unified search across quotes, customers, products, and batches
 * Version 2.2 - BUG-042 Expanded Search with Performance Indexes
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { clients, batches, orders, products } from "../../drizzle/schema";
import { like, or, and, eq, sql, isNull } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";
import { logger } from "../_core/logger";

// Search result interface for consistent typing
interface SearchResult {
  id: number;
  type: "quote" | "customer" | "product" | "batch";
  title: string;
  description?: string;
  url: string;
  metadata?: Record<string, unknown>;
  relevance: number;
}

// Search query validation with reasonable constraints
const searchQuerySchema = z
  .string()
  .min(1, "Search query is required")
  .max(200, "Search query too long")
  .transform(s => s.trim());

// Search limit validation
const searchLimitSchema = z
  .number()
  .int("Limit must be a whole number")
  .min(1, "Limit must be at least 1")
  .max(100, "Limit cannot exceed 100")
  .default(10);

// Search types enum
const searchTypesSchema = z
  .array(z.enum(["quote", "customer", "product", "batch"]))
  .optional();

/**
 * Sanitize search input to prevent SQL injection via wildcards
 * Escapes % and _ characters that have special meaning in LIKE patterns
 */
function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/\\/g, "\\\\") // Escape backslash first
    .replace(/%/g, "\\%") // Escape percent
    .replace(/_/g, "\\_"); // Escape underscore
}

/**
 * Calculate relevance score for search results
 * Higher scores = better matches
 */
function calculateRelevance(
  query: string,
  ...fields: (string | null | undefined)[]
): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;

  for (const field of fields) {
    if (!field) continue;
    const lowerField = field.toLowerCase();

    // Exact match = highest score
    if (lowerField === lowerQuery) {
      score += 100;
    }
    // Starts with = high score
    else if (lowerField.startsWith(lowerQuery)) {
      score += 75;
    }
    // Word starts with (e.g., "OG" matches "Blue OG")
    else if (
      lowerField.split(/\s+/).some(word => word.startsWith(lowerQuery))
    ) {
      score += 60;
    }
    // Contains = medium score
    else if (lowerField.includes(lowerQuery)) {
      score += 50;
    }
  }

  return score;
}

export const searchRouter = router({
  /**
   * Global search across quotes, customers, products, and batches
   * BUG-042: Expanded to include product names, strains, and categories
   */
  global: protectedProcedure
    .use(requirePermission("clients:read")) // Basic read permission required
    .input(
      z.object({
        query: searchQuerySchema,
        limit: searchLimitSchema,
        types: searchTypesSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { query, limit, types } = input;
      const sanitizedQuery = sanitizeSearchTerm(query);
      const searchTerm = `%${sanitizedQuery}%`;

      // Log search for analytics
      logger.info({
        msg: "Global search executed",
        userId: ctx.user?.id,
        query: query,
        types: types,
      });

      const allResults: SearchResult[] = [];

      // Search quotes (orders with orderType = 'QUOTE')
      if (!types || types.includes("quote")) {
        try {
          const quotes = await db
            .select({
              id: orders.id,
              orderNumber: orders.orderNumber,
              notes: orders.notes,
              clientId: orders.clientId,
              total: orders.total,
              createdAt: orders.createdAt,
            })
            .from(orders)
            .where(
              and(
                eq(orders.orderType, "QUOTE"),
                isNull(orders.deletedAt),
                or(
                  like(sql`CAST(${orders.id} AS CHAR)`, searchTerm),
                  like(orders.orderNumber, searchTerm),
                  like(orders.notes, searchTerm)
                )
              )
            )
            .limit(limit);

          allResults.push(
            ...quotes.map(q => ({
              id: q.id,
              type: "quote" as const,
              title: `Quote #${q.orderNumber || q.id}`,
              description: q.notes || undefined,
              url: `/quotes?selected=${q.id}`,
              metadata: {
                orderNumber: q.orderNumber,
                total: q.total,
                clientId: q.clientId,
              },
              relevance: calculateRelevance(query, q.orderNumber, q.notes),
            }))
          );
        } catch (error) {
          logger.warn({ msg: "Quote search failed", error });
        }
      }

      // Search customers (clients)
      if (!types || types.includes("customer")) {
        try {
          const customers = await db
            .select({
              id: clients.id,
              name: clients.name,
              email: clients.email,
              phone: clients.phone,
              teriCode: clients.teriCode,
              address: clients.address,
              createdAt: clients.createdAt,
            })
            .from(clients)
            .where(
              and(
                isNull(clients.deletedAt),
                or(
                  like(clients.name, searchTerm),
                  like(clients.email, searchTerm),
                  like(clients.phone, searchTerm),
                  like(clients.teriCode, searchTerm),
                  like(clients.address, searchTerm)
                )
              )
            )
            .limit(limit);

          allResults.push(
            ...customers.map(c => ({
              id: c.id,
              type: "customer" as const,
              title: c.name || "Unknown",
              description: c.email || c.teriCode || undefined,
              url: `/clients/${c.id}`,
              metadata: {
                email: c.email,
                phone: c.phone,
                teriCode: c.teriCode,
              },
              relevance: calculateRelevance(
                query,
                c.name,
                c.email,
                c.teriCode,
                c.phone
              ),
            }))
          );
        } catch (error) {
          logger.warn({ msg: "Customer search failed", error });
        }
      }

      // Search products (via batches with product join)
      // BUG-042: Now includes product name and category
      // SCHEMA-015: Removed strains join - strainId column doesn't exist in production
      if (!types || types.includes("product") || types.includes("batch")) {
        try {
          // Query without strains - strainId column doesn't exist in production
          const batchResults = await db
            .select({
              id: batches.id,
              code: batches.code,
              sku: batches.sku,
              onHandQty: batches.onHandQty,
              unitCogs: batches.unitCogs,
              createdAt: batches.createdAt,
              productId: products.id,
              productName: products.nameCanonical,
              category: products.category,
              subcategory: products.subcategory,
              strainName: sql<string | null>`NULL`.as("strainName"),
              strainCategory: sql<string | null>`NULL`.as("strainCategory"),
            })
            .from(batches)
            .leftJoin(products, eq(batches.productId, products.id))
            .where(
              and(
                isNull(batches.deletedAt),
                or(
                  like(batches.code, searchTerm),
                  like(batches.sku, searchTerm),
                  like(products.nameCanonical, searchTerm),
                  like(products.category, searchTerm),
                  like(products.subcategory, searchTerm)
                )
              )
            )
            .limit(limit);

          // Add batch results if searching for batches
          if (!types || types.includes("batch")) {
            allResults.push(
              ...batchResults.map(b => ({
                id: b.id,
                type: "batch" as const,
                title: b.code || "Unknown Batch",
                description: b.productName
                  ? `${b.productName}${b.strainName ? ` - ${b.strainName}` : ""}`
                  : b.sku || undefined,
                url: `/inventory/${b.id}`,
                metadata: {
                  sku: b.sku,
                  productName: b.productName,
                  strainName: b.strainName,
                  category: b.category,
                  quantityAvailable: b.onHandQty,
                  unitPrice: b.unitCogs,
                },
                relevance: calculateRelevance(
                  query,
                  b.code,
                  b.sku,
                  b.productName,
                  b.strainName,
                  b.category
                ),
              }))
            );
          }

          // Add product results (deduplicated by productId) if searching for products
          if (!types || types.includes("product")) {
            const seenProductIds = new Set<number>();
            const productResults = batchResults
              .filter(b => {
                if (!b.productId || seenProductIds.has(b.productId))
                  return false;
                seenProductIds.add(b.productId);
                return true;
              })
              .map(b => ({
                id: b.productId as number,
                type: "product" as const,
                title: b.productName || "Unknown Product",
                description:
                  [b.strainName, b.category].filter(Boolean).join(" - ") ||
                  undefined,
                url: `/products/${b.productId}`,
                metadata: {
                  category: b.category,
                  subcategory: b.subcategory,
                  strainName: b.strainName,
                  strainCategory: b.strainCategory,
                },
                relevance: calculateRelevance(
                  query,
                  b.productName,
                  b.strainName,
                  b.category
                ),
              }));
            allResults.push(...productResults);
          }
        } catch (error) {
          logger.warn({ msg: "Product/batch search failed", error });
        }
      }

      // Sort by relevance (highest first) and limit
      allResults.sort((a, b) => b.relevance - a.relevance);
      const finalResults = allResults.slice(0, limit);

      logger.info({
        msg: "Global search completed",
        userId: ctx.user?.id,
        query: query,
        resultCount: finalResults.length,
      });

      // Return in the original format for backward compatibility
      return {
        quotes: finalResults
          .filter(r => r.type === "quote")
          .map(r => ({
            id: r.id,
            type: r.type,
            title: r.title,
            description: r.description,
            url: r.url,
            metadata: r.metadata,
          })),
        customers: finalResults
          .filter(r => r.type === "customer")
          .map(r => ({
            id: r.id,
            type: r.type,
            title: r.title,
            description: r.description,
            url: r.url,
            metadata: r.metadata,
          })),
        products: finalResults
          .filter(r => r.type === "product" || r.type === "batch")
          .map(r => ({
            id: r.id,
            type: r.type,
            title: r.title,
            description: r.description,
            url: r.url,
            metadata: r.metadata,
          })),
      };
    }),
});
