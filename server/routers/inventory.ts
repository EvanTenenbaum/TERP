import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { handleError, ErrorCatalog } from "../_core/errors";
import { inventoryLogger } from "../_core/logger";
import {
  intakeSchema,
  batchUpdateSchema,
  listQuerySchema,
  validators,
} from "../_core/validation";
import * as inventoryDb from "../inventoryDb";
import * as inventoryUtils from "../inventoryUtils";
import type { BatchStatus } from "../inventoryUtils";
import { requirePermission } from "../_core/permissionMiddleware";
import { storagePut, storageDelete } from "../storage";
import { createSafeUnifiedResponse } from "../_core/pagination";

export const inventoryRouter = router({
  // Upload media file for batch/purchase
  // BUG-004: File upload endpoint for media files
  uploadMedia: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        fileData: z.string(), // Base64 encoded file
        fileName: z.string(),
        fileType: z.string(), // MIME type
        batchId: z.number().optional(), // Optional: link to existing batch
      })
    )
    .mutation(async ({ input, ctx: _ctx }) => {
      try {
        // Check if storage is configured
        const { isStorageConfigured } = await import("../storage");
        if (!isStorageConfigured()) {
          throw ErrorCatalog.STORAGE_NOT_CONFIGURED;
        }

        // Decode base64 file
        const fileBuffer = Buffer.from(input.fileData, "base64");

        // Generate storage key
        const timestamp = Date.now();
        const sanitizedFileName = input.fileName.replace(
          /[^a-zA-Z0-9.-]/g,
          "_"
        );
        const storageKey = `batch-media/${input.batchId || "temp"}/${timestamp}-${sanitizedFileName}`;

        // Upload to storage
        const { url } = await storagePut(
          storageKey,
          fileBuffer,
          input.fileType
        );

        return {
          success: true,
          url,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: fileBuffer.length,
        };
      } catch (error) {
        inventoryLogger.operationFailure("uploadMedia", error as Error, {
          fileName: input.fileName,
        });
        handleError(error, "inventory.uploadMedia");
        throw error;
      }
    }),

  // Delete media file from storage
  // BUG-071: Rollback support for orphaned media files
  deleteMedia: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        url: z.string(), // The URL of the media file to delete
      })
    )
    .mutation(async ({ input, ctx: _ctx }) => {
      try {
        // Check if storage is configured
        const { isStorageConfigured } = await import("../storage");
        if (!isStorageConfigured()) {
          throw ErrorCatalog.STORAGE_NOT_CONFIGURED;
        }

        // Extract the storage key from the URL
        // URL format: https://.../batch-media/.../filename.ext
        const urlPath = new URL(input.url).pathname;
        const storageKey = urlPath.split("/").slice(-3).join("/"); // Get last 3 parts: batch-media/folder/file

        // Delete from storage
        await storageDelete(storageKey);

        return {
          success: true,
          url: input.url,
        };
      } catch (error) {
        inventoryLogger.operationFailure("deleteMedia", error as Error, {
          url: input.url,
        });
        handleError(error, "inventory.deleteMedia");
        throw error;
      }
    }),

  // Get all batches with details
  // ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation
  // ✅ ENHANCED: TERP-INIT-005 Phase 4 - Cursor-based pagination
  list: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(listQuerySchema)
    .query(async ({ input }) => {
      try {
        inventoryLogger.operationStart("list", {
          cursor: input.cursor,
          limit: input.limit,
        });

        let result;
        if (input.query) {
          result = await inventoryDb.searchBatches(
            input.query,
            input.limit,
            input.cursor
          );
        } else {
          result = await inventoryDb.getBatchesWithDetails(
            input.limit,
            input.cursor,
            { status: input.status, category: input.category }
          );
        }

        inventoryLogger.operationSuccess("list", {
          itemCount: result.items.length,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        });

        return result;
      } catch (error) {
        inventoryLogger.operationFailure("list", error as Error, {
          cursor: input.cursor,
        });
        handleError(error, "inventory.list");
        throw error;
      }
    }),

  // Get dashboard statistics
  dashboardStats: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      try {
        const stats = await inventoryDb.getDashboardStats();
        // If stats is null (e.g., DB connection issue), return a default empty object
        // instead of throwing a hard error, which prevents the dashboard from crashing.
        if (!stats) {
          return {
            totalInventoryValue: 0,
            avgValuePerUnit: 0,
            totalUnits: 0,
            statusCounts: {
              AWAITING_INTAKE: 0,
              LIVE: 0,
              ON_HOLD: 0,
              QUARANTINED: 0,
              SOLD_OUT: 0,
              CLOSED: 0,
            },
            categoryStats: [],
            subcategoryStats: [],
          };
        }
        return stats;
      } catch (error) {
        handleError(error, "inventory.dashboardStats");
        throw error;
      }
    }),

  // Get single batch by ID
  // ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation
  // ✅ BUG-041 FIX: Always return arrays for locations and auditLogs (never undefined)
  getById: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(validators.positiveInt)
    .query(async ({ input }) => {
      try {
        const batch = await inventoryDb.getBatchById(input);
        if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input);

        // BUG-041 FIX: Ensure locations is always an array
        const locationsResult = await inventoryDb.getBatchLocations(input);
        const locations = Array.isArray(locationsResult) ? locationsResult : [];

        // BUG-041 FIX: Ensure auditLogs is always an array
        const auditLogsResult = await inventoryDb.getAuditLogsForEntity(
          "Batch",
          input
        );
        const auditLogs = Array.isArray(auditLogsResult) ? auditLogsResult : [];

        // Log for debugging if we had to default to empty arrays
        if (!Array.isArray(locationsResult)) {
          inventoryLogger.warn({
            msg: "[BUG-041] getBatchLocations returned non-array, defaulting to empty",
            batchId: input,
            returnedType: typeof locationsResult,
          });
        }
        if (!Array.isArray(auditLogsResult)) {
          inventoryLogger.warn({
            msg: "[BUG-041] getAuditLogsForEntity returned non-array, defaulting to empty",
            batchId: input,
            returnedType: typeof auditLogsResult,
          });
        }

        return {
          batch,
          locations,
          auditLogs,
          availableQty: inventoryUtils.calculateAvailableQty(batch),
        };
      } catch (error) {
        handleError(error, "inventory.getById");
        throw error;
      }
    }),

  // Create new batch (intake)
  // ✅ FIXED: Uses transactional service (TERP-INIT-005 Phase 1)
  // ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation
  intake: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(intakeSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        inventoryLogger.operationStart("intake", {
          vendorName: input.vendorName,
          brandName: input.brandName,
          productName: input.productName,
          quantity: input.quantity,
        });

        const { processIntake } = await import("../inventoryIntakeService");

        const result = await processIntake({
          ...input,
          userId: ctx.user?.id || 0,
        });

        inventoryLogger.operationSuccess("intake", {
          batchId: result.batch.id,
          batchCode: result.batch.code,
        });

        return { success: true, batch: result.batch };
      } catch (error) {
        inventoryLogger.operationFailure("intake", error as Error, { input });
        handleError(error, "inventory.intake");
        throw error;
      }
    }),

  // Update batch status
  // ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation
  // ST-026: Added version checking for concurrent edit detection
  updateStatus: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      batchUpdateSchema.extend({
        version: z.number().optional(), // ST-026: Optional for backward compatibility
      })
    )
    .mutation(async ({ input, ctx }) => {
      const batch = await inventoryDb.getBatchById(input.id);
      if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input.id);

      // ST-026: Check version if provided
      if (input.version !== undefined) {
        const { checkVersion } = await import("../_core/optimisticLocking");
        const { batches } = await import("../../drizzle/schema");
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await checkVersion(db, batches, "Batch", input.id, input.version);
      }

      // Validate transition
      if (
        !inventoryUtils.isValidStatusTransition(
          batch.batchStatus as BatchStatus,
          input.status as BatchStatus
        )
      ) {
        throw ErrorCatalog.INVENTORY.INVALID_STATUS_TRANSITION(
          batch.batchStatus as string,
          input.status
        );
      }

      const before = inventoryUtils.createAuditSnapshot(
        batch as unknown as Record<string, unknown>
      );
      await inventoryDb.updateBatchStatus(
        input.id,
        input.status,
        input.version
      );
      const after = await inventoryDb.getBatchById(input.id);

      // Create audit log
      await inventoryDb.createAuditLog({
        actorId: ctx.user?.id || 0,
        entity: "Batch",
        entityId: input.id,
        action: "STATUS_CHANGE",
        before,
        after: inventoryUtils.createAuditSnapshot(
          after as unknown as Record<string, unknown>
        ),
        reason: input.reason,
      });

      return { success: true };
    }),

  // Adjust batch quantity
  // SEC-FIX: Changed permission from inventory:read to inventory:update
  // This is a write operation that modifies inventory quantities
  adjustQty: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        id: z.number(),
        field: z.enum([
          "onHandQty",
          "reservedQty",
          "quarantineQty",
          "holdQty",
          "defectiveQty",
        ]),
        // SEC-FIX: Add bounds validation to prevent overflow/precision issues
        adjustment: z
          .number()
          .min(-1000000, "Adjustment too small")
          .max(1000000, "Adjustment too large"),
        reason: z
          .string()
          .min(1, "Reason is required")
          .max(500, "Reason too long"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const batch = await inventoryDb.getBatchById(input.id);
      if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input.id);

      const currentQty = inventoryUtils.parseQty(batch[input.field]);
      const newQty = currentQty + input.adjustment;

      if (newQty < 0) {
        throw new Error("Quantity cannot be negative");
      }

      const before = inventoryUtils.createAuditSnapshot(batch);
      await inventoryDb.updateBatchQty(
        input.id,
        input.field,
        inventoryUtils.formatQty(newQty)
      );
      const after = await inventoryDb.getBatchById(input.id);

      // Create audit log
      await inventoryDb.createAuditLog({
        actorId: ctx.user?.id || 0,
        entity: "Batch",
        entityId: input.id,
        action: "QTY_ADJUST",
        before,
        after: inventoryUtils.createAuditSnapshot(
          after as unknown as Record<string, unknown>
        ),
        reason: input.reason,
      });

      return { success: true };
    }),

  // TERP-SS-009: Update batch fields (ticket/unitCogs, notes) for spreadsheet editing
  // ST-026: Added version checking for concurrent edit detection
  updateBatch: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        id: z.number(),
        version: z.number().optional(), // ST-026: Optional for backward compatibility
        ticket: z.number().min(0).optional(), // unitCogs value
        notes: z.string().nullable().optional(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const batch = await inventoryDb.getBatchById(input.id);
      if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input.id);

      // ST-026: Check version if provided
      if (input.version !== undefined) {
        const { checkVersion } = await import("../_core/optimisticLocking");
        const { batches } = await import("../../drizzle/schema");
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await checkVersion(db, batches, "Batch", input.id, input.version);
      }

      const before = inventoryUtils.createAuditSnapshot(batch);
      const updates: Record<string, unknown> = {};

      // Update ticket (unitCogs) if provided
      if (input.ticket !== undefined) {
        updates.unitCogs = input.ticket.toFixed(2);
      }

      // Update notes in metadata if provided
      if (input.notes !== undefined) {
        const currentMetadata = batch.metadata
          ? JSON.parse(batch.metadata)
          : {};
        currentMetadata.notes = input.notes;
        updates.metadata = JSON.stringify(currentMetadata);
      }

      // ST-026: Increment version if version checking was used
      if (input.version !== undefined) {
        const { sql } = await import("drizzle-orm");
        const { batches } = await import("../../drizzle/schema");
        updates.version = sql`${batches.version} + 1`;
      }

      if (Object.keys(updates).length === 0) {
        return { success: true };
      }

      await inventoryDb.updateBatchFields(input.id, updates);
      const after = await inventoryDb.getBatchById(input.id);

      // Create audit log
      await inventoryDb.createAuditLog({
        actorId: ctx.user?.id || 0,
        entity: "Batch",
        entityId: input.id,
        action: "BATCH_UPDATE",
        before,
        after: inventoryUtils.createAuditSnapshot(
          after as unknown as Record<string, unknown>
        ),
        reason: input.reason,
      });

      return { success: true };
    }),

  // Get vendors (for autocomplete)
  vendors: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.query) {
        const result = await inventoryDb.searchVendors(input.query);
        // BUG-034: Standardized pagination response
        return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
      }
      const result = await inventoryDb.getAllVendors();
      // BUG-034: Standardized pagination response
      return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
    }),

  // Get brands (for autocomplete)
  brands: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.query) {
        const result = await inventoryDb.searchBrands(input.query);
        // BUG-034: Standardized pagination response
        return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
      }
      const result = await inventoryDb.getAllBrands();
      // BUG-034: Standardized pagination response
      return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
    }),

  // Get batches by vendor
  // _Requirements: 7.1_
  getBatchesByVendor: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ input }) => {
      try {
        inventoryLogger.operationStart("getBatchesByVendor", {
          vendorId: input.vendorId,
        });

        const result = await inventoryDb.getBatchesByVendor(input.vendorId);

        inventoryLogger.operationSuccess("getBatchesByVendor", {
          vendorId: input.vendorId,
          batchCount: result.length,
        });

        // BUG-034: Standardized pagination response
        return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
      } catch (error) {
        inventoryLogger.operationFailure("getBatchesByVendor", error as Error, {
          vendorId: input.vendorId,
        });
        handleError(error, "inventory.getBatchesByVendor");
        throw error;
      }
    }),

  // Seed inventory data
  seed: protectedProcedure
    .use(requirePermission("inventory:read"))
    .mutation(async () => {
      await inventoryDb.seedInventoryData();
      return { success: true };
    }),

  // Saved Views Management
  views: router({
    // Get all views for current user
    list: protectedProcedure
      .use(requirePermission("inventory:read"))
      .query(async ({ ctx }) => {
        try {
          const userId = ctx.user?.id;
          if (!userId) throw new Error("User not authenticated");
          const result = await inventoryDb.getUserInventoryViews(userId);
          // BUG-034: Standardized pagination response
          return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
        } catch (error) {
          handleError(error, "inventory.views.list");
          throw error;
        }
      }),

    // Save a new view
    save: protectedProcedure
      .use(requirePermission("inventory:read"))
      .input(
        z.object({
          name: z.string().min(1).max(100),
          filters: z.any(), // JSON object
          isShared: z.boolean().optional().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          return await inventoryDb.saveInventoryView({
            name: input.name,
            filters: input.filters,
            createdBy: ctx.user?.id || 0,
            isShared: input.isShared,
          });
        } catch (error) {
          handleError(error, "inventory.views.save");
          throw error;
        }
      }),

    // Delete a view
    delete: protectedProcedure
      .use(requirePermission("inventory:delete"))
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        try {
          const userId = ctx.user?.id;
          if (!userId) throw new Error("User not authenticated");
          return await inventoryDb.deleteInventoryView(input, userId);
        } catch (error) {
          handleError(error, "inventory.views.delete");
          throw error;
        }
      }),
  }),

  // Bulk operations
  bulk: router({
    // Bulk update status
    updateStatus: protectedProcedure
      .use(requirePermission("inventory:update"))
      .input(
        z.object({
          batchIds: z.array(z.number()),
          newStatus: z.enum([
            "AWAITING_INTAKE",
            "LIVE",
            "PHOTOGRAPHY_COMPLETE",
            "ON_HOLD",
            "QUARANTINED",
            "SOLD_OUT",
            "CLOSED",
          ]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const userId = ctx.user?.id;
          if (!userId) throw new Error("User not authenticated");
          return await inventoryDb.bulkUpdateBatchStatus(
            input.batchIds,
            input.newStatus,
            userId
          );
        } catch (error) {
          handleError(error, "inventory.bulk.updateStatus");
          throw error;
        }
      }),

    // Bulk delete
    delete: protectedProcedure
      .use(requirePermission("inventory:delete"))
      .input(z.array(z.number()))
      .mutation(async ({ input, ctx }) => {
        try {
          const userId = ctx.user?.id;
          if (!userId) throw new Error("User not authenticated");
          return await inventoryDb.bulkDeleteBatches(input, userId);
        } catch (error) {
          handleError(error, "inventory.bulk.delete");
          throw error;
        }
      }),
  }),

  // Profitability analysis
  profitability: router({
    // Get batch profitability
    batch: protectedProcedure
      .use(requirePermission("inventory:read"))
      .input(z.number())
      .query(async ({ input }) => {
        try {
          return await inventoryDb.calculateBatchProfitability(input);
        } catch (error) {
          handleError(error, "inventory.profitability.batch");
          throw error;
        }
      }),

    // Get top profitable batches
    top: protectedProcedure
      .use(requirePermission("inventory:read"))
      .input(z.number().optional().default(10))
      .query(async ({ input }) => {
        try {
          const result = await inventoryDb.getTopProfitableBatches(input);
          // BUG-034: Standardized pagination response
          return createSafeUnifiedResponse(
            result,
            result?.length || 0,
            input,
            0
          );
        } catch (error) {
          handleError(error, "inventory.profitability.top");
          throw error;
        }
      }),

    // Get overall summary
    summary: protectedProcedure
      .use(requirePermission("inventory:read"))
      .query(async () => {
        try {
          return await inventoryDb.getProfitabilitySummary();
        } catch (error) {
          handleError(error, "inventory.profitability.summary");
          throw error;
        }
      }),
  }),
});
