/**
 * AI-Driven Dashboard QA Test
 *
 * Uses the QA agent to explore and test the dashboard.
 */

import { test, expect } from "@playwright/test";
import { createQAAgent, getScenario } from "../../ai-agents";
import { loginAsAdmin } from "../../fixtures/auth";

test.describe("AI Agent: Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("explores dashboard and verifies KPIs", async ({ page }) => {
    const scenario = getScenario("dashboardExplore");
    const agent = createQAAgent(scenario.config);

    const result = await agent.run(page);

    // Log results for debugging
    console.info(`\n=== AI Agent Results: ${scenario.name} ===`);
    console.info(`Steps completed: ${result.stepsCompleted}`);
    console.info(`Duration: ${result.duration}ms`);
    console.info(`Actions taken:`);
    result.actions.forEach((action, i) => {
      console.info(`  ${i + 1}. ${action.action}: ${action.reasoning}`);
    });

    if (result.errors.length > 0) {
      console.warn(`Errors: ${result.errors.join(", ")}`);
    }

    // Assertions
    expect(result.stepsCompleted).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });

  test("navigation smoke test", async ({ page }) => {
    const scenario = getScenario("navigationSmokeTest");
    const agent = createQAAgent(scenario.config);

    const result = await agent.run(page);

    console.info(`\n=== AI Agent Results: ${scenario.name} ===`);
    console.info(`Steps completed: ${result.stepsCompleted}`);
    console.info(`Pages visited via navigation actions`);

    expect(result.stepsCompleted).toBeGreaterThan(5);
    expect(result.success).toBe(true);
  });
});
