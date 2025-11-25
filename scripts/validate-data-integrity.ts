/**
 * WF-004: Data Integrity Validation Script
 * 
 * Standalone script to validate data integrity across all workflows
 */

import { getDb } from "../server/db";
import {
  clients, orders, orderLineItems, batches, returns, invoices, payments,
  auditLogs, workflowQueue
} from "../drizzle/schema";
import { eq, sql, and, isNull, isNotNull } from "drizzle-orm";

interface ValidationResult {
  category: string;
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];

function addResult(category: string, test: string, passed: boolean, message: string, details?: any) {
  results.push({ category, test, passed, message, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${category}] ${test}: ${message}`);
  if (details) {
    console.log(`   Details:`, details);
  }
}

async function validateDataIntegrity() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  console.log("🔍 Starting data integrity validation...\n");

  // Foreign Key Relationships
  console.log("📋 Testing Foreign Key Relationships...");
  
  const orphanedOrders = await db
    .select()
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .where(isNull(clients.id));
  addResult(
    "Foreign Keys",
    "Orders → Clients",
    orphanedOrders.length === 0,
    orphanedOrders.length === 0 ? "All orders linked to valid clients" : `${orphanedOrders.length} orphaned orders found`,
    orphanedOrders.length > 0 ? { count: orphanedOrders.length } : undefined
  );

  const orphanedLineItems = await db
    .select()
    .from(orderLineItems)
    .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
    .where(isNull(orders.id));
  addResult(
    "Foreign Keys",
    "Order Line Items → Orders",
    orphanedLineItems.length === 0,
    orphanedLineItems.length === 0 ? "All line items linked to valid orders" : `${orphanedLineItems.length} orphaned line items found`
  );

  // Financial Calculations
  console.log("\n💰 Testing Financial Calculations...");
  
  const ordersWithLineItems = await db
    .select({
      orderId: orders.id,
      orderTotal: orders.total,
    })
    .from(orders)
    .limit(10);

  let calculationErrors = 0;
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

    if (difference > 0.01) {
      calculationErrors++;
    }
  }

  addResult(
    "Financial",
    "Order Totals Match Line Items",
    calculationErrors === 0,
    calculationErrors === 0 ? "All order totals match line items" : `${calculationErrors} orders with calculation errors`
  );

  // Audit Trails
  console.log("\n📝 Testing Audit Trails...");
  
  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(sql`${orders.createdAt} DESC`)
    .limit(10);

  let ordersWithoutAudit = 0;
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

    if (auditLogs.length === 0) {
      ordersWithoutAudit++;
    }
  }

  addResult(
    "Audit Trails",
    "Orders Have Audit Logs",
    ordersWithoutAudit === 0,
    ordersWithoutAudit === 0 ? "All orders have audit logs" : `${ordersWithoutAudit} orders without audit logs`
  );

  const recentAuditLogs = await db
    .select()
    .from(auditLogs)
    .orderBy(sql`${auditLogs.createdAt} DESC`)
    .limit(20);

  const logsWithUserId = recentAuditLogs.filter(
    (log: any) => log.userId !== null && log.userId !== undefined
  );

  const userIdRatio = logsWithUserId.length / recentAuditLogs.length;
  addResult(
    "Audit Trails",
    "Audit Logs Have User IDs",
    userIdRatio > 0.8,
    `${Math.round(userIdRatio * 100)}% of audit logs have user IDs`,
    { ratio: userIdRatio, threshold: 0.8 }
  );

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Validation Summary");
  console.log("=".repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const failed = total - passed;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${total}`);
  console.log(`🎯 Success Rate: ${Math.round((passed / total) * 100)}%`);

  if (failed > 0) {
    console.log("\n❌ Some validations failed. Review the details above.");
    process.exit(1);
  } else {
    console.log("\n✅ All validations passed!");
    process.exit(0);
  }
}

// Run validation
validateDataIntegrity().catch((error) => {
  console.error("❌ Validation script failed:", error);
  process.exit(1);
});

