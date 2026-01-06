/**
 * Products Data Access Layer
 * Handles all database operations for the Product Catalogue
 * FEATURE-011: Unified Product Catalogue
 */

import { eq, and, desc, like, or, isNull, sql } from "drizzle-orm";
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
export async function getProducts(options: ProductFilters = {}) {
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

  // Build where conditions
  const conditions = [];

  // Soft delete filter
  if (!includeDeleted) {
    conditions.push(isNull(products.deletedAt));
  }

  if (search) {
    conditions.push(
      or(
        like(products.nameCanonical, `%${search}%`),
        like(products.category, `%${search}%`),
        like(products.description, `%${search}%`)
      )
    );
  }

  if (category) {
    conditions.push(eq(products.category, category));
  }

  if (brandId) {
    conditions.push(eq(products.brandId, brandId));
  }

  if (strainId) {
    conditions.push(eq(products.strainId, strainId));
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
      // Join brand name
      brandName: brands.name,
      // Join strain name
      strainName: strains.name,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(strains, eq(products.strainId, strains.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(products.updatedAt))
    .limit(limit)
    .offset(offset);

  return result;
}

/**
 * Get total count of products matching filters
 */
export async function getProductCount(
  options: Omit<ProductFilters, "limit" | "offset"> = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    search,
    category,
    brandId,
    strainId,
    includeDeleted = false,
  } = options;

  const conditions = [];

  if (!includeDeleted) {
    conditions.push(isNull(products.deletedAt));
  }

  if (search) {
    conditions.push(
      or(
        like(products.nameCanonical, `%${search}%`),
        like(products.category, `%${search}%`),
        like(products.description, `%${search}%`)
      )
    );
  }

  if (category) {
    conditions.push(eq(products.category, category));
  }

  if (brandId) {
    conditions.push(eq(products.brandId, brandId));
  }

  if (strainId) {
    conditions.push(eq(products.strainId, strainId));
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

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
