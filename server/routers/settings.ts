// server/routers/settings.ts
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { seedRealisticData } from "../../scripts/seed-realistic-main.js";

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

      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable not set.");
      }

      const originalArgv = process.argv;
      try {
        // Set scenario via process.argv (how the script expects it)
        process.argv = ["node", "seed-realistic-main.ts", scenario];

        await seedRealisticData();

        return {
          success: true,
          message: `Database seeded successfully with ${scenario} scenario`,
        };
      } catch (error: any) {
        console.error("[Seed Error]", error);
        throw new Error(`Seed failed: ${error.message}`);
      } finally {
        process.argv = originalArgv;
      }
    }),
});