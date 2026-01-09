/**
 * Enhanced Audit Logger
 * Comprehensive audit trail for compliance and troubleshooting
 *
 * Features:
 * - Before/after state capture
 * - User context tracking
 * - Standardized audit log format
 * - Query and export capabilities
 */

import { getDb } from "./db";
import { auditLogs } from "../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { logger } from "./_core/logger";

/**
 * Audit event types
 */
export enum AuditEventType {
  // Transaction events
  TRANSACTION_CREATED = "TRANSACTION_CREATED",
  TRANSACTION_UPDATED = "TRANSACTION_UPDATED",
  TRANSACTION_DELETED = "TRANSACTION_DELETED",
  TRANSACTION_LINKED = "TRANSACTION_LINKED",

  // Credit events
  CREDIT_ISSUED = "CREDIT_ISSUED",
  CREDIT_APPLIED = "CREDIT_APPLIED",
  CREDIT_VOIDED = "CREDIT_VOIDED",

  // Inventory events
  // ✅ ENHANCED: TERP-INIT-005 Phase 3 - Comprehensive inventory audit events
  INVENTORY_DECREASED = "INVENTORY_DECREASED",
  INVENTORY_INCREASED = "INVENTORY_INCREASED",
  INVENTORY_ADJUSTED = "INVENTORY_ADJUSTED",
  BATCH_CREATED = "BATCH_CREATED",
  BATCH_STATUS_CHANGED = "BATCH_STATUS_CHANGED",
  LOT_CREATED = "LOT_CREATED",
  VENDOR_CREATED = "VENDOR_CREATED",
  BRAND_CREATED = "BRAND_CREATED",
  PRODUCT_CREATED = "PRODUCT_CREATED",
  INTAKE_COMPLETED = "INTAKE_COMPLETED",

  // Bad debt events
  BAD_DEBT_WRITTEN_OFF = "BAD_DEBT_WRITTEN_OFF",
  BAD_DEBT_REVERSAL = "BAD_DEBT_REVERSAL",

  // Accounting events
  GL_ENTRY_CREATED = "GL_ENTRY_CREATED",
  GL_ENTRY_REVERSED = "GL_ENTRY_REVERSED",
  GL_ENTRY_POSTED = "GL_ENTRY_POSTED",

  // Configuration events
  CONFIG_CHANGED = "CONFIG_CHANGED",
  PAYMENT_METHOD_ADDED = "PAYMENT_METHOD_ADDED",
  PAYMENT_METHOD_UPDATED = "PAYMENT_METHOD_UPDATED",

  // User events
  USER_LOGIN = "USER_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",
  PERMISSION_CHANGED = "PERMISSION_CHANGED",

  // QA Auth events (for deterministic RBAC testing)
  QA_AUTH_LOGIN = "QA_AUTH_LOGIN",
  QA_AUTH_ROLE_SWITCH = "QA_AUTH_ROLE_SWITCH",
}

/**
 * Audit log entry
 */
export interface AuditEntry {
  eventType: AuditEventType;
  entityType: string;
  entityId: number;
  userId: number;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event
 * @param entry Audit entry data
 * @returns Created audit log ID
 */
export async function logAuditEvent(entry: AuditEntry): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [result] = await db
      .insert(auditLogs)
      .values({
        actorId: entry.userId,
        entity: entry.entityType,
        entityId: entry.entityId,
        action: entry.eventType,
        before: entry.beforeState ? JSON.stringify(entry.beforeState) : null,
        after: entry.afterState ? JSON.stringify(entry.afterState) : null,
        reason: entry.metadata ? JSON.stringify(entry.metadata) : null,
      })
      .$returningId();

    return result?.id || 0;
  } catch (error) {
    logger.error({ error }, "Error logging audit event");
    // Don't throw - audit logging should never break the main operation
    return 0;
  }
}

/**
 * Calculate changes between before and after states
 * @param before Before state
 * @param after After state
 * @returns Changes object
 */
export function calculateChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  // Check all fields in after state
  for (const key in after) {
    if (before[key] !== after[key]) {
      changes[key] = {
        old: before[key],
        new: after[key],
      };
    }
  }

  // Check for removed fields
  for (const key in before) {
    if (!(key in after)) {
      changes[key] = {
        old: before[key],
        new: undefined,
      };
    }
  }

  return changes;
}

/**
 * Log transaction creation
 * @param transaction Transaction data
 * @param userId User ID
 */
export async function logTransactionCreated(
  transaction: {
    id: number;
    transactionNumber: string;
    amount: string;
    clientId: number;
  },
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.TRANSACTION_CREATED,
    entityType: "transaction",
    entityId: transaction.id,
    userId,
    afterState: transaction,
    metadata: {
      transactionNumber: transaction.transactionNumber,
      amount: transaction.amount,
      clientId: transaction.clientId,
    },
  });
}

/**
 * Log transaction update
 * @param transactionId Transaction ID
 * @param before Before state
 * @param after After state
 * @param userId User ID
 */
export async function logTransactionUpdated(
  transactionId: number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  userId: number
): Promise<void> {
  const changes = calculateChanges(before, after);

  await logAuditEvent({
    eventType: AuditEventType.TRANSACTION_UPDATED,
    entityType: "transaction",
    entityId: transactionId,
    userId,
    beforeState: before,
    afterState: after,
    changes,
  });
}

/**
 * Log credit issuance
 * @param credit Credit data
 * @param userId User ID
 */
export async function logCreditIssued(
  credit: {
    id: number;
    creditNumber: string;
    creditAmount: string;
    clientId: number;
  },
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.CREDIT_ISSUED,
    entityType: "credit",
    entityId: credit.id,
    userId,
    afterState: credit,
    metadata: {
      creditNumber: credit.creditNumber,
      amount: credit.creditAmount,
      clientId: credit.clientId,
    },
  });
}

/**
 * Log credit application
 * @param creditId Credit ID
 * @param invoiceId Invoice ID
 * @param amount Amount applied
 * @param userId User ID
 */
export async function logCreditApplied(
  creditId: number,
  invoiceId: number,
  amount: string,
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.CREDIT_APPLIED,
    entityType: "credit",
    entityId: creditId,
    userId,
    metadata: {
      invoiceId,
      amountApplied: amount,
    },
  });
}

/**
 * Log inventory movement
 * @param movement Movement data
 * @param userId User ID
 */
export async function logInventoryMovement(
  movement: {
    id: number;
    batchId: number;
    movementType: string;
    quantityChange: string;
    quantityBefore: string;
    quantityAfter: string;
  },
  userId: number
): Promise<void> {
  const eventType =
    movement.movementType === "SALE"
      ? AuditEventType.INVENTORY_DECREASED
      : movement.movementType === "REFUND_RETURN"
        ? AuditEventType.INVENTORY_INCREASED
        : AuditEventType.INVENTORY_ADJUSTED;

  await logAuditEvent({
    eventType,
    entityType: "inventory_movement",
    entityId: movement.id,
    userId,
    metadata: {
      batchId: movement.batchId,
      movementType: movement.movementType,
      quantityChange: movement.quantityChange,
      quantityBefore: movement.quantityBefore,
      quantityAfter: movement.quantityAfter,
    },
  });
}

/**
 * Log bad debt write-off
 * @param transactionId Transaction ID
 * @param amount Write-off amount
 * @param reason Reason
 * @param userId User ID
 */
export async function logBadDebtWriteOff(
  transactionId: number,
  amount: string,
  reason: string,
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.BAD_DEBT_WRITTEN_OFF,
    entityType: "transaction",
    entityId: transactionId,
    userId,
    metadata: {
      writeOffAmount: amount,
      reason,
    },
  });
}

/**
 * Log GL entry creation
 * @param entryNumber Entry number
 * @param accountId Account ID
 * @param amount Amount
 * @param type Debit or Credit
 * @param userId User ID
 */
export async function logGLEntryCreated(
  entryNumber: string,
  accountId: number,
  amount: string,
  type: "DEBIT" | "CREDIT",
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.GL_ENTRY_CREATED,
    entityType: "ledger_entry",
    entityId: 0, // Entry ID not available yet
    userId,
    metadata: {
      entryNumber,
      accountId,
      amount,
      type,
    },
  });
}

/**
 * Query audit logs
 * @param filters Query filters
 * @returns Array of audit logs
 */
export async function queryAuditLogs(filters: {
  entityType?: string;
  entityId?: number;
  userId?: number;
  eventType?: AuditEventType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    db.select().from(auditLogs);

    const conditions = [];

    if (filters.entityType) {
      conditions.push(eq(auditLogs.entity, filters.entityType));
    }

    if (filters.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }

    if (filters.userId) {
      conditions.push(eq(auditLogs.actorId, filters.userId));
    }

    if (filters.eventType) {
      conditions.push(eq(auditLogs.action, filters.eventType));
    }

    if (filters.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    if (conditions.length > 0) {
      const results = await db
        .select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(filters.limit || 100);

      return results;
    }

    const results = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters.limit || 100);

    return results;
  } catch (error) {
    logger.error({ error }, "Error querying audit logs");
    throw new Error(
      `Failed to query audit logs: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get audit trail for an entity
 * @param entityType Entity type
 * @param entityId Entity ID
 * @returns Chronological audit trail
 */
export async function getEntityAuditTrail(
  entityType: string,
  entityId: number
): Promise<unknown[]> {
  return await queryAuditLogs({
    entityType,
    entityId,
    limit: 1000,
  });
}

/**
 * Export audit logs to JSON
 * @param filters Query filters
 * @returns JSON string
 */
export async function exportAuditLogs(filters: {
  entityType?: string;
  entityId?: number;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<string> {
  const logs = await queryAuditLogs({ ...filters, limit: 10000 });
  return JSON.stringify(logs, null, 2);
}

/**
 * Enhanced Inventory Audit Logging
 * ✅ ADDED: TERP-INIT-005 Phase 3 - Automated audit logging for inventory operations
 */

/**
 * Log batch creation
 */
export async function logBatchCreated(
  batch: { id: number; code: string; productId: number; lotId: number },
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.BATCH_CREATED,
    entityType: "Batch",
    entityId: batch.id,
    userId,
    afterState: batch,
    metadata: {
      batchCode: batch.code,
      productId: batch.productId,
      lotId: batch.lotId,
    },
  });
}

/**
 * Log batch status change
 */
export async function logBatchStatusChanged(
  batchId: number,
  before: { status: string },
  after: { status: string },
  reason: string | undefined,
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.BATCH_STATUS_CHANGED,
    entityType: "Batch",
    entityId: batchId,
    userId,
    beforeState: before,
    afterState: after,
    metadata: {
      reason,
    },
  });
}

/**
 * Log lot creation
 */
export async function logLotCreated(
  lot: { id: number; code: string; vendorId: number },
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.LOT_CREATED,
    entityType: "Lot",
    entityId: lot.id,
    userId,
    afterState: lot,
    metadata: {
      lotCode: lot.code,
      vendorId: lot.vendorId,
    },
  });
}

/**
 * Log vendor creation
 */
export async function logVendorCreated(
  vendor: { id: number; name: string },
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.VENDOR_CREATED,
    entityType: "Vendor",
    entityId: vendor.id,
    userId,
    afterState: vendor,
    metadata: {
      vendorName: vendor.name,
    },
  });
}

/**
 * Log brand creation
 */
export async function logBrandCreated(
  brand: { id: number; name: string; vendorId: number },
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.BRAND_CREATED,
    entityType: "Brand",
    entityId: brand.id,
    userId,
    afterState: brand,
    metadata: {
      brandName: brand.name,
      vendorId: brand.vendorId,
    },
  });
}

/**
 * Log product creation
 */
export async function logProductCreated(
  product: { id: number; name: string; brandId: number; category: string },
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.PRODUCT_CREATED,
    entityType: "Product",
    entityId: product.id,
    userId,
    afterState: product,
    metadata: {
      productName: product.name,
      brandId: product.brandId,
      category: product.category,
    },
  });
}

/**
 * Log intake completion (entire process)
 */
export async function logIntakeCompleted(
  result: {
    vendor: { id: number; name: string };
    brand: { id: number; name: string };
    product: { id: number; name: string };
    lot: { id: number; code: string };
    batch: { id: number; code: string };
  },
  userId: number
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.INTAKE_COMPLETED,
    entityType: "Batch",
    entityId: result.batch.id,
    userId,
    afterState: result,
    metadata: {
      vendorName: result.vendor.name,
      brandName: result.brand.name,
      productName: result.product.name,
      lotCode: result.lot.code,
      batchCode: result.batch.code,
    },
  });
}

// ============================================================================
// QA AUTH AUDIT LOGGING
// ============================================================================

/**
 * Log QA authentication event
 * Tracks QA logins for audit compliance and security monitoring
 */
export async function logQaAuthLogin(
  data: {
    userId: number;
    email: string;
    role: string;
    environment: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.QA_AUTH_LOGIN,
    entityType: "QaAuth",
    entityId: data.userId,
    userId: data.userId,
    metadata: {
      email: data.email,
      role: data.role,
      environment: data.environment,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      authMethod: "qa-auth",
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log QA role switch event
 * Tracks when QA users switch between roles during testing
 */
export async function logQaRoleSwitch(
  data: {
    userId: number;
    fromRole: string;
    toRole: string;
    email: string;
  }
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.QA_AUTH_ROLE_SWITCH,
    entityType: "QaAuth",
    entityId: data.userId,
    userId: data.userId,
    beforeState: { role: data.fromRole },
    afterState: { role: data.toRole },
    metadata: {
      email: data.email,
      timestamp: new Date().toISOString(),
    },
  });
}
