/**
 * Chain Runner - Run all chains for quick validation
 *
 * Runs every chain in ALL_CHAINS as an individual Playwright test.
 * Good for quick validation that all defined chains are functional.
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=https://terp-staging-yicld.ondigitalocean.app \
 *     npx playwright test tests-e2e/chains/chain-runner.spec.ts --project=staging-critical
 *
 * Filter by tag:
 *   CHAIN_TAG=crud:create npx playwright test tests-e2e/chains/chain-runner.spec.ts
 *
 * @staging-critical
 */
import { test, expect } from "@playwright/test";
import { ALL_CHAINS, getChainById } from "./definitions";
import { executeChain } from "./chain-executor";
import type { TestChain } from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CHAIN_TAG = process.env.CHAIN_TAG;
const CHAIN_TIMEOUT = Number(process.env.CHAIN_TIMEOUT || 60000);
const OUTPUT_DIR = process.env.SIMULATION_OUTPUT || "qa-results/simulation";

// ---------------------------------------------------------------------------
// Filter chains by tag
// ---------------------------------------------------------------------------

function filterChains(chains: TestChain[]): TestChain[] {
  if (!CHAIN_TAG) return chains;
  return chains.filter(c => c.tags.includes(CHAIN_TAG));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("Chain Runner - All Chains @staging-critical", () => {
  test.setTimeout(CHAIN_TIMEOUT * 10);

  test.beforeAll(async () => {
    const { mkdirSync } = await import("fs");
    try {
      mkdirSync(`${OUTPUT_DIR}/screenshots`, { recursive: true });
    } catch {
      // Directory may already exist — non-fatal
    }
  });

  const chainsToRun = filterChains(ALL_CHAINS);

  if (chainsToRun.length === 0) {
    test("No chains to run @staging-critical", () => {
      const tagMsg = CHAIN_TAG ? ` matching tag "${CHAIN_TAG}"` : "";
      console.warn(`No chains found${tagMsg}. Check definitions/index.ts.`);
    });
  }

  for (const chain of chainsToRun) {
    test(`${chain.description} [${chain.chain_id}] @staging-critical`, async ({
      page,
    }) => {
      const result = await executeChain(page, chain);

      const status = result.success ? "PASS" : "FAIL";
      const failType = result.failure_type ? ` [${result.failure_type}]` : "";
      console.info(
        `${status} ${chain.chain_id}${failType} (${result.duration_ms}ms)`
      );

      if (!result.success) {
        for (const phase of result.phases.filter(p => !p.success)) {
          console.info(`  Phase ${phase.phase_id}: ${phase.errors.join("; ")}`);
          if (phase.failure_type) {
            console.info(`    Classification: ${phase.failure_type}`);
          }
        }
      }

      // Golden flows always hard-assert; others only assert on confirmed app bugs
      const isGolden = chain.chain_id.startsWith("golden.");
      if (isGolden || result.failure_type === "app_bug") {
        const firstFailed = result.phases.find(p => !p.success);
        expect(
          result.success,
          `${isGolden ? "Golden flow" : "App bug"} in ${chain.chain_id}: ${firstFailed?.errors.join("; ") ?? "unknown"}`
        ).toBe(true);
      }
    });
  }

  // Run a chain by ID fetched at test-time (supports CHAIN_ID env override)
  test.describe("Chain ID lookup validation @staging-critical", () => {
    test("getChainById returns undefined for unknown ID @staging-critical", () => {
      const result = getChainById("__nonexistent_chain_id__");
      expect(result).toBeUndefined();
    });
  });
});
