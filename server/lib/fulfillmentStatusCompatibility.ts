import { logger } from "../_core/logger";
import { getDb } from "../db";
import { orderStatusHistory, orders } from "../../drizzle/schema";

type FulfillmentStatusStorageTable = "orders" | "order_status_history";
type ReadyForPackingStorageStatus = "READY_FOR_PACKING" | "PENDING";
type OrderFulfillmentStatusValue = typeof orders.$inferInsert.fulfillmentStatus;
type OrderStatusHistoryFulfillmentStatusValue =
  typeof orderStatusHistory.$inferInsert.fulfillmentStatus;

const readyStatusCache = new Map<
  FulfillmentStatusStorageTable,
  ReadyForPackingStorageStatus
>();
const readyStatusPromiseCache = new Map<
  FulfillmentStatusStorageTable,
  Promise<ReadyForPackingStorageStatus>
>();

async function detectReadyForPackingStorageStatus(
  tableName: FulfillmentStatusStorageTable
): Promise<ReadyForPackingStorageStatus> {
  const db = await getDb();
  if (!db) {
    return "READY_FOR_PACKING";
  }

  try {
    const [rows] = await db.execute(
      `SELECT COLUMN_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = '${tableName}'
         AND COLUMN_NAME = 'fulfillmentStatus'
       LIMIT 1`
    );

    const columnType =
      ((Array.isArray(rows) ? rows[0] : undefined) as
        | { COLUMN_TYPE?: string }
        | undefined)
        ?.COLUMN_TYPE ?? "";

    if (columnType.includes("'READY_FOR_PACKING'")) {
      return "READY_FOR_PACKING";
    }

    if (columnType.includes("'PENDING'")) {
      logger.info(
        { tableName, columnType },
        "Legacy fulfillment status enum detected; mapping READY_FOR_PACKING to PENDING"
      );
      return "PENDING";
    }
  } catch (error) {
    logger.warn(
      { error, tableName },
      "Failed to inspect fulfillment status enum; defaulting to READY_FOR_PACKING"
    );
  }

  return "READY_FOR_PACKING";
}

async function getReadyForPackingStorageStatus(
  tableName: FulfillmentStatusStorageTable
): Promise<ReadyForPackingStorageStatus> {
  const cached = readyStatusCache.get(tableName);
  if (cached) {
    return cached;
  }

  const pending = readyStatusPromiseCache.get(tableName);
  if (pending) {
    return pending;
  }

  const detectionPromise = detectReadyForPackingStorageStatus(tableName)
    .then(status => {
      readyStatusCache.set(tableName, status);
      readyStatusPromiseCache.delete(tableName);
      return status;
    })
    .catch(error => {
      readyStatusPromiseCache.delete(tableName);
      throw error;
    });

  readyStatusPromiseCache.set(tableName, detectionPromise);
  return detectionPromise;
}

export async function getStoredFulfillmentStatus(
  status: string,
  tableName: FulfillmentStatusStorageTable = "orders"
): Promise<string> {
  if (status !== "READY_FOR_PACKING") {
    return status;
  }

  return await getReadyForPackingStorageStatus(tableName);
}

export function normalizeFulfillmentStatus(
  status: string | null | undefined
): string | null | undefined {
  if (status === "PENDING") {
    return "READY_FOR_PACKING";
  }

  return status;
}

export function isReadyForPackingLikeStatus(
  status: string | null | undefined
): boolean {
  return normalizeFulfillmentStatus(status) === "READY_FOR_PACKING";
}

export function coerceOrderFulfillmentStatus(
  status: string
): OrderFulfillmentStatusValue {
  return status as unknown as OrderFulfillmentStatusValue;
}

export function coerceOrderStatusHistoryFulfillmentStatus(
  status: string
): OrderStatusHistoryFulfillmentStatusValue {
  return status as unknown as OrderStatusHistoryFulfillmentStatusValue;
}

export function resetFulfillmentStatusCompatibilityCacheForTests(): void {
  readyStatusCache.clear();
  readyStatusPromiseCache.clear();
}
