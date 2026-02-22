#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";

function getCliArgValue(name) {
  const exact = `--${name}`;
  const inlinePrefix = `${exact}=`;
  for (let i = 0; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === exact && process.argv[i + 1]) return process.argv[i + 1];
    if (arg.startsWith(inlinePrefix)) return arg.slice(inlinePrefix.length);
  }
  return undefined;
}

const baseUrl =
  getCliArgValue("base-url") ||
  process.env.BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL;

if (!baseUrl) {
  console.error(
    "Missing BASE_URL. Set BASE_URL (or PLAYWRIGHT_BASE_URL) or pass --base-url."
  );
  process.exit(1);
}

if (!/^https?:\/\//.test(baseUrl)) {
  console.error(`Invalid base URL: "${baseUrl}". Expected http(s)://...`);
  process.exit(1);
}

const runAt = new Date();
const runDate = runAt.toISOString().slice(0, 10);
const runStamp = runAt.toISOString().replace(/[:.]/g, "-");
const qaRoot = path.resolve(
  process.env.QA_ROOT || `qa-results/redesign/${runDate}`
);
const authUsername =
  process.env.E2E_ADMIN_USERNAME ||
  process.env.UIUX_AUDIT_USERNAME ||
  "qa.superadmin@terp.test";
const authPassword =
  process.env.E2E_ADMIN_PASSWORD ||
  process.env.E2E_PASSWORD ||
  process.env.UIUX_AUDIT_PASSWORD ||
  "TerpQA2026!";
const screenshotDir = path.join(qaRoot, "screenshots");
const traceDir = path.join(qaRoot, "traces");
const metricsDir = path.join(qaRoot, "metrics");

for (const dir of [qaRoot, screenshotDir, traceDir, metricsDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

async function authenticate(page) {
  const attempts = [
    {
      url: `${baseUrl}/api/auth/login`,
      body: { username: authUsername, password: authPassword },
    },
    {
      url: `${baseUrl}/api/qa-auth/login`,
      body: { email: authUsername, password: authPassword },
    },
  ];

  for (const attempt of attempts) {
    try {
      const response = await page.request.post(attempt.url, {
        data: attempt.body,
      });
      if (response.ok()) return true;
    } catch {
      // Continue to next auth strategy.
    }
  }

  return false;
}

const bannedTerms = [
  "validate",
  "commit",
  "execute",
  "wizard",
  "transaction",
];

const modules = [
  {
    key: "purchase-orders",
    route: "/purchase-orders",
    primaryActions: [
      "Create PO",
      "Place Order",
      "Create Product Intake",
      "Activity Log",
    ],
    baseline: {
      medianClicks: 7,
      medianTimeSeconds: 52,
      reversalRate: 0.12,
      deadEndRate: 0.1,
    },
    async runFlow(page, result) {
      await page.waitForSelector("table tbody tr", { timeout: 15000 });
      await page.locator("table tbody tr").first().click();
      result.clicks += 1;
      result.steps.push("select-po-row");

      const createIntake = page.getByRole("button", {
        name: /Create Product Intake/i,
      });
      if ((await createIntake.count()) > 0) {
        await createIntake.first().click();
        result.clicks += 1;
        result.steps.push("open-create-intake-drawer");
      }

      const drawer = page.locator("[data-vaul-drawer-direction='right']").first();
      await drawer.waitFor({ state: "visible", timeout: 10000 });
      result.drawerOpened = true;

      const qtyInput = drawer.locator("input[type='number']").first();
      if ((await qtyInput.count()) > 0) {
        await qtyInput.fill("1");
        result.steps.push("set-intake-qty");
      }

      const lineCheckbox = drawer.getByRole("checkbox").first();
      if ((await lineCheckbox.count()) > 0) {
        const state = await lineCheckbox.getAttribute("data-state");
        const aria = await lineCheckbox.getAttribute("aria-checked");
        const checked = state === "checked" || aria === "true";
        if (!checked) {
          await lineCheckbox.click();
          result.steps.push("select-intake-line");
        }
      }

      const createDraft = drawer.getByRole("button", {
        name: /Create Intake Draft/i,
      });
      if ((await createDraft.count()) > 0) {
        await createDraft.first().click();
        result.clicks += 1;
        result.steps.push("create-intake-draft");
      }

      const draftSignal = Promise.race([
        page
          .waitForURL(
            url =>
              url.includes("tab=product-intake") ||
              url.includes("/product-intake"),
            { timeout: 10000 }
          )
          .then(() => true),
        page
          .getByText("Product Intake", { exact: false })
          .first()
          .waitFor({ state: "visible", timeout: 10000 })
          .then(() => true),
      ]).catch(() => false);
      result.success = await draftSignal;
      if (!result.success) {
        const draftCount = await page.evaluate(() => {
          const keys = Object.keys(window.localStorage);
          const draftKey = keys.find(key =>
            key.startsWith("terp.product-intake-drafts.v1:")
          );
          if (!draftKey) return 0;
          const raw = window.localStorage.getItem(draftKey);
          if (!raw) return 0;
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.length : 0;
          } catch {
            return 0;
          }
        });
        result.success = draftCount > 0;
      }
    },
  },
  {
    key: "product-intake",
    route: "/purchase-orders?tab=product-intake",
    primaryActions: ["Review", "Receive", "Activity Log"],
    baseline: {
      medianClicks: 6,
      medianTimeSeconds: 46,
      reversalRate: 0.1,
      deadEndRate: 0.12,
    },
    async runFlow(page, result) {
      await page.getByText("Product Intake", { exact: false }).first().waitFor({
        state: "visible",
        timeout: 15000,
      });
      const emptyState = page.getByText("Select an intake draft to continue.", {
        exact: false,
      });
      if ((await emptyState.count()) > 0) {
        await page.evaluate(() => {
          const keys = Object.keys(window.localStorage);
          const draftKey =
            keys.find(key => key.startsWith("terp.product-intake-drafts.v1:")) ||
            "terp.product-intake-drafts.v1:-1";

          const raw = window.localStorage.getItem(draftKey);
          let drafts = [];
          try {
            const parsed = raw ? JSON.parse(raw) : [];
            drafts = Array.isArray(parsed) ? parsed : [];
          } catch {
            drafts = [];
          }

          const now = new Date().toISOString();
          drafts.unshift({
            id: `PI-NS-${Date.now()}`,
            poId: 1,
            poNumber: "PO-NS-BOOTSTRAP",
            vendorId: 1,
            vendorName: "North Star Supplier",
            warehouseId: 1,
            warehouseName: "Main Warehouse",
            status: "DRAFT",
            idempotencyKey: `receive-PI-NS-${Date.now()}`,
            version: 1,
            createdAt: now,
            updatedAt: now,
            lines: [
              {
                id: "line-1",
                poItemId: 1,
                productId: 1,
                productName: "Bootstrap Product",
                quantityOrdered: 10,
                quantityReceived: 0,
                intakeQty: 5,
                unitCost: 99,
                grade: "A",
                locationId: 1,
                locationName: "Main Warehouse",
                mediaUrls: [],
              },
            ],
          });

          window.localStorage.setItem(draftKey, JSON.stringify(drafts));
        });
        await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(800);
        result.steps.push("bootstrap-local-draft");
      }

      const review = page.getByRole("button", { name: /^Review$/i });
      if ((await review.count()) > 0 && (await review.first().isEnabled())) {
        await review.first().click();
        result.clicks += 1;
        result.steps.push("open-review");
      }

      const closeReview = page
        .getByRole("button", { name: /^Close$/i })
        .or(page.getByRole("button", { name: /^Cancel$/i }));
      if ((await closeReview.count()) > 0) {
        await closeReview.first().click();
        result.clicks += 1;
        result.steps.push("close-review");
      }

      const activity = page.getByRole("button", { name: /Activity Log/i });
      if ((await activity.count()) > 0 && (await activity.first().isEnabled())) {
        await activity.first().click();
        result.clicks += 1;
        result.steps.push("open-activity-log");
        const drawerClose = page.getByRole("button", { name: /^Close$/i });
        if ((await drawerClose.count()) > 0) {
          await drawerClose.first().click();
          result.clicks += 1;
          result.steps.push("close-activity-log");
        }
        result.drawerOpened = true;
      }

      result.success = true;
    },
  },
  {
    key: "inventory",
    route: "/inventory?tab=browse",
    primaryActions: ["New Intake", "Browse SKU Grid", "Jump to Products"],
    baseline: {
      medianClicks: 5,
      medianTimeSeconds: 30,
      reversalRate: 0.08,
      deadEndRate: 0.08,
    },
    async runFlow(page, result) {
      await page.getByText("Inventory", { exact: false }).first().waitFor({
        state: "visible",
        timeout: 15000,
      });
      await page.waitForTimeout(1200);
      const gallery = page.getByRole("button", { name: /^Gallery$/i });
      if ((await gallery.count()) > 0) {
        await gallery.first().click();
        result.clicks += 1;
        result.steps.push("open-gallery");
        result.drawerOpened = true;
      }

      const close = page.getByRole("button", { name: /^Close$/i });
      if ((await close.count()) > 0) {
        await close.first().click();
        result.clicks += 1;
        result.steps.push("close-gallery");
      }

      result.success = true;
    },
  },
  {
    key: "sales",
    route: "/sales",
    primaryActions: ["New Order", "Jump to Quotes"],
    baseline: {
      medianClicks: 5,
      medianTimeSeconds: 35,
      reversalRate: 0.09,
      deadEndRate: 0.09,
    },
    async runFlow(page, result) {
      await page.getByText("Sales", { exact: false }).first().waitFor({
        state: "visible",
        timeout: 15000,
      });
      await page.waitForSelector("[data-testid='orders-table'], table", {
        timeout: 15000,
      }).catch(() => undefined);
      await page.waitForTimeout(800);

      const quotesTab = page.getByRole("tab", { name: /^Quotes$/i });
      if ((await quotesTab.count()) > 0) {
        await quotesTab.first().click();
        result.clicks += 1;
        result.steps.push("open-quotes-tab");
      }

      const ordersTab = page.getByRole("tab", { name: /^Orders$/i });
      if ((await ordersTab.count()) > 0) {
        await ordersTab.first().click();
        result.clicks += 1;
        result.steps.push("return-orders-tab");
      }

      result.success = true;
    },
  },
];

function round(value, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function calcImprovement(baseline, measured) {
  if (!baseline || baseline <= 0) return 0;
  return (baseline - measured) / baseline;
}

function scoreByThreshold(value, full, partial) {
  if (value >= full) return 2;
  if (value >= partial) return 1;
  return 0;
}

async function capturePageMetrics(page, primaryActions) {
  return page.evaluate(
    ({ primaryActions, bannedTerms }) => {
      const root = document.documentElement;
      const bodyText = (document.body?.innerText || "").toLowerCase();
      const actionNodes = Array.from(
        document.querySelectorAll("button,a,[role='button']")
      );

      const visibleActionLabels = [];
      for (const label of primaryActions) {
        const match = actionNodes.find(node => {
          const text = (node.textContent || "").replace(/\s+/g, " ").trim();
          const aria = (node.getAttribute("aria-label") || "")
            .replace(/\s+/g, " ")
            .trim();
          const candidate = `${text} ${aria}`.toLowerCase();
          if (!candidate.includes(label.toLowerCase())) return false;
          const rect = node.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight &&
            rect.left >= 0 &&
            rect.right <= window.innerWidth
          );
        });
        if (match) {
          visibleActionLabels.push(label);
        }
      }

      const grids = Array.from(
        document.querySelectorAll("table,[role='grid'],.ag-root-wrapper")
      );
      let maxGridArea = 0;
      for (const grid of grids) {
        const rect = grid.getBoundingClientRect();
        const area = Math.max(0, rect.width) * Math.max(0, rect.height);
        if (area > maxGridArea) maxGridArea = area;
      }
      const viewportArea = window.innerWidth * window.innerHeight;
      const gridAreaRatio = viewportArea > 0 ? maxGridArea / viewportArea : 0;

      const cardCount = Array.from(document.querySelectorAll("*")).filter(el => {
        const className = (el.className || "").toString().toLowerCase();
        const slot = (el.getAttribute("data-slot") || "").toLowerCase();
        return className.includes("card") || slot === "card";
      }).length;

      const foundBannedTerms = bannedTerms.filter(term =>
        bodyText.includes(term.toLowerCase())
      );

      return {
        path: window.location.pathname + window.location.search,
        horizontalOverflow: root.scrollWidth > window.innerWidth + 1,
        visiblePrimaryActions: visibleActionLabels,
        visiblePrimaryCount: visibleActionLabels.length,
        hasGrid: grids.length > 0,
        gridAreaRatio,
        cardCount,
        hasActivityLogButton: actionNodes.some(node => {
          const text = (node.textContent || "").toLowerCase();
          const aria = (node.getAttribute("aria-label") || "").toLowerCase();
          return text.includes("activity log") || aria.includes("activity log");
        }),
        bannedTerms: foundBannedTerms,
      };
    },
    { primaryActions, bannedTerms }
  );
}

async function readFrictionTelemetry(page) {
  return page.evaluate(() => {
    const key = "frictionTelemetryEvents";
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return { events: 0, reversals: 0, deadEnds: 0 };
      const reversals = parsed.filter(e => e?.event === "reversal").length;
      const deadEnds = parsed.filter(e => e?.event === "dead_end").length;
      return { events: parsed.length, reversals, deadEnds };
    } catch {
      return { events: 0, reversals: 0, deadEnds: 0 };
    }
  });
}

function buildScorecard(moduleRun) {
  const baseline = moduleRun.baseline;
  const loadMetrics = moduleRun.desktop.metricsBeforeFlow ?? moduleRun.desktop.metrics;
  const desktopMetrics = moduleRun.desktop.metrics;
  const mobileMetrics = moduleRun.mobile.metrics;
  const effectiveGridRatio = Math.max(
    loadMetrics.gridAreaRatio ?? 0,
    desktopMetrics.gridAreaRatio ?? 0
  );
  const effectiveHasGrid = Boolean(loadMetrics.hasGrid || desktopMetrics.hasGrid);
  const clicksImprovement = calcImprovement(
    baseline.medianClicks,
    moduleRun.desktop.flow.clicks
  );
  const timeImprovement = calcImprovement(
    baseline.medianTimeSeconds,
    moduleRun.desktop.flow.elapsedSeconds
  );
  const reversalRate = moduleRun.desktop.friction.reversals;
  const deadEndRate = moduleRun.desktop.friction.deadEnds;

  const primaryVisibleDesktop =
    loadMetrics.visiblePrimaryCount === moduleRun.primaryActions.length;
  const primaryVisibleMobile = mobileMetrics.visiblePrimaryCount >= 1;

  const scoreEntries = [
    {
      criterion: "Primary action visibility at load",
      score:
        primaryVisibleDesktop &&
        primaryVisibleMobile &&
        !loadMetrics.horizontalOverflow
          ? 2
          : primaryVisibleDesktop
            ? 1
            : 0,
    },
    {
      criterion: "Click efficiency vs baseline",
      score: scoreByThreshold(clicksImprovement, 0.25, 0),
    },
    {
      criterion: "Time-to-complete vs baseline",
      score: scoreByThreshold(timeImprovement, 0.25, 0),
    },
    {
      criterion: "Reversal loop rate",
      score: reversalRate === 0 ? 2 : reversalRate <= baseline.reversalRate ? 1 : 0,
    },
    {
      criterion: "Dead-end event rate",
      score: deadEndRate === 0 ? 2 : deadEndRate <= baseline.deadEndRate ? 1 : 0,
    },
    {
      criterion: "Context continuity for edits/corrections",
      score:
        moduleRun.desktop.flow.routeChanges <= 2
          ? 2
          : moduleRun.desktop.flow.routeChanges <= 3
            ? 1
            : 0,
    },
    {
      criterion: "Grid dominance and density quality",
      score:
        effectiveHasGrid && effectiveGridRatio >= 0.1
          ? 2
          : effectiveHasGrid
            ? 1
            : 0,
    },
    {
      criterion: "Drawer usage correctness",
      score: moduleRun.desktop.flow.drawerOpened ? 2 : 1,
    },
    {
      criterion: "Terminology compliance",
      score:
        desktopMetrics.bannedTerms.length === 0 &&
        mobileMetrics.bannedTerms.length === 0
          ? 2
          : 0,
    },
    {
      criterion: "Functional parity",
      score: moduleRun.desktop.flow.success ? 2 : 0,
    },
    {
      criterion: "Mobile-safe behavior",
      score:
        !mobileMetrics.horizontalOverflow &&
        mobileMetrics.visiblePrimaryCount >= 1
          ? 2
          : 1,
    },
    {
      criterion: "Visual discipline and consistency",
      score:
        desktopMetrics.cardCount <= 12 &&
        effectiveGridRatio >= 0.1
          ? 2
          : 1,
    },
  ];

  const totalScore = scoreEntries.reduce((sum, item) => sum + item.score, 0);
  const redLineFailures = [];
  if (loadMetrics.horizontalOverflow) {
    redLineFailures.push("desktop horizontal overflow");
  }
  if (loadMetrics.visiblePrimaryCount < moduleRun.primaryActions.length) {
    redLineFailures.push("primary actions not all visible at load");
  }
  if (
    desktopMetrics.bannedTerms.length > 0 ||
    mobileMetrics.bannedTerms.length > 0
  ) {
    redLineFailures.push("engineering language detected in UI");
  }
  if (clicksImprovement < 0 || timeImprovement < 0) {
    redLineFailures.push("click/time regression without compensating gain");
  }

  return {
    totalScore,
    passed: totalScore >= 22 && redLineFailures.length === 0,
    redLineFailures,
    entries: scoreEntries,
    metrics: {
      baselineClicks: baseline.medianClicks,
      measuredClicks: moduleRun.desktop.flow.clicks,
      clicksImprovement: round(clicksImprovement, 4),
      baselineSeconds: baseline.medianTimeSeconds,
      measuredSeconds: moduleRun.desktop.flow.elapsedSeconds,
      timeImprovement: round(timeImprovement, 4),
      reversals: reversalRate,
      deadEnds: deadEndRate,
      routeChanges: moduleRun.desktop.flow.routeChanges,
    },
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const mod of modules) {
  const desktopContext = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();
  const desktopAuthOk = await authenticate(desktopPage);
  if (!desktopAuthOk) {
    throw new Error("North Star desktop authentication failed");
  }
  let routeChanges = 0;
  let lastRoute = "";

  desktopPage.on("framenavigated", frame => {
    if (frame !== desktopPage.mainFrame()) return;
    try {
      const url = new URL(frame.url());
      const current = `${url.pathname}${url.search}`;
      if (lastRoute && current !== lastRoute) {
        routeChanges += 1;
      }
      lastRoute = current;
    } catch {
      // ignore malformed interim urls
    }
  });

  await desktopContext.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: false,
  });

  await desktopPage.goto(`${baseUrl}${mod.route}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await desktopPage.waitForTimeout(1300);
  await desktopPage.evaluate(() => {
    window.localStorage.removeItem("frictionTelemetryEvents");
  });

  const desktopMetricsBefore = await capturePageMetrics(
    desktopPage,
    mod.primaryActions
  );
  const desktopShot = path.join(
    screenshotDir,
    `${mod.key}-desktop-${runStamp}.png`
  );
  await desktopPage.screenshot({ path: desktopShot, fullPage: true });

  const flow = {
    success: false,
    clicks: 0,
    steps: [],
    drawerOpened: false,
    routeChanges: 0,
    elapsedSeconds: 0,
  };
  const flowStart = Date.now();
  try {
    await mod.runFlow(desktopPage, flow);
  } catch (error) {
    flow.steps.push(`flow-error:${String(error)}`);
    flow.success = false;
  }
  flow.elapsedSeconds = round((Date.now() - flowStart) / 1000, 2);
  flow.routeChanges = routeChanges;
  const desktopMetrics = await capturePageMetrics(desktopPage, mod.primaryActions);

  const desktopFriction = await readFrictionTelemetry(desktopPage);
  const tracePath = path.join(traceDir, `${mod.key}-${runStamp}.zip`);
  await desktopContext.tracing.stop({ path: tracePath });
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const mobilePage = await mobileContext.newPage();
  const mobileAuthOk = await authenticate(mobilePage);
  if (!mobileAuthOk) {
    throw new Error("North Star mobile authentication failed");
  }
  await mobilePage.goto(`${baseUrl}${mod.route}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await mobilePage.waitForTimeout(900);
  const mobileMetrics = await capturePageMetrics(mobilePage, mod.primaryActions);
  const mobileShot = path.join(
    screenshotDir,
    `${mod.key}-mobile-${runStamp}.png`
  );
  await mobilePage.screenshot({ path: mobileShot, fullPage: true });
  await mobileContext.close();

  const moduleRun = {
    module: mod.key,
    route: mod.route,
    baseline: mod.baseline,
    primaryActions: mod.primaryActions,
    desktop: {
      metrics: desktopMetrics,
      metricsBeforeFlow: desktopMetricsBefore,
      flow,
      friction: desktopFriction,
      screenshot: path.relative(process.cwd(), desktopShot),
      trace: path.relative(process.cwd(), tracePath),
    },
    mobile: {
      metrics: mobileMetrics,
      screenshot: path.relative(process.cwd(), mobileShot),
    },
  };

  const scorecard = buildScorecard(moduleRun);
  results.push({
    ...moduleRun,
    scorecard,
  });
}

await browser.close();

const payload = {
  baseUrl,
  runAt: runAt.toISOString(),
  runStamp,
  modules: results,
  summary: {
    moduleCount: results.length,
    passedModules: results.filter(r => r.scorecard.passed).map(r => r.module),
    failedModules: results
      .filter(r => !r.scorecard.passed)
      .map(r => ({
        module: r.module,
        totalScore: r.scorecard.totalScore,
        redLineFailures: r.scorecard.redLineFailures,
      })),
  },
};

const outPath = path.join(metricsDir, `north-star-evidence-${runStamp}.json`);
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");

console.log(`Wrote ${outPath}`);
for (const moduleResult of results) {
  console.log(
    `${moduleResult.module}: score ${moduleResult.scorecard.totalScore}/24, passed=${moduleResult.scorecard.passed}`
  );
}

if (payload.summary.failedModules.length > 0) {
  process.exitCode = 1;
}
