import { execFileSync } from "node:child_process";
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

interface SelectionSnapshot {
  summary: string | null;
  state: string | null;
}

interface SelectionProbeReport {
  baseUrl: string;
  orderId: string;
  draftId: string;
  timestamp: string;
  version: unknown;
  queueRoute: {
    route: string;
    dragRange: SelectionSnapshot;
    discontiguousRange: SelectionSnapshot;
    columnScope: SelectionSnapshot;
    gridScope: SelectionSnapshot;
  };
  documentRoute: {
    route: string;
    shiftRange: SelectionSnapshot;
  };
  supportSurface: {
    visibleCellCount: number;
    focusedSelection: SelectionSnapshot | null;
  };
  screenshotPaths: string[];
  licenseWarnings: string[];
  agGridWarnings: string[];
  pageErrors: string[];
}

const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ??
  "https://terp-staging-yicld.ondigitalocean.app";

const orderId = getEnvOrDefault("PLAYWRIGHT_ORDERS_ORDER_ID", "627");
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

const selectionModifierKey = process.platform === "darwin" ? "Meta" : "Control";

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

async function capturePage(
  page: Page,
  fileName: string,
  screenshotPaths: string[]
) {
  const screenshotPath = path.join(outputDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  screenshotPaths.push(screenshotPath);
  return screenshotPath;
}

async function readSelectionSnapshot(
  page: Page,
  summaryTestId: string,
  stateTestId: string
): Promise<SelectionSnapshot> {
  const summary = page.locator(`[data-testid="${summaryTestId}"]`).first();
  const state = page.locator(`[data-testid="${stateTestId}"]`).first();
  return {
    summary: await summary.innerText().catch(() => null),
    state: await state.innerText().catch(() => null),
  };
}

function getQueueCell(page: Page, columnKey: string, rowIndex: number) {
  return page
    .locator(
      `[data-powersheet-surface-id="orders-queue"] [col-id="${columnKey}"][role="gridcell"]`
    )
    .nth(rowIndex);
}

function getQueueHeader(page: Page, columnKey: string) {
  return page
    .locator(
      `[data-powersheet-surface-id="orders-queue"] .ag-header-cell[col-id="${columnKey}"]`
    )
    .first();
}

function getSupportCell(page: Page, columnKey: string, rowIndex: number) {
  return page
    .locator(
      `[data-powersheet-surface-id="orders-support-grid"] [col-id="${columnKey}"][role="gridcell"]`
    )
    .nth(rowIndex);
}

function getDocumentCell(page: Page, columnKey: string, rowIndex: number) {
  return page.locator(`[col-id="${columnKey}"][role="gridcell"]`).nth(rowIndex);
}

async function focusCell(cell: Locator, page: Page) {
  await cell.waitFor({ state: "visible", timeout: 30000 });
  await cell.click();
  await page.waitForTimeout(400);
}

async function dragBetween(page: Page, from: Locator, to: Locator) {
  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();
  if (!fromBox || !toBox) {
    throw new Error("Missing bounding box for drag selection probe.");
  }

  await page.mouse.move(
    fromBox.x + Math.max(6, fromBox.width * 0.2),
    fromBox.y + fromBox.height * 0.5
  );
  await page.mouse.down();
  await page.mouse.move(
    toBox.x + toBox.width * 0.8,
    toBox.y + toBox.height * 0.5,
    {
      steps: 20,
    }
  );
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(700);
}

async function selectQueueDragRange(page: Page) {
  await dragBetween(
    page,
    getQueueCell(page, "stageLabel", 0),
    getQueueCell(page, "clientName", 2)
  );
  return readSelectionSnapshot(
    page,
    "orders-queue-selection-summary",
    "orders-queue-selection-state"
  );
}

async function selectQueueDiscontiguousRange(page: Page) {
  await focusCell(getQueueCell(page, "stageLabel", 0), page);
  await page.keyboard.down(selectionModifierKey);
  await getQueueCell(page, "stageLabel", 1).click();
  await page.keyboard.up(selectionModifierKey);
  await page.waitForTimeout(700);
  return readSelectionSnapshot(
    page,
    "orders-queue-selection-summary",
    "orders-queue-selection-state"
  );
}

async function selectQueueColumnScope(page: Page) {
  const header = getQueueHeader(page, "stageLabel");
  await header.waitFor({ state: "visible", timeout: 30000 });
  await header.click();
  await page.waitForTimeout(700);
  return readSelectionSnapshot(
    page,
    "orders-queue-selection-summary",
    "orders-queue-selection-state"
  );
}

async function selectQueueGridScope(page: Page) {
  await focusCell(getQueueCell(page, "orderNumber", 0), page);
  await page.keyboard.press(`${selectionModifierKey}+A`);
  await page.waitForTimeout(700);
  return readSelectionSnapshot(
    page,
    "orders-queue-selection-summary",
    "orders-queue-selection-state"
  );
}

async function selectDocumentShiftRange(page: Page) {
  const firstCell = getDocumentCell(page, "quantity", 0);
  const thirdCell = getDocumentCell(page, "quantity", 2);
  await focusCell(firstCell, page);
  await page.keyboard.down("Shift");
  await thirdCell.click();
  await page.keyboard.up("Shift");
  await page.waitForTimeout(700);

  const snapshot = await readSelectionSnapshot(
    page,
    "orders-document-grid-selection-summary",
    "orders-document-grid-selection-state"
  );

  if (
    snapshot.summary?.includes("3 selected cells") ||
    snapshot.summary?.includes("4 selected cells")
  ) {
    return snapshot;
  }

  await focusCell(firstCell, page);
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(700);

  return readSelectionSnapshot(
    page,
    "orders-document-grid-selection-summary",
    "orders-document-grid-selection-state"
  );
}

async function captureSupportSurface(page: Page) {
  const cells = page.locator(
    '[data-powersheet-surface-id="orders-support-grid"] [role="gridcell"]'
  );
  const visibleCellCount = await cells.count();
  if (visibleCellCount === 0) {
    return {
      visibleCellCount,
      focusedSelection: null,
    };
  }

  await focusCell(getSupportCell(page, "productDisplayName", 0), page);
  return {
    visibleCellCount,
    focusedSelection: await readSelectionSnapshot(
      page,
      "orders-support-grid-selection-summary",
      "orders-support-grid-selection-state"
    ),
  };
}

function resolveDeployCommit() {
  const explicitCommit = getEnvOrDefault("PLAYWRIGHT_DEPLOY_COMMIT", "").trim();
  if (explicitCommit) {
    return explicitCommit;
  }

  try {
    return execFileSync("git", ["rev-parse", "origin/main"], {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: {
        width: 1600,
        height: 1400,
      },
      permissions: ["clipboard-read", "clipboard-write"],
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
      const screenshotPaths: string[] = [];
      page.on("console", msg => consoleMessages.push(msg.text()));
      page.on("pageerror", error => pageErrors.push(error.message));

      try {
        const queueRoute = `${baseUrl}/sales?tab=orders&surface=sheet-native&orderId=${orderId}`;
        await page.goto(queueRoute, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page.waitForTimeout(12000);

        const queueDragRange = await selectQueueDragRange(page);
        const queueDiscontiguousRange = await selectQueueDiscontiguousRange(page);
        const queueColumnScope = await selectQueueColumnScope(page);
        const queueGridScope = await selectQueueGridScope(page);
        const supportSurface = await captureSupportSurface(page);
        await capturePage(page, "orders-runtime-selection-queue-probe.png", screenshotPaths);

        const documentRoute = `${baseUrl}/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=${draftId}`;
        await page.goto(documentRoute, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page.waitForTimeout(12000);

        const documentShiftRange = await selectDocumentShiftRange(page);
        await capturePage(page, "orders-runtime-selection-document-probe.png", screenshotPaths);

        const report: SelectionProbeReport = {
          baseUrl,
          orderId,
          draftId,
          timestamp: new Date().toISOString(),
          version,
          queueRoute: {
            route: queueRoute,
            dragRange: queueDragRange,
            discontiguousRange: queueDiscontiguousRange,
            columnScope: queueColumnScope,
            gridScope: queueGridScope,
          },
          documentRoute: {
            route: documentRoute,
            shiftRange: documentShiftRange,
          },
          supportSurface,
          screenshotPaths,
          licenseWarnings: collectLicenseWarnings(consoleMessages),
          agGridWarnings: collectAgGridWarnings(consoleMessages),
          pageErrors,
        };

        const reportPath = path.join(outputDir, "orders-runtime-selection-report.json");
        writeFileSync(reportPath, JSON.stringify(report, null, 2));
        const closurePacketPath = path.join(
          outputDir,
          "orders-runtime-selection-closure-packet.json"
        );
        const closurePacket = buildSelectionClosurePacket({
          report,
          reportPath,
          deployCommit: resolveDeployCommit(),
          persona: "sales-manager",
        });
        writeFileSync(closurePacketPath, JSON.stringify(closurePacket, null, 2));
        console.info(
          JSON.stringify({ reportPath, closurePacketPath, report, closurePacket }, null, 2)
        );

        const blockingAssertion = closurePacket.assertions.find(
          assertion => !assertion.passed && assertion.failure_impact === "blocker"
        );
        if (blockingAssertion) {
          throw new Error(
            `Selection probe failed at ${blockingAssertion.id}: ${JSON.stringify(
              blockingAssertion.observed
            )}`
          );
        }
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

await main();
