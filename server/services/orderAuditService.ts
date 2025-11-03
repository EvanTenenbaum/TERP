/**
 * Order Audit Service
 * Comprehensive audit logging for compliance
 * v2.0 Sales Order Enhancements
 */

import { getDb } from "../db";
import { orderAuditLog } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type AuditAction =
  | "CREATE_DRAFT"
  | "UPDATE_DRAFT"
  | "FINALIZE"
  | "DELETE"
  | "COGS_OVERRIDE"
  | "MARGIN_OVERRIDE"
  | "ADJUSTMENT_CHANGE"
  | "LINE_ITEM_ADD"
  | "LINE_ITEM_REMOVE"
  | "LINE_ITEM_UPDATE";

export interface AuditLogEntry {
  orderId: number;
  action: AuditAction;
  userId: number;
  changes?: Record<string, unknown>;
  reason?: string;
}

export const orderAuditService = {
  /**
   * Log audit entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(orderAuditLog).values({
      orderId: entry.orderId,
      action: entry.action,
      userId: entry.userId,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      reason: entry.reason || null,
      timestamp: new Date(),
    });
  },

  /**
   * Log order creation
   */
  async logOrderCreation(
    orderId: number,
    userId: number,
    orderData: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      orderId,
      action: "CREATE_DRAFT",
      userId,
      changes: orderData,
    });
  },

  /**
   * Log order update
   */
  async logOrderUpdate(
    orderId: number,
    userId: number,
    changes: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      orderId,
      action: "UPDATE_DRAFT",
      userId,
      changes,
    });
  },

  /**
   * Log order finalization
   */
  async logOrderFinalization(
    orderId: number,
    userId: number,
    finalData: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      orderId,
      action: "FINALIZE",
      userId,
      changes: finalData,
    });
  },

  /**
   * Log order deletion
   */
  async logOrderDeletion(
    orderId: number,
    userId: number,
    reason?: string
  ): Promise<void> {
    await this.log({
      orderId,
      action: "DELETE",
      userId,
      reason,
    });
  },

  /**
   * Log COGS override
   */
  async logCOGSOverride(
    orderId: number,
    userId: number,
    lineItemId: number,
    originalCOGS: number,
    overriddenCOGS: number,
    reason?: string
  ): Promise<void> {
    await this.log({
      orderId,
      action: "COGS_OVERRIDE",
      userId,
      changes: {
        lineItemId,
        originalCOGS,
        overriddenCOGS,
      },
      reason,
    });
  },

  /**
   * Log margin override
   */
  async logMarginOverride(
    orderId: number,
    userId: number,
    lineItemId: number,
    originalMargin: number | null,
    overriddenMargin: number,
    marginSource: "customer" | "default" | "manual"
  ): Promise<void> {
    await this.log({
      orderId,
      action: "MARGIN_OVERRIDE",
      userId,
      changes: {
        lineItemId,
        originalMargin,
        overriddenMargin,
        marginSource,
      },
    });
  },

  /**
   * Log order adjustment change
   */
  async logAdjustmentChange(
    orderId: number,
    userId: number,
    oldAdjustment: Record<string, unknown> | null,
    newAdjustment: Record<string, unknown> | null
  ): Promise<void> {
    await this.log({
      orderId,
      action: "ADJUSTMENT_CHANGE",
      userId,
      changes: {
        oldAdjustment,
        newAdjustment,
      },
    });
  },

  /**
   * Log line item addition
   */
  async logLineItemAdd(
    orderId: number,
    userId: number,
    lineItemData: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      orderId,
      action: "LINE_ITEM_ADD",
      userId,
      changes: lineItemData,
    });
  },

  /**
   * Log line item removal
   */
  async logLineItemRemove(
    orderId: number,
    userId: number,
    lineItemId: number
  ): Promise<void> {
    await this.log({
      orderId,
      action: "LINE_ITEM_REMOVE",
      userId,
      changes: { lineItemId },
    });
  },

  /**
   * Log line item update
   */
  async logLineItemUpdate(
    orderId: number,
    userId: number,
    lineItemId: number,
    changes: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      orderId,
      action: "LINE_ITEM_UPDATE",
      userId,
      changes: {
        lineItemId,
        ...changes,
      },
    });
  },

  /**
   * Get audit log for order
   */
  async getAuditLog(orderId: number): Promise<unknown[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db
      .select()
      .from(orderAuditLog)
      .where(eq(orderAuditLog.orderId, orderId));
  },

  /**
   * Get audit log for user
   */
  async getAuditLogByUser(userId: number): Promise<unknown[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db
      .select()
      .from(orderAuditLog)
      .where(eq(orderAuditLog.userId, userId));
  },
};
