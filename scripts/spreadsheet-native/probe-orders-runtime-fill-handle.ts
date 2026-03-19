import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { QA_PASSWORD } from "../../tests-e2e/fixtures/auth";
import { getEnvOrDefault, loadCodexEnv } from "./qaEnv";
import { buildFillHandleClosurePacket } from "./orders-runtime-closure-packet.mjs";

loadCodexEnv();

interface PersonaConfig {
  email: string;
  password: string;
}

interface FillHandleProbeReport {
  baseUrl: string;
  draftId: string;
  route: string;
  timestamp: string;
  version: unknown;
  selectionSummaryBeforeDrag: string | null;
  selectionStateBeforeDrag: string | null;
  selectionSummaryAfterDrag: string | null;
  selectionStateAfterDrag: string | null;
  fillHandleVisible: boolean;
  bodyClassDuringDrag: string | null;
  quantityValuesBeforeDrag: string[];
  quantityValuesAfterDrag: string[];
  dragApplied: boolean;
  screenshotPath: string;
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

function getGridCell(page: Page, columnKey: string, rowIndex = 0) {
  return page.locator(`[col-id="${columnKey}"][role="gridcell"]`).nth(rowIndex);
}

async function focusGridCell(page: Page, columnKey: string, rowIndex = 0) {
  const cell = getGridCell(page, columnKey, rowIndex);
  await cell.waitFor({ state: "visible", timeout: 30000 });
  await cell.click();
  await page.waitForTimeout(400);
  return cell;
}

async function readSelectionState(page: Page) {
  const state = page
    .locator('[data-testid="orders-document-grid-selection-state"]')
    .first();
  if ((await state.count()) === 0) {
    return null;
  }

  return (await state.innerText()).trim();
}

async function readSelectionSummary(page: Page) {
  const summary = page
    .locator('[data-testid="orders-document-grid-selection-summary"]')
    .first();
  if ((await summary.count()) === 0) {
    return null;
  }

  return (await summary.innerText()).trim();
}

async function readGridCellText(page: Page, columnKey: string, rowIndex = 0) {
  return (await getGridCell(page, columnKey, rowIndex).innerText()).trim();
}

function getSelectedCellCount(selectionSummary: string | null) {
  if (!selectionSummary) {
    return null;
  }

  const matched = selectionSummary.match(/(\d+) selected cells/i);
  return matched ? Number(matched[1]) : null;
}

async function readQuantityValues(page: Page) {
  const values: string[] = [];
  for (const rowIndex of [0, 1, 2, 3]) {
    values.push(await readGridCellText(page, "quantity", rowIndex));
  }
  return values;
}

async function selectQuantityRange(
  page: Page,
  startRowIndex: number,
  endRowIndex: number
) {
  await focusGridCell(page, "quantity", startRowIndex);
  await page.keyboard.down("Shift");
  await focusGridCell(page, "quantity", endRowIndex);
  await page.keyboard.up("Shift");
  await page.waitForTimeout(500);

  let state = await readSelectionState(page);
  let summary = await readSelectionSummary(page);
  if (getSelectedCellCount(summary) === 2) {
    return { state, summary };
  }

  await focusGridCell(page, "quantity", startRowIndex);
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

  state = await readSelectionState(page);
  summary = await readSelectionSummary(page);
  return { state, summary };
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

async function requireBoundingBox(locator: Locator, label: string) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Missing bounding box for ${label}.`);
  }
  return box;
}

function collectLicenseWarnings(messages: string[]) {
  return messages.filter(message => /license|watermark/i.test(message));
}

function collectAgGridWarnings(messages: string[]) {
  return messages.filter(message => /ag grid/i.test(message));
}

async function dragFillHandle(page: Page, fillHandle: Locator, targetCell: Locator) {
  await fillHandle.scrollIntoViewIfNeeded();
  await targetCell.scrollIntoViewIfNeeded();

  const handleBox = await requireBoundingBox(fillHandle, "fill handle");
  const targetBox = await requireBoundingBox(targetCell, "target quantity cell");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height * 0.75;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.move(targetX, targetY, { steps: 16 });
  await page.waitForTimeout(250);
  const bodyClassDuringDrag = await page.locator("body").evaluate(element =>
    element.className
  );
  await page.mouse.up();
  await page.waitForTimeout(1200);

  return bodyClassDuringDrag;
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const route = `${baseUrl}/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=${draftId}`;

  try {
    const context = await browser.newContext({
      viewport: {
        width: 1600,
        height: 1400,
      },
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
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(15000);

        const quantityValuesBeforeDrag = await readQuantityValues(page);
        const selectionBeforeDrag = await selectQuantityRange(page, 0, 1);
        const fillHandle = page.locator(".ag-fill-handle").first();
        const fillHandleVisible = (await fillHandle.count()) > 0;
        if (!fillHandleVisible) {
          throw new Error("Fill handle is not visible after selecting the quantity range.");
        }

        const bodyClassDuringDrag = await dragFillHandle(
          page,
          fillHandle,
          getGridCell(page, "quantity", 3)
        );
        const selectionStateAfterDrag = await readSelectionState(page);
        const selectionSummaryAfterDrag = await readSelectionSummary(page);
        const quantityValuesAfterDrag = await readQuantityValues(page);

        const screenshotPath = path.join(
          outputDir,
          "orders-runtime-fill-handle-probe.png"
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const report: FillHandleProbeReport = {
          baseUrl,
          draftId,
          route,
          timestamp: new Date().toISOString(),
          version,
          selectionSummaryBeforeDrag: selectionBeforeDrag.summary,
          selectionStateBeforeDrag: selectionBeforeDrag.state,
          selectionSummaryAfterDrag,
          selectionStateAfterDrag,
          fillHandleVisible,
          bodyClassDuringDrag,
          quantityValuesBeforeDrag,
          quantityValuesAfterDrag,
          dragApplied:
            quantityValuesAfterDrag.join(",") === "3,4,5,6",
          screenshotPath,
          licenseWarnings: collectLicenseWarnings(consoleMessages),
          agGridWarnings: collectAgGridWarnings(consoleMessages),
          pageErrors,
        };

        const reportPath = path.join(outputDir, "orders-runtime-fill-handle-report.json");
        writeFileSync(reportPath, JSON.stringify(report, null, 2));
        const closurePacketPath = path.join(
          outputDir,
          "orders-runtime-fill-handle-closure-packet.json"
        );
        const closurePacket = buildFillHandleClosurePacket({
          report,
          reportPath,
          deployCommit: getEnvOrDefault("PLAYWRIGHT_DEPLOY_COMMIT", ""),
          persona: "sales-manager",
        });
        writeFileSync(closurePacketPath, JSON.stringify(closurePacket, null, 2));
        console.info(
          JSON.stringify({ reportPath, closurePacketPath, report, closurePacket }, null, 2)
        );

        if (!report.dragApplied) {
          throw new Error(
            `Fill-handle probe failed: expected quantity values 3,4,5,6 after drag but saw ${report.quantityValuesAfterDrag.join(",")} (beforeSummary=${report.selectionSummaryBeforeDrag ?? "none"}, afterSummary=${report.selectionSummaryAfterDrag ?? "none"}, bodyClass=${report.bodyClassDuringDrag ?? "none"}).`
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
