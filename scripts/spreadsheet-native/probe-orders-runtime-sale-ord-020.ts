import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { QA_PASSWORD } from "../../tests-e2e/fixtures/auth";
import { getEnvOrDefault, loadCodexEnv } from "./qaEnv";

loadCodexEnv();

interface PersonaConfig {
  email: string;
  password: string;
}

interface DocumentRowSnapshot {
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

interface SaleOrd020ProbeReport {
  baseUrl: string;
  draftId: string;
  route: string;
  timestamp: string;
  version: unknown;
  selectionSummaryBeforeEdit: string | null;
  selectionStateBeforeEdit: string | null;
  saveStateBeforeEdit: string | null;
  saveStateDuringEditAutosave: string | null;
  saveStateAfterEditAutosave: string | null;
  saveStateDuringRestoreAutosave: string | null;
  saveStateAfterRestoreAutosave: string | null;
  baselineRows: DocumentRowSnapshot[];
  editedRows: DocumentRowSnapshot[];
  reloadedRowsAfterEdit: DocumentRowSnapshot[];
  restoredRows: DocumentRowSnapshot[];
  targetQuantityValues: string[];
  pricePreservedAcrossEdit: boolean;
  autosavePersistedAfterReload: boolean;
  restoreReturnedToBaseline: boolean;
  editedScreenshotPath: string;
  restoredScreenshotPath: string;
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

function relativeArtifactPath(filePath: string) {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}

function sha256File(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function artifactRecord(filePath: string) {
  return {
    relative_path: relativeArtifactPath(filePath),
    sha256: sha256File(filePath),
  };
}

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

function getGridCell(page: Page, columnKey: string, rowIndex: number) {
  return page.locator(`[col-id="${columnKey}"][role="gridcell"]`).nth(rowIndex);
}

async function scrollDocumentGrid(page: Page, position: "start" | "end") {
  const horizontalViewport = page
    .locator(".ag-body-horizontal-scroll-viewport")
    .first();

  if ((await horizontalViewport.count()) === 0) {
    return;
  }

  await horizontalViewport.evaluate(
    (element, nextPosition) => {
      const viewport = element as HTMLElement;
      viewport.scrollLeft =
        nextPosition === "start" ? 0 : viewport.scrollWidth;
    },
    position
  );
  await page.waitForTimeout(250);
}

async function readGridCellText(page: Page, columnKey: string, rowIndex: number) {
  if (columnKey === "quantity") {
    await scrollDocumentGrid(page, "start");
  } else {
    await scrollDocumentGrid(page, "end");
  }

  return (await getGridCell(page, columnKey, rowIndex).innerText()).trim();
}

async function readRowSnapshot(
  page: Page,
  rowIndex: number
): Promise<DocumentRowSnapshot> {
  const [quantity, unitPrice, lineTotal] = await Promise.all([
    readGridCellText(page, "quantity", rowIndex),
    readGridCellText(page, "unitPrice", rowIndex),
    readGridCellText(page, "lineTotal", rowIndex),
  ]);

  return {
    quantity,
    unitPrice,
    lineTotal,
  };
}

async function readRowSnapshots(page: Page, rowIndexes: number[]) {
  const rows: DocumentRowSnapshot[] = [];
  for (const rowIndex of rowIndexes) {
    rows.push(await readRowSnapshot(page, rowIndex));
  }
  return rows;
}

async function focusGridCell(page: Page, columnKey: string, rowIndex: number) {
  await scrollDocumentGrid(page, "start");
  const cell = getGridCell(page, columnKey, rowIndex);
  await cell.waitFor({ state: "visible", timeout: 30000 });
  await cell.click();
  await page.waitForTimeout(400);
}

async function editGridCellValue(
  page: Page,
  columnKey: string,
  rowIndex: number,
  value: string
) {
  await scrollDocumentGrid(page, "start");
  const cell = getGridCell(page, columnKey, rowIndex);
  await cell.waitFor({ state: "visible", timeout: 30000 });
  await cell.dblclick();
  const editor = page.locator("input.ag-input-field-input").first();
  await editor.waitFor({ state: "visible", timeout: 5000 });
  await editor.press("Meta+A");
  await editor.type(value, { delay: 25 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
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

async function readSelectionState(page: Page) {
  const state = page
    .locator('[data-testid="orders-document-grid-selection-state"]')
    .first();
  if ((await state.count()) === 0) {
    return null;
  }

  return (await state.innerText()).trim();
}

async function waitForSaveState(
  page: Page,
  matcher: RegExp,
  timeoutMs = 15000
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const stateText = await readSaveStateText(page);
    if (stateText && matcher.test(stateText)) {
      return stateText;
    }
    await page.waitForTimeout(250);
  }

  throw new Error(
    `Timed out waiting for save state ${matcher} on ${page.url()}.`
  );
}

async function readSaveStateText(page: Page) {
  const candidates = page
    .getByRole("status")
    .filter({ hasText: /Saved|Saving|Queued|Needs attention/i });
  if ((await candidates.count()) === 0) {
    return null;
  }

  return (await candidates.first().innerText()).trim();
}

function buildClosurePacket(report: SaleOrd020ProbeReport, reportPath: string) {
  const assertions = [
    {
      id: "multi-cell-selection",
      label: "A two-cell quantity range was selected before the edit packet",
      passed: /\b2 selected cells\b/i.test(report.selectionSummaryBeforeEdit ?? ""),
      expected: "Selection summary reports 2 selected cells before editing.",
      observed: report.selectionSummaryBeforeEdit ?? "missing",
      failure_impact: "blocker",
    },
    {
      id: "pricing-preserved",
      label: "Editing multiple quantity cells preserves each row's unit price",
      passed: report.pricePreservedAcrossEdit,
      expected: "Edited rows keep their original `Price / Unit` values while `Qty` changes.",
      observed: {
        baseline: report.baselineRows,
        edited: report.editedRows,
      },
      failure_impact: "blocker",
    },
    {
      id: "autosave-observed",
      label: "The Orders save indicator moves through saving and back to saved",
      passed:
        /saving/i.test(report.saveStateDuringEditAutosave ?? "") &&
        /saved/i.test(report.saveStateAfterEditAutosave ?? ""),
      expected: "The header save indicator reports `Saving...` and then `Saved` after the edit packet.",
      observed: {
        before: report.saveStateBeforeEdit,
        during_edit_autosave: report.saveStateDuringEditAutosave,
        after_edit_autosave: report.saveStateAfterEditAutosave,
      },
      failure_impact: "blocker",
    },
    {
      id: "autosave-persisted",
      label: "The edited quantities persist after reload without price drift",
      passed: report.autosavePersistedAfterReload,
      expected: "Reloaded rows match the edited quantities and original unit prices.",
      observed: report.reloadedRowsAfterEdit,
      failure_impact: "blocker",
    },
    {
      id: "restore-baseline",
      label: "Restoring the original quantities returns the draft to baseline",
      passed: report.restoreReturnedToBaseline,
      expected: "After restore and reload, the row snapshots match the starting baseline.",
      observed: report.restoredRows,
      failure_impact: "blocker",
    },
    {
      id: "page-clean",
      label: "No page errors were recorded during the probe",
      passed: report.pageErrors.length === 0,
      expected: "No page errors are emitted while running the row probe.",
      observed: report.pageErrors,
      failure_impact: "blocker",
    },
  ];

  const blockingFailures = assertions.filter(assertion => !assertion.passed);

  return {
    schema_version: 1,
    gate: "G2",
    row_id: "SALE-ORD-020",
    issue: "TER-795",
    generated_at: new Date().toISOString(),
    command: `PLAYWRIGHT_BASE_URL=${report.baseUrl} pnpm exec tsx scripts/spreadsheet-native/probe-orders-runtime-sale-ord-020.ts`,
    suggested_verdict: blockingFailures.length ? "partial" : "closed with evidence",
    acceptance_criteria:
      "Isolated proof that approved multi-cell edits preserve pricing, trigger autosave, persist after reload, and restore the baseline cleanly.",
    build: {
      id: (report.version as { commit?: string } | null)?.commit ?? null,
      deployment_build_time:
        (report.version as { buildTime?: string } | null)?.buildTime ?? null,
    },
    route: report.route,
    persona: "sales-manager",
    assertions,
    artifacts: {
      report: artifactRecord(reportPath),
      edited_screenshot: artifactRecord(report.editedScreenshotPath),
      restored_screenshot: artifactRecord(report.restoredScreenshotPath),
    },
    summary: {
      target_quantity_values: report.targetQuantityValues,
      baseline_rows: report.baselineRows,
      edited_rows: report.editedRows,
      reloaded_rows_after_edit: report.reloadedRowsAfterEdit,
      restored_rows: report.restoredRows,
      ag_grid_warnings: report.agGridWarnings,
      license_warnings: report.licenseWarnings,
      page_errors: report.pageErrors,
    },
  };
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
        await page.goto(route, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page.waitForTimeout(15000);

        const rowIndexes = [0, 1];
        const baselineRows = await readRowSnapshots(page, rowIndexes);
        const baselineQuantities = baselineRows.map(row => row.quantity);
        const targetQuantityValues = baselineQuantities.map((quantity, index) => {
          const numericQuantity = Number.parseInt(quantity, 10);
          if (!Number.isFinite(numericQuantity)) {
            throw new Error(
              `Expected numeric quantity before edit but saw ${quantity} on row ${index}.`
            );
          }

          return String(numericQuantity + index + 2);
        });

        await selectQuantityRange(page, 0, 1);
        const selectionSummaryBeforeEdit = await readSelectionSummary(page);
        const selectionStateBeforeEdit = await readSelectionState(page);
        const saveStateBeforeEdit = await readSaveStateText(page);

        await editGridCellValue(page, "quantity", 0, targetQuantityValues[0]);
        await editGridCellValue(page, "quantity", 1, targetQuantityValues[1]);

        const editedRows = await readRowSnapshots(page, rowIndexes);
        const pricePreservedAcrossEdit = editedRows.every(
          (row, index) => row.unitPrice === baselineRows[index]?.unitPrice
        );

        const saveStateDuringEditAutosave = await waitForSaveState(
          page,
          /saving/i,
          15000
        );
        const saveStateAfterEditAutosave = await waitForSaveState(
          page,
          /saved/i,
          15000
        );

        const editedScreenshotPath = path.join(
          outputDir,
          "orders-runtime-sale-ord-020-after-edit.png"
        );
        await page.screenshot({ path: editedScreenshotPath, fullPage: true });

        await page.goto(route, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page.waitForTimeout(5000);
        const reloadedRowsAfterEdit = await readRowSnapshots(page, rowIndexes);
        const autosavePersistedAfterReload = reloadedRowsAfterEdit.every(
          (row, index) =>
            row.quantity === targetQuantityValues[index] &&
            row.unitPrice === baselineRows[index]?.unitPrice
        );

        await editGridCellValue(page, "quantity", 0, baselineQuantities[0] ?? "");
        await editGridCellValue(page, "quantity", 1, baselineQuantities[1] ?? "");

        const saveStateDuringRestoreAutosave = await waitForSaveState(
          page,
          /saving/i,
          15000
        );
        const saveStateAfterRestoreAutosave = await waitForSaveState(
          page,
          /saved/i,
          15000
        );

        await page.goto(route, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page.waitForTimeout(5000);
        const restoredRows = await readRowSnapshots(page, rowIndexes);
        const restoreReturnedToBaseline = restoredRows.every(
          (row, index) =>
            row.quantity === baselineRows[index]?.quantity &&
            row.unitPrice === baselineRows[index]?.unitPrice &&
            row.lineTotal === baselineRows[index]?.lineTotal
        );

        const restoredScreenshotPath = path.join(
          outputDir,
          "orders-runtime-sale-ord-020-after-restore.png"
        );
        await page.screenshot({ path: restoredScreenshotPath, fullPage: true });

        const report: SaleOrd020ProbeReport = {
          baseUrl,
          draftId,
          route,
          timestamp: new Date().toISOString(),
          version,
          selectionSummaryBeforeEdit,
          selectionStateBeforeEdit,
          saveStateBeforeEdit,
          saveStateDuringEditAutosave,
          saveStateAfterEditAutosave,
          saveStateDuringRestoreAutosave,
          saveStateAfterRestoreAutosave,
          baselineRows,
          editedRows,
          reloadedRowsAfterEdit,
          restoredRows,
          targetQuantityValues,
          pricePreservedAcrossEdit,
          autosavePersistedAfterReload,
          restoreReturnedToBaseline,
          editedScreenshotPath,
          restoredScreenshotPath,
          licenseWarnings: collectLicenseWarnings(consoleMessages),
          agGridWarnings: collectAgGridWarnings(consoleMessages),
          pageErrors,
        };

        const reportPath = path.join(
          outputDir,
          "orders-runtime-sale-ord-020-report.json"
        );
        writeFileSync(reportPath, JSON.stringify(report, null, 2));

        const closurePacketPath = path.join(
          outputDir,
          "orders-runtime-sale-ord-020-closure-packet.json"
        );
        const closurePacket = buildClosurePacket(report, reportPath);
        writeFileSync(closurePacketPath, JSON.stringify(closurePacket, null, 2));

        console.info(
          JSON.stringify(
            {
              reportPath,
              closurePacketPath,
              report,
              closurePacket,
            },
            null,
            2
          )
        );

        if (
          !report.pricePreservedAcrossEdit ||
          !report.autosavePersistedAfterReload ||
          !report.restoreReturnedToBaseline
        ) {
          throw new Error(
            `SALE-ORD-020 probe did not satisfy all assertions (pricePreserved=${report.pricePreservedAcrossEdit}, autosavePersisted=${report.autosavePersistedAfterReload}, restoreReturned=${report.restoreReturnedToBaseline}).`
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
