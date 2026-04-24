/**
 * Chain Executor
 *
 * Executes test chains (multi-phase business process workflows) sequentially,
 * passing context between phases. Reuses action execution patterns from the
 * oracle executor.
 */

import { type Page } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import type {
  OracleContext,
  OracleAction,
  NavigateAction,
  ClickAction,
  TypeAction,
  SelectAction,
  AddLineItemAction,
  CustomAction,
  AssertAction,
  WaitAction,
  ScreenshotAction,
  StoreAction,
} from "../oracles/types";
import type { ChainPhase, ChainResult, PhaseResult, TestChain } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PHASE_TIMEOUT_MS = 60_000;
const NETWORK_IDLE_TIMEOUT_MS = Number(
  process.env.ORACLE_NETWORK_IDLE_TIMEOUT_MS || 5000
);
const DEFAULT_ACTION_TIMEOUT_MS = Number(
  process.env.ORACLE_ACTION_TIMEOUT_MS || 15000
);
function getBaseUrl(): string {
  return (
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.MEGA_QA_BASE_URL ||
    "http://localhost:5173"
  );
}

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

export function createChainContext(): OracleContext {
  return {
    seed: {},
    stored: {},
    created: {},
    temp: {},
  };
}

// ---------------------------------------------------------------------------
// Template resolution
// ---------------------------------------------------------------------------

/**
 * Resolve $ctx.keyName variables from chain context stored values.
 * Also supports the oracle-style {{ stored:key }} syntax.
 */
function resolveTemplateString(value: string, context: OracleContext): string {
  if (!value) return value;

  // Built-in template variables
  let resolved = value
    .replace("{{timestamp}}", Date.now().toString())
    .replace("{{date}}", new Date().toISOString().split("T")[0])
    .replace("{{random}}", Math.random().toString(36).substring(7));

  // $ctx.key → context.stored[key]
  resolved = resolved.replace(/\$ctx\.([a-zA-Z0-9_.-]+)/g, (_, key: string) => {
    const stored = context.stored[key];
    return stored !== undefined && stored !== null ? String(stored) : "";
  });

  // {{ stored:key }} oracle-style
  resolved = resolved.replace(/{{\s*stored:([^}]+)\s*}}/g, (_, key: string) => {
    const stored = context.stored[key.trim()];
    return stored !== undefined && stored !== null ? String(stored) : "";
  });

  // {{ seed:entity.name.field }}
  resolved = resolved.replace(/{{\s*seed:([^}]+)\s*}}/g, (_, path: string) => {
    const parts = path.trim().split(".");
    if (parts.length < 2) return "";
    const entityKey = `${parts[0]}.${parts[1]}`;
    const record = context.seed[entityKey] as
      | Record<string, unknown>
      | undefined;
    if (!record) return "";
    if (parts.length === 2) return JSON.stringify(record);
    const field = parts.slice(2).join(".");
    const directVal = record[field];
    return directVal !== undefined && directVal !== null
      ? String(directVal)
      : "";
  });

  return resolved;
}

// ---------------------------------------------------------------------------
// Selector utilities (ported from oracle executor)
// ---------------------------------------------------------------------------

function normalizeSelectorSyntax(selector: string): string {
  return selector
    .replace(/:contains\((["'])(.*?)\1\)/g, ':has-text("$2")')
    .replace(/\[([a-zA-Z0-9_-]+)=['"]\s*['"]\]/g, "[$1]")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function resolveSelector(rawSelector: string, context: OracleContext): string {
  return normalizeSelectorSyntax(resolveTemplateString(rawSelector, context));
}

async function safeWaitForNetworkIdle(page: Page): Promise<void> {
  await page
    .waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT_MS })
    .catch(() => undefined);
}

async function neutralizeOverlays(page: Page): Promise<void> {
  await page
    .evaluate(() => {
      const selectors = [
        "#manus-previewer-root",
        "[data-manus-selector-input='true']",
        "#manus-cursor-root",
      ];
      for (const sel of selectors) {
        for (const node of Array.from(document.querySelectorAll(sel))) {
          if (node instanceof HTMLElement) {
            node.style.pointerEvents = "none";
          }
        }
      }
    })
    .catch(() => undefined);
}

async function clickWithFallback(
  page: Page,
  selector: string,
  timeout: number
): Promise<void> {
  await neutralizeOverlays(page);
  const locator = page.locator(selector).first();
  try {
    await locator.click({ timeout });
    return;
  } catch (initialError) {
    const message =
      initialError instanceof Error
        ? initialError.message
        : String(initialError);
    const retryable =
      /intercepts pointer events|did not receive pointer events|Timeout|not visible|not stable/i.test(
        message
      );

    if (!retryable) throw initialError;

    await neutralizeOverlays(page);
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(100);

    try {
      await locator.click({ timeout, force: true });
      return;
    } catch {
      const domClicked = await locator
        .evaluate(el => {
          if (!(el instanceof HTMLElement)) return false;
          el.click();
          return true;
        })
        .catch(() => false);

      if (!domClicked) throw initialError;
    }
  }
}

async function findVisibleCandidate(
  page: Page,
  candidates: string[]
): Promise<string | undefined> {
  for (const candidate of candidates) {
    const visible = await page
      .locator(candidate)
      .first()
      .isVisible()
      .catch(() => false);
    if (visible) return candidate;
  }
  return undefined;
}

async function waitForVisibleCandidate(
  page: Page,
  candidates: string[],
  timeout: number
): Promise<string | undefined> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const found = await findVisibleCandidate(page, candidates);
    if (found) return found;
    await page.waitForTimeout(150);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Action execution
// ---------------------------------------------------------------------------

interface ActionResult {
  screenshotPath?: string;
}

async function executeNavigate(
  page: Page,
  action: NavigateAction,
  context: OracleContext,
  timeout: number
): Promise<ActionResult> {
  const path = resolveTemplateString(action.path, context);
  const url = path.startsWith("http") ? path : `${getBaseUrl()}${path}`;

  await page.goto(url, { waitUntil: "domcontentloaded", timeout });

  if (action.wait_for) {
    const selector = resolveSelector(action.wait_for, context);
    await page.waitForSelector(selector, { timeout }).catch(() => undefined);
  }

  await safeWaitForNetworkIdle(page);
  return {};
}

async function executeClick(
  page: Page,
  action: ClickAction,
  context: OracleContext,
  timeout: number
): Promise<ActionResult> {
  if (action.target) {
    const selector = resolveSelector(action.target, context);
    const candidates = [selector];

    const found =
      (await findVisibleCandidate(page, candidates)) ||
      (await waitForVisibleCandidate(page, candidates, timeout));

    if (!found) {
      throw new Error(
        `Click target not found or not visible: ${action.target}`
      );
    }

    await clickWithFallback(page, found, timeout);
  } else if (action.target_text) {
    const text = resolveTemplateString(action.target_text, context);
    const candidates = [
      `text="${text}"`,
      `button:has-text("${text}")`,
      `a:has-text("${text}")`,
      `[role="button"]:has-text("${text}")`,
    ];

    const found =
      (await findVisibleCandidate(page, candidates)) ||
      (await waitForVisibleCandidate(page, candidates, timeout));

    if (!found) {
      throw new Error(`Click target_text not found: ${action.target_text}`);
    }

    await clickWithFallback(page, found, timeout);
  }

  if (action.wait_after) {
    await page.waitForTimeout(action.wait_after);
  }

  if (action.wait_for) {
    const waitSelector = resolveSelector(action.wait_for, context);
    await page
      .waitForSelector(waitSelector, { timeout })
      .catch(() => undefined);
  }

  if (action.wait_for_navigation) {
    await page.waitForNavigation({ timeout }).catch(() => undefined);
  }

  return {};
}

async function executeType(
  page: Page,
  action: TypeAction,
  context: OracleContext,
  timeout: number
): Promise<ActionResult> {
  const selector = resolveSelector(action.target, context);
  const value = action.value_ref
    ? resolveTemplateString(`$ctx.${action.value_ref}`, context)
    : resolveTemplateString(action.value ?? "", context);

  const locator = page.locator(selector).first();

  await locator.waitFor({ state: "visible", timeout }).catch(() => undefined);

  if (action.clear_first) {
    await locator.clear().catch(() => undefined);
  }

  await locator.fill(value, { timeout });
  return {};
}

async function executeSelect(
  page: Page,
  action: SelectAction,
  context: OracleContext,
  timeout: number
): Promise<ActionResult> {
  const selector = resolveSelector(action.target, context);
  const value = action.value_ref
    ? resolveTemplateString(`$ctx.${action.value_ref}`, context)
    : resolveTemplateString(action.value ?? "", context);

  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout }).catch(() => undefined);

  // Try native select first
  const isNativeSelect = await locator
    .evaluate(el => {
      if (el.tagName.toLowerCase() !== "select") return false;
      const style = window.getComputedStyle(el);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        el.getAttribute("aria-hidden") !== "true"
      );
    })
    .catch(() => false);

  if (isNativeSelect) {
    await locator.selectOption(action.option_value ?? value, { timeout });
    return {};
  }

  // Combobox / custom select
  const expanded = await locator
    .getAttribute("aria-expanded")
    .catch(() => null);
  if (expanded !== "true") {
    await locator.click({ timeout }).catch(() => undefined);
  }
  await page.waitForTimeout(150);

  if (action.type_to_search && value) {
    await page.keyboard.type(value, { delay: 20 }).catch(() => undefined);
    await page.waitForTimeout(150);
  }

  const optionGroups = [
    page.locator("[role='option']"),
    page.locator("[data-slot='select-item']"),
    page.locator("[data-radix-collection-item]"),
    page.locator("li[role='option']"),
    page.locator("[cmdk-item]"),
  ];

  if (action.option_index !== undefined && action.option_index >= 0) {
    for (const group of optionGroups) {
      const count = await group.count().catch(() => 0);
      if (count === 0) continue;
      const idx = Math.min(action.option_index, count - 1);
      const candidate = group.nth(idx);
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
        await candidate.click({ timeout });
        return {};
      }
    }
  }

  const normalized = value.trim().toLowerCase();
  if (normalized) {
    for (const group of optionGroups) {
      const count = await group.count().catch(() => 0);
      if (count === 0) continue;
      for (let i = 0; i < Math.min(count, 80); i++) {
        const candidate = group.nth(i);
        if (!(await candidate.isVisible().catch(() => false))) continue;
        const text = (
          (await candidate.innerText().catch(() => "")) ||
          (await candidate.textContent().catch(() => "")) ||
          ""
        )
          .trim()
          .toLowerCase();
        if (
          text === normalized ||
          text.includes(normalized) ||
          normalized.includes(text)
        ) {
          await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
          await candidate.click({ timeout });
          return {};
        }
      }
    }
  }

  await page.keyboard.press("Enter").catch(() => undefined);
  return {};
}

async function executeAssert(
  page: Page,
  action: AssertAction,
  context: OracleContext,
  timeout: number
): Promise<ActionResult> {
  if (action.visible) {
    const selector = resolveSelector(action.visible, context);
    const visible = await page
      .locator(selector)
      .first()
      .isVisible()
      .catch(() => false);
    if (!visible) {
      // Wait briefly before failing
      await page
        .waitForSelector(selector, { timeout: Math.min(timeout, 5000) })
        .catch(() => {
          throw new Error(
            `Assert failed: expected "${action.visible}" to be visible`
          );
        });
    }
  }

  if (action.not_visible) {
    const selector = resolveSelector(action.not_visible, context);
    const visible = await page
      .locator(selector)
      .first()
      .isVisible()
      .catch(() => false);
    if (visible) {
      throw new Error(
        `Assert failed: expected "${action.not_visible}" to NOT be visible`
      );
    }
  }

  if (action.text_contains) {
    const text = resolveTemplateString(action.text_contains, context);
    const bodyText = (
      (await page.locator("body").textContent()) || ""
    ).toLowerCase();
    if (!bodyText.includes(text.toLowerCase())) {
      throw new Error(
        `Assert failed: page does not contain text "${action.text_contains}"`
      );
    }
  }

  if (action.value_equals) {
    const selector = resolveSelector(action.value_equals.target, context);
    const expected = resolveTemplateString(action.value_equals.value, context);
    const actual = await page
      .locator(selector)
      .first()
      .inputValue()
      .catch(async () =>
        page
          .locator(selector)
          .first()
          .textContent()
          .catch(() => "")
      );
    if (String(actual).trim() !== expected.trim()) {
      throw new Error(
        `Assert failed: expected value "${expected}" but got "${actual}"`
      );
    }
  }

  return {};
}

async function executeWait(
  page: Page,
  action: WaitAction,
  context: OracleContext,
  timeout: number
): Promise<ActionResult> {
  if (action.network_idle) {
    await safeWaitForNetworkIdle(page);
  }

  if (action.for) {
    const selector = resolveSelector(action.for, context);
    await page
      .waitForSelector(selector, { timeout: action.timeout ?? timeout })
      .catch(() => undefined);
  }

  if (action.duration) {
    await page.waitForTimeout(action.duration);
  }

  return {};
}

async function executeScreenshot(
  page: Page,
  action: ScreenshotAction,
  context: OracleContext
): Promise<ActionResult> {
  const name = resolveTemplateString(action.name, context);
  const path = `test-results/chain-screenshots/${name}-${Date.now()}.png`;

  await page
    .screenshot({ path, fullPage: action.full_page ?? false })
    .catch(err => {
      console.warn(`[ChainExecutor] Screenshot failed for "${name}":`, err);
    });

  return { screenshotPath: path };
}

async function executeStore(
  page: Page,
  action: StoreAction,
  context: OracleContext
): Promise<ActionResult> {
  const selector = resolveSelector(action.from, context);
  const locator = page.locator(selector).first();

  const value =
    (await locator.inputValue().catch(() => null)) ??
    (await locator.textContent().catch(() => null)) ??
    (await locator.getAttribute("value").catch(() => null)) ??
    "";

  context.stored[action.as] = value;
  return {};
}

// ---------------------------------------------------------------------------
// Add Line Item — domain-specific order line item interaction
// ---------------------------------------------------------------------------

async function executeAddLineItem(
  page: Page,
  action: AddLineItemAction,
  context: OracleContext,
  timeout: number
): Promise<ActionResult> {
  // Step 1: Click the "Add Item" button to open batch/product selection
  const addItemCandidates = [
    'button:has-text("Add Item")',
    'button:has-text("Add Line")',
    '[data-testid="add-line-item"]',
    '[data-testid="add-item"]',
    'button:has-text("+")',
  ];

  const addBtn = await waitForVisibleCandidate(
    page,
    addItemCandidates,
    timeout
  );
  if (!addBtn) {
    throw new Error('add_line_item: Could not find "Add Item" button on page');
  }
  await clickWithFallback(page, addBtn, timeout);
  await page.waitForTimeout(300); // Wait for dialog/row to appear

  // Step 2: If a batch selection dialog opens, select a batch
  const dialogVisible = await page
    .locator(
      '[role="dialog"], [data-testid*="batch-select"], [data-testid*="product-select"]'
    )
    .first()
    .isVisible()
    .catch(() => false);

  if (dialogVisible) {
    // Type to search for batch/product if ref provided
    const searchRef = action.batch_ref
      ? resolveTemplateString(action.batch_ref, context)
      : action.product_ref
        ? resolveTemplateString(action.product_ref, context)
        : "";

    if (searchRef) {
      const searchInput = page
        .locator(
          '[role="dialog"] input[type="search"], [role="dialog"] input[placeholder*="search" i], [role="dialog"] input'
        )
        .first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill(searchRef, { timeout });
        await page.waitForTimeout(300);
      }
    }

    // Click first available option/row
    const optionCandidates = [
      '[role="dialog"] [role="option"]:first-child',
      '[role="dialog"] table tbody tr:first-child',
      '[role="dialog"] [data-testid*="row"]:first-child',
      '[role="dialog"] li:first-child',
    ];
    const option = await waitForVisibleCandidate(
      page,
      optionCandidates,
      timeout
    );
    if (option) {
      await clickWithFallback(page, option, timeout);
      await page.waitForTimeout(200);
    }

    // Close dialog if still open (some dialogs auto-close on selection)
    const confirmBtn = await findVisibleCandidate(page, [
      '[role="dialog"] button:has-text("Add")',
      '[role="dialog"] button:has-text("Select")',
      '[role="dialog"] button:has-text("Confirm")',
      '[role="dialog"] button[type="submit"]',
    ]);
    if (confirmBtn) {
      await clickWithFallback(page, confirmBtn, timeout);
      await page.waitForTimeout(200);
    }
  }

  // Step 3: Fill quantity in the newest (last) line item row
  if (action.quantity) {
    const qtyInputCandidates = [
      'input[name="quantity"]:last-of-type',
      '[data-testid*="quantity"]:last-of-type',
      'table tbody tr:last-child input[name="quantity"]',
      'table tbody tr:last-child input[type="number"]',
      "table tbody tr:last-child input",
    ];
    const qtyInput = await waitForVisibleCandidate(
      page,
      qtyInputCandidates,
      timeout
    );
    if (qtyInput) {
      const locator = page.locator(qtyInput).first();
      await locator.clear().catch(() => undefined);
      await locator.fill(String(action.quantity), { timeout });
    }
  }

  // Step 4: Fill unit price if provided
  if (action.unit_price !== undefined) {
    const priceInputCandidates = [
      'table tbody tr:last-child input[name*="price" i]',
      'table tbody tr:last-child input[name*="unitPrice" i]',
      'table tbody tr:last-child input[placeholder*="price" i]',
    ];
    const priceInput = await findVisibleCandidate(page, priceInputCandidates);
    if (priceInput) {
      const locator = page.locator(priceInput).first();
      await locator.clear().catch(() => undefined);
      await locator.fill(String(action.unit_price), { timeout });
    }
  }

  await safeWaitForNetworkIdle(page);
  return {};
}

// ---------------------------------------------------------------------------
// Custom action — evaluate JavaScript in page context
// ---------------------------------------------------------------------------

async function executeCustom(
  page: Page,
  action: CustomAction,
  context: OracleContext
): Promise<ActionResult> {
  // Execute the custom code string in the page context
  // The code has access to `document`, `window`, etc.
  // For safety, we wrap in a try-catch and capture any return value
  try {
    const result = await page.evaluate((code: string) => {
      // eslint-disable-next-line no-eval
      return eval(code);
    }, action.code);

    // If the custom code returns a string, store it in context.temp
    if (typeof result === "string" || typeof result === "number") {
      context.temp["custom_result"] = { value: result };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Custom action failed: ${message}`);
  }

  return {};
}

// ---------------------------------------------------------------------------
// Action dispatch
// ---------------------------------------------------------------------------

async function executeAction(
  page: Page,
  action: OracleAction,
  context: OracleContext,
  timeout: number
): Promise<ActionResult> {
  switch (action.action) {
    case "navigate":
      return executeNavigate(page, action, context, timeout);
    case "click":
      return executeClick(page, action, context, timeout);
    case "type":
      return executeType(page, action, context, timeout);
    case "select":
      return executeSelect(page, action, context, timeout);
    case "assert":
      return executeAssert(page, action, context, timeout);
    case "wait":
      return executeWait(page, action, context, timeout);
    case "screenshot":
      return executeScreenshot(page, action, context);
    case "store":
      return executeStore(page, action, context);
    case "add_line_item":
      return executeAddLineItem(page, action, context, timeout);
    case "custom":
      return executeCustom(page, action, context);
    default: {
      const exhaustiveCheck: never = action;
      console.warn(
        `[ChainExecutor] Unknown action type: ${(exhaustiveCheck as OracleAction).action}`
      );
      return {};
    }
  }
}

// ---------------------------------------------------------------------------
// Extract values from page after a phase
// ---------------------------------------------------------------------------

async function extractPhaseValues(
  page: Page,
  phase: ChainPhase,
  context: OracleContext
): Promise<Record<string, unknown>> {
  const extracted: Record<string, unknown> = {};

  if (!phase.extract) return extracted;

  for (const spec of phase.extract) {
    try {
      if (spec.from === "url") {
        const raw = page.url();
        if (spec.pattern) {
          const match = raw.match(new RegExp(spec.pattern));
          extracted[spec.as] = match ? (match[1] ?? match[0]) : raw;
        } else {
          extracted[spec.as] = raw;
        }
        continue;
      }

      if (spec.from.startsWith("text:")) {
        const bodyText =
          (await page
            .locator("body")
            .textContent()
            .catch(() => "")) ?? "";
        if (spec.pattern) {
          const match = bodyText.match(new RegExp(spec.pattern));
          extracted[spec.as] = match ? (match[1] ?? match[0]) : "";
        } else {
          const searchText = spec.from.slice("text:".length);
          extracted[spec.as] = bodyText.includes(searchText) ? searchText : "";
        }
        continue;
      }

      // CSS selector
      const selector = resolveSelector(spec.from, context);
      const locator = page.locator(selector).first();
      const raw =
        (await locator.inputValue().catch(() => null)) ??
        (await locator.textContent().catch(() => null)) ??
        (await locator.getAttribute("value").catch(() => null)) ??
        "";

      if (spec.pattern && raw) {
        const match = String(raw).match(new RegExp(spec.pattern));
        extracted[spec.as] = match ? (match[1] ?? match[0]) : raw;
      } else {
        extracted[spec.as] = raw;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[ChainExecutor] Extract failed for key "${spec.as}": ${message}`
      );
      extracted[spec.as] = "";
    }
  }

  return extracted;
}

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

type FailureType = "test_infra" | "app_bug" | "data_issue" | "network";

function classifyError(error: unknown, pageUrl: string): FailureType {
  const message = error instanceof Error ? error.message : String(error);

  // Network-level failures
  if (
    /ERR_TIMED_OUT|net::ERR_|Navigation timeout|ERR_CONNECTION_REFUSED/i.test(
      message
    )
  ) {
    return "network";
  }

  // Redirected to login — session expired
  if (pageUrl.includes("/login") || pageUrl.includes("/sign-in")) {
    return "test_infra";
  }

  // Selector not found at all in DOM → our selectors are wrong
  if (
    /Selector not found or not visible|not found or not visible/i.test(message)
  ) {
    return "test_infra";
  }

  // Data not present (empty state, 404-like)
  if (
    /CANNOT_RESOLVE_ID|Empty-state detected|not found.*live data/i.test(message)
  ) {
    return "data_issue";
  }

  // Click/assertion on visible content → app bug
  if (
    /Assert failed|expected.*to be visible|expected.*to NOT be visible|page does not contain/i.test(
      message
    )
  ) {
    return "app_bug";
  }

  // Default: if page loaded but action failed, classify as app_bug
  return "app_bug";
}

// ---------------------------------------------------------------------------
// Phase executor
// ---------------------------------------------------------------------------

/**
 * Execute a single chain phase.
 */
export async function executePhase(
  page: Page,
  phase: ChainPhase,
  context: OracleContext
): Promise<PhaseResult> {
  const startTime = Date.now();
  const _phaseTimeout = phase.timeout ?? DEFAULT_PHASE_TIMEOUT_MS;
  const result: PhaseResult = {
    phase_id: phase.phase_id,
    success: false,
    duration_ms: 0,
    steps_completed: 0,
    total_steps: phase.steps.length,
    extracted_values: {},
    errors: [],
    screenshots: [],
  };

  try {
    for (let i = 0; i < phase.steps.length; i++) {
      const step = phase.steps[i];
      try {
        const stepResult = await executeAction(
          page,
          step,
          context,
          DEFAULT_ACTION_TIMEOUT_MS
        );
        if (stepResult.screenshotPath) {
          result.screenshots.push(stepResult.screenshotPath);
        }
        result.steps_completed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`Step ${i + 1} (${step.action}): ${message}`);
        // Take failure screenshot
        try {
          const failPath = `test-results/chain-screenshots/${phase.phase_id}-step-${i + 1}-fail-${Date.now()}.png`;
          await page.screenshot({ path: failPath, fullPage: false });
          result.screenshots.push(failPath);
        } catch {
          // screenshot itself failed — don't mask the original error
        }

        const failureType = classifyError(err, page.url());
        result.failure_type = failureType;
        result.failure_evidence = message;
        result.duration_ms = Date.now() - startTime;
        return result;
      }
    }

    // Assert expected UI state after all steps
    if (phase.expected_ui) {
      const uiErrors = await assertExpectedUI(page, phase.expected_ui, context);
      if (uiErrors.length > 0) {
        result.errors.push(...uiErrors);
        result.failure_type = "app_bug";
        result.failure_evidence = uiErrors[0];
        result.duration_ms = Date.now() - startTime;
        return result;
      }
    }

    // Extract values for next phase
    const extracted = await extractPhaseValues(page, phase, context);
    result.extracted_values = extracted;
    // Store extracted values in shared context
    for (const [key, val] of Object.entries(extracted)) {
      context.stored[key] = val;
    }

    // Take end-of-phase screenshot if requested
    if (phase.screenshot) {
      const screenshotName = resolveTemplateString(phase.screenshot, context);
      const screenshotPath = `test-results/chain-screenshots/${screenshotName}-${Date.now()}.png`;
      await page
        .screenshot({ path: screenshotPath, fullPage: false })
        .catch(() => undefined);
      result.screenshots.push(screenshotPath);
    }

    // Wait for network idle between phases
    await safeWaitForNetworkIdle(page);

    result.success = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(message);
    result.failure_type = classifyError(err, page.url());
    result.failure_evidence = message;

    try {
      const failPath = `test-results/chain-screenshots/${phase.phase_id}-unhandled-fail-${Date.now()}.png`;
      await page.screenshot({ path: failPath, fullPage: false });
      result.screenshots.push(failPath);
    } catch {
      // ignore screenshot failure
    }
  } finally {
    result.duration_ms = Date.now() - startTime;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Expected UI assertion
// ---------------------------------------------------------------------------

async function assertExpectedUI(
  page: Page,
  expected: NonNullable<ChainPhase["expected_ui"]>,
  context: OracleContext
): Promise<string[]> {
  const errors: string[] = [];

  if (expected.url_contains) {
    const currentUrl = page.url();
    const needle = resolveTemplateString(expected.url_contains, context);
    if (!currentUrl.includes(needle)) {
      errors.push(`Expected URL to contain "${needle}", got "${currentUrl}"`);
    }
  }

  if (expected.url_matches) {
    const currentUrl = page.url();
    const pattern = resolveTemplateString(expected.url_matches, context);
    if (!new RegExp(pattern).test(currentUrl)) {
      errors.push(
        `Expected URL to match "${expected.url_matches}", got "${currentUrl}"`
      );
    }
  }

  if (expected.url_equals) {
    const currentUrl = page.url();
    const expected_url = resolveTemplateString(expected.url_equals, context);
    if (currentUrl !== expected_url) {
      errors.push(
        `Expected URL to equal "${expected_url}", got "${currentUrl}"`
      );
    }
  }

  if (expected.visible) {
    for (const selector of expected.visible) {
      const resolved = resolveSelector(selector, context);
      const visible = await page
        .locator(resolved)
        .first()
        .isVisible()
        .catch(() => false);
      if (!visible) {
        errors.push(`Expected "${selector}" to be visible`);
      }
    }
  }

  if (expected.not_visible) {
    for (const selector of expected.not_visible) {
      const resolved = resolveSelector(selector, context);
      const visible = await page
        .locator(resolved)
        .first()
        .isVisible()
        .catch(() => false);
      if (visible) {
        errors.push(`Expected "${selector}" to NOT be visible`);
      }
    }
  }

  if (expected.text_present) {
    const bodyText = (
      (await page
        .locator("body")
        .textContent()
        .catch(() => "")) ?? ""
    ).toLowerCase();
    for (const text of expected.text_present) {
      const needle = resolveTemplateString(text, context).toLowerCase();
      if (!bodyText.includes(needle)) {
        errors.push(`Expected page to contain text "${text}"`);
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Precondition setup — seed test data before chain execution
// ---------------------------------------------------------------------------

/**
 * Resolve chain preconditions by navigating to relevant pages and verifying
 * required entities exist. Seeds context with entity references.
 */
async function setupPreconditions(
  page: Page,
  chain: TestChain,
  context: OracleContext
): Promise<string[]> {
  const errors: string[] = [];

  if (!chain.preconditions?.ensure) return errors;

  for (const precondition of chain.preconditions.ensure) {
    const entityKey = `${precondition.entity}.${precondition.ref}`;
    try {
      // Map entity types to pages for verification
      const entityPageMap: Record<string, string> = {
        client: "/clients",
        order: "/sales",
        invoice: "/accounting/invoices",
        batch: "/inventory",
        product: "/products",
        location: "/locations",
        payment: "/accounting/payments",
      };

      const entityPage = entityPageMap[precondition.entity];
      if (entityPage) {
        await page.goto(`${getBaseUrl()}${entityPage}`, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });
        await safeWaitForNetworkIdle(page);

        // Verify at least one entity exists (table has rows)
        const hasData = await page
          .locator("table tbody tr, [data-testid*='row']")
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (hasData) {
          // Store a reference that the entity type exists
          context.seed[entityKey] = {
            exists: true,
            ...precondition.where,
          };
        } else {
          errors.push(
            `Precondition failed: no ${precondition.entity} records found for ref "${precondition.ref}"`
          );
        }
      } else {
        // Unknown entity type — store the reference for chain use
        context.seed[entityKey] = { ...precondition.where };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Precondition setup error for ${entityKey}: ${message}`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Cleanup — soft-delete entities created during chain execution
// ---------------------------------------------------------------------------

/**
 * Best-effort cleanup of entities created during chain execution.
 * Navigates to relevant pages and attempts to delete test-created records.
 */
async function cleanupChainEntities(
  page: Page,
  context: OracleContext
): Promise<void> {
  // Look through stored values for created entity IDs
  const createdEntities = Object.entries(context.created);
  if (createdEntities.length === 0) return;

  for (const [_entityKey, entityData] of createdEntities) {
    try {
      const data = entityData as Record<string, unknown>;
      if (data.deleteUrl && typeof data.deleteUrl === "string") {
        // Navigate to delete URL if provided
        await page.goto(`${getBaseUrl()}${data.deleteUrl}`, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });
        await safeWaitForNetworkIdle(page);
      }
    } catch {
      // Cleanup is best-effort — don't fail the chain for cleanup errors
    }
  }
}

// ---------------------------------------------------------------------------
// Chain executor
// ---------------------------------------------------------------------------

/**
 * Execute an entire chain (all phases sequentially).
 * Shares a single OracleContext across all phases.
 */
export async function executeChain(
  page: Page,
  chain: TestChain,
  context: OracleContext = createChainContext()
): Promise<ChainResult> {
  const startTime = Date.now();
  const result: ChainResult = {
    chain_id: chain.chain_id,
    description: chain.description,
    success: false,
    duration_ms: 0,
    phases: [],
    invariant_results: [],
    tags_covered: [...chain.tags],
    stored_snapshot: {},
  };

  try {
    // Authenticate as admin (single role, full access)
    await loginAsAdmin(page);

    // Setup preconditions — verify required entities exist
    if (chain.preconditions?.ensure) {
      const preconditionErrors = await setupPreconditions(page, chain, context);
      if (preconditionErrors.length > 0) {
        result.phases.push({
          phase_id: "precondition-setup",
          success: false,
          duration_ms: Date.now() - startTime,
          steps_completed: 0,
          total_steps: chain.preconditions.ensure.length,
          extracted_values: {},
          errors: preconditionErrors,
          screenshots: [],
          failure_type: "data_issue",
          failure_evidence: preconditionErrors[0],
        });
        result.failure_type = "data_issue";
        result.duration_ms = Date.now() - startTime;
        return result;
      }
    }

    for (const phase of chain.phases) {
      const phaseResult = await executePhase(page, phase, context);
      result.phases.push(phaseResult);

      if (!phaseResult.success) {
        // Propagate failure type to chain level
        result.failure_type = phaseResult.failure_type;
        result.duration_ms = Date.now() - startTime;
        return result;
      }
    }

    // Check chain-level invariants
    if (chain.invariants) {
      for (const invariant of chain.invariants) {
        const invariantResult = await checkInvariant(page, invariant, context);
        result.invariant_results.push(invariantResult);
      }

      const failedInvariants = result.invariant_results.filter(r => !r.passed);
      if (failedInvariants.length > 0) {
        result.failure_type = "app_bug";
        result.duration_ms = Date.now() - startTime;
        return result;
      }
    }

    result.success = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.failure_type = classifyError(err, page.url());

    // Create a synthetic phase failure entry if no phases ran yet
    if (result.phases.length === 0) {
      result.phases.push({
        phase_id: "chain-setup",
        success: false,
        duration_ms: Date.now() - startTime,
        steps_completed: 0,
        total_steps: 0,
        extracted_values: {},
        errors: [message],
        screenshots: [],
        failure_type: result.failure_type,
        failure_evidence: message,
      });
    }

    console.error(
      `[ChainExecutor] Chain "${chain.chain_id}" failed: ${message}`
    );
  } finally {
    // Best-effort cleanup of created entities
    await cleanupChainEntities(page, context).catch(() => undefined);
    result.stored_snapshot = { ...context.stored };
    result.duration_ms = Date.now() - startTime;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Invariant check
// ---------------------------------------------------------------------------

async function checkInvariant(
  page: Page,
  invariant: NonNullable<TestChain["invariants"]>[number],
  context: OracleContext
): Promise<{ name: string; passed: boolean; error?: string }> {
  try {
    if (invariant.check === "ui" && invariant.page) {
      const path = resolveTemplateString(invariant.page, context);
      const url = path.startsWith("http") ? path : `${getBaseUrl()}${path}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await safeWaitForNetworkIdle(page);

      if (invariant.assertions) {
        const bodyText = (
          (await page
            .locator("body")
            .textContent()
            .catch(() => "")) ?? ""
        ).toLowerCase();
        for (const assertion of invariant.assertions) {
          if (!bodyText.includes(assertion.toLowerCase())) {
            return {
              name: invariant.name,
              passed: false,
              error: `Page invariant: expected to find "${assertion}" on ${path}`,
            };
          }
        }
      }
    }

    return { name: invariant.name, passed: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      name: invariant.name,
      passed: false,
      error: message,
    };
  }
}
