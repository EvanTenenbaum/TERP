/**
 * Products Data Access Layer
 * Handles all database operations for the Product Catalogue
 * FEATURE-011: Unified Product Catalogue
 */

import { eq, and, desc, like, or, isNull, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { getDb } from "./db";
import { products, brands, strains } from "../drizzle/schema";

// ============================================================================
// PRODUCTS CRUD
// ============================================================================

export interface ProductFilters {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
  brandId?: number;
  strainId?: number;
  includeDeleted?: boolean;
}

/**
 * Get all products with optional filters and pagination
 */
export async function getProducts(options: ProductFilters = {}): Promise<
  Array<{
    id: number;
    brandId: number | null;
    strainId: number | null;
    nameCanonical: string;
    category: string;
    subcategory: string | null;
    uomSellable: string | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    brandName: string | null;
    strainName: string | null;
  }>
> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    limit = 50,
    offset = 0,
    search,
    category,
    brandId,
    strainId,
    includeDeleted = false,
  } = options;

  // QA-001 FIX: Build conditions in two parts - base conditions and strainId condition
  // This allows fallback to use only base conditions when strainId column doesn't exist
  const baseConditions: Array<SQL<unknown> | undefined> = [];

  // Soft delete filter
  if (!includeDeleted) {
    baseConditions.push(isNull(products.deletedAt));
  }

  if (search) {
    baseConditions.push(
      or(
        like(products.nameCanonical, `%${search}%`),
        like(products.category, `%${search}%`),
        like(products.description, `%${search}%`)
      )
    );
  }

  if (category) {
    baseConditions.push(eq(products.category, category));
  }

  if (brandId) {
    baseConditions.push(eq(products.brandId, brandId));
  }

  if (strainId) {
    baseConditions.push(eq(products.strainId, strainId));
  }

  const result = await db
    .select({
      id: products.id,
      brandId: products.brandId,
      strainId: products.strainId,
      nameCanonical: products.nameCanonical,
      category: products.category,
      subcategory: products.subcategory,
      uomSellable: products.uomSellable,
      description: products.description,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      deletedAt: products.deletedAt,
      brandName: brands.name,
      strainName: strains.name,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(strains, eq(products.strainId, strains.id))
    .where(baseConditions.length > 0 ? and(...baseConditions) : undefined)
    .orderBy(desc(products.updatedAt))
    .limit(limit)
    .offset(offset);

  return result;
}

/**
 * Get total count of products matching filters
 * QA-002 FIX: Added try-catch fallback for schema drift
 */
export async function getProductCount(
  options: Omit<ProductFilters, "limit" | "offset"> = {}
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    search,
    category,
    brandId,
    strainId,
    includeDeleted = false,
  } = options;

  // QA-002 FIX: Build conditions in two parts like getProducts
  const baseConditions: Array<SQL<unknown> | undefined> = [];

  if (!includeDeleted) {
    baseConditions.push(isNull(products.deletedAt));
  }

  if (search) {
    baseConditions.push(
      or(
        like(products.nameCanonical, `%${search}%`),
        like(products.category, `%${search}%`),
        like(products.description, `%${search}%`)
      )
    );
  }

  if (category) {
    baseConditions.push(eq(products.category, category));
  }

  if (brandId) {
    baseConditions.push(eq(products.brandId, brandId));
  }

  if (strainId) {
    baseConditions.push(eq(products.strainId, strainId));
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(baseConditions.length > 0 ? and(...baseConditions) : undefined);

  return result[0]?.count ?? 0;
}

/**
 * Get a single product by ID
 */
export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: products.id,
      brandId: products.brandId,
      strainId: products.strainId,
      nameCanonical: products.nameCanonical,
      category: products.category,
      subcategory: products.subcategory,
      uomSellable: products.uomSellable,
      description: products.description,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      deletedAt: products.deletedAt,
      brandName: brands.name,
      strainName: strains.name,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(strains, eq(products.strainId, strains.id))
    .where(eq(products.id, id))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Create a new product
 */
export async function createProduct(data: {
  brandId: number;
  strainId?: number | null;
  nameCanonical: string;
  category: string;
  subcategory?: string | null;
  uomSellable?: string;
  description?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(products).values({
    brandId: data.brandId,
    strainId: data.strainId ?? null,
    nameCanonical: data.nameCanonical,
    category: data.category,
    subcategory: data.subcategory ?? null,
    uomSellable: data.uomSellable ?? "EA",
    description: data.description ?? null,
  });

  return { id: Number(result[0].insertId) };
}

/**
 * Update a product
 */
export async function updateProduct(
  id: number,
  data: Partial<{
    brandId: number;
    strainId: number | null;
    nameCanonical: string;
    category: string;
    subcategory: string | null;
    uomSellable: string;
    description: string | null;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(products).set(data).where(eq(products.id, id));

  return { success: true };
}

/**
 * Soft delete a product
 */
export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(products)
    .set({ deletedAt: new Date() })
    .where(eq(products.id, id));

  return { success: true };
}

/**
 * Restore a soft-deleted product
 */
export async function restoreProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(products).set({ deletedAt: null }).where(eq(products.id, id));

  return { success: true };
}

/**
 * Get all unique product categories
 */
export async function getProductCategories() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(isNull(products.deletedAt))
    .orderBy(products.category);

  return result.map(r => r.category).filter(Boolean);
}

/**
 * Get all brands for dropdown
 */
export async function getAllBrands() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: brands.id,
      name: brands.name,
    })
    .from(brands)
    .where(isNull(brands.deletedAt))
    .orderBy(brands.name);

  return result;
}

/**
 * Get all strains for dropdown
 */
export async function getAllStrains() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: strains.id,
      name: strains.name,
      category: strains.category,
    })
    .from(strains)
    .where(isNull(strains.deletedAt))
    .orderBy(strains.name);

  return result;
}

// ============================================================================
// FEAT-003-INLINE: Quick Product Creation Support
// ============================================================================

/**
 * Check for duplicate products by name (case-insensitive) and optionally brand
 * Returns existing product if found
 */
export async function findDuplicateProduct(
  name: string,
  brandId?: number
): Promise<{
  id: number;
  nameCanonical: string;
  brandId: number;
  brandName: string | null;
  category: string;
} | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const searchName = name.toLowerCase().trim();

  const conditions = [
    sql`LOWER(${products.nameCanonical}) = ${searchName}`,
    isNull(products.deletedAt),
  ];

  if (brandId) {
    conditions.push(eq(products.brandId, brandId));
  }

  const result = await db
    .select({
      id: products.id,
      nameCanonical: products.nameCanonical,
      brandId: products.brandId,
      brandName: brands.name,
      category: products.category,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(...conditions))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Generate a unique product code based on category and brand
 * Format: [CAT_PREFIX]-[BRAND_PREFIX]-[SEQUENCE]
 * Example: FLW-TRP-0001
 */
export async function generateProductCode(
  category: string,
  brandId: number
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get brand info for prefix
  const brand = await db
    .select({ name: brands.name })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);

  // Generate category prefix (first 3 chars uppercase)
  const catPrefix = category
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, "X");

  // Generate brand prefix (first 3 chars uppercase)
  const brandName = brand[0]?.name ?? "UNK";
  const brandPrefix = brandName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, "X");

  const prefix = `${catPrefix}-${brandPrefix}-`;

  // Find the highest existing sequence for this prefix
  const existingProducts = await db
    .select({ nameCanonical: products.nameCanonical })
    .from(products)
    .where(like(products.nameCanonical, `${prefix}%`));

  let maxSequence = 0;
  for (const p of existingProducts) {
    const match = p.nameCanonical.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSequence) maxSequence = seq;
    }
  }

  const nextSequence = (maxSequence + 1).toString().padStart(4, "0");
  return `${prefix}${nextSequence}`;
}

/**
 * Quick create a product with minimal fields
 * Auto-generates code if not provided, checks for duplicates
 * Uses transaction with retry logic for race condition safety
 */
export async function quickCreateProduct(data: {
  name: string;
  category: string;
  brandId: number;
  strainId?: number | null;
  subcategory?: string | null;
  uomSellable?: string;
  description?: string | null;
}): Promise<{
  id: number;
  nameCanonical: string;
  category: string;
  brandId: number;
  brandName: string | null;
  strainId: number | null;
  strainName: string | null;
  subcategory: string | null;
  uomSellable: string;
  generatedCode: string;
  isDuplicate: boolean;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Retry logic for handling race conditions
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Check for duplicates first
      const duplicate = await findDuplicateProduct(data.name, data.brandId);
      if (duplicate) {
        // Return existing product with duplicate flag
        const fullProduct = await getProductById(duplicate.id);
        return {
          id: duplicate.id,
          nameCanonical: duplicate.nameCanonical,
          category: duplicate.category,
          brandId: duplicate.brandId,
          brandName: duplicate.brandName,
          strainId: fullProduct?.strainId ?? null,
          strainName: fullProduct?.strainName ?? null,
          subcategory: fullProduct?.subcategory ?? null,
          uomSellable: fullProduct?.uomSellable ?? "EA",
          generatedCode: "",
          isDuplicate: true,
        };
      }

      // Generate product code for reference
      const generatedCode = await generateProductCode(
        data.category,
        data.brandId
      );

      // Create the product
      const result = await db.insert(products).values({
        brandId: data.brandId,
        strainId: data.strainId ?? null,
        nameCanonical: data.name.trim(),
        category: data.category.trim(),
        subcategory: data.subcategory ?? null,
        uomSellable: data.uomSellable ?? "EA",
        description: data.description ?? null,
      });

      const newId = Number(result[0].insertId);

      // Fetch the created product with joins
      const created = await getProductById(newId);
      if (!created) {
        throw new Error("Failed to fetch created product");
      }

      return {
        id: created.id,
        nameCanonical: created.nameCanonical,
        category: created.category,
        brandId: created.brandId,
        brandName: created.brandName,
        strainId: created.strainId,
        strainName: created.strainName,
        subcategory: created.subcategory,
        uomSellable: created.uomSellable,
        generatedCode,
        isDuplicate: false,
      };
    } catch (error) {
      lastError = error as Error;
      // Check if it's a duplicate key error (race condition)
      const errorMessage = String(error);
      if (
        errorMessage.includes("Duplicate entry") ||
        errorMessage.includes("ER_DUP_ENTRY")
      ) {
        // Another request created the same product - retry to return the duplicate
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1))); // Small backoff
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError || new Error("Failed to create product after retries");
}

/**
 * Search products by name (for autocomplete/typeahead)
 * Returns up to 10 matches
 */
export async function searchProductsByName(
  query: string,
  limit: number = 10
): Promise<
  Array<{
    id: number;
    nameCanonical: string;
    category: string;
    brandId: number;
    brandName: string | null;
  }>
> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const searchTerm = `%${query.toLowerCase().trim()}%`;

  const result = await db
    .select({
      id: products.id,
      nameCanonical: products.nameCanonical,
      category: products.category,
      brandId: products.brandId,
      brandName: brands.name,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(
      and(
        like(sql`LOWER(${products.nameCanonical})`, searchTerm),
        isNull(products.deletedAt)
      )
    )
    .orderBy(products.nameCanonical)
    .limit(limit);

  return result;
}

/**
 * Update product name (for inline editing - MEET-037)
 */
export async function updateProductName(
  id: number,
  newName: string
): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check product exists and is not deleted
  const existing = await getProductById(id);
  if (!existing) {
    throw new Error("Product not found");
  }
  if (existing.deletedAt) {
    throw new Error("Cannot update a deleted product");
  }

  // Check for duplicate name
  const duplicate = await findDuplicateProduct(newName, existing.brandId);
  if (duplicate && duplicate.id !== id) {
    throw new Error(
      `A product with this name already exists: ${duplicate.nameCanonical}`
    );
  }

  await db
    .update(products)
    .set({ nameCanonical: newName.trim() })
    .where(eq(products.id, id));

  return { success: true };
}
