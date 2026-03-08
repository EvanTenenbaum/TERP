#!/usr/bin/env tsx
/**
 * Staging Load Test CLI
 *
 * Orchestrates the full persona simulation run against staging (or a custom URL).
 *
 * Usage:
 *   pnpm staging:load-test                    # Full simulation (10 days, all personas)
 *   pnpm staging:load-test:quick              # Quick run (1 day, all personas)
 *   pnpm staging:load-test:sales              # Sales persona only
 *   pnpm staging:load-test:golden             # Golden flows only (chain-runner)
 *
 * CLI flags:
 *   --quick              Set SIMULATION_DAYS=1
 *   --golden             Use chain-runner.spec.ts instead of simulation-runner.spec.ts
 *   --persona=<id>       Filter to a specific persona ID substring
 *
 * Environment variables:
 *   PLAYWRIGHT_BASE_URL    Target URL (default: staging)
 *   SIMULATION_DAYS        Business days to simulate (default: 10)
 *   SIMULATION_PERSONAS    all|sales|inventory|accounting|ops
 */
import { execSync } from "child_process";
import { mkdirSync } from "fs";

const args = process.argv.slice(2);
const isQuick = args.includes("--quick");
const isGolden = args.includes("--golden");
const personaArg = args.find(a => a.startsWith("--persona="));
const personaFilter = personaArg ? personaArg.split("=")[1] : "all";

const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://terp-staging-yicld.ondigitalocean.app";
const days = isQuick ? 1 : Number(process.env.SIMULATION_DAYS || 10);
const runId = `sim-${new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .substring(0, 19)}`;
const outputDir = `qa-results/simulation/${runId}`;

console.info("=".repeat(80));
console.info("TERP Staging Load Test");
console.info("=".repeat(80));
console.info(`Target:    ${baseUrl}`);
console.info(`Days:      ${days}`);
console.info(`Personas:  ${personaFilter}`);
console.info(`Golden:    ${isGolden}`);
console.info(`Run ID:    ${runId}`);
console.info(`Output:    ${outputDir}/`);
console.info("=".repeat(80));

try {
  mkdirSync(`${outputDir}/screenshots`, { recursive: true });
  mkdirSync(`${outputDir}/reports`, { recursive: true });
} catch {
  // Non-fatal — directories may already exist
}

const specFile = isGolden
  ? "tests-e2e/chains/chain-runner.spec.ts"
  : "tests-e2e/chains/simulation-runner.spec.ts";

const envVars = [
  `PLAYWRIGHT_BASE_URL=${baseUrl}`,
  `SIMULATION_DAYS=${days}`,
  `SIMULATION_PERSONAS=${personaFilter}`,
  `SIMULATION_OUTPUT=${outputDir}`,
  `E2E_ALLOW_ADMIN_FALLBACK=true`,
].join(" ");

const cmd = `${envVars} npx playwright test ${specFile} --project=staging-critical --reporter=list,json --output=${outputDir}`;

console.info(`\nRunning: ${cmd}\n`);

try {
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
  console.info("\nSimulation completed successfully");
} catch {
  console.info("\nSimulation completed with failures (see report above)");
  process.exit(1);
}
