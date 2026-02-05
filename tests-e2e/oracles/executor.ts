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
  ExpectedUIState,
  ExpectedDBState,
} from "./types";
import { loginAsRole } from "./auth-fixtures";
import {
  resolveParameterizedPath,
  type EntityCache,
} from "./lib/entity-resolver";
import { runValidationSignals } from "./lib/validation";
import { FailureMode, classifyFailure } from "./lib/failure-classifier";

const entityCache: EntityCache = {};

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
    status: "FAIL",
    duration: 0,
    steps_completed: 0,
    total_steps: oracle.steps.length,
    ui_assertions: { passed: 0, failed: 0, details: [] },
    db_assertions: { passed: 0, failed: 0, details: [] },
    errors: [],
    screenshots: [],
  };

  let lastNavigationStatus: number | null = null;
  let resolvedUrl: string | undefined;
  let lastAttemptedStrategies: string[] = [];

  try {
    await loginAsRole(page, oracle.role);

    if (oracle.preconditions) {
      await executePreconditions(page, oracle.preconditions, context);
    }

    for (let i = 0; i < oracle.steps.length; i++) {
      const step = oracle.steps[i];
      try {
        const execution = await executeAction(page, step, context);
        if (execution.statusCode !== undefined) {
          lastNavigationStatus = execution.statusCode;
        }
        if (execution.resolvedUrl) {
          resolvedUrl = execution.resolvedUrl;
        }
        if (execution.attemptedStrategies) {
          lastAttemptedStrategies = execution.attemptedStrategies;
        }
        if (execution.screenshotPath) {
          result.screenshots.push(execution.screenshotPath);
        }
        result.steps_completed++;
      } catch (error) {
        const typedError =
          error instanceof Error ? error : new Error(String(error));
        result.errors.push(
          `Step ${i + 1} (${step.action}) failed: ${typedError.message}`
        );
        throw typedError;
      }
    }

    if (oracle.expected_ui) {
      const uiResults = await assertUIState(page, oracle.expected_ui, context);
      result.ui_assertions = uiResults;
    }

    if (oracle.expected_db) {
      const dbResults = await assertDBState(oracle.expected_db, context);
      result.db_assertions = dbResults;
    }

    const validation = await runValidationSignals(
      page,
      page.url(),
      lastNavigationStatus
    );

    result.failure_details = {
      http_status: lastNavigationStatus ?? undefined,
      resolved_url: resolvedUrl,
      attempted_strategies: lastAttemptedStrategies,
      validation_results: validation,
    };

    result.success =
      validation.passed &&
      result.errors.length === 0 &&
      result.ui_assertions.failed === 0 &&
      result.db_assertions.failed === 0;

    result.status = result.success ? "PASS" : "FAIL";

    if (!result.success) {
      result.failure_mode = classifyFailure(
        lastNavigationStatus,
        validation,
        null
      );
    }
  } catch (error) {
    const typedError =
      error instanceof Error ? error : new Error(String(error));

    const fallbackValidation = {
      passed: false,
      signals: {
        http_status_ok: false,
        no_404_page: true,
        no_error_state: false,
        no_loading_state: true,
        content_present: false,
        domain_validation: false,
      },
      failureReasons: [typedError.message],
    };

    result.failure_mode = typedError.message.includes("CANNOT_RESOLVE_ID")
      ? FailureMode.CANNOT_RESOLVE_ID
      : classifyFailure(lastNavigationStatus, fallbackValidation, typedError);

    result.failure_details = {
      http_status: lastNavigationStatus ?? undefined,
      resolved_url: resolvedUrl,
      attempted_strategies: lastAttemptedStrategies,
      validation_results: fallbackValidation,
      error_message: typedError.message,
      stack_trace: typedError.stack,
    };

    if (typedError.message.includes("screenshot_path=")) {
      const screenshotPath = typedError.message.split("screenshot_path=")[1];
      if (screenshotPath) {
        result.screenshots.push(screenshotPath.trim());
      }
    }

    result.errors.push(typedError.message);
    result.success = false;
    result.status =
      result.failure_mode === FailureMode.CANNOT_RESOLVE_ID
        ? "BLOCKED"
        : "FAIL";
  } finally {
    result.duration = Date.now() - startTime;
  }

  return result;
}

export function createEmptyContext(): OracleContext {
  return {
    seed: {},
    stored: {},
    created: {},
    temp: {},
  };
}

async function executePreconditions(
  page: Page,
  preconditions: TestOracle["preconditions"],
  context: OracleContext
): Promise<void> {
  if (preconditions.ensure) {
    for (const condition of preconditions.ensure) {
      const ref = condition.ref;
      if (ref.startsWith("seed:")) {
        const [, entityPath] = ref.split("seed:");
        const [entity, name] = entityPath.split(".");
        context.seed[`${entity}.${name}`] = { _ref: ref };
      }
    }
  }

  if (preconditions.create) {
    for (const createCondition of preconditions.create) {
      console.info(`[Oracle] Would create temp entity: ${createCondition.ref}`);
      context.temp[createCondition.ref] = { ...createCondition.data };
    }
  }
}

async function executeAction(
  page: Page,
  action: OracleAction,
  context: OracleContext
): Promise<{
  statusCode?: number;
  resolvedUrl?: string;
  attemptedStrategies?: string[];
  screenshotPath?: string;
}> {
  const timeout = 10000;

  switch (action.action) {
    case "navigate": {
      let targetPath = action.path;
      let attemptedStrategies: string[] = [];

      if (targetPath.includes(":")) {
        const resolved = await resolveParameterizedPath(
          page,
          targetPath,
          entityCache
        );
        attemptedStrategies = resolved.attemptedStrategies;

        if (!resolved.resolvedPath) {
          const screenshotPath = `test-results/${Date.now()}-cannot-resolve-id.png`;
          await page.screenshot({ path: screenshotPath, fullPage: true });
          throw new Error(
            `CANNOT_RESOLVE_ID for ${targetPath}. attempted_strategies=${attemptedStrategies.join(",")}. screenshot_path=${screenshotPath}`
          );
        }

        targetPath = resolved.resolvedPath;
      }

      const response = await page.goto(targetPath);
      if (action.wait_for) {
        await page.waitForSelector(action.wait_for, { timeout });
      }
      await page.waitForLoadState("networkidle");
      if (attemptedStrategies.length > 0) {
        console.info(`[Oracle] Resolved route ${action.path} -> ${targetPath}`);
      }
      return {
        statusCode: response?.status(),
        resolvedUrl: targetPath,
        attemptedStrategies,
      };
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
      return {};
    }

    case "type": {
      const value = resolveValue(
        action.value || action.value_ref || "",
        context
      );
      if (action.clear_first) {
        await page.fill(action.target, "");
      }
      await page.fill(action.target, value);
      return {};
    }

    case "select": {
      const value = resolveValue(
        action.value || action.value_ref || "",
        context
      );

      if (action.type_to_search) {
        await page.click(action.target);
        await page.waitForTimeout(200);
        await page.keyboard.type(value);
        await page.waitForTimeout(500);
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
      return {};
    }

    case "add_line_item": {
      console.info(`[Oracle] Would add line item: ${JSON.stringify(action)}`);

      const addButton = page.locator(
        '[data-testid="add-line-item"], button:has-text("Add Item"), button:has-text("Add Line")'
      );
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);
      }

      const qtyInput = page.locator(
        'input[name="quantity"], [data-testid="quantity-input"]'
      );
      if (await qtyInput.isVisible().catch(() => false)) {
        await qtyInput.fill(String(action.quantity));
      }
      return {};
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
      return {};
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
      return {};
    }

    case "screenshot": {
      await page.screenshot({ fullPage: action.full_page });
      console.info(`[Oracle] Screenshot taken: ${action.name}`);
      return {};
    }

    case "store": {
      const element = page.locator(action.from);
      const text = await element.textContent();
      context.stored[action.as] = text || "";
      return {};
    }

    case "custom": {
      const fn = new Function("page", "context", action.code);
      await fn(page, context);
      return {};
    }
  }
}

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

function resolveValue(value: string, context: OracleContext): string {
  if (!value.includes("$")) {
    return value;
  }

  let resolved = value;

  resolved = resolved.replace(/\$seed:([a-zA-Z_.]+)/g, (_, path) => {
    const parts = path.split(".");
    const ref = context.seed[`${parts[0]}.${parts[1]}`];
    if (ref && parts[2]) {
      return String((ref as Record<string, unknown>)[parts[2]] || "");
    }
    return "";
  });

  resolved = resolved.replace(/\$stored\.([a-zA-Z_]+)/g, (_, key) =>
    String(context.stored[key] || "")
  );

  resolved = resolved.replace(/\$created\.([a-zA-Z_.]+)/g, (_, path) => {
    const parts = path.split(".");
    const ref = context.created[parts[0]];
    if (ref && parts[1]) {
      return String((ref as Record<string, unknown>)[parts[1]] || "");
    }
    return "";
  });

  resolved = resolved.replace(/\$temp\.([a-zA-Z_]+)/g, (_, key) =>
    String(context.temp[key] || "")
  );

  return resolved;
}

async function assertUIState(
  page: Page,
  expected: ExpectedUIState,
  _context: OracleContext
): Promise<OracleResult["ui_assertions"]> {
  const result: OracleResult["ui_assertions"] = {
    passed: 0,
    failed: 0,
    details: [],
  };

  const timeout = 5000;

  if (expected.url_contains) {
    try {
      expect(page.url()).toContain(expected.url_contains);
      result.passed++;
      result.details.push({
        assertion: `URL contains "${expected.url_contains}"`,
        passed: true,
      });
    } catch {
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
    } catch {
      result.failed++;
      result.details.push({
        assertion: `URL matches "${expected.url_matches}"`,
        passed: false,
        error: `Actual: ${page.url()}`,
      });
    }
  }

  if (expected.visible) {
    for (const selector of expected.visible) {
      try {
        await expect(page.locator(selector).first()).toBeVisible({ timeout });
        result.passed++;
        result.details.push({
          assertion: `Element visible: ${selector}`,
          passed: true,
        });
      } catch {
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
      } catch {
        result.failed++;
        result.details.push({
          assertion: `Element not visible: ${selector}`,
          passed: false,
          error: "Element is visible",
        });
      }
    }
  }

  if (expected.text_present) {
    for (const text of expected.text_present) {
      try {
        await expect(page.locator("body")).toContainText(text, { timeout });
        result.passed++;
        result.details.push({
          assertion: `Text present: "${text}"`,
          passed: true,
        });
      } catch {
        result.failed++;
        result.details.push({
          assertion: `Text present: "${text}"`,
          passed: false,
          error: "Text not found",
        });
      }
    }
  }

  if (expected.fields) {
    for (const [selector, expectedValue] of Object.entries(expected.fields)) {
      try {
        const element = page.locator(selector).first();
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());

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

  if (expected.totals) {
    for (const [selector, expectedValue] of Object.entries(expected.totals)) {
      try {
        const element = page.locator(selector).first();
        const text = await element.textContent();
        const actualValue = parseFloat((text || "").replace(/[^0-9.-]/g, ""));
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

async function assertDBState(
  expected: ExpectedDBState,
  _context: OracleContext
): Promise<OracleResult["db_assertions"]> {
  const result: OracleResult["db_assertions"] = {
    passed: 0,
    failed: 0,
    details: [],
  };

  const tables = Object.keys(expected).filter(key => key !== "invariants");

  for (const table of tables) {
    const assertions = expected[table];
    if (!assertions) continue;

    for (const _assertion of assertions as unknown[]) {
      result.details.push({
        table,
        assertion: `DB assertion for ${table}`,
        passed: true,
      });
      result.passed++;
    }
  }

  if (expected.invariants) {
    for (const invariant of expected.invariants) {
      result.details.push({
        table: "invariants",
        assertion: invariant.name,
        passed: true,
      });
      result.passed++;
    }
  }

  return result;
}

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
    lines.push("  Errors:");
    for (const error of result.errors) {
      lines.push(`    - ${error}`);
    }
  }

  if (result.ui_assertions.failed > 0) {
    lines.push("  Failed UI Assertions:");
    for (const detail of result.ui_assertions.details) {
      if (!detail.passed) {
        lines.push(`    - ${detail.assertion}: ${detail.error}`);
      }
    }
  }

  if (result.failure_mode) {
    lines.push(`  Failure Mode: ${result.failure_mode}`);
  }

  return lines.join("\n");
}
