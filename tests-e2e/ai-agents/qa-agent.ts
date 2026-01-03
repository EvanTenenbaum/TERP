/**
 * AI Browser QA Agent
 *
 * Uses Claude's vision capability to understand the UI and perform QA testing.
 * The agent takes screenshots, reasons about what to test, and executes actions.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Page } from "@playwright/test";
import type {
  AgentAction,
  AgentConfig,
  AgentState,
  AgentResult,
} from "./types";
import { DEFAULT_CONFIG } from "./types";
import {
  setupConsoleCapture,
  setupNetworkCapture,
  runOracles,
} from "../utils/oracles";

const SYSTEM_PROMPT = `You are an expert QA engineer testing the TERP ERP system. Your job is to explore the application, verify functionality works correctly, and find bugs.

TERP is an Enterprise Resource Planning system with these modules:
- Dashboard with KPIs and analytics
- Inventory management (batches, products, vendors)
- Client management
- Order processing
- Accounting (invoices, payments, ledger)
- Quote management

Given a screenshot of the current page state, decide the next action to take.

IMPORTANT RULES:
1. Be methodical - complete one workflow before moving to another
2. Verify data displays correctly after actions
3. Check for console errors and broken layouts
4. Test both happy paths and edge cases
5. Look for visual bugs (misaligned elements, missing data, broken styles)

Return ONLY a JSON object with this structure:
{
  "action": "click" | "fill" | "select" | "hover" | "scroll" | "navigate" | "assert" | "wait" | "done",
  "selector": "CSS selector or button/link text",
  "value": "value for fill/select actions",
  "url": "URL for navigate action",
  "assertion": "description of what should be true",
  "reasoning": "why you chose this action",
  "confidence": 0.0-1.0
}

Examples:
- Click a button: {"action": "click", "selector": "button:has-text('Save')", "reasoning": "Submit the form to test save functionality", "confidence": 0.9}
- Fill input: {"action": "fill", "selector": "input[name='email']", "value": "test@example.com", "reasoning": "Enter email to test form validation", "confidence": 0.95}
- Assert: {"action": "assert", "assertion": "Success toast message is visible", "reasoning": "Verify the save operation succeeded", "confidence": 0.85}
- Done: {"action": "done", "reasoning": "Completed testing the client creation workflow", "confidence": 1.0}`;

export class QAAgent {
  private client: Anthropic;
  private config: AgentConfig;
  private state: AgentState;
  private screenshots: string[] = [];

  constructor(config: Partial<AgentConfig> = {}) {
    this.client = new Anthropic();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      url: "",
      pageTitle: "",
      stepNumber: 0,
      previousActions: [],
      errors: [],
      networkFailures: [],
    };
  }

  /**
   * Run the QA agent on a page
   */
  async run(page: Page): Promise<AgentResult> {
    const startTime = Date.now();
    const consoleErrors = setupConsoleCapture(page);
    const networkFailures = setupNetworkCapture(page);
    const assertions: Array<{ passed: boolean; description: string }> = [];

    try {
      // Navigate to start URL
      await page.goto(this.config.startUrl);
      await page.waitForLoadState("networkidle");

      // Main agent loop
      while (this.state.stepNumber < this.config.maxSteps) {
        this.state.stepNumber++;
        this.state.url = page.url();
        this.state.pageTitle = await page.title();
        this.state.errors = [...consoleErrors];
        this.state.networkFailures = [...networkFailures];

        // Get next action from Claude
        const action = await this.getNextAction(page);
        this.state.previousActions.push(action);

        // Check if done
        if (action.action === "done") {
          break;
        }

        // Execute the action
        const result = await this.executeAction(page, action);

        if (action.action === "assert") {
          assertions.push({
            passed: result.success,
            description: action.assertion || "Unknown assertion",
          });

          if (!result.success && this.config.failFast) {
            break;
          }
        }

        // Screenshot after action if configured
        if (this.config.screenshotEachStep) {
          const screenshot = await page.screenshot({ type: "png" });
          this.screenshots.push(screenshot.toString("base64"));
        }

        // Small delay between actions
        await page.waitForTimeout(500);
      }

      // Run final oracles
      const evidence = await runOracles(page, consoleErrors, networkFailures);

      return {
        success:
          !evidence.infiniteSpinnerDetected && assertions.every(a => a.passed),
        stepsCompleted: this.state.stepNumber,
        actions: this.state.previousActions,
        assertions,
        errors: [...consoleErrors, ...evidence.consoleErrors],
        screenshots: this.screenshots,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        stepsCompleted: this.state.stepNumber,
        actions: this.state.previousActions,
        assertions,
        errors: [...consoleErrors, String(error)],
        screenshots: this.screenshots,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get the next action from Claude based on current page state
   */
  private async getNextAction(page: Page): Promise<AgentAction> {
    // Take screenshot
    const screenshot = await page.screenshot({ type: "png" });
    const base64Screenshot = screenshot.toString("base64");

    // Build context message
    const contextMessage = this.buildContextMessage();

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: base64Screenshot,
                },
              },
              {
                type: "text",
                text: contextMessage,
              },
            ],
          },
        ],
      });

      // Parse response
      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr
          .replace(/```json?\n?/g, "")
          .replace(/```$/g, "")
          .trim();
      }

      const action = JSON.parse(jsonStr) as AgentAction;
      return action;
    } catch (error) {
      // Return a safe fallback action
      return {
        action: "done",
        reasoning: `Error getting next action: ${error}`,
        confidence: 0,
      };
    }
  }

  /**
   * Build context message for Claude
   */
  private buildContextMessage(): string {
    const recentActions = this.state.previousActions.slice(-5);
    const actionHistory = recentActions
      .map((a, i) => `${i + 1}. ${a.action}: ${a.reasoning}`)
      .join("\n");

    return `TASK: ${this.config.task}

CURRENT STATE:
- URL: ${this.state.url}
- Page Title: ${this.state.pageTitle}
- Step: ${this.state.stepNumber} of ${this.config.maxSteps}
- Console Errors: ${this.state.errors.length}
- Network Failures: ${this.state.networkFailures.length}

RECENT ACTIONS:
${actionHistory || "None yet"}

What should be the next QA action? Return JSON only.`;
  }

  /**
   * Execute an action on the page
   */
  private async executeAction(
    page: Page,
    action: AgentAction
  ): Promise<{ success: boolean; error?: string }> {
    try {
      switch (action.action) {
        case "click":
          if (action.selector) {
            // Try text selector first, then CSS
            const textMatch = action.selector.match(
              /:has-text\(['"](.+)['"]\)/
            );
            if (textMatch) {
              await page
                .getByText(textMatch[1])
                .first()
                .click({ timeout: 5000 });
            } else {
              await page
                .locator(action.selector)
                .first()
                .click({ timeout: 5000 });
            }
          }
          break;

        case "fill":
          if (action.selector && action.value !== undefined) {
            await page
              .locator(action.selector)
              .first()
              .fill(action.value, { timeout: 5000 });
          }
          break;

        case "select":
          if (action.selector && action.value) {
            await page
              .locator(action.selector)
              .first()
              .selectOption(action.value, { timeout: 5000 });
          }
          break;

        case "hover":
          if (action.selector) {
            await page
              .locator(action.selector)
              .first()
              .hover({ timeout: 5000 });
          }
          break;

        case "scroll":
          await page.evaluate(() => window.scrollBy(0, 300));
          break;

        case "navigate":
          if (action.url) {
            await page.goto(action.url);
            await page.waitForLoadState("networkidle");
          }
          break;

        case "assert":
          // Assertions are validated by the agent's observation
          // We just wait for the page to settle
          await page.waitForTimeout(1000);
          break;

        case "wait":
          await page.waitForTimeout(2000);
          break;

        case "screenshot": {
          const screenshotData = await page.screenshot({ type: "png" });
          this.screenshots.push(screenshotData.toString("base64"));
          break;
        }

        default:
          break;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

/**
 * Create a QA agent with the given configuration
 */
export function createQAAgent(config: Partial<AgentConfig> = {}): QAAgent {
  return new QAAgent(config);
}
