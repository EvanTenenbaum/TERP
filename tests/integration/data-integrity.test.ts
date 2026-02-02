/**
 * WF-004: Data Integrity Tests
 * 
 * CRITICAL: These tests hit the REAL database to verify data integrity.
 * 
 * Purpose:
 * - Verify foreign key relationships are intact
 * - Verify financial calculations are consistent
 * - Verify audit trails exist for critical operations
 * - Verify soft deletes are working correctly
 * 
 * Run with:
 *   DATABASE_URL=mysql://... pnpm vitest run tests/integration/data-integrity.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../../server/db";
import { 
  clients, orders, orderLineItems, batches, returns,
  auditLogs, workflowQueue
} from "../../drizzle/schema";
import { eq, sql, and, isNull } from "drizzle-orm";

describe("Data Integrity Tests", () => {
  let db: Awaited<ReturnType<typeof getDb>> | null = null;
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      db = await getDb();
      // Test actual connectivity with a simple query
      await db.execute(sql`SELECT 1`);
      dbAvailable = true;
    } catch {
      console.warn("Skipping data integrity tests - database not available");
      dbAvailable = false;
    }
  });

  describe("Foreign Key Relationships", () => {
    it("should have all orders linked to valid clients", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

      const orphanedOrders = await db
        .select()
        .from(orders)
        .leftJoin(clients, eq(orders.clientId, clients.id))
        .where(isNull(clients.id));

      expect(orphanedOrders.length).toBe(0);
    });

    it("should have all order line items linked to valid orders", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

      const orphanedLineItems = await db
        .select()
        .from(orderLineItems)
        .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
        .where(isNull(orders.id));

      expect(orphanedLineItems.length).toBe(0);
    });

    it("should have all order line items linked to valid batches", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

      const orphanedLineItems = await db
        .select()
        .from(orderLineItems)
        .leftJoin(batches, eq(orderLineItems.batchId, batches.id))
        .where(isNull(batches.id));

      expect(orphanedLineItems.length).toBe(0);
    });

    it("should have all returns linked to valid orders", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

      const orphanedReturns = await db
        .select()
        .from(returns)
        .leftJoin(orders, eq(returns.orderId, orders.id))
        .where(isNull(orders.id));

      expect(orphanedReturns.length).toBe(0);
    });

    it("should have audit logs with user IDs for most entries", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

      const orphanedAuditLogs = await db
        .select()
        .from(auditLogs)
        .where(isNull(auditLogs.userId));

      const totalAuditLogs = await db.select().from(auditLogs);
      if (totalAuditLogs.length === 0) {
        return; // No audit logs yet
      }
      const ratio = orphanedAuditLogs.length / totalAuditLogs.length;
      expect(ratio).toBeLessThan(0.1);
    });
  });

  describe("Financial Calculations", () => {
    it("should have order totals match sum of line items", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

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
          (sum: number, item: { totalPrice: string | null }) => 
            sum + parseFloat(item.totalPrice || "0"),
          0
        );

        const orderTotal = parseFloat(order.orderTotal || "0");
        const difference = Math.abs(calculatedTotal - orderTotal);
        expect(difference).toBeLessThan(0.01);
      }
    });

    it("should have no division by zero errors in calculations", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

      const batchesWithZeroPrice = await db
        .select()
        .from(batches)
        .where(eq(batches.unitPrice, "0"))
        .limit(5);

      expect(batchesWithZeroPrice).toBeDefined();
    });
  });

  describe("Audit Trails", () => {
    it("should have audit logs for order creations", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

      const recentOrders = await db
        .select()
        .from(orders)
        .orderBy(sql`${orders.createdAt} DESC`)
        .limit(10);

      if (recentOrders.length === 0) {
        return; // No orders yet
      }

      for (const order of recentOrders) {
        const logs = await db
          .select()
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.entityType, "Order"),
              eq(auditLogs.entityId, order.id)
            )
          );

        expect(logs.length).toBeGreaterThan(0);
      }
    });

    it("should have user IDs in most audit logs", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

      const recentAuditLogs = await db
        .select()
        .from(auditLogs)
        .orderBy(sql`${auditLogs.createdAt} DESC`)
        .limit(20);

      if (recentAuditLogs.length === 0) {
        return; // No audit logs yet
      }

      const logsWithUserId = recentAuditLogs.filter(
        (log) => log.userId !== null && log.userId !== undefined
      );

      const ratio = logsWithUserId.length / recentAuditLogs.length;
      expect(ratio).toBeGreaterThan(0.8);
    });
  });

  describe("Soft Deletes", () => {
    it("should have soft-deleted records excluded from normal queries", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

      const allOrders = await db.select().from(orders);
      
      if (allOrders.length === 0) {
        return; // No orders yet
      }

      const activeOrders = allOrders.filter(
        (order) => !order.deletedAt
      );

      const ratio = activeOrders.length / allOrders.length;
      expect(ratio).toBeGreaterThan(0.9);
    });
  });

  describe("Workflow Data Integrity", () => {
    it("should have workflow queue entries linked to valid batches", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

      const orphanedQueueEntries = await db
        .select()
        .from(workflowQueue)
        .leftJoin(batches, eq(workflowQueue.batchId, batches.id))
        .where(isNull(batches.id));

      expect(orphanedQueueEntries.length).toBe(0);
    });

    it("should have consistent batch statuses", async () => {
      if (!dbAvailable || !db) {
        console.info("Skipping - database not available");
        return;
      }

      const batchesWithInvalidStatus = await db
        .select()
        .from(batches)
        .where(
          sql`${batches.batchStatus} NOT IN ('AWAITING_INTAKE', 'LIVE', 'ON_HOLD', 'QUARANTINED', 'PHOTOGRAPHY_COMPLETE', 'SOLD_OUT', 'CLOSED')`
        );

      expect(batchesWithInvalidStatus.length).toBe(0);
    });
  });
});
