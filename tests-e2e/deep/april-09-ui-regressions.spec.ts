import { expect, test, type APIResponse, type Page } from "@playwright/test";
import superjson from "superjson";
import {
  AUTH_ROUTES,
  loginAsAdmin,
  loginViaForm,
  TEST_USERS,
} from "../fixtures/auth";
import {
  ORDER_PAYMENT_STATUS_TOKENS,
  RELATIONSHIP_ROLE_TOKENS,
} from "@/lib/statusTokens";

const PROCUREMENT_PROOF_NOTE = "April 9 procurement browser proof";
const ACCOUNTING_AP_PROOF_TOKEN = "APRIL-09-AP-PROOF";
const ACCOUNTING_AP_COMPARISON_TOKEN = "APRIL-09-AP-COMPARISON";
const SALES_PARTIAL_PROOF_TOKEN = "APRIL-09-SALES-PARTIAL-PROOF";
const ORDERS_VIEW_STATE_KEY = "terp-sales-orders-view-v2";
const TRPC_RETRY_DELAYS_MS = [250, 750, 1500];
const INVENTORY_STATUS_LABELS = [
  "Available",
  "On Hold",
  "Quality Hold",
  "Incoming",
  "Sold Out",
  "Closed",
] as const;

async function parseTrpcResponse<T>(
  response: APIResponse,
  endpoint: string,
  method: "GET" | "POST"
): Promise<T> {
  if (!response.ok()) {
    throw new Error(
      `tRPC ${method} call to ${endpoint} failed: ${response.status()} ${await response.text()}`
    );
  }

  const rawBody = (await response.json()) as unknown;
  const body = Array.isArray(rawBody) ? rawBody[0] : rawBody;
  if (typeof body !== "object" || body === null) {
    throw new Error(
      `tRPC ${method} call to ${endpoint} returned unexpected payload`
    );
  }

  const typedBody = body as {
    result?: { data?: { json?: T } };
    error?: unknown;
  };
  if (typedBody.error) {
    throw new Error(
      `tRPC error from ${endpoint}: ${JSON.stringify(typedBody.error)}`
    );
  }

  if (!typedBody.result?.data || !("json" in typedBody.result.data)) {
    throw new Error(
      `tRPC ${method} call to ${endpoint} returned no result payload`
    );
  }

  return typedBody.result.data.json as T;
}

async function callTrpc<T>(
  page: Page,
  endpoint: string,
  input: Record<string, unknown>
): Promise<T> {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
  const trpcUrl = `${baseUrl}/api/trpc/${endpoint}`;
  const serializedInput = superjson.serialize(input);

  for (let attempt = 0; attempt <= TRPC_RETRY_DELAYS_MS.length; attempt += 1) {
    const postResponse = await page.request.post(trpcUrl, {
      headers: { "Content-Type": "application/json" },
      data: serializedInput,
    });

    if (postResponse.status() === 429) {
      if (attempt === TRPC_RETRY_DELAYS_MS.length) {
        return parseTrpcResponse<T>(postResponse, endpoint, "POST");
      }

      await page.waitForTimeout(TRPC_RETRY_DELAYS_MS[attempt]);
      continue;
    }

    if (postResponse.status() !== 405) {
      return parseTrpcResponse<T>(postResponse, endpoint, "POST");
    }

    const getUrl = new URL(trpcUrl);
    getUrl.searchParams.set("input", JSON.stringify(serializedInput));
    const getResponse = await page.request.get(getUrl.toString());

    if (getResponse.status() === 429) {
      if (attempt === TRPC_RETRY_DELAYS_MS.length) {
        return parseTrpcResponse<T>(getResponse, endpoint, "GET");
      }

      await page.waitForTimeout(TRPC_RETRY_DELAYS_MS[attempt]);
      continue;
    }

    return parseTrpcResponse<T>(getResponse, endpoint, "GET");
  }

  throw new Error(`tRPC retry loop exhausted for ${endpoint}`);
}

async function findFirstSupplierId(page: Page): Promise<number> {
  const result = await callTrpc<{ items: Array<{ id: number }> }>(
    page,
    "clients.list",
    { clientTypes: ["seller"], limit: 1 }
  );
  const supplierId = result.items[0]?.id;
  if (!supplierId) {
    throw new Error("No supplier found for procurement regression proof");
  }
  return supplierId;
}

async function findFirstBuyerId(page: Page): Promise<number> {
  const result = await callTrpc<{ items: Array<{ id: number }> }>(
    page,
    "clients.list",
    { clientTypes: ["buyer"], limit: 1, offset: 0 }
  );
  const buyerId = result.items[0]?.id;
  if (!buyerId) {
    throw new Error("No buyer found for sales regression proof");
  }
  return buyerId;
}

async function findSellableBatch(page: Page): Promise<{
  id: number;
  unitCogs: number;
}> {
  const result = await callTrpc<{
    items: Array<{
      batch?: {
        id?: number;
        onHandQty?: string | number | null;
        reservedQty?: string | number | null;
        unitCogs?: string | number | null;
        batchStatus?: string | null;
      };
    }>;
  }>(page, "inventory.list", { limit: 100, offset: 0 });

  const sellableBatch = result.items.find(item => {
    const batch = item.batch;
    if (
      typeof batch?.id !== "number" ||
      normalizeStatus(batch.batchStatus) !== "LIVE"
    ) {
      return false;
    }

    const onHandQty = parseAmount(batch.onHandQty);
    const reservedQty = parseAmount(batch.reservedQty);
    return onHandQty - reservedQty > 0;
  })?.batch;

  if (sellableBatch?.id) {
    return {
      id: sellableBatch.id,
      unitCogs: parseAmount(sellableBatch.unitCogs),
    };
  }

  const promotableBatch = result.items.find(item => {
    const batch = item.batch;
    if (
      typeof batch?.id !== "number" ||
      normalizeStatus(batch.batchStatus) !== "AWAITING_INTAKE"
    ) {
      return false;
    }

    const onHandQty = parseAmount(batch.onHandQty);
    const reservedQty = parseAmount(batch.reservedQty);
    return onHandQty - reservedQty > 0;
  })?.batch;

  if (promotableBatch?.id) {
    await callTrpc(page, "inventory.updateStatus", {
      id: promotableBatch.id,
      status: "LIVE",
      reason:
        "April 9 sales browser proof: promote seeded inventory to LIVE for deterministic partial-payment row tint validation",
    });

    return {
      id: promotableBatch.id,
      unitCogs: parseAmount(promotableBatch.unitCogs),
    };
  }

  throw new Error("No sellable inventory batch found for sales regression proof");
}

async function cleanupProofOrder(page: Page, orderId: number | null) {
  if (!orderId) {
    return;
  }

  await callTrpc(page, "orders.delete", { id: orderId }).catch(() => undefined);
}

async function findSupplierForAccountingBill(page: Page): Promise<number> {
  const result = await callTrpc<{ items: Array<{ id: number }> }>(
    page,
    "clients.list",
    { clientTypes: ["seller"], limit: 20 }
  );

  for (const supplier of result.items) {
    const existingBills = await callTrpc<{ items: Array<{ id: number }> }>(
      page,
      "accounting.bills.list",
      { vendorId: supplier.id, limit: 1, offset: 0 }
    );
    if ((existingBills.items ?? []).length === 0) {
      return supplier.id;
    }
  }

  const supplierId = result.items[0]?.id;
  if (!supplierId) {
    throw new Error("No supplier found for accounting AP regression proof");
  }
  return supplierId;
}

async function listSupplierIds(page: Page): Promise<number[]> {
  const result = await callTrpc<{ items: Array<{ id: number }> }>(
    page,
    "clients.list",
    { clientTypes: ["seller"], limit: 50, offset: 0 }
  );
  return result.items.map(item => item.id).filter(Boolean);
}

async function findFirstProductId(page: Page): Promise<number> {
  const result = await callTrpc<{
    items: Array<{
      id?: number;
      productId?: number;
      batch?: { productId?: number };
      product?: { id?: number };
    }>;
  }>(page, "inventory.list", { limit: 1 });
  const batch = result.items[0];
  const productId =
    batch?.product?.id ?? batch?.batch?.productId ?? batch?.productId ?? batch?.id;
  if (!productId) {
    throw new Error("No product found for procurement regression proof");
  }
  return productId;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function parseAmount(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

function pluralize(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function getDisplaySalesOrderNumber(orderNumber: string | null | undefined) {
  const raw = String(orderNumber ?? "").trim();
  if (!raw) {
    return "";
  }

  const [prefix, ...suffixParts] = raw.split("-");
  const suffix = suffixParts.join("-");
  if (!suffix) {
    return raw;
  }

  return ["D", "O"].includes(prefix.toUpperCase()) ? `S-${suffix}` : raw;
}

function normalizeStatus(status: string | null | undefined) {
  return String(status ?? "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

function isPaymentComplete(status: string | null | undefined) {
  const normalized = normalizeStatus(status);
  return normalized === "PAID";
}

function isPaymentOverdue(order: {
  saleStatus?: string | null;
  dueDate?: string | null;
}) {
  if (normalizeStatus(order.saleStatus) === "OVERDUE") {
    return true;
  }

  if (!order.dueDate || isPaymentComplete(order.saleStatus)) {
    return false;
  }

  return new Date(order.dueDate).getTime() < Date.now();
}

function normalizeFulfillmentStatus(status: string | null | undefined) {
  const normalized = normalizeStatus(status);
  return normalized === "PENDING" ? "READY_FOR_PACKING" : normalized;
}

function getActionableOrderPriority(order: {
  isDraft?: boolean | null;
  fulfillmentStatus?: string | null;
  saleStatus?: string | null;
  dueDate?: string | null;
}) {
  if (order.isDraft) return 6;
  if (isPaymentOverdue(order)) return 0;

  const fulfillment = normalizeFulfillmentStatus(order.fulfillmentStatus);
  if (fulfillment === "READY_FOR_PACKING") return 1;
  if (fulfillment === "PACKED") return 2;
  if (normalizeStatus(order.saleStatus) === "PARTIAL") return 3;
  if (normalizeStatus(order.saleStatus) === "PENDING") return 4;
  if (fulfillment === "SHIPPED") return 5;
  return 7;
}

function getExpectedPaymentTone(order: {
  saleStatus?: string | null;
  dueDate?: string | null;
}) {
  if (isPaymentOverdue(order)) {
    return ORDER_PAYMENT_STATUS_TOKENS.OVERDUE;
  }

  const normalized = normalizeStatus(order.saleStatus);
  return (
    ORDER_PAYMENT_STATUS_TOKENS[
      normalized as keyof typeof ORDER_PAYMENT_STATUS_TOKENS
    ] ?? ORDER_PAYMENT_STATUS_TOKENS.PENDING
  );
}

function getBaseUrl() {
  return process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
}

async function probeSession(page: Page, label: string) {
  const response = await page.request.get(`${getBaseUrl()}${AUTH_ROUTES.apiMe}`);
  let email: string | null = null;

  try {
    const body = (await response.json()) as {
      user?: { email?: string | null };
      email?: string | null;
    };
    email = body.user?.email ?? body.email ?? null;
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

async function loginAsAdminInFirefox(page: Page) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await loginViaForm(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto(`${getBaseUrl()}/dashboard`);
    if (!page.url().includes("/login")) {
      return;
    }
  }

  throw new Error("Firefox login did not persist after retry");
}

async function ensureConfirmedPurchaseOrder(page: Page) {
  const supplierClientId = await findFirstSupplierId(page);
  const productId = await findFirstProductId(page);
  const orderDate = new Date().toISOString().split("T")[0];
  const expectedDeliveryDate = "2024-01-15";
  const existing = await callTrpc<{
    items: Array<{
      id: number;
      poNumber?: string;
      notes?: string | null;
      expectedDeliveryDate?: string | null;
    }>;
  }>(page, "purchaseOrders.getAll", {
    supplierClientId,
    status: "CONFIRMED",
    limit: 50,
    offset: 0,
  });
  const matchingPo = existing.items.find(
    po =>
      po.notes === PROCUREMENT_PROOF_NOTE &&
      po.expectedDeliveryDate === expectedDeliveryDate
  );

  if (matchingPo?.id && matchingPo.poNumber) {
    return {
      id: matchingPo.id,
      poNumber: matchingPo.poNumber,
      expectedDeliveryDate,
      reused: true,
    };
  }

  const created = await callTrpc<{ id: number; poNumber: string }>(
    page,
    "purchaseOrders.create",
    {
      supplierClientId,
      orderDate,
      expectedDeliveryDate,
      paymentTerms: "NET_30",
      notes: PROCUREMENT_PROOF_NOTE,
      items: [{ productId, quantityOrdered: 5, unitCost: 42 }],
    }
  );

  await callTrpc(page, "purchaseOrders.submit", { id: created.id });
  await callTrpc(page, "purchaseOrders.confirm", { id: created.id });
  return {
    id: created.id,
    poNumber: created.poNumber,
    expectedDeliveryDate,
    reused: false,
  };
}

async function cleanupTaggedPurchaseOrders(page: Page, keepId?: number | null) {
  const supplierClientId = await findFirstSupplierId(page);
  const existing = await callTrpc<{
    items: Array<{
      id: number;
      notes?: string | null;
    }>;
  }>(page, "purchaseOrders.getAll", {
    supplierClientId,
    limit: 100,
    offset: 0,
  });

  for (const po of existing.items) {
    if (po.notes !== PROCUREMENT_PROOF_NOTE || po.id === keepId) {
      continue;
    }

    await callTrpc(page, "purchaseOrders.delete", { id: po.id });
  }
}

async function delayAccountingSurfaceChunks(page: Page) {
  await page.route(/InvoicesSurface|BillsSurface|PaymentsSurface/, async route => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.continue();
  });
}

async function ensureTaggedOverdueBill(
  page: Page,
  {
    token,
    description,
    preferredVendorId,
  }: {
    token: string;
    description: string;
    preferredVendorId?: number;
  }
) {
  const existingBills = await callTrpc<{
    items: Array<{
      id: number;
      billNumber?: string | null;
      vendorId?: number | null;
      notes?: string | null;
      status?: string | null;
    }>;
  }>(page, "accounting.bills.list", {
    searchTerm: token,
    limit: 50,
    offset: 0,
  });
  const matchingBills = existingBills.items.filter(
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
  const createdBillId = await callTrpc<number>(page, "accounting.bills.create", {
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

async function ensureAccountingApProofContext(page: Page) {
  const supplierIds = await listSupplierIds(page);
  if (supplierIds.length < 2) {
    throw new Error("Need at least two suppliers for AP filter regression proof");
  }

  const primaryBill = await ensureTaggedOverdueBill(page, {
    token: ACCOUNTING_AP_PROOF_TOKEN,
    description: "April 9 AP browser proof bill",
    preferredVendorId: supplierIds[0],
  });
  const comparisonVendorId =
    supplierIds.find(id => id !== primaryBill.vendorId) ?? supplierIds[1];

  if (!comparisonVendorId || comparisonVendorId === primaryBill.vendorId) {
    throw new Error("Unable to find distinct supplier for AP comparison proof");
  }

  const comparisonBill = await ensureTaggedOverdueBill(page, {
    token: ACCOUNTING_AP_COMPARISON_TOKEN,
    description: "April 9 AP comparison proof bill",
    preferredVendorId: comparisonVendorId,
  });

  return { primaryBill, comparisonBill };
}

async function createPartialPaymentSalesProofOrder(page: Page) {
  const buyerId = await findFirstBuyerId(page);
  const batch = await findSellableBatch(page);
  const order = await callTrpc<{ id: number; orderNumber?: string | null }>(
    page,
    "orders.create",
    {
      orderType: "SALE",
      clientId: buyerId,
      items: [
        {
          batchId: batch.id,
          quantity: 1,
          unitPrice: Math.max(batch.unitCogs * 1.5, 1),
          isSample: false,
        },
      ],
      paymentTerms: "NET_30",
      notes: SALES_PARTIAL_PROOF_TOKEN,
    }
  );

  await callTrpc(page, "orders.confirmOrder", { id: order.id });

  const invoice = await callTrpc<{ id: number }>(
    page,
    "invoices.generateFromOrder",
    { orderId: order.id }
  );
  await callTrpc(page, "invoices.markSent", { id: invoice.id });

  const sentInvoice = await callTrpc<{
    totalAmount?: string | number | null;
  }>(page, "invoices.getById", { id: invoice.id });
  const totalAmount = parseAmount(sentInvoice.totalAmount);
  if (totalAmount <= 0) {
    throw new Error("Sales proof invoice did not return a payable total");
  }

  const partialAmount = Number((totalAmount / 2).toFixed(2));
  await callTrpc(page, "payments.recordPayment", {
    invoiceId: invoice.id,
    amount: partialAmount,
    paymentMethod: "ACH",
    referenceNumber: `${SALES_PARTIAL_PROOF_TOKEN}-${Date.now()}`,
  });

  const partialInvoice = await callTrpc<{ status?: string | null }>(
    page,
    "invoices.getById",
    { id: invoice.id }
  );
  expect(partialInvoice.status).toBe("PARTIAL");
  const partialOrder = await callTrpc<{ saleStatus?: string | null }>(
    page,
    "orders.getById",
    { id: order.id }
  );
  expect(normalizeStatus(partialOrder.saleStatus)).toBe("PARTIAL");

  return {
    orderId: order.id,
    orderNumber: getDisplaySalesOrderNumber(order.orderNumber) || String(order.id),
    reused: false,
  };
}

async function ensureSalesWarningTintProofOrder(page: Page) {
  const visibleOrders = await callTrpc<{
    items: Array<{
      id: number;
      orderNumber?: string | null;
      saleStatus?: string | null;
      dueDate?: string | null;
      isDraft?: boolean | null;
    }>;
  }>(page, "orders.getAll", {
    orderType: "SALE",
    isDraft: false,
    limit: 50,
    offset: 0,
  });

  const existingProofOrder = visibleOrders.items.find(order => {
    if (order.isDraft) {
      return false;
    }

    return (
      isPaymentOverdue(order) || normalizeStatus(order.saleStatus) === "PARTIAL"
    );
  });

  if (existingProofOrder?.id) {
    return {
      orderId: existingProofOrder.id,
      orderNumber:
        getDisplaySalesOrderNumber(existingProofOrder.orderNumber) ||
        String(existingProofOrder.id),
      reused: true,
    };
  }

  return createPartialPaymentSalesProofOrder(page);
}

async function setScrollableAncestorScrollTop(
  table: import("@playwright/test").Locator,
  nextScrollTop: number
) {
  return table.evaluate((node, desiredScrollTop) => {
    let current: HTMLElement | null =
      node instanceof HTMLElement ? node : node.parentElement;

    while (current) {
      const style = window.getComputedStyle(current);
      const scrollable =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        current.scrollHeight > current.clientHeight;

      if (scrollable) {
        current.scrollTop = desiredScrollTop;
        return current.scrollTop;
      }

      current = current.parentElement;
    }

    return -1;
  }, nextScrollTop);
}

async function readScrollableAncestorScrollTop(
  table: import("@playwright/test").Locator
) {
  return table.evaluate(node => {
    let current: HTMLElement | null =
      node instanceof HTMLElement ? node : node.parentElement;

    while (current) {
      const style = window.getComputedStyle(current);
      const scrollable =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        current.scrollHeight > current.clientHeight;

      if (scrollable) {
        return current.scrollTop;
      }

      current = current.parentElement;
    }

    return -1;
  });
}

async function readScrollableAncestorDetails(
  table: import("@playwright/test").Locator
) {
  return table.evaluate(node => {
    let current: HTMLElement | null =
      node instanceof HTMLElement ? node : node.parentElement;

    while (current) {
      const style = window.getComputedStyle(current);
      const scrollable =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        current.scrollHeight > current.clientHeight;

      if (scrollable) {
        return {
          tagName: current.tagName,
          className: current.className,
          testId: current.getAttribute("data-testid"),
          scrollTop: current.scrollTop,
        };
      }

      current = current.parentElement;
    }

    return null;
  });
}

test.describe("April 9 UI regression proofs", () => {
  test.beforeEach(async ({ page }) => {
    if (test.info().project.name === "deep-firefox") {
      await loginAsAdminInFirefox(page);
    } else {
      await loginAsAdmin(page);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("keeps actionable sales columns visible at 1280px", async ({ page }) => {
    await page.goto("/sales");
    await expect(page).toHaveURL(/\/sales/);
    await expect(page.getByTestId("orders-table")).toBeVisible();

    const dueDate = page.getByText("Due Date", { exact: true }).first();
    const payment = page.getByText("Payment", { exact: true }).first();

    await expect(dueDate).toBeVisible();
    await expect(payment).toBeVisible();

    const [dueDateBox, paymentBox, hasOverflow] = await Promise.all([
      dueDate.boundingBox(),
      payment.boundingBox(),
      page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      ),
    ]);

    expect(dueDateBox).not.toBeNull();
    expect(paymentBox).not.toBeNull();
    expect((dueDateBox?.x ?? 0) + (dueDateBox?.width ?? 0)).toBeLessThanOrEqual(
      1280
    );
    expect((paymentBox?.x ?? 0) + (paymentBox?.width ?? 0)).toBeLessThanOrEqual(
      1280
    );
    expect(hasOverflow).toBe(false);
  });

  test("keeps sales quick actions split between primary buttons and overflow", async ({
    page,
  }) => {
    await page.goto("/sales");
    await expect(page).toHaveURL(/\/sales/);

    const firstRow = page.locator("[data-testid='orders-table'] tbody tr[data-orderid]").first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    await expect(
      page.getByRole("heading", { name: "Quick Actions", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /make payment/i })
    ).toBeVisible();
    await expect(
      page.getByTestId("order-more-actions-btn")
    ).toBeVisible();
  });

  test("defaults sales to most actionable sorting with semantic payment badges", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(storageKey => window.localStorage.removeItem(storageKey), ORDERS_VIEW_STATE_KEY);

    const confirmedOrders = await callTrpc<{
      items: Array<{
        id: number;
        isDraft?: boolean | null;
        fulfillmentStatus?: string | null;
        saleStatus?: string | null;
        dueDate?: string | null;
        createdAt?: string | null;
      }>;
    }>(page, "orders.getAll", {
      orderType: "SALE",
      isDraft: false,
    });

    const expectedTopOrder = [...confirmedOrders.items].sort((a, b) => {
      const priorityA = getActionableOrderPriority(a);
      const priorityB = getActionableOrderPriority(b);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const dueA = a.dueDate
        ? new Date(a.dueDate).getTime()
        : Number.POSITIVE_INFINITY;
      const dueB = b.dueDate
        ? new Date(b.dueDate).getTime()
        : Number.POSITIVE_INFINITY;
      if (dueA !== dueB) {
        return dueA - dueB;
      }

      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA;
    })[0];
    expect(expectedTopOrder).toBeTruthy();

    await page.goto("/sales");
    await expect(page).toHaveURL(/\/sales/);
    await expect(page.getByText("Most actionable", { exact: true }).first()).toBeVisible();

    const firstRow = page
      .locator("[data-testid='orders-table'] tbody tr[data-orderid]")
      .first();
    await expect(firstRow).toHaveAttribute(
      "data-orderid",
      String(expectedTopOrder.id)
    );

    const paymentBadge = firstRow.locator("td").nth(4).locator("[class*='border-']").first();
    await expect(paymentBadge).toBeVisible();
    expect(await paymentBadge.getAttribute("class")).toContain(
      getExpectedPaymentTone(expectedTopOrder)
    );
  });

  test("renders partial-payment sales rows with a warning tint in the live table", async ({
    page,
  }) => {
    let proofOrderId: number | null = null;
    let createdProofOrder = false;

    try {
      const proofOrder = await ensureSalesWarningTintProofOrder(page);
      proofOrderId = proofOrder.orderId;
      createdProofOrder = !proofOrder.reused;

      await page.goto("/sales");
      await expect(page).toHaveURL(/\/sales/);
      await page.getByRole("tab", { name: /Confirmed \(\d+\)/ }).click();
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      await page
        .getByPlaceholder("Search orders... (Cmd+K)")
        .fill(proofOrder.orderNumber);

      const proofRow = page.getByTestId(`order-row-${proofOrder.orderId}`);
      await expect(proofRow).toBeVisible();
      await expect
        .poll(async () => (await proofRow.getAttribute("class")) ?? "")
        .toContain("border-l-amber-500");
      await expect
        .poll(async () => (await proofRow.getAttribute("class")) ?? "")
        .toContain("bg-yellow-50");

      const proofRowVisuals = await proofRow.evaluate(node => {
        const style = window.getComputedStyle(node as HTMLElement);
        return {
          backgroundColor: style.backgroundColor,
          borderLeftColor: style.borderLeftColor,
          borderLeftWidth: style.borderLeftWidth,
        };
      });

      expect(proofRowVisuals.borderLeftWidth).not.toBe("0px");
      expect(proofRowVisuals.borderLeftColor).not.toBe("rgba(0, 0, 0, 0)");
      expect(proofRowVisuals.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    } finally {
      await cleanupProofOrder(page, createdProofOrder ? proofOrderId : null);
    }
  });

  test("preserves relationships search and scroll after profile navigation", async ({
    page,
  }) => {
    await page.goto("/relationships");
    await expect(page).toHaveURL(/\/relationships/);
    await expect(page.getByTestId("clients-table")).toBeVisible();
    await expect(page.getByText("Status", { exact: true })).toBeVisible();
    await expect(page.getByText("Last Activity", { exact: true })).toBeVisible();

    const searchInput = page.getByTestId("clients-search-input");
    await searchInput.fill("a");

    const table = page.getByTestId("clients-table");
    const initialScrollTop = await setScrollableAncestorScrollTop(table, 180);
    const initialScrollContainer = await readScrollableAncestorDetails(table);

    expect(initialScrollTop).toBeGreaterThan(0);
    expect(initialScrollContainer).not.toBeNull();

    const clickedClient = await table.evaluate(node => {
      let scrollContainer: HTMLElement | null =
        node instanceof HTMLElement ? node : node.parentElement;

      while (scrollContainer) {
        const style = window.getComputedStyle(scrollContainer);
        const scrollable =
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          scrollContainer.scrollHeight > scrollContainer.clientHeight;

        if (scrollable) {
          break;
        }

        scrollContainer = scrollContainer.parentElement;
      }

      if (!scrollContainer) {
        return null;
      }

      const containerRect = scrollContainer.getBoundingClientRect();
      const visibleRow = Array.from(
        node.querySelectorAll<HTMLTableRowElement>("tbody tr")
      );
      const targetRow = visibleRow.find(row => {
        const rect = row.getBoundingClientRect();
        return (
          rect.top >= containerRect.top &&
          rect.bottom <= containerRect.bottom
        );
      });

      if (!targetRow) {
        return null;
      }

      targetRow.dispatchEvent(
        new MouseEvent("dblclick", { bubbles: true, cancelable: true })
      );
      return targetRow.textContent;
    });

    expect(clickedClient).toBeTruthy();
    await expect(page).toHaveURL(/\/clients\/\d+\?section=overview/);

    const savedScrollTop = await page.evaluate(() =>
      window.sessionStorage.getItem("terp-clients-view-v2:scroll-top")
    );
    const savedScrollTopNumber = Number(savedScrollTop);
    expect(savedScrollTopNumber).toBeGreaterThan(0);

    await page.goBack();
    await expect(page).toHaveURL(/\/relationships/);
    await expect(page.getByTestId("clients-table")).toBeVisible();
    await expect(searchInput).toHaveValue("a");

    await expect
      .poll(async () => {
        const restoredContainer = await readScrollableAncestorDetails(table);
        return restoredContainer
          ? JSON.stringify({
              tagName: restoredContainer.tagName,
              className: restoredContainer.className,
              testId: restoredContainer.testId,
            })
          : null;
      })
      .toBe(
        JSON.stringify({
          tagName: initialScrollContainer?.tagName,
          className: initialScrollContainer?.className,
          testId: initialScrollContainer?.testId,
        })
      );

    await expect
      .poll(async () =>
        Math.abs((await readScrollableAncestorScrollTop(table)) - savedScrollTopNumber)
      )
      .toBeLessThanOrEqual(8);
  });

  test("renders semantic relationship role badge classes on a live client profile", async ({
    page,
  }) => {
    const buyers = await callTrpc<{
      items: Array<{ id: number }>;
    }>(page, "clients.list", {
      clientTypes: ["buyer"],
      limit: 1,
      offset: 0,
    });
    const clientId = buyers.items[0]?.id;
    expect(clientId).toBeTruthy();

    await page.goto(`/clients/${clientId}?section=overview`);
    await expect(page).toHaveURL(new RegExp(`/clients/${clientId}\\?section=overview`));

    const customerBadge = page.getByTestId("relationship-role-badge-Customer");
    await expect(customerBadge).toBeVisible();
    expect(await customerBadge.getAttribute("class")).toContain(
      RELATIONSHIP_ROLE_TOKENS.Customer
    );
  });

  test("returns accounting dashboard to global state after filtered navigation clears", async ({
    page,
  }) => {
    const apProof = await ensureAccountingApProofContext(page);
    const filteredInvoices = await callTrpc<{
      items: Array<{
        customerId?: number | null;
        status?: string | null;
        amountDue?: string | number;
        totalAmount?: string | number;
      }>;
    }>(page, "accounting.invoices.list", {
      limit: 100,
      offset: 0,
    });
    const filteredInvoiceCustomerId =
      filteredInvoices.items.find(
        invoice =>
          typeof invoice.customerId === "number" && invoice.status === "OVERDUE"
      )?.customerId ??
      filteredInvoices.items.find(
        invoice => typeof invoice.customerId === "number"
      )?.customerId;
    expect(filteredInvoiceCustomerId).toBeTruthy();

    const filteredArQuery = await callTrpc<{
      items: Array<{
        customerId?: number | null;
        status?: string | null;
        amountDue?: string | number;
        totalAmount?: string | number;
      }>;
    }>(page, "accounting.invoices.list", {
      customerId: filteredInvoiceCustomerId,
      limit: 100,
      offset: 0,
    });
    const filteredArItems = filteredArQuery.items;
    const filteredArTotal = filteredArItems.reduce(
      (sum, invoice) => sum + parseAmount(invoice.amountDue ?? invoice.totalAmount),
      0
    );
    const filteredArOverdueCount = filteredArItems.filter(
      invoice => invoice.status === "OVERDUE"
    ).length;
    expect(filteredArOverdueCount).toBeGreaterThanOrEqual(1);
    const filteredBills = await callTrpc<{
      items: Array<{
        vendorId?: number | null;
        status?: string | null;
        amountDue?: string | number;
        totalAmount?: string | number;
      }>;
    }>(page, "accounting.bills.list", {
      vendorId: apProof.primaryBill.vendorId,
      limit: 100,
      offset: 0,
    });
    const filteredBillVendorId = apProof.primaryBill.vendorId;

    const filteredApItems = filteredBills.items.filter(
      bill => bill.vendorId === filteredBillVendorId
    );
    const filteredApTotal = filteredApItems.reduce(
      (sum, bill) => sum + parseAmount(bill.amountDue ?? bill.totalAmount),
      0
    );
    const filteredApOverdueCount = filteredApItems.filter(
      bill => bill.status === "OVERDUE"
    ).length;
    expect(filteredApOverdueCount).toBeGreaterThanOrEqual(1);
    expect(apProof.primaryBill.vendorId).not.toBe(apProof.comparisonBill.vendorId);
    const arSummary = await callTrpc<{ totalAR: string | number }>(
      page,
      "accounting.arApDashboard.getARSummary",
      {}
    );
    const apSummary = await callTrpc<{ totalAP: string | number }>(
      page,
      "accounting.arApDashboard.getAPSummary",
      {}
    );
    const overdueInvoices = await callTrpc<{
      pagination?: { total?: number };
    }>(page, "accounting.arApDashboard.getOverdueInvoices", { limit: 5 });
    const overdueBills = await callTrpc<{
      pagination?: { total?: number };
    }>(page, "accounting.arApDashboard.getOverdueBills", { limit: 5 });
    expect(overdueBills.pagination?.total ?? 0).toBeGreaterThan(1);
    expect(filteredApOverdueCount).toBeLessThan(
      overdueBills.pagination?.total ?? Number.POSITIVE_INFINITY
    );

    await page.goto(
      `/accounting?clientId=${filteredInvoiceCustomerId}&vendorId=${filteredBillVendorId}`
    );
    await expect(page).toHaveURL(
      new RegExp(
        `/accounting.*clientId=${filteredInvoiceCustomerId}.*vendorId=${filteredBillVendorId}`
      )
    );
    const recordPaymentCard = page
      .locator("div.rounded-md")
      .filter({ has: page.getByText("Record payment", { exact: true }) })
      .first();
    const paySupplierCard = page
      .locator("div.rounded-md")
      .filter({ has: page.getByText("Pay supplier", { exact: true }) })
      .first();

    await expect(
      page.getByText("Filtered accounting activity", { exact: true })
    ).toBeVisible();
    await expect(
      recordPaymentCard.getByText(formatCurrency(filteredArTotal), { exact: true })
    ).toBeVisible();
    await expect(
      paySupplierCard.getByText(formatCurrency(filteredApTotal), { exact: true })
    ).toBeVisible();
    await expect(
      recordPaymentCard.getByText(
        `${pluralize(filteredArOverdueCount, "overdue invoice")} ready for follow-up`,
        { exact: true }
      )
    ).toBeVisible();
    await expect(
      paySupplierCard.getByText(
        `${pluralize(filteredApOverdueCount, "overdue bill")} need attention`,
        { exact: true }
      )
    ).toBeVisible();

    await page.goto("/accounting");
    await expect(page).toHaveURL(/\/accounting(\?.*)?$/);
    await expect(
      page.getByText("All accounting activity", { exact: true })
    ).toBeVisible();
    await expect(
      recordPaymentCard.getByText(formatCurrency(parseAmount(arSummary.totalAR)), {
        exact: true,
      })
    ).toBeVisible();
    await expect(
      paySupplierCard.getByText(formatCurrency(parseAmount(apSummary.totalAP)), {
        exact: true,
      })
    ).toBeVisible();
    await expect(
      recordPaymentCard.getByText(
        `${pluralize(overdueInvoices.pagination?.total ?? 0, "overdue invoice")} ready for follow-up`,
        { exact: true }
      )
    ).toBeVisible();
    await expect(
      paySupplierCard.getByText(
        `${pluralize(overdueBills.pagination?.total ?? 0, "overdue bill")} need attention`,
        { exact: true }
      )
    ).toBeVisible();
  });

  test("shows procurement row-level receiving context when the queue has a confirmed PO", async ({
    page,
  }) => {
    await page.goto("/purchase-orders?tab=receiving");
    await expect(page).toHaveURL(/\/purchase-orders\?tab=receiving/);
    await expect(
      page.getByText("This workflow moved to Operations", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open Operations", exact: true })
    ).toBeVisible();

    const seededPo = await ensureConfirmedPurchaseOrder(page);
    await cleanupTaggedPurchaseOrders(page, seededPo.id);
    await page.goto("/purchase-orders");
    await expect(page).toHaveURL(/\/purchase-orders/);

    await page
      .getByPlaceholder("Search PO number or supplier")
      .fill(seededPo.poNumber);

    await expect(page.getByText("Receiving", { exact: true })).toBeVisible();
    await expect(page.getByText("Est. Delivery", { exact: true })).toBeVisible();
    await expect(
      page.getByText("PO-linked receiving", { exact: true }).first()
    ).toBeVisible();

    const seededRow = page
      .locator(".ag-center-cols-container .ag-row")
      .filter({ hasText: seededPo.poNumber })
      .first();
    await expect(seededRow).toBeVisible();
    await expect
      .poll(async () => (await seededRow.getAttribute("class")) ?? "")
      .toContain("bg-red-50");
    const seededRowVisuals = await seededRow.evaluate(node => {
      const style = window.getComputedStyle(node as HTMLElement);
      return {
        backgroundColor: style.backgroundColor,
        borderLeftColor: style.borderLeftColor,
        borderLeftWidth: style.borderLeftWidth,
      };
    });
    expect(seededRowVisuals.borderLeftWidth).not.toBe("0px");
    expect(seededRowVisuals.borderLeftColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(seededRowVisuals.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("shows live inventory exception counts and preserves the direct intake vs PO split", async ({
    page,
  }) => {
    await page.goto("/inventory");
    await expect(page).toHaveURL(/\/inventory(?:\?tab=inventory)?/);
    await expect(
      page.getByPlaceholder("Search SKU, product, supplier...")
    ).toBeVisible();
    const statusFilter = page.getByRole("combobox").first();

    let lowStockButton = page.getByRole("button", {
      name: /Low stock \(\d+\)/i,
    });
    for (const statusLabel of INVENTORY_STATUS_LABELS) {
      if (await lowStockButton.isVisible().catch(() => false)) {
        break;
      }

      await statusFilter.click();
      await page.getByRole("option", { name: statusLabel, exact: true }).click();
      await page.waitForTimeout(200);
    }

    await expect(lowStockButton).toBeVisible();
    const lowStockLabel = (await lowStockButton.textContent()) ?? "";
    const lowStockMatch = lowStockLabel.match(/Low stock \((\d+)\)/i);
    const visibleLowStockCount = Number(lowStockMatch?.[1] ?? 0);
    expect(visibleLowStockCount).toBeGreaterThan(0);
    await lowStockButton.click();

    await expect
      .poll(async () => (await page.locator("body").textContent()) ?? "")
      .toMatch(/(\d+) visible batches[\s\S]*\1 visible rows of \1 filtered rows/);

    await page.goto("/inventory?tab=intake");
    await expect(page).toHaveURL(/\/inventory\?tab=intake/);
    await expect(
      page.getByRole("tab", { name: "Direct Intake", exact: true })
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("PO-linked receiving", { exact: true })).toHaveCount(0);

    await page.getByRole("tab", { name: "Product Intake", exact: true }).click();
    await expect(page).toHaveURL(/\/inventory\?tab=receiving/);
    await expect(
      page.getByRole("tab", { name: "Product Intake", exact: true })
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("PO-linked receiving", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/visible purchase orders/i).first()).toBeVisible();
  });

  test("keeps direct-intake surfaces mutually exclusive in the live runtime", async ({
    page,
  }) => {
    await page.goto("/inventory?tab=intake");
    await expect(page).toHaveURL(/\/inventory\?tab=intake/);
    await expect(
      page.getByRole("tab", { name: "Direct Intake", exact: true })
    ).toHaveAttribute("aria-selected", "true");
    const spreadsheetViewButton = page.getByRole("button", {
      name: "Spreadsheet View",
    });
    const standardViewButton = page.getByRole("button", { name: "Standard View" });

    if (await spreadsheetViewButton.isVisible().catch(() => false)) {
      await spreadsheetViewButton.click();
      await expect(spreadsheetViewButton).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("intake-pilot-surface")).toBeVisible();
      await expect(page.getByTestId("direct-intake-surface")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Edit Details", exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Edit Selected Details", exact: true })
      ).toHaveCount(0);
      await expect(
        page.getByText("Direct Intake Session", { exact: true })
      ).toBeVisible();
      await expect(page.getByText(/\d+ pending · \d+ submitted/i).first()).toBeVisible();
      await expect(
        page.getByText("PO-linked receiving", { exact: true })
      ).toHaveCount(0);

      await standardViewButton.click();
      await expect(standardViewButton).toHaveAttribute("aria-pressed", "true");
    } else {
      await expect(page.getByText("classic", { exact: true })).toBeVisible();
    }

    await expect(page.getByTestId("direct-intake-surface")).toBeVisible();
    await expect(page.getByTestId("intake-pilot-surface")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit Selected Details", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit Details", exact: true })
    ).toHaveCount(0);
    await expect(page.getByText("Direct Intake Session", { exact: true })).toHaveCount(0);
    await expect(page.getByText("PO-linked receiving", { exact: true })).toHaveCount(0);
  });

  test("shows a table-shaped accounting skeleton while finance surfaces are still loading", async ({
    browser,
  }) => {
    const isolatedContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const isolatedPage = await isolatedContext.newPage();

    try {
      await delayAccountingSurfaceChunks(isolatedPage);
      await loginAsAdminInFirefox(isolatedPage);
      await isolatedPage.goto(`${getBaseUrl()}/accounting?tab=invoices`);
      await expect(isolatedPage).toHaveURL(/\/accounting\?tab=invoices/);

      const skeleton = isolatedPage.getByTestId("accounting-invoices-skeleton");
      await expect(skeleton).toBeVisible();
      const rowPlaceholders = skeleton.getByTestId("workspace-panel-skeleton-row");
      await expect(rowPlaceholders).toHaveCount(5);

      const skeletonMetrics = await skeleton.evaluate(node => {
        const element = node as HTMLElement;
        const { height } = element.getBoundingClientRect();
        return {
          height,
          visibleRows: element.querySelectorAll(
            "[data-testid='workspace-panel-skeleton-row']"
          ).length,
        };
      });

      expect(skeletonMetrics.height).toBeGreaterThan(120);
      expect(skeletonMetrics.visibleRows).toBeGreaterThanOrEqual(5);
    } finally {
      await isolatedContext.close();
    }
  });

  test("keeps the authenticated session healthy across the operations browser proof flow", async ({
    page,
  }) => {
    const beforeProbe = await probeSession(page, "before-operations-browser-proof");
    expect(beforeProbe.ok).toBe(true);
    expect(beforeProbe.email).toBe(TEST_USERS.admin.email);

    await page.goto("/sales");
    await expect(page.getByTestId("orders-table")).toBeVisible();
    await page.goto("/relationships");
    await expect(page.getByTestId("clients-table")).toBeVisible();
    await page.goto("/accounting");
    if (
      await page
        .getByRole("button", { name: "Sign in", exact: true })
        .isVisible()
        .catch(() => false)
    ) {
      await loginViaForm(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto("/accounting");
    }
    await expect(page.getByText("Financial period", { exact: true })).toBeVisible();

    const afterProbe = await probeSession(page, "after-operations-browser-proof");
    expect(afterProbe.ok).toBe(true);
    expect(afterProbe.email).toBe(TEST_USERS.admin.email);
  });
});
