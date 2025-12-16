import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { handleError, AppError, ErrorCatalog } from "../_core/errors";
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
import { storagePut } from "../storage";

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
    .mutation(async ({ input, ctx }) => {
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
        const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storageKey = `batch-media/${input.batchId || "temp"}/${timestamp}-${sanitizedFileName}`;
        
        // Upload to storage
        const { url } = await storagePut(storageKey, fileBuffer, input.fileType);
        
        return {
          success: true,
          url,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: fileBuffer.length,
        };
      } catch (error) {
        inventoryLogger.operationFailure("uploadMedia", error as Error, { fileName: input.fileName });
        handleError(error, "inventory.uploadMedia");
        throw error;
      }
    }),

  // Get all batches with details
  // ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation
  // ✅ ENHANCED: TERP-INIT-005 Phase 4 - Cursor-based pagination
  list: protectedProcedure.use(requirePermission("inventory:read")).input(listQuerySchema).query(async ({ input }) => {
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
  dashboardStats: protectedProcedure.use(requirePermission("inventory:read")).query(async () => {
    try {
      const stats = await inventoryDb.getDashboardStats();
      if (!stats)
        throw new AppError(
          "Failed to fetch dashboard statistics",
          "INTERNAL_SERVER_ERROR"
        );
      return stats;
    } catch (error) {
      handleError(error, "inventory.dashboardStats");
      throw error;
    }
  }),

  // Get single batch by ID
  // ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation
  getById: protectedProcedure.use(requirePermission("inventory:read"))
    .input(validators.positiveInt)
    .query(async ({ input }) => {
      try {
        const batch = await inventoryDb.getBatchById(input);
        if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input);

        const locations = await inventoryDb.getBatchLocations(input);
        const auditLogs = await inventoryDb.getAuditLogsForEntity(
          "Batch",
          input
        );

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
  intake: protectedProcedure.use(requirePermission("inventory:read"))
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
  updateStatus: protectedProcedure.use(requirePermission("inventory:update"))
    .input(batchUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const batch = await inventoryDb.getBatchById(input.id);
      if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input.id);

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
      await inventoryDb.updateBatchStatus(input.id, input.status);
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
  adjustQty: protectedProcedure.use(requirePermission("inventory:read"))
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
        adjustment: z.number(),
        reason: z.string(),
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

  // Get vendors (for autocomplete)
  vendors: protectedProcedure.use(requirePermission("inventory:read"))
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.query) {
        return await inventoryDb.searchVendors(input.query);
      }
      return await inventoryDb.getAllVendors();
    }),

  // Get brands (for autocomplete)
  brands: protectedProcedure.use(requirePermission("inventory:read"))
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.query) {
        return await inventoryDb.searchBrands(input.query);
      }
      return await inventoryDb.getAllBrands();
    }),

  // Get batches by vendor
  // _Requirements: 7.1_
  getBatchesByVendor: protectedProcedure.use(requirePermission("inventory:read"))
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

        return result;
      } catch (error) {
        inventoryLogger.operationFailure("getBatchesByVendor", error as Error, {
          vendorId: input.vendorId,
        });
        handleError(error, "inventory.getBatchesByVendor");
        throw error;
      }
    }),

  // Seed inventory data
  seed: protectedProcedure.use(requirePermission("inventory:read")).mutation(async () => {
    await inventoryDb.seedInventoryData();
    return { success: true };
  }),

  // Saved Views Management
  views: router({
    // Get all views for current user
    list: protectedProcedure.use(requirePermission("inventory:read")).query(async ({ ctx }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) throw new Error("User not authenticated");
        return await inventoryDb.getUserInventoryViews(userId);
      } catch (error) {
        handleError(error, "inventory.views.list");
        throw error;
      }
    }),

    // Save a new view
    save: protectedProcedure.use(requirePermission("inventory:read"))
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
    delete: protectedProcedure.use(requirePermission("inventory:delete"))
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
    updateStatus: protectedProcedure.use(requirePermission("inventory:update"))
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
    delete: protectedProcedure.use(requirePermission("inventory:delete"))
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
    batch: protectedProcedure.use(requirePermission("inventory:read")).input(z.number()).query(async ({ input }) => {
      try {
        return await inventoryDb.calculateBatchProfitability(input);
      } catch (error) {
        handleError(error, "inventory.profitability.batch");
        throw error;
      }
    }),

    // Get top profitable batches
    top: protectedProcedure.use(requirePermission("inventory:read"))
      .input(z.number().optional().default(10))
      .query(async ({ input }) => {
        try {
          return await inventoryDb.getTopProfitableBatches(input);
        } catch (error) {
          handleError(error, "inventory.profitability.top");
          throw error;
        }
      }),

    // Get overall summary
    summary: protectedProcedure.use(requirePermission("inventory:read")).query(async () => {
      try {
        return await inventoryDb.getProfitabilitySummary();
      } catch (error) {
        handleError(error, "inventory.profitability.summary");
        throw error;
      }
    }),
  }),
});
