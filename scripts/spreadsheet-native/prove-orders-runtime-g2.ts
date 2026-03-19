import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { QA_PASSWORD } from "../../tests-e2e/fixtures/auth";
import { getEnvOrDefault, loadCodexEnv } from "./qaEnv";
import { buildOrdersRuntimeG2ClosurePacket } from "./orders-runtime-closure-packet.mjs";

loadCodexEnv();

interface PersonaConfig {
  email: string;
  password: string;
}

interface QueueRouteReport {
  route: string;
  finalUrl: string;
  loadingShellVisible: boolean;
  watermarkVisible: boolean;
  licenseWarnings: string[];
  pageErrors: string[];
  bodySnippet: string;
  screenshotPath: string;
}

interface DocumentRouteReport {
  route: string;
  finalUrl: string;
  summaryBefore: string | null;
  summaryAfterBlockedDelete: string | null;
  summaryAfterInvalidPaste: string | null;
  summaryAfterValidPaste: string | null;
  summaryBeforeDuplicate: string | null;
  summaryAfterDuplicate: string | null;
  summaryBeforeQuickAdd: string | null;
  summaryAfterQuickAdd: string | null;
  summaryAfterDelete: string | null;
  summaryAfterRestore: string | null;
  lineItemsBefore: number | null;
  lineItemsAfterBlockedDelete: number | null;
  lineItemsAfterInvalidPaste: number | null;
  lineItemsAfterValidPaste: number | null;
  lineItemsBeforeDuplicate: number | null;
  lineItemsAfterDuplicate: number | null;
  lineItemsBeforeQuickAdd: number | null;
  lineItemsAfterQuickAdd: number | null;
  lineItemsAfterDelete: number | null;
  lineItemsAfterRestore: number | null;
  duplicateDelta: number | null;
  quickAddDelta: number | null;
  duplicateButtonEnabledBefore: boolean;
  deleteReturnedToBaseline: boolean;
  selectionStateAfterClick: string | null;
  selectionStateAfterTab: string | null;
  selectionStateAfterShiftTab: string | null;
  selectionStateAfterEnter: string | null;
  selectionStateAfterShiftEnter: string | null;
  quantityValueBeforeEscape: string | null;
  quantityValueAfterEscape: string | null;
  escapeRestoredValue: boolean;
  invalidPastePreservedValue: boolean;
  clipboardReadbackBeforeInvalidPaste: string | null;
  clipboardReadbackBeforeValidPaste: string | null;
  selectionStateBeforeValidPaste: string | null;
  selectionSummaryBeforeValidPaste: string | null;
  selectionSummaryBeforeDuplicate: string | null;
  selectionStateBeforeRestorePaste: string | null;
  selectionSummaryBeforeRestorePaste: string | null;
  selectionStateAfterSyntheticValidPaste: string | null;
  selectionSummaryAfterSyntheticValidPaste: string | null;
  quantityValuesBeforeValidPaste: string[];
  expectedQuantityValuesForValidPaste: string[];
  quantityValuesAfterValidPaste: string[];
  quantityValuesAfterRestore: string[];
  validPasteApplied: boolean;
  validPasteMatchedExpectedValues: boolean;
  validPasteUsedTwoCellRange: boolean;
  validPasteAppliedViaKeyboard: boolean;
  validPasteAppliedViaSynthetic: boolean;
  validPasteMethod: "keyboard" | "synthetic" | "none";
  addItemFocusedInventorySearch: boolean;
  quickAddLabel: string | null;
  pageErrors: string[];
  agGridWarnings: string[];
  licenseWarnings: string[];
  screenshotPaths: string[];
}

interface OrdersRuntimeG2Report {
  baseUrl: string;
  timestamp: string;
  version: unknown;
  queueRoute: QueueRouteReport;
  documentRoute: DocumentRouteReport;
}

const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ??
  "https://terp-staging-yicld.ondigitalocean.app";

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

async function clickButton(page: Page, name: string | RegExp) {
  const button = page.getByRole("button", { name }).first();
  await button.waitFor({ state: "visible", timeout: 30000 });
  await button.scrollIntoViewIfNeeded();

  try {
    await button.click({ timeout: 10000 });
  } catch {
    await button.evaluate(element => {
      (element as HTMLButtonElement).click();
    });
  }
}

function parseLineItemCount(summary: string | null): number | null {
  if (!summary) {
    return null;
  }

  const matched = summary.match(/(\d+) line items/i);
  return matched ? Number(matched[1]) : null;
}

async function readDocumentSummary(page: Page) {
  const summary = page.getByText(/line items · .*Running total/i).first();
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

async function readSelectionSummary(page: Page) {
  const summary = page
    .locator('[data-testid="orders-document-grid-selection-summary"]')
    .first();
  if ((await summary.count()) === 0) {
    return null;
  }

  return (await summary.innerText()).trim();
}

function collectLicenseWarnings(messages: string[]) {
  return messages.filter(message => /license|watermark/i.test(message));
}

function collectAgGridWarnings(messages: string[]) {
  return messages.filter(message => /ag grid/i.test(message));
}

function arraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function getSelectedCellCount(selectionSummary: string | null) {
  if (!selectionSummary) {
    return null;
  }

  const matched = selectionSummary.match(/(\d+) selected cells/i);
  return matched ? Number(matched[1]) : null;
}

async function checkQueueRoute(context: BrowserContext) {
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", msg => consoleMessages.push(msg.text()));
  page.on("pageerror", error => pageErrors.push(error.message));

  const route = `${baseUrl}/sales?tab=orders&surface=sheet-native&orderId=627`;
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(15000);

  const bodyText = await page
    .locator("body")
    .innerText()
    .catch(() => "");
  const screenshotPath = path.join(outputDir, "01-queue-route.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const report: QueueRouteReport = {
    route,
    finalUrl: page.url(),
    loadingShellVisible: bodyText.includes("Loading TERP"),
    watermarkVisible: /AG Grid|License Key Not Found|Trial/i.test(bodyText),
    licenseWarnings: collectLicenseWarnings(consoleMessages),
    pageErrors,
    bodySnippet: bodyText.slice(0, 1200),
    screenshotPath,
  };

  await page.close();
  return report;
}

async function ensureDocumentCellFocus(page: Page) {
  const quantityCell = getGridCell(page, "quantity");
  await quantityCell.waitFor({ state: "visible", timeout: 20000 });
  await quantityCell.click();
  await page.waitForTimeout(800);
}

function getGridCell(page: Page, columnKey: string, rowIndex = 0) {
  return page.locator(`[col-id="${columnKey}"][role="gridcell"]`).nth(rowIndex);
}

async function focusGridCell(page: Page, columnKey: string, rowIndex = 0) {
  const cell = getGridCell(page, columnKey, rowIndex);
  await cell.waitFor({ state: "visible", timeout: 20000 });
  await cell.click();
  await page.waitForTimeout(500);
  return cell;
}

async function focusLastGridRowCell(page: Page, columnKey: string) {
  const cells = page.locator(`[col-id="${columnKey}"][role="gridcell"]`);
  const count = await cells.count();
  if (count === 0) {
    throw new Error(`No grid cells found for column ${columnKey}`);
  }

  const cell = cells.nth(count - 1);
  await cell.waitFor({ state: "visible", timeout: 20000 });
  await cell.click();
  await page.waitForTimeout(500);
  return cell;
}

async function readGridCellText(page: Page, columnKey: string, rowIndex = 0) {
  return (await getGridCell(page, columnKey, rowIndex).innerText()).trim();
}

async function editGridCellValue(
  page: Page,
  columnKey: string,
  rowIndex: number,
  value: string
) {
  const cell = getGridCell(page, columnKey, rowIndex);
  await cell.waitFor({ state: "visible", timeout: 20000 });
  await cell.dblclick();
  const editor = page.locator("input.ag-input-field-input").first();
  await editor.waitFor({ state: "visible", timeout: 5000 });
  await editor.press("Meta+A");
  await editor.type(value, { delay: 25 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
}

async function restoreQuantityValues(page: Page, values: string[]) {
  for (const [rowIndex, value] of values.entries()) {
    await editGridCellValue(page, "quantity", rowIndex, value);
  }
}

async function writeClipboardText(page: Page, value: string) {
  let wroteHostClipboard = false;

  try {
    if (process.platform !== "darwin") {
      throw new Error("pbcopy is only available on macOS");
    }

    execFileSync("pbcopy", [], { input: value });
    await page.waitForTimeout(100);
    wroteHostClipboard = true;
  } catch {
    // Fall through to browser clipboard.
  }

  try {
    await page.bringToFront();
    await page.evaluate(async clipboardValue => {
      await navigator.clipboard.writeText(clipboardValue);
    }, value);
    await page.waitForTimeout(200);
    return;
  } catch {
    if (wroteHostClipboard) {
      await page.waitForTimeout(200);
      return;
    }
  }
}

async function readClipboardText(page: Page) {
  try {
    return await page.evaluate(async () => navigator.clipboard.readText());
  } catch {
    return null;
  }
}

async function dispatchSyntheticPaste(page: Page, value: string) {
  await page.evaluate(clipboardValue => {
    const target = document.activeElement ?? document.body;
    const dataTransfer = new window.DataTransfer();
    dataTransfer.setData("text/plain", clipboardValue);
    const pasteEvent = new window.ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer,
    });
    target.dispatchEvent(pasteEvent);
  }, value);
  await page.waitForTimeout(400);
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
  await page.waitForTimeout(400);

  let selectionState = await readSelectionState(page);
  let selectionSummary = await readSelectionSummary(page);
  if (getSelectedCellCount(selectionSummary) === 2) {
    return {
      state: selectionState,
      summary: selectionSummary,
    };
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
  await page.waitForTimeout(400);

  selectionState = await readSelectionState(page);
  selectionSummary = await readSelectionSummary(page);
  return {
    state: selectionState,
    summary: selectionSummary,
  };
}

async function restoreDocumentLineItems(
  page: Page,
  route: string,
  targetLineItemCount: number,
  screenshotPaths: string[],
  screenshotFileName = "06-document-after-restore.png"
) {
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  let currentSummary = await readDocumentSummary(page);
  let currentCount = parseLineItemCount(currentSummary);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (currentCount === null || currentCount <= targetLineItemCount) {
      break;
    }

    await focusGridCell(page, "quantity", Math.max(currentCount - 1, 0));
    await clickButton(page, /delete/i);
    await page.waitForTimeout(1200);
    currentSummary = await readDocumentSummary(page);
    currentCount = parseLineItemCount(currentSummary);
  }

  if (screenshotFileName) {
    await capturePage(page, screenshotFileName, screenshotPaths);
  }
  return {
    summary: currentSummary,
    lineItemCount: currentCount,
  };
}

async function clickFirstEnabledQuickAdd(page: Page) {
  const quickAddButtons = page.getByRole("button", { name: /quick add/i });
  const count = await quickAddButtons.count();

  for (let index = 0; index < count; index += 1) {
    const button = quickAddButtons.nth(index);
    if (await button.isDisabled()) {
      continue;
    }

    const label = await button.getAttribute("aria-label");
    await button.click();
    await page.waitForTimeout(1500);
    return label;
  }

  return null;
}

async function checkDocumentRoute(context: BrowserContext) {
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  const screenshotPaths: string[] = [];
  page.on("console", msg => consoleMessages.push(msg.text()));
  page.on("pageerror", error => pageErrors.push(error.message));

  const route = `${baseUrl}/sales?tab=orders&surface=sheet-native&ordersView=document&draftId=618`;
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(15000);
  await ensureDocumentCellFocus(page);

  const summaryBefore = await readDocumentSummary(page);

  await focusGridCell(page, "productDisplayName", 0);
  await page.keyboard.press("Delete");
  await page.waitForTimeout(700);
  const summaryAfterBlockedDelete = await readDocumentSummary(page);

  await ensureDocumentCellFocus(page);
  const selectionStateAfterClick = await readSelectionState(page);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
  const selectionStateAfterTab = await readSelectionState(page);
  await page.keyboard.press("Shift+Tab");
  await page.waitForTimeout(500);
  const selectionStateAfterShiftTab = await readSelectionState(page);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  const selectionStateAfterEnter = await readSelectionState(page);
  await page.keyboard.press("Shift+Enter");
  await page.waitForTimeout(500);
  const selectionStateAfterShiftEnter = await readSelectionState(page);
  await capturePage(page, "02-document-baseline.png", screenshotPaths);

  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  const quantityValuesBeforeValidPaste = [
    await readGridCellText(page, "quantity", 0),
    await readGridCellText(page, "quantity", 1),
  ];

  const quantityCell = page
    .locator('[col-id="quantity"][role="gridcell"]')
    .first();
  const quantityValueBeforeEscape = (await quantityCell.innerText()).trim();
  await quantityCell.dblclick();
  await page.waitForTimeout(300);
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("999");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  const quantityValueAfterEscape = (await quantityCell.innerText()).trim();

  await ensureDocumentCellFocus(page);
  await writeClipboardText(page, "-2");
  const clipboardReadbackBeforeInvalidPaste = await readClipboardText(page);
  await page.keyboard.press("Meta+V");
  await page.waitForTimeout(1000);
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);
  const summaryAfterInvalidPaste = await readDocumentSummary(page);
  const quantityValueAfterInvalidPaste = await readGridCellText(
    page,
    "quantity",
    0
  );

  const selectionBeforeValidPaste = await selectQuantityRange(page, 0, 1);
  const selectionStateBeforeValidPaste = selectionBeforeValidPaste.state;
  const selectionSummaryBeforeValidPaste = selectionBeforeValidPaste.summary;
  const expectedQuantityValuesForValidPaste = [
    quantityValuesBeforeValidPaste[0] === "1" ? "3" : "1",
    quantityValuesBeforeValidPaste[1] === "1" ? "4" : "1",
  ];
  await writeClipboardText(
    page,
    expectedQuantityValuesForValidPaste.join("\n")
  );
  const clipboardReadbackBeforeValidPaste = await readClipboardText(page);
  const validPasteUsedTwoCellRange =
    getSelectedCellCount(selectionSummaryBeforeValidPaste) === 2;
  let summaryAfterValidPaste = await readDocumentSummary(page);
  let selectionStateAfterSyntheticValidPaste: string | null = null;
  let selectionSummaryAfterSyntheticValidPaste: string | null = null;
  let quantityValuesAfterValidPaste = [...quantityValuesBeforeValidPaste];
  let validPasteMatchedExpectedValues = false;
  let validPasteAppliedViaKeyboard = false;
  let validPasteAppliedViaSynthetic = false;
  let validPasteMethod: "keyboard" | "synthetic" | "none" = "none";

  if (validPasteUsedTwoCellRange) {
    await page.keyboard.press("Meta+V");
    await page.waitForTimeout(1200);
    summaryAfterValidPaste = await readDocumentSummary(page);
    quantityValuesAfterValidPaste = [
      await readGridCellText(page, "quantity", 0),
      await readGridCellText(page, "quantity", 1),
    ];
    validPasteMatchedExpectedValues = arraysEqual(
      quantityValuesAfterValidPaste,
      expectedQuantityValuesForValidPaste
    );
    validPasteAppliedViaKeyboard = validPasteMatchedExpectedValues;
    if (validPasteAppliedViaKeyboard) {
      validPasteMethod = "keyboard";
    }
  }

  if (validPasteUsedTwoCellRange && !validPasteAppliedViaKeyboard) {
    const selectionAfterSyntheticValidPaste = await selectQuantityRange(
      page,
      0,
      1
    );
    selectionStateAfterSyntheticValidPaste =
      selectionAfterSyntheticValidPaste.state;
    selectionSummaryAfterSyntheticValidPaste =
      selectionAfterSyntheticValidPaste.summary;
    await dispatchSyntheticPaste(
      page,
      expectedQuantityValuesForValidPaste.join("\n")
    );
    summaryAfterValidPaste = await readDocumentSummary(page);
    quantityValuesAfterValidPaste = [
      await readGridCellText(page, "quantity", 0),
      await readGridCellText(page, "quantity", 1),
    ];
    validPasteMatchedExpectedValues = arraysEqual(
      quantityValuesAfterValidPaste,
      expectedQuantityValuesForValidPaste
    );
    validPasteAppliedViaSynthetic =
      getSelectedCellCount(selectionSummaryAfterSyntheticValidPaste) === 2 &&
      validPasteMatchedExpectedValues;
    if (validPasteAppliedViaSynthetic) {
      validPasteMethod = "synthetic";
    }
  }

  let selectionStateBeforeRestorePaste: string | null = null;
  let selectionSummaryBeforeRestorePaste: string | null = null;
  let quantityValuesAfterRestore = [...quantityValuesBeforeValidPaste];
  if (validPasteUsedTwoCellRange) {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);
    selectionStateBeforeRestorePaste = await readSelectionState(page);
    selectionSummaryBeforeRestorePaste = await readSelectionSummary(page);
    await restoreQuantityValues(page, quantityValuesBeforeValidPaste);
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);
    quantityValuesAfterRestore = [
      await readGridCellText(page, "quantity", 0),
      await readGridCellText(page, "quantity", 1),
    ];
  }

  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);
  const summaryBeforeDuplicate = await readDocumentSummary(page);
  await ensureDocumentCellFocus(page);
  const selectionSummaryBeforeDuplicate = await readSelectionSummary(page);
  const duplicateButton = page.getByRole("button", { name: "Duplicate" }).first();
  const duplicateButtonEnabledBefore = await duplicateButton.isEnabled();
  if (duplicateButtonEnabledBefore) {
    await clickButton(page, "Duplicate");
  }
  await page.waitForTimeout(1500);
  const summaryAfterDuplicate = await readDocumentSummary(page);
  await capturePage(page, "03-document-after-duplicate.png", screenshotPaths);
  await restoreDocumentLineItems(
    page,
    route,
    parseLineItemCount(summaryBefore) ?? 0,
    screenshotPaths,
    ""
  );

  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);
  const summaryBeforeQuickAdd = await readDocumentSummary(page);
  await clickButton(page, /add item/i);
  await page.waitForTimeout(1000);
  const inventorySearch = page
    .locator(
      '#inventory-browser-section input[placeholder="Search inventory..."]'
    )
    .first();
  const addItemFocusedInventorySearch = await inventorySearch.evaluate(
    input => input === document.activeElement
  );
  const quickAddLabel = await clickFirstEnabledQuickAdd(page);
  const summaryAfterQuickAdd = await readDocumentSummary(page);
  await capturePage(page, "04-document-after-quick-add.png", screenshotPaths);

  await focusLastGridRowCell(page, "quantity");
  await clickButton(page, /delete/i);
  await page.waitForTimeout(1500);
  const summaryAfterDelete = await readDocumentSummary(page);
  await capturePage(page, "05-document-after-delete.png", screenshotPaths);

  const restoredDocumentState = await restoreDocumentLineItems(
    page,
    route,
    parseLineItemCount(summaryBefore) ?? 0,
    screenshotPaths
  );
  const lineItemsBefore = parseLineItemCount(summaryBefore);
  const lineItemsBeforeDuplicate = parseLineItemCount(summaryBeforeDuplicate);
  const lineItemsAfterDuplicate = parseLineItemCount(summaryAfterDuplicate);
  const lineItemsBeforeQuickAdd = parseLineItemCount(summaryBeforeQuickAdd);
  const lineItemsAfterQuickAdd = parseLineItemCount(summaryAfterQuickAdd);
  const lineItemsAfterDelete = parseLineItemCount(summaryAfterDelete);

  const report: DocumentRouteReport = {
    route,
    finalUrl: page.url(),
    summaryBefore,
    summaryAfterBlockedDelete,
    summaryAfterInvalidPaste,
    summaryAfterValidPaste,
    summaryBeforeDuplicate,
    summaryAfterDuplicate,
    summaryBeforeQuickAdd,
    summaryAfterQuickAdd,
    summaryAfterDelete,
    summaryAfterRestore: restoredDocumentState.summary,
    lineItemsBefore,
    lineItemsAfterBlockedDelete: parseLineItemCount(summaryAfterBlockedDelete),
    lineItemsAfterInvalidPaste: parseLineItemCount(summaryAfterInvalidPaste),
    lineItemsAfterValidPaste: parseLineItemCount(summaryAfterValidPaste),
    lineItemsBeforeDuplicate,
    lineItemsAfterDuplicate,
    lineItemsBeforeQuickAdd,
    lineItemsAfterQuickAdd,
    lineItemsAfterDelete,
    lineItemsAfterRestore: restoredDocumentState.lineItemCount,
    duplicateDelta:
      lineItemsAfterDuplicate !== null && lineItemsBeforeDuplicate !== null
        ? lineItemsAfterDuplicate - lineItemsBeforeDuplicate
        : null,
    quickAddDelta:
      lineItemsAfterQuickAdd !== null && lineItemsBeforeQuickAdd !== null
        ? lineItemsAfterQuickAdd - lineItemsBeforeQuickAdd
        : null,
    duplicateButtonEnabledBefore,
    deleteReturnedToBaseline: lineItemsAfterDelete === lineItemsBeforeQuickAdd,
    selectionStateAfterClick,
    selectionStateAfterTab,
    selectionStateAfterShiftTab,
    selectionStateAfterEnter,
    selectionStateAfterShiftEnter,
    quantityValueBeforeEscape,
    quantityValueAfterEscape,
    escapeRestoredValue: quantityValueBeforeEscape === quantityValueAfterEscape,
    invalidPastePreservedValue:
      quantityValueBeforeEscape === quantityValueAfterInvalidPaste,
    clipboardReadbackBeforeInvalidPaste,
    clipboardReadbackBeforeValidPaste,
    selectionStateBeforeValidPaste,
    selectionSummaryBeforeValidPaste,
    selectionSummaryBeforeDuplicate,
    selectionStateBeforeRestorePaste,
    selectionSummaryBeforeRestorePaste,
    selectionStateAfterSyntheticValidPaste,
    selectionSummaryAfterSyntheticValidPaste,
    quantityValuesBeforeValidPaste,
    expectedQuantityValuesForValidPaste,
    quantityValuesAfterValidPaste,
    quantityValuesAfterRestore,
    validPasteApplied:
      validPasteAppliedViaKeyboard || validPasteAppliedViaSynthetic,
    validPasteMatchedExpectedValues,
    validPasteUsedTwoCellRange,
    validPasteAppliedViaKeyboard,
    validPasteAppliedViaSynthetic,
    validPasteMethod,
    addItemFocusedInventorySearch,
    quickAddLabel,
    pageErrors,
    agGridWarnings: collectAgGridWarnings(consoleMessages),
    licenseWarnings: collectLicenseWarnings(consoleMessages),
    screenshotPaths,
  };

  await page.close();
  return report;
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  let browserError: unknown = null;
  let browserCloseError: unknown = null;

  try {
    const context = await browser.newContext({
      viewport: {
        width: 1600,
        height: 1400,
      },
      permissions: ["clipboard-read", "clipboard-write"],
    });
    let contextError: unknown = null;
    let contextCloseError: unknown = null;
    try {
      await login(context, salesManager);
      const version = await context.request
        .get(`${baseUrl}/version.json`)
        .then(response => response.json())
        .catch(() => null);
      const queueRoute = await checkQueueRoute(context);
      const documentRoute = await checkDocumentRoute(context);

      const report: OrdersRuntimeG2Report = {
        baseUrl,
        timestamp: new Date().toISOString(),
        version,
        queueRoute,
        documentRoute,
      };

      const reportPath = path.join(outputDir, "orders-runtime-g2-report.json");
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      const closurePacketPath = path.join(outputDir, "orders-runtime-g2-closure-packet.json");
      const closurePacket = buildOrdersRuntimeG2ClosurePacket({
        report,
        reportPath,
        deployCommit: getEnvOrDefault("PLAYWRIGHT_DEPLOY_COMMIT", ""),
        persona: "sales-manager",
      });
      writeFileSync(closurePacketPath, JSON.stringify(closurePacket, null, 2));
      console.info(
        JSON.stringify({ reportPath, closurePacketPath, report, closurePacket }, null, 2)
      );

      if (
        queueRoute.loadingShellVisible ||
        queueRoute.licenseWarnings.some(message =>
          message.includes("License Key Not Found")
        )
      ) {
        throw new Error(
          "Queue-route validation failed: Orders sheet-native route is still loading or AG Grid still reports License Key Not Found."
        );
      }

      if (!documentRoute.addItemFocusedInventorySearch) {
        throw new Error(
          "Document-route validation failed: Add Item did not focus the inventory search input."
        );
      }

      if (!documentRoute.clipboardReadbackBeforeValidPaste) {
        throw new Error(
          "Document-route validation failed: browser clipboard readback was empty before valid paste."
        );
      }

      if (!documentRoute.validPasteApplied) {
        throw new Error(
          `Document-route validation failed: valid paste did not apply via a real two-cell range with the expected values (method=${documentRoute.validPasteMethod}, expected=${documentRoute.expectedQuantityValuesForValidPaste.join(",")}, actual=${documentRoute.quantityValuesAfterValidPaste.join(",")}, selectionState=${documentRoute.selectionStateBeforeValidPaste ?? "none"}, selectionSummary=${documentRoute.selectionSummaryBeforeValidPaste ?? "none"}).`
        );
      }

      if (documentRoute.duplicateDelta !== 1) {
        throw new Error(
          `Document-route validation failed: duplicate did not add exactly one line item in isolation (buttonEnabled=${documentRoute.duplicateButtonEnabledBefore}, before=${documentRoute.lineItemsBeforeDuplicate ?? "none"}, after=${documentRoute.lineItemsAfterDuplicate ?? "none"}, selectionSummary=${documentRoute.selectionSummaryBeforeDuplicate ?? "none"}).`
        );
      }

      if (!documentRoute.deleteReturnedToBaseline) {
        throw new Error(
          "Document-route validation failed: quick-add followed by delete did not return the line-item count to baseline."
        );
      }
    } catch (error) {
      contextError = error;
      throw error;
    } finally {
      try {
        await context.close();
      } catch (closeError) {
        contextCloseError = closeError;
      }
    }
    if (contextCloseError && !contextError) {
      throw contextCloseError;
    }
  } catch (error) {
    browserError = error;
    throw error;
  } finally {
    try {
      await browser.close();
    } catch (closeError) {
      browserCloseError = closeError;
    }
  }
  if (browserCloseError && !browserError) {
    throw browserCloseError;
  }
}

await main();
