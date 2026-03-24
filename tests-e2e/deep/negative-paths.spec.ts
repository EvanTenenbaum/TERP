/**
 * Negative Path / Error Handling E2E Tests
 *
 * Documents and asserts the actual API behavior for invalid inputs, boundary
 * conditions, authorization failures, and race conditions. Some error paths
 * may return success instead of an error — where that happens the test
 * documents the observed behavior rather than hard-failing.
 *
 * Tag: @deep
 */

import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginAsSalesRep } from "../fixtures/auth";
import { trpcMutation, trpcQuery } from "../utils/golden-flow-helpers";
import {
  cleanupOrder,
  confirmSaleOrder,
  createSaleOrder,
  findBatchWithStock,
  findBuyerClient,
  toNumber,
} from "../utils/e2e-business-helpers";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type InvoiceRecord = {
  id: number;
  status?: string | null;
  totalAmount?: string | number | null;
  amountDue?: string | number | null;
};

type InventoryListResponse = {
  items?: Array<{
    batch?: {
      id?: number;
      onHandQty?: string | number | null;
    };
  }>;
};

// ---------------------------------------------------------------------------
// Suite 1 — Order Creation Validation
// ---------------------------------------------------------------------------

test.describe("Negative Paths: Order Creation Validation", () => {
  test.describe.configure({ tag: "@deep" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("rejects order with non-existent clientId", async ({ page }) => {
    test.setTimeout(120_000);

    const batch = await findBatchWithStock(page);

    let errorThrown = false;
    try {
      const result = await trpcMutation<{ id: number }>(page, "orders.create", {
        orderType: "SALE",
        clientId: 999999999,
        items: [
          {
            batchId: batch.id,
            quantity: 1,
            unitPrice: 10,
            isSample: false,
          },
        ],
        paymentTerms: "NET_30",
      });
      // If the API accepted the request, track for cleanup and document the behavior
      if (result?.id) {
        createdOrderId = result.id;
      }
      console.warn(
        "[negative-paths] orders.create with clientId=999999999 unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      errorThrown = true;
      expect(String(error)).toMatch(/fail|error|invalid|400|422|not found/i);
    }

    // The API MUST reject a non-existent client — if it didn't, the test fails
    expect(errorThrown).toBe(true);
  });

  test("rejects order with zero quantity", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    let errorThrown = false;
    try {
      const result = await trpcMutation<{ id: number }>(page, "orders.create", {
        orderType: "SALE",
        clientId: client.id,
        items: [
          {
            batchId: batch.id,
            quantity: 0,
            unitPrice: 10,
            isSample: false,
          },
        ],
        paymentTerms: "NET_30",
      });
      if (result?.id) {
        createdOrderId = result.id;
      }
      console.warn(
        "[negative-paths] orders.create with quantity=0 unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      errorThrown = true;
      expect(String(error)).toMatch(/fail|error|invalid|400|422/i);
    }

    expect(errorThrown).toBe(true);
  });

  test("rejects order with negative quantity", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    let errorThrown = false;
    try {
      const result = await trpcMutation<{ id: number }>(page, "orders.create", {
        orderType: "SALE",
        clientId: client.id,
        items: [
          {
            batchId: batch.id,
            quantity: -1,
            unitPrice: 10,
            isSample: false,
          },
        ],
        paymentTerms: "NET_30",
      });
      if (result?.id) {
        createdOrderId = result.id;
      }
      console.warn(
        "[negative-paths] orders.create with quantity=-1 unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      errorThrown = true;
      expect(String(error)).toMatch(/fail|error|invalid|400|422/i);
    }

    expect(errorThrown).toBe(true);
  });

  test("rejects order with negative unit price", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    let errorThrown = false;
    try {
      const result = await trpcMutation<{ id: number }>(page, "orders.create", {
        orderType: "SALE",
        clientId: client.id,
        items: [
          {
            batchId: batch.id,
            quantity: 1,
            unitPrice: -10,
            isSample: false,
          },
        ],
        paymentTerms: "NET_30",
      });
      if (result?.id) {
        createdOrderId = result.id;
      }
      console.warn(
        "[negative-paths] orders.create with unitPrice=-10 unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      errorThrown = true;
      expect(String(error)).toMatch(/fail|error|invalid|400|422/i);
    }

    expect(errorThrown).toBe(true);
  });

  test("rejects order with empty items array", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);

    let errorThrown = false;
    try {
      const result = await trpcMutation<{ id: number }>(page, "orders.create", {
        orderType: "SALE",
        clientId: client.id,
        items: [],
        paymentTerms: "NET_30",
      });
      if (result?.id) {
        createdOrderId = result.id;
      }
      console.warn(
        "[negative-paths] orders.create with empty items[] unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      errorThrown = true;
      expect(String(error)).toMatch(/fail|error|invalid|400|422/i);
    }

    expect(errorThrown).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Payment Validation
// ---------------------------------------------------------------------------

test.describe("Negative Paths: Payment Validation", () => {
  test.describe.configure({ tag: "@deep" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  /**
   * Shared helper that creates an order → confirms → invoices → marks SENT
   * and returns the invoice ready for payment tests.
   */
  async function buildSentInvoice(
    page: Parameters<typeof loginAsAdmin>[0]
  ): Promise<{ orderId: number; invoiceId: number; totalAmount: number }> {
    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(toNumber(batch.unitCogs) * 1.5, 10),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    expect(invoice.id).toBeGreaterThan(0);

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    expect(sentInvoice.status).toBe("SENT");

    const totalAmount = toNumber(sentInvoice.totalAmount);
    expect(totalAmount).toBeGreaterThan(0);

    return { orderId: order.id, invoiceId: invoice.id, totalAmount };
  }

  test("rejects payment with amount zero", async ({ page }) => {
    test.setTimeout(120_000);

    const { invoiceId } = await buildSentInvoice(page);

    let errorThrown = false;
    try {
      await trpcMutation(page, "payments.recordPayment", {
        invoiceId,
        amount: 0,
        paymentMethod: "ACH",
        referenceNumber: `NEG-PAY-ZERO-${Date.now()}`,
      });
      console.warn(
        "[negative-paths] payments.recordPayment with amount=0 unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      errorThrown = true;
      expect(String(error)).toMatch(/fail|error|invalid|400|422/i);
    }

    expect(errorThrown).toBe(true);
  });

  test("rejects payment with negative amount", async ({ page }) => {
    test.setTimeout(120_000);

    const { invoiceId } = await buildSentInvoice(page);

    let errorThrown = false;
    try {
      await trpcMutation(page, "payments.recordPayment", {
        invoiceId,
        amount: -100,
        paymentMethod: "ACH",
        referenceNumber: `NEG-PAY-NEG-${Date.now()}`,
      });
      console.warn(
        "[negative-paths] payments.recordPayment with amount=-100 unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      errorThrown = true;
      expect(String(error)).toMatch(/fail|error|invalid|400|422/i);
    }

    expect(errorThrown).toBe(true);
  });

  test("rejects payment for non-existent invoiceId", async ({ page }) => {
    test.setTimeout(120_000);

    let errorThrown = false;
    try {
      await trpcMutation(page, "payments.recordPayment", {
        invoiceId: 999999999,
        amount: 100,
        paymentMethod: "ACH",
        referenceNumber: `NEG-PAY-GHOST-${Date.now()}`,
      });
      console.warn(
        "[negative-paths] payments.recordPayment with invoiceId=999999999 unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      errorThrown = true;
      expect(String(error)).toMatch(
        /fail|error|invalid|400|404|422|not found/i
      );
    }

    expect(errorThrown).toBe(true);
  });

  test("rejects payment with invalid paymentMethod", async ({ page }) => {
    test.setTimeout(120_000);

    const { invoiceId } = await buildSentInvoice(page);

    let errorThrown = false;
    try {
      await trpcMutation(page, "payments.recordPayment", {
        invoiceId,
        amount: 10,
        paymentMethod: "INVALID_METHOD_XYZ",
        referenceNumber: `NEG-PAY-METHOD-${Date.now()}`,
      });
      console.warn(
        "[negative-paths] payments.recordPayment with paymentMethod=INVALID_METHOD_XYZ unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      errorThrown = true;
      expect(String(error)).toMatch(/fail|error|invalid|400|422/i);
    }

    expect(errorThrown).toBe(true);
  });

  test("rejects payment on a DRAFT invoice (not yet SENT)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(toNumber(batch.unitCogs) * 1.5, 10),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    expect(invoice.id).toBeGreaterThan(0);

    // Do NOT mark sent — invoice should be in DRAFT status
    let errorThrown = false;
    try {
      await trpcMutation(page, "payments.recordPayment", {
        invoiceId: invoice.id,
        amount: 10,
        paymentMethod: "ACH",
        referenceNumber: `NEG-PAY-DRAFT-${Date.now()}`,
      });
      console.warn(
        "[negative-paths] payment on DRAFT invoice unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      errorThrown = true;
      expect(String(error)).toMatch(
        /fail|error|invalid|400|422|draft|status|sent/i
      );
    }

    expect(errorThrown).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Duplicate Operation Prevention
// ---------------------------------------------------------------------------

test.describe("Negative Paths: Duplicate Operation Prevention", () => {
  test.describe.configure({ tag: "@deep" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("generating invoice twice for same order errors or is idempotent", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(toNumber(batch.unitCogs) * 1.5, 10),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const firstInvoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );
    expect(firstInvoice.id).toBeGreaterThan(0);

    // Second call: should either error (preventing duplicate) or return the
    // existing invoice (idempotent). Both are acceptable; a second distinct
    // invoice for the same order is NOT acceptable.
    let secondInvoiceId: number | null = null;
    let duplicateErrorThrown = false;
    try {
      const secondInvoice = await trpcMutation<InvoiceRecord>(
        page,
        "invoices.generateFromOrder",
        { orderId: order.id }
      );
      secondInvoiceId = secondInvoice.id;
    } catch (error) {
      duplicateErrorThrown = true;
      // Any error indicating the operation was blocked is acceptable
      expect(String(error)).toMatch(/fail|error|invalid|400|409|422|already/i);
    }

    if (!duplicateErrorThrown && secondInvoiceId !== null) {
      // Idempotent path: both calls must return the same invoice id
      expect(secondInvoiceId).toBe(firstInvoice.id);
    }
  });

  test("confirming an already-confirmed order errors or is idempotent", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(toNumber(batch.unitCogs) * 1.5, 10),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    // Second confirm attempt — should error or be idempotent (not corrupt state)
    let secondConfirmError = false;
    try {
      await trpcMutation(page, "orders.confirmOrder", { id: order.id });
    } catch (error) {
      secondConfirmError = true;
      expect(String(error)).toMatch(/fail|error|invalid|400|409|422|already/i);
    }

    // Verify the order is still in a valid CONFIRMED state regardless of outcome
    const orderAfter = await trpcQuery<{
      id: number;
      fulfillmentStatus?: string | null;
      saleStatus?: string | null;
      isDraft?: boolean | null;
    }>(page, "orders.getById", { id: order.id });
    expect(orderAfter.id).toBe(order.id);
    // Order must not be reverted to DRAFT or corrupted
    expect(orderAfter.isDraft).not.toBe(true);

    if (!secondConfirmError) {
      // Idempotent path — confirm succeeded silently, verify state is consistent
      test.info().annotations.push({
        type: "behavior",
        description: "double-confirm was idempotent (no error thrown)",
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Overpayment Handling
// ---------------------------------------------------------------------------

test.describe("Negative Paths: Overpayment Handling", () => {
  test.describe.configure({ tag: "@deep" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("recording 2x totalAmount payment errors or caps at totalAmount", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(toNumber(batch.unitCogs) * 1.5, 10),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    const invoice = await trpcMutation<InvoiceRecord>(
      page,
      "invoices.generateFromOrder",
      { orderId: order.id }
    );

    await trpcMutation<{ success: boolean }>(page, "invoices.markSent", {
      id: invoice.id,
    });

    const sentInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );
    const totalAmount = toNumber(sentInvoice.totalAmount);
    expect(totalAmount).toBeGreaterThan(0);

    const overpaymentAmount = totalAmount * 2;

    let overpaymentErrorThrown = false;
    try {
      await trpcMutation(page, "payments.recordPayment", {
        invoiceId: invoice.id,
        amount: overpaymentAmount,
        paymentMethod: "ACH",
        referenceNumber: `NEG-OVERPAY-${Date.now()}`,
      });
    } catch (error) {
      overpaymentErrorThrown = true;
      // Error is an acceptable outcome — overpayment rejected
      expect(String(error)).toMatch(
        /fail|error|invalid|400|422|overpay|exceed/i
      );
    }

    // Regardless of whether the API accepted or rejected the overpayment,
    // verify the invoice is not in an inconsistent state
    const finalInvoice = await trpcQuery<InvoiceRecord>(
      page,
      "invoices.getById",
      { id: invoice.id }
    );

    const validStatuses = ["SENT", "PARTIAL", "PAID", "OVERPAID"];
    expect(validStatuses).toContain(finalInvoice.status);

    if (!overpaymentErrorThrown) {
      console.info(
        `[negative-paths] overpayment accepted; invoice status after: ${finalInvoice.status}`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Inventory Adjustment Boundaries
// ---------------------------------------------------------------------------

test.describe("Negative Paths: Inventory Adjustment Boundaries", () => {
  test.describe.configure({ tag: "@deep" });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("adjusting below zero errors or results in negative qty (documenting behavior)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const batch = await findBatchWithStock(page);
    const onHandQty = batch.onHandQty;
    expect(onHandQty).toBeGreaterThan(0);

    // Attempt to remove more than is on hand
    const negativeAdjustment = -(onHandQty + 1000);

    let adjustmentErrorThrown = false;
    try {
      await trpcMutation<{ success: boolean }>(page, "inventory.adjustQty", {
        id: batch.id,
        field: "onHandQty",
        adjustment: negativeAdjustment,
        adjustmentReason: "COUNT_DISCREPANCY",
        notes: "negative-paths: below-zero boundary test",
      });
    } catch (error) {
      adjustmentErrorThrown = true;
      // Any descriptive error is acceptable
      expect(String(error)).toMatch(
        /fail|error|invalid|400|422|negative|below/i
      );
    }

    if (!adjustmentErrorThrown) {
      // API allowed negative inventory — document the actual resulting qty
      const afterList = await trpcQuery<InventoryListResponse>(
        page,
        "inventory.list",
        { limit: 200 }
      );
      const updatedBatch = (afterList.items ?? []).find(
        item => item.batch?.id === batch.id
      )?.batch;

      const resultingQty = toNumber(updatedBatch?.onHandQty);
      console.warn(
        `[negative-paths] below-zero adjustment was ACCEPTED; resulting onHandQty=${resultingQty}. Negative inventory IS permitted by this API.`
      );

      // Roll back to avoid polluting other tests
      const rollbackAdj = onHandQty - resultingQty; // restore original qty
      await trpcMutation<{ success: boolean }>(page, "inventory.adjustQty", {
        id: batch.id,
        field: "onHandQty",
        adjustment: rollbackAdj,
        adjustmentReason: "COUNT_DISCREPANCY",
        notes: "negative-paths: rollback after below-zero test",
      });
    }
  });

  test("adjusting by zero errors or is a no-op (documenting behavior)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const batch = await findBatchWithStock(page);

    // Capture qty before
    const beforeList = await trpcQuery<InventoryListResponse>(
      page,
      "inventory.list",
      { limit: 200 }
    );
    const beforeBatch = (beforeList.items ?? []).find(
      item => item.batch?.id === batch.id
    )?.batch;
    const beforeQty = toNumber(beforeBatch?.onHandQty);

    let zeroAdjustmentErrorThrown = false;
    try {
      await trpcMutation<{ success: boolean }>(page, "inventory.adjustQty", {
        id: batch.id,
        field: "onHandQty",
        adjustment: 0,
        adjustmentReason: "COUNT_DISCREPANCY",
        notes: "negative-paths: zero adjustment boundary test",
      });
    } catch (error) {
      zeroAdjustmentErrorThrown = true;
      // Error is a valid response for a no-op adjustment
      expect(String(error)).toMatch(/fail|error|invalid|400|422/i);
    }

    if (!zeroAdjustmentErrorThrown) {
      // Verify qty was unchanged
      const afterList = await trpcQuery<InventoryListResponse>(
        page,
        "inventory.list",
        { limit: 200 }
      );
      const afterBatch = (afterList.items ?? []).find(
        item => item.batch?.id === batch.id
      )?.batch;
      const afterQty = toNumber(afterBatch?.onHandQty);

      console.info(
        `[negative-paths] zero adjustment accepted; onHandQty before=${beforeQty}, after=${afterQty}`
      );
      // Qty must be unchanged — a zero adjustment must not modify state
      expect(afterQty).toBeCloseTo(beforeQty, 6);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — Authorization Boundary Tests
// ---------------------------------------------------------------------------

test.describe("Negative Paths: Authorization Boundaries", () => {
  test.describe.configure({ tag: "@deep" });

  test.beforeEach(async ({ page }) => {
    await loginAsSalesRep(page);
  });

  test("salesRep cannot call inventory.adjustQty (expects 401/403)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // First fetch a batch id using read access (salesRep has inventory:read)
    let batchId: number;
    try {
      const list = await trpcQuery<InventoryListResponse>(
        page,
        "inventory.list",
        { limit: 10 }
      );
      const firstBatch = (list.items ?? []).find(
        item => typeof item.batch?.id === "number"
      )?.batch;
      if (!firstBatch?.id) {
        console.warn(
          "[negative-paths] no batch found via inventory.list as salesRep — skipping adjust attempt"
        );
        return;
      }
      batchId = firstBatch.id;
    } catch (error) {
      // If even the read fails, RBAC is already blocking access
      console.info(
        `[negative-paths] inventory.list blocked for salesRep: ${String(error)}`
      );
      return;
    }

    let permissionErrorThrown = false;
    try {
      await trpcMutation(page, "inventory.adjustQty", {
        id: batchId,
        field: "onHandQty",
        adjustment: 1,
        adjustmentReason: "COUNT_DISCREPANCY",
        notes: "negative-paths: RBAC boundary test",
      });
      console.warn(
        "[negative-paths] inventory.adjustQty succeeded for salesRep — RBAC may not be enforced on this endpoint"
      );
    } catch (error) {
      permissionErrorThrown = true;
      expect(String(error)).toMatch(
        /401|403|unauthorized|forbidden|permission|access denied/i
      );
    }

    expect(permissionErrorThrown).toBe(true);
  });

  test("salesRep cannot call inventory.intake (expects 401/403)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    let permissionErrorThrown = false;
    try {
      await trpcMutation(page, "inventory.intake", {
        vendorName: "NEG-RBAC-TEST-VENDOR",
        brandName: "NEG-RBAC-TEST-BRAND",
        productName: "NEG-RBAC-TEST-PRODUCT",
        category: "Flower",
        subcategory: "Indoor",
        grade: "AAA",
        quantity: "1",
        cogsMode: "FIXED",
        unitCogs: "1.00",
        paymentTerms: "NET_30",
        location: { name: "Default" },
        metadata: {},
      });
      console.warn(
        "[negative-paths] inventory.intake succeeded for salesRep — RBAC may not be enforced"
      );
    } catch (error) {
      permissionErrorThrown = true;
      expect(String(error)).toMatch(
        /401|403|unauthorized|forbidden|permission|access denied/i
      );
    }

    expect(permissionErrorThrown).toBe(true);
  });

  test("salesRep cannot access admin user management endpoint (expects 401/403)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    let permissionErrorThrown = false;
    try {
      await trpcQuery(page, "users.list", { limit: 10 });
      console.warn(
        "[negative-paths] users.list succeeded for salesRep — RBAC may not be enforced on admin endpoints"
      );
    } catch (error) {
      permissionErrorThrown = true;
      expect(String(error)).toMatch(
        /401|403|unauthorized|forbidden|permission|access denied/i
      );
    }

    expect(permissionErrorThrown).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — Stale Data / Race Condition Simulation
// ---------------------------------------------------------------------------

test.describe("Negative Paths: Stale Data / Race Condition Simulation", () => {
  test.describe.configure({ tag: "@deep" });

  let createdOrderId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("cannot generate invoice from a cancelled order", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(toNumber(batch.unitCogs) * 1.5, 10),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    // Cancel the confirmed order
    await trpcMutation(page, "orders.updateOrderStatus", {
      orderId: order.id,
      newStatus: "CANCELLED",
    });

    // Attempt to generate an invoice from the now-cancelled order
    let invoiceErrorThrown = false;
    try {
      await trpcMutation<InvoiceRecord>(page, "invoices.generateFromOrder", {
        orderId: order.id,
      });
      console.warn(
        "[negative-paths] invoices.generateFromOrder on CANCELLED order unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      invoiceErrorThrown = true;
      expect(String(error)).toMatch(
        /fail|error|invalid|400|409|422|cancel|status/i
      );
    }

    expect(invoiceErrorThrown).toBe(true);
  });

  test("cannot confirm a cancelled order", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(toNumber(batch.unitCogs) * 1.5, 10),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    // Cancel the order
    await trpcMutation(page, "orders.updateOrderStatus", {
      orderId: order.id,
      newStatus: "CANCELLED",
    });

    // Try to confirm the already-cancelled order (simulates stale UI state)
    let reconfirmErrorThrown = false;
    try {
      await trpcMutation(page, "orders.confirmOrder", { id: order.id });
      console.warn(
        "[negative-paths] orders.confirmOrder on CANCELLED order unexpectedly succeeded — documenting behavior"
      );
    } catch (error) {
      reconfirmErrorThrown = true;
      expect(String(error)).toMatch(
        /fail|error|invalid|400|409|422|cancel|status/i
      );
    }

    expect(reconfirmErrorThrown).toBe(true);
  });

  test("concurrent status updates to the same order: one succeeds, one fails or both are idempotent", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(toNumber(batch.unitCogs) * 1.5, 10),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    // Fire two concurrent status updates — both try to move to SHIPPED
    const results = await Promise.allSettled([
      trpcMutation(page, "orders.updateOrderStatus", {
        orderId: order.id,
        newStatus: "SHIPPED",
        notes: "Race condition test: concurrent A",
      }),
      trpcMutation(page, "orders.updateOrderStatus", {
        orderId: order.id,
        newStatus: "SHIPPED",
        notes: "Race condition test: concurrent B",
      }),
    ]);

    // At least one should succeed
    const successes = results.filter(r => r.status === "fulfilled");
    expect(successes.length).toBeGreaterThanOrEqual(1);

    // Verify the order ended up in a consistent state
    const finalOrder = await trpcQuery<{
      id: number;
      fulfillmentStatus?: string | null;
    }>(page, "orders.getById", { id: order.id });
    expect(finalOrder.fulfillmentStatus).toBe("SHIPPED");
  });

  test("cancelled order has isDraft=false and is not in a confirmable state", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(toNumber(batch.unitCogs) * 1.5, 10),
    });
    createdOrderId = order.id;

    await confirmSaleOrder(page, order.id);

    // Cancel the order
    await trpcMutation(page, "orders.updateOrderStatus", {
      orderId: order.id,
      newStatus: "CANCELLED",
    });

    // Read back and verify the order is in CANCELLED state
    const cancelledOrder = await trpcQuery<{
      id: number;
      fulfillmentStatus?: string | null;
      saleStatus?: string | null;
      isDraft?: boolean | null;
    }>(page, "orders.getById", { id: order.id });

    expect(cancelledOrder.isDraft).not.toBe(true);
    // The order should reflect CANCELLED in either fulfillmentStatus or saleStatus
    const statuses = [
      cancelledOrder.fulfillmentStatus,
      cancelledOrder.saleStatus,
    ].filter(Boolean);
    expect(statuses.some(s => /CANCEL/i.test(s ?? ""))).toBe(true);
  });
});
