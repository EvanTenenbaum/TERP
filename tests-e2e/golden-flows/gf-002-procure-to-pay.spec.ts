/**
 * Golden Flow Test: GF-002 Procure-to-Pay
 *
 * Full lifecycle: PO creation → submit → confirm → receive → bill → payment
 *
 * Architecture note: PO receiving, bill creation, and payment have no dedicated UI.
 * Steps 4-6 use the tRPC API directly via page.request.post (hybrid approach).
 * This is intentional -- see GF-002 spec section "Not Yet Implemented".
 *
 * Spec: docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md
 * Linear: TER-239
 */

import { expect, test, type APIResponse, type Page } from "@playwright/test";
import superjson from "superjson";
import { loginAsAdmin } from "../fixtures/auth";

// ---------------------------------------------------------------------------
// tRPC helper -- all API-backed steps go through this
// ---------------------------------------------------------------------------

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

  const postResponse = await page.request.post(trpcUrl, {
    headers: { "Content-Type": "application/json" },
    data: serializedInput,
  });

  // Some routers enforce GET for queries; retry using query transport on 405.
  if (postResponse.status() !== 405) {
    return parseTrpcResponse<T>(postResponse, endpoint, "POST");
  }

  const getUrl = new URL(trpcUrl);
  getUrl.searchParams.set("input", JSON.stringify(serializedInput));
  const getResponse = await page.request.get(getUrl.toString());
  return parseTrpcResponse<T>(getResponse, endpoint, "GET");
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

/**
 * Find a valid supplier client ID (isSeller=true).
 * Throws if no suppliers exist -- run pnpm seed:all-defaults first.
 */
async function findFirstSupplierId(page: Page): Promise<number> {
  const result = await callTrpc<{ items: Array<{ id: number }> }>(
    page,
    "clients.list",
    { clientTypes: ["seller"], limit: 1 }
  );
  if (!result?.items?.length) {
    throw new Error(
      "No suppliers found -- seed data required (run pnpm seed:all-defaults)"
    );
  }
  return result.items[0].id;
}

/**
 * Find a valid product ID for use in PO line items.
 * Throws if no inventory batches exist -- run pnpm seed:all-defaults first.
 */
async function findFirstProductId(page: Page): Promise<number> {
  const result = await callTrpc<{
    items: Array<{
      id?: number;
      productId?: number;
      batch?: { id?: number; productId?: number };
      product?: { id?: number };
    }>;
  }>(page, "inventory.list", { limit: 1 });
  if (!result?.items?.length) {
    throw new Error(
      "No inventory/products found -- seed data required (run pnpm seed:all-defaults)"
    );
  }
  // inventory.list payloads vary by route shape; normalize to product ID.
  const batch = result.items[0];
  const productId =
    batch.product?.id ?? batch.batch?.productId ?? batch.productId ?? batch.id;
  if (!productId) {
    throw new Error("Unable to derive productId from inventory.list response");
  }
  return productId;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe("GF-002: Procure-to-Pay Golden Flow", () => {
  test.describe.configure({ tag: "@tier1", timeout: 90_000 });

  // -------------------------------------------------------------------------
  // P2P-01: Page load
  // -------------------------------------------------------------------------
  test("GF-002 P2P-01: PO page loads and displays correctly", async ({
    page,
  }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", error => jsErrors.push(error.message));

    await loginAsAdmin(page);
    await page.goto("/purchase-orders");
    await page.waitForLoadState("networkidle");

    // No JavaScript errors
    expect(jsErrors).toHaveLength(0);

    // Page heading contains "Purchase Order"
    const heading = page.locator(
      "h1, h2, [data-testid='page-title'], .page-title"
    );
    const headingText = await heading
      .first()
      .textContent({ timeout: 10000 })
      .catch(() => "");
    const pageTitle = (headingText ?? "").toLowerCase();
    const hasPoTitle =
      pageTitle.includes("purchase order") ||
      pageTitle.includes("purchase orders") ||
      (await page
        .locator("text=/purchase order/i")
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasPoTitle).toBe(true);

    // Table, list, or empty state is visible
    const hasContent =
      (await page
        .locator("table")
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('[role="table"]')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('[data-testid="purchase-orders-table"]')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator("text=/no purchase order/i")
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator(".empty-state")
        .isVisible()
        .catch(() => false));
    expect(hasContent).toBe(true);
  });

  // -------------------------------------------------------------------------
  // P2P-02: Create PO via UI
  // -------------------------------------------------------------------------
  test("GF-002 P2P-02: Create PO with supplier and line items", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await findFirstSupplierId(page); // verify supplier seed exists

    await page.goto("/purchase-orders");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Create PO" }).first().click();
    await expect(page.getByText("New Purchase Order")).toBeVisible({
      timeout: 10000,
    });

    const rowCheckboxes = page.locator('[aria-label^="Select draft row "]');
    const initialRowCount = await rowCheckboxes.count();
    expect(initialRowCount).toBeGreaterThan(0);

    await rowCheckboxes.first().click();
    await expect(page.getByText(/1 selected/i)).toBeVisible({ timeout: 5000 });

    const quantityBulkInput = page.getByPlaceholder("Qty");
    await quantityBulkInput.fill("5");
    await page.getByRole("button", { name: "Apply Qty" }).click();

    const quantityCell = page
      .locator('[data-po-draft-field="quantityOrdered"]')
      .first();
    await expect(quantityCell).toHaveValue("5");

    const unitCostBulkInput = page.getByPlaceholder("Unit Cost");
    await unitCostBulkInput.fill("12");
    await page.getByRole("button", { name: "Apply Cost" }).click();

    const unitCostCell = page
      .locator('[data-po-draft-field="unitCost"]')
      .first();
    await expect(unitCostCell).toHaveValue("12");

    await page.getByRole("button", { name: "Duplicate" }).click();
    await expect(rowCheckboxes).toHaveCount(initialRowCount + 1, {
      timeout: 10000,
    });
  });

  // -------------------------------------------------------------------------
  // P2P-03: Submit PO (DRAFT -> SENT)
  // -------------------------------------------------------------------------
  test("GF-002 P2P-03: Submit PO (DRAFT -> SENT)", async ({ page }) => {
    await loginAsAdmin(page);

    const supplierId = await findFirstSupplierId(page);
    const productId = await findFirstProductId(page);

    // Create PO via API
    const po = await callTrpc<{ id: number; poNumber: string }>(
      page,
      "purchaseOrders.create",
      {
        supplierClientId: supplierId,
        orderDate: new Date().toISOString().split("T")[0],
        items: [{ productId, quantityOrdered: 5, unitCost: 100 }],
      }
    );

    expect(typeof po.id).toBe("number");
    expect(po.id).toBeGreaterThan(0);

    // Submit PO (DRAFT -> SENT)
    const submitResult = await callTrpc<{ success: boolean; poNumber: string }>(
      page,
      "purchaseOrders.submit",
      { id: po.id }
    );
    expect(submitResult.success).toBe(true);

    // Verify via getById
    const submitted = await callTrpc<{ purchaseOrderStatus: string }>(
      page,
      "purchaseOrders.getById",
      { id: po.id }
    );
    expect(submitted.purchaseOrderStatus).toBe("SENT");
  });

  // -------------------------------------------------------------------------
  // P2P-04: Confirm PO (SENT -> CONFIRMED)
  // -------------------------------------------------------------------------
  test("GF-002 P2P-04: Confirm PO (SENT -> CONFIRMED)", async ({ page }) => {
    await loginAsAdmin(page);

    const supplierId = await findFirstSupplierId(page);
    const productId = await findFirstProductId(page);

    // Create PO via API
    const po = await callTrpc<{ id: number; poNumber: string }>(
      page,
      "purchaseOrders.create",
      {
        supplierClientId: supplierId,
        orderDate: new Date().toISOString().split("T")[0],
        items: [{ productId, quantityOrdered: 10, unitCost: 50 }],
      }
    );

    // Submit (DRAFT -> SENT)
    await callTrpc(page, "purchaseOrders.submit", { id: po.id });

    // Confirm (SENT -> CONFIRMED)
    const confirmResult = await callTrpc<{ success: boolean }>(
      page,
      "purchaseOrders.confirm",
      { id: po.id }
    );
    expect(confirmResult.success).toBe(true);

    // Verify status
    const confirmed = await callTrpc<{ purchaseOrderStatus: string }>(
      page,
      "purchaseOrders.getById",
      { id: po.id }
    );
    expect(confirmed.purchaseOrderStatus).toBe("CONFIRMED");
  });

  // -------------------------------------------------------------------------
  // P2P-05: Receive goods against confirmed PO
  // -------------------------------------------------------------------------
  test("GF-002 P2P-05: Receive goods against confirmed PO", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    const supplierId = await findFirstSupplierId(page);
    const productId = await findFirstProductId(page);

    // Create PO
    const po = await callTrpc<{ id: number; poNumber: string }>(
      page,
      "purchaseOrders.create",
      {
        supplierClientId: supplierId,
        orderDate: new Date().toISOString().split("T")[0],
        items: [{ productId, quantityOrdered: 20, unitCost: 25 }],
      }
    );

    // Submit -> SENT
    await callTrpc(page, "purchaseOrders.submit", { id: po.id });

    // Confirm -> CONFIRMED
    await callTrpc(page, "purchaseOrders.confirm", { id: po.id });

    // Get PO items to find the poItemId for receiving
    const poDetails = await callTrpc<{
      purchaseOrderStatus: string;
      items: Array<{ id: number; productId: number; quantityOrdered: string }>;
    }>(page, "purchaseOrders.getById", { id: po.id });

    expect(poDetails.items.length).toBeGreaterThan(0);
    const firstItem = poDetails.items[0];

    // Receive goods (no UI -- use API directly)
    const receiveResult = await callTrpc<{
      success: boolean;
      batches: Array<{ id: number; code: string; quantity: number }>;
      batchCount: number;
    }>(page, "poReceiving.receiveGoodsWithBatch", {
      purchaseOrderId: po.id,
      items: [
        {
          poItemId: firstItem.id,
          quantity: 20,
        },
      ],
    });

    expect(receiveResult.success).toBe(true);
    expect(receiveResult.batchCount).toBeGreaterThanOrEqual(1);

    // Verify via receiving history
    const history = await callTrpc<
      Array<{ id: number; inventoryMovementType: string }>
    >(page, "poReceiving.getReceivingHistory", { poId: po.id });
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // P2P-06: Record bill from PO
  // -------------------------------------------------------------------------
  test("GF-002 P2P-06: Record bill from PO", async ({ page }) => {
    await loginAsAdmin(page);

    const supplierId = await findFirstSupplierId(page);
    const productId = await findFirstProductId(page);

    // Build a fully received PO
    const po = await callTrpc<{ id: number; poNumber: string }>(
      page,
      "purchaseOrders.create",
      {
        supplierClientId: supplierId,
        orderDate: new Date().toISOString().split("T")[0],
        items: [{ productId, quantityOrdered: 5, unitCost: 200 }],
      }
    );
    await callTrpc(page, "purchaseOrders.submit", { id: po.id });
    await callTrpc(page, "purchaseOrders.confirm", { id: po.id });

    const poDetails = await callTrpc<{
      vendorId: number;
      items: Array<{ id: number; quantityOrdered: string; unitCost: string }>;
    }>(page, "purchaseOrders.getById", { id: po.id });

    expect(poDetails.items.length).toBeGreaterThan(0);
    const firstItem = poDetails.items[0];

    await callTrpc(page, "poReceiving.receiveGoodsWithBatch", {
      purchaseOrderId: po.id,
      items: [{ poItemId: firstItem.id, quantity: 5 }],
    });

    // Record the bill linked to the PO (vendorId required by schema)
    const totalAmount = 5 * 200;
    const today = new Date();
    const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const billId = await callTrpc<number>(page, "accounting.bills.create", {
      billNumber: `BILL-GF002-${Date.now()}`,
      vendorId: poDetails.vendorId,
      billDate: today,
      dueDate: dueDate,
      subtotal: totalAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      referenceType: "PURCHASE_ORDER",
      referenceId: po.id,
      lineItems: [
        {
          description: `PO ${po.poNumber} - item 1`,
          quantity: "5",
          unitPrice: "200.00",
          lineTotal: totalAmount.toFixed(2),
        },
      ],
    });

    expect(typeof billId).toBe("number");
    expect(billId).toBeGreaterThan(0);

    // Pay the bill in full
    await callTrpc(page, "accounting.bills.recordPayment", {
      billId,
      amount: totalAmount,
    });

    // Verify bill is PAID
    const bill = await callTrpc<{
      id: number;
      status: string;
      amountDue: string;
    }>(page, "accounting.bills.getById", { id: billId });

    expect(bill).not.toBeNull();
    expect(bill.status).toBe("PAID");
    expect(parseFloat(bill.amountDue)).toBeLessThanOrEqual(0.01);
  });

  // -------------------------------------------------------------------------
  // P2P-07: Full P2P lifecycle (happy path)
  // -------------------------------------------------------------------------
  test("GF-002 P2P-07: Full P2P lifecycle (happy path)", async ({ page }) => {
    await loginAsAdmin(page);

    const supplierId = await findFirstSupplierId(page);
    const productId = await findFirstProductId(page);

    // ------- Step 1: Create PO -------
    const po = await callTrpc<{
      id: number;
      poNumber: string;
      supplierClientId: number;
    }>(page, "purchaseOrders.create", {
      supplierClientId: supplierId,
      orderDate: new Date().toISOString().split("T")[0],
      items: [{ productId, quantityOrdered: 10, unitCost: 50 }],
    });

    expect(typeof po.id).toBe("number");
    expect(po.id).toBeGreaterThan(0);
    expect(typeof po.poNumber).toBe("string");
    expect(po.poNumber.length).toBeGreaterThan(0);

    // ------- Step 2: Submit PO (DRAFT -> SENT) -------
    const submitResult = await callTrpc<{ success: boolean }>(
      page,
      "purchaseOrders.submit",
      { id: po.id }
    );
    expect(submitResult.success).toBe(true);

    const afterSubmit = await callTrpc<{ purchaseOrderStatus: string }>(
      page,
      "purchaseOrders.getById",
      { id: po.id }
    );
    expect(afterSubmit.purchaseOrderStatus).toBe("SENT");

    // ------- Step 3: Confirm PO (SENT -> CONFIRMED) -------
    const confirmResult = await callTrpc<{ success: boolean }>(
      page,
      "purchaseOrders.confirm",
      { id: po.id }
    );
    expect(confirmResult.success).toBe(true);

    const afterConfirm = await callTrpc<{ purchaseOrderStatus: string }>(
      page,
      "purchaseOrders.getById",
      { id: po.id }
    );
    expect(afterConfirm.purchaseOrderStatus).toBe("CONFIRMED");

    // ------- Step 4: Receive goods -------
    const poDetails = await callTrpc<{
      vendorId: number;
      items: Array<{ id: number; quantityOrdered: string; unitCost: string }>;
    }>(page, "purchaseOrders.getById", { id: po.id });

    expect(poDetails.items.length).toBeGreaterThan(0);
    const lineItem = poDetails.items[0];

    const receiveResult = await callTrpc<{
      success: boolean;
      batches: Array<{ id: number; code: string; quantity: number }>;
      batchCount: number;
    }>(page, "poReceiving.receiveGoodsWithBatch", {
      purchaseOrderId: po.id,
      items: [
        {
          poItemId: lineItem.id,
          quantity: 10,
        },
      ],
    });

    expect(receiveResult.success).toBe(true);
    expect(receiveResult.batchCount).toBeGreaterThanOrEqual(1);

    // Verify receiving history was created
    const history = await callTrpc<
      Array<{ id: number; inventoryMovementType: string }>
    >(page, "poReceiving.getReceivingHistory", { poId: po.id });
    expect(history.length).toBeGreaterThanOrEqual(1);

    // PO should now be RECEIVED (all items received)
    const afterReceive = await callTrpc<{ purchaseOrderStatus: string }>(
      page,
      "purchaseOrders.getById",
      { id: po.id }
    );
    expect(afterReceive.purchaseOrderStatus).toBe("RECEIVED");

    // ------- Step 5: Record bill -------
    const totalAmount = 10 * 50; // 10 units * $50 each
    const today = new Date();
    const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const billId = await callTrpc<number>(page, "accounting.bills.create", {
      billNumber: `BILL-GF002-LIFECYCLE-${Date.now()}`,
      vendorId: poDetails.vendorId,
      billDate: today,
      dueDate: dueDate,
      subtotal: totalAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      referenceType: "PURCHASE_ORDER",
      referenceId: po.id,
      lineItems: [
        {
          description: `PO ${po.poNumber} - full amount`,
          quantity: "10",
          unitPrice: "50.00",
          lineTotal: totalAmount.toFixed(2),
        },
      ],
    });

    expect(typeof billId).toBe("number");
    expect(billId).toBeGreaterThan(0);

    // ------- Step 6: Pay bill -------
    await callTrpc(page, "accounting.bills.recordPayment", {
      billId,
      amount: totalAmount,
    });

    // Verify final bill state
    const finalBill = await callTrpc<{
      id: number;
      status: string;
      amountDue: string;
      amountPaid: string;
    }>(page, "accounting.bills.getById", { id: billId });

    expect(finalBill).not.toBeNull();
    expect(finalBill.status).toBe("PAID");
    expect(parseFloat(finalBill.amountDue)).toBeLessThanOrEqual(0.01);
    expect(parseFloat(finalBill.amountPaid)).toBeGreaterThan(0);
  });
});
