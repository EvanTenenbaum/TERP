#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3015";
const outputPath =
  process.env.OUTPUT_PATH || "docs/uiux-redesign/P4_ROUTE_AUDIT.json";
const authUsername =
  process.env.E2E_ADMIN_USERNAME ||
  process.env.UIUX_AUDIT_USERNAME ||
  "qa.superadmin@terp.test";
const authPassword =
  process.env.E2E_ADMIN_PASSWORD ||
  process.env.E2E_PASSWORD ||
  process.env.UIUX_AUDIT_PASSWORD ||
  "TerpQA2026!";

const routes = [
  "/purchase-orders",
  "/direct-intake",
  "/inventory",
  "/sales",
  "/relationships",
  "/demand-supply",
  "/credits",
  "/orders",
  "/accounting/invoices",
  "/pick-pack",
];

const viewports = [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const primaryRegex =
  /(create|new|receive|review|save|intake|order|quote|invoice|add|refresh|issue|show|pack|ship|confirm|submit|apply)/i;

function toErrorString(error) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
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

const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  const authenticated = await authenticate(page);
  if (!authenticated) {
    results.push({
      viewport: viewport.name,
      route: "*",
      error: "Authentication failed for route audit context",
    });
    await context.close();
    continue;
  }

  for (const route of routes) {
    const url = `${baseUrl}${route}`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(900);

      const metric = await page.evaluate(regexSource => {
        const regex = new RegExp(regexSource, "i");
        const root = document.documentElement;
        const main = document.querySelector("main");
        const header = document.querySelector("header");
        const actionNodes = Array.from(
          document.querySelectorAll("button,a,[role='button']")
        );
        const candidates = actionNodes.filter(node => {
          const text = (node.textContent || "").trim();
          const aria = (node.getAttribute("aria-label") || "").trim();
          return regex.test(text) || regex.test(aria);
        });

        const inViewport = el => {
          const rect = el.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight &&
            rect.left >= 0 &&
            rect.right <= window.innerWidth
          );
        };

        const visibleCandidates = candidates
          .filter(inViewport)
          .map(el => (el.textContent || "").trim().replace(/\s+/g, " "));

        return {
          path: window.location.pathname,
          horizontalOverflow: root.scrollWidth > window.innerWidth + 1,
          viewportWidth: window.innerWidth,
          docWidth: root.scrollWidth,
          mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
          headerWidth: header
            ? Math.round(header.getBoundingClientRect().width)
            : null,
          candidateActionCount: candidates.length,
          visibleActionCount: visibleCandidates.length,
          visibleActions: visibleCandidates.slice(0, 8),
        };
      }, primaryRegex.source);

      results.push({ viewport: viewport.name, route, ...metric });
    } catch (error) {
      results.push({
        viewport: viewport.name,
        route,
        error: toErrorString(error),
      });
    }
  }

  await context.close();
}

await browser.close();

const failures = results.filter(
  result =>
    Boolean(result.error) ||
    result.horizontalOverflow === true ||
    result.visibleActionCount === 0
);

const payload = {
  baseUrl,
  routeCount: routes.length,
  viewportCount: viewports.length,
  runAt: new Date().toISOString(),
  results,
  failures,
  failureCount: failures.length,
};

const resolvedOutputPath = path.resolve(outputPath);
fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
fs.writeFileSync(resolvedOutputPath, JSON.stringify(payload, null, 2));

console.log(`Wrote ${resolvedOutputPath}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  process.exitCode = 1;
}
