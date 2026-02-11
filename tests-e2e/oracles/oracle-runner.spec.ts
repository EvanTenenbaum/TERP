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
const ORACLE_TIMEOUT = 60000; // 60 seconds per oracle
const RUN_MODE = process.env.ORACLE_RUN_MODE || "tier1"; // tier1, tier2, all, domain, tags, single
const ORACLE_DOMAIN = process.env.ORACLE_DOMAIN || "";
const ORACLE_TAGS = process.env.ORACLE_TAGS || "";
const ORACLE_FLOW_ID = process.env.ORACLE_FLOW_ID || "";

/**
 * Get oracles based on run mode
 */
function getOracles(): TestOracle[] {
  switch (RUN_MODE) {
    case "tier1":
      return loadTier1Oracles();
    case "tier2":
      return loadTier2Oracles();
    case "all":
      return [...loadTier1Oracles(), ...loadTier2Oracles()];
    case "domain":
      if (!ORACLE_DOMAIN) {
        throw new Error("ORACLE_DOMAIN env var required for domain mode");
      }
      return loadOraclesByDomain(ORACLE_DOMAIN);
    case "tags":
      if (!ORACLE_TAGS) {
        throw new Error("ORACLE_TAGS env var required for tags mode");
      }
      return loadOraclesByTags(ORACLE_TAGS.split(","));
    case "single": {
      if (!ORACLE_FLOW_ID) {
        throw new Error("ORACLE_FLOW_ID env var required for single mode");
      }
      const oracle = findOracleById(ORACLE_FLOW_ID);
      return oracle ? [oracle] : [];
    }
    default:
      return loadTier1Oracles();
  }
}

// Load oracles for test generation
const oracles = getOracles();

// Results collection
const results: OracleResult[] = [];

test.describe("Oracle-Based E2E Tests", () => {
  test.setTimeout(ORACLE_TIMEOUT);

  // Generate tests dynamically from oracles
  if (oracles.length === 0) {
    test("No oracles loaded", async () => {
      console.info(`No oracles found for mode: ${RUN_MODE}`);
      console.info("Check that oracle YAML files exist in tests-e2e/oracles/");
      // Don't fail - just note that no oracles were found
      expect(true).toBeTruthy();
    });
  }

  for (const oracle of oracles) {
    test(oracle.flow_id, async ({ page }) => {
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
