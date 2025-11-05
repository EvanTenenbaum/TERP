import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as vendorSupplyDb from "../vendorSupplyDb";
import * as matchingEngine from "../matchingEngine";
import { logger } from "../_core/logger";

/**
 * Vendor Supply Router
 * Handles CRUD operations and matching for vendor supply
 */
export const vendorSupplyRouter = router({
  /**
   * Create a new vendor supply item
   */
  create: publicProcedure
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
        createdBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const supply = await vendorSupplyDb.createVendorSupply({
          ...input,
          availableUntil: input.availableUntil ? new Date(input.availableUntil) : undefined,
        } as any);

        return {
          success: true,
          data: supply,
        };
      } catch (error) {
        logger.error("Error creating vendor supply:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create vendor supply",
        };
      }
    }),

  /**
   * Get a vendor supply item by ID
   */
  getById: publicProcedure
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
        logger.error("Error fetching vendor supply:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch vendor supply",
        };
      }
    }),

  /**
   * Get all vendor supply items with optional filters
   */
  getAll: publicProcedure
    .input(
      z.object({
        status: z.enum(["AVAILABLE", "RESERVED", "PURCHASED", "EXPIRED"]).optional(),
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
        logger.error("Error fetching vendor supply:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch vendor supply",
        };
      }
    }),

  /**
   * Get available vendor supply items
   */
  getAvailable: publicProcedure
    .input(z.object({ vendorId: z.number().optional() }))
    .query(async ({ input }) => {
      try {
        const supplies = await vendorSupplyDb.getAvailableVendorSupply(input.vendorId);

        return {
          success: true,
          data: supplies,
        };
      } catch (error) {
        logger.error("Error fetching available vendor supply:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch available vendor supply",
        };
      }
    }),

  /**
   * Update a vendor supply item
   */
  update: publicProcedure
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
        status: z.enum(["AVAILABLE", "RESERVED", "PURCHASED", "EXPIRED"]).optional(),
        availableUntil: z.string().optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, ...updates } = input;
        
        const processedUpdates: any = { ...updates };
        if (updates.availableUntil) {
          processedUpdates.availableUntil = new Date(updates.availableUntil);
        }

        const supply = await vendorSupplyDb.updateVendorSupply(id, processedUpdates);

        return {
          success: true,
          data: supply,
        };
      } catch (error) {
        logger.error("Error updating vendor supply:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update vendor supply",
        };
      }
    }),

  /**
   * Mark a vendor supply item as reserved
   */
  reserve: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const supply = await vendorSupplyDb.reserveVendorSupply(input.id);

        return {
          success: true,
          data: supply,
        };
      } catch (error) {
        logger.error("Error reserving vendor supply:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to reserve vendor supply",
        };
      }
    }),

  /**
   * Mark a vendor supply item as purchased
   */
  purchase: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const supply = await vendorSupplyDb.purchaseVendorSupply(input.id);

        return {
          success: true,
          data: supply,
        };
      } catch (error) {
        logger.error("Error purchasing vendor supply:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to purchase vendor supply",
        };
      }
    }),

  /**
   * Delete a vendor supply item
   */
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await vendorSupplyDb.deleteVendorSupply(input.id);

        return {
          success: true,
        };
      } catch (error) {
        logger.error("Error deleting vendor supply:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete vendor supply",
        };
      }
    }),

  /**
   * Get vendor supply with match counts
   */
  getAllWithMatches: publicProcedure
    .input(
      z.object({
        status: z.enum(["AVAILABLE", "RESERVED", "PURCHASED", "EXPIRED"]).optional(),
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
        logger.error("Error fetching vendor supply with matches:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch vendor supply with matches",
        };
      }
    }),

  /**
   * Find potential buyers for a vendor supply item
   */
  findBuyers: publicProcedure
    .input(z.object({ supplyId: z.number() }))
    .query(async ({ input }) => {
      try {
        const buyers = await matchingEngine.findBuyersForVendorSupply(input.supplyId);

        return {
          success: true,
          data: buyers,
        };
      } catch (error) {
        logger.error("Error finding buyers:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to find buyers",
        };
      }
    }),

  /**
   * Expire old vendor supply items
   */
  expireOld: publicProcedure
    .mutation(async () => {
      try {
        const count = await vendorSupplyDb.expireOldVendorSupply();

        return {
          success: true,
          data: { expiredCount: count },
        };
      } catch (error) {
        logger.error("Error expiring old vendor supply:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to expire old vendor supply",
        };
      }
    }),
});

