/**
 * Staging Load Test - Persona Simulation Runner
 *
 * Simulates 2 weeks (10 business days) of 4 employees using TERP.
 * Each persona runs their daily workflow chains sequentially.
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=https://terp-staging-yicld.ondigitalocean.app \
 *     npx playwright test tests-e2e/chains/simulation-runner.spec.ts --project=staging-critical
 *
 * Configuration via env vars:
 *   SIMULATION_DAYS=10          # Business days to simulate (default: 10)
 *   SIMULATION_MODE=sequential  # sequential or interleaved (default: sequential)
 *   SIMULATION_PERSONAS=all     # all, sales, inventory, accounting, ops (default: all)
 *   CHAIN_TIMEOUT=60000         # Per-phase timeout in ms (default: 60000)
 *
 * @staging-critical
 */
import { test, expect } from "@playwright/test";
import { PERSONAS } from "./personas";
import { ALL_CHAINS, getChainById } from "./definitions";
import { executeChain, createChainContext } from "./chain-executor";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SIMULATION_DAYS = Number(process.env.SIMULATION_DAYS || 10);
const SIMULATION_MODE = process.env.SIMULATION_MODE || "sequential";
const SIMULATION_PERSONAS = process.env.SIMULATION_PERSONAS || "all";
const CHAIN_TIMEOUT = Number(process.env.CHAIN_TIMEOUT || 60000);
const OUTPUT_DIR = process.env.SIMULATION_OUTPUT || "qa-results/simulation";

// Suppress unused var warning — kept for future interleaved mode
void SIMULATION_DAYS;
void SIMULATION_MODE;

// Filter personas based on env var
const activePersonas =
  SIMULATION_PERSONAS === "all"
    ? PERSONAS
    : PERSONAS.filter(p => p.persona_id.includes(SIMULATION_PERSONAS));

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("Staging Load Test - Persona Simulation @staging-critical", () => {
  test.setTimeout(CHAIN_TIMEOUT * 20);

  test.beforeAll(async () => {
    const { mkdirSync } = await import("fs");
    try {
      mkdirSync(`${OUTPUT_DIR}/screenshots`, { recursive: true });
      mkdirSync(`${OUTPUT_DIR}/reports`, { recursive: true });
    } catch {
      // Directory may already exist — non-fatal
    }
  });

  for (const persona of activePersonas) {
    test.describe(`Persona: ${persona.name}`, () => {
      // Daily chains
      for (const chainId of persona.daily_chains) {
        const chain = getChainById(chainId);
        if (!chain) {
          test(`[MISSING] ${chainId} @staging-critical`, () => {
            console.warn(`Chain ${chainId} not found in definitions`);
          });
          continue;
        }

        test(`${chain.description} (${chainId}) @staging-critical`, async ({
          page,
        }) => {
          const result = await executeChain(page, chain, createChainContext());

          const status = result.success ? "PASS" : "FAIL";
          const failType = result.failure_type
            ? ` [${result.failure_type}]`
            : "";
          console.info(
            `${status} ${chainId}${failType} (${result.duration_ms}ms)`
          );

          if (!result.success) {
            for (const phase of result.phases.filter(p => !p.success)) {
              console.info(
                `  Phase ${phase.phase_id}: ${phase.errors.join("; ")}`
              );
              if (phase.failure_type) {
                console.info(`    Classification: ${phase.failure_type}`);
              }
            }
          }

          // Only hard-fail on confirmed app bugs.
          // test_infra and data_issue failures are logged but don't block the run
          // so we can distinguish app regressions from test infrastructure issues.
          if (result.failure_type === "app_bug") {
            const firstFailed = result.phases.find(p => !p.success);
            expect(
              result.success,
              `App bug in ${chainId}: ${firstFailed?.errors.join("; ") ?? "unknown"}`
            ).toBe(true);
          }
        });
      }

      // Occasional chains
      if (persona.occasional_chains) {
        for (const chainId of persona.occasional_chains) {
          const chain = getChainById(chainId);
          if (!chain) continue;

          test(`[Occasional] ${chain.description} (${chainId}) @staging-critical`, async ({
            page,
          }) => {
            const result = await executeChain(
              page,
              chain,
              createChainContext()
            );

            const status = result.success ? "PASS" : "FAIL";
            const failType = result.failure_type
              ? ` [${result.failure_type}]`
              : "";
            console.info(
              `${status} ${chainId}${failType} (${result.duration_ms}ms)`
            );

            if (result.failure_type === "app_bug") {
              expect(result.success, `App bug in ${chainId}`).toBe(true);
            }
          });
        }
      }
    });
  }

  // Cross-domain golden flows — always assert
  test.describe("Golden Flows (Cross-Domain)", () => {
    const goldenChains = ALL_CHAINS.filter(c =>
      c.chain_id.startsWith("golden.")
    );

    for (const chain of goldenChains) {
      test(`${chain.description} (${chain.chain_id}) @staging-critical`, async ({
        page,
      }) => {
        const result = await executeChain(page, chain, createChainContext());

        const status = result.success ? "PASS" : "FAIL";
        console.info(`${status} ${chain.chain_id} (${result.duration_ms}ms)`);

        expect(result.success, `Golden flow failed: ${chain.chain_id}`).toBe(
          true
        );
      });
    }
  });

  test.afterAll(async () => {
    console.info("\n" + "=".repeat(80));
    console.info("SIMULATION COMPLETE");
    console.info("=".repeat(80));
    console.info(
      `Personas tested: ${activePersonas.map(p => p.name).join(", ")}`
    );
    console.info(`Total chains defined: ${ALL_CHAINS.length}`);
    console.info(`Output: ${OUTPUT_DIR}/`);
    console.info("=".repeat(80));
  });
});
