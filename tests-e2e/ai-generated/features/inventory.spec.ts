/**
 * AI-Driven Inventory Module QA Test
 *
 * Uses the QA agent to explore and test inventory management.
 */

import { test, expect } from "@playwright/test";
import { createQAAgent, getScenario } from "../../ai-agents";
import { loginAsAdmin } from "../../fixtures/auth";

test.describe("AI Agent: Inventory Module", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("explores inventory management", async ({ page }) => {
    const scenario = getScenario("inventoryExplore");
    const agent = createQAAgent(scenario.config);

    const result = await agent.run(page);

    console.info(`\n=== AI Agent Results: ${scenario.name} ===`);
    console.info(`Steps completed: ${result.stepsCompleted}`);
    console.info(`Duration: ${result.duration}ms`);

    result.actions.forEach((action, i) => {
      console.info(
        `  ${i + 1}. [${action.action}] ${action.reasoning.slice(0, 60)}...`
      );
    });

    expect(result.stepsCompleted).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });
});
