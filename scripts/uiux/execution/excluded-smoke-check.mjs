#!/usr/bin/env node
/* global process, console */

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

function safeRouteName(route) {
  const trimmed = route.replace(/^\/+/, "") || "root";
  return trimmed.replace(/[^a-zA-Z0-9]+/g, "-").replace(/-+/g, "-");
}

async function authenticate(page, baseUrl, username, password) {
  const attempts = [
    {
      url: `${baseUrl}/api/auth/login`,
      body: { username, password },
    },
    {
      url: `${baseUrl}/api/qa-auth/login`,
      body: { email: username, password },
    },
  ];

  for (const attempt of attempts) {
    try {
      const response = await page.request.post(attempt.url, {
        data: attempt.body,
      });
      if (response.ok()) return true;
    } catch {
      // Try next auth mechanism.
    }
  }

  return false;
}

const baseUrl =
  getCliArgValue("base-url") ||
  process.env.BASE_URL ||
  "http://127.0.0.1:3015";
const outputDir = path.resolve(
  getCliArgValue("output-dir") || ".qa/excluded-smoke-output"
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

const routes = [
  "/vip-portal/login",
  "/vip-portal/dashboard",
  "/vip-portal/auth/impersonate",
  "/vip-portal/session-ended",
  "/live-shopping",
];

const viewports = [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

fs.mkdirSync(outputDir, { recursive: true });

const report = {
  runAt: new Date().toISOString(),
  baseUrl,
  routes,
  viewports: viewports.map(v => v.name),
  results: [],
  failures: [],
};

const browser = await chromium.launch({ headless: true });

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  const authOk = await authenticate(page, baseUrl, authUsername, authPassword);

  for (const route of routes) {
    const screenshotName = `${viewport.name}-${safeRouteName(route)}.png`;
    const screenshotPath = path.join(outputDir, screenshotName);
    const targetUrl = `${baseUrl}${route}`;
    try {
      const response = await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(700);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const status = response?.status() ?? null;
      const finalUrl = page.url();
      const pageTitle = await page.title();
      const heading = await page
        .locator("h1")
        .first()
        .textContent()
        .then(value => (value || "").trim())
        .catch(() => "");

      const result = {
        viewport: viewport.name,
        route,
        targetUrl,
        finalUrl,
        status,
        authOk,
        pageTitle,
        heading,
        screenshot: screenshotPath,
        pass: status === null ? true : status < 500,
      };

      report.results.push(result);
      if (!result.pass) {
        report.failures.push(result);
      }
    } catch (error) {
      const result = {
        viewport: viewport.name,
        route,
        targetUrl,
        authOk,
        screenshot: screenshotPath,
        pass: false,
        error: error instanceof Error ? error.message : String(error),
      };
      report.results.push(result);
      report.failures.push(result);
    }
  }

  await context.close();
}

await browser.close();

const reportPath = path.join(outputDir, "excluded-smoke-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log(`Wrote ${reportPath}`);
console.log(`Failures: ${report.failures.length}`);

if (report.failures.length > 0) {
  process.exitCode = 1;
}
