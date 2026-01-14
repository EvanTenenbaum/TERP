/**
 * Product Categories Extended Router (MEET-032)
 * Sprint 5 Track D.4: Customizable Categories
 *
 * User-defined categories:
 * - CRUD for categories/subcategories
 * - Category hierarchy (parent/child)
 * - Assign products to categories
 * - Filter inventory by category
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { products } from "../../drizzle/schema";
import {
  productCategories,
  productCategoryAssignments,
} from "../../drizzle/schema-sprint5-trackd";
import { eq, and, sql, isNull, desc, asc, like } from "drizzle-orm";
import { logger } from "../_core/logger";

// ============================================================================
// Helper Functions
// ============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function updateCategoryPath(
  db: Awaited<ReturnType<typeof getDb>>,
  categoryId: number,
  parentPath: string | null
): Promise<string> {
  const path = parentPath ? `${parentPath}/${categoryId}` : `${categoryId}`;

  if (db) {
    await db
      .update(productCategories)
      .set({ path })
      .where(eq(productCategories.id, categoryId));
  }

  return path;
}

// ============================================================================
// Input Schemas
// ============================================================================

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  parentId: z.number().optional(),
  iconName: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().default(0),
});

const updateCategorySchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  parentId: z.number().nullable().optional(),
  iconName: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

const assignProductSchema = z.object({
  productId: z.number(),
  categoryId: z.number(),
  isPrimary: z.boolean().default(false),
});

// ============================================================================
// Router
// ============================================================================

export const productCategoriesExtendedRouter = router({
  /**
   * List all categories (flat or tree structure)
   */
  list: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({
      parentId: z.number().nullable().optional(),
      includeInactive: z.boolean().default(false),
      asTree: z.boolean().default(false),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [isNull(productCategories.deletedAt)];

      if (!input.includeInactive) {
        conditions.push(eq(productCategories.isActive, true));
      }

      if (input.parentId !== undefined) {
        if (input.parentId === null) {
          conditions.push(isNull(productCategories.parentId));
        } else {
          conditions.push(eq(productCategories.parentId, input.parentId));
        }
      }

      const categories = await db
        .select()
        .from(productCategories)
        .where(and(...conditions))
        .orderBy(asc(productCategories.sortOrder), asc(productCategories.name));

      if (input.asTree && input.parentId === undefined) {
        // Build tree structure
        const categoryMap = new Map<number, typeof categories[0] & { children: typeof categories }>();
        const rootCategories: (typeof categories[0] & { children: typeof categories })[] = [];

        // First pass: create map
        for (const cat of categories) {
          categoryMap.set(cat.id, { ...cat, children: [] });
        }

        // Second pass: build tree
        for (const cat of categories) {
          const catWithChildren = categoryMap.get(cat.id)!;
          if (cat.parentId === null) {
            rootCategories.push(catWithChildren);
          } else {
            const parent = categoryMap.get(cat.parentId);
            if (parent) {
              parent.children.push(catWithChildren);
            }
          }
        }

        return rootCategories;
      }

      return categories;
    }),

  /**
   * Get category by ID
   */
  getById: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [category] = await db
        .select()
        .from(productCategories)
        .where(
          and(
            eq(productCategories.id, input.id),
            isNull(productCategories.deletedAt)
          )
        )
        .limit(1);

      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
      }

      // Get parent chain
      const parents: typeof category[] = [];
      let currentParentId = category.parentId;
      while (currentParentId) {
        const [parent] = await db
          .select()
          .from(productCategories)
          .where(eq(productCategories.id, currentParentId))
          .limit(1);
        if (parent) {
          parents.unshift(parent);
          currentParentId = parent.parentId;
        } else {
          break;
        }
      }

      // Get children
      const children = await db
        .select()
        .from(productCategories)
        .where(
          and(
            eq(productCategories.parentId, input.id),
            isNull(productCategories.deletedAt),
            eq(productCategories.isActive, true)
          )
        )
        .orderBy(asc(productCategories.sortOrder));

      // Get product count
      const [productCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(productCategoryAssignments)
        .where(eq(productCategoryAssignments.categoryId, input.id));

      return {
        ...category,
        breadcrumb: parents,
        children,
        productCount: Number(productCount?.count || 0),
      };
    }),

  /**
   * Create a new category
   */
  create: protectedProcedure
    .use(requirePermission("inventory:create"))
    .input(createCategorySchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Generate unique slug
      let slug = generateSlug(input.name);
      let slugSuffix = 0;
      let slugExists = true;

      while (slugExists) {
        const checkSlug = slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug;
        const [existing] = await db
          .select({ id: productCategories.id })
          .from(productCategories)
          .where(eq(productCategories.slug, checkSlug))
          .limit(1);
        if (!existing) {
          slug = checkSlug;
          slugExists = false;
        } else {
          slugSuffix++;
        }
      }

      // Calculate level and path
      let level = 0;
      let parentPath: string | null = null;

      if (input.parentId) {
        const [parent] = await db
          .select()
          .from(productCategories)
          .where(eq(productCategories.id, input.parentId))
          .limit(1);

        if (!parent) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Parent category not found" });
        }

        level = (parent.level || 0) + 1;
        parentPath = parent.path;
      }

      const result = await db.insert(productCategories).values({
        name: input.name,
        slug,
        description: input.description,
        parentId: input.parentId,
        level,
        iconName: input.iconName,
        color: input.color,
        sortOrder: input.sortOrder,
      });

      const categoryId = Number(result[0].insertId);

      // Update path
      await updateCategoryPath(db, categoryId, parentPath);

      logger.info({
        msg: "[Categories] Created category",
        categoryId,
        name: input.name,
        parentId: input.parentId,
      });

      return { id: categoryId, slug };
    }),

  /**
   * Update a category
   */
  update: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(updateCategorySchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, ...updates } = input;

      // Check if category exists
      const [existing] = await db
        .select()
        .from(productCategories)
        .where(eq(productCategories.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
      }

      const updateData: Record<string, unknown> = {};

      if (updates.name !== undefined) {
        updateData.name = updates.name;
        updateData.slug = generateSlug(updates.name);
      }

      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }

      if (updates.parentId !== undefined) {
        // Prevent circular reference
        if (updates.parentId === id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Category cannot be its own parent",
          });
        }

        // Check if new parent exists (if not null)
        if (updates.parentId !== null) {
          const [parent] = await db
            .select()
            .from(productCategories)
            .where(eq(productCategories.id, updates.parentId))
            .limit(1);

          if (!parent) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Parent category not found" });
          }

          updateData.parentId = updates.parentId;
          updateData.level = (parent.level || 0) + 1;
        } else {
          updateData.parentId = null;
          updateData.level = 0;
        }
      }

      if (updates.iconName !== undefined) updateData.iconName = updates.iconName;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      await db
        .update(productCategories)
        .set(updateData)
        .where(eq(productCategories.id, id));

      logger.info({
        msg: "[Categories] Updated category",
        categoryId: id,
        updates: Object.keys(updateData),
      });

      return { success: true, id };
    }),

  /**
   * Delete a category (soft delete)
   */
  delete: protectedProcedure
    .use(requirePermission("inventory:delete"))
    .input(z.object({
      id: z.number(),
      reassignTo: z.number().optional(), // Reassign products to this category
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check for children
      const [childCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.parentId, input.id),
            isNull(productCategories.deletedAt)
          )
        );

      if (Number(childCount?.count || 0) > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete category with subcategories. Delete or move them first.",
        });
      }

      // Handle product reassignment
      if (input.reassignTo) {
        await db
          .update(productCategoryAssignments)
          .set({ categoryId: input.reassignTo })
          .where(eq(productCategoryAssignments.categoryId, input.id));
      } else {
        // Remove product assignments
        await db
          .delete(productCategoryAssignments)
          .where(eq(productCategoryAssignments.categoryId, input.id));
      }

      // Soft delete the category
      await db
        .update(productCategories)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(productCategories.id, input.id));

      logger.info({
        msg: "[Categories] Deleted category",
        categoryId: input.id,
        reassignedTo: input.reassignTo,
      });

      return { success: true };
    }),

  /**
   * Assign product to category
   */
  assignProduct: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(assignProductSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify product exists
      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      // Verify category exists
      const [category] = await db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.id, input.categoryId),
            isNull(productCategories.deletedAt)
          )
        )
        .limit(1);

      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
      }

      // Check if assignment already exists
      const [existing] = await db
        .select()
        .from(productCategoryAssignments)
        .where(
          and(
            eq(productCategoryAssignments.productId, input.productId),
            eq(productCategoryAssignments.categoryId, input.categoryId)
          )
        )
        .limit(1);

      if (existing) {
        // Update isPrimary if needed
        if (existing.isPrimary !== input.isPrimary) {
          await db
            .update(productCategoryAssignments)
            .set({ isPrimary: input.isPrimary })
            .where(eq(productCategoryAssignments.id, existing.id));
        }
        return { id: existing.id, updated: true };
      }

      // If setting as primary, unset other primaries for this product
      if (input.isPrimary) {
        await db
          .update(productCategoryAssignments)
          .set({ isPrimary: false })
          .where(eq(productCategoryAssignments.productId, input.productId));
      }

      // Create assignment
      const result = await db.insert(productCategoryAssignments).values({
        productId: input.productId,
        categoryId: input.categoryId,
        isPrimary: input.isPrimary,
      });

      return { id: Number(result[0].insertId), updated: false };
    }),

  /**
   * Remove product from category
   */
  unassignProduct: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(z.object({
      productId: z.number(),
      categoryId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .delete(productCategoryAssignments)
        .where(
          and(
            eq(productCategoryAssignments.productId, input.productId),
            eq(productCategoryAssignments.categoryId, input.categoryId)
          )
        );

      return { success: true };
    }),

  /**
   * Get products in a category
   */
  getProducts: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({
      categoryId: z.number(),
      includeSubcategories: z.boolean().default(false),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let categoryIds = [input.categoryId];

      if (input.includeSubcategories) {
        // Get all descendant category IDs
        const descendants = await db
          .select({ id: productCategories.id })
          .from(productCategories)
          .where(
            and(
              like(productCategories.path, `%/${input.categoryId}/%`),
              isNull(productCategories.deletedAt)
            )
          );

        categoryIds = [...categoryIds, ...descendants.map(d => d.id)];
      }

      const assignments = await db
        .select({
          assignment: productCategoryAssignments,
          product: products,
        })
        .from(productCategoryAssignments)
        .innerJoin(products, eq(productCategoryAssignments.productId, products.id))
        .where(
          sql`${productCategoryAssignments.categoryId} IN (${sql.join(categoryIds.map(id => sql`${id}`), sql`, `)})`
        )
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(DISTINCT product_id)` })
        .from(productCategoryAssignments)
        .where(
          sql`category_id IN (${sql.join(categoryIds.map(id => sql`${id}`), sql`, `)})`
        );

      return {
        items: assignments.map(a => ({
          ...a.product,
          isPrimary: a.assignment.isPrimary,
        })),
        total: Number(countResult?.count || 0),
      };
    }),

  /**
   * Get categories for a product
   */
  getProductCategories: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const assignments = await db
        .select({
          assignment: productCategoryAssignments,
          category: productCategories,
        })
        .from(productCategoryAssignments)
        .innerJoin(productCategories, eq(productCategoryAssignments.categoryId, productCategories.id))
        .where(eq(productCategoryAssignments.productId, input.productId));

      return assignments.map(a => ({
        ...a.category,
        isPrimary: a.assignment.isPrimary,
      }));
    }),

  /**
   * Bulk assign products to category
   */
  bulkAssign: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(z.object({
      productIds: z.array(z.number()),
      categoryId: z.number(),
      isPrimary: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify category exists
      const [category] = await db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(eq(productCategories.id, input.categoryId))
        .limit(1);

      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
      }

      let assignedCount = 0;

      for (const productId of input.productIds) {
        // Check if already assigned
        const [existing] = await db
          .select()
          .from(productCategoryAssignments)
          .where(
            and(
              eq(productCategoryAssignments.productId, productId),
              eq(productCategoryAssignments.categoryId, input.categoryId)
            )
          )
          .limit(1);

        if (!existing) {
          if (input.isPrimary) {
            await db
              .update(productCategoryAssignments)
              .set({ isPrimary: false })
              .where(eq(productCategoryAssignments.productId, productId));
          }

          await db.insert(productCategoryAssignments).values({
            productId,
            categoryId: input.categoryId,
            isPrimary: input.isPrimary,
          });
          assignedCount++;
        }
      }

      logger.info({
        msg: "[Categories] Bulk assigned products",
        categoryId: input.categoryId,
        productCount: input.productIds.length,
        assignedCount,
      });

      return { success: true, assignedCount };
    }),

  /**
   * Reorder categories
   */
  reorder: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(z.object({
      categoryIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      for (let i = 0; i < input.categoryIds.length; i++) {
        await db
          .update(productCategories)
          .set({ sortOrder: i })
          .where(eq(productCategories.id, input.categoryIds[i]));
      }

      return { success: true };
    }),
});
