/**
 * Product Catalogue Router
 * API endpoints for unified product catalogue management
 * FEATURE-011: Unified Product Catalogue - Foundation for sales workflow
 * FEAT-003-INLINE: In-line Product Creation API
 * MEET-037: Editable Product Names
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as productsDb from "../productsDb";
import { requirePermission } from "../_core/permissionMiddleware";
import { createSafeUnifiedResponse } from "../_core/pagination";
import { TRPCError } from "@trpc/server";

// Input validation schemas
const productSchema = z.object({
  brandId: z.number().min(1, "Brand is required"),
  strainId: z.number().nullable().optional(),
  nameCanonical: z.string().min(1, "Product name is required").max(500),
  category: z.string().min(1, "Category is required").max(100),
  subcategory: z.string().max(100).nullable().optional(),
  uomSellable: z.string().max(20).default("EA"),
  description: z.string().nullable().optional(),
});

const listInputSchema = z.object({
  // Increased limit to 500 to support ProductsPage bulk loading (was 100, caused BUG-087)
  limit: z.number().min(1).max(500).default(50),
  // BUG-087 FIX: Add max offset validation to prevent unbounded queries
  offset: z.number().min(0).max(100000).default(0),
  search: z.string().optional(),
  category: z.string().optional(),
  brandId: z.number().optional(),
  strainId: z.number().optional(),
  includeDeleted: z.boolean().default(false),
});

export const productCatalogueRouter = router({
  // List products with pagination and filters
  list: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(listInputSchema)
    .query(async ({ input, ctx }) => {
      // Debug logging for QA-049
      console.info("[productCatalogue.list] Input:", {
        limit: input.limit,
        offset: input.offset,
        search: input.search,
        category: input.category,
        brandId: input.brandId,
        strainId: input.strainId,
        includeDeleted: input.includeDeleted,
        userId: ctx.user?.id,
      });

      const products = await productsDb.getProducts(input);
      const total = await productsDb.getProductCount({
        search: input.search,
        category: input.category,
        brandId: input.brandId,
        strainId: input.strainId,
        includeDeleted: input.includeDeleted,
      });

      // Debug logging for QA-049
      console.info("[productCatalogue.list] Result:", {
        productsCount: products.length,
        total,
        hasProducts: products.length > 0,
      });

      // Warn if unexpected empty result
      if (
        products.length === 0 &&
        !input.search &&
        !input.category &&
        !input.brandId
      ) {
        console.warn(
          "[productCatalogue.list] Zero products returned with no filters - possible data issue"
        );
      }

      return createSafeUnifiedResponse(
        products,
        total,
        input.limit,
        input.offset
      );
    }),

  // Get a single product by ID
  getById: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const product = await productsDb.getProductById(input.id);
      if (!product) {
        throw new Error("Product not found");
      }
      return product;
    }),

  // Create a new product
  // TER-226: Duplicate-name guardrails — check for existing product with same name/brand
  // TER-227: Product additions should occur via batch/intake; direct creation is logged
  create: protectedProcedure
    .use(requirePermission("inventory:create"))
    .input(
      productSchema.extend({
        // TER-227: Track creation source for audit trail
        source: z.enum(["intake", "catalogue", "import"]).default("catalogue"),
      })
    )
    .mutation(async ({ input }) => {
      // TER-226: Check for duplicate product name within the same brand
      const duplicate = await productsDb.findDuplicateProduct(
        input.nameCanonical,
        input.brandId
      );
      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A product named "${input.nameCanonical}" already exists for this brand (ID: ${duplicate.id}). Use the existing product or choose a different name.`,
        });
      }

      // TER-227: Log when product is created outside intake context
      if (input.source !== "intake") {
        console.warn(
          `[productCatalogue.create] Product "${input.nameCanonical}" created via ${input.source} (not intake). Consider using batch/intake flow.`
        );
      }

      const result = await productsDb.createProduct({
        brandId: input.brandId,
        strainId: input.strainId ?? null,
        nameCanonical: input.nameCanonical,
        category: input.category,
        subcategory: input.subcategory ?? null,
        uomSellable: input.uomSellable,
        description: input.description ?? null,
      });
      return result;
    }),

  // Update an existing product
  update: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        id: z.number(),
        data: productSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify product exists
      const existing = await productsDb.getProductById(input.id);
      if (!existing) {
        throw new Error("Product not found");
      }
      if (existing.deletedAt) {
        throw new Error("Cannot update a deleted product");
      }

      const result = await productsDb.updateProduct(input.id, input.data);
      return result;
    }),

  // Soft delete a product
  delete: protectedProcedure
    .use(requirePermission("inventory:delete"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Verify product exists
      const existing = await productsDb.getProductById(input.id);
      if (!existing) {
        throw new Error("Product not found");
      }
      if (existing.deletedAt) {
        throw new Error("Product is already deleted");
      }

      const result = await productsDb.deleteProduct(input.id);
      return result;
    }),

  // Restore a soft-deleted product
  restore: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await productsDb.getProductById(input.id);
      if (!existing) {
        throw new Error("Product not found");
      }
      if (!existing.deletedAt) {
        throw new Error("Product is not deleted");
      }

      const result = await productsDb.restoreProduct(input.id);
      return result;
    }),

  // Get all unique categories for filter dropdown
  getCategories: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      return await productsDb.getProductCategories();
    }),

  // Get all brands for dropdown
  getBrands: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      return await productsDb.getAllBrands();
    }),

  // Get all strains for dropdown
  getStrains: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      return await productsDb.getAllStrains();
    }),

  // ==========================================================================
  // FEAT-003-INLINE: In-line Product Creation API
  // ==========================================================================

  /**
   * Quick create a product with minimal fields
   * - Auto-generates product code
   * - Checks for duplicates by name/brand
   * - Returns created product immediately
   * - Supports creation during order entry
   */
  quickCreate: protectedProcedure
    .use(requirePermission("inventory:create"))
    .input(
      z.object({
        name: z.string().min(1, "Product name is required").max(500),
        category: z.string().min(1, "Category is required").max(100),
        brandId: z.number().min(1, "Brand is required"),
        strainId: z.number().nullable().optional(),
        subcategory: z.string().max(100).nullable().optional(),
        uomSellable: z.string().max(20).default("EA"),
        description: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.info("[productCatalogue.quickCreate] Creating product:", {
          name: input.name,
          category: input.category,
          brandId: input.brandId,
        });

        const result = await productsDb.quickCreateProduct({
          name: input.name,
          category: input.category,
          brandId: input.brandId,
          strainId: input.strainId ?? null,
          subcategory: input.subcategory ?? null,
          uomSellable: input.uomSellable,
          description: input.description ?? null,
        });

        if (result.isDuplicate) {
          console.info(
            "[productCatalogue.quickCreate] Found duplicate product:",
            result.id
          );
        } else {
          console.info("[productCatalogue.quickCreate] Created new product:", {
            id: result.id,
            generatedCode: result.generatedCode,
          });
        }

        return {
          success: true,
          product: result,
          isDuplicate: result.isDuplicate,
          message: result.isDuplicate
            ? `Found existing product: ${result.nameCanonical}`
            : `Created product: ${result.nameCanonical}`,
        };
      } catch (error) {
        console.error("[productCatalogue.quickCreate] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create product",
        });
      }
    }),

  /**
   * Check if a product with the given name exists
   * Used for duplicate detection before creation
   */
  checkDuplicate: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        name: z.string().min(1),
        brandId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const duplicate = await productsDb.findDuplicateProduct(
        input.name,
        input.brandId
      );
      return {
        exists: duplicate !== null,
        product: duplicate,
      };
    }),

  /**
   * Search products by name (for autocomplete)
   * Returns up to 10 matches
   */
  searchByName: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input }) => {
      const results = await productsDb.searchProductsByName(
        input.query,
        input.limit
      );
      return results;
    }),

  // ==========================================================================
  // MEET-037: Editable Product Names
  // ==========================================================================

  /**
   * Update product name inline
   * Validates for duplicates before updating
   */
  updateName: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "Product name is required").max(500),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await productsDb.updateProductName(input.id, input.name);
        return {
          success: true,
          message: "Product name updated successfully",
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update product name",
        });
      }
    }),
});
