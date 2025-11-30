import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";

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
      const scenario = input.scenario;
      const originalArgv = process.argv;
      
      try {
        process.argv = ["node", "seed-realistic-main.ts", scenario];

        // Resolve the absolute path to the seed script
        // In dev: /app/scripts/seed-realistic-main.js
        // In production (Docker): /app/scripts/seed-realistic-main.js  
        // The scripts folder is always at project root
        const projectRoot = process.cwd(); // /app in Docker, project root in dev
        const seedScriptPath = path.join(projectRoot, "scripts", "seed-realistic-main.js");
        
        console.log(`[Seed] Loading seed script from: ${seedScriptPath}`);
        
        // Dynamic import using absolute path
        const seedModule = await import(seedScriptPath);
        const seedRealisticData = seedModule.seedRealisticData;

        if (!seedRealisticData || typeof seedRealisticData !== "function") {
          throw new Error("seedRealisticData function not found in seed script");
        }

        await seedRealisticData();
        
        return { 
          success: true, 
          message: `Database seeded successfully with ${scenario} scenario` 
        };
      } catch (error: any) {
        console.error("[Seed Error]", error);
        throw new Error(`Seed failed: ${error.message}`);
      } finally {
        process.argv = originalArgv;
      }
    }),
});
