// server/routers/settings.ts
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { seedDatabase } from "../services/databaseSeeder";

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

      try {
        const result = await seedDatabase(scenario);
        if (result.success) {
          return {
            success: true,
            message: `Database seeded successfully with ${scenario} scenario`,
          };
        } else {
          throw new Error(result.message || "Database seeding failed.");
        }
      } catch (error: any) {
        console.error("Failed to seed database:", error);
        throw new Error(`Failed to seed database: ${error.message}`);
      }
    }),
});
