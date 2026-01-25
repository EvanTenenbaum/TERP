import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as clientNeedsDb from "../clientNeedsDbEnhanced";
import * as matchingEngine from "../matchingEngineEnhanced";
import * as needsMatchingService from "../needsMatchingService";
import { requirePermission } from "../_core/permissionMiddleware";

/**
 * Client Needs Router (Enhanced Version)
 * Handles CRUD operations and matching for client needs with all improvements
 */
export const clientNeedsEnhancedRouter = router({
  /**
   * Create a new client need (with duplicate prevention)
   */
  create: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        strain: z.string().optional(),
        productName: z.string().optional(),
        strainId: z.number().optional(),
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
        const result = await clientNeedsDb.createClientNeed({
          ...input,
          neededBy: input.neededBy ? new Date(input.neededBy) : undefined,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        } as any);

        return {
          success: true,
          data: result.need,
          isDuplicate: result.isDuplicate,
          message: result.message,
        };
      } catch (error) {
        console.error("Error creating client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create client need",
        };
      }
    }),

  /**
   * Create need and immediately find matches
   */
  createAndFindMatches: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        strain: z.string().optional(),
        productName: z.string().optional(),
        strainId: z.number().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        quantityMin: z.string().optional(),
        quantityMax: z.string().optional(),
        priceMax: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
        neededBy: z.string().optional(),
        expiresAt: z.string().optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        createdBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await needsMatchingService.createNeedAndFindMatches({
          ...input,
          neededBy: input.neededBy ? new Date(input.neededBy) : undefined,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        });

        return result;
      } catch (error) {
        console.error("Error creating need and finding matches:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create need and find matches",
        };
      }
    }),

  /**
   * Get a client need by ID
   */
  getById: protectedProcedure
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
        console.error("Error fetching client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch client need",
        };
      }
    }),

  /**
   * Get all client needs with optional filters
   */
  getAll: protectedProcedure
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
        console.error("Error fetching client needs:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch client needs",
        };
      }
    }),

  /**
   * Get active client needs for a specific client
   */
  getActiveByClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      try {
        const needs = await clientNeedsDb.getActiveClientNeeds(input.clientId);

        return {
          success: true,
          data: needs,
        };
      } catch (error) {
        console.error("Error fetching active client needs:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch active client needs",
        };
      }
    }),

  /**
   * Update a client need
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
        console.error("Error updating client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update client need",
        };
      }
    }),

  /**
   * Mark a client need as fulfilled
   */
  fulfill: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const need = await clientNeedsDb.fulfillClientNeed(input.id);

        return {
          success: true,
          data: need,
        };
      } catch (error) {
        console.error("Error fulfilling client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fulfill client need",
        };
      }
    }),

  /**
   * Cancel a client need
   */
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const need = await clientNeedsDb.cancelClientNeed(input.id);

        return {
          success: true,
          data: need,
        };
      } catch (error) {
        console.error("Error cancelling client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to cancel client need",
        };
      }
    }),

  /**
   * Delete a client need
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await clientNeedsDb.deleteClientNeed(input.id);

        return {
          success: true,
        };
      } catch (error) {
        console.error("Error deleting client need:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete client need",
        };
      }
    }),

  /**
   * Get client needs with match counts
   */
  getAllWithMatches: protectedProcedure
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
        console.error("Error fetching client needs with matches:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch client needs with matches",
        };
      }
    }),

  /**
   * Find matches for a specific client need
   */
  findMatches: protectedProcedure
    .input(z.object({ needId: z.number() }))
    .query(async ({ input }) => {
      try {
        const matches = await matchingEngine.findMatchesForNeed(input.needId);

        return {
          success: true,
          data: matches,
        };
      } catch (error) {
        console.error("Error finding matches:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to find matches",
        };
      }
    }),

  /**
   * Create quote from match
   */
  createQuoteFromMatch: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        clientNeedId: z.number().optional(),
        matches: z.array(z.any()),
        userId: z.number(),
        matchRecordId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await needsMatchingService.createQuoteFromMatch(input);

        return result;
      } catch (error) {
        console.error("Error creating quote from match:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create quote from match",
        };
      }
    }),

  /**
   * Expire old client needs
   */
  expireOld: protectedProcedure
    .mutation(async () => {
      try {
        const count = await clientNeedsDb.expireOldClientNeeds();

        return {
          success: true,
          data: { expiredCount: count },
        };
      } catch (error) {
        console.error("Error expiring old client needs:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to expire old client needs",
        };
      }
    }),

  /**
   * Get smart opportunities (top matches)
   */
  getSmartOpportunities: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ input }) => {
      try {
        const opportunities = await needsMatchingService.getSmartOpportunities(input.limit);

        return {
          success: true,
          data: opportunities,
        };
      } catch (error) {
        console.error("Error getting smart opportunities:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get smart opportunities",
        };
      }
    }),
});

