/**
 * Oracle Runner Spec
 *
 * Playwright test file that dynamically loads and executes test oracles.
 */

import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import {
  loadTier1Oracles,
  loadTier2Oracles,
  loadOraclesByDomain,
  loadOraclesByTags,
  findOracleById,
  executeOracle,
  createEmptyContext,
  formatOracleResult,
  type TestOracle,
  type OracleResult,
} from "./index";

// Configuration
const DEFAULT_ORACLE_TIMEOUT_MS = Number(
  process.env.ORACLE_TIMEOUT_MS || 240000
);
const RUN_MODE = process.env.ORACLE_RUN_MODE || "tier1"; // tier1, tier2, all, domain, tags, single
const ORACLE_DOMAIN = process.env.ORACLE_DOMAIN || "";
const ORACLE_TAGS = process.env.ORACLE_TAGS || "";
const ORACLE_FLOW_ID = process.env.ORACLE_FLOW_ID || "";

function dedupeByFlowId(oracles: TestOracle[]): TestOracle[] {
  const deduped = new Map<string, TestOracle>();
  for (const oracle of oracles) {
    deduped.set(oracle.flow_id, oracle);
  }
  return Array.from(deduped.values());
}

/**
 * Get oracles based on run mode
 */
function getOracles(): TestOracle[] {
  let selected: TestOracle[];

  switch (RUN_MODE) {
    case "tier1":
      selected = loadTier1Oracles();
      break;
    case "tier2":
      selected = loadTier2Oracles();
      break;
    case "all":
      selected = [...loadTier1Oracles(), ...loadTier2Oracles()];
      break;
    case "domain":
      if (!ORACLE_DOMAIN) {
        throw new Error("ORACLE_DOMAIN env var required for domain mode");
      }
      selected = loadOraclesByDomain(ORACLE_DOMAIN);
      break;
    case "tags":
      if (!ORACLE_TAGS) {
        throw new Error("ORACLE_TAGS env var required for tags mode");
      }
      selected = loadOraclesByTags(ORACLE_TAGS.split(","));
      break;
    case "single": {
      if (!ORACLE_FLOW_ID) {
        throw new Error("ORACLE_FLOW_ID env var required for single mode");
      }
      const oracle = findOracleById(ORACLE_FLOW_ID);
      if (!oracle) {
        throw new Error(
          `ORACLE_FLOW_ID not found: ${ORACLE_FLOW_ID}. Use generateOracleSummary/getAllOracleIds to inspect available IDs.`
        );
      }
      selected = [oracle];
      break;
    }
    default:
      selected = loadTier1Oracles();
      break;
  }

  const deduped = dedupeByFlowId(selected);
  if (deduped.length === 0) {
    throw new Error(
      [
        `No oracles loaded for run mode "${RUN_MODE}".`,
        `domain="${ORACLE_DOMAIN}" tags="${ORACLE_TAGS}" flow_id="${ORACLE_FLOW_ID}"`,
        "Refusing to pass with empty oracle set.",
      ].join(" ")
    );
  }

  return deduped;
}

// Load oracles for test generation
const oracles = getOracles();

// Results collection
const results: OracleResult[] = [];

test.describe("Oracle-Based E2E Tests", () => {
  test.setTimeout(DEFAULT_ORACLE_TIMEOUT_MS);

  test("Oracle selection is non-empty", async () => {
    expect(oracles.length).toBeGreaterThan(0);
  });

  for (const oracle of oracles) {
    test(oracle.flow_id, async ({ page }) => {
      const oracleTimeout =
        typeof oracle.timeout === "number" && oracle.timeout > 0
          ? oracle.timeout
          : DEFAULT_ORACLE_TIMEOUT_MS;
      // Keep suite timeout deterministic on slower local/CI environments.
      test.setTimeout(Math.max(DEFAULT_ORACLE_TIMEOUT_MS, oracleTimeout));

      test.info().annotations.push({
        type: "description",
        description: oracle.description,
      });

      if (oracle.tags) {
        test.info().annotations.push({
          type: "tags",
          description: oracle.tags.join(", "),
        });
      }

      // Execute the oracle
      const context = createEmptyContext();
      const result = await executeOracle(page, oracle, context);

      // Store result for summary
      results.push(result);

      // Log result
      console.info(formatOracleResult(result));

      // BLOCKED indicates missing live preconditions/seed data, not an app regression.
      if (result.status === "BLOCKED") {
        test.info().annotations.push({
          type: "blocked",
          description: `Oracle blocked: ${result.errors.join(" | ")}`,
        });
        return;
      }

      // Assert success for executable flows.
      expect(result.success, `Oracle ${oracle.flow_id} failed`).toBeTruthy();
    });
  }
});

// After all tests, generate summary report
test.afterAll(async () => {
  if (results.length === 0) return;

  const passed = results.filter(r => r.success).length;
  const blocked = results.filter(r => r.status === "BLOCKED").length;
  const failed = results.filter(
    r => !r.success && r.status !== "BLOCKED"
  ).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.info("\n" + "=".repeat(60));
  console.info("Oracle Test Summary");
  console.info("=".repeat(60));
  console.info(
    `Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Blocked: ${blocked}`
  );
  console.info(`Duration: ${(totalDuration / 1000).toFixed(2)}s`);

  if (failed > 0) {
    console.info("\nFailed Oracles:");
    for (const result of results.filter(
      r => !r.success && r.status !== "BLOCKED"
    )) {
      console.info(`  - ${result.flow_id}`);
      for (const error of result.errors) {
        console.info(`      ${error}`);
      }
    }
  }

  if (blocked > 0) {
    console.info("\nBlocked Oracles:");
    for (const result of results.filter(r => r.status === "BLOCKED")) {
      console.info(`  - ${result.flow_id}`);
      for (const error of result.errors) {
        console.info(`      ${error}`);
      }
    }
  }

  console.info("=".repeat(60) + "\n");

  // Write results to JSON file
  const reportPath = path.join(
    process.cwd(),
    "test-results",
    "oracle-results.json"
  );

  // Ensure directory exists
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        mode: RUN_MODE,
        summary: {
          total: results.length,
          passed,
          failed,
          blocked,
          duration: totalDuration,
        },
        results,
      },
      null,
      2
    )
  );

  console.info(`Results written to: ${reportPath}`);
});
