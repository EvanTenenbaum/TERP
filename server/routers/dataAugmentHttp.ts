/**
 * HTTP Endpoint for Data Augmentation
 * 
 * Simple HTTP endpoint to run augmentation scripts without tRPC authentication
 * This is a temporary solution until the tRPC router issue is resolved
 */

import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../_core/logger.js";

const execAsync = promisify(exec);

const router = Router();

/**
 * Run augmentation scripts via HTTP POST
 * 
 * POST /api/data-augment/run
 * Body: { scripts: string[] } (optional - defaults to all)
 */
router.post("/run", async (req, res) => {
  const { scripts } = req.body || {};
  
  const allScripts = [
    { name: "fix-temporal-coherence", command: "pnpm tsx scripts/fix-temporal-coherence.ts" },
    { name: "augment-orders", command: "pnpm tsx scripts/augment-orders.ts" },
    { name: "augment-inventory-movements", command: "pnpm tsx scripts/augment-inventory-movements.ts" },
    { name: "augment-financial-chains", command: "pnpm tsx scripts/augment-financial-chains.ts" },
    { name: "augment-client-relationships", command: "pnpm tsx scripts/augment-client-relationships.ts" },
    { name: "validate-data-quality", command: "pnpm tsx scripts/validate-data-quality.ts" },
  ];

  const scriptsToRun = scripts 
    ? allScripts.filter(s => scripts.includes(s.name))
    : allScripts;

  const results: Array<{
    script: string;
    status: "success" | "error";
    output?: string;
    error?: string;
    duration?: number;
  }> = [];

  logger.info({ msg: `Starting data augmentation: ${scriptsToRun.length} scripts` });

  for (const script of scriptsToRun) {
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

  res.json({
    success: errorCount === 0,
    summary: {
      total: results.length,
      success: successCount,
      errors: errorCount,
    },
    results,
  });
});

/**
 * Get status
 * GET /api/data-augment/status
 */
router.get("/status", (req, res) => {
  res.json({
    message: "Data augmentation endpoint ready",
    availableScripts: [
      "fix-temporal-coherence",
      "augment-orders",
      "augment-inventory-movements",
      "augment-financial-chains",
      "augment-client-relationships",
      "validate-data-quality",
    ],
  });
});

export default router;
