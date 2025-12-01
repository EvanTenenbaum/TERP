import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";

export const settingsRouter = router({
  hello: publicProcedure
    .input(z.object({ text: z.string().nullish() }).nullish())
    .query(({ input }) => {
      return {
        greeting: `Hello ${input?.text ?? "world"}`,
      };
    }),

  seedDatabase: publicProcedure
    .input(z.object({
      scenario: z.enum(["light", "full", "edgeCases", "chaos"]).optional().default("light"),
    }))
    .mutation(async ({ input }) => {
      const { scenario } = input;

      try {
        console.log(`[Seed] Starting database seed with scenario: ${scenario}`);
        
        // Set process.argv to pass scenario to the seed script
        const originalArgv = process.argv;
        process.argv = [process.argv[0], process.argv[1], scenario];
        
        try {
          // Dynamically import the seed script and call the function
          const { seedRealisticData } = await import("../../scripts/seed-realistic-main.js");
          await seedRealisticData();
        } finally {
          // Restore original argv
          process.argv = originalArgv;
        }

        console.log(`[Seed] Database seeded successfully with ${scenario} scenario`);
        return { 
          success: true, 
          message: `Database seeded successfully with ${scenario} scenario` 
        };
      } catch (error) {
        console.error('[Seed Error]:', error);
        throw new Error(`Seed failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
});
