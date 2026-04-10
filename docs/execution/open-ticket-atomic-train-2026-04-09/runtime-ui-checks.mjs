#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import superjson from "superjson";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const outputPath = path.resolve(
  process.env.OUTPUT_PATH ||
    "docs/execution/open-ticket-atomic-train-2026-04-09/runtime-ui-checks.json"
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

const viewport = { width: 1280, height: 900 };
const PROCUREMENT_PROOF_NOTE = "April 9 procurement runtime proof";
const ACCOUNTING_AP_PROOF_TOKEN = "APRIL-09-AP-PROOF";
const ACCOUNTING_AP_COMPARISON_TOKEN = "APRIL-09-AP-COMPARISON";

function toErrorString(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

async function parseTrpcResponse(response, endpoint, method) {
  if (!response.ok()) {
    throw new Error(
      `tRPC ${method} call to ${endpoint} failed: ${response.status()} ${await response.text()}`
    );
  }

  const rawBody = await response.json();
  const body = Array.isArray(rawBody) ? rawBody[0] : rawBody;
  if (!body || typeof body !== "object") {
    throw new Error(
      `tRPC ${method} call to ${endpoint} returned unexpected payload`
    );
  }

  if (body.error) {
    throw new Error(
      `tRPC error from ${endpoint}: ${JSON.stringify(body.error)}`
    );
  }

  if (!body.result?.data || !("json" in body.result.data)) {
    throw new Error(
      `tRPC ${method} call to ${endpoint} returned no result payload`
    );
  }

  return body.result.data.json;
}

async function callTrpc(page, endpoint, input, attempt = 0) {
  const trpcUrl = `${baseUrl}/api/trpc/${endpoint}`;
  const serializedInput = superjson.serialize(input);

  const postResponse = await page.request.post(trpcUrl, {
    headers: { "Content-Type": "application/json" },
    data: serializedInput,
  });

  if (postResponse.status() === 429 && attempt < 5) {
    await page.waitForTimeout(5000 * (attempt + 1));
    return callTrpc(page, endpoint, input, attempt + 1);
  }

  if (postResponse.status() !== 405) {
    return parseTrpcResponse(postResponse, endpoint, "POST");
  }

  const getUrl = new URL(trpcUrl);
  getUrl.searchParams.set("input", JSON.stringify(serializedInput));
  const getResponse = await page.request.get(getUrl.toString());
  if (getResponse.status() === 429 && attempt < 5) {
    await page.waitForTimeout(5000 * (attempt + 1));
    return callTrpc(page, endpoint, input, attempt + 1);
  }
  return parseTrpcResponse(getResponse, endpoint, "GET");
}

async function findFirstSupplierId(page) {
  const result = await callTrpc(page, "clients.list", {
    clientTypes: ["seller"],
    limit: 1,
  });
  const supplierId = result?.items?.[0]?.id;
  if (!supplierId) {
    throw new Error("No supplier found for procurement runtime proof");
  }
  return supplierId;
}

async function findSupplierForAccountingBill(page) {
  const result = await callTrpc(page, "clients.list", {
    clientTypes: ["seller"],
    limit: 20,
  });

  for (const supplier of result?.items ?? []) {
    const existingBills = await callTrpc(page, "accounting.bills.list", {
      vendorId: supplier.id,
      limit: 1,
      offset: 0,
    });
    if ((existingBills?.items ?? []).length === 0) {
      return supplier.id;
    }
  }

  const supplierId = result?.items?.[0]?.id;
  if (!supplierId) {
    throw new Error("No supplier found for accounting runtime proof");
  }
  return supplierId;
}

async function listSupplierIds(page) {
  const result = await callTrpc(page, "clients.list", {
    clientTypes: ["seller"],
    limit: 50,
    offset: 0,
  });
  return (result?.items ?? []).map(item => item.id).filter(Boolean);
}

async function findFirstProductId(page) {
  const result = await callTrpc(page, "inventory.list", { limit: 1 });
  const batch = result?.items?.[0];
  const productId =
    batch?.product?.id ?? batch?.batch?.productId ?? batch?.productId ?? batch?.id;
  if (!productId) {
    throw new Error("No product found for procurement runtime proof");
  }
  return productId;
}

async function ensureConfirmedPurchaseOrder(page) {
  const supplierClientId = await findFirstSupplierId(page);
  const productId = await findFirstProductId(page);
  const orderDate = new Date().toISOString().split("T")[0];
  const expectedDeliveryDate = "2024-01-15";
  const existing = await callTrpc(page, "purchaseOrders.getAll", {
    supplierClientId,
    status: "CONFIRMED",
    limit: 50,
    offset: 0,
  });
  const matchingPo = (existing?.items ?? []).find(
    po =>
      po?.notes === PROCUREMENT_PROOF_NOTE &&
      po?.expectedDeliveryDate === expectedDeliveryDate
  );

  if (matchingPo?.id && matchingPo?.poNumber) {
    return {
      created: false,
      reused: true,
      createdPurchaseOrderId: matchingPo.id,
      createdPurchaseOrderNumber: matchingPo.poNumber,
      expectedDeliveryDate,
      supplierClientId,
    };
  }

  const created = await callTrpc(page, "purchaseOrders.create", {
    supplierClientId,
    orderDate,
    expectedDeliveryDate,
    paymentTerms: "NET_30",
    notes: PROCUREMENT_PROOF_NOTE,
    items: [{ productId, quantityOrdered: 5, unitCost: 42 }],
  });

  await callTrpc(page, "purchaseOrders.submit", { id: created.id });
  await callTrpc(page, "purchaseOrders.confirm", { id: created.id });
  return {
    created: true,
    reused: false,
    createdPurchaseOrderId: created.id,
    createdPurchaseOrderNumber: created.poNumber ?? null,
    expectedDeliveryDate,
    supplierClientId,
  };
}

async function cleanupTaggedPurchaseOrders(page, keepId = null) {
  const supplierClientId = await findFirstSupplierId(page);
  const existing = await callTrpc(page, "purchaseOrders.getAll", {
    supplierClientId,
    limit: 100,
    offset: 0,
  });

  for (const po of existing?.items ?? []) {
    if (po?.notes !== PROCUREMENT_PROOF_NOTE || po?.id === keepId) {
      continue;
    }

    await callTrpc(page, "purchaseOrders.delete", { id: po.id });
  }
}

function normalizeClientFilterPath(rawPath) {
  if (typeof rawPath !== "string" || rawPath.length === 0) {
    return null;
  }

  const parsed = new URL(rawPath, baseUrl);
  if (parsed.searchParams.has("clientId")) {
    parsed.searchParams.set("clientId", "<dynamic>");
  }

  return `${parsed.pathname}${parsed.search}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function parseAmount(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

async function ensureTaggedOverdueBill(
  page,
  { token, description, preferredVendorId }
) {
  const existingBills = await callTrpc(page, "accounting.bills.list", {
    searchTerm: token,
    limit: 50,
    offset: 0,
  });
  const matchingBills = (existingBills?.items ?? []).filter(
    bill =>
      bill.billNumber === token || bill.notes?.includes(token)
  );
  const existingBill =
    matchingBills.find(
      bill => !preferredVendorId || bill.vendorId === preferredVendorId
    ) ?? matchingBills[0];

  for (const bill of matchingBills) {
    if (bill.id === existingBill?.id || bill.status === "VOID") {
      continue;
    }

    await callTrpc(page, "accounting.bills.updateStatus", {
      id: bill.id,
      status: "VOID",
    });
  }

  if (existingBill?.vendorId) {
    if (existingBill.status !== "OVERDUE") {
      await callTrpc(page, "accounting.bills.updateStatus", {
        id: existingBill.id,
        status: "OVERDUE",
      });
    }
    return {
      billId: existingBill.id,
      vendorId: existingBill.vendorId,
      billNumber: existingBill.billNumber ?? token,
      reused: true,
    };
  }

  const vendorId = preferredVendorId ?? (await findSupplierForAccountingBill(page));
  const createdBillId = await callTrpc(page, "accounting.bills.create", {
    billNumber: token,
    vendorId,
    billDate: new Date("2024-01-05T00:00:00.000Z"),
    dueDate: new Date("2024-01-15T00:00:00.000Z"),
    subtotal: "800.00",
    totalAmount: "800.00",
    paymentTerms: "NET_30",
    notes: token,
    lineItems: [
      {
        description,
        quantity: "1",
        unitPrice: "800.00",
        lineTotal: "800.00",
      },
    ],
  });
  await callTrpc(page, "accounting.bills.updateStatus", {
    id: createdBillId,
    status: "PENDING",
  });
  await callTrpc(page, "accounting.bills.updateStatus", {
    id: createdBillId,
    status: "OVERDUE",
  });

  return {
    billId: createdBillId,
    vendorId,
    billNumber: token,
    reused: false,
  };
}

async function ensureAccountingApProofContext(page) {
  const supplierIds = await listSupplierIds(page);
  if (supplierIds.length < 2) {
    throw new Error("Need at least two suppliers for AP runtime proof");
  }

  const primaryBill = await ensureTaggedOverdueBill(page, {
    token: ACCOUNTING_AP_PROOF_TOKEN,
    description: "April 9 AP runtime proof bill",
    preferredVendorId: supplierIds[0],
  });
  const comparisonVendorId =
    supplierIds.find(id => id !== primaryBill.vendorId) ?? supplierIds[1];
  if (!comparisonVendorId || comparisonVendorId === primaryBill.vendorId) {
    throw new Error("Unable to find distinct supplier for AP comparison proof");
  }

  const comparisonBill = await ensureTaggedOverdueBill(page, {
    token: ACCOUNTING_AP_COMPARISON_TOKEN,
    description: "April 9 AP comparison runtime proof bill",
    preferredVendorId: comparisonVendorId,
  });

  return { primaryBill, comparisonBill };
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
        timeout: 15000,
      });
      if (response.ok()) {
        return { ok: true, strategy: attempt.url, status: response.status() };
      }
    } catch {
      // Try the next auth strategy.
    }
  }

  return { ok: false, strategy: null, status: null };
}

async function fillFirstVisible(page, selectors, value) {
  for (const selector of selectors) {
    const field = page.locator(selector).first();
    if (await field.isVisible().catch(() => false)) {
      await field.fill(value);
      return;
    }
  }

  throw new Error(`Unable to find visible field for selectors: ${selectors.join(", ")}`);
}

async function establishBrowserSession(page) {
  await page.goto(`${baseUrl}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
  await fillFirstVisible(
    page,
    [
      'input[name="username"]',
      "#username",
      'input[placeholder*="username" i]',
      'input[name="email"]',
      'input[type="email"]',
    ],
    authUsername
  );
  await fillFirstVisible(
    page,
    [
      'input[name="password"]',
      "#password",
      'input[type="password"]',
    ],
    authPassword
  );
  await page.getByRole("button", { name: /sign in|login/i }).first().click();
  await page.waitForURL(/\/($|dashboard)(\?.*)?/, { timeout: 15000 });
  await page.waitForTimeout(1200);
}

async function probeSession(page, label) {
  const response = await page.request.get(`${baseUrl}/api/auth/me`);
  let email = null;

  try {
    const body = await response.json();
    email = body?.user?.email ?? body?.email ?? null;
  } catch {
    email = null;
  }

  return {
    label,
    ok: response.ok(),
    status: response.status(),
    email,
  };
}

async function gotoRoute(page, route) {
  await page.goto(`${baseUrl}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(1200);
  return page.evaluate(() => location.pathname + location.search);
}

async function visibleTextMetric(page, text) {
  const locator = page.getByText(text, { exact: true }).first();
  const visible = await locator.isVisible().catch(() => false);
  const box = visible ? await locator.boundingBox() : null;

  return {
    text,
    visible,
    withinViewport: Boolean(
      box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= viewport.width &&
        box.y + box.height <= viewport.height
    ),
    box: box
      ? {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
        }
      : null,
  };
}

async function routeTextMetric(page, route, text) {
  await gotoRoute(page, route);
  return visibleTextMetric(page, text);
}

async function getTitleMetric(page, route) {
  await gotoRoute(page, route);

  return page.evaluate(currentRoute => {
    const title =
      document.querySelector(".linear-workspace-title") ??
      document.querySelector("h1");
    const eyebrow =
      document.querySelector(".linear-workspace-eyebrow") ?? null;
    const description =
      document.querySelector(".linear-workspace-description") ?? null;

    const readMetric = element => {
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const styles = window.getComputedStyle(element);
      return {
        text: (element.textContent || "").trim(),
        fontSize: Number.parseFloat(styles.fontSize || "0"),
        fontWeight: Number.parseInt(styles.fontWeight || "0", 10),
      };
    };

    const titleMetric = readMetric(title);
    const eyebrowMetric = readMetric(eyebrow);
    const descriptionMetric = readMetric(description);
    const dominantOverEyebrow = titleMetric
      ? !eyebrowMetric || titleMetric.fontSize > eyebrowMetric.fontSize
      : false;
    const dominantOverDescription = titleMetric
      ? !descriptionMetric || titleMetric.fontSize > descriptionMetric.fontSize
      : false;

    return {
      route: currentRoute,
      title: titleMetric,
      eyebrow: eyebrowMetric,
      description: descriptionMetric,
      dominant: Boolean(
        titleMetric && dominantOverEyebrow && dominantOverDescription
      ),
    };
  }, route);
}

async function runPrefixDuplicationAudit(page, route, selectors) {
  await gotoRoute(page, route);

  return page.evaluate(
    ({ route: currentRoute, selectors: currentSelectors }) => {
      const table = document.querySelector(currentSelectors.table);
      if (!(table instanceof HTMLElement)) {
        return {
          route: currentRoute,
          foundTable: false,
          headerLabels: [],
          duplicatedCells: [],
        };
      }

      const headerLabels = Array.from(
        table.querySelectorAll(currentSelectors.headers)
      )
        .map(node => (node.textContent || "").trim().replace(/\s+/g, " "))
        .filter(Boolean);
      const headerPatterns = headerLabels.map(label => ({
        label,
        regex: new RegExp(
          `^${label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*[:\\-]`,
          "i"
        ),
      }));

      const duplicatedCells = Array.from(
        table.querySelectorAll(currentSelectors.cells)
      )
        .map(node => (node.textContent || "").trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .flatMap(text =>
          headerPatterns
            .filter(({ regex }) => regex.test(text))
            .map(({ label }) => ({ label, text }))
        );

      return {
        route: currentRoute,
        foundTable: true,
        headerLabels,
        duplicatedCells,
      };
    },
    { route, selectors }
  );
}

async function clickFirstTableRow(page, selector) {
  const row = page.locator(selector).first();
  if ((await row.count()) === 0) {
    return false;
  }

  await row.click();
  await page.waitForTimeout(900);
  return true;
}

async function clickFirstAgRow(page) {
  const row = page.locator(".ag-center-cols-container .ag-row").first();
  if ((await row.count()) === 0) {
    return false;
  }

  await row.click();
  await page.waitForTimeout(900);
  return true;
}

async function verifyOrdersInspectorLink(page) {
  const startPath = await gotoRoute(page, "/sales");
  const selected = await clickFirstTableRow(
    page,
    "[data-testid='orders-table'] tbody tr[data-orderid]"
  );
  const buttonVisible = await page
    .getByRole("button", { name: /open client profile/i })
    .isVisible()
    .catch(() => false);

  return {
    route: startPath,
    selected,
    openClientProfileVisible: buttonVisible,
  };
}

async function verifyInvoiceInspectorLink(page) {
  const startPath = await gotoRoute(page, "/accounting/invoices");
  const selected = await clickFirstAgRow(page);
  const buttonVisible = await page
    .getByRole("button", { name: /open client profile/i })
    .isVisible()
    .catch(() => false);

  return {
    route: startPath,
    selected,
    openClientProfileVisible: buttonVisible,
  };
}

async function verifyRelationshipOrderLink(page) {
  const startPath = await gotoRoute(page, "/relationships");
  const firstRow = page.locator("[data-testid='clients-table'] tbody tr").first();
  const rowFound = (await firstRow.count()) > 0;
  let navigatedPath = null;
  let clicked = false;

  if (rowFound) {
    const firstButton = firstRow.locator("button").first();
    if ((await firstButton.count()) > 0) {
      clicked = true;
      await firstButton.click();
      await page.waitForTimeout(900);
      navigatedPath = await page.evaluate(() => location.pathname + location.search);
    }
  }

  return {
    route: startPath,
    rowFound,
    clicked,
    navigatedPath: normalizeClientFilterPath(navigatedPath),
    reachesSalesWithClientFilter: Boolean(
      navigatedPath?.startsWith("/sales") && navigatedPath.includes("clientId=")
    ),
  };
}

async function verifyRelationshipArchiveConfirmation(page) {
  const startPath = await gotoRoute(page, "/relationships");
  const rowSelected = await clickFirstTableRow(
    page,
    "[data-testid='clients-table'] tbody tr"
  );
  let archiveButtonVisible = false;
  let dialogVisible = false;

  if (rowSelected) {
    const archiveButton = page.getByTestId("archive-client-btn");
    archiveButtonVisible = await archiveButton.isVisible().catch(() => false);
    if (archiveButtonVisible) {
      await archiveButton.click();
      await page.waitForTimeout(500);
      dialogVisible = await page
        .getByTestId("confirm-delete-modal")
        .isVisible()
        .catch(() => false);
    }
  }

  return {
    route: startPath,
    rowSelected,
    archiveButtonVisible,
    dialogVisible,
  };
}

async function verifyPricingProfileDeleteConfirmation(page) {
  const startPath = await gotoRoute(page, "/pricing-profiles");
  const firstRow = page.locator("table tbody tr").first();
  const rowFound = (await firstRow.count()) > 0;
  let deleteButtonVisible = false;
  let dialogVisible = false;

  if (rowFound) {
    const deleteButton = firstRow.locator("button").nth(1);
    deleteButtonVisible = await deleteButton.isVisible().catch(() => false);
    if (deleteButtonVisible) {
      await deleteButton.click();
      await page.waitForTimeout(500);
      dialogVisible = await page
        .getByText("Delete Pricing Profile", { exact: true })
        .isVisible()
        .catch(() => false);
    }
  }

  return {
    route: startPath,
    rowFound,
    deleteButtonVisible,
    dialogVisible,
  };
}

async function verifyOrdersConfirmation(page) {
  const startPath = await gotoRoute(page, "/sales");
  const rowSelected = await clickFirstTableRow(
    page,
    "[data-testid='orders-table'] tbody tr[data-orderid]"
  );
  const actionNames = [
    "Confirm Order",
    "Delete Draft",
    "Confirm for Fulfillment",
    "Ship Order",
    "Restock Inventory",
    "Return to Supplier",
  ];
  let actionClicked = null;
  let dialogTitle = null;

  if (rowSelected) {
    for (const actionName of actionNames) {
      const button = page.getByRole("button", { name: actionName }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.waitForTimeout(500);
        actionClicked = actionName;
        dialogTitle = await page
          .locator("[role='dialog'] h2, [role='dialog'] [data-slot='dialog-title']")
          .first()
          .textContent()
          .catch(() => null);
        break;
      }
    }
  }

  return {
    route: startPath,
    rowSelected,
    actionClicked,
    dialogTitle: dialogTitle?.trim() ?? null,
    dialogVisible: Boolean(dialogTitle),
  };
}

async function verifyInvoiceVoidConfirmation(page) {
  const startPath = await gotoRoute(page, "/accounting/invoices");
  const rowSelected = await clickFirstAgRow(page);
  let voidButtonVisible = false;
  let dialogVisible = false;

  if (rowSelected) {
    const voidButton = page.getByTestId("action-void");
    voidButtonVisible = await voidButton.isVisible().catch(() => false);
    if (voidButtonVisible) {
      await voidButton.click();
      await page.waitForTimeout(500);
      dialogVisible = await page
        .getByTestId("void-invoice-dialog")
        .isVisible()
        .catch(() => false);
    }
  }

  return {
    route: startPath,
    rowSelected,
    voidButtonVisible,
    dialogVisible,
  };
}

async function verifySalesToClientProfileFlow(page) {
  await gotoRoute(page, "/sales");
  const rowSelected = await clickFirstTableRow(
    page,
    "[data-testid='orders-table'] tbody tr[data-orderid]"
  );
  let navigatedPath = null;

  if (rowSelected) {
    const button = page.getByRole("button", { name: /open client profile/i });
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(900);
      navigatedPath = await page.evaluate(() => location.pathname + location.search);
    }
  }

  return {
    route: "/sales",
    rowSelected,
    clickDepth: navigatedPath ? 2 : null,
    navigatedPath,
    reachesClientProfile: Boolean(
      navigatedPath?.startsWith("/relationships/") ||
        navigatedPath?.startsWith("/clients/")
    ),
  };
}

async function verifyInvoiceToClientProfileFlow(page) {
  await gotoRoute(page, "/accounting/invoices");
  const rowSelected = await clickFirstAgRow(page);
  let navigatedPath = null;

  if (rowSelected) {
    const button = page.getByRole("button", { name: /open client profile/i });
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(900);
      navigatedPath = await page.evaluate(() => location.pathname + location.search);
    }
  }

  return {
    route: "/accounting/invoices",
    rowSelected,
    clickDepth: navigatedPath ? 2 : null,
    navigatedPath,
    reachesClientProfile: Boolean(
      navigatedPath?.startsWith("/relationships/") ||
        navigatedPath?.startsWith("/clients/")
    ),
  };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport });
const page = await context.newPage();

const auth = await authenticate(page);
const results = {
  baseUrl,
  outputPath,
  runAt: new Date().toISOString(),
  viewport,
  auth,
  sessionHealth: {},
  tickets: {},
};

if (auth.ok) {
  try {
    await establishBrowserSession(page);

    const titleMetrics = [];
    for (const route of [
      "/sales",
      "/inventory",
      "/relationships",
      "/accounting",
      "/purchase-orders",
    ]) {
      titleMetrics.push(await getTitleMetric(page, route));
    }

    results.tickets["TER-1135"] = {
      status: titleMetrics.every(metric => metric.dominant) ? "pass" : "fail",
      evidence: titleMetrics,
    };

    const sessionBeforeOperations = await probeSession(
      page,
      "before-operations-runtime-proof"
    );
    results.sessionHealth.beforeOperations = sessionBeforeOperations;
    if (!sessionBeforeOperations.ok) {
      throw new Error(
        `Session probe failed before operations runtime proof: ${sessionBeforeOperations.status}`
      );
    }

    const financialPeriodLabel = await routeTextMetric(
      page,
      "/accounting",
      "Financial period"
    );
    const financialPeriodValue = await routeTextMetric(
      page,
      "/accounting",
      "Current fiscal year"
    );
    results.tickets["TER-1126"] = {
      status:
        financialPeriodLabel.visible &&
        financialPeriodLabel.withinViewport &&
        financialPeriodValue.visible &&
        financialPeriodValue.withinViewport
          ? "pass"
          : "fail",
      evidence: {
        financialPeriodLabel,
        financialPeriodValue,
      },
    };

    const procurementRedirectRoute = await gotoRoute(
      page,
      "/purchase-orders?tab=receiving"
    );
    const procurementRedirectAction = await visibleTextMetric(
      page,
      "Open Operations"
    );
    results.tickets["TER-1121"] = {
      status:
        procurementRedirectRoute.includes("tab=receiving") &&
        procurementRedirectAction.visible &&
        procurementRedirectAction.withinViewport
          ? "pass"
          : "fail",
      evidence: {
        procurementRedirectRoute,
        procurementRedirectAction,
      },
    };

    const intakeSubmitButtons = await gotoRoute(page, "/inventory?tab=intake").then(
      async () =>
        page.getByRole("button", { name: /submit all product intake/i }).count()
    );
    const intakePilotDocumentCount = await page
      .locator("[data-powersheet-surface-id='intake-pilot-document']")
      .count();
    const directIntakeLabel = await visibleTextMetric(page, "Direct intake");
    results.tickets["TER-1117"] = {
      status:
        directIntakeLabel.visible && intakePilotDocumentCount === 0
          ? "pass"
          : "fail",
      evidence: {
        intakeRoute: "/inventory?tab=intake",
        directIntakeLabel,
        intakeSubmitButtons,
        intakePilotDocumentCount,
      },
    };

    const apProof = await ensureAccountingApProofContext(page);
    const invoicesResult = await callTrpc(page, "accounting.invoices.list", {
      limit: 100,
      offset: 0,
    });
    const filteredInvoiceCustomerId =
      (invoicesResult?.items ?? []).find(
        invoice =>
          typeof invoice.customerId === "number" && invoice.status === "OVERDUE"
      )?.customerId ??
      (invoicesResult?.items ?? []).find(
        invoice => typeof invoice.customerId === "number"
      )?.customerId;
    if (!filteredInvoiceCustomerId) {
      throw new Error("No customer found for TER-1128 runtime proof");
    }
    const filteredArQuery = await callTrpc(page, "accounting.invoices.list", {
      customerId: filteredInvoiceCustomerId,
      limit: 100,
      offset: 0,
    });
    const filteredBillsQuery = await callTrpc(page, "accounting.bills.list", {
      vendorId: apProof.primaryBill.vendorId,
      limit: 100,
      offset: 0,
    });
    const filteredArTotal = (filteredArQuery?.items ?? []).reduce(
      (sum, invoice) => sum + parseAmount(invoice.amountDue ?? invoice.totalAmount),
      0
    );
    const filteredApTotal = (filteredBillsQuery?.items ?? []).reduce(
      (sum, bill) => sum + parseAmount(bill.amountDue ?? bill.totalAmount),
      0
    );
    const filteredArOverdueCount = (filteredArQuery?.items ?? []).filter(
      invoice => invoice.status === "OVERDUE"
    ).length;
    const filteredApOverdueCount = (filteredBillsQuery?.items ?? []).filter(
      bill => bill.status === "OVERDUE"
    ).length;
    const arSummary = await callTrpc(page, "accounting.arApDashboard.getARSummary", {});
    const apSummary = await callTrpc(page, "accounting.arApDashboard.getAPSummary", {});
    const overdueInvoices = await callTrpc(
      page,
      "accounting.arApDashboard.getOverdueInvoices",
      { limit: 5 }
    );
    const overdueBills = await callTrpc(
      page,
      "accounting.arApDashboard.getOverdueBills",
      { limit: 5 }
    );
    await gotoRoute(
      page,
      `/accounting?clientId=${filteredInvoiceCustomerId}&vendorId=${apProof.primaryBill.vendorId}`
    );
    const filteredAccountingActivity = await visibleTextMetric(
      page,
      "Filtered accounting activity"
    );
    const filteredArCard = await visibleTextMetric(
      page,
      formatCurrency(filteredArTotal)
    );
    const filteredApCard = await visibleTextMetric(
      page,
      formatCurrency(filteredApTotal)
    );
    const globalArTotal = parseAmount(arSummary?.totalAR);
    const globalApTotal = parseAmount(apSummary?.totalAP);
    const globalArOverdueCount = overdueInvoices?.pagination?.total ?? 0;
    const globalApOverdueCount = overdueBills?.pagination?.total ?? 0;
    const filteredArWithinGlobal =
      filteredArTotal <= globalArTotal &&
      filteredArOverdueCount <= globalArOverdueCount;
    const filteredApWithinGlobal =
      filteredApTotal <= globalApTotal &&
      filteredApOverdueCount <= globalApOverdueCount;

    await gotoRoute(page, "/accounting");
    const globalAccountingActivity = await visibleTextMetric(
      page,
      "All accounting activity"
    );
    const globalArCard = await visibleTextMetric(
      page,
      formatCurrency(parseAmount(arSummary?.totalAR))
    );
    const globalApCard = await visibleTextMetric(
      page,
      formatCurrency(parseAmount(apSummary?.totalAP))
    );
    results.tickets["TER-1128"] = {
      status:
        filteredAccountingActivity.visible &&
        filteredArCard.visible &&
        filteredApCard.visible &&
        globalAccountingActivity.visible &&
        globalArCard.visible &&
        globalApCard.visible &&
        filteredArWithinGlobal &&
        filteredApWithinGlobal &&
        filteredArOverdueCount >= 1 &&
        filteredApOverdueCount >= 1 &&
        filteredApOverdueCount < globalApOverdueCount
          ? "pass"
          : "fail",
      evidence: {
        filteredInvoiceCustomerId,
        filteredBillVendorId: apProof.primaryBill.vendorId,
        comparisonVendorId: apProof.comparisonBill.vendorId,
        filteredArTotal: formatCurrency(filteredArTotal),
        filteredApTotal: formatCurrency(filteredApTotal),
        filteredArOverdueCount,
        filteredApOverdueCount,
        globalArTotal: formatCurrency(globalArTotal),
        globalApTotal: formatCurrency(globalApTotal),
        globalArOverdueCount,
        globalApOverdueCount,
        filteredArWithinGlobal,
        filteredApWithinGlobal,
        filteredAccountingActivity,
        filteredArCard,
        filteredApCard,
        globalAccountingActivity,
        globalArCard,
        globalApCard,
      },
    };

    const sessionAfterOperations = await probeSession(
      page,
      "after-operations-runtime-proof"
    );
    results.sessionHealth.afterOperations = sessionAfterOperations;
    if (!sessionAfterOperations.ok) {
      throw new Error(
        `Session probe failed after operations runtime proof: ${sessionAfterOperations.status}`
      );
    }

    const salesOverflow = await gotoRoute(page, "/sales").then(() =>
      page.evaluate(() => ({
        path: location.pathname + location.search,
        horizontalOverflow:
          document.documentElement.scrollWidth > window.innerWidth + 1,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }))
    );
    const ordersDueDate = await visibleTextMetric(page, "Due Date");
    const ordersPayment = await visibleTextMetric(page, "Payment");

    const relationshipsOverflow = await gotoRoute(page, "/relationships").then(
      () =>
        page.evaluate(() => ({
          path: location.pathname + location.search,
          horizontalOverflow:
            document.documentElement.scrollWidth > window.innerWidth + 1,
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
        }))
    );
    const relationshipsStatus = await visibleTextMetric(page, "Status");
    const relationshipsLastActivity = await visibleTextMetric(
      page,
      "Last Activity"
    );

    const procurementSeed = await ensureConfirmedPurchaseOrder(page);
    await cleanupTaggedPurchaseOrders(
      page,
      procurementSeed.createdPurchaseOrderId ?? null
    );

    const procurementOverflow = await gotoRoute(page, "/purchase-orders").then(
      () =>
        page.evaluate(() => ({
          path: location.pathname + location.search,
          horizontalOverflow:
            document.documentElement.scrollWidth > window.innerWidth + 1,
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
        }))
    );
    const procurementReceiving = await visibleTextMetric(page, "Receiving");
    const procurementEta = await visibleTextMetric(page, "Est. Delivery");
    const seededProcurementRow = page
      .locator(".ag-center-cols-container .ag-row")
      .filter({
        hasText: procurementSeed.createdPurchaseOrderNumber ?? "",
      })
      .first();
    const seededProcurementRowVisible = await seededProcurementRow
      .isVisible()
      .catch(() => false);
    const procurementQueueRowCountObserved = await page
      .locator(".ag-center-cols-container .ag-row")
      .count();

    results.tickets["TER-1136"] = {
      status:
        !salesOverflow.horizontalOverflow &&
        !relationshipsOverflow.horizontalOverflow &&
        !procurementOverflow.horizontalOverflow &&
        ordersDueDate.visible &&
        ordersDueDate.withinViewport &&
        ordersPayment.visible &&
        ordersPayment.withinViewport &&
        relationshipsStatus.visible &&
        relationshipsStatus.withinViewport &&
        relationshipsLastActivity.visible &&
        relationshipsLastActivity.withinViewport &&
        seededProcurementRowVisible &&
        procurementReceiving.visible &&
        procurementReceiving.withinViewport &&
        procurementEta.visible &&
        procurementEta.withinViewport
          ? "pass"
          : "fail",
      evidence: {
        salesOverflow,
        relationshipsOverflow,
        procurementOverflow,
        procurementSeed,
        seededProcurementRowVisible,
        procurementQueueRowCountObserved,
        procurementColumnsVerifiedOnSeededQueue:
          seededProcurementRowVisible &&
          procurementReceiving.visible &&
          procurementEta.visible,
        ordersDueDate,
        ordersPayment,
        relationshipsStatus,
        relationshipsLastActivity,
        procurementReceiving,
        procurementEta,
      },
    };

    const duplicationAudits = [];
    duplicationAudits.push(
      await runPrefixDuplicationAudit(page, "/sales", {
        table: "[data-testid='orders-table']",
        headers: "thead th",
        cells: "tbody td",
      })
    );
    duplicationAudits.push(
      await runPrefixDuplicationAudit(page, "/relationships", {
        table: "[data-testid='clients-table']",
        headers: "thead th",
        cells: "tbody td",
      })
    );

    results.tickets["TER-1134"] = {
      status: duplicationAudits.every(
        audit => audit.foundTable && audit.duplicatedCells.length === 0
      )
        ? "pass"
        : "fail",
      evidence: duplicationAudits,
    };

    const relationshipOrderLink = await verifyRelationshipOrderLink(page);
    const ordersInspectorLink = await verifyOrdersInspectorLink(page);
    const invoiceInspectorLink = await verifyInvoiceInspectorLink(page);

    results.tickets["TER-1137"] = {
      status:
        relationshipOrderLink.reachesSalesWithClientFilter &&
        ordersInspectorLink.openClientProfileVisible &&
        invoiceInspectorLink.openClientProfileVisible
          ? "pass"
          : "fail",
      evidence: {
        relationshipOrderLink,
        ordersInspectorLink,
        invoiceInspectorLink,
      },
    };

    const salesToClientProfile = await verifySalesToClientProfileFlow(page);
    const invoiceToClientProfile = await verifyInvoiceToClientProfileFlow(page);

    results.tickets["TER-1138"] = {
      status:
        relationshipOrderLink.reachesSalesWithClientFilter &&
        salesToClientProfile.clickDepth !== null &&
        salesToClientProfile.clickDepth <= 2 &&
        salesToClientProfile.reachesClientProfile &&
        invoiceToClientProfile.clickDepth !== null &&
        invoiceToClientProfile.clickDepth <= 2 &&
        invoiceToClientProfile.reachesClientProfile
          ? "pass"
          : "fail",
      evidence: {
        relationshipToOrders: {
          clickDepth: relationshipOrderLink.clicked ? 1 : null,
          navigatedPath: relationshipOrderLink.navigatedPath,
          reachesSalesWithClientFilter:
            relationshipOrderLink.reachesSalesWithClientFilter,
        },
        salesToClientProfile,
        invoiceToClientProfile,
      },
    };

    const ordersConfirmation = await verifyOrdersConfirmation(page);
    const invoiceVoidConfirmation = await verifyInvoiceVoidConfirmation(page);

    results.tickets["TER-1139"] = {
      status:
        ordersConfirmation.dialogVisible &&
        invoiceVoidConfirmation.dialogVisible
          ? "pass"
          : "fail",
      evidence: {
        ordersConfirmation,
        invoiceVoidConfirmation,
      },
    };
  } catch (error) {
    results.runtimeError = toErrorString(error);
  }
}

await browser.close();

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

console.log(JSON.stringify(results, null, 2));

if (!auth.ok || results.runtimeError) {
  process.exitCode = 1;
}
