import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as clientNeedsDb from "../clientNeedsDb";
import * as matchingEngine from "../matchingEngine";
import { logger } from "../_core/logger";

/**
 * Client Needs Router
 * Handles CRUD operations and matching for client needs
 */
export const clientNeedsRouter = router({
  /**
   * Create a new client need
   */
  create: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        strain: z.string().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        quantityMin: z.string().optional(),
        quantityMax: z.string().optional(),
        priceMax: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
        neededBy: z.string().optional(), // ISO date string
        expiresAt: z.string().optional(), // ISO date string
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        createdBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const need = await clientNeedsDb.createClientNeed({
          ...input,
          neededBy: input.neededBy ? new Date(input.neededBy) : undefined,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        } as any);

        return {
          success: true,
          data: need,
        };
      } catch (error) {
        logger.error("Error creating client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create client need",
        };
      }
    }),

  /**
   * Get a client need by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const need = await clientNeedsDb.getClientNeedById(input.id);
        
        if (!need) {
          return {
            success: false,
            error: "Client need not found",
          };
        }

        return {
          success: true,
          data: need,
        };
      } catch (error) {
        logger.error("Error fetching client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch client need",
        };
      }
    }),

  /**
   * Get all client needs with optional filters
   */
  getAll: publicProcedure
    .input(
      z.object({
        status: z.enum(["ACTIVE", "FULFILLED", "EXPIRED", "CANCELLED"]).optional(),
        clientId: z.number().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        strain: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const needs = await clientNeedsDb.getClientNeeds(input);

        return {
          success: true,
          data: needs,
        };
      } catch (error) {
        logger.error("Error fetching client needs:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch client needs",
        };
      }
    }),

  /**
   * Get active client needs for a specific client
   */
  getActiveByClient: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      try {
        const needs = await clientNeedsDb.getActiveClientNeeds(input.clientId);

        return {
          success: true,
          data: needs,
        };
      } catch (error) {
        logger.error("Error fetching active client needs:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch active client needs",
        };
      }
    }),

  /**
   * Update a client need
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        strain: z.string().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        quantityMin: z.string().optional(),
        quantityMax: z.string().optional(),
        priceMax: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        status: z.enum(["ACTIVE", "FULFILLED", "EXPIRED", "CANCELLED"]).optional(),
        neededBy: z.string().optional(),
        expiresAt: z.string().optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, ...updates } = input;
        
        const processedUpdates: any = { ...updates };
        if (updates.neededBy) {
          processedUpdates.neededBy = new Date(updates.neededBy);
        }
        if (updates.expiresAt) {
          processedUpdates.expiresAt = new Date(updates.expiresAt);
        }

        const need = await clientNeedsDb.updateClientNeed(id, processedUpdates);

        return {
          success: true,
          data: need,
        };
      } catch (error) {
        logger.error("Error updating client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update client need",
        };
      }
    }),

  /**
   * Mark a client need as fulfilled
   */
  fulfill: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const need = await clientNeedsDb.fulfillClientNeed(input.id);

        return {
          success: true,
          data: need,
        };
      } catch (error) {
        logger.error("Error fulfilling client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fulfill client need",
        };
      }
    }),

  /**
   * Cancel a client need
   */
  cancel: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const need = await clientNeedsDb.cancelClientNeed(input.id);

        return {
          success: true,
          data: need,
        };
      } catch (error) {
        logger.error("Error cancelling client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to cancel client need",
        };
      }
    }),

  /**
   * Delete a client need
   */
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await clientNeedsDb.deleteClientNeed(input.id);

        return {
          success: true,
        };
      } catch (error) {
        logger.error("Error deleting client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete client need",
        };
      }
    }),

  /**
   * Get client needs with match counts
   */
  getAllWithMatches: publicProcedure
    .input(
      z.object({
        status: z.enum(["ACTIVE", "FULFILLED", "EXPIRED", "CANCELLED"]).optional(),
        clientId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const needs = await clientNeedsDb.getClientNeedsWithMatches(input);

        return {
          success: true,
          data: needs,
        };
      } catch (error) {
        logger.error("Error fetching client needs with matches:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch client needs with matches",
        };
      }
    }),

  /**
   * Find matches for a specific client need
   */
  findMatches: publicProcedure
    .input(z.object({ needId: z.number() }))
    .query(async ({ input }) => {
      try {
        const matches = await matchingEngine.findMatchesForNeed(input.needId);

        return {
          success: true,
          data: matches,
        };
      } catch (error) {
        logger.error("Error finding matches:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to find matches",
        };
      }
    }),

  /**
   * Expire old client needs
   */
  expireOld: publicProcedure
    .mutation(async () => {
      try {
        const count = await clientNeedsDb.expireOldClientNeeds();

        return {
          success: true,
          data: { expiredCount: count },
        };
      } catch (error) {
        logger.error("Error expiring old client needs:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to expire old client needs",
        };
      }
    }),
});

