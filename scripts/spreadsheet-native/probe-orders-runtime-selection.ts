import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  chromium,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { QA_PASSWORD } from "../../tests-e2e/fixtures/auth";
import { getEnvOrDefault, loadCodexEnv } from "./qaEnv";
import { buildSelectionClosurePacket } from "./orders-runtime-closure-packet.mjs";

loadCodexEnv();

interface PersonaConfig {
  email: string;
  password: string;
}

interface SelectionProbeReport {
  baseUrl: string;
  timestamp: string;
  version: unknown;
  queueRoute: string;
  documentRoute: string;
  queueSelectionStateAfterShiftRange: string | null;
  queueSelectionSummaryAfterShiftRange: string | null;
  queueSelectionStateAfterDiscontiguous: string | null;
  queueSelectionSummaryAfterDiscontiguous: string | null;
  queueSelectionStateAfterSelectAll: string | null;
  queueSelectionSummaryAfterSelectAll: string | null;
  documentSelectionStateAfterShiftRange: string | null;
  documentSelectionSummaryAfterShiftRange: string | null;
  queueScreenshotPath: string;
  documentScreenshotPath: string;
  licenseWarnings: string[];
  agGridWarnings: string[];
  pageErrors: string[];
}

const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ??
  "https://terp-staging-yicld.ondigitalocean.app";

const draftId = getEnvOrDefault(
  "PLAYWRIGHT_ORDERS_DRAFT_ID",
  getEnvOrDefault("ORDERS_RUNTIME_DRAFT_ID", "618")
);

const salesManager: PersonaConfig = {
  email: getEnvOrDefault(
    "E2E_SALES_MANAGER_USERNAME",
    "qa.salesmanager@terp.test"
  ),
  password: getEnvOrDefault(
    "E2E_SALES_MANAGER_PASSWORD",
    getEnvOrDefault("E2E_PASSWORD", QA_PASSWORD)
  ),
};

const dateStamp = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
}).format(new Date());

const outputDir = path.resolve(
  process.cwd(),
  "output/playwright/orders-runtime-g2",
  dateStamp
);

function collectLicenseWarnings(messages: string[]) {
  return messages.filter(message => /license|watermark/i.test(message));
}

function collectAgGridWarnings(messages: string[]) {
  return messages.filter(message => /ag grid/i.test(message));
}

async function login(context: BrowserContext, persona: PersonaConfig) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    data: {
      username: persona.email,
      password: persona.password,
    },
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok()) {
    throw new Error(
      `Login failed for ${persona.email}: ${response.status()} ${await response.text()}`
    );
  }
}

function getGridCell(page: Page, columnKey: string, rowIndex = 0) {
  return page.locator(`[col-id="${columnKey}"][role="gridcell"]`).nth(rowIndex);
}

async function focusGridCell(page: Page, columnKey: string, rowIndex = 0) {
  const cell = getGridCell(page, columnKey, rowIndex);
  await cell.waitFor({ state: "visible", timeout: 30000 });
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  await page.waitForTimeout(400);
  return cell;
}

async function readByTestId(page: Page, testId: string) {
  const target = page.locator(`[data-testid="${testId}"]`).first();
  if ((await target.count()) === 0) {
    return null;
  }
  return (await target.innerText()).trim();
}

async function readQueueSelectionState(page: Page) {
  return readByTestId(page, "orders-queue-selection-state");
}

async function readQueueSelectionSummary(page: Page) {
  return readByTestId(page, "orders-queue-selection-summary");
}

async function readDocumentSelectionState(page: Page) {
  return readByTestId(page, "orders-document-grid-selection-state");
}

async function readDocumentSelectionSummary(page: Page) {
  return readByTestId(page, "orders-document-grid-selection-summary");
}

async function selectShiftRange(
  page: Page,
  columnKey: string,
  startRowIndex: number,
  endRowIndex: number,
  readState: (page: Page) => Promise<string | null>,
  readSummaryFn: (page: Page) => Promise<string | null>
) {
  await focusGridCell(page, columnKey, startRowIndex);
  await page.keyboard.down("Shift");
  await focusGridCell(page, columnKey, endRowIndex);
  await page.keyboard.up("Shift");
  await page.waitForTimeout(500);

  let state = await readState(page);
  let summary = await readSummaryFn(page);
  if (/\b2 selected cells\b/i.test(summary ?? "")) {
    return { state, summary };
  }

  await focusGridCell(page, columnKey, startRowIndex);
  await page.keyboard.down("Shift");
  for (
    let currentRowIndex = startRowIndex;
    currentRowIndex < endRowIndex;
    currentRowIndex += 1
  ) {
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
  }
  await page.keyboard.up("Shift");
  await page.waitForTimeout(500);

  state = await readState(page);
  summary = await readSummaryFn(page);
  return { state, summary };
}

async function cmdClickCell(page: Page, locator: Locator) {
  await locator.waitFor({ state: "visible", timeout: 30000 });
  await locator.scrollIntoViewIfNeeded();
  await page.keyboard.down("Meta");
  try {
    await locator.click();
  } finally {
    await page.keyboard.up("Meta");
  }
  await page.waitForTimeout(500);
}

async function capturePage(page: Page, fileName: string) {
  const screenshotPath = path.join(outputDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function runQueueSelectionChecks(page: Page) {
  const shiftRange = await selectShiftRange(
    page,
    "orderNumber",
    0,
    1,
    readQueueSelectionState,
    readQueueSelectionSummary
  );

  await cmdClickCell(page, getGridCell(page, "orderNumber", 2));
  const discontiguousState = await readQueueSelectionState(page);
  const discontiguousSummary = await readQueueSelectionSummary(page);

  await focusGridCell(page, "orderNumber", 0);
  await page.keyboard.press("Meta+A");
  await page.waitForTimeout(600);
  const selectAllState = await readQueueSelectionState(page);
  const selectAllSummary = await readQueueSelectionSummary(page);

  return {
    shiftRange,
    discontiguousState,
    discontiguousSummary,
    selectAllState,
    selectAllSummary,
  };
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const queueRoute = `${baseUrl}/sales?tab=orders&surface=sheet-native&orderId=627`;
  const documentRoute = `${baseUrl}/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=${draftId}`;

  try {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1400 },
    });

    try {
      await login(context, salesManager);
      const version = await context.request
        .get(`${baseUrl}/version.json`)
        .then(response => response.json())
        .catch(() => null);

      const page = await context.newPage();
      const consoleMessages: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", msg => consoleMessages.push(msg.text()));
      page.on("pageerror", error => pageErrors.push(error.message));

      try {
        await page.goto(queueRoute, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page.waitForTimeout(15000);

        const queueChecks = await runQueueSelectionChecks(page);
        const queueScreenshotPath = await capturePage(
          page,
          "orders-runtime-selection-queue.png"
        );

        await page.goto(documentRoute, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page.waitForTimeout(15000);

        const documentShiftRange = await selectShiftRange(
          page,
          "quantity",
          0,
          1,
          readDocumentSelectionState,
          readDocumentSelectionSummary
        );
        const documentScreenshotPath = await capturePage(
          page,
          "orders-runtime-selection-document.png"
        );

        const report: SelectionProbeReport = {
          baseUrl,
          timestamp: new Date().toISOString(),
          version,
          queueRoute,
          documentRoute,
          queueSelectionStateAfterShiftRange: queueChecks.shiftRange.state,
          queueSelectionSummaryAfterShiftRange: queueChecks.shiftRange.summary,
          queueSelectionStateAfterDiscontiguous: queueChecks.discontiguousState,
          queueSelectionSummaryAfterDiscontiguous:
            queueChecks.discontiguousSummary,
          queueSelectionStateAfterSelectAll: queueChecks.selectAllState,
          queueSelectionSummaryAfterSelectAll: queueChecks.selectAllSummary,
          documentSelectionStateAfterShiftRange: documentShiftRange.state,
          documentSelectionSummaryAfterShiftRange: documentShiftRange.summary,
          queueScreenshotPath,
          documentScreenshotPath,
          licenseWarnings: collectLicenseWarnings(consoleMessages),
          agGridWarnings: collectAgGridWarnings(consoleMessages),
          pageErrors,
        };

        const reportPath = path.join(
          outputDir,
          "orders-runtime-selection-report.json"
        );
        writeFileSync(reportPath, JSON.stringify(report, null, 2));

        const closurePacket = buildSelectionClosurePacket({
          report,
          reportPath,
          deployCommit:
            typeof version === "object" && version && "commit" in version
              ? String((version as { commit?: string }).commit ?? "")
              : null,
        });
        const packetPath = path.join(
          outputDir,
          "orders-runtime-selection-closure-packet.json"
        );
        writeFileSync(packetPath, JSON.stringify(closurePacket, null, 2));

        if (closurePacket.suggested_verdict !== "closed with evidence") {
          throw new Error(
            `Selection probe failed: queueRange=${report.queueSelectionSummaryAfterShiftRange ?? "none"}; queueDiscontiguous=${report.queueSelectionSummaryAfterDiscontiguous ?? "none"}; queueScope=${report.queueSelectionSummaryAfterSelectAll ?? "none"}; documentRange=${report.documentSelectionSummaryAfterShiftRange ?? "none"}`
          );
        }

        console.info(
          JSON.stringify(
            {
              reportPath,
              packetPath,
              queueSummaryAfterShiftRange:
                report.queueSelectionSummaryAfterShiftRange,
              queueSummaryAfterDiscontiguous:
                report.queueSelectionSummaryAfterDiscontiguous,
              queueSummaryAfterSelectAll:
                report.queueSelectionSummaryAfterSelectAll,
              documentSummaryAfterShiftRange:
                report.documentSelectionSummaryAfterShiftRange,
            },
            null,
            2
          )
        );
      } finally {
        await page.close();
      }
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
