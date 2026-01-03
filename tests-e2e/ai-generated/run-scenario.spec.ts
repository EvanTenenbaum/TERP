/**
 * Dynamic AI Agent Scenario Runner
 *
 * Run any predefined scenario via environment variable:
 *   SCENARIO=dashboardExplore pnpm test:e2e:ai:run
 *
 * Or run a custom task:
 *   AI_TASK="Test the quote creation workflow" pnpm test:e2e:ai:run
 */

import { test, expect } from "@playwright/test";
import {
  createQAAgent,
  getScenario,
  getScenarioNames,
  DEFAULT_CONFIG,
} from "../ai-agents";
import { loginAsAdmin, loginAsVipClient } from "../fixtures/auth";

const scenarioName = process.env.SCENARIO || "dashboardExplore";
const customTask = process.env.AI_TASK;

test.describe("AI Agent: Dynamic Scenario Runner", () => {
  test(`runs scenario: ${customTask ? "Custom Task" : scenarioName}`, async ({
    page,
  }) => {
    let config = DEFAULT_CONFIG;
    let name = "Custom Task";

    if (customTask) {
      // Custom task from environment
      config = {
        ...DEFAULT_CONFIG,
        task: customTask,
        maxSteps: parseInt(process.env.AI_MAX_STEPS || "20", 10),
        startUrl: process.env.AI_START_URL || "/",
      };
    } else {
      // Predefined scenario
      const validScenarios = getScenarioNames();
      if (!validScenarios.includes(scenarioName)) {
        console.warn(`Available scenarios: ${validScenarios.join(", ")}`);
        throw new Error(`Unknown scenario: ${scenarioName}`);
      }

      const scenario = getScenario(scenarioName);
      config = { ...DEFAULT_CONFIG, ...scenario.config };
      name = scenario.name;
    }

    // Handle authentication
    if (config.requiresAuth) {
      if (config.authRole === "vipClient") {
        await loginAsVipClient(page);
      } else {
        await loginAsAdmin(page);
      }
    }

    const agent = createQAAgent(config);
    const result = await agent.run(page);

    // Pretty print results
    console.info("\n" + "=".repeat(60));
    console.info(`AI AGENT RESULTS: ${name}`);
    console.info("=".repeat(60));
    console.info(`Success: ${result.success ? "✓ PASS" : "✗ FAIL"}`);
    console.info(`Steps: ${result.stepsCompleted}/${config.maxSteps}`);
    console.info(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
    console.info("\nActions:");
    result.actions.forEach((action, i) => {
      const conf = (action.confidence * 100).toFixed(0);
      console.info(
        `  ${i + 1}. [${action.action}] (${conf}%) ${action.reasoning.slice(0, 50)}`
      );
    });

    if (result.assertions.length > 0) {
      console.info("\nAssertions:");
      result.assertions.forEach(a => {
        console.info(`  ${a.passed ? "✓" : "✗"} ${a.description}`);
      });
    }

    if (result.errors.length > 0) {
      console.warn("\nErrors:");
      result.errors
        .slice(0, 5)
        .forEach(e => console.warn(`  - ${e.slice(0, 80)}`));
    }

    console.info("=".repeat(60) + "\n");

    expect(result.stepsCompleted).toBeGreaterThan(0);
  });
});
