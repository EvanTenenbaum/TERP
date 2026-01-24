/**
 * Catalog Router
 * API endpoints for publishing and managing the live product catalog
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  publishBatchToCatalog,
  unpublishBatchFromCatalog,
  getBatchesReadyForPublishing,
  getPublishedCatalog,
  syncCatalogQuantities,
  bulkPublishBatches,
  getCatalogStats,
} from "../services/catalogPublishingService";
import { logger } from "../_core/logger";
import { requirePermission } from "../_core/permissionMiddleware";

export const catalogRouter = router({
  /**
   * Publish a batch to the catalog
   */
  publish: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        batchId: z.number(),
        publishB2b: z.boolean().default(true),
        publishEcom: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      logger.info({ batchId: input.batchId, userId: ctx.user?.id }, "[Catalog Router] Publishing batch");

      const result = await publishBatchToCatalog(input.batchId, ctx.user?.id || 0, {
        publishB2b: input.publishB2b,
        publishEcom: input.publishEcom,
      });

      return result;
    }),

  /**
   * Unpublish a batch from the catalog
   */
  unpublish: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ input }) => {
      logger.info({ batchId: input.batchId }, "[Catalog Router] Unpublishing batch");

      const result = await unpublishBatchFromCatalog(input.batchId);

      return result;
    }),

  /**
   * Get batches ready for publishing (PHOTOGRAPHY_COMPLETE status)
   */
  getReadyForPublishing: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      return getBatchesReadyForPublishing(input.limit);
    }),

  /**
   * Get the public catalog (published items)
   */
  getPublicCatalog: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        publishedFor: z.enum(["b2b", "ecom", "all"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return getPublishedCatalog({
        category: input.category,
        search: input.search,
        publishedFor: input.publishedFor || "all",
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Sync catalog quantities and auto-unpublish sold out items
   */
  syncQuantities: protectedProcedure
    .use(requirePermission("inventory:update"))
    .mutation(async () => {
      logger.info("[Catalog Router] Starting quantity sync");

      const result = await syncCatalogQuantities();

      logger.info({ synced: result.synced, unpublished: result.unpublished }, "[Catalog Router] Sync complete");

      return result;
    }),

  /**
   * Bulk publish multiple batches
   */
  bulkPublish: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        batchIds: z.array(z.number()).min(1).max(50),
        publishB2b: z.boolean().default(true),
        publishEcom: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      logger.info(
        { batchCount: input.batchIds.length, userId: ctx.user?.id },
        "[Catalog Router] Bulk publishing batches"
      );

      const result = await bulkPublishBatches(input.batchIds, ctx.user?.id || 0, {
        publishB2b: input.publishB2b,
        publishEcom: input.publishEcom,
      });

      return result;
    }),

  /**
   * Get catalog statistics
   */
  getStats: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      return getCatalogStats();
    }),

  /**
   * Get catalog item by batch ID
   */
  getByBatchId: protectedProcedure.input(z.object({ batchId: z.number() })).query(async ({ input }) => {
    const result = await getPublishedCatalog({
      limit: 1,
    });

    const item = result.items.find(i => i.batchId === input.batchId);

    if (!item) {
      return null;
    }

    return item;
  }),
});
