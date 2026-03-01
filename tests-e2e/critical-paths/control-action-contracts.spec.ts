/**
 * Control-Action Contract Tests (TER-194)
 *
 * Live frontend contracts for the consolidated workspace UI:
 * - Legacy route entry points must canonicalize to workspace URLs
 * - High-value non-destructive controls must produce observable effects
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";
import {
  ControlContract,
  type ContractResult,
} from "../utils/control-action-contracts";

interface RouteContract {
  from: string;
  expectedPath: string;
  expectedParams: Record<string, string>;
}

interface ActionContract {
  id: string;
  route: string;
  selector: string;
  expectedUrlPattern?: RegExp;
  expectedVisibleSelector?: string;
  allowDialogFallback?: boolean;
}

const ROUTE_CONTRACTS: RouteContract[] = [
  {
    from: "/spreadsheet-view",
    expectedPath: "/purchase-orders",
    expectedParams: { tab: "receiving", mode: "spreadsheet" },
  },
  {
    from: "/purchase-orders/classic",
    expectedPath: "/purchase-orders",
    expectedParams: { tab: "purchase-orders" },
  },
  {
    from: "/inventory/1",
    expectedPath: "/inventory",
    expectedParams: { tab: "inventory", batchId: "1" },
  },
  {
    from: "/orders/create",
    expectedPath: "/sales",
    expectedParams: { tab: "create-order" },
  },
  {
    from: "/receiving",
    expectedPath: "/purchase-orders",
    expectedParams: { tab: "receiving" },
  },
];

const ACTION_CONTRACTS: ActionContract[] = [
  {
    id: "sales-new-sale",
    route: "/sales?tab=orders",
    selector: '[data-testid="new-order-button"], button:has-text("New Sale")',
    expectedUrlPattern: /\/sales\?tab=create-order/,
  },
  {
    id: "inventory-product-intake",
    route: "/inventory",
    selector:
      '[data-testid="new-batch-btn"], button:has-text("Product Intake"), button:has-text("Intake")',
    expectedUrlPattern: /\/purchase-orders\?tab=receiving/,
  },
  {
    id: "relationships-add-client",
    route: "/relationships?tab=clients",
    selector: 'button:has-text("Add Client")',
    expectedVisibleSelector: '[role="dialog"]',
    allowDialogFallback: true,
  },
  {
    id: "purchase-orders-create-po",
    route: "/purchase-orders?tab=purchase-orders",
    selector: 'button:has-text("Create PO")',
    expectedVisibleSelector: "text=New Purchase Order",
  },
];

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function makeArtifactPath(name: string): string {
  const directory = path.join("test-results", "control-action-contracts");
  mkdirSync(directory, { recursive: true });
  return path.join(directory, `${name}.png`);
}

function getPathAndSearch(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return rawUrl;
  }
}

const AUTH_STATE_PATH = path.join(
  "test-results",
  "control-action-contracts",
  "auth-state.json"
);
mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
if (!existsSync(AUTH_STATE_PATH)) {
  writeFileSync(
    AUTH_STATE_PATH,
    JSON.stringify({ cookies: [], origins: [] }, null, 2)
  );
}

test.describe("@prod-smoke Control-Action Contracts: Consolidated Frontend", () => {
  test.setTimeout(180000);
  test.use({ storageState: AUTH_STATE_PATH });

  test.beforeAll(async ({ browser }) => {
    mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);
    await context.storageState({ path: AUTH_STATE_PATH });
    await context.close();
  });

  test("Legacy routes canonicalize to expected workspace URLs", async ({
    page,
  }) => {
    for (const contract of ROUTE_CONTRACTS) {
      await page.goto(contract.from);
      await page.waitForLoadState("domcontentloaded");
      await page
        .waitForLoadState("networkidle", { timeout: 8000 })
        .catch(() => undefined);

      const currentUrl = page.url();
      const parsed = new URL(currentUrl);

      expect(
        parsed.pathname,
        `${contract.from} expected path ${contract.expectedPath}, got ${currentUrl}`
      ).toBe(contract.expectedPath);

      for (const [key, expectedValue] of Object.entries(
        contract.expectedParams
      )) {
        expect(
          parsed.searchParams.get(key),
          `${contract.from} expected query ${key}=${expectedValue}, got ${getPathAndSearch(currentUrl)}`
        ).toBe(expectedValue);
      }

      await page.screenshot({
        path: makeArtifactPath(`route-${toSlug(contract.from)}`),
        fullPage: true,
      });
    }
  });

  for (const contract of ACTION_CONTRACTS) {
    test(`High-value control contract: ${contract.id}`, async ({ page }) => {
      test.setTimeout(120000);
      const verifier = new ControlContract(page);
      const results: ContractResult[] = [];
      const startedAt = Date.now();
      const debug = process.env.CONTROL_CONTRACT_DEBUG === "1";
      const mark = (message: string) => {
        if (!debug) return;
        console.info(
          `[ControlContract:${contract.id} +${Date.now() - startedAt}ms] ${message}`
        );
      };

      mark(`goto ${contract.route}`);
      await page.goto(contract.route);
      mark("domcontentloaded");
      await page.waitForLoadState("domcontentloaded");
      await page
        .waitForLoadState("networkidle", { timeout: 8000 })
        .catch(() => undefined);
      mark(`loaded ${page.url()}`);

      const interactivity = await verifier.verifyControlIsInteractive(
        contract.selector
      );
      results.push(interactivity);
      mark(`interactive=${interactivity.passed}`);
      if (interactivity.passed) {
        const visibleBefore = contract.expectedVisibleSelector
          ? await page
              .locator(contract.expectedVisibleSelector)
              .first()
              .isVisible()
              .catch(() => false)
          : false;

        const observable = await verifier.verifyButtonCausesObservableEffect(
          contract.selector,
          { timeout: 2500 }
        );
        if (contract.expectedUrlPattern || !contract.expectedVisibleSelector) {
          results.push(observable);
        }
        mark(
          `observable=${observable.passed} detail=${observable.detail ?? ""}`
        );

        if (observable.passed && contract.expectedUrlPattern) {
          const urlMatches = contract.expectedUrlPattern.test(page.url());
          const dialogVisible = await page
            .locator('[role="dialog"]')
            .first()
            .isVisible()
            .catch(() => false);
          const passed =
            urlMatches || (contract.allowDialogFallback && dialogVisible);
          results.push({
            control: contract.selector,
            action: `land on ${contract.expectedUrlPattern}`,
            passed,
            detail: `url=${page.url()} dialogVisible=${dialogVisible}`,
          });
          mark(
            `urlMatch=${urlMatches} dialog=${dialogVisible} url=${page.url()}`
          );
        }

        if (contract.expectedVisibleSelector) {
          const visibleAfter = await page
            .locator(contract.expectedVisibleSelector)
            .first()
            .isVisible()
            .catch(() => false);
          const passed = visibleAfter || visibleBefore !== visibleAfter;
          results.push({
            control: contract.selector,
            action: `show ${contract.expectedVisibleSelector}`,
            passed,
            detail: `url=${page.url()} before=${visibleBefore} after=${visibleAfter}`,
          });
          mark(
            `visibleSelector=${contract.expectedVisibleSelector} before=${visibleBefore} after=${visibleAfter}`
          );
        }
      }

      await page.keyboard.press("Escape").catch(() => undefined);
      await page.goto("about:blank").catch(() => undefined);
      mark("done");
      ControlContract.assertAllPassed(results);
    });
  }
});
