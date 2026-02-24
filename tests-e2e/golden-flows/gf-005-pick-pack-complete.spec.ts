import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginAsWarehouseStaff } from "../fixtures/auth";
import { trpcMutation, trpcQuery } from "../utils/golden-flow-helpers";
import {
  cleanupOrder,
  confirmSaleOrder,
  createSaleOrder,
  findBatchWithStock,
  findBuyerClient,
} from "../utils/e2e-business-helpers";

type PickPackListItem = {
  orderId: number;
  orderNumber: string;
  pickPackStatus: "PENDING" | "PICKING" | "PACKED" | "READY";
};

type PickPackOrderDetails = {
  order: {
    id: number;
    orderNumber: string;
    pickPackStatus: "PENDING" | "PICKING" | "PACKED" | "READY";
  };
  bags: Array<{ id: number }>;
  summary: {
    totalItems: number;
    packedItems: number;
  };
};

test.describe("GF-005: Pick & Pack Completion", () => {
  test.describe.configure({ tag: "@tier1" });

  let createdOrderId: number | null = null;

  test.afterEach(async ({ page }) => {
    await cleanupOrder(page, createdOrderId);
    createdOrderId = null;
  });

  test("packs an order and transitions it to READY with verifiable state changes", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await loginAsAdmin(page);

    const client = await findBuyerClient(page);
    const batch = await findBatchWithStock(page);
    const order = await createSaleOrder(page, {
      clientId: client.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: Math.max(batch.unitCogs * 1.3, 1),
    });
    createdOrderId = order.id;
    await confirmSaleOrder(page, order.id);

    const pendingList = await trpcQuery<PickPackListItem[]>(
      page,
      "pickPack.getPickList",
      {
        filters: { status: "PENDING" },
        limit: 100,
        offset: 0,
      }
    );
    expect(pendingList.some(item => item.orderId === order.id)).toBe(true);

    const packed = await trpcMutation<{ packedItemCount: number }>(
      page,
      "pickPack.markAllPacked",
      {
        orderId: order.id,
      }
    );
    expect(packed.packedItemCount).toBeGreaterThan(0);

    const ready = await trpcMutation<{ success: boolean }>(
      page,
      "pickPack.markOrderReady",
      {
        orderId: order.id,
      }
    );
    expect(ready.success).toBe(true);

    const details = await trpcQuery<PickPackOrderDetails>(
      page,
      "pickPack.getOrderDetails",
      {
        orderId: order.id,
      }
    );
    expect(details.order.pickPackStatus).toBe("READY");
    expect(details.summary.totalItems).toBeGreaterThan(0);
    expect(details.summary.packedItems).toBe(details.summary.totalItems);
    expect(details.bags.length).toBeGreaterThan(0);

    const readyList = await trpcQuery<PickPackListItem[]>(
      page,
      "pickPack.getPickList",
      {
        filters: { status: "READY" },
        limit: 100,
        offset: 0,
      }
    );
    expect(readyList.some(item => item.orderId === order.id)).toBe(true);

    await page.goto("/pick-pack", { waitUntil: "networkidle" });
    const header = page
      .locator('[data-testid="pick-pack-header"]')
      .or(page.getByText(/pick\s*&\s*pack/i).first());
    await expect(header.first()).toBeVisible({ timeout: 10000 });
  });

  test("warehouse role can access pick-pack surface without server crash", async ({
    page,
  }) => {
    await loginAsWarehouseStaff(page);
    await page.goto("/pick-pack", { waitUntil: "networkidle" });

    const surfaceOrAccessState = page
      .locator('[data-testid="order-queue"]')
      .or(page.getByText(/access|denied|permission/i).first())
      .or(page.getByRole("heading").first());
    await expect(surfaceOrAccessState.first()).toBeVisible({ timeout: 10000 });

    const serverError = page.locator("text=/500|internal server error/i");
    await expect(serverError).not.toBeVisible();
  });
});
