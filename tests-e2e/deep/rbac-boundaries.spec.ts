/**
 * RBAC Boundary E2E Tests
 *
 * Verifies that role-based access control is enforced across all critical
 * mutation endpoints. Each test logs in as a restricted role and attempts
 * an operation that should be forbidden.
 *
 * Roles tested: salesRep, warehouse, accountant, fulfillment, auditor
 *
 * Tag: @rbac (runs AFTER @deep business logic tests)
 */

import { expect, test } from "@playwright/test";
import {
  loginAsSalesRep,
  loginAsWarehouseStaff,
  loginAsAccountant,
  loginAsFulfillment,
  loginAsAuditor,
} from "../fixtures/auth";
import { trpcMutation, trpcQuery } from "../utils/golden-flow-helpers";
import {
  findBatchWithStock,
  findBuyerClient,
} from "../utils/e2e-business-helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert that a tRPC call throws a permission error */
async function expectForbidden(fn: () => Promise<unknown>, label: string) {
  let threw = false;
  try {
    await fn();
    console.warn(`[rbac] ${label} unexpectedly succeeded`);
  } catch (error) {
    threw = true;
    expect(String(error)).toMatch(
      /401|403|unauthorized|forbidden|permission|access denied|UNAUTHORIZED|FORBIDDEN/i
    );
  }
  expect(threw, `Expected ${label} to throw a permission error`).toBe(true);
}

// ---------------------------------------------------------------------------
// Suite 1: Warehouse staff cannot access finance mutations
// ---------------------------------------------------------------------------

test.describe("RBAC: Warehouse Staff Boundaries", () => {
  test.describe.configure({ tag: "@rbac" });

  test.beforeEach(async ({ page }) => {
    await loginAsWarehouseStaff(page);
  });

  test("warehouse staff cannot record a payment", async ({ page }) => {
    test.setTimeout(120_000);

    await expectForbidden(
      () =>
        trpcMutation(page, "payments.recordPayment", {
          invoiceId: 1,
          amount: 10,
          paymentMethod: "CASH",
          referenceNumber: `RBAC-WH-PAY-${Date.now()}`,
        }),
      "payments.recordPayment as warehouse"
    );
  });

  test("warehouse staff cannot void an invoice", async ({ page }) => {
    test.setTimeout(120_000);

    await expectForbidden(
      () =>
        trpcMutation(page, "invoices.void", {
          id: 1,
          reason: "RBAC test: warehouse should not void",
        }),
      "invoices.void as warehouse"
    );
  });

  test("warehouse staff cannot write off bad debt", async ({ page }) => {
    test.setTimeout(120_000);

    await expectForbidden(
      () =>
        trpcMutation(page, "badDebt.writeOff", {
          transactionId: 1,
          writeOffAmount: "100.00",
          reason: "RBAC test: warehouse should not write off debt",
        }),
      "badDebt.writeOff as warehouse"
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Accountant cannot modify inventory
// ---------------------------------------------------------------------------

test.describe("RBAC: Accountant Boundaries", () => {
  test.describe.configure({ tag: "@rbac" });

  test.beforeEach(async ({ page }) => {
    await loginAsAccountant(page);
  });

  test("accountant cannot adjust inventory quantities", async ({ page }) => {
    test.setTimeout(120_000);

    const batch = await findBatchWithStock(page);

    await expectForbidden(
      () =>
        trpcMutation(page, "inventory.adjustQty", {
          id: batch.id,
          field: "onHandQty",
          adjustment: 1,
          adjustmentReason: "COUNT_DISCREPANCY",
          notes: "RBAC test: accountant should not adjust",
        }),
      "inventory.adjustQty as accountant"
    );
  });

  test("accountant cannot update batch status", async ({ page }) => {
    test.setTimeout(120_000);

    const batch = await findBatchWithStock(page);

    await expectForbidden(
      () =>
        trpcMutation(page, "inventory.updateStatus", {
          id: batch.id,
          status: "ON_HOLD",
          reason: "RBAC test: accountant should not change status",
        }),
      "inventory.updateStatus as accountant"
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Fulfillment staff cannot access order creation or finance
// ---------------------------------------------------------------------------

test.describe("RBAC: Fulfillment Staff Boundaries", () => {
  test.describe.configure({ tag: "@rbac" });

  test.beforeEach(async ({ page }) => {
    await loginAsFulfillment(page);
  });

  test("fulfillment staff cannot create orders", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    await expectForbidden(
      () =>
        trpcMutation(page, "orders.create", {
          orderType: "SALE",
          clientId: client.id,
          items: [
            {
              batchId: batch.id,
              quantity: 1,
              unitPrice: 10,
              isSample: false,
            },
          ],
          paymentTerms: "NET_30",
        }),
      "orders.create as fulfillment"
    );
  });

  test("fulfillment staff cannot generate invoices", async ({ page }) => {
    test.setTimeout(120_000);

    await expectForbidden(
      () =>
        trpcMutation(page, "invoices.generateFromOrder", {
          orderId: 1,
        }),
      "invoices.generateFromOrder as fulfillment"
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Auditor has read-only access (cannot mutate)
// ---------------------------------------------------------------------------

test.describe("RBAC: Auditor Read-Only Boundaries", () => {
  test.describe.configure({ tag: "@rbac" });

  test.beforeEach(async ({ page }) => {
    await loginAsAuditor(page);
  });

  test("auditor can read inventory list", async ({ page }) => {
    test.setTimeout(120_000);

    // Auditors should have read access
    const result = await trpcQuery<{ items?: unknown[] }>(
      page,
      "inventory.list",
      { limit: 5 }
    );
    expect(result).toBeDefined();
  });

  test("auditor cannot adjust inventory", async ({ page }) => {
    test.setTimeout(120_000);

    const batch = await findBatchWithStock(page);

    await expectForbidden(
      () =>
        trpcMutation(page, "inventory.adjustQty", {
          id: batch.id,
          field: "onHandQty",
          adjustment: 1,
          adjustmentReason: "COUNT_DISCREPANCY",
          notes: "RBAC test: auditor should not adjust",
        }),
      "inventory.adjustQty as auditor"
    );
  });

  test("auditor cannot create orders", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);

    await expectForbidden(
      () =>
        trpcMutation(page, "orders.create", {
          orderType: "SALE",
          clientId: client.id,
          items: [
            {
              batchId: batch.id,
              quantity: 1,
              unitPrice: 10,
              isSample: false,
            },
          ],
          paymentTerms: "NET_30",
        }),
      "orders.create as auditor"
    );
  });

  test("auditor cannot override credit limits", async ({ page }) => {
    test.setTimeout(120_000);

    const client = await findBuyerClient(page);

    await expectForbidden(
      () =>
        trpcMutation(page, "credit.manualOverride", {
          clientId: client.id,
          newLimit: 999999,
          reason: "RBAC test: auditor should not override credit",
        }),
      "credit.manualOverride as auditor"
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 5: SalesRep extended boundaries
// ---------------------------------------------------------------------------

test.describe("RBAC: SalesRep Extended Boundaries", () => {
  test.describe.configure({ tag: "@rbac" });

  test.beforeEach(async ({ page }) => {
    await loginAsSalesRep(page);
  });

  test("salesRep (Customer Service) can cancel orders — has orders:cancel", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // Customer Service role has orders:cancel per rbacDefinitions.ts.
    // Verify the permission is not accidentally revoked (regression guard).
    let wasForbidden = false;
    try {
      await trpcMutation(page, "orders.updateOrderStatus", {
        orderId: 1,
        newStatus: "CANCELLED",
        notes: "RBAC test: salesRep should have cancel permission",
      });
    } catch (e: unknown) {
      const msg = String(e);
      wasForbidden = /403|forbidden|permission/i.test(msg);
      // Non-permission errors (e.g., order not found, invalid transition) are fine
    }
    expect(wasForbidden).toBe(false);
  });

  test("salesRep cannot void invoices", async ({ page }) => {
    test.setTimeout(120_000);

    await expectForbidden(
      () =>
        trpcMutation(page, "invoices.void", {
          id: 1,
          reason: "RBAC test: salesRep should not void",
        }),
      "invoices.void as salesRep"
    );
  });

  test("salesRep cannot access user management", async ({ page }) => {
    test.setTimeout(120_000);

    await expectForbidden(
      () => trpcQuery(page, "users.list", {}),
      "users.list as salesRep"
    );
  });
});
