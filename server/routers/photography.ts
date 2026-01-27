/**
 * WS-010: Photography Router
 * Handles product photography management with session workflow
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import { getDb } from "../db";
import {
  productImages,
  batches,
  products,
  users,
  strains,
} from "../../drizzle/schema";
import { eq, and, desc, sql, isNull, or } from "drizzle-orm";
import { storagePut, isStorageConfigured } from "../storage";
import { logger } from "../_core/logger";
import { TRPCError } from "@trpc/server";

// Image status enum
const imageStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED", "ARCHIVED"]);

export const photographyRouter = router({
  /**
   * Upload product image
   */
  upload: adminProcedure
    .input(
      z.object({
        batchId: z.number().optional(),
        productId: z.number().optional(),
        imageUrl: z.string().url(),
        thumbnailUrl: z.string().url().optional(),
        caption: z.string().optional(),
        isPrimary: z.boolean().default(false),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate that either batchId or productId is provided
      if (!input.batchId && !input.productId) {
        throw new Error("Either batchId or productId is required");
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
        status: "APPROVED", // Auto-approve for now
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
  getBatchImages: protectedProcedure
    .input(
      z.object({
        batchId: z.number(),
      })
    )
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
  getProductImages: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
      })
    )
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
    .input(
      z.object({
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      // FIX: Try query with strains join, fall back to simpler query if schema doesn't support it
      let batchesWithoutPhotos: Array<{
        id: number;
        batchCode: string;
        onHandQty: string | null;
        createdAt: Date | null;
        productName: string | null;
        uomSellable: string | null;
        strainName: string | null;
      }>;

      try {
        // Get batches with no images (with strain info)
        batchesWithoutPhotos = await db
          .select({
            id: batches.id,
            batchCode: batches.code,
            onHandQty: batches.onHandQty,
            createdAt: batches.createdAt,
            productName: products.nameCanonical,
            uomSellable: products.uomSellable,
            strainName: strains.name,
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
          .leftJoin(strains, eq(products.strainId, strains.id))
          .leftJoin(productImages, eq(batches.id, productImages.batchId))
          .where(
            and(
              eq(batches.batchStatus, "LIVE"),
              isNull(productImages.id),
              isNull(batches.deletedAt)
            )
          )
          .groupBy(batches.id)
          .orderBy(desc(batches.createdAt))
          .limit(input.limit);
      } catch (queryError) {
        // Log the actual error for debugging
        logger.warn(
          { error: queryError },
          "getBatchesNeedingPhotos query with strains failed, falling back to simpler query"
        );

        // Fallback query without strains join
        batchesWithoutPhotos = await db
          .select({
            id: batches.id,
            batchCode: batches.code,
            onHandQty: batches.onHandQty,
            createdAt: batches.createdAt,
            productName: products.nameCanonical,
            uomSellable: products.uomSellable,
            strainName: sql<string | null>`NULL`.as("strainName"),
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
          .leftJoin(productImages, eq(batches.id, productImages.batchId))
          .where(
            and(
              eq(batches.batchStatus, "LIVE"),
              isNull(productImages.id),
              isNull(batches.deletedAt)
            )
          )
          .groupBy(batches.id)
          .orderBy(desc(batches.createdAt))
          .limit(input.limit);
      }

      return batchesWithoutPhotos.map(b => ({
        id: b.id,
        batchCode: b.batchCode,
        strain: b.strainName ?? "Unknown",
        quantity: parseFloat(b.onHandQty ?? "0"),
        unit: b.uomSellable ?? "EA",
        productName: b.productName ?? "Unknown Product",
        createdAt: b.createdAt,
        daysSinceCreation: b.createdAt
          ? Math.floor(
              (Date.now() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0,
      }));
    }),

  /**
   * Update image details
   */
  update: adminProcedure
    .input(
      z.object({
        imageId: z.number(),
        caption: z.string().optional(),
        isPrimary: z.boolean().optional(),
        sortOrder: z.number().optional(),
        status: imageStatusEnum.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { imageId, ...updates } = input;

      // If setting as primary, need to unset others
      if (updates.isPrimary) {
        const [image] = await db
          .select({
            batchId: productImages.batchId,
            productId: productImages.productId,
          })
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
    .input(
      z.object({
        imageId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await db.delete(productImages).where(eq(productImages.id, input.imageId));

      return { success: true };
    }),

  /**
   * Reorder images
   */
  reorder: adminProcedure
    .input(
      z.object({
        imageIds: z.array(z.number()),
      })
    )
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
      .where(and(eq(batches.batchStatus, "LIVE"), isNull(productImages.id)));

    // Count total live batches
    const totalBatches = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(batches)
      .where(eq(batches.batchStatus, "LIVE"));

    const totalBatchCount = totalBatches[0]?.count || 0;
    const withoutPhotosCount = batchesWithoutPhotos[0]?.count || 0;
    const withPhotosCount = totalBatchCount - withoutPhotosCount;

    return {
      totalImages: totalImages[0]?.count || 0,
      batchesWithPhotos: withPhotosCount,
      batchesWithoutPhotos: withoutPhotosCount,
      coveragePercent:
        totalBatchCount > 0
          ? Math.round((withPhotosCount / totalBatchCount) * 100)
          : 0,
    };
  }),

  /**
   * Get photography queue for the UI
   * Returns batches that need photos, are being photographed, or have been completed
   */
  getQueue: adminProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // Build base query conditions
      const conditions = [isNull(batches.deletedAt)];

      // Filter by status - map UI status to batch status
      if (input.status === "COMPLETED") {
        conditions.push(eq(batches.batchStatus, "PHOTOGRAPHY_COMPLETE"));
      } else if (input.status === "PENDING" || input.status === "IN_PROGRESS") {
        // Pending/In-Progress are LIVE batches without photos
        conditions.push(eq(batches.batchStatus, "LIVE"));
      }

      // FIX: Try query with strains join, fall back to simpler query if schema doesn't support it
      let results: Array<{
        batchId: number;
        batchCode: string;
        batchStatus: string;
        productName: string | null;
        strainName: string | null;
        createdAt: Date | null;
        hasImages: number;
      }>;

      try {
        // Get batches with product and strain info
        results = await db
          .select({
            batchId: batches.id,
            batchCode: batches.code,
            batchStatus: batches.batchStatus,
            productName: products.nameCanonical,
            strainName: strains.name,
            createdAt: batches.createdAt,
            hasImages: sql<number>`COUNT(${productImages.id})`.as("hasImages"),
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
          .leftJoin(strains, eq(products.strainId, strains.id))
          .leftJoin(productImages, eq(batches.id, productImages.batchId))
          .where(and(...conditions))
          .groupBy(
            batches.id,
            batches.code,
            batches.batchStatus,
            products.nameCanonical,
            strains.name,
            batches.createdAt
          )
          .orderBy(desc(batches.createdAt))
          .limit(100);
      } catch (queryError) {
        // Log the actual error for debugging
        logger.warn(
          { error: queryError },
          "Photography queue query with strains failed, falling back to simpler query"
        );

        // Fallback query without strains join (in case strainId column doesn't exist)
        results = await db
          .select({
            batchId: batches.id,
            batchCode: batches.code,
            batchStatus: batches.batchStatus,
            productName: products.nameCanonical,
            strainName: sql<string | null>`NULL`.as("strainName"),
            createdAt: batches.createdAt,
            hasImages: sql<number>`COUNT(${productImages.id})`.as("hasImages"),
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
          .leftJoin(productImages, eq(batches.id, productImages.batchId))
          .where(and(...conditions))
          .groupBy(
            batches.id,
            batches.code,
            batches.batchStatus,
            products.nameCanonical,
            batches.createdAt
          )
          .orderBy(desc(batches.createdAt))
          .limit(100);
      }

      // Apply search filter and map results
      let filteredResults = results;
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filteredResults = results.filter(
          r =>
            r.productName?.toLowerCase().includes(searchLower) ||
            r.strainName?.toLowerCase().includes(searchLower) ||
            r.batchCode?.toLowerCase().includes(searchLower)
        );
      }

      // Calculate stats
      const allBatches = await db
        .select({
          batchId: batches.id,
          batchStatus: batches.batchStatus,
          createdAt: batches.createdAt,
          hasImages: sql<number>`COUNT(${productImages.id})`.as("hasImages"),
        })
        .from(batches)
        .leftJoin(productImages, eq(batches.id, productImages.batchId))
        .where(
          and(
            isNull(batches.deletedAt),
            or(
              eq(batches.batchStatus, "LIVE"),
              eq(batches.batchStatus, "PHOTOGRAPHY_COMPLETE")
            )
          )
        )
        .groupBy(batches.id, batches.batchStatus, batches.createdAt);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        pending: allBatches.filter(
          b => b.batchStatus === "LIVE" && Number(b.hasImages) === 0
        ).length,
        inProgress: 0, // Could track partial uploads if needed
        completedToday: allBatches.filter(
          b =>
            b.batchStatus === "PHOTOGRAPHY_COMPLETE" &&
            b.createdAt &&
            b.createdAt >= today
        ).length,
      };

      // Map to UI format
      const items = filteredResults.map(r => {
        let status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
        if (r.batchStatus === "PHOTOGRAPHY_COMPLETE") {
          status = "COMPLETED";
        } else if (Number(r.hasImages) > 0) {
          status = "IN_PROGRESS";
        } else {
          status = "PENDING";
        }

        return {
          batchId: r.batchId,
          productName: r.productName ?? "Unknown Product",
          strainName: r.strainName ?? null,
          status,
          addedAt: r.createdAt,
        };
      });

      // Filter by status if specified
      let finalItems = items;
      if (input.status) {
        finalItems = items.filter(i => i.status === input.status);
      }

      return {
        items: finalItems,
        stats,
      };
    }),

  /**
   * Mark a batch as photography complete
   */
  markComplete: adminProcedure
    .input(
      z.object({
        batchId: z.number(),
        imageUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // If imageUrls are provided, add them first
      if (input.imageUrls && input.imageUrls.length > 0) {
        for (let i = 0; i < input.imageUrls.length; i++) {
          await db.insert(productImages).values({
            batchId: input.batchId,
            imageUrl: input.imageUrls[i],
            isPrimary: i === 0,
            sortOrder: i,
            status: "APPROVED",
            uploadedBy: ctx.user.id,
            uploadedAt: new Date(),
          });
        }
      }

      // Update batch status to PHOTOGRAPHY_COMPLETE
      await db
        .update(batches)
        .set({
          batchStatus: "PHOTOGRAPHY_COMPLETE",
          updatedAt: new Date(),
        })
        .where(eq(batches.id, input.batchId));

      return { success: true };
    }),

  /**
   * Start a photography session for a batch
   * Changes batch from LIVE/AWAITING_INTAKE to in-progress photography
   */
  startSession: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Get batch
      const [batch] = await database
        .select()
        .from(batches)
        .where(eq(batches.id, input.batchId));

      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      // Allow starting session for LIVE or AWAITING_INTAKE batches
      if (!["LIVE", "AWAITING_INTAKE"].includes(batch.batchStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Batch cannot start photography from ${batch.batchStatus} status`,
        });
      }

      // Update batch metadata to track photography session
      const metadata = batch.metadata ? JSON.parse(batch.metadata) : {};
      metadata.photographyStartedAt = new Date().toISOString();
      metadata.photographyById = ctx.user?.id;

      await database
        .update(batches)
        .set({
          metadata: JSON.stringify(metadata),
          updatedAt: new Date(),
        })
        .where(eq(batches.id, input.batchId));

      logger.info(
        { batchId: input.batchId, userId: ctx.user?.id },
        "[Photography] Session started"
      );

      return { success: true, batchId: input.batchId };
    }),

  /**
   * Upload a photo for a batch with storage integration
   */
  uploadPhoto: protectedProcedure
    .input(
      z.object({
        batchId: z.number(),
        photoData: z.string(), // base64 encoded image
        photoType: z.enum(["primary", "secondary", "detail", "packaging"]),
        sortOrder: z.number().optional(),
        caption: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Check if storage is configured
      if (!isStorageConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Storage is not configured. Please contact administrator.",
        });
      }

      // Verify batch exists
      const [batch] = await database
        .select()
        .from(batches)
        .where(eq(batches.id, input.batchId));

      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      // Decode base64 and upload to storage
      const photoBuffer = Buffer.from(input.photoData, "base64");
      const timestamp = Date.now();
      const storageKey = `batch-photos/${batch.code}/${input.photoType}-${timestamp}.jpg`;

      const { url } = await storagePut(storageKey, photoBuffer, "image/jpeg");

      // Determine if this should be primary
      const isPrimary = input.photoType === "primary";

      // If setting as primary, unset other primary images for this batch
      if (isPrimary) {
        await database
          .update(productImages)
          .set({ isPrimary: false })
          .where(eq(productImages.batchId, input.batchId));
      }

      // Get next sort order if not provided
      let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        const existingPhotos = await database
          .select({ sortOrder: productImages.sortOrder })
          .from(productImages)
          .where(eq(productImages.batchId, input.batchId))
          .orderBy(desc(productImages.sortOrder))
          .limit(1);
        sortOrder = (existingPhotos[0]?.sortOrder || 0) + 1;
      }

      // Create photo record
      const [photo] = await database.insert(productImages).values({
        batchId: input.batchId,
        productId: batch.productId,
        imageUrl: url,
        caption: input.caption || `${input.photoType} photo`,
        isPrimary,
        sortOrder,
        status: "APPROVED",
        uploadedBy: ctx.user?.id,
        uploadedAt: new Date(),
      });

      logger.info(
        {
          batchId: input.batchId,
          photoId: photo.insertId,
          photoType: input.photoType,
        },
        "[Photography] Photo uploaded"
      );

      return {
        success: true,
        photoId: photo.insertId,
        url,
        photoType: input.photoType,
      };
    }),

  /**
   * Complete a photography session with validation
   * Requires at least one primary photo
   */
  completeSession: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Get batch
      const [batch] = await database
        .select()
        .from(batches)
        .where(eq(batches.id, input.batchId));

      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      // Get photos for batch
      const photos = await database
        .select()
        .from(productImages)
        .where(eq(productImages.batchId, input.batchId));

      // Require at least one primary photo
      const hasPrimary = photos.some(p => p.isPrimary);
      if (!hasPrimary) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "At least one primary photo is required to complete photography",
        });
      }

      // Update batch metadata
      const metadata = batch.metadata ? JSON.parse(batch.metadata) : {};
      metadata.photographyCompletedAt = new Date().toISOString();
      metadata.photographyCompletedBy = ctx.user?.id;
      metadata.photoCount = photos.length;

      // Update batch status to PHOTOGRAPHY_COMPLETE (sub-status of LIVE)
      await database
        .update(batches)
        .set({
          batchStatus: "PHOTOGRAPHY_COMPLETE",
          metadata: JSON.stringify(metadata),
          updatedAt: new Date(),
        })
        .where(eq(batches.id, input.batchId));

      logger.info(
        { batchId: input.batchId, photoCount: photos.length },
        "[Photography] Session completed"
      );

      return {
        success: true,
        batchId: input.batchId,
        photoCount: photos.length,
      };
    }),

  /**
   * Delete a photo with cleanup
   */
  deletePhoto: protectedProcedure
    .input(z.object({ photoId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const [photo] = await database
        .select()
        .from(productImages)
        .where(eq(productImages.id, input.photoId));

      if (!photo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
      }

      // Delete the record (storage cleanup can be done in background/cron)
      await database
        .delete(productImages)
        .where(eq(productImages.id, input.photoId));

      logger.info(
        { photoId: input.photoId, batchId: photo.batchId },
        "[Photography] Photo deleted"
      );

      return { success: true };
    }),

  /**
   * Get batches awaiting photography
   * Returns batches in AWAITING_INTAKE or LIVE status without photos
   */
  getAwaitingPhotography: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Get batches without photos in appropriate status
      // BUG-112: Added fallback query for schema drift (strainId may not exist)
      let batchesAwaitingPhotos;
      try {
        batchesAwaitingPhotos = await database
          .select({
            id: batches.id,
            code: batches.code,
            sku: batches.sku,
            batchStatus: batches.batchStatus,
            onHandQty: batches.onHandQty,
            createdAt: batches.createdAt,
            productName: products.nameCanonical,
            category: products.category,
            strainName: strains.name,
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
          .leftJoin(strains, eq(products.strainId, strains.id))
          .leftJoin(productImages, eq(batches.id, productImages.batchId))
          .where(
            and(
              or(
                eq(batches.batchStatus, "LIVE"),
                eq(batches.batchStatus, "AWAITING_INTAKE")
              ),
              isNull(productImages.id),
              isNull(batches.deletedAt)
            )
          )
          .groupBy(batches.id)
          .orderBy(desc(batches.createdAt))
          .limit(input.limit);
      } catch (queryError) {
        // Fallback: Query without strains join if strainId column doesn't exist
        logger.warn(
          { error: queryError },
          "getAwaitingPhotography: Query with strains join failed, falling back to simpler query"
        );
        batchesAwaitingPhotos = await database
          .select({
            id: batches.id,
            code: batches.code,
            sku: batches.sku,
            batchStatus: batches.batchStatus,
            onHandQty: batches.onHandQty,
            createdAt: batches.createdAt,
            productName: products.nameCanonical,
            category: products.category,
            strainName: sql<string | null>`NULL`.as("strainName"),
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
          .leftJoin(productImages, eq(batches.id, productImages.batchId))
          .where(
            and(
              or(
                eq(batches.batchStatus, "LIVE"),
                eq(batches.batchStatus, "AWAITING_INTAKE")
              ),
              isNull(productImages.id),
              isNull(batches.deletedAt)
            )
          )
          .groupBy(batches.id)
          .orderBy(desc(batches.createdAt))
          .limit(input.limit);
      }

      return batchesAwaitingPhotos.map(b => ({
        id: b.id,
        batchCode: b.code,
        sku: b.sku,
        status: b.batchStatus,
        productName: b.productName || "Unknown Product",
        category: b.category || "Unknown",
        strain: b.strainName || null,
        quantity: parseFloat(b.onHandQty || "0"),
        createdAt: b.createdAt,
        daysSinceCreation: b.createdAt
          ? Math.floor(
              (Date.now() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0,
      }));
    }),
});
