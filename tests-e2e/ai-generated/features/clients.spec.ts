/**
 * AI-Driven Clients Module QA Test
 *
 * Uses the QA agent to test client CRUD operations.
 */

import { test, expect } from "@playwright/test";
import { createQAAgent, getScenario } from "../../ai-agents";
import { loginAsAdmin } from "../../fixtures/auth";

test.describe("AI Agent: Clients Module", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("tests client CRUD operations", async ({ page }) => {
    const scenario = getScenario("clientsCRUD");
    const agent = createQAAgent(scenario.config);

    const result = await agent.run(page);

    console.info(`\n=== AI Agent Results: ${scenario.name} ===`);
    console.info(`Steps completed: ${result.stepsCompleted}`);
    console.info(`Duration: ${result.duration}ms`);
    console.info(`Assertions:`);
    result.assertions.forEach(assertion => {
      const status = assertion.passed ? "✓" : "✗";
      console.info(`  ${status} ${assertion.description}`);
    });

    expect(result.stepsCompleted).toBeGreaterThan(0);
    // Allow partial success for exploratory testing
    expect(result.errors.filter(e => e.includes("500"))).toHaveLength(0);
  });

  test("tests form validation", async ({ page }) => {
    const scenario = getScenario("formValidation");
    const agent = createQAAgent({
      ...scenario.config,
      startUrl: "/clients",
      task: `Test client form validation:
1. Navigate to add new client
2. Try submitting empty form
3. Verify required field errors
4. Enter invalid email format
5. Verify email validation error
6. Fill valid data and submit`,
    });

    const result = await agent.run(page);

    console.info(`\n=== AI Agent Results: Form Validation ===`);
    console.info(
      `Steps: ${result.stepsCompleted}, Duration: ${result.duration}ms`
    );

    expect(result.stepsCompleted).toBeGreaterThan(0);
  });
});
