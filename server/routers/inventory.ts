import { z } from "zod";
import { publicProcedure as protectedProcedure, router } from "../_core/trpc";
import { handleError, AppError } from "../_core/errors";
import * as inventoryDb from "../inventoryDb";
import * as inventoryUtils from "../inventoryUtils";

export const inventoryRouter = router({
  // Get all batches with details
  list: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input }) => {
      try {
        if (input.query) {
          return await inventoryDb.searchBatches(input.query, input.limit);
        }
        return await inventoryDb.getBatchesWithDetails(input.limit);
      } catch (error) {
        handleError(error, "inventory.list");
        throw error;
      }
    }),

  // Get dashboard statistics
  dashboardStats: protectedProcedure.query(async () => {
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
  getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
    try {
      const batch = await inventoryDb.getBatchById(input);
      if (!batch) throw new AppError("Batch not found", "NOT_FOUND", 404);

      const locations = await inventoryDb.getBatchLocations(input);
      const auditLogs = await inventoryDb.getAuditLogsForEntity("Batch", input);

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
  intake: protectedProcedure
    .input(
      z.object({
        vendorName: z.string(),
        brandName: z.string(),
        productName: z.string(),
        category: z.string(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        strainId: z.number().nullable().optional(),
        quantity: z.number(),
        cogsMode: z.enum(["FIXED", "RANGE"]),
        unitCogs: z.string().optional(),
        unitCogsMin: z.string().optional(),
        unitCogsMax: z.string().optional(),
        paymentTerms: z.enum([
          "COD",
          "NET_7",
          "NET_15",
          "NET_30",
          "CONSIGNMENT",
          "PARTIAL",
        ]),
        location: z.object({
          site: z.string(),
          zone: z.string().optional(),
          rack: z.string().optional(),
          shelf: z.string().optional(),
          bin: z.string().optional(),
        }),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { processIntake } = await import("../inventoryIntakeService");

        const result = await processIntake({
          ...input,
          userId: ctx.user?.id || 0,
        });

        return { success: true, batch: result.batch };
      } catch (error) {
        handleError(error, "inventory.intake");
        throw error;
      }
    }),

  // Update batch status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "AWAITING_INTAKE",
          "LIVE",
          "ON_HOLD",
          "QUARANTINED",
          "SOLD_OUT",
          "CLOSED",
        ]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const batch = await inventoryDb.getBatchById(input.id);
      if (!batch) throw new Error("Batch not found");

      // Validate transition
      if (
        !inventoryUtils.isValidStatusTransition(
          batch.status as string,
          input.status
        )
      ) {
        throw new Error(
          `Invalid status transition from ${batch.status} to ${input.status}`
        );
      }

      const before = inventoryUtils.createAuditSnapshot(batch);
      await inventoryDb.updateBatchStatus(input.id, input.status);
      const after = await inventoryDb.getBatchById(input.id);

      // Create audit log
      await inventoryDb.createAuditLog({
        actorId: ctx.user?.id || 0,
        entity: "Batch",
        entityId: input.id,
        action: "STATUS_CHANGE",
        before,
        after: inventoryUtils.createAuditSnapshot(after),
        reason: input.reason,
      });

      return { success: true };
    }),

  // Adjust batch quantity
  adjustQty: protectedProcedure
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
      if (!batch) throw new Error("Batch not found");

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
        after: inventoryUtils.createAuditSnapshot(after),
        reason: input.reason,
      });

      return { success: true };
    }),

  // Get vendors (for autocomplete)
  vendors: protectedProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.query) {
        return await inventoryDb.searchVendors(input.query);
      }
      return await inventoryDb.getAllVendors();
    }),

  // Get brands (for autocomplete)
  brands: protectedProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.query) {
        return await inventoryDb.searchBrands(input.query);
      }
      return await inventoryDb.getAllBrands();
    }),

  // Seed inventory data
  seed: protectedProcedure.mutation(async () => {
    await inventoryDb.seedInventoryData();
    return { success: true };
  }),

  // Saved Views Management
  views: router({
    // Get all views for current user
    list: protectedProcedure.query(async ({ ctx }) => {
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
    save: protectedProcedure
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
    batch: protectedProcedure.input(z.number()).query(async ({ input }) => {
      try {
        return await inventoryDb.calculateBatchProfitability(input);
      } catch (error) {
        handleError(error, "inventory.profitability.batch");
        throw error;
      }
    }),

    // Get top profitable batches
    top: protectedProcedure
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
    summary: protectedProcedure.query(async () => {
      try {
        return await inventoryDb.getProfitabilitySummary();
      } catch (error) {
        handleError(error, "inventory.profitability.summary");
        throw error;
      }
    }),
  }),
});
