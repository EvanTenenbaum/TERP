/**
 * Strain Service - Centralized Business Logic
 *
 * This service provides all strain-related business logic in one place.
 * Benefits:
 * - Single source of truth
 * - Reusable across all routers
 * - Built-in caching
 * - Consistent error handling
 * - Easy to test
 */

import { getDb } from "../db";
import { strains, products } from "../../drizzle/schema";
import { eq, or, sql } from "drizzle-orm";
import { findFuzzyStrainMatches, getOrCreateStrain } from "../strainMatcher";

/**
 * SCHEMA-016: Check if an error is a schema-related error (missing column, etc.)
 * Used for graceful degradation when strainId column doesn't exist in production
 */
function isSchemaError(error: unknown): boolean {
  if (!error) return false;
  const errorStr = String(error);
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check for common schema error patterns
  const schemaPatterns = [
    "Unknown column",
    "no such column",
    "column.*does not exist",
    "ER_BAD_FIELD_ERROR",
    "SQLITE_ERROR",
    "strainId",
  ];

  return schemaPatterns.some(
    pattern =>
      errorStr.includes(pattern) ||
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

// Types for database results and cache
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

interface StrainVariant {
  id: number;
  name: string;
  parentStrainId?: number | null;
}

interface ProductRecord {
  id: number;
  strainId?: number | null;
}

// Helper to extract rows from MySQL result
function extractRows(result: unknown): unknown[] {
  if (Array.isArray(result)) {
    // Direct array result
    if (result.length > 0 && Array.isArray(result[0])) {
      return result[0] as unknown[];
    }
    return result;
  }
  const obj = result as { rows?: unknown[] };
  return obj.rows || [];
}

// Cache for frequently accessed data with automatic cleanup
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Prevent unbounded growth

// Cleanup expired entries periodically
function cleanupExpiredEntries() {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach(key => cache.delete(key));

  // If still too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => cache.delete(key));
  }
}

// Run cleanup every 2 minutes
setInterval(cleanupExpiredEntries, 2 * 60 * 1000);

function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data as T);
  }

  return fetcher().then(data => {
    // Clean up before adding new entry if cache is getting large
    if (cache.size >= MAX_CACHE_SIZE) {
      cleanupExpiredEntries();
    }

    cache.set(key, { data, timestamp: Date.now() });
    return data;
  });
}

export class StrainService {
  /**
   * Get strain with complete family information
   */
  async getStrainWithFamily(strainId: number) {
    return getCached(`strain:${strainId}:family`, async () => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const strain = await db.query.strains.findFirst({
        where: eq(strains.id, strainId),
      });

      if (!strain) return null;

      let parent = null;
      if (strain.parentStrainId) {
        parent = await db.query.strains.findFirst({
          where: eq(strains.id, strain.parentStrainId),
        });
      }

      return {
        ...strain,
        parent,
        isVariant: !!strain.parentStrainId,
      };
    });
  }

  /**
   * Get all variants in a strain family
   */
  async getStrainFamily(strainId: number) {
    const strain = await this.getStrainWithFamily(strainId);
    if (!strain) return null;

    // If this is a variant, get the parent's family
    const familyId = strain.parentStrainId || strainId;

    return getCached(`family:${familyId}:variants`, async () => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get parent strain
      const parent = await db.query.strains.findFirst({
        where: eq(strains.id, familyId),
      });

      // Get all variants
      const variants = await db.query.strains.findMany({
        where: or(
          eq(strains.parentStrainId, familyId),
          eq(strains.id, familyId)
        ),
      });

      return {
        parent,
        variants,
        variantCount: variants.length - 1, // Exclude parent from count
      };
    });
  }

  /**
   * Get strain family statistics
   */
  async getFamilyStats(familyId: number) {
    return getCached(`family:${familyId}:stats`, async () => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const result = await db.execute(sql`
        SELECT * FROM strain_family_stats
        WHERE family_id = ${familyId}
      `);

      const rows = extractRows(result);
      return rows[0] || null;
    });
  }

  /**
   * Suggest alternative products based on strain family
   * SCHEMA-016: Added graceful degradation for missing strainId column
   */
  async suggestAlternatives(strainId: number, excludeProductId?: number) {
    try {
      const family = await this.getStrainFamily(strainId);
      if (!family) return [];

      // Get all products in the same family
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const variantIds = family.variants.map((v: StrainVariant) => v.id);

      const familyProducts = await db.query.products.findMany({
        where: sql`${products.strainId} IN (${sql.join(variantIds, sql`, `)})`,
      });

      // Exclude the current product if specified
      return excludeProductId
        ? familyProducts.filter((p: ProductRecord) => p.id !== excludeProductId)
        : familyProducts;
    } catch (error) {
      if (isSchemaError(error)) {
        console.info("[SCHEMA-016] strainService:", {
          operation: "suggestAlternatives",
          strainId,
          msg: "Strain alternatives unavailable - strainId column not in production",
        });
        return [];
      }
      throw error;
    }
  }

  /**
   * Get client's strain family preferences
   */
  async getClientPreferences(clientId: number) {
    return getCached(`client:${clientId}:preferences`, async () => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const result = await db.execute(sql`
        SELECT * FROM client_strain_preferences
        WHERE client_id = ${clientId}
        ORDER BY purchase_count DESC, total_revenue DESC
        LIMIT 10
      `);

      const preferences = extractRows(result) as Array<{
        purchase_count: number | string;
        total_revenue: number | string;
      }>;

      // Calculate percentages
      const totalPurchases = preferences.reduce(
        (sum, p) => sum + Number(p.purchase_count),
        0
      );

      return preferences.map(pref => ({
        ...pref,
        percentage:
          totalPurchases > 0
            ? (Number(pref.purchase_count) / totalPurchases) * 100
            : 0,
      }));
    });
  }

  /**
   * Get products in a strain family with inventory
   * SCHEMA-016: Added graceful degradation for missing strainId column
   */
  async getProductsByFamily(familyId: number, includeOutOfStock = false) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const result = await db.execute(sql`
        SELECT
          p.*,
          s.name as strain_name,
          s.baseStrainName as strain_base_name,
          COALESCE(SUM(CAST(b.onHandQty AS DECIMAL(10,2))), 0) as total_inventory
        FROM products p
        INNER JOIN strains s ON p.strainId = s.id
        LEFT JOIN batches b ON b.productId = p.id
        WHERE (s.id = ${familyId} OR s.parentStrainId = ${familyId})
        GROUP BY p.id, s.name, s.baseStrainName
        ${includeOutOfStock ? sql`` : sql`HAVING total_inventory > 0`}
        ORDER BY total_inventory DESC
      `);

      return extractRows(result);
    } catch (error) {
      if (isSchemaError(error)) {
        console.info("[SCHEMA-016] strainService:", {
          operation: "getProductsByFamily",
          familyId,
          msg: "Strain family products unavailable - strainId column not in production",
        });
        return [];
      }
      throw error;
    }
  }

  /**
   * Fuzzy search for strains with auto-assignment
   */
  async searchAndMatch(query: string, category?: string, threshold = 90) {
    return findFuzzyStrainMatches(
      query,
      category ? Number(category) : undefined,
      threshold
    );
  }

  /**
   * Get or create strain with family detection
   */
  async getOrCreate(name: string, category?: string, threshold = 90) {
    return getOrCreateStrain(
      name,
      category as "indica" | "sativa" | "hybrid" | undefined,
      threshold
    );
  }

  /**
   * Get top selling strain families
   * SCHEMA-016: Added graceful degradation for missing strainId column
   */
  async getTopFamilies(limit = 10, startDate?: Date, endDate?: Date) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return getCached(
      `top:families:${limit}:${startDate}:${endDate}`,
      async () => {
        try {
          let dateFilter = sql``;
          if (startDate && endDate) {
            dateFilter = sql`AND t.createdAt BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}`;
          }

          const result = await db.execute(sql`
          SELECT
            COALESCE(parent.id, s.id) as family_id,
            COALESCE(parent.name, s.name) as family_name,
            COUNT(DISTINCT t.id) as sale_count,
            SUM(CAST(ti.quantity AS DECIMAL(10,2))) as total_quantity,
            SUM(CAST(ti.subtotal AS DECIMAL(10,2))) as total_revenue
          FROM transaction_items ti
          INNER JOIN transactions t ON ti.transactionId = t.id
          INNER JOIN batches b ON ti.batchId = b.id
          INNER JOIN products p ON b.productId = p.id
          INNER JOIN strains s ON p.strainId = s.id
          LEFT JOIN strains parent ON s.parentStrainId = parent.id
          WHERE t.type = 'sale' ${dateFilter}
          GROUP BY
            COALESCE(parent.id, s.id),
            COALESCE(parent.name, s.name)
          ORDER BY total_revenue DESC
          LIMIT ${limit}
        `);

          return extractRows(result);
        } catch (error) {
          if (isSchemaError(error)) {
            console.info("[SCHEMA-016] strainService:", {
              operation: "getTopFamilies",
              limit,
              msg: "Top strain families unavailable - strainId column not in production",
            });
            return [];
          }
          throw error;
        }
      }
    );
  }

  /**
   * Check if a strain name matches an existing family
   */
  async findMatchingFamily(strainName: string) {
    // Use fuzzy matching to find similar strains
    const matches = await findFuzzyStrainMatches(strainName, undefined, 80);

    if (matches.length === 0) return null;

    // Get the family of the best match
    const bestMatch = matches[0];
    return this.getStrainFamily(bestMatch.id);
  }

  /**
   * Get strain family trends over time
   * SCHEMA-016: Added graceful degradation for missing strainId column
   */
  async getFamilyTrends(familyId: number, months = 6) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const result = await db.execute(sql`
        SELECT
          DATE_FORMAT(t.createdAt, '%Y-%m') as month,
          COUNT(DISTINCT t.id) as sale_count,
          SUM(CAST(ti.quantity AS DECIMAL(10,2))) as total_quantity,
          SUM(CAST(ti.subtotal AS DECIMAL(10,2))) as total_revenue
        FROM transaction_items ti
        INNER JOIN transactions t ON ti.transactionId = t.id
        INNER JOIN batches b ON ti.batchId = b.id
        INNER JOIN products p ON b.productId = p.id
        INNER JOIN strains s ON p.strainId = s.id
        LEFT JOIN strains parent ON s.parentStrainId = parent.id
        WHERE (parent.id = ${familyId} OR (s.id = ${familyId} AND s.parentStrainId IS NULL))
          AND t.type = 'sale'
          AND t.createdAt >= ${startDate.toISOString()}
        GROUP BY DATE_FORMAT(t.createdAt, '%Y-%m')
        ORDER BY month DESC
      `);

      return extractRows(result);
    } catch (error) {
      if (isSchemaError(error)) {
        console.info("[SCHEMA-016] strainService:", {
          operation: "getFamilyTrends",
          familyId,
          months,
          msg: "Strain family trends unavailable - strainId column not in production",
        });
        return [];
      }
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    };
  }
}

// Export singleton instance
export const strainService = new StrainService();
