import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { strainService } from "../services/strainService";
import { publicProcedure as protectedProcedure, router } from "../_core/trpc";
import * as inventoryDb from "../inventoryDb";
import { seedStrainsFromCSV } from "../seedStrains";
import { importOpenTHCStrainsFromJSON } from "../import_openthc_strains";
import {
  findExactStrainMatch,
  findFuzzyStrainMatches,
  matchStrainForAssignment,
  getOrCreateStrain,
  searchStrains as fuzzySearchStrains,
} from "../strainMatcher";

export const strainsRouter = router({
    // Seed strains from CSV
    seed: protectedProcedure.mutation(async () => {
      return await seedStrainsFromCSV();
    }),
    // List all strains
    list: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        category: z.enum(["indica", "sativa", "hybrid"]).optional(),
        limit: z.number().optional().default(100),
      }))
      .query(async ({ input }) => {
        return await inventoryDb.getAllStrains(input.query, input.category, input.limit);
      }),
    // Get strain by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await inventoryDb.getStrainById(input.id);
      }),
    
    // Get strain family (parent and all variants)
    getFamily: protectedProcedure
      .input(z.object({ strainId: z.number() }))
      .query(async ({ input }) => {
        try {
          return await strainService.getStrainFamily(input.strainId);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to get strain family',
            cause: error,
          });
        }
      }),
    
    // Get strain family statistics
    getFamilyStats: protectedProcedure
      .input(z.object({ familyId: z.number() }))
      .query(async ({ input }) => {
        try {
          return await strainService.getFamilyStats(input.familyId);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to get family stats',
            cause: error,
          });
        }
      }),
    
    // Get products in strain family
    getProductsByFamily: protectedProcedure
      .input(z.object({ 
        familyId: z.number(),
        includeOutOfStock: z.boolean().optional().default(false)
      }))
      .query(async ({ input }) => {
        try {
          return await strainService.getProductsByFamily(input.familyId, input.includeOutOfStock);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to get family products',
            cause: error,
          });
        }
      }),
    // Search strains (for autocomplete)
    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await inventoryDb.searchStrains(input.query);
      }),
    // Create custom strain
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        category: z.enum(["indica", "sativa", "hybrid"]),
        description: z.string().optional(),
        aliases: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await inventoryDb.createStrain(input);
      }),
    
    // Import OpenTHC strains
    importOpenTHC: protectedProcedure.mutation(async () => {
      return await importOpenTHCStrainsFromJSON();
    }),
    
    // Find exact strain match
    findExact: protectedProcedure
      .input(z.object({ 
        name: z.string().min(1, 'Strain name required').max(255, 'Strain name too long') 
      }))
      .query(async ({ input }) => {
        try {
          return await findExactStrainMatch(input.name);
        } catch (error) {
          console.error('Error finding exact strain match:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to search for strain',
            cause: error,
          });
        }
      }),
    
    // Find fuzzy strain matches
    findFuzzy: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        threshold: z.number().min(0).max(100).optional().default(80),
        limit: z.number().min(1).max(20).optional().default(5),
      }))
      .query(async ({ input }) => {
        try {
          return await findFuzzyStrainMatches(input.name, input.threshold, input.limit);
        } catch (error) {
          console.error('Error finding fuzzy strain matches:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to search for similar strains',
            cause: error,
          });
        }
      }),
    
    // Match strain for assignment (with auto/suggest/create logic)
    matchForAssignment: protectedProcedure
      .input(z.object({
        name: z.string(),
        autoAssignThreshold: z.number().optional().default(95),
        suggestThreshold: z.number().optional().default(80),
      }))
      .query(async ({ input }) => {
        return await matchStrainForAssignment(
          input.name,
          input.autoAssignThreshold,
          input.suggestThreshold
        );
      }),
    
    // Get or create strain with fuzzy matching
    getOrCreate: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        category: z.enum(["indica", "sativa", "hybrid"]).optional(),
        autoAssignThreshold: z.number().min(0).max(100).optional().default(95),
      }))
      .mutation(async ({ input }) => {
        try {
          return await getOrCreateStrain(
            input.name,
            input.category,
            input.autoAssignThreshold
          );
        } catch (error) {
          console.error('Error getting or creating strain:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to process strain',
            cause: error,
          });
        }
      }),
    
    // Fuzzy search strains (for autocomplete with similarity scoring)
    fuzzySearch: protectedProcedure
      .input(z.object({
        query: z.string().min(1).max(255),
        limit: z.number().min(1).max(50).optional().default(10),
      }))
      .query(async ({ input }) => {
        try {
          return await fuzzySearchStrains(input.query, input.limit);
        } catch (error) {
          console.error('Error searching strains:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to search strains',
            cause: error,
          });
        }
      }),
  })
