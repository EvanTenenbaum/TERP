/**
 * AI-Driven Accounting Module QA Test
 *
 * Uses the QA agent to verify accounting features.
 */

import { test, expect } from "@playwright/test";
import { createQAAgent, getScenario } from "../../ai-agents";
import { loginAsAdmin } from "../../fixtures/auth";

test.describe("AI Agent: Accounting Module", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("verifies accounting overview", async ({ page }) => {
    const scenario = getScenario("accountingOverview");
    const agent = createQAAgent(scenario.config);

    const result = await agent.run(page);

    console.info(`\n=== AI Agent Results: ${scenario.name} ===`);
    console.info(`Steps completed: ${result.stepsCompleted}`);
    console.info(`Duration: ${result.duration}ms`);

    // Check for no 5xx errors (critical for financial data)
    const serverErrors = result.errors.filter(
      e => e.includes("500") || e.includes("502") || e.includes("503")
    );

    if (serverErrors.length > 0) {
      console.error("Server errors detected:", serverErrors);
    }

    expect(result.stepsCompleted).toBeGreaterThan(0);
    expect(serverErrors).toHaveLength(0);
  });
});
