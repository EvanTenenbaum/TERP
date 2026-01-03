/**
 * AI Agent Test - No Authentication Required
 *
 * Simple test to verify the AI agent works without needing a full database.
 */

import { test, expect } from "@playwright/test";
import { createQAAgent } from "../ai-agents";

test.describe("AI Agent: No Auth Test", () => {
  test("explores login page without authentication", async ({ page }) => {
    const agent = createQAAgent({
      task: `You are on a login page. Explore what you can see:
1. Identify the page type (login, error, etc.)
2. Look for any visible UI elements
3. Report what you observe
After 3 steps, mark as done.`,
      startUrl: "/login",
      maxSteps: 5,
      requiresAuth: false,
    });

    const result = await agent.run(page);

    console.info("\n" + "=".repeat(60));
    console.info("AI AGENT RESULTS: No-Auth Test");
    console.info("=".repeat(60));
    console.info(`Success: ${result.success ? "✓ PASS" : "✗ FAIL"}`);
    console.info(`Steps: ${result.stepsCompleted}`);
    console.info(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
    console.info("\nActions:");
    result.actions.forEach((action, i) => {
      console.info(
        `  ${i + 1}. [${action.action}] ${action.reasoning.slice(0, 60)}`
      );
    });

    if (result.errors.length > 0) {
      console.warn("\nErrors:", result.errors.slice(0, 3).join(", "));
    }

    console.info("=".repeat(60) + "\n");

    // Just verify it ran some steps
    expect(result.stepsCompleted).toBeGreaterThan(0);
  });
});
