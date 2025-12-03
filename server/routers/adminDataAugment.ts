/**
 * Admin Data Augmentation Router
 * 
 * Provides endpoints to run DATA-002-AUGMENT scripts from production server
 * (which has stable database connection)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { requirePermission } from "../_core/permissionMiddleware.js";
import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../_core/logger.js";

const execAsync = promisify(exec);

/**
 * Run augmentation scripts via API
 * This runs from the production server which has stable DB connection
 */
export const adminDataAugmentRouter = router({
  /**
   * Run all augmentation scripts in order
   */
  runAll: protectedProcedure.use(requirePermission("system:manage"))
    .input(
      z.object({
        skipTemporal: z.boolean().optional().default(false),
        skipOrders: z.boolean().optional().default(false),
        skipInventory: z.boolean().optional().default(false),
        skipFinancial: z.boolean().optional().default(false),
        skipClients: z.boolean().optional().default(false),
        skipValidation: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const scripts: Array<{ name: string; command: string; skipped: boolean }> = [
        {
          name: "fix-temporal-coherence",
          command: "pnpm tsx scripts/fix-temporal-coherence.ts",
          skipped: input.skipTemporal,
        },
        {
          name: "augment-orders",
          command: "pnpm tsx scripts/augment-orders.ts",
          skipped: input.skipOrders,
        },
        {
          name: "augment-inventory-movements",
          command: "pnpm tsx scripts/augment-inventory-movements.ts",
          skipped: input.skipInventory,
        },
        {
          name: "augment-financial-chains",
          command: "pnpm tsx scripts/augment-financial-chains.ts",
          skipped: input.skipFinancial,
        },
        {
          name: "augment-client-relationships",
          command: "pnpm tsx scripts/augment-client-relationships.ts",
          skipped: input.skipClients,
        },
        {
          name: "validate-data-quality",
          command: "pnpm tsx scripts/validate-data-quality.ts",
          skipped: input.skipValidation,
        },
      ];

      const results: Array<{
        script: string;
        status: "success" | "error" | "skipped";
        output?: string;
        error?: string;
        duration?: number;
      }> = [];

      for (const script of scripts) {
        if (script.skipped) {
          results.push({
            script: script.name,
            status: "skipped",
          });
          continue;
        }

        const startTime = Date.now();
        try {
          logger.info({ msg: `Running ${script.name}...` });
          
          const { stdout, stderr } = await execAsync(script.command, {
            cwd: process.cwd(),
            env: process.env,
            timeout: 300000, // 5 minutes per script
          });

          const duration = Date.now() - startTime;
          
          results.push({
            script: script.name,
            status: "success",
            output: stdout + (stderr ? `\n${stderr}` : ""),
            duration,
          });

          logger.info({ msg: `${script.name} completed`, duration });
        } catch (error) {
          const duration = Date.now() - startTime;
          const err = error as { message?: string; stdout?: string; stderr?: string };
          
          results.push({
            script: script.name,
            status: "error",
            error: err.message || "Unknown error",
            output: err.stdout || err.stderr || "",
            duration,
          });

          logger.error({ msg: `${script.name} failed`, error: err.message });
        }
      }

      const successCount = results.filter((r) => r.status === "success").length;
      const errorCount = results.filter((r) => r.status === "error").length;
      const skippedCount = results.filter((r) => r.status === "skipped").length;

      return {
        success: errorCount === 0,
        summary: {
          total: results.length,
          success: successCount,
          errors: errorCount,
          skipped: skippedCount,
        },
        results,
      };
    }),

  /**
   * Run individual script
   */
  runScript: protectedProcedure.use(requirePermission("system:manage"))
    .input(
      z.object({
        script: z.enum([
          "fix-temporal-coherence",
          "augment-orders",
          "augment-inventory-movements",
          "augment-financial-chains",
          "augment-client-relationships",
          "validate-data-quality",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const scriptMap: Record<string, string> = {
        "fix-temporal-coherence": "pnpm tsx scripts/fix-temporal-coherence.ts",
        "augment-orders": "pnpm tsx scripts/augment-orders.ts",
        "augment-inventory-movements": "pnpm tsx scripts/augment-inventory-movements.ts",
        "augment-financial-chains": "pnpm tsx scripts/augment-financial-chains.ts",
        "augment-client-relationships": "pnpm tsx scripts/augment-client-relationships.ts",
        "validate-data-quality": "pnpm tsx scripts/validate-data-quality.ts",
      };

      const command = scriptMap[input.script];
      if (!command) {
        throw new Error(`Unknown script: ${input.script}`);
      }

      const startTime = Date.now();
      try {
        logger.info({ msg: `Running ${input.script}...` });
        
        const { stdout, stderr } = await execAsync(command, {
          cwd: process.cwd(),
          env: process.env,
          timeout: 300000,
        });

        const duration = Date.now() - startTime;

        logger.info({ msg: `${input.script} completed`, duration });

        return {
          success: true,
          script: input.script,
          output: stdout + (stderr ? `\n${stderr}` : ""),
          duration,
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const err = error as { message?: string; stdout?: string; stderr?: string };
        
        logger.error({ msg: `${input.script} failed`, error: err.message });

        return {
          success: false,
          script: input.script,
          error: err.message || "Unknown error",
          output: err.stdout || err.stderr || "",
          duration,
        };
      }
    }),

  /**
   * Get status of last run
   */
  getStatus: protectedProcedure.use(requirePermission("system:manage")).query(async () => {
    // This could be enhanced to store status in database
    return {
      message: "Use runAll or runScript to execute augmentation scripts",
      availableScripts: [
        "fix-temporal-coherence",
        "augment-orders",
        "augment-inventory-movements",
        "augment-financial-chains",
        "augment-client-relationships",
        "validate-data-quality",
      ],
    };
  }),
});
