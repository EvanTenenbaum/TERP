import { sql, type SQL } from "drizzle-orm";
import { logger } from "../_core/logger";
import { getDb } from "../db";

export interface BatchInsertPayload {
  code: string;
  sku: string;
  productId: number;
  lotId: number;
  batchStatus: string;
  grade?: string | null;
  isSample?: number;
  sampleOnly?: number;
  sampleAvailable?: number;
  cogsMode: string;
  unitCogs: string | null;
  unitCogsMin: string | null;
  unitCogsMax: string | null;
  paymentTerms: string;
  ownershipType?: string;
  amountPaid?: string;
  metadata: string | null;
  onHandQty: string;
  sampleQty: string;
  reservedQty: string;
  quarantineQty: string;
  holdQty: string;
  defectiveQty: string;
}

const MODERN_BATCH_COLUMNS = ["deleted_at", "isPhotographyComplete"] as const;

let cachedBatchColumns: Set<string> | undefined;
let batchColumnsPromise: Promise<Set<string>> | undefined;

function buildBatchInsertRecord(payload: BatchInsertPayload): Record<string, unknown> {
  return {
    code: payload.code,
    deleted_at: null,
    version: 1,
    sku: payload.sku,
    productId: payload.productId,
    lotId: payload.lotId,
    batchStatus: payload.batchStatus,
    isPhotographyComplete: false,
    statusId: null,
    grade: payload.grade ?? null,
    isSample: payload.isSample ?? 0,
    sampleOnly: payload.sampleOnly ?? 0,
    sampleAvailable: payload.sampleAvailable ?? 0,
    cogsMode: payload.cogsMode,
    unitCogs: payload.unitCogs,
    unitCogsMin: payload.unitCogsMin,
    unitCogsMax: payload.unitCogsMax,
    paymentTerms: payload.paymentTerms,
    ownership_type: payload.ownershipType ?? "CONSIGNED",
    amountPaid: payload.amountPaid ?? "0",
    metadata: payload.metadata,
    photo_session_event_id: null,
    onHandQty: payload.onHandQty,
    sampleQty: payload.sampleQty,
    reservedQty: payload.reservedQty,
    quarantineQty: payload.quarantineQty,
    holdQty: payload.holdQty,
    defectiveQty: payload.defectiveQty,
    publishEcom: 0,
    publishB2b: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function buildCompatibleBatchInsertEntries(
  availableColumns: Set<string>,
  payload: BatchInsertPayload
): Array<[string, unknown]> {
  const batchRecord = buildBatchInsertRecord(payload);
  return Object.entries(batchRecord).filter(([column]) =>
    availableColumns.has(column)
  );
}

async function detectBatchColumns(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) {
    return new Set(Object.keys(buildBatchInsertRecord({
      code: "",
      sku: "",
      productId: 0,
      lotId: 0,
      batchStatus: "AWAITING_INTAKE",
      grade: null,
      cogsMode: "FIXED",
      unitCogs: "0",
      unitCogsMin: null,
      unitCogsMax: null,
      paymentTerms: "CONSIGNMENT",
      ownershipType: "CONSIGNED",
      amountPaid: "0",
      metadata: null,
      onHandQty: "0",
      sampleQty: "0",
      reservedQty: "0",
      quarantineQty: "0",
      holdQty: "0",
      defectiveQty: "0",
    })));
  }

  try {
    const [rows] = await db.execute(
      `SELECT COLUMN_NAME AS columnName
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'batches'`
    );

    const columns = new Set(
      Array.isArray(rows)
        ? rows
            .map(row =>
              typeof row === "object" && row && "columnName" in row
                ? String((row as { columnName: unknown }).columnName)
                : null
            )
            .filter((column): column is string => Boolean(column))
        : []
    );

    const missingModernColumns = MODERN_BATCH_COLUMNS.filter(
      column => !columns.has(column)
    );
    if (missingModernColumns.length > 0) {
      logger.info(
        { missingModernColumns },
        "Legacy batch schema detected; omitting unavailable columns during PO receiving"
      );
    }

    return columns;
  } catch (error) {
    logger.warn(
      { error },
      "Failed to inspect batch columns; assuming modern schema for PO receiving"
    );
    return new Set(Object.keys(buildBatchInsertRecord({
      code: "",
      sku: "",
      productId: 0,
      lotId: 0,
      batchStatus: "AWAITING_INTAKE",
      grade: null,
      cogsMode: "FIXED",
      unitCogs: "0",
      unitCogsMin: null,
      unitCogsMax: null,
      paymentTerms: "CONSIGNMENT",
      ownershipType: "CONSIGNED",
      amountPaid: "0",
      metadata: null,
      onHandQty: "0",
      sampleQty: "0",
      reservedQty: "0",
      quarantineQty: "0",
      holdQty: "0",
      defectiveQty: "0",
    })));
  }
}

export async function getBatchColumnSet(): Promise<Set<string>> {
  if (cachedBatchColumns) {
    return cachedBatchColumns;
  }

  if (!batchColumnsPromise) {
    batchColumnsPromise = detectBatchColumns().then(columns => {
      cachedBatchColumns = columns;
      batchColumnsPromise = undefined;
      return columns;
    });
  }

  return batchColumnsPromise;
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

export async function insertBatchWithCompatibility(
  tx: { execute: (query: SQL) => Promise<unknown> },
  payload: BatchInsertPayload
): Promise<number> {
  const availableColumns = await getBatchColumnSet();
  const entries = buildCompatibleBatchInsertEntries(availableColumns, payload);

  const query = sql`
    INSERT INTO batches (${sql.join(
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
