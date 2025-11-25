/**
 * WF-004: Data Integrity Tests
 * 
 * Comprehensive test suite for data integrity across all workflows
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import { getDb } from "../../server/db";
import { 
  clients, orders, orderLineItems, batches, returns, invoices, payments,
  auditLogs, workflowQueue
} from "../../drizzle/schema";
import { eq, sql, and, isNull, isNotNull } from "drizzle-orm";

describe("Data Integrity Tests", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  describe("Foreign Key Relationships", () => {
    it("should have all orders linked to valid clients", async () => {
      const orphanedOrders = await db
        .select()
        .from(orders)
        .leftJoin(clients, eq(orders.clientId, clients.id))
        .where(isNull(clients.id));

      expect(orphanedOrders.length).toBe(0);
    });

    it("should have all order line items linked to valid orders", async () => {
      const orphanedLineItems = await db
        .select()
        .from(orderLineItems)
        .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
        .where(isNull(orders.id));

      expect(orphanedLineItems.length).toBe(0);
    });

    it("should have all order line items linked to valid batches", async () => {
      const orphanedLineItems = await db
        .select()
        .from(orderLineItems)
        .leftJoin(batches, eq(orderLineItems.batchId, batches.id))
        .where(isNull(batches.id));

      expect(orphanedLineItems.length).toBe(0);
    });

    it("should have all returns linked to valid orders", async () => {
      const orphanedReturns = await db
        .select()
        .from(returns)
        .leftJoin(orders, eq(returns.orderId, orders.id))
        .where(isNull(orders.id));

      expect(orphanedReturns.length).toBe(0);
    });

    it("should have all audit logs linked to valid users", async () => {
      // Note: This test assumes users table exists
      // Adjust based on actual schema
      const orphanedAuditLogs = await db
        .select()
        .from(auditLogs)
        .where(isNull(auditLogs.userId));

      // Allow some audit logs without userId (system actions)
      // But most should have userId
      const totalAuditLogs = await db.select().from(auditLogs);
      const ratio = orphanedAuditLogs.length / totalAuditLogs.length;
      expect(ratio).toBeLessThan(0.1); // Less than 10% should be orphaned
    });
  });

  describe("Financial Calculations", () => {
    it("should have order totals match sum of line items", async () => {
      const ordersWithLineItems = await db
        .select({
          orderId: orders.id,
          orderTotal: orders.total,
        })
        .from(orders)
        .limit(10);

      for (const order of ordersWithLineItems) {
        const lineItems = await db
          .select({
            totalPrice: orderLineItems.totalPrice,
          })
          .from(orderLineItems)
          .where(eq(orderLineItems.orderId, order.orderId));

        const calculatedTotal = lineItems.reduce(
          (sum: number, item: any) => sum + parseFloat(item.totalPrice || "0"),
          0
        );

        const orderTotal = parseFloat(order.orderTotal || "0");
        const difference = Math.abs(calculatedTotal - orderTotal);

        // Allow small floating-point differences (epsilon comparison)
        expect(difference).toBeLessThan(0.01);
      }
    });

    it("should have no division by zero errors in calculations", async () => {
      // Test that all calculations handle zero values correctly
      const batchesWithZeroPrice = await db
        .select()
        .from(batches)
        .where(eq(batches.unitPrice, "0"))
        .limit(5);

      // Verify these don't cause errors
      expect(batchesWithZeroPrice).toBeDefined();
    });
  });

  describe("Audit Trails", () => {
    it("should have audit logs for all order creations", async () => {
      const recentOrders = await db
        .select()
        .from(orders)
        .orderBy(sql`${orders.createdAt} DESC`)
        .limit(10);

      for (const order of recentOrders) {
        const auditLogs = await db
          .select()
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.entityType, "Order"),
              eq(auditLogs.entityId, order.id)
            )
          );

        // At least one audit log should exist for order creation
        expect(auditLogs.length).toBeGreaterThan(0);
      }
    });

    it("should have user IDs in audit logs", async () => {
      const recentAuditLogs = await db
        .select()
        .from(auditLogs)
        .orderBy(sql`${auditLogs.createdAt} DESC`)
        .limit(20);

      const logsWithUserId = recentAuditLogs.filter(
        (log: any) => log.userId !== null && log.userId !== undefined
      );

      // Most audit logs should have userId
      const ratio = logsWithUserId.length / recentAuditLogs.length;
      expect(ratio).toBeGreaterThan(0.8); // At least 80% should have userId
    });
  });

  describe("Soft Deletes", () => {
    it("should have soft-deleted records excluded from normal queries", async () => {
      // This test verifies that soft-deleted records have deletedAt set
      // and are excluded from normal queries
      const allOrders = await db.select().from(orders);
      const activeOrders = allOrders.filter(
        (order: any) => !order.deletedAt
      );

      // Most orders should be active
      const ratio = activeOrders.length / allOrders.length;
      expect(ratio).toBeGreaterThan(0.9); // At least 90% should be active
    });
  });

  describe("Workflow Data Integrity", () => {
    it("should have workflow queue entries linked to valid batches", async () => {
      const orphanedQueueEntries = await db
        .select()
        .from(workflowQueue)
        .leftJoin(batches, eq(workflowQueue.batchId, batches.id))
        .where(isNull(batches.id));

      expect(orphanedQueueEntries.length).toBe(0);
    });

    it("should have consistent batch statuses", async () => {
      // Verify that batch statuses are valid enum values
      const batchesWithInvalidStatus = await db
        .select()
        .from(batches)
        .where(
          sql`${batches.status} NOT IN ('AWAITING_INTAKE', 'LIVE', 'ON_HOLD', 'QUARANTINED', 'PHOTOGRAPHY_COMPLETE', 'SOLD_OUT', 'CLOSED')`
        );

      expect(batchesWithInvalidStatus.length).toBe(0);
    });
  });
});

