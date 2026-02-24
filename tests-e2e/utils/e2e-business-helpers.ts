import type { Page } from "@playwright/test";
import { trpcMutation, trpcQuery } from "./golden-flow-helpers";

type ClientListResponse = {
  items?: Array<{ id?: number; name?: string }>;
  data?: Array<{ id?: number; name?: string }>;
};

type InventoryListResponse = {
  items?: Array<{
    batch?: {
      id?: number;
      sku?: string | null;
      totalQty?: string | number | null;
      onHandQty?: string | number | null;
      unitCogs?: string | number | null;
    };
  }>;
};

type OrderCreateResponse = {
  id: number;
  orderNumber?: string;
};

type OrderConfirmResponse = {
  success: boolean;
  orderId: number;
};

export interface BuyerClient {
  id: number;
  name: string;
}

export interface StockBatch {
  id: number;
  sku: string;
  totalQty: number;
  onHandQty: number;
  unitCogs: number;
}

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function getClientItems(
  result: ClientListResponse
): Array<{ id?: number; name?: string }> {
  if (Array.isArray(result.items)) {
    return result.items;
  }
  if (Array.isArray(result.data)) {
    return result.data;
  }
  return [];
}

export async function findBuyerClient(page: Page): Promise<BuyerClient> {
  const primary = await trpcQuery<ClientListResponse>(page, "clients.list", {
    clientTypes: ["buyer"],
    limit: 50,
  });
  const primaryMatch = getClientItems(primary).find(
    item => typeof item.id === "number" && typeof item.name === "string"
  );
  if (primaryMatch?.id && primaryMatch.name) {
    return { id: primaryMatch.id, name: primaryMatch.name };
  }

  const fallback = await trpcQuery<ClientListResponse>(page, "clients.list", {
    limit: 50,
  });
  const fallbackMatch = getClientItems(fallback).find(
    item => typeof item.id === "number" && typeof item.name === "string"
  );
  if (!fallbackMatch?.id || !fallbackMatch.name) {
    throw new Error(
      "No client records available. Seed client data before running golden-flow business assertions."
    );
  }
  return { id: fallbackMatch.id, name: fallbackMatch.name };
}

export async function findBatchWithStock(page: Page): Promise<StockBatch> {
  const result = await trpcQuery<InventoryListResponse>(
    page,
    "inventory.list",
    {
      limit: 200,
    }
  );
  const batches = Array.isArray(result.items) ? result.items : [];
  const match = batches
    .map(item => {
      const batch = item.batch;
      if (typeof batch?.id !== "number") {
        return null;
      }
      return {
        id: batch.id,
        sku: batch.sku ?? `BATCH-${batch.id}`,
        totalQty: toNumber(batch.totalQty),
        onHandQty: toNumber(batch.onHandQty),
        unitCogs: toNumber(batch.unitCogs),
      };
    })
    .find(
      (batch): batch is StockBatch =>
        !!batch && batch.totalQty > 0 && batch.onHandQty > 0
    );

  if (!match) {
    throw new Error(
      "No inventory batch with available stock found. Seed inventory before running this flow."
    );
  }

  return match;
}

export async function createSaleOrder(
  page: Page,
  input: {
    clientId: number;
    batchId: number;
    quantity: number;
    unitPrice: number;
  }
): Promise<OrderCreateResponse> {
  const order = await trpcMutation<OrderCreateResponse>(page, "orders.create", {
    orderType: "SALE",
    clientId: input.clientId,
    items: [
      {
        batchId: input.batchId,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        isSample: false,
      },
    ],
    paymentTerms: "NET_30",
  });

  if (typeof order.id !== "number" || order.id <= 0) {
    throw new Error("orders.create did not return a valid order id");
  }

  return order;
}

export async function confirmSaleOrder(
  page: Page,
  orderId: number
): Promise<OrderConfirmResponse> {
  const result = await trpcMutation<OrderConfirmResponse>(
    page,
    "orders.confirmOrder",
    {
      id: orderId,
    }
  );
  if (!result.success) {
    throw new Error(
      `orders.confirmOrder returned success=false for order ${orderId}`
    );
  }
  return result;
}

export async function cleanupOrder(
  page: Page,
  orderId: number | null
): Promise<void> {
  if (!orderId) {
    return;
  }
  try {
    await trpcMutation<{ success?: boolean }>(page, "orders.delete", {
      id: orderId,
    });
  } catch {
    // Best-effort cleanup for test artifacts.
  }
}
