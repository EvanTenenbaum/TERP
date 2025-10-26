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
import { auditLogs, type InsertAuditLog } from "../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

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
  INVENTORY_DECREASED = "INVENTORY_DECREASED",
  INVENTORY_INCREASED = "INVENTORY_INCREASED",
  INVENTORY_ADJUSTED = "INVENTORY_ADJUSTED",
  
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
  PERMISSION_CHANGED = "PERMISSION_CHANGED"
}

/**
 * Audit log entry
 */
export interface AuditEntry {
  eventType: AuditEventType;
  entityType: string;
  entityId: number;
  userId: number;
  beforeState?: any;
  afterState?: any;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
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
    const [result] = await db.insert(auditLogs).values({
      actorId: entry.userId,
      entity: entry.entityType,
      entityId: entry.entityId,
      action: entry.eventType,
      before: entry.beforeState ? JSON.stringify(entry.beforeState) : null,
      after: entry.afterState ? JSON.stringify(entry.afterState) : null,
      reason: entry.metadata ? JSON.stringify(entry.metadata) : null
    }).$returningId();
    
    return result?.id || 0;
  } catch (error) {
    console.error("Error logging audit event:", error);
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
  before: Record<string, any>,
  after: Record<string, any>
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};
  
  // Check all fields in after state
  for (const key in after) {
    if (before[key] !== after[key]) {
      changes[key] = {
        old: before[key],
        new: after[key]
      };
    }
  }
  
  // Check for removed fields
  for (const key in before) {
    if (!(key in after)) {
      changes[key] = {
        old: before[key],
        new: undefined
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
  transaction: { id: number; transactionNumber: string; amount: string; clientId: number },
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
      clientId: transaction.clientId
    }
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
  before: Record<string, any>,
  after: Record<string, any>,
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
    changes
  });
}

/**
 * Log credit issuance
 * @param credit Credit data
 * @param userId User ID
 */
export async function logCreditIssued(
  credit: { id: number; creditNumber: string; creditAmount: string; clientId: number },
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
      clientId: credit.clientId
    }
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
      amountApplied: amount
    }
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
  const eventType = movement.movementType === "SALE" 
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
      quantityAfter: movement.quantityAfter
    }
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
      reason
    }
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
      type
    }
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
}): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    let query = db.select().from(auditLogs);
    
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
    console.error("Error querying audit logs:", error);
    throw new Error(`Failed to query audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
): Promise<any[]> {
  return await queryAuditLogs({
    entityType,
    entityId,
    limit: 1000
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

