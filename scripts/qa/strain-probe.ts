#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page, type Response } from "@playwright/test";

import { loginAsAdmin } from "../../tests-e2e/fixtures/auth.ts";
import { loadCodexEnv } from "../spreadsheet-native/qaEnv.ts";

loadCodexEnv();

interface TrpcCapture {
  procedure: string;
  url: string;
  status: number;
  ok: boolean;
  body: unknown;
  capturedAt: string;
}

interface ProbeReport {
  baseUrl: string;
  probeName: string;
  outputDir: string;
  createdAt: string;
  createResponse: TrpcCapture;
  initialListResponse: TrpcCapture;
  postCreateListResponse: TrpcCapture | null;
  reloadListResponse: TrpcCapture;
  hardReloadListResponse: TrpcCapture;
  delayedReloadListResponse: TrpcCapture | null;
  uiVisibleAfterCreate: boolean;
  uiVisibleAfterRouteReturn: boolean;
  uiVisibleAfterHardReload: boolean;
  uiVisibleAfterDelay: boolean | null;
  responseContainsProbe: {
    initialList: boolean;
    postCreateList: boolean | null;
    reloadList: boolean;
    hardReloadList: boolean;
    delayedReloadList: boolean | null;
  };
  emptyStateVisibleAfterRouteReturn: boolean;
  emptyStateVisibleAfterHardReload: boolean;
  screenshots: {
    afterCreate: string;
    afterRouteReturn: string;
    afterHardReload: string;
    afterDelay?: string;
  };
  consoleMessages: string[];
  pageErrors: string[];
  responseUrlsSeen: string[];
}

const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ??
  "https://terp-staging-yicld.ondigitalocean.app";

function createRunId(): string {
  return `strain-probe-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

async function readResponse(
  procedure: string,
  response: Response
): Promise<TrpcCapture> {
  const text = await response.text();

  let body: unknown = text;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    body = text;
  }

  return {
    procedure,
    url: response.url(),
    status: response.status(),
    ok: response.ok(),
    body,
    capturedAt: new Date().toISOString(),
  };
}

async function waitForTrpcResponse(
  page: Page,
  procedure: string,
  trigger: () => Promise<unknown>
): Promise<TrpcCapture> {
  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes("/api/trpc/") &&
      response.url().includes(procedure),
    { timeout: 30_000 }
  );

  await trigger();
  const response = await responsePromise;
  return readResponse(procedure, response);
}

function responseContainsProbe(body: unknown, probeName: string): boolean {
  return JSON.stringify(body).includes(probeName);
}

async function isProbeVisible(page: Page, probeName: string): Promise<boolean> {
  const matchingRows = page
    .locator('[data-testid="strain-row"]')
    .filter({ hasText: probeName });

  if ((await matchingRows.count()) > 0) {
    return true;
  }

  const matchingCells = page.locator("table").filter({ hasText: probeName });
  return (await matchingCells.count()) > 0;
}

async function isEmptyStateVisible(page: Page): Promise<boolean> {
  const emptyState = page.getByText("No strains found");
  return emptyState.isVisible().catch(() => false);
}

async function saveScreenshot(
  page: Page,
  outputDir: string,
  fileName: string
): Promise<string> {
  const screenshotPath = path.join(outputDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function searchForProbe(page: Page, probeName: string): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Search strains" i]');
  await searchInput.fill(probeName);
  await page.waitForTimeout(800);
}

async function main() {
  process.env.PLAYWRIGHT_BASE_URL = baseUrl;

  const outputDir = path.join(
    process.cwd(),
    "qa-results",
    "strain-probe",
    createRunId()
  );
  mkdirSync(outputDir, { recursive: true });

  const probeName = `QA Probe Strain ${Date.now()}`;
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  const responseUrlsSeen: string[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: baseUrl,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  page.on("console", message => {
    consoleMessages.push(`[${message.type()}] ${message.text()}`);
  });
  page.on("pageerror", error => {
    pageErrors.push(error.message);
  });
  page.on("response", response => {
    if (response.url().includes("/api/trpc/")) {
      responseUrlsSeen.push(response.url());
    }
  });

  try {
    await loginAsAdmin(page);

    const initialListResponse = await waitForTrpcResponse(
      page,
      "strains.list",
      async () => {
        await page.goto(`${baseUrl}/products`, {
          waitUntil: "domcontentloaded",
        });
      }
    );
    await page.waitForLoadState("networkidle");

    await page.getByTestId("create-strain").click();
    await page.locator('input[name="name"]').fill(probeName);
    await page.getByTestId("strain-type").click();
    await page.getByRole("option", { name: "Indica" }).click();

    const createResponsePromise = page.waitForResponse(
      response =>
        response.url().includes("/api/trpc/") &&
        response.url().includes("strains.create"),
      { timeout: 30_000 }
    );
    const postCreateListResponsePromise = page
      .waitForResponse(
        response =>
          response.url().includes("/api/trpc/") &&
          response.url().includes("strains.list"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    await page
      .locator('button[type="submit"]')
      .filter({ hasText: "Create Strain" })
      .click();

    const createResponse = await readResponse(
      "strains.create",
      await createResponsePromise
    );
    const postCreateListResponseRaw = await postCreateListResponsePromise;
    const postCreateListResponse = postCreateListResponseRaw
      ? await readResponse("strains.list", postCreateListResponseRaw)
      : null;

    await page.waitForLoadState("networkidle");
    await searchForProbe(page, probeName);
    const uiVisibleAfterCreate = await isProbeVisible(page, probeName);
    const afterCreateScreenshot = await saveScreenshot(
      page,
      outputDir,
      "after-create.png"
    );

    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const reloadListResponse = await waitForTrpcResponse(
      page,
      "strains.list",
      async () => {
        await page.goto(`${baseUrl}/products`, {
          waitUntil: "domcontentloaded",
        });
      }
    );
    await page.waitForLoadState("networkidle");
    await searchForProbe(page, probeName);
    const uiVisibleAfterRouteReturn = await isProbeVisible(page, probeName);
    const emptyStateVisibleAfterRouteReturn = await isEmptyStateVisible(page);
    const afterRouteReturnScreenshot = await saveScreenshot(
      page,
      outputDir,
      "after-route-return.png"
    );

    const hardReloadListResponse = await waitForTrpcResponse(
      page,
      "strains.list",
      async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
      }
    );
    await page.waitForLoadState("networkidle");
    await searchForProbe(page, probeName);
    const uiVisibleAfterHardReload = await isProbeVisible(page, probeName);
    const emptyStateVisibleAfterHardReload = await isEmptyStateVisible(page);
    const afterHardReloadScreenshot = await saveScreenshot(
      page,
      outputDir,
      "after-hard-reload.png"
    );

    let delayedReloadListResponse: TrpcCapture | null = null;
    let uiVisibleAfterDelay: boolean | null = null;
    let afterDelayScreenshot: string | undefined;

    if (
      !uiVisibleAfterHardReload &&
      !responseContainsProbe(hardReloadListResponse.body, probeName)
    ) {
      await page.waitForTimeout(15_000);
      delayedReloadListResponse = await waitForTrpcResponse(
        page,
        "strains.list",
        async () => {
          await page.reload({ waitUntil: "domcontentloaded" });
        }
      );
      await page.waitForLoadState("networkidle");
      await searchForProbe(page, probeName);
      uiVisibleAfterDelay = await isProbeVisible(page, probeName);
      afterDelayScreenshot = await saveScreenshot(
        page,
        outputDir,
        "after-delay.png"
      );
    }

    const report: ProbeReport = {
      baseUrl,
      probeName,
      outputDir,
      createdAt: new Date().toISOString(),
      createResponse,
      initialListResponse,
      postCreateListResponse,
      reloadListResponse,
      hardReloadListResponse,
      delayedReloadListResponse,
      uiVisibleAfterCreate,
      uiVisibleAfterRouteReturn,
      uiVisibleAfterHardReload,
      uiVisibleAfterDelay,
      responseContainsProbe: {
        initialList: responseContainsProbe(initialListResponse.body, probeName),
        postCreateList: postCreateListResponse
          ? responseContainsProbe(postCreateListResponse.body, probeName)
          : null,
        reloadList: responseContainsProbe(reloadListResponse.body, probeName),
        hardReloadList: responseContainsProbe(
          hardReloadListResponse.body,
          probeName
        ),
        delayedReloadList: delayedReloadListResponse
          ? responseContainsProbe(delayedReloadListResponse.body, probeName)
          : null,
      },
      emptyStateVisibleAfterRouteReturn,
      emptyStateVisibleAfterHardReload,
      screenshots: {
        afterCreate: afterCreateScreenshot,
        afterRouteReturn: afterRouteReturnScreenshot,
        afterHardReload: afterHardReloadScreenshot,
        afterDelay: afterDelayScreenshot,
      },
      consoleMessages,
      pageErrors,
      responseUrlsSeen,
    };

    writeFileSync(
      path.join(outputDir, "report.json"),
      `${JSON.stringify(report, null, 2)}\n`
    );

    const summaryLines = [
      "# Strain Probe",
      "",
      `- Probe name: \`${probeName}\``,
      `- Base URL: \`${baseUrl}\``,
      `- Output dir: \`${outputDir}\``,
      `- UI visible after create: \`${uiVisibleAfterCreate}\``,
      `- UI visible after route return: \`${uiVisibleAfterRouteReturn}\``,
      `- UI visible after hard reload: \`${uiVisibleAfterHardReload}\``,
      `- UI visible after delay: \`${String(uiVisibleAfterDelay)}\``,
      `- List response contains probe after route return: \`${report.responseContainsProbe.reloadList}\``,
      `- List response contains probe after hard reload: \`${report.responseContainsProbe.hardReloadList}\``,
      `- Empty state visible after route return: \`${emptyStateVisibleAfterRouteReturn}\``,
      `- Empty state visible after hard reload: \`${emptyStateVisibleAfterHardReload}\``,
      "",
    ];

    writeFileSync(
      path.join(outputDir, "summary.md"),
      `${summaryLines.join("\n")}\n`
    );

    console.info(summaryLines.join("\n"));
  } finally {
    await context.close();
    await browser.close();
  }
}

await main();
