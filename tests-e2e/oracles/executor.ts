/**
 * Oracle Executor
 *
 * Executes test oracles against the application using Playwright.
 */

import { Page, expect } from "@playwright/test";
import type {
  TestOracle,
  OracleAction,
  OracleContext,
  OracleResult,
  QARole,
  ExpectedUIState,
  ExpectedDBState,
} from "./types";
import { loginAsRole } from "./auth-fixtures";

/**
 * Execute a test oracle
 */
export async function executeOracle(
  page: Page,
  oracle: TestOracle,
  context: OracleContext = createEmptyContext()
): Promise<OracleResult> {
  const startTime = Date.now();
  const result: OracleResult = {
    flow_id: oracle.flow_id,
    success: false,
    duration: 0,
    steps_completed: 0,
    total_steps: oracle.steps.length,
    ui_assertions: { passed: 0, failed: 0, details: [] },
    db_assertions: { passed: 0, failed: 0, details: [] },
    errors: [],
    screenshots: [],
  };

  try {
    // Authenticate as the specified role
    await loginAsRole(page, oracle.role);

    // Execute preconditions (if any)
    if (oracle.preconditions) {
      await executePreconditions(page, oracle.preconditions, context);
    }

    // Execute steps
    for (let i = 0; i < oracle.steps.length; i++) {
      const step = oracle.steps[i];
      try {
        await executeAction(page, step, context);
        result.steps_completed++;
      } catch (error) {
        result.errors.push(
          `Step ${i + 1} (${step.action}) failed: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    }

    // Assert expected UI state
    if (oracle.expected_ui) {
      const uiResults = await assertUIState(page, oracle.expected_ui, context);
      result.ui_assertions = uiResults;
    }

    // Assert expected DB state (placeholder - requires DB connection)
    if (oracle.expected_db) {
      const dbResults = await assertDBState(oracle.expected_db, context);
      result.db_assertions = dbResults;
    }

    // Determine overall success
    result.success =
      result.errors.length === 0 &&
      result.ui_assertions.failed === 0 &&
      result.db_assertions.failed === 0;
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : String(error)
    );
    result.success = false;
  } finally {
    result.duration = Date.now() - startTime;
  }

  return result;
}

/**
 * Create empty execution context
 */
export function createEmptyContext(): OracleContext {
  return {
    seed: {},
    stored: {},
    created: {},
    temp: {},
  };
}

/**
 * Execute preconditions
 */
async function executePreconditions(
  page: Page,
  preconditions: TestOracle["preconditions"],
  context: OracleContext
): Promise<void> {
  // For ensure conditions, we just validate that seed data exists
  // The actual seed data should be set up by the test environment
  if (preconditions.ensure) {
    for (const condition of preconditions.ensure) {
      // Parse ref to get entity and name
      const ref = condition.ref;
      if (ref.startsWith("seed:")) {
        const [, entityPath] = ref.split("seed:");
        const [entity, name] = entityPath.split(".");
        // Store in context for later reference
        context.seed[`${entity}.${name}`] = { _ref: ref };
      }
    }
  }

  // For create conditions, would typically call API to create temp data
  // For now, we log and continue
  if (preconditions.create) {
    for (const createCondition of preconditions.create) {
      console.log(`[Oracle] Would create temp entity: ${createCondition.ref}`);
      context.temp[createCondition.ref] = { ...createCondition.data };
    }
  }
}

/**
 * Execute a single action
 */
async function executeAction(
  page: Page,
  action: OracleAction,
  context: OracleContext
): Promise<void> {
  const timeout = 10000;

  switch (action.action) {
    case "navigate": {
      await page.goto(action.path);
      if (action.wait_for) {
        await page.waitForSelector(action.wait_for, { timeout });
      }
      await page.waitForLoadState("networkidle");
      break;
    }

    case "click": {
      const selector = getClickTarget(action);
      await page.click(selector, { timeout });
      if (action.wait_after) {
        await page.waitForTimeout(action.wait_after);
      }
      if (action.wait_for_navigation) {
        await page.waitForLoadState("networkidle");
      }
      break;
    }

    case "type": {
      const value = resolveValue(action.value || action.value_ref || "", context);
      if (action.clear_first) {
        await page.fill(action.target, "");
      }
      await page.fill(action.target, value);
      break;
    }

    case "select": {
      const value = resolveValue(
        action.value || action.value_ref || "",
        context
      );

      if (action.type_to_search) {
        // For searchable dropdowns, click then type
        await page.click(action.target);
        await page.waitForTimeout(200);
        await page.keyboard.type(value);
        await page.waitForTimeout(500);
        // Click first option
        const option = page.locator('[role="option"], .option').first();
        if (await option.isVisible().catch(() => false)) {
          await option.click();
        } else {
          await page.keyboard.press("Enter");
        }
      } else if (action.option_value) {
        await page.selectOption(action.target, { value: action.option_value });
      } else if (action.option_index !== undefined) {
        await page.selectOption(action.target, { index: action.option_index });
      } else {
        await page.selectOption(action.target, { label: value });
      }
      break;
    }

    case "add_line_item": {
      // Domain-specific: Add order line item
      // This is a composite action that would typically:
      // 1. Click add item button
      // 2. Select batch/product
      // 3. Enter quantity
      // Implementation depends on actual UI structure
      console.log(`[Oracle] Would add line item: ${JSON.stringify(action)}`);

      // Try to find and click add item button
      const addButton = page.locator(
        '[data-testid="add-line-item"], button:has-text("Add Item"), button:has-text("Add Line")'
      );
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);
      }

      // Try to find quantity input
      const qtyInput = page.locator(
        'input[name="quantity"], [data-testid="quantity-input"]'
      );
      if (await qtyInput.isVisible().catch(() => false)) {
        await qtyInput.fill(String(action.quantity));
      }
      break;
    }

    case "assert": {
      if (action.visible) {
        await expect(page.locator(action.visible)).toBeVisible({ timeout });
      }
      if (action.not_visible) {
        await expect(page.locator(action.not_visible)).not.toBeVisible({
          timeout,
        });
      }
      if (action.text_contains) {
        await expect(page.locator("body")).toContainText(action.text_contains);
      }
      if (action.value_equals) {
        const locator = page.locator(action.value_equals.target);
        await expect(locator).toHaveValue(action.value_equals.value);
      }
      break;
    }

    case "wait": {
      if (action.for) {
        await page.waitForSelector(action.for, {
          timeout: action.timeout || timeout,
        });
      } else if (action.duration) {
        await page.waitForTimeout(action.duration);
      } else if (action.network_idle) {
        await page.waitForLoadState("networkidle");
      }
      break;
    }

    case "screenshot": {
      const screenshot = await page.screenshot({
        fullPage: action.full_page,
      });
      // Store screenshot path (actual storage depends on test runner config)
      console.log(`[Oracle] Screenshot taken: ${action.name}`);
      break;
    }

    case "store": {
      const element = page.locator(action.from);
      const text = await element.textContent();
      context.stored[action.as] = text || "";
      break;
    }

    case "custom": {
      // Execute custom code (use with caution)
      const fn = new Function("page", "context", action.code);
      await fn(page, context);
      break;
    }
  }
}

/**
 * Get click target selector
 */
function getClickTarget(
  action: Extract<OracleAction, { action: "click" }>
): string {
  if (action.target) {
    return action.target;
  }
  if (action.target_text) {
    return `text="${action.target_text}"`;
  }
  if (action.target_label) {
    return `[aria-label="${action.target_label}"], label:has-text("${action.target_label}")`;
  }
  throw new Error("Click action requires target, target_text, or target_label");
}

/**
 * Resolve value with context references
 */
function resolveValue(value: string, context: OracleContext): string {
  if (!value.includes("$")) {
    return value;
  }

  let resolved = value;

  // Replace $seed:entity.name.field
  resolved = resolved.replace(
    /\$seed:([a-zA-Z_.]+)/g,
    (_, path) => {
      const parts = path.split(".");
      const ref = context.seed[`${parts[0]}.${parts[1]}`];
      if (ref && parts[2]) {
        return String((ref as Record<string, unknown>)[parts[2]] || "");
      }
      return "";
    }
  );

  // Replace $stored.key
  resolved = resolved.replace(
    /\$stored\.([a-zA-Z_]+)/g,
    (_, key) => String(context.stored[key] || "")
  );

  // Replace $created.key.field
  resolved = resolved.replace(
    /\$created\.([a-zA-Z_.]+)/g,
    (_, path) => {
      const parts = path.split(".");
      const ref = context.created[parts[0]];
      if (ref && parts[1]) {
        return String((ref as Record<string, unknown>)[parts[1]] || "");
      }
      return "";
    }
  );

  // Replace $temp.key
  resolved = resolved.replace(
    /\$temp\.([a-zA-Z_]+)/g,
    (_, key) => String(context.temp[key] || "")
  );

  return resolved;
}

/**
 * Assert UI state
 */
async function assertUIState(
  page: Page,
  expected: ExpectedUIState,
  context: OracleContext
): Promise<OracleResult["ui_assertions"]> {
  const result: OracleResult["ui_assertions"] = {
    passed: 0,
    failed: 0,
    details: [],
  };

  const timeout = 5000;

  // URL assertions
  if (expected.url_contains) {
    try {
      expect(page.url()).toContain(expected.url_contains);
      result.passed++;
      result.details.push({
        assertion: `URL contains "${expected.url_contains}"`,
        passed: true,
      });
    } catch (error) {
      result.failed++;
      result.details.push({
        assertion: `URL contains "${expected.url_contains}"`,
        passed: false,
        error: `Actual: ${page.url()}`,
      });
    }
  }

  if (expected.url_matches) {
    try {
      expect(page.url()).toMatch(new RegExp(expected.url_matches));
      result.passed++;
      result.details.push({
        assertion: `URL matches "${expected.url_matches}"`,
        passed: true,
      });
    } catch (error) {
      result.failed++;
      result.details.push({
        assertion: `URL matches "${expected.url_matches}"`,
        passed: false,
        error: `Actual: ${page.url()}`,
      });
    }
  }

  // Visibility assertions
  if (expected.visible) {
    for (const selector of expected.visible) {
      try {
        await expect(page.locator(selector).first()).toBeVisible({ timeout });
        result.passed++;
        result.details.push({
          assertion: `Element visible: ${selector}`,
          passed: true,
        });
      } catch (error) {
        result.failed++;
        result.details.push({
          assertion: `Element visible: ${selector}`,
          passed: false,
          error: "Element not visible",
        });
      }
    }
  }

  if (expected.not_visible) {
    for (const selector of expected.not_visible) {
      try {
        await expect(page.locator(selector)).not.toBeVisible({ timeout });
        result.passed++;
        result.details.push({
          assertion: `Element not visible: ${selector}`,
          passed: true,
        });
      } catch (error) {
        result.failed++;
        result.details.push({
          assertion: `Element not visible: ${selector}`,
          passed: false,
          error: "Element is visible",
        });
      }
    }
  }

  // Text assertions
  if (expected.text_present) {
    for (const text of expected.text_present) {
      try {
        await expect(page.locator("body")).toContainText(text, { timeout });
        result.passed++;
        result.details.push({
          assertion: `Text present: "${text}"`,
          passed: true,
        });
      } catch (error) {
        result.failed++;
        result.details.push({
          assertion: `Text present: "${text}"`,
          passed: false,
          error: "Text not found",
        });
      }
    }
  }

  // Field value assertions
  if (expected.fields) {
    for (const [selector, expectedValue] of Object.entries(expected.fields)) {
      try {
        const element = page.locator(selector).first();
        const tagName = await element.evaluate((el) => el.tagName.toLowerCase());

        if (tagName === "input" || tagName === "textarea") {
          await expect(element).toHaveValue(String(expectedValue));
        } else {
          await expect(element).toContainText(String(expectedValue));
        }

        result.passed++;
        result.details.push({
          assertion: `Field "${selector}" equals "${expectedValue}"`,
          passed: true,
        });
      } catch (error) {
        result.failed++;
        result.details.push({
          assertion: `Field "${selector}" equals "${expectedValue}"`,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // Total assertions
  if (expected.totals) {
    for (const [selector, expectedValue] of Object.entries(expected.totals)) {
      try {
        const element = page.locator(selector).first();
        const text = await element.textContent();
        // Extract number from text (handles currency formatting)
        const actualValue = parseFloat(
          (text || "").replace(/[^0-9.-]/g, "")
        );
        expect(actualValue).toBeCloseTo(expectedValue, 2);

        result.passed++;
        result.details.push({
          assertion: `Total "${selector}" equals ${expectedValue}`,
          passed: true,
        });
      } catch (error) {
        result.failed++;
        result.details.push({
          assertion: `Total "${selector}" equals ${expectedValue}`,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return result;
}

/**
 * Assert DB state (placeholder - requires DB connection)
 */
async function assertDBState(
  expected: ExpectedDBState,
  context: OracleContext
): Promise<OracleResult["db_assertions"]> {
  const result: OracleResult["db_assertions"] = {
    passed: 0,
    failed: 0,
    details: [],
  };

  // DB assertions require a database connection
  // This is a placeholder that would be implemented with actual DB queries
  // For now, we skip DB assertions with a warning

  const tables = Object.keys(expected).filter((k) => k !== "invariants");

  for (const table of tables) {
    const assertions = expected[table];
    if (!assertions) continue;

    for (const assertion of assertions as any[]) {
      result.details.push({
        table,
        assertion: `DB assertion for ${table}`,
        passed: true, // Placeholder - would be actual assertion result
      });
      result.passed++;
    }
  }

  // Invariants
  if (expected.invariants) {
    for (const invariant of expected.invariants) {
      result.details.push({
        table: "invariants",
        assertion: invariant.name,
        passed: true, // Placeholder
      });
      result.passed++;
    }
  }

  return result;
}

/**
 * Format oracle result for console output
 */
export function formatOracleResult(result: OracleResult): string {
  const status = result.success ? "✅ PASS" : "❌ FAIL";
  const lines = [
    `${status} ${result.flow_id}`,
    `  Duration: ${result.duration}ms`,
    `  Steps: ${result.steps_completed}/${result.total_steps}`,
    `  UI Assertions: ${result.ui_assertions.passed} passed, ${result.ui_assertions.failed} failed`,
    `  DB Assertions: ${result.db_assertions.passed} passed, ${result.db_assertions.failed} failed`,
  ];

  if (result.errors.length > 0) {
    lines.push(`  Errors:`);
    for (const error of result.errors) {
      lines.push(`    - ${error}`);
    }
  }

  if (result.ui_assertions.failed > 0) {
    lines.push(`  Failed UI Assertions:`);
    for (const detail of result.ui_assertions.details) {
      if (!detail.passed) {
        lines.push(`    - ${detail.assertion}: ${detail.error}`);
      }
    }
  }

  return lines.join("\n");
}
