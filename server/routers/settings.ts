import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";

// Track if seeding is in progress
let isSeeding = false;

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

      // Check if seeding is already in progress
      if (isSeeding) {
        throw new Error("Seeding is already in progress. Please wait for it to complete.");
      }

      isSeeding = true;
      console.log(`[Seed] Starting database seed with scenario: ${scenario} (async)`);

      // Start seeding in background (fire-and-forget)
      (async () => {
        const originalArgv = process.argv;
        try {
          // Set process.argv to pass scenario to the seed script
          process.argv = [process.argv[0], process.argv[1], scenario];
          
          // Dynamically import the seed script and call the function
          const { seedRealisticData } = await import("../../scripts/seed-realistic-main.js");
          await seedRealisticData();
          
          console.log(`[Seed] ✅ Database seeded successfully with ${scenario} scenario`);
        } catch (error) {
          console.error('[Seed Error]:', error);
          // Log error but don't throw (this is fire-and-forget)
        } finally {
          // Restore original argv
          process.argv = originalArgv;
          isSeeding = false;
        }
      })();

      // Return immediately
      return { 
        success: true, 
        message: `Database seeding started in background with ${scenario} scenario. Check server logs for progress.` 
      };
    }),
});
