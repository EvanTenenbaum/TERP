import { sql, type SQL } from "drizzle-orm";

import { logger } from "../_core/logger";
import { getDb } from "../db";

export interface OrderInsertPayload {
  orderNumber: string;
  orderType: string;
  isDraft: boolean;
  clientId: number;
  items: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  totalCogs: string;
  totalMargin: string;
  avgMarginPercent: string;
  paymentTerms: string;
  cashPayment: string;
  dueDate: Date;
  saleStatus: string;
  fulfillmentStatus: string;
  confirmedAt?: Date;
  notes: string | null;
  createdBy: number;
  convertedFromOrderId?: number;
}

const CONSERVATIVE_ORDER_COLUMNS = new Set([
  "order_number",
  "orderType",
  "is_draft",
  "client_id",
  "items",
  "subtotal",
  "tax",
  "discount",
  "total",
  "total_cogs",
  "total_margin",
  "avg_margin_percent",
  "paymentTerms",
  "cash_payment",
  "due_date",
  "saleStatus",
  "fulfillmentStatus",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
]);

let cachedOrderColumns: Set<string> | undefined;
let orderColumnsPromise: Promise<Set<string>> | undefined;

function extractColumnNames(result: unknown): Set<string> {
  const rows = Array.isArray(result)
    ? Array.isArray(result[0])
      ? result[0]
      : result
    : [];

  return new Set(
    rows
      .map(row => {
        if (typeof row !== "object" || row === null) {
          return "";
        }

        if ("columnName" in row) {
          return String((row as { columnName: unknown }).columnName ?? "");
        }

        if ("COLUMN_NAME" in row) {
          return String((row as { COLUMN_NAME: unknown }).COLUMN_NAME ?? "");
        }

        if ("Field" in row) {
          return String((row as { Field: unknown }).Field ?? "");
        }

        return "";
      })
      .filter(Boolean)
  );
}

async function detectOrderColumns(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) {
    return new Set(CONSERVATIVE_ORDER_COLUMNS);
  }

  try {
    const infoSchemaResult = await db.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'orders'`
    );

    const infoSchemaColumns = extractColumnNames(infoSchemaResult);
    if (infoSchemaColumns.size > 0) {
      return infoSchemaColumns;
    }
  } catch (error) {
    logger.warn({ error }, "Failed to inspect orders schema via information_schema");
  }

  try {
    const showColumnsResult = await db.execute("SHOW COLUMNS FROM orders");
    const showColumns = extractColumnNames(showColumnsResult);
    if (showColumns.size > 0) {
      logger.info(
        "Recovered orders schema using SHOW COLUMNS after information_schema lookup failed"
      );
      return showColumns;
    }
  } catch (error) {
    logger.warn({ error }, "Failed to inspect orders schema via SHOW COLUMNS");
  }

  logger.warn(
    "Falling back to a conservative legacy order column set to avoid runtime schema crashes"
  );
  return new Set(CONSERVATIVE_ORDER_COLUMNS);
}

export async function getOrderColumnSet(): Promise<Set<string>> {
  if (cachedOrderColumns !== undefined) {
    return cachedOrderColumns;
  }

  if (orderColumnsPromise) {
    return orderColumnsPromise;
  }

  orderColumnsPromise = detectOrderColumns()
    .then(columns => {
      cachedOrderColumns = columns;
      orderColumnsPromise = undefined;
      return columns;
    })
    .catch(error => {
      orderColumnsPromise = undefined;
      throw error;
    });

  return orderColumnsPromise;
}

export function buildCompatibleOrderInsertEntries(
  availableColumns: Set<string>,
  payload: OrderInsertPayload
): Array<[string, unknown]> {
  const now = new Date();
  const record: Array<[string, unknown]> = [
    ["order_number", payload.orderNumber],
    ["orderType", payload.orderType],
    ["is_draft", payload.isDraft],
    ["client_id", payload.clientId],
    ["items", payload.items],
    ["subtotal", payload.subtotal],
    ["tax", payload.tax],
    ["discount", payload.discount],
    ["total", payload.total],
    ["total_cogs", payload.totalCogs],
    ["total_margin", payload.totalMargin],
    ["avg_margin_percent", payload.avgMarginPercent],
    ["paymentTerms", payload.paymentTerms],
    ["cash_payment", payload.cashPayment],
    ["due_date", payload.dueDate],
    ["saleStatus", payload.saleStatus],
    ["fulfillmentStatus", payload.fulfillmentStatus],
    ["confirmed_at", payload.confirmedAt ?? now],
    ["notes", payload.notes],
    ["created_by", payload.createdBy],
    ["created_at", now],
    ["updated_at", now],
    ["converted_from_order_id", payload.convertedFromOrderId ?? null],
  ];

  return record.filter(([column]) => availableColumns.has(column));
}

function extractInsertId(result: unknown): number {
  if (Array.isArray(result)) {
    const header = result[0] as { insertId?: number } | undefined;
    return Number(header?.insertId ?? 0);
  }

  if (result && typeof result === "object" && "insertId" in result) {
    return Number((result as { insertId?: number }).insertId ?? 0);
  }

  return 0;
}

export async function insertOrderWithCompatibility(
  tx: { execute: (query: SQL) => Promise<unknown> },
  payload: OrderInsertPayload
): Promise<number> {
  const availableColumns = await getOrderColumnSet();
  const entries = buildCompatibleOrderInsertEntries(availableColumns, payload);

  const query = sql`
    INSERT INTO orders (${sql.join(
      entries.map(([column]) => sql.raw(`\`${column}\``)),
      sql`, `
    )})
    VALUES (${sql.join(
      entries.map(([, value]) => sql`${value}`),
      sql`, `
    )})
  `;

  const result = await tx.execute(query);
  return extractInsertId(result);
}

export function resetOrderColumnCompatibilityCacheForTests(): void {
  cachedOrderColumns = undefined;
  orderColumnsPromise = undefined;
}
