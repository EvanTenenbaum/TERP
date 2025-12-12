/**
 * DigitalOcean post-deploy job runner for data augmentation.
 *
 * IMPORTANT:
 * DigitalOcean App Platform "job" run_command is not executed via a shell.
 * Shell operators like `&&` are passed as literal args (breaking `pnpm install` etc).
 *
 * This script provides a single-command entrypoint:
 *   pnpm tsx scripts/augment-data-job.ts
 *
 * It sequentially runs the augmentation scripts and fails fast on any error.
 */

import { spawn } from "node:child_process";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(
        new Error(
          `Command failed: ${cmd} ${args.join(" ")} (code=${code ?? "null"}, signal=${signal ?? "null"})`
        )
      );
    });
  });
}

async function main() {
  console.log("[augment-data] Starting post-deploy augmentation pipeline...");

  // These scripts are intended to be run in this exact order.
  await run("pnpm", ["tsx", "scripts/fix-temporal-coherence.ts"]);
  await run("pnpm", ["tsx", "scripts/augment-orders.ts"]);
  await run("pnpm", ["tsx", "scripts/augment-inventory-movements.ts"]);
  await run("pnpm", ["tsx", "scripts/augment-financial-chains.ts"]);
  await run("pnpm", ["tsx", "scripts/augment-client-relationships.ts"]);
  await run("pnpm", ["tsx", "scripts/validate-data-quality.ts"]);

  console.log("[augment-data] ✅ Completed successfully.");
}

main().catch((err) => {
  console.error("[augment-data] ❌ Failed:", err);
  process.exit(1);
});


