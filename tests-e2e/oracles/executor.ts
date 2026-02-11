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
const DEFAULT_ACTION_TIMEOUT = Number(
  process.env.ORACLE_ACTION_TIMEOUT_MS || 10000
);
const NETWORK_IDLE_TIMEOUT = Number(
  process.env.ORACLE_NETWORK_IDLE_TIMEOUT_MS || 5000
);

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

function randomAlphaNumeric(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function titleCaseWords(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeSelectorSyntax(selector: string): string {
  return selector
    .replace(/:contains\((["'])(.*?)\1\)/g, ':has-text("$2")')
    .replace(/\[([a-zA-Z0-9_-]+)=['"]\s*['"]\]/g, "[$1]")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function parseTemplateContextPath(
  expression: string,
  context: OracleContext
): string {
  const [source, remainder] = expression.split(":", 2);
  if (!remainder) return "";

  if (source === "seed") {
    const parts = remainder.split(".");
    if (parts.length < 2) return "";
    const key = `${parts[0]}.${parts[1]}`;
    const record = context.seed[key] as Record<string, unknown> | undefined;
    if (!record) return "";
    if (parts.length === 2) return JSON.stringify(record);
    const field = parts.slice(2).join(".");
    return String(record[field] ?? "");
  }

  if (source === "stored") {
    return String(context.stored[remainder] ?? "");
  }

  if (source === "created") {
    const parts = remainder.split(".");
    if (parts.length < 1) return "";
    const record = context.created[parts[0]] as
      | Record<string, unknown>
      | undefined;
    if (!record) return "";
    if (parts.length === 1) return JSON.stringify(record);
    return String(record[parts.slice(1).join(".")] ?? "");
  }

  if (source === "temp") {
    const parts = remainder.split(".");
    const record = context.temp[parts[0]] as
      | Record<string, unknown>
      | undefined;
    if (!record) return "";
    if (parts.length === 1) return JSON.stringify(record);
    return String(record[parts.slice(1).join(".")] ?? "");
  }

  return "";
}

function resolveTemplateString(
  value: string,
  context: OracleContext,
  mode: "value" | "selector" = "value"
): string {
  if (!value) return value;

  let resolved = resolveValue(value, context);

  resolved = resolved.replace(/{{\s*([^}]+)\s*}}/g, (_, rawExpr) => {
    const expr = String(rawExpr).trim();

    if (expr === "timestamp") {
      return String(Date.now());
    }

    if (expr.startsWith("random:")) {
      const len = Number(expr.split(":", 2)[1]);
      return randomAlphaNumeric(Number.isFinite(len) && len > 0 ? len : 6);
    }

    return parseTemplateContextPath(expr, context);
  });

  if (mode === "selector") {
    return normalizeSelectorSyntax(resolved);
  }

  return resolved;
}

function resolveTemplateValue(value: unknown, context: OracleContext): unknown {
  if (typeof value === "string") {
    return resolveTemplateString(value, context, "value");
  }
  if (Array.isArray(value)) {
    return value.map(item => resolveTemplateValue(item, context));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = resolveTemplateValue(nested, context);
    }
    return out;
  }
  return value;
}

function splitSelectorList(selector: string): string[] {
  return selector
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);
}

function buildSelectorCandidates(
  rawSelector: string,
  context: OracleContext
): string[] {
  const resolvedRaw = resolveTemplateString(rawSelector, context, "selector");
  const candidates = new Set<string>();

  for (const selector of splitSelectorList(resolvedRaw)) {
    const normalized = normalizeSelectorSyntax(selector);
    if (!normalized) continue;
    candidates.add(normalized);

    const dataTestIdMatch = normalized.match(
      /\[data-testid=['"]([^'"]+)['"]\]/
    );
    if (!dataTestIdMatch) continue;

    const dataTestId = dataTestIdMatch[1];
    const normalizedWords = dataTestId
      .replace(/[-_](btn|button)$/i, "")
      .replace(/[-_](list|table)$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();

    if (/(btn|button)$/i.test(dataTestId) && normalizedWords) {
      const label = titleCaseWords(normalizedWords);
      candidates.add(`button:has-text("${label}")`);
      candidates.add(`a:has-text("${label}")`);

      if (normalizedWords.toLowerCase().startsWith("create ")) {
        const addLabel = label.replace(/^Create /, "Add ");
        candidates.add(`button:has-text("${addLabel}")`);
        candidates.add(`a:has-text("${addLabel}")`);
      }

      if (normalizedWords.toLowerCase().startsWith("new ")) {
        const addLabel = label.replace(/^New /, "Add ");
        candidates.add(`button:has-text("${addLabel}")`);
        candidates.add(`a:has-text("${addLabel}")`);
      }
    }

    if (/(list|table)$/i.test(dataTestId)) {
      candidates.add("table");
      candidates.add("[role='table']");
    }

    if (/form/i.test(dataTestId)) {
      candidates.add("form");
      candidates.add("[role='dialog']");
      candidates.add("[role='dialog'] form");
      candidates.add("main form");
    }

    if (/client-form/i.test(dataTestId)) {
      candidates.add("[role='dialog']");
      candidates.add("[role='dialog']:has-text('Add New Client')");
    }

    if (/batch-form|intake-form/i.test(dataTestId)) {
      candidates.add("[role='dialog']");
      candidates.add("[role='dialog']:has-text('New Product Intake')");
    }

    if (/search/i.test(dataTestId)) {
      candidates.add('input[type="search"]');
      candidates.add('input[placeholder*="search" i]');
      candidates.add('input[aria-label*="search" i]');
    }

    if (/row/i.test(dataTestId)) {
      candidates.add("table tbody tr");
      candidates.add("tbody tr");
      candidates.add("tr");
      candidates.add("[role='row']");
      candidates.add("table tr");
    }

    if (/select|dropdown|filter/i.test(dataTestId)) {
      candidates.add("select");
      candidates.add("[role='combobox']");
      candidates.add("input[role='combobox']");
      candidates.add("[data-testid*='select']");
      candidates.add("[data-testid*='dropdown']");
      if (/client/i.test(dataTestId)) {
        candidates.add("input[placeholder*='client' i]");
        candidates.add("[aria-label*='client' i]");
      }
    }

    if (/business-type/i.test(dataTestId)) {
      candidates.add("#businessType");
      candidates.add("[role='dialog'] #businessType");
      candidates.add("[role='dialog'] [role='combobox']");
    }

    if (/preferred-contact/i.test(dataTestId)) {
      candidates.add("#preferredContact");
      candidates.add("[role='dialog'] #preferredContact");
    }

    if (/save-client|create-client/i.test(dataTestId)) {
      candidates.add("button:has-text('Create Client')");
      candidates.add("button:has-text('Next')");
      candidates.add("[role='dialog'] button:has-text('Create Client')");
    }

    if (/buyer|seller|brand|referee|contractor/i.test(dataTestId)) {
      candidates.add("button:has-text('Buyer')");
      candidates.add("button:has-text('Seller')");
      candidates.add("button:has-text('Brand')");
      candidates.add("button:has-text('Referee')");
      candidates.add("button:has-text('Contractor')");
      candidates.add('text="Buyer"');
      candidates.add('text="Seller"');
      candidates.add('text="Brand"');
      candidates.add('text="Referee"');
      candidates.add('text="Contractor"');
    }

    if (/check-overdue|run-overdue-check/i.test(dataTestId)) {
      candidates.add("button:has-text('Check Overdue')");
      candidates.add("button:has-text('Show AR Aging')");
      candidates.add("button:has-text('Refresh')");
    }

    if (/mark-sent/i.test(dataTestId)) {
      candidates.add("button:has-text('Mark Sent')");
      candidates.add("button:has-text('Send Payment Reminder')");
      candidates.add("button:has-text('Mark as Paid (Full)')");
    }

    if (/void-invoice|void-option/i.test(dataTestId)) {
      candidates.add("button:has-text('Void Invoice')");
      candidates.add("[role='dialog'] button:has-text('Void Invoice')");
      candidates.add("[role='dialog'] button:has-text('Confirm')");
      candidates.add("button:has-text('Void')");
    }

    if (/cogs/i.test(dataTestId)) {
      candidates.add("#unitCogs");
      candidates.add("input[id*='cogs' i]");
      candidates.add("input[placeholder*='unit cost' i]");
      candidates.add("input[placeholder*='cogs' i]");
      candidates.add("[role='dialog'] #unitCogs");
    }

    if (/add-line-item|add-item/i.test(dataTestId)) {
      candidates.add("button:has-text('Add Item')");
      candidates.add("button:has-text('Add Line Item')");
      candidates.add("button:has-text('Add Product')");
    }

    if (/transactions-tab/i.test(dataTestId)) {
      candidates.add("[role='tab']:has-text('Transactions')");
      candidates.add("button[role='tab']:has-text('Transactions')");
    }

    if (/transactions-list/i.test(dataTestId)) {
      candidates.add("[role='tabpanel']");
      candidates.add("table");
      candidates.add("[role='main']");
    }

    if (/success|toast|message/i.test(dataTestId)) {
      candidates.add("[role='status']");
      candidates.add("[data-sonner-toast]");
      candidates.add("[class*='toast']");
      candidates.add("[class*='success']");
    }

    if (/detail/i.test(dataTestId)) {
      candidates.add("[role='dialog']");
      candidates.add("[role='complementary']");
      candidates.add("aside[role='complementary']");
      candidates.add("aside");
      candidates.add("[data-testid*='detail']");
      candidates.add(".detail");
      candidates.add(".details");
    }

    const fuzzyId = dataTestId
      .replace(/[-_](btn|button|list|table)$/i, "")
      .trim();
    if (fuzzyId) {
      candidates.add(`[data-testid*="${fuzzyId}"]`);
    }
  }

  for (const selector of Array.from(candidates)) {
    const rowMatch = selector.match(/^tr\[data-[a-z0-9_-]+id\]$/i);
    if (rowMatch) {
      candidates.add("table tbody tr");
      candidates.add("tbody tr");
      candidates.add("[role='row']");
    }

    const rowDataTestIdMatch = selector.match(
      /^\[data-testid=['"]([^'"]*row[^'"]*)['"]\](?::first-child|:first-of-type)?$/i
    );
    if (rowDataTestIdMatch) {
      candidates.add("table tbody tr:first-child");
      candidates.add("tbody tr:first-child");
      candidates.add("table tbody tr");
      candidates.add("[role='row']");
    }

    const inputNameMatch = selector.match(/^input\[name=['"]([^'"]+)['"]\]$/i);
    if (inputNameMatch) {
      const rawName = inputNameMatch[1];
      const snake = rawName
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .toLowerCase();
      const kebab = snake.replace(/_/g, "-");
      const spaced = snake.replace(/_/g, " ");
      candidates.add(`input[name='${snake}']`);
      candidates.add(`input[name='${kebab}']`);
      candidates.add(`input[id*='${rawName.toLowerCase()}']`);
      candidates.add(`input[id*='${snake}']`);
      candidates.add(`input[placeholder*='${spaced}' i]`);

      if (/teri/.test(rawName.toLowerCase())) {
        candidates.add('input[placeholder*="teri" i]');
      }
      if (/name/.test(rawName.toLowerCase())) {
        candidates.add('input[placeholder*="name" i]');
        candidates.add('input[placeholder*="company" i]');
        candidates.add('input[placeholder*="contact" i]');
        candidates.add('input[aria-label*="name" i]');
        candidates.add('input[aria-label*="company" i]');
        candidates.add('input[aria-label*="contact" i]');
      }
      if (/email/.test(rawName.toLowerCase())) {
        candidates.add('input[type="email"]');
        candidates.add('input[placeholder*="email" i]');
        candidates.add('input[placeholder*="@" i]');
        candidates.add('input[aria-label*="email" i]');
      }
      if (/phone/.test(rawName.toLowerCase())) {
        candidates.add('input[type="tel"]');
        candidates.add('input[placeholder*="phone" i]');
        candidates.add('input[aria-label*="phone" i]');
      }
      if (/city/.test(rawName.toLowerCase())) {
        candidates.add('input[placeholder*="city" i]');
      }
      if (/state/.test(rawName.toLowerCase())) {
        candidates.add('input[placeholder*="state" i]');
      }
      if (/zip|postal/.test(rawName.toLowerCase())) {
        candidates.add('input[placeholder*="zip" i]');
        candidates.add('input[placeholder*="postal" i]');
      }
      if (/search/i.test(rawName)) {
        candidates.add('input[type="search"]');
        candidates.add('input[placeholder*="search" i]');
      }
    }

    if (/client-id|order-id|invoice-id|batch-id/i.test(selector)) {
      candidates.add("[role='complementary'] h2");
      candidates.add("[role='complementary'] [role='heading']");
      candidates.add("[role='complementary'] [data-slot='card-title']");
      candidates.add("[role='dialog'] h2");
      candidates.add("main h2");
    }
  }

  return Array.from(candidates);
}

function isLoginPath(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return pathname === "/login" || pathname === "/sign-in";
  } catch {
    return url.includes("/login") || url.includes("/sign-in");
  }
}

async function isAppShellReady(page: Page): Promise<boolean> {
  if (isLoginPath(page.url())) return false;
  return page
    .locator("main, [role='main'], nav, [role='navigation']")
    .first()
    .isVisible()
    .catch(() => false);
}

function isRowLikeSelector(rawSelector: string): boolean {
  const normalized = rawSelector.toLowerCase();
  return (
    /\brow\b/.test(normalized) ||
    /\btr\b/.test(normalized) ||
    /tbody\s+tr/.test(normalized) ||
    /table\s+tbody\s+tr/.test(normalized) ||
    /data-(?!testid)[a-z0-9_-]*id/.test(normalized) ||
    /\b(order|invoice|batch|client|pick-pack)\b/.test(normalized)
  );
}

function hasEmptyStateText(text: string): boolean {
  return (
    /no (orders|invoices|batches|clients|results?) found/.test(text) ||
    /no inventory found/.test(text) ||
    /no data available/.test(text) ||
    /create your first (order|invoice|batch|client)/.test(text) ||
    /select a customer to begin/.test(text) ||
    /nothing to show/.test(text) ||
    /failed to load (clients|inventory|orders|invoices)/.test(text)
  );
}

async function detectEmptyState(page: Page): Promise<boolean> {
  const mainText = (
    (await page.locator("main, [role='main'], body").first().textContent()) ||
    ""
  ).toLowerCase();
  return hasEmptyStateText(mainText);
}

async function safeWaitForNetworkIdle(page: Page): Promise<void> {
  await page
    .waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT })
    .catch(() => undefined);
}

async function findVisibleSelector(
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

async function waitForAnySelector(
  page: Page,
  candidates: string[],
  timeout: number
): Promise<string | undefined> {
  if (candidates.length === 0) return undefined;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const visible = await findVisibleSelector(page, candidates);
    if (visible) return visible;
    await page.waitForTimeout(150);
  }
  return undefined;
}

async function resolveSelectorForAction(
  page: Page,
  rawSelector: string,
  context: OracleContext,
  timeout: number
): Promise<string> {
  const baseCandidates = buildSelectorCandidates(rawSelector, context);
  const candidates: string[] = [];
  const dialogVisible = await page
    .locator("[role='dialog']")
    .first()
    .isVisible()
    .catch(() => false);

  if (dialogVisible) {
    for (const candidate of baseCandidates) {
      if (
        candidate.startsWith("text=") ||
        candidate.startsWith("xpath=") ||
        candidate.includes("[role='dialog']")
      ) {
        candidates.push(candidate);
      } else {
        candidates.push(`[role='dialog'] ${candidate}`);
      }
    }
  }
  candidates.push(...baseCandidates);
  const visibleNow = await findVisibleSelector(page, candidates);
  if (visibleNow) return visibleNow;

  const eventuallyVisible = await waitForAnySelector(page, candidates, timeout);
  if (eventuallyVisible) return eventuallyVisible;

  if (isRowLikeSelector(rawSelector) && (await detectEmptyState(page))) {
    throw new Error(
      `CANNOT_RESOLVE_ID for ${rawSelector}. Empty-state detected in live data.`
    );
  }

  throw new Error(
    `Selector not found or not visible. raw=${rawSelector}. candidates=${candidates.join(
      " || "
    )}`
  );
}

async function isNativeSelectElement(
  page: Page,
  selector: string
): Promise<boolean> {
  return page
    .locator(selector)
    .first()
    .evaluate(el => {
      if (el.tagName.toLowerCase() !== "select") return false;
      const ariaHidden = el.getAttribute("aria-hidden") === "true";
      const hiddenAttr = el.hasAttribute("hidden");
      const style = window.getComputedStyle(el);
      const hiddenByStyle =
        style.display === "none" || style.visibility === "hidden";
      return !(ariaHidden || hiddenAttr || hiddenByStyle);
    })
    .catch(() => false);
}

async function selectFromCombobox(
  page: Page,
  selector: string,
  value: string,
  optionIndex?: number
): Promise<void> {
  const trigger = page.locator(selector).first();
  const expanded = await trigger
    .getAttribute("aria-expanded")
    .catch(() => null);
  if (expanded !== "true") {
    await trigger
      .click({ timeout: DEFAULT_ACTION_TIMEOUT })
      .catch(() => undefined);
  }
  await page.waitForTimeout(150);

  if (value) {
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

  if (optionIndex !== undefined && optionIndex >= 0) {
    for (const group of optionGroups) {
      const count = await group.count().catch(() => 0);
      if (count === 0) continue;
      const boundedIndex = Math.min(optionIndex, count - 1);
      const candidate = group.nth(boundedIndex);
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ timeout: DEFAULT_ACTION_TIMEOUT });
        return;
      }
    }
  }

  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue.length === 0 && optionIndex === undefined) {
    for (const group of optionGroups) {
      const count = await group.count().catch(() => 0);
      if (count === 0) continue;
      for (let i = 0; i < Math.min(count, 40); i++) {
        const candidate = group.nth(i);
        if (await candidate.isVisible().catch(() => false)) {
          await candidate.click({ timeout: DEFAULT_ACTION_TIMEOUT });
          return;
        }
      }
    }
  }

  if (normalizedValue.length > 0) {
    for (const group of optionGroups) {
      const count = await group.count().catch(() => 0);
      if (count === 0) continue;
      const max = Math.min(count, 80);
      for (let i = 0; i < max; i++) {
        const candidate = group.nth(i);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;
        const text = (
          (await candidate.innerText().catch(() => "")) ||
          (await candidate.textContent().catch(() => "")) ||
          ""
        )
          .trim()
          .toLowerCase();
        if (
          text === normalizedValue ||
          text.includes(normalizedValue) ||
          normalizedValue.includes(text)
        ) {
          await candidate.click({ timeout: DEFAULT_ACTION_TIMEOUT });
          return;
        }
      }
    }
  }

  // Fallback when options are keyboard-driven.
  await page.keyboard.press("Enter").catch(() => undefined);
}

async function executePreconditions(
  page: Page,
  preconditions: TestOracle["preconditions"],
  context: OracleContext
): Promise<void> {
  void page;

  if (preconditions.ensure) {
    for (const condition of preconditions.ensure) {
      const ref = condition.ref;
      if (ref.startsWith("seed:")) {
        const [, entityPath] = ref.split("seed:");
        const [entity, name] = entityPath.split(".");
        context.seed[`${entity}.${name}`] = {
          _ref: ref,
          ...(condition.where || {}),
        };
      }
    }
  }

  if (preconditions.create) {
    for (const createCondition of preconditions.create) {
      console.info(`[Oracle] Would create temp entity: ${createCondition.ref}`);
      context.temp[createCondition.ref] = resolveTemplateValue(
        createCondition.data,
        context
      ) as Record<string, unknown>;
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
  const timeout = DEFAULT_ACTION_TIMEOUT;

  switch (action.action) {
    case "navigate": {
      let targetPath = resolveTemplateString(action.path, context, "value");
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

      const response = await page.goto(targetPath, {
        waitUntil: "domcontentloaded",
      });
      if (action.wait_for) {
        const candidates = buildSelectorCandidates(action.wait_for, context);
        const foundSelector = await waitForAnySelector(
          page,
          candidates,
          timeout
        );
        if (!foundSelector && !(await isAppShellReady(page))) {
          throw new Error(
            `Navigation wait_for selector not found: ${action.wait_for}`
          );
        }
      }
      await safeWaitForNetworkIdle(page);
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
      const rawSelector = getClickTarget(action, context);
      const selector = await resolveSelectorForAction(
        page,
        rawSelector,
        context,
        timeout
      );
      await page.locator(selector).first().click({ timeout });

      if (action.wait_for) {
        const waitCandidates = buildSelectorCandidates(
          action.wait_for,
          context
        );
        const waited = await waitForAnySelector(page, waitCandidates, timeout);
        if (!waited) {
          throw new Error(
            `Click wait_for selector not found: ${action.wait_for}`
          );
        }
      }

      if (action.wait_after) {
        await page.waitForTimeout(action.wait_after);
      }
      if (action.wait_for_navigation) {
        await page.waitForLoadState("domcontentloaded", { timeout });
        await safeWaitForNetworkIdle(page);
      }
      return {};
    }

    case "type": {
      const selector = await resolveSelectorForAction(
        page,
        action.target,
        context,
        timeout
      );
      const value = resolveTemplateString(
        action.value || action.value_ref || "",
        context,
        "value"
      );
      if (action.clear_first) {
        await page.locator(selector).first().fill("");
      }
      await page.locator(selector).first().fill(value);
      return {};
    }

    case "select": {
      const selector = await resolveSelectorForAction(
        page,
        action.target,
        context,
        timeout
      );
      const value = resolveTemplateString(
        action.value || action.value_ref || "",
        context,
        "value"
      );

      const optionValue = action.option_value
        ? resolveTemplateString(action.option_value, context, "value")
        : "";
      const desired = optionValue || value;
      const isNativeSelect = await isNativeSelectElement(page, selector);

      if (isNativeSelect) {
        if (action.option_index !== undefined) {
          await page.locator(selector).first().selectOption({
            index: action.option_index,
          });
        } else if (optionValue) {
          await page.locator(selector).first().selectOption({
            value: optionValue,
          });
        } else {
          await page.locator(selector).first().selectOption({ label: value });
        }
      } else {
        await selectFromCombobox(page, selector, desired, action.option_index);
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
        const selector = await resolveSelectorForAction(
          page,
          action.visible,
          context,
          timeout
        );
        await expect(page.locator(selector).first()).toBeVisible({ timeout });
      }
      if (action.not_visible) {
        const selector = resolveTemplateString(
          action.not_visible,
          context,
          "selector"
        );
        await expect(page.locator(selector).first()).not.toBeVisible({
          timeout,
        });
      }
      if (action.text_contains) {
        await expect(page.locator("body")).toContainText(
          resolveTemplateString(action.text_contains, context, "value")
        );
      }
      if (action.value_equals) {
        const selector = await resolveSelectorForAction(
          page,
          action.value_equals.target,
          context,
          timeout
        );
        const locator = page.locator(selector).first();
        await expect(locator).toHaveValue(
          resolveTemplateString(action.value_equals.value, context, "value")
        );
      }
      return {};
    }

    case "wait": {
      if (action.for) {
        const waitTimeout = action.timeout || timeout;
        const candidates = buildSelectorCandidates(action.for, context);
        const found = await waitForAnySelector(page, candidates, waitTimeout);
        if (!found) {
          if (isRowLikeSelector(action.for) && (await detectEmptyState(page))) {
            throw new Error(
              `CANNOT_RESOLVE_ID for ${action.for}. Empty-state detected in live data.`
            );
          }
          throw new Error(`Wait selector not found: ${action.for}`);
        }
      } else if (action.duration) {
        await page.waitForTimeout(action.duration);
      } else if (action.network_idle) {
        await safeWaitForNetworkIdle(page);
      }
      return {};
    }

    case "screenshot": {
      await page.screenshot({ fullPage: action.full_page });
      console.info(`[Oracle] Screenshot taken: ${action.name}`);
      return {};
    }

    case "store": {
      const selector = await resolveSelectorForAction(
        page,
        action.from,
        context,
        timeout
      );
      const element = page.locator(selector).first();
      const value = await element
        .inputValue()
        .catch(async () => (await element.textContent()) || "");
      context.stored[action.as] = value;
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
  action: Extract<OracleAction, { action: "click" }>,
  context: OracleContext
): string {
  if (action.target) {
    return resolveTemplateString(action.target, context, "selector");
  }
  if (action.target_text) {
    const text = resolveTemplateString(action.target_text, context, "value");
    return `text="${text}"`;
  }
  if (action.target_label) {
    const label = resolveTemplateString(action.target_label, context, "value");
    return `[aria-label="${label}"], label:has-text("${label}")`;
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
  context: OracleContext
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
      const currentUrl = page.url();
      const currentPath = (() => {
        try {
          const parsed = new URL(currentUrl);
          return `${parsed.pathname}${parsed.search}`;
        } catch {
          return currentUrl;
        }
      })();
      const pattern = new RegExp(expected.url_matches);
      const matches = pattern.test(currentUrl) || pattern.test(currentPath);
      expect(matches).toBeTruthy();
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
        const candidates = buildSelectorCandidates(selector, context);
        const foundSelector = await waitForAnySelector(
          page,
          candidates,
          timeout
        );
        if (!foundSelector) {
          throw new Error(
            `Element not visible. candidates=${candidates.join(" || ")}`
          );
        }
        await expect(page.locator(foundSelector).first()).toBeVisible({
          timeout,
        });
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
        const candidates = buildSelectorCandidates(selector, context);
        const foundSelector = await findVisibleSelector(page, candidates);
        if (foundSelector) {
          await expect(page.locator(foundSelector).first()).not.toBeVisible({
            timeout,
          });
        }
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
  const status =
    result.status === "BLOCKED"
      ? "⏸ BLOCKED"
      : result.success
        ? "✅ PASS"
        : "❌ FAIL";
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
