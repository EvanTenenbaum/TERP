import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
        // Use child_process.exec to run the seed script as a separate process.
        // This avoids issues with esbuild bundling and dynamic imports.
        // `pnpm tsx` is used to execute the TypeScript file directly.
        // The scenario is passed as a command-line argument.
        console.log(`[Seed] Starting database seed with scenario: ${scenario}`);
        
        const { stdout, stderr } = await execAsync(
          `pnpm tsx scripts/seed-realistic-main.ts ${scenario}`,
          { 
            cwd: process.cwd(), 
            env: { ...process.env }, // Spread to ensure all env vars are passed
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large output
          }
        );

        // Log the output and errors from the seed script
        if (stdout) {
          console.log('[Seed Output]:', stdout);
        }
        if (stderr) {
          console.error('[Seed Stderr]:', stderr);
        }

        console.log(`[Seed] Database seeded successfully with ${scenario} scenario`);
        return { 
          success: true, 
          message: `Database seeded successfully with ${scenario} scenario` 
        };
      } catch (error: any) {
        // Handle errors from the execAsync call
        console.error('[Seed Error]:', error);
        throw new Error(`Seed failed: ${error.message}`);
      }
    }),
});
