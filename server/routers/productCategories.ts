/**
 * Product Categories Router
 * Sprint 5 Track E: MEET-069 - Category/Subcategory Data Flow
 *
 * Provides enhanced category management:
 * - Category cascades to related records
 * - Subcategory filters for inventory
 * - Category reports and analytics
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  categories,
  subcategories,
  products,
  batches,
} from "../../drizzle/schema";
import { eq, sql, and, isNull, inArray, desc } from "drizzle-orm";

// ============================================================================
// ROUTER
// ============================================================================

export const productCategoriesRouter = router({
  // ==========================================================================
  // CATEGORY MANAGEMENT WITH CASCADING
  // ==========================================================================

  /**
   * List all categories with subcategory counts and product counts
   */
  listWithStats: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const result = await db
        .select({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          isActive: categories.isActive,
          createdAt: categories.createdAt,
          subcategoryCount: sql<number>`(
            SELECT COUNT(*) FROM subcategories s
            WHERE s.categoryId = ${categories.id}
            AND s.deleted_at IS NULL
          )`,
          productCount: sql<number>`(
            SELECT COUNT(*) FROM products p
            WHERE p.categoryId = ${categories.id}
            AND p.deleted_at IS NULL
          )`,
          activeBatchCount: sql<number>`(
            SELECT COUNT(*) FROM batches b
            INNER JOIN products p ON b.productId = p.id
            WHERE p.categoryId = ${categories.id}
            AND b.batchStatus IN ('LIVE', 'PHOTOGRAPHY_COMPLETE')
            AND b.deleted_at IS NULL
          )`,
        })
        .from(categories)
        .where(isNull(categories.deletedAt))
        .orderBy(categories.name);

      return result;
    }),

  /**
   * Get category with all related data
   */
  getWithRelations: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get category
      const [category] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, input.id), isNull(categories.deletedAt)))
        .limit(1);

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      // Get subcategories
      const subs = await db
        .select()
        .from(subcategories)
        .where(
          and(
            eq(subcategories.categoryId, input.id),
            isNull(subcategories.deletedAt)
          )
        )
        .orderBy(subcategories.name);

      // Get products in this category
      const prods = await db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          subcategoryId: products.subcategoryId,
          isActive: products.isActive,
        })
        .from(products)
        .where(
          and(eq(products.categoryId, input.id), isNull(products.deletedAt))
        )
        .orderBy(products.name)
        .limit(100);

      return {
        ...category,
        subcategories: subs,
        products: prods,
      };
    }),

  /**
   * Update category with cascading options
   */
  updateWithCascade: protectedProcedure
    .use(requirePermission("admin"))
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        cascadeToProducts: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { id, cascadeToProducts, ...updates } = input;

      // Update category
      await db.update(categories).set(updates).where(eq(categories.id, id));

      // Cascade isActive status to products if requested
      if (cascadeToProducts && input.isActive !== undefined) {
        await db
          .update(products)
          .set({ isActive: input.isActive ? 1 : 0 })
          .where(eq(products.categoryId, id));
      }

      return { success: true };
    }),

  /**
   * Delete category with cascade options
   */
  deleteWithCascade: protectedProcedure
    .use(requirePermission("admin"))
    .input(
      z.object({
        id: z.number().int(),
        cascadeToSubcategories: z.boolean().default(true),
        reassignProductsTo: z.number().int().optional(), // If set, move products to this category
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Check if there are products in this category
      const [productCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(products)
        .where(
          and(eq(products.categoryId, input.id), isNull(products.deletedAt))
        );

      if (productCount && productCount.count > 0) {
        if (input.reassignProductsTo) {
          // Move products to another category
          await db
            .update(products)
            .set({ categoryId: input.reassignProductsTo, subcategoryId: null })
            .where(eq(products.categoryId, input.id));
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot delete category with ${productCount.count} products. Either reassign products or remove them first.`,
          });
        }
      }

      // Delete subcategories if cascading
      if (input.cascadeToSubcategories) {
        await db
          .update(subcategories)
          .set({ deletedAt: new Date() })
          .where(eq(subcategories.categoryId, input.id));
      }

      // Soft delete the category
      await db
        .update(categories)
        .set({ deletedAt: new Date() })
        .where(eq(categories.id, input.id));

      return { success: true };
    }),

  // ==========================================================================
  // SUBCATEGORY MANAGEMENT
  // ==========================================================================

  /**
   * List subcategories with product counts
   */
  listSubcategoriesWithStats: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        categoryId: z.number().int().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const conditions = [isNull(subcategories.deletedAt)];
      if (input.categoryId) {
        conditions.push(eq(subcategories.categoryId, input.categoryId));
      }

      const result = await db
        .select({
          id: subcategories.id,
          categoryId: subcategories.categoryId,
          name: subcategories.name,
          description: subcategories.description,
          isActive: subcategories.isActive,
          createdAt: subcategories.createdAt,
          categoryName: categories.name,
          productCount: sql<number>`(
            SELECT COUNT(*) FROM products p
            WHERE p.subcategoryId = ${subcategories.id}
            AND p.deleted_at IS NULL
          )`,
        })
        .from(subcategories)
        .leftJoin(categories, eq(subcategories.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(categories.name, subcategories.name);

      return result;
    }),

  /**
   * Bulk move products to a different subcategory
   */
  moveProductsToSubcategory: protectedProcedure
    .use(requirePermission("admin"))
    .input(
      z.object({
        productIds: z.array(z.number().int()),
        targetSubcategoryId: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get target subcategory to ensure it exists and get its categoryId
      const [targetSubcat] = await db
        .select()
        .from(subcategories)
        .where(
          and(
            eq(subcategories.id, input.targetSubcategoryId),
            isNull(subcategories.deletedAt)
          )
        )
        .limit(1);

      if (!targetSubcat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target subcategory not found",
        });
      }

      // Update products with both subcategory and category
      await db
        .update(products)
        .set({
          subcategoryId: input.targetSubcategoryId,
          categoryId: targetSubcat.categoryId,
        })
        .where(inArray(products.id, input.productIds));

      return {
        success: true,
        movedCount: input.productIds.length,
        targetCategoryId: targetSubcat.categoryId,
      };
    }),

  // ==========================================================================
  // INVENTORY FILTERING BY CATEGORY
  // ==========================================================================

  /**
   * Get inventory summary filtered by category
   */
  getInventoryByCategory: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        categoryId: z.number().int().optional(),
        subcategoryId: z.number().int().optional(),
        status: z
          .enum([
            "AWAITING_INTAKE",
            "LIVE",
            "PHOTOGRAPHY_COMPLETE",
            "ON_HOLD",
            "QUARANTINED",
            "SOLD_OUT",
            "CLOSED",
          ])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const conditions = [
        isNull(batches.deletedAt),
        isNull(products.deletedAt),
      ];

      if (input.categoryId) {
        conditions.push(eq(products.categoryId, input.categoryId));
      }
      if (input.subcategoryId) {
        conditions.push(eq(products.subcategoryId, input.subcategoryId));
      }
      if (input.status) {
        conditions.push(eq(batches.batchStatus, input.status));
      }

      const result = await db
        .select({
          batchId: batches.id,
          batchCode: batches.code,
          batchSku: batches.sku,
          batchStatus: batches.batchStatus,
          onHandQty: batches.onHandQty,
          reservedQty: batches.reservedQty,
          productId: products.id,
          productName: products.name,
          productSku: products.sku,
          categoryId: products.categoryId,
          categoryName: categories.name,
          subcategoryId: products.subcategoryId,
          subcategoryName: subcategories.name,
        })
        .from(batches)
        .innerJoin(products, eq(batches.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
        .where(and(...conditions))
        .orderBy(categories.name, subcategories.name, products.name)
        .limit(500);

      return result;
    }),

  /**
   * Get inventory value summary by category
   */
  getCategoryInventoryValue: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const result = await db
        .select({
          categoryId: products.categoryId,
          categoryName: categories.name,
          batchCount: sql<number>`COUNT(DISTINCT ${batches.id})`,
          productCount: sql<number>`COUNT(DISTINCT ${products.id})`,
          totalOnHand: sql<string>`SUM(CAST(${batches.onHandQty} AS DECIMAL(15,4)))`,
          totalReserved: sql<string>`SUM(CAST(${batches.reservedQty} AS DECIMAL(15,4)))`,
          estimatedValue: sql<string>`SUM(
            CAST(${batches.onHandQty} AS DECIMAL(15,4)) *
            COALESCE(CAST(${batches.unitCogs} AS DECIMAL(15,4)), 0)
          )`,
        })
        .from(batches)
        .innerJoin(products, eq(batches.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            isNull(batches.deletedAt),
            inArray(batches.batchStatus, ["LIVE", "PHOTOGRAPHY_COMPLETE"])
          )
        )
        .groupBy(products.categoryId, categories.name)
        .orderBy(desc(sql`SUM(CAST(${batches.onHandQty} AS DECIMAL(15,4)))`));

      return result;
    }),

  // ==========================================================================
  // CATEGORY REPORTS
  // ==========================================================================

  /**
   * Get category performance report
   */
  getCategoryPerformanceReport: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input: _input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get category summary with batch status distribution
      const summary = await db
        .select({
          categoryId: products.categoryId,
          categoryName: categories.name,
          totalBatches: sql<number>`COUNT(*)`,
          liveBatches: sql<number>`SUM(CASE WHEN ${batches.batchStatus} IN ('LIVE', 'PHOTOGRAPHY_COMPLETE') THEN 1 ELSE 0 END)`,
          pendingBatches: sql<number>`SUM(CASE WHEN ${batches.batchStatus} = 'AWAITING_INTAKE' THEN 1 ELSE 0 END)`,
          soldOutBatches: sql<number>`SUM(CASE WHEN ${batches.batchStatus} = 'SOLD_OUT' THEN 1 ELSE 0 END)`,
          closedBatches: sql<number>`SUM(CASE WHEN ${batches.batchStatus} = 'CLOSED' THEN 1 ELSE 0 END)`,
          totalQuantity: sql<string>`SUM(CAST(${batches.onHandQty} AS DECIMAL(15,4)))`,
          avgCogsPerUnit: sql<string>`AVG(CAST(${batches.unitCogs} AS DECIMAL(15,4)))`,
        })
        .from(batches)
        .innerJoin(products, eq(batches.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(isNull(batches.deletedAt))
        .groupBy(products.categoryId, categories.name)
        .orderBy(categories.name);

      // Get overall totals
      const [totals] = await db
        .select({
          totalCategories: sql<number>`COUNT(DISTINCT ${products.categoryId})`,
          totalSubcategories: sql<number>`COUNT(DISTINCT ${products.subcategoryId})`,
          totalProducts: sql<number>`COUNT(DISTINCT ${products.id})`,
          totalBatches: sql<number>`COUNT(DISTINCT ${batches.id})`,
          totalQuantity: sql<string>`SUM(CAST(${batches.onHandQty} AS DECIMAL(15,4)))`,
        })
        .from(batches)
        .innerJoin(products, eq(batches.productId, products.id))
        .where(isNull(batches.deletedAt));

      return {
        byCategory: summary,
        totals,
      };
    }),

  /**
   * Get subcategory drill-down report
   */
  getSubcategoryReport: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ categoryId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const result = await db
        .select({
          subcategoryId: products.subcategoryId,
          subcategoryName: subcategories.name,
          productCount: sql<number>`COUNT(DISTINCT ${products.id})`,
          batchCount: sql<number>`COUNT(DISTINCT ${batches.id})`,
          liveBatchCount: sql<number>`SUM(CASE WHEN ${batches.batchStatus} IN ('LIVE', 'PHOTOGRAPHY_COMPLETE') THEN 1 ELSE 0 END)`,
          totalQuantity: sql<string>`SUM(CAST(${batches.onHandQty} AS DECIMAL(15,4)))`,
          estimatedValue: sql<string>`SUM(
            CAST(${batches.onHandQty} AS DECIMAL(15,4)) *
            COALESCE(CAST(${batches.unitCogs} AS DECIMAL(15,4)), 0)
          )`,
        })
        .from(batches)
        .innerJoin(products, eq(batches.productId, products.id))
        .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
        .where(
          and(
            eq(products.categoryId, input.categoryId),
            isNull(batches.deletedAt)
          )
        )
        .groupBy(products.subcategoryId, subcategories.name)
        .orderBy(subcategories.name);

      // Include "Uncategorized" for products without subcategory
      return result;
    }),

  /**
   * Get category hierarchy tree
   */
  getCategoryTree: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get all categories
      const cats = await db
        .select()
        .from(categories)
        .where(isNull(categories.deletedAt))
        .orderBy(categories.name);

      // Get all subcategories
      const subs = await db
        .select()
        .from(subcategories)
        .where(isNull(subcategories.deletedAt))
        .orderBy(subcategories.name);

      // Build tree structure
      const tree = cats.map(cat => ({
        ...cat,
        children: subs.filter(sub => sub.categoryId === cat.id),
      }));

      return tree;
    }),
});
