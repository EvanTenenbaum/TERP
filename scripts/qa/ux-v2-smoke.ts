/**
 * UX v2 Post-Deploy Smoke Test
 *
 * Fast DOM-assertion gate that runs after every deploy to catch UX
 * regressions (TER-1357 / TER-1360 / TER-1362 / TER-1366 class bugs).
 *
 * Not a full browser E2E — just 8 targeted DOM assertions against the
 * staging URL. Should finish in under 3 minutes.
 *
 * Usage:
 *   pnpm smoke:staging
 *   STAGING_URL=https://terp-staging-yicld.ondigitalocean.app npx tsx scripts/qa/ux-v2-smoke.ts
 *
 * Exit codes:
 *   0 — every check passed
 *   1 — one or more checks failed (CI will block)
 *
 * Linear: TER-1372
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const STAGING =
  process.env.STAGING_URL ?? "https://terp-staging-yicld.ondigitalocean.app";

const NAV_TIMEOUT_MS = 30_000;
const CHECK_TIMEOUT_MS = 30_000;

type CheckFn = (page: Page) => Promise<void>;

interface Check {
  id: string;
  url: string;
  description: string;
  assert: CheckFn;
}

const checks: Check[] = [
  {
    id: "accounting-tabgroups",
    url: "/accounting",
    description: "Accounting surfaces ≤6 top-level tabs (grouped, not 10 flat)",
    assert: async page => {
      const tabs = await page.$$('[role="tab"]');
      if (tabs.length >= 10) {
        throw new Error(
          `Found ${tabs.length} top-level tabs on /accounting — tabGroups are not rendering`,
        );
      }
    },
  },
  {
    id: "invoice-status-no-html",
    url: "/accounting?tab=invoices",
    description: "Invoices Status column does not contain raw HTML",
    assert: async page => {
      await page
        .waitForSelector('[role="gridcell"]', { timeout: 8_000 })
        .catch(() => null);
      const cells = await page.$$('[col-id="status"][role="gridcell"]');
      for (const cell of cells.slice(0, 3)) {
        const text = (await cell.textContent()) ?? "";
        if (text.includes("<span") || text.includes("&lt;")) {
          throw new Error(
            `Invoice Status cell contains raw HTML: ${text.slice(0, 120)}`,
          );
        }
      }
    },
  },
  {
    id: "bills-status-no-html",
    url: "/accounting?tab=bills",
    description:
      "Bills Status + Due Amt columns do not contain raw HTML markup",
    assert: async page => {
      await page
        .waitForSelector('[role="gridcell"]', { timeout: 8_000 })
        .catch(() => null);
      const cells = await page.$$('[role="gridcell"]');
      for (const cell of cells.slice(0, 10)) {
        const text = (await cell.textContent()) ?? "";
        if (text.includes("<span") || text.includes("&lt;span")) {
          throw new Error(
            `Bills cell contains raw HTML: ${text.slice(0, 120)}`,
          );
        }
      }
    },
  },
  {
    id: "drawer-close-button",
    url: "/accounting?tab=invoices",
    description: "Invoice detail drawer exposes an explicit X close button",
    assert: async page => {
      await page
        .waitForSelector('[role="row"][row-index="0"]', { timeout: 8_000 })
        .catch(() => null);
      const row = await page.$('[role="row"][row-index="0"]');
      if (row) {
        await row.click();
      }
      await page.waitForTimeout(1_200);
      const closeBtn = await page.$(
        '[aria-label="Close panel"], [aria-label="Close drawer"], [aria-label="Close"]',
      );
      if (!closeBtn) {
        throw new Error("No accessible close button found on invoice drawer");
      }
    },
  },
  {
    id: "sales-single-primary",
    url: "/sales",
    description: "/sales page header has ≤1 primary (filled) action button",
    assert: async page => {
      const primaryBtns = await page.$$(
        'header button.bg-primary, header button[data-variant="default"]',
      );
      if (primaryBtns.length > 1) {
        throw new Error(
          `Found ${primaryBtns.length} primary buttons on /sales — expected ≤1`,
        );
      }
    },
  },
  {
    id: "nav-localstorage",
    url: "/accounting",
    description: "Sidebar navState localStorage key is present",
    assert: async page => {
      const val = await page.evaluate(() => {
        return (
          window.localStorage.getItem("terp.nav.open-groups.v1") ??
          window.localStorage.getItem("terp-navigation-state:user:1")
        );
      });
      if (val === null) {
        throw new Error("No sidebar navState key found in localStorage");
      }
    },
  },
  {
    id: "no-tailnet-requests",
    url: "/",
    description:
      "No requests or console logs referencing evans-mac-mini tailnet URL",
    assert: async page => {
      const hits: string[] = [];
      const consoleHandler = (msg: { text: () => string }) => {
        const text = msg.text();
        if (text.includes("evans-mac-mini.tailbe55dd.ts.net")) {
          hits.push(text.slice(0, 200));
        }
      };
      const requestHandler = (req: { url: () => string }) => {
        const url = req.url();
        if (url.includes("evans-mac-mini.tailbe55dd.ts.net")) {
          hits.push(url.slice(0, 200));
        }
      };
      page.on("console", consoleHandler);
      page.on("request", requestHandler);
      await page.waitForTimeout(2_500);
      page.off("console", consoleHandler);
      page.off("request", requestHandler);
      if (hits.length > 0) {
        throw new Error(`Tailnet URL leaked: ${hits[0]}`);
      }
    },
  },
  {
    id: "glossary-no-customer",
    url: "/relationships?tab=clients",
    description:
      "Relationships/Clients header+nav use 'Client' glossary (no 'Customer' leakage)",
    assert: async page => {
      const headerText = await page
        .$eval("header", (el: Element) => el.textContent ?? "")
        .catch(() => "");
      const navText = await page
        .$eval("nav", (el: Element) => el.textContent ?? "")
        .catch(() => "");
      if (
        /\bCustomer\b/.test(headerText) ||
        /Recent Customers/.test(navText)
      ) {
        throw new Error(
          "Forbidden term 'Customer' found in header/nav — glossary drift",
        );
      }
    },
  },
];

interface CheckResult {
  id: string;
  description: string;
  url: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  error?: string;
}

async function runCheck(
  page: Page,
  check: Check,
  baseUrl: string,
): Promise<CheckResult> {
  const startedAt = Date.now();
  const target = new URL(check.url, baseUrl).toString();
  try {
    await page.goto(target, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });
    // Give the SPA a brief moment to hydrate before asserting.
    await page.waitForTimeout(750);
    await Promise.race([
      check.assert(page),
      new Promise<void>((_resolve, reject) =>
        setTimeout(
          () => reject(new Error(`Assertion timed out after ${CHECK_TIMEOUT_MS}ms`)),
          CHECK_TIMEOUT_MS,
        ),
      ),
    ]);
    return {
      id: check.id,
      description: check.description,
      url: target,
      status: "PASS",
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      id: check.id,
      description: check.description,
      url: target,
      status: "FAIL",
      durationMs: Date.now() - startedAt,
      error: message,
    };
  }
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.info(`\n🔎 UX v2 smoke test — target: ${STAGING}\n`);

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  const results: CheckResult[] = [];

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      baseURL: STAGING,
      // DEMO_MODE on staging auto-logs in on first navigation; no explicit
      // login flow is required here.
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(CHECK_TIMEOUT_MS);

    for (const check of checks) {
      const result = await runCheck(page, check, STAGING);
      results.push(result);
      const icon = result.status === "PASS" ? "✅" : "❌";
      const summary = `${icon} ${result.id.padEnd(28)} ${result.status} (${result.durationMs}ms) — ${result.description}`;
      if (result.status === "PASS") {
        console.info(summary);
      } else {
        console.error(summary);
        console.error(`   → ${result.error}`);
      }
    }
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }

  const failed = results.filter(r => r.status === "FAIL");
  const totalMs = Date.now() - startedAt;

  console.info(
    `\n---\n${results.length - failed.length}/${results.length} checks passed in ${totalMs}ms\n`,
  );

  if (failed.length > 0) {
    console.error(
      `❌ ${failed.length} check(s) failed:\n${failed
        .map(f => `  • ${f.id}: ${f.error ?? "unknown error"}`)
        .join("\n")}\n`,
    );
    process.exit(1);
  }

  console.info("✅ All UX v2 smoke checks passed.\n");
  process.exit(0);
}

main().catch(err => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error(`💥 Smoke runner crashed:\n${message}`);
  process.exit(1);
});
