/**
 * WS-010: Photography Router
 * Handles product photography management
 */

import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { db } from "../db";
import { productImages, batches, products, users } from "../../drizzle/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";

// Image status enum
const imageStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED']);

export const photographyRouter = router({
  /**
   * Upload product image
   */
  upload: adminProcedure
    .input(z.object({
      batchId: z.number().optional(),
      productId: z.number().optional(),
      imageUrl: z.string().url(),
      thumbnailUrl: z.string().url().optional(),
      caption: z.string().optional(),
      isPrimary: z.boolean().default(false),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate that either batchId or productId is provided
      if (!input.batchId && !input.productId) {
        throw new Error('Either batchId or productId is required');
      }

      // If setting as primary, unset other primary images
      if (input.isPrimary) {
        if (input.batchId) {
          await db
            .update(productImages)
            .set({ isPrimary: false })
            .where(eq(productImages.batchId, input.batchId));
        } else if (input.productId) {
          await db
            .update(productImages)
            .set({ isPrimary: false })
            .where(eq(productImages.productId, input.productId));
        }
      }

      const [image] = await db.insert(productImages).values({
        batchId: input.batchId,
        productId: input.productId,
        imageUrl: input.imageUrl,
        thumbnailUrl: input.thumbnailUrl,
        caption: input.caption,
        isPrimary: input.isPrimary,
        sortOrder: input.sortOrder,
        status: 'APPROVED', // Auto-approve for now
        uploadedBy: ctx.user.id,
        uploadedAt: new Date(),
      });

      return {
        imageId: image.insertId,
        success: true,
      };
    }),

  /**
   * Get images for a batch
   */
  getBatchImages: publicProcedure
    .input(z.object({
      batchId: z.number(),
    }))
    .query(async ({ input }) => {
      const images = await db
        .select({
          id: productImages.id,
          imageUrl: productImages.imageUrl,
          thumbnailUrl: productImages.thumbnailUrl,
          caption: productImages.caption,
          isPrimary: productImages.isPrimary,
          sortOrder: productImages.sortOrder,
          status: productImages.status,
          uploadedAt: productImages.uploadedAt,
          uploadedByName: users.name,
        })
        .from(productImages)
        .leftJoin(users, eq(productImages.uploadedBy, users.id))
        .where(eq(productImages.batchId, input.batchId))
        .orderBy(desc(productImages.isPrimary), productImages.sortOrder);

      return images;
    }),

  /**
   * Get images for a product
   */
  getProductImages: publicProcedure
    .input(z.object({
      productId: z.number(),
    }))
    .query(async ({ input }) => {
      const images = await db
        .select({
          id: productImages.id,
          imageUrl: productImages.imageUrl,
          thumbnailUrl: productImages.thumbnailUrl,
          caption: productImages.caption,
          isPrimary: productImages.isPrimary,
          sortOrder: productImages.sortOrder,
          status: productImages.status,
          uploadedAt: productImages.uploadedAt,
        })
        .from(productImages)
        .where(eq(productImages.productId, input.productId))
        .orderBy(desc(productImages.isPrimary), productImages.sortOrder);

      return images;
    }),

  /**
   * Get batches needing photos
   */
  getBatchesNeedingPhotos: adminProcedure
    .input(z.object({
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      // Get batches with no images
      const batchesWithoutPhotos = await db
        .select({
          id: batches.id,
          batchNumber: batches.batchNumber,
          strain: batches.strain,
          quantity: batches.quantity,
          unit: batches.unit,
          createdAt: batches.createdAt,
          productName: products.name,
        })
        .from(batches)
        .leftJoin(products, eq(batches.productId, products.id))
        .leftJoin(productImages, eq(batches.id, productImages.batchId))
        .where(and(
          eq(batches.batchStatus, 'LIVE'),
          isNull(productImages.id)
        ))
        .groupBy(batches.id)
        .orderBy(desc(batches.createdAt))
        .limit(input.limit);

      return batchesWithoutPhotos.map(b => ({
        id: b.id,
        batchNumber: b.batchNumber,
        strain: b.strain || 'Unknown',
        quantity: parseFloat(b.quantity as string),
        unit: b.unit || 'EA',
        productName: b.productName || 'Unknown Product',
        createdAt: b.createdAt,
        daysSinceCreation: b.createdAt
          ? Math.floor((Date.now() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      }));
    }),

  /**
   * Update image details
   */
  update: adminProcedure
    .input(z.object({
      imageId: z.number(),
      caption: z.string().optional(),
      isPrimary: z.boolean().optional(),
      sortOrder: z.number().optional(),
      status: imageStatusEnum.optional(),
    }))
    .mutation(async ({ input }) => {
      const { imageId, ...updates } = input;

      // If setting as primary, need to unset others
      if (updates.isPrimary) {
        const [image] = await db
          .select({ batchId: productImages.batchId, productId: productImages.productId })
          .from(productImages)
          .where(eq(productImages.id, imageId));

        if (image?.batchId) {
          await db
            .update(productImages)
            .set({ isPrimary: false })
            .where(eq(productImages.batchId, image.batchId));
        } else if (image?.productId) {
          await db
            .update(productImages)
            .set({ isPrimary: false })
            .where(eq(productImages.productId, image.productId));
        }
      }

      await db
        .update(productImages)
        .set(updates)
        .where(eq(productImages.id, imageId));

      return { success: true };
    }),

  /**
   * Delete image
   */
  delete: adminProcedure
    .input(z.object({
      imageId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await db
        .delete(productImages)
        .where(eq(productImages.id, input.imageId));

      return { success: true };
    }),

  /**
   * Reorder images
   */
  reorder: adminProcedure
    .input(z.object({
      imageIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      // Update sort order for each image
      for (let i = 0; i < input.imageIds.length; i++) {
        await db
          .update(productImages)
          .set({ sortOrder: i })
          .where(eq(productImages.id, input.imageIds[i]));
      }

      return { success: true };
    }),

  /**
   * Get photography stats
   */
  getStats: adminProcedure.query(async () => {
    // Count total images
    const totalImages = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(productImages);

    // Count batches without photos
    const batchesWithoutPhotos = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${batches.id})` })
      .from(batches)
      .leftJoin(productImages, eq(batches.id, productImages.batchId))
      .where(and(
        eq(batches.batchStatus, 'LIVE'),
        isNull(productImages.id)
      ));

    // Count total live batches
    const totalBatches = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(batches)
      .where(eq(batches.batchStatus, 'LIVE'));

    const totalBatchCount = totalBatches[0]?.count || 0;
    const withoutPhotosCount = batchesWithoutPhotos[0]?.count || 0;
    const withPhotosCount = totalBatchCount - withoutPhotosCount;

    return {
      totalImages: totalImages[0]?.count || 0,
      batchesWithPhotos: withPhotosCount,
      batchesWithoutPhotos: withoutPhotosCount,
      coveragePercent: totalBatchCount > 0
        ? Math.round((withPhotosCount / totalBatchCount) * 100)
        : 0,
    };
  }),
});
