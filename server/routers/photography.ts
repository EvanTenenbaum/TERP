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
import { eq, and, desc, sql, isNull, or, ne } from "drizzle-orm";
import { storagePut, isStorageConfigured } from "../storage";
import { logger } from "../_core/logger";
import { TRPCError } from "@trpc/server";

/**
 * Helper to check if an error is a schema-related error (e.g., missing column)
 * QA-003: Only fallback for schema errors, re-throw others
 * BUG-112: Enhanced to handle MySQL2 driver errors that may not be Error instances
 */
function isSchemaError(error: unknown): boolean {
  // Extract error message and code from various error formats
  let msg = "";
  let errorCode: string | number | undefined;
  let errno: number | undefined;

  // Case 1: Error instance
  if (error instanceof Error) {
    msg = error.message;
    // Check if Error has additional properties (MySQL2 format)
    if ("code" in error) {
      const code = (error as unknown as { code?: unknown }).code;
      if (typeof code === "string" || typeof code === "number") {
        errorCode = code;
      }
    }
    if ("errno" in error) {
      const errNo = (error as unknown as { errno?: unknown }).errno;
      if (typeof errNo === "number") {
        errno = errNo;
      }
    }
    // Check for nested cause
    if ("cause" in error && error.cause) {
      return isSchemaError(error.cause);
    }
  }
  // Case 2: Plain object with message property
  else if (error && typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === "string") {
      msg = errObj.message;
    }
    if (typeof errObj.sqlMessage === "string") {
      msg = errObj.sqlMessage;
    }
    if (typeof errObj.code === "string" || typeof errObj.code === "number") {
      errorCode = errObj.code;
    }
    if (typeof errObj.errno === "number") {
      errno = errObj.errno;
    }
    // Check for nested cause or originalError
    if (errObj.cause) {
      return isSchemaError(errObj.cause);
    }
    if (errObj.originalError) {
      return isSchemaError(errObj.originalError);
    }
  }
  // Case 3: String error
  else if (typeof error === "string") {
    msg = error;
  }

  // If no message extracted, log and return false
  if (!msg && !errorCode && !errno) {
    logger.warn(
      {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorKeys: error && typeof error === "object" ? Object.keys(error) : [],
      },
      "isSchemaError: Could not extract error information"
    );
    return false;
  }

  // Check MySQL error codes (most reliable)
  if (errno === 1054) return true; // ER_BAD_FIELD_ERROR
  if (errno === 1146) return true; // ER_NO_SUCH_TABLE
  if (errorCode === "ER_BAD_FIELD_ERROR") return true;
  if (errorCode === "ER_NO_SUCH_TABLE") return true;
  if (errorCode === 1054) return true;
  if (errorCode === 1146) return true;

  // Check error message patterns
  const msgLower = msg.toLowerCase();
  return (
    msgLower.includes("unknown column") ||
    msgLower.includes("no such column") ||
    msgLower.includes("er_bad_field_error") ||
    msgLower.includes("er_no_such_table") ||
    (msgLower.includes("table") && msgLower.includes("doesn't exist")) ||
    (msgLower.includes("table") && msgLower.includes("does not exist")) ||
    (msgLower.includes("column") && msgLower.includes("does not exist")) ||
    (msgLower.includes("column") && msgLower.includes("on clause"))
  );
}

// Image status enum
const imageStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED", "ARCHIVED"]);
const visibleImageStatusWhere = or(
  isNull(productImages.status),
  eq(productImages.status, "APPROVED"),
  eq(productImages.status, "PENDING")
);

async function ensureExactlyOneVisiblePrimaryForGroup(group: {
  batchId?: number | null;
  productId?: number | null;
}): Promise<void> {
  const groupWhere = group.batchId
    ? eq(productImages.batchId, group.batchId)
    : group.productId
      ? eq(productImages.productId, group.productId)
      : null;

  if (!groupWhere) return;

  const visibleImages = await db
    .select({
      id: productImages.id,
      isPrimary: productImages.isPrimary,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(and(groupWhere, visibleImageStatusWhere))
    .orderBy(desc(productImages.isPrimary), productImages.sortOrder, productImages.id);

  if (visibleImages.length === 0) return;

  const visiblePrimaryIds = visibleImages
    .filter(img => Boolean(img.isPrimary))
    .map(img => img.id);

  const desiredPrimaryId =
    visiblePrimaryIds.length === 1 ? visiblePrimaryIds[0] : visibleImages[0].id;

  // Make sure the desired primary is the only primary for this group, including hidden images.
  await db
    .update(productImages)
    .set({ isPrimary: false })
    .where(and(groupWhere, ne(productImages.id, desiredPrimaryId)));

  await db
    .update(productImages)
    .set({ isPrimary: true })
    .where(eq(productImages.id, desiredPrimaryId));
}

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
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate that either batchId or productId is provided
      if (!input.batchId && !input.productId) {
        throw new Error("Either batchId or productId is required");
      }

      const groupWhere = input.batchId
        ? eq(productImages.batchId, input.batchId)
        : eq(productImages.productId, input.productId!);

      const [{ maxSortOrder }] = await db
        .select({
          maxSortOrder: sql<number>`COALESCE(MAX(${productImages.sortOrder}), -1)`.as(
            "maxSortOrder"
          ),
        })
        .from(productImages)
        .where(groupWhere);

      const nextSortOrder =
        typeof input.sortOrder === "number"
          ? input.sortOrder
          : (maxSortOrder ?? -1) + 1;

      // If there are no visible images yet, make this image primary even if caller didn't request it.
      const existingVisibleImages = await db
        .select({ id: productImages.id })
        .from(productImages)
        .where(and(groupWhere, visibleImageStatusWhere))
        .limit(1);

      const shouldBePrimary = input.isPrimary || existingVisibleImages.length === 0;

      if (shouldBePrimary) {
        await db.update(productImages).set({ isPrimary: false }).where(groupWhere);
      }

      const [image] = await db.insert(productImages).values({
        batchId: input.batchId,
        productId: input.productId,
        imageUrl: input.imageUrl,
        thumbnailUrl: input.thumbnailUrl,
        caption: input.caption,
        isPrimary: shouldBePrimary,
        sortOrder: nextSortOrder,
        status: "APPROVED", // Auto-approve for now
        uploadedBy: ctx.user.id,
        uploadedAt: new Date(),
      });

      await ensureExactlyOneVisiblePrimaryForGroup({
        batchId: input.batchId,
        productId: input.productId,
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
        const errObj =
          queryError && typeof queryError === "object"
            ? (queryError as Record<string, unknown>)
            : null;
        const errorCode =
          errObj &&
          (typeof errObj.code === "string" || typeof errObj.code === "number")
            ? errObj.code
            : undefined;
        const errorErrno =
          errObj && typeof errObj.errno === "number" ? errObj.errno : undefined;
        const errorSqlMessage =
          errObj && typeof errObj.sqlMessage === "string"
            ? errObj.sqlMessage
            : undefined;

        // ENHANCED LOGGING (BUG-112): Capture actual error format for debugging
        logger.error(
          {
            error: queryError,
            errorType: typeof queryError,
            errorConstructor: queryError?.constructor?.name,
            errorKeys:
              queryError && typeof queryError === "object"
                ? Object.keys(queryError)
                : [],
            errorMessage:
              queryError instanceof Error ? queryError.message : undefined,
            errorCode,
            errorErrno,
            errorSqlMessage,
          },
          "getBatchesNeedingPhotos: Query with strains join failed - analyzing error format"
        );

        // QA-003: Only fallback for schema-related errors
        if (!isSchemaError(queryError)) {
          logger.error(
            { error: queryError },
            "Not a schema error, re-throwing to caller"
          );
          throw queryError;
        }

        // Log the fallback
        logger.warn(
          { error: queryError },
          "Schema error detected, falling back to query without strains join"
        );

        // Fallback query without strains join and product_images join
        // (in case strainId column or product_images table doesn't exist)
        // Note: Without product_images table, we return all LIVE batches
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
          .where(
            and(eq(batches.batchStatus, "LIVE"), isNull(batches.deletedAt))
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

      const [existingImage] = await db
        .select({
          id: productImages.id,
          batchId: productImages.batchId,
          productId: productImages.productId,
          status: productImages.status,
          isPrimary: productImages.isPrimary,
        })
        .from(productImages)
        .where(eq(productImages.id, imageId));

      if (!existingImage) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Image not found" });
      }

      const groupWhere = existingImage.batchId
        ? eq(productImages.batchId, existingImage.batchId)
        : existingImage.productId
          ? eq(productImages.productId, existingImage.productId)
          : null;

      if (!groupWhere) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Image is not associated with a batch or product",
        });
      }

      const nextStatus = updates.status ?? existingImage.status;
      const nextIsPrimary = updates.isPrimary ?? existingImage.isPrimary;

      // Hidden images cannot be primary. If caller explicitly asks for this, reject.
      if (
        (nextStatus === "ARCHIVED" || nextStatus === "REJECTED") &&
        nextIsPrimary === true
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hidden images cannot be set as primary",
        });
      }

      // If hiding, force primary to false (avoid invalid state when hiding the current primary).
      if (nextStatus === "ARCHIVED" || nextStatus === "REJECTED") {
        updates.isPrimary = false;
      }

      // If un-hiding and no explicit sortOrder was provided, put the image at the end of the visible list.
      const isBecomingVisible =
        (existingImage.status === "ARCHIVED" || existingImage.status === "REJECTED") &&
        (nextStatus === null || nextStatus === "APPROVED" || nextStatus === "PENDING");

      if (isBecomingVisible && typeof updates.sortOrder !== "number") {
        const [{ maxSortOrder }] = await db
          .select({
            maxSortOrder: sql<number>`COALESCE(MAX(${productImages.sortOrder}), -1)`.as(
              "maxSortOrder"
            ),
          })
          .from(productImages)
          .where(and(groupWhere, visibleImageStatusWhere));

        updates.sortOrder = (maxSortOrder ?? -1) + 1;
      }

      // If setting as primary, unset others first.
      if (updates.isPrimary) {
        await db.update(productImages).set({ isPrimary: false }).where(groupWhere);
      }

      await db
        .update(productImages)
        .set(updates)
        .where(eq(productImages.id, imageId));

      await ensureExactlyOneVisiblePrimaryForGroup({
        batchId: existingImage.batchId,
        productId: existingImage.productId,
      });

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
      const uniqueIds = new Set(input.imageIds);
      if (uniqueIds.size !== input.imageIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Duplicate image IDs are not allowed",
        });
      }

      if (input.imageIds.length === 0) {
        return { success: true };
      }

      const rows = await db
        .select({
          id: productImages.id,
          batchId: productImages.batchId,
          productId: productImages.productId,
        })
        .from(productImages)
        .where(sql`${productImages.id} IN (${sql.join(
          input.imageIds.map(id => sql`${id}`),
          sql`, `
        )})`);

      if (rows.length !== input.imageIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more images were not found",
        });
      }

      const first = rows[0];
      const allSameBatch =
        first.batchId !== null && rows.every(r => r.batchId === first.batchId);
      const allSameProduct =
        first.productId !== null && rows.every(r => r.productId === first.productId);

      if (!allSameBatch && !allSameProduct) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Images must all belong to the same batch or the same product",
        });
      }

      await db.transaction(async tx => {
        for (let i = 0; i < input.imageIds.length; i++) {
          await tx
            .update(productImages)
            .set({ sortOrder: i })
            .where(eq(productImages.id, input.imageIds[i]));
        }
      });

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
        const errObj =
          queryError && typeof queryError === "object"
            ? (queryError as Record<string, unknown>)
            : null;
        const errorCode =
          errObj &&
          (typeof errObj.code === "string" || typeof errObj.code === "number")
            ? errObj.code
            : undefined;
        const errorErrno =
          errObj && typeof errObj.errno === "number" ? errObj.errno : undefined;
        const errorSqlMessage =
          errObj && typeof errObj.sqlMessage === "string"
            ? errObj.sqlMessage
            : undefined;

        // ENHANCED LOGGING (BUG-112): Capture actual error format for debugging
        logger.error(
          {
            error: queryError,
            errorType: typeof queryError,
            errorConstructor: queryError?.constructor?.name,
            errorKeys:
              queryError && typeof queryError === "object"
                ? Object.keys(queryError)
                : [],
            errorMessage:
              queryError instanceof Error ? queryError.message : undefined,
            errorCode,
            errorErrno,
            errorSqlMessage,
          },
          "Photography queue query with strains failed - analyzing error format"
        );

        // QA-003: Only fallback for schema-related errors
        if (!isSchemaError(queryError)) {
          logger.error(
            { error: queryError },
            "Not a schema error, re-throwing to caller"
          );
          throw queryError;
        }

        // Log the fallback
        logger.warn(
          { error: queryError },
          "Schema error detected, falling back to query without strains join"
        );

        // Fallback query without strains join and product_images join
        // (in case strainId column or product_images table doesn't exist)
        results = await db
          .select({
            batchId: batches.id,
            batchCode: batches.code,
            batchStatus: batches.batchStatus,
            productName: products.nameCanonical,
            strainName: sql<string | null>`NULL`.as("strainName"),
            createdAt: batches.createdAt,
            hasImages: sql<number>`0`.as("hasImages"),
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
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

      // Guard: do not allow completion without at least one visible image.
      // "Visible" excludes ARCHIVED/REJECTED to align with batch surfacing.
      const existingImages = await db
        .select({
          id: productImages.id,
          isPrimary: productImages.isPrimary,
          status: productImages.status,
        })
        .from(productImages)
        .where(eq(productImages.batchId, input.batchId));

      const visibleImages = existingImages.filter(
        img => img.status !== "ARCHIVED" && img.status !== "REJECTED"
      );

      if (visibleImages.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one photo is required to complete photography",
        });
      }

      const hasVisiblePrimary = visibleImages.some(img =>
        Boolean(img.isPrimary)
      );
      if (!hasVisiblePrimary) {
        // Repair state: ensure exactly one primary among visible images.
        await db
          .update(productImages)
          .set({ isPrimary: false })
          .where(eq(productImages.batchId, input.batchId));

        await db
          .update(productImages)
          .set({ isPrimary: true })
          .where(eq(productImages.id, visibleImages[0].id));
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

      const visiblePhotos = photos.filter(
        p => p.status !== "ARCHIVED" && p.status !== "REJECTED"
      );

      if (visiblePhotos.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one photo is required to complete photography",
        });
      }

      // Require at least one primary photo (among visible photos)
      const hasVisiblePrimary = visiblePhotos.some(p => Boolean(p.isPrimary));
      if (!hasVisiblePrimary) {
        // Repair state rather than blocking the workflow.
        await database
          .update(productImages)
          .set({ isPrimary: false })
          .where(eq(productImages.batchId, input.batchId));

        await database
          .update(productImages)
          .set({ isPrimary: true })
          .where(eq(productImages.id, visiblePhotos[0].id));
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
        const errObj =
          queryError && typeof queryError === "object"
            ? (queryError as Record<string, unknown>)
            : null;
        const errorCode =
          errObj &&
          (typeof errObj.code === "string" || typeof errObj.code === "number")
            ? errObj.code
            : undefined;
        const errorErrno =
          errObj && typeof errObj.errno === "number" ? errObj.errno : undefined;
        const errorSqlMessage =
          errObj && typeof errObj.sqlMessage === "string"
            ? errObj.sqlMessage
            : undefined;

        // ENHANCED LOGGING (BUG-112): Capture actual error format for debugging
        logger.error(
          {
            error: queryError,
            errorType: typeof queryError,
            errorConstructor: queryError?.constructor?.name,
            errorKeys:
              queryError && typeof queryError === "object"
                ? Object.keys(queryError)
                : [],
            errorMessage:
              queryError instanceof Error ? queryError.message : undefined,
            errorCode,
            errorErrno,
            errorSqlMessage,
          },
          "getAwaitingPhotography: Query with strains join failed - analyzing error format"
        );

        // QA-003: Only fallback for schema-related errors
        if (!isSchemaError(queryError)) {
          logger.error(
            { error: queryError },
            "Not a schema error, re-throwing to caller"
          );
          throw queryError;
        }

        // Fallback: Query without strains join and product_images join
        // (in case strainId column or product_images table doesn't exist)
        logger.warn(
          { error: queryError },
          "Schema error detected, falling back to query without strains/product_images joins"
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
          .where(
            and(
              or(
                eq(batches.batchStatus, "LIVE"),
                eq(batches.batchStatus, "AWAITING_INTAKE")
              ),
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
