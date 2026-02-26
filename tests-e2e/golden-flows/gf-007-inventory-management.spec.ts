import { expect, test } from "@playwright/test";
import { loginAsInventoryManager } from "../fixtures/auth";
import { trpcMutation, trpcQuery } from "../utils/golden-flow-helpers";
import { findBatchWithStock, toNumber } from "../utils/e2e-business-helpers";

type InventoryListResponse = {
  items?: Array<{
    batch?: {
      id?: number;
      totalQty?: string | number | null;
      onHandQty?: string | number | null;
    };
  }>;
};

function extractBatchSnapshot(
  response: InventoryListResponse,
  batchId: number
): { totalQty: number; onHandQty: number } {
  const batch = (response.items ?? []).find(
    item => item.batch?.id === batchId
  )?.batch;
  if (!batch) {
    throw new Error(`Batch ${batchId} not found in inventory.list response`);
  }

  return {
    totalQty: toNumber(batch.totalQty),
    onHandQty: toNumber(batch.onHandQty),
  };
}

test.describe("Golden Flow: GF-007 Inventory Management", () => {
  test.describe.configure({ tag: "@tier1" });

  test.beforeEach(async ({ page }) => {
    await loginAsInventoryManager(page);
  });

  test("adjusts on-hand quantity and persists the inventory change", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const batch = await findBatchWithStock(page);
    const adjustment = 2;

    const beforeList = await trpcQuery<InventoryListResponse>(
      page,
      "inventory.list",
      {
        limit: 200,
      }
    );
    const before = extractBatchSnapshot(beforeList, batch.id);

    await trpcMutation<{ success: boolean }>(page, "inventory.adjustQty", {
      id: batch.id,
      field: "onHandQty",
      adjustment,
      reason: "GF-007 quantity adjustment validation",
    });

    const afterList = await trpcQuery<InventoryListResponse>(
      page,
      "inventory.list",
      {
        limit: 200,
      }
    );
    const after = extractBatchSnapshot(afterList, batch.id);

    expect(after.onHandQty).toBeCloseTo(before.onHandQty + adjustment, 6);
    expect(after.totalQty).toBeCloseTo(before.totalQty + adjustment, 6);

    await trpcMutation<{ success: boolean }>(page, "inventory.adjustQty", {
      id: batch.id,
      field: "onHandQty",
      adjustment: -adjustment,
      reason: "GF-007 cleanup rollback",
    });

    const rolledBackList = await trpcQuery<InventoryListResponse>(
      page,
      "inventory.list",
      {
        limit: 200,
      }
    );
    const rolledBack = extractBatchSnapshot(rolledBackList, batch.id);
    expect(rolledBack.onHandQty).toBeCloseTo(before.onHandQty, 6);

    await page.goto("/inventory", { waitUntil: "networkidle" });
    await expect(page.locator('[data-testid="inventory-header"]')).toBeVisible({
      timeout: 10000,
    });
  });
});
