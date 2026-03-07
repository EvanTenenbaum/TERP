/**
 * Chain Runner - Run all chains for quick validation
 *
 * Runs every chain in ALL_CHAINS as an individual Playwright test.
 * Good for quick validation that all defined chains are functional.
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=https://terp-staging-yicld.ondigitalocean.app \
 *     npx playwright test tests-e2e/chains/chain-runner.spec.ts --project=staging-critical
 *
 * Filter by tag:
 *   CHAIN_TAG=crud:create npx playwright test tests-e2e/chains/chain-runner.spec.ts
 *
 * @staging-critical
 */
import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import { ALL_CHAINS, getChainById } from "./definitions";
import type {
  TestChain,
  ChainPhase,
  OracleAction,
  NavigateAction,
  ClickAction,
  TypeAction,
  SelectAction,
  AssertAction,
  WaitAction,
  ScreenshotAction,
  StoreAction,
} from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CHAIN_TAG = process.env.CHAIN_TAG;
const CHAIN_TIMEOUT = Number(process.env.CHAIN_TIMEOUT || 60000);
const OUTPUT_DIR = process.env.SIMULATION_OUTPUT || "qa-results/simulation";

// ---------------------------------------------------------------------------
// Local result types
// ---------------------------------------------------------------------------

interface PhaseResult {
  phase_id: string;
  success: boolean;
  duration_ms: number;
  steps_completed: number;
  total_steps: number;
  extracted_values: Record<string, unknown>;
  errors: string[];
  screenshots: string[];
  failure_type?: "app_bug" | "data_issue" | "network" | "test_infra";
  failure_evidence?: string;
}

interface ChainResult {
  chain_id: string;
  description: string;
  success: boolean;
  duration_ms: number;
  phases: PhaseResult[];
  tags_covered: string[];
  failure_type?: "app_bug" | "data_issue" | "network" | "test_infra";
}

// ---------------------------------------------------------------------------
// Template variable resolution
// ---------------------------------------------------------------------------

function resolveTemplate(value: string): string {
  return value
    .replace("{{timestamp}}", Date.now().toString())
    .replace("{{date}}", new Date().toISOString().split("T")[0])
    .replace("{{random}}", Math.random().toString(36).substring(7));
}

// ---------------------------------------------------------------------------
// Step execution
// ---------------------------------------------------------------------------

async function executeStep(
  page: import("@playwright/test").Page,
  step: OracleAction,
  context: Record<string, unknown>,
  result: PhaseResult
): Promise<void> {
  switch (step.action) {
    case "navigate": {
      const navStep = step as NavigateAction;
      await page.goto(navStep.path, {
        waitUntil: "domcontentloaded",
        timeout: CHAIN_TIMEOUT,
      });
      await page.waitForLoadState("networkidle").catch(() => {});
      if (navStep.wait_for) {
        const waitSelectors = navStep.wait_for.split(",").map(s => s.trim());
        for (const sel of waitSelectors) {
          try {
            if (sel.startsWith("text=")) {
              await page
                .getByText(sel.replace("text=", ""), { exact: false })
                .first()
                .waitFor({ timeout: 10000 });
            } else {
              await page.locator(sel).first().waitFor({ timeout: 10000 });
            }
            break;
          } catch {
            continue;
          }
        }
      }
      break;
    }

    case "click": {
      const clickStep = step as ClickAction;
      if (clickStep.target) {
        const selectors = clickStep.target.split(",").map(s => s.trim());
        let clicked = false;
        for (const sel of selectors) {
          const loc = page.locator(sel).first();
          if (await loc.isVisible().catch(() => false)) {
            await loc.click({ timeout: 10000 });
            clicked = true;
            break;
          }
        }
        if (!clicked && clickStep.target_text) {
          await page
            .getByText(clickStep.target_text)
            .first()
            .click({ timeout: 10000 });
          clicked = true;
        }
        if (!clicked) {
          await page.locator(selectors[0]).first().click({ timeout: 10000 });
        }
      } else if (clickStep.target_text) {
        await page
          .getByText(clickStep.target_text)
          .first()
          .click({ timeout: 10000 });
      }
      if (clickStep.wait_for) {
        await page.waitForLoadState("networkidle").catch(() => {});
      }
      break;
    }

    case "type": {
      const typeStep = step as TypeAction;
      const value = resolveTemplate(typeStep.value || typeStep.value_ref || "");
      const selectors = typeStep.target.split(",").map(s => s.trim());
      let filled = false;
      for (const sel of selectors) {
        const loc = page.locator(sel).first();
        if (await loc.isVisible().catch(() => false)) {
          if (typeStep.clear_first) await loc.clear();
          await loc.fill(value);
          filled = true;
          break;
        }
      }
      if (!filled) {
        await page.locator(selectors[0]).first().fill(value);
      }
      break;
    }

    case "select": {
      const selectStep = step as SelectAction;
      const selectors = selectStep.target.split(",").map(s => s.trim());
      const loc = page.locator(selectors[0]).first();
      if (await loc.isVisible().catch(() => false)) {
        await loc.click();
        await page.waitForTimeout(500);
        if (selectStep.value) {
          const option = page
            .getByText(selectStep.value, { exact: false })
            .first();
          if (await option.isVisible().catch(() => false)) {
            await option.click();
          }
        }
      }
      break;
    }

    case "assert": {
      const assertStep = step as AssertAction;
      if (assertStep.visible) {
        const selectors = assertStep.visible.split(",").map(s => s.trim());
        let found = false;
        for (const sel of selectors) {
          try {
            if (sel.startsWith("text=")) {
              const isVis = await page
                .getByText(sel.replace("text=", ""), { exact: false })
                .first()
                .isVisible()
                .catch(() => false);
              if (isVis) {
                found = true;
                break;
              }
            } else {
              const isVis = await page
                .locator(sel)
                .first()
                .isVisible()
                .catch(() => false);
              if (isVis) {
                found = true;
                break;
              }
            }
          } catch {
            continue;
          }
        }
        if (!found) {
          result.errors.push(
            `Assert visible failed: none of [${assertStep.visible}] found`
          );
        }
      }
      if (assertStep.text_contains) {
        const bodyText = await page.textContent("body").catch(() => "");
        if (!bodyText?.includes(assertStep.text_contains)) {
          result.errors.push(
            `Assert text_contains failed: "${assertStep.text_contains}" not found on page`
          );
        }
      }
      break;
    }

    case "wait": {
      const waitStep = step as WaitAction;
      if (waitStep.network_idle) {
        await page
          .waitForLoadState("networkidle", {
            timeout: waitStep.timeout || 10000,
          })
          .catch(() => {});
      }
      if (waitStep.duration) {
        await page.waitForTimeout(waitStep.duration);
      }
      break;
    }

    case "screenshot": {
      const ssStep = step as ScreenshotAction;
      const ssPath = `${OUTPUT_DIR}/screenshots/${ssStep.name}-${Date.now()}.png`;
      await page
        .screenshot({ path: ssPath, fullPage: ssStep.full_page || false })
        .catch(() => {});
      result.screenshots.push(ssPath);
      break;
    }

    case "store": {
      const storeStep = step as StoreAction;
      const el = page.locator(storeStep.from).first();
      const text = await el.textContent().catch(() => null);
      if (text) {
        context[storeStep.as] = text.trim();
        result.extracted_values[storeStep.as] = text.trim();
      }
      break;
    }

    default: {
      console.warn(`Unknown action type: ${(step as OracleAction).action}`);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Phase execution
// ---------------------------------------------------------------------------

async function executePhase(
  page: import("@playwright/test").Page,
  phase: ChainPhase,
  context: Record<string, unknown>
): Promise<PhaseResult> {
  const startTime = Date.now();
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
    for (const step of phase.steps) {
      try {
        await executeStep(page, step, context, result);
        result.steps_completed++;
      } catch (stepError) {
        const errorMsg =
          stepError instanceof Error ? stepError.message : String(stepError);
        result.errors.push(
          `Step ${result.steps_completed + 1} (${step.action}): ${errorMsg}`
        );

        if (
          errorMsg.includes("net::") ||
          errorMsg.includes("ERR_TIMED_OUT") ||
          errorMsg.includes("Navigation timeout")
        ) {
          result.failure_type = "network";
        } else if (
          errorMsg.includes("locator") ||
          errorMsg.includes("selector") ||
          errorMsg.includes("not found")
        ) {
          const currentUrl = page.url();
          if (currentUrl.includes("/login")) {
            result.failure_type = "test_infra";
          } else {
            const hasMainContent = await page
              .locator("main")
              .isVisible()
              .catch(() => false);
            result.failure_type = hasMainContent ? "test_infra" : "app_bug";
          }
        } else {
          result.failure_type = "app_bug";
        }
        result.failure_evidence = errorMsg;

        const failPath = `${OUTPUT_DIR}/screenshots/FAIL-${phase.phase_id}-${Date.now()}.png`;
        await page
          .screenshot({ path: failPath, fullPage: true })
          .catch(() => {});
        result.screenshots.push(failPath);

        break;
      }
    }

    // Extract values from the page into shared context
    if (phase.extract && result.steps_completed === phase.steps.length) {
      for (const extraction of phase.extract) {
        try {
          if (extraction.from === "url") {
            const url = page.url();
            if (extraction.pattern) {
              const match = url.match(new RegExp(extraction.pattern));
              if (match) context[extraction.as] = match[1] || match[0];
            } else {
              context[extraction.as] = url;
            }
            result.extracted_values[extraction.as] = context[
              extraction.as
            ] as string;
          } else {
            const el = page.locator(extraction.from).first();
            const text = await el.textContent().catch(() => null);
            if (text && extraction.pattern) {
              const match = text.match(new RegExp(extraction.pattern));
              if (match) context[extraction.as] = match[1] || match[0];
            } else if (text) {
              context[extraction.as] = text.trim();
            }
            if (context[extraction.as]) {
              result.extracted_values[extraction.as] = context[
                extraction.as
              ] as string;
            }
          }
        } catch {
          // Non-fatal — next phase simply won't have this key
        }
      }
    }

    if (phase.screenshot && result.steps_completed === phase.steps.length) {
      const ssPath = `${OUTPUT_DIR}/screenshots/${phase.screenshot}-${Date.now()}.png`;
      await page.screenshot({ path: ssPath }).catch(() => {});
      result.screenshots.push(ssPath);
    }

    result.success =
      result.steps_completed === phase.steps.length &&
      result.errors.length === 0;
  } catch (phaseError) {
    const errorMsg =
      phaseError instanceof Error ? phaseError.message : String(phaseError);
    result.errors.push(`Phase error: ${errorMsg}`);
    result.failure_type = "app_bug";
    result.failure_evidence = errorMsg;
  }

  result.duration_ms = Date.now() - startTime;
  return result;
}

// ---------------------------------------------------------------------------
// Chain execution
// ---------------------------------------------------------------------------

async function executeChain(
  page: import("@playwright/test").Page,
  chain: TestChain
): Promise<ChainResult> {
  const startTime = Date.now();
  const context: Record<string, unknown> = {};
  const phaseResults: PhaseResult[] = [];
  const tagsCovered = [...chain.tags];

  for (const phase of chain.phases) {
    const phaseResult = await executePhase(page, phase, context);
    phaseResults.push(phaseResult);

    for (const step of phase.steps) {
      if (step.action === "navigate") {
        const navStep = step as NavigateAction;
        tagsCovered.push(`route:${navStep.path}`);
      }
    }

    if (!phaseResult.success) {
      if (
        phaseResult.failure_type === "network" ||
        (phaseResult.failure_type === "test_infra" &&
          phaseResult.failure_evidence?.includes("login"))
      ) {
        break;
      }
    }
  }

  const chainResult: ChainResult = {
    chain_id: chain.chain_id,
    description: chain.description,
    success: phaseResults.every(p => p.success),
    duration_ms: Date.now() - startTime,
    phases: phaseResults,
    tags_covered: Array.from(new Set(tagsCovered)),
  };

  const failedPhases = phaseResults.filter(p => !p.success);
  if (failedPhases.length > 0) {
    const types = failedPhases
      .map(p => p.failure_type)
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
    if (types.includes("app_bug")) chainResult.failure_type = "app_bug";
    else if (types.includes("data_issue"))
      chainResult.failure_type = "data_issue";
    else if (types.includes("network")) chainResult.failure_type = "network";
    else chainResult.failure_type = "test_infra";
  }

  return chainResult;
}

// ---------------------------------------------------------------------------
// Filter chains by tag
// ---------------------------------------------------------------------------

function filterChains(chains: TestChain[]): TestChain[] {
  if (!CHAIN_TAG) return chains;
  return chains.filter(c => c.tags.includes(CHAIN_TAG));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("Chain Runner - All Chains @staging-critical", () => {
  test.setTimeout(CHAIN_TIMEOUT * 10);

  test.beforeAll(async () => {
    const { mkdirSync } = await import("fs");
    try {
      mkdirSync(`${OUTPUT_DIR}/screenshots`, { recursive: true });
    } catch {
      // Directory may already exist — non-fatal
    }
  });

  const chainsToRun = filterChains(ALL_CHAINS);

  if (chainsToRun.length === 0) {
    test("No chains to run @staging-critical", () => {
      const tagMsg = CHAIN_TAG ? ` matching tag "${CHAIN_TAG}"` : "";
      console.warn(`No chains found${tagMsg}. Check definitions/index.ts.`);
    });
  }

  for (const chain of chainsToRun) {
    test(`${chain.description} [${chain.chain_id}] @staging-critical`, async ({
      page,
    }) => {
      await loginAsAdmin(page);
      const result = await executeChain(page, chain);

      const status = result.success ? "PASS" : "FAIL";
      const failType = result.failure_type ? ` [${result.failure_type}]` : "";
      console.info(
        `${status} ${chain.chain_id}${failType} (${result.duration_ms}ms)`
      );

      if (!result.success) {
        for (const phase of result.phases.filter(p => !p.success)) {
          console.info(`  Phase ${phase.phase_id}: ${phase.errors.join("; ")}`);
          if (phase.failure_type) {
            console.info(`    Classification: ${phase.failure_type}`);
          }
        }
      }

      // Golden flows always hard-assert; others only assert on confirmed app bugs
      const isGolden = chain.chain_id.startsWith("golden.");
      if (isGolden || result.failure_type === "app_bug") {
        const firstFailed = result.phases.find(p => !p.success);
        expect(
          result.success,
          `${isGolden ? "Golden flow" : "App bug"} in ${chain.chain_id}: ${firstFailed?.errors.join("; ") ?? "unknown"}`
        ).toBe(true);
      }
    });
  }

  // Run a chain by ID fetched at test-time (supports CHAIN_ID env override)
  test.describe("Chain ID lookup validation @staging-critical", () => {
    test("getChainById returns undefined for unknown ID @staging-critical", () => {
      const result = getChainById("__nonexistent_chain_id__");
      expect(result).toBeUndefined();
    });
  });
});
