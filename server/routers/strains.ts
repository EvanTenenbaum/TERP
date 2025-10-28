import { z } from "zod";
import { publicProcedure as protectedProcedure, router } from "../_core/trpc";
import * as inventoryDb from "../inventoryDb";
import { seedStrainsFromCSV } from "../seedStrains";

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
  })
