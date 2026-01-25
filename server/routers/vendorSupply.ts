import { z } from "zod";
import {
  protectedProcedure,
  router,
  getAuthenticatedUserId,
} from "../_core/trpc";
import * as vendorSupplyDb from "../vendorSupplyDb";
import * as matchingEngine from "../matchingEngine";
// TODO: Add permission checks to mutations
// import { requirePermission } from "../_core/permissionMiddleware";

/**
 * Vendor Supply Router
 * Handles CRUD operations and matching for vendor supply
 */
export const vendorSupplyRouter = router({
  /**
   * Create a new vendor supply item
   */
  create: protectedProcedure
    .input(
      z.object({
        vendorId: z.number(),
        strain: z.string().optional(),
        productName: z.string().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        quantityAvailable: z.string(),
        unitPrice: z.string().optional(),
        availableUntil: z.string().optional(), // ISO date string
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        // FE-QA-FIX: Removed createdBy from input - must come from context
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // FE-QA-FIX: Get createdBy from authenticated user context (security)
        const createdBy = getAuthenticatedUserId(ctx);
        const supply = await vendorSupplyDb.createVendorSupply({
          ...input,
          createdBy,
          availableUntil: input.availableUntil
            ? new Date(input.availableUntil)
            : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        return {
          success: true,
          data: supply,
        };
      } catch (error) {
        console.error("Error creating vendor supply:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create vendor supply",
        };
      }
    }),

  /**
   * Get a vendor supply item by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const supply = await vendorSupplyDb.getVendorSupplyById(input.id);

        if (!supply) {
          return {
            success: false,
            error: "Vendor supply not found",
          };
        }

        return {
          success: true,
          data: supply,
        };
      } catch (error) {
        console.error("Error fetching vendor supply:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch vendor supply",
        };
      }
    }),

  /**
   * Get all vendor supply items with optional filters
   */
  getAll: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["AVAILABLE", "RESERVED", "PURCHASED", "EXPIRED"])
          .optional(),
        vendorId: z.number().optional(),
        strain: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const supplies = await vendorSupplyDb.getVendorSupply(input);

        return {
          success: true,
          data: supplies,
        };
      } catch (error) {
        console.error("Error fetching vendor supply:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch vendor supply",
        };
      }
    }),

  /**
   * Get available vendor supply items
   */
  getAvailable: protectedProcedure
    .input(z.object({ vendorId: z.number().optional() }))
    .query(async ({ input }) => {
      try {
        const supplies = await vendorSupplyDb.getAvailableVendorSupply(
          input.vendorId
        );

        return {
          success: true,
          data: supplies,
        };
      } catch (error) {
        console.error("Error fetching available vendor supply:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch available vendor supply",
        };
      }
    }),

  /**
   * Update a vendor supply item
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        strain: z.string().optional(),
        productName: z.string().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        quantityAvailable: z.string().optional(),
        unitPrice: z.string().optional(),
        status: z
          .enum(["AVAILABLE", "RESERVED", "PURCHASED", "EXPIRED"])
          .optional(),
        availableUntil: z.string().optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, ...updates } = input;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processedUpdates: any = { ...updates };
        if (updates.availableUntil) {
          processedUpdates.availableUntil = new Date(updates.availableUntil);
        }

        const supply = await vendorSupplyDb.updateVendorSupply(
          id,
          processedUpdates
        );

        return {
          success: true,
          data: supply,
        };
      } catch (error) {
        console.error("Error updating vendor supply:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update vendor supply",
        };
      }
    }),

  /**
   * Mark a vendor supply item as reserved
   */
  reserve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const supply = await vendorSupplyDb.reserveVendorSupply(input.id);

        return {
          success: true,
          data: supply,
        };
      } catch (error) {
        console.error("Error reserving vendor supply:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to reserve vendor supply",
        };
      }
    }),

  /**
   * Mark a vendor supply item as purchased
   */
  purchase: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const supply = await vendorSupplyDb.purchaseVendorSupply(input.id);

        return {
          success: true,
          data: supply,
        };
      } catch (error) {
        console.error("Error purchasing vendor supply:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to purchase vendor supply",
        };
      }
    }),

  /**
   * Delete a vendor supply item
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await vendorSupplyDb.deleteVendorSupply(input.id);

        return {
          success: true,
        };
      } catch (error) {
        console.error("Error deleting vendor supply:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete vendor supply",
        };
      }
    }),

  /**
   * Get vendor supply with match counts
   */
  getAllWithMatches: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["AVAILABLE", "RESERVED", "PURCHASED", "EXPIRED"])
          .optional(),
        vendorId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const supplies = await vendorSupplyDb.getVendorSupplyWithMatches(input);

        return {
          success: true,
          data: supplies,
        };
      } catch (error) {
        console.error("Error fetching vendor supply with matches:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch vendor supply with matches",
        };
      }
    }),

  /**
   * Find potential buyers for a vendor supply item
   */
  findBuyers: protectedProcedure
    .input(z.object({ supplyId: z.number() }))
    .query(async ({ input }) => {
      try {
        const buyers = await matchingEngine.findBuyersForVendorSupply(
          input.supplyId
        );

        return {
          success: true,
          data: buyers,
        };
      } catch (error) {
        console.error("Error finding buyers:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to find buyers",
        };
      }
    }),

  /**
   * Expire old vendor supply items
   */
  expireOld: protectedProcedure.mutation(async () => {
    try {
      const count = await vendorSupplyDb.expireOldVendorSupply();

      return {
        success: true,
        data: { expiredCount: count },
      };
    } catch (error) {
      console.error("Error expiring old vendor supply:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to expire old vendor supply",
      };
    }
  }),
});
