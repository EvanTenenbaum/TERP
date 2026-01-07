/**
 * Product Catalogue Router
 * API endpoints for unified product catalogue management
 * FEATURE-011: Unified Product Catalogue - Foundation for sales workflow
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as productsDb from "../productsDb";
import { requirePermission } from "../_core/permissionMiddleware";
import { createSafeUnifiedResponse } from "../_core/pagination";

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
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
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
      console.log('[productCatalogue.list] Input:', {
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
      console.log('[productCatalogue.list] Result:', {
        productsCount: products.length,
        total,
        hasProducts: products.length > 0,
      });

      // Warn if unexpected empty result
      if (products.length === 0 && !input.search && !input.category && !input.brandId) {
        console.warn('[productCatalogue.list] Zero products returned with no filters - possible data issue');
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
  create: protectedProcedure
    .use(requirePermission("inventory:create"))
    .input(productSchema)
    .mutation(async ({ input }) => {
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
});
