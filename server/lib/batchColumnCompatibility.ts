import { sql } from "drizzle-orm";

import { logger } from "../_core/logger";
import { getDb } from "../db";
import { batches } from "../../drizzle/schema";

let batchColumnsCache: Set<string> | null | undefined;
let batchColumnsPromise: Promise<Set<string> | null> | undefined;

function hasColumn(columns: Set<string> | null, columnName: string): boolean {
  return columns === null || columns.has(columnName);
}

async function detectBatchColumns(): Promise<Set<string> | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const [rows] = await db.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'batches'`
    );

    if (!Array.isArray(rows)) {
      return null;
    }

    return new Set(
      rows
        .map(row =>
          typeof row === "object" && row !== null && "COLUMN_NAME" in row
            ? String(row.COLUMN_NAME)
            : ""
        )
        .filter(Boolean)
    );
  } catch (error) {
    logger.warn(
      { error },
      "Failed to inspect batches schema; assuming modern batch columns"
    );
    return null;
  }
}

export async function getBatchColumnNames(): Promise<Set<string> | null> {
  if (batchColumnsCache !== undefined) {
    return batchColumnsCache;
  }

  if (batchColumnsPromise) {
    return batchColumnsPromise;
  }

  batchColumnsPromise = detectBatchColumns()
    .then(columns => {
      batchColumnsCache = columns;
      batchColumnsPromise = undefined;
      return columns;
    })
    .catch(error => {
      batchColumnsPromise = undefined;
      throw error;
    });

  return batchColumnsPromise;
}

export async function getCompatibleBatchSelect() {
  const columns = await getBatchColumnNames();

  const isPhotographyCompleteSelect = hasColumn(
    columns,
    "isPhotographyComplete"
  )
    ? batches.isPhotographyComplete
    : sql<boolean>`CASE
        WHEN ${batches.batchStatus} = 'PHOTOGRAPHY_COMPLETE' THEN true
        ELSE false
      END`.as("isPhotographyComplete");

  return {
    id: batches.id,
    code: batches.code,
    deletedAt: hasColumn(columns, "deleted_at")
      ? batches.deletedAt
      : sql<Date | null>`NULL`.as("deletedAt"),
    version: hasColumn(columns, "version")
      ? batches.version
      : sql<number>`1`.as("version"),
    sku: batches.sku,
    productId: batches.productId,
    lotId: batches.lotId,
    batchStatus: batches.batchStatus,
    isPhotographyComplete: isPhotographyCompleteSelect,
    statusId: hasColumn(columns, "statusId")
      ? batches.statusId
      : sql<number | null>`NULL`.as("statusId"),
    grade: batches.grade,
    isSample: hasColumn(columns, "isSample")
      ? batches.isSample
      : sql<number>`0`.as("isSample"),
    sampleOnly: hasColumn(columns, "sampleOnly")
      ? batches.sampleOnly
      : sql<number>`0`.as("sampleOnly"),
    sampleAvailable: hasColumn(columns, "sampleAvailable")
      ? batches.sampleAvailable
      : sql<number>`0`.as("sampleAvailable"),
    cogsMode: hasColumn(columns, "cogsMode")
      ? batches.cogsMode
      : sql<"FIXED" | "RANGE">`'FIXED'`.as("cogsMode"),
    unitCogs: hasColumn(columns, "unitCogs")
      ? batches.unitCogs
      : sql<string | null>`NULL`.as("unitCogs"),
    unitCogsMin: hasColumn(columns, "unitCogsMin")
      ? batches.unitCogsMin
      : sql<string | null>`NULL`.as("unitCogsMin"),
    unitCogsMax: hasColumn(columns, "unitCogsMax")
      ? batches.unitCogsMax
      : sql<string | null>`NULL`.as("unitCogsMax"),
    paymentTerms: hasColumn(columns, "paymentTerms")
      ? batches.paymentTerms
      : sql<(typeof batches.$inferSelect)["paymentTerms"]>`'NET_30'`.as(
          "paymentTerms"
        ),
    ownershipType: hasColumn(columns, "ownership_type")
      ? batches.ownershipType
      : sql<(typeof batches.$inferSelect)["ownershipType"]>`'CONSIGNED'`.as(
          "ownershipType"
        ),
    amountPaid: hasColumn(columns, "amountPaid")
      ? batches.amountPaid
      : sql<string>`'0'`.as("amountPaid"),
    metadata: hasColumn(columns, "metadata")
      ? batches.metadata
      : sql<string | null>`NULL`.as("metadata"),
    photoSessionEventId: hasColumn(columns, "photo_session_event_id")
      ? batches.photoSessionEventId
      : sql<number | null>`NULL`.as("photoSessionEventId"),
    onHandQty: batches.onHandQty,
    sampleQty: batches.sampleQty,
    reservedQty: batches.reservedQty,
    quarantineQty: hasColumn(columns, "quarantineQty")
      ? batches.quarantineQty
      : sql<string>`'0'`.as("quarantineQty"),
    holdQty: hasColumn(columns, "holdQty")
      ? batches.holdQty
      : sql<string>`'0'`.as("holdQty"),
    defectiveQty: hasColumn(columns, "defectiveQty")
      ? batches.defectiveQty
      : sql<string>`'0'`.as("defectiveQty"),
    publishEcom: hasColumn(columns, "publishEcom")
      ? batches.publishEcom
      : sql<number>`0`.as("publishEcom"),
    publishB2b: hasColumn(columns, "publishB2b")
      ? batches.publishB2b
      : sql<number>`0`.as("publishB2b"),
    createdAt: batches.createdAt,
    updatedAt: batches.updatedAt,
  };
}

export function resetBatchColumnCompatibilityCacheForTests(): void {
  batchColumnsCache = undefined;
  batchColumnsPromise = undefined;
}
