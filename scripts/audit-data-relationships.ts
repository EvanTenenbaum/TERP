/**
 * Referential Integrity Audit Script
 * 
 * Identifies orphaned records and missing relationships in seeded data.
 * Part of DATA-002-AUGMENT: Augment Seeded Data for Realistic Relationships
 * 
 * Usage: pnpm tsx scripts/audit-data-relationships.ts
 */

import { config } from "dotenv";
// Load environment variables - try .env first, then .env.production
config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

import { db } from "./db-sync.js";
import {
  orders,
  orderLineItems,
  products,
  batches,
  inventoryMovements,
  invoices,
  invoiceLineItems,
  payments,
  ledgerEntries,
  clients,
  clientActivity,
} from "../drizzle/schema.js";
import { eq, isNull, sql, and, count } from "drizzle-orm";

interface AuditResult {
  category: string;
  issue: string;
  count: number;
  severity: "Critical" | "High" | "Medium" | "Low";
  details?: string[];
}

const results: AuditResult[] = [];

/**
 * Check orders without order_line_items
 */
async function checkOrdersWithoutItems(): Promise<void> {
  try {
    const ordersWithItems = await db
      .select({ orderId: orderLineItems.orderId })
      .from(orderLineItems)
      .groupBy(orderLineItems.orderId);

    const orderIdsWithItems = new Set(
      ordersWithItems.map((row) => row.orderId)
    );

    const allOrders = await db.select({ id: orders.id }).from(orders);
    const ordersWithoutItems = allOrders.filter(
      (order) => !orderIdsWithItems.has(order.id)
    );

    results.push({
      category: "Orders",
      issue: "Orders without order_line_items",
      count: ordersWithoutItems.length,
      severity: ordersWithoutItems.length > 0 ? "Critical" : "Low",
      details:
        ordersWithoutItems.length > 0
          ? ordersWithoutItems.slice(0, 10).map((o) => `Order ID: ${o.id}`)
          : undefined,
    });
  } catch (error) {
    console.error("Error checking orders without items:", error);
    results.push({
      category: "Orders",
      issue: "Error checking orders without items",
      count: -1,
      severity: "High",
      details: [(error as Error).message],
    });
  }
}

/**
 * Check order_line_items with invalid order_id
 */
async function checkOrphanedOrderItems(): Promise<void> {
  try {
    const orphanedItems = await db
      .select({ id: orderLineItems.id, orderId: orderLineItems.orderId })
      .from(orderLineItems)
      .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
      .where(isNull(orders.id));

    results.push({
      category: "Order Items",
      issue: "Order_line_items with invalid order_id",
      count: orphanedItems.length,
      severity: orphanedItems.length > 0 ? "Critical" : "Low",
      details:
        orphanedItems.length > 0
          ? orphanedItems
              .slice(0, 10)
              .map((item) => `Item ID: ${item.id}, Order ID: ${item.orderId}`)
          : undefined,
    });
  } catch (error) {
    console.error("Error checking orphaned order items:", error);
    results.push({
      category: "Order Items",
      issue: "Error checking orphaned order items",
      count: -1,
      severity: "High",
      details: [(error as Error).message],
    });
  }
}

/**
 * Check order_line_items with invalid batch_id
 */
async function checkOrderItemsWithInvalidBatch(): Promise<void> {
  try {
    const invalidBatchItems = await db
      .select({ id: orderLineItems.id, batchId: orderLineItems.batchId })
      .from(orderLineItems)
      .leftJoin(batches, eq(orderLineItems.batchId, batches.id))
      .where(isNull(batches.id));

    results.push({
      category: "Order Items",
      issue: "Order_line_items with invalid batch_id",
      count: invalidBatchItems.length,
      severity: invalidBatchItems.length > 0 ? "High" : "Low",
      details:
        invalidBatchItems.length > 0
          ? invalidBatchItems
              .slice(0, 10)
              .map((item) => `Item ID: ${item.id}, Batch ID: ${item.batchId}`)
          : undefined,
    });
  } catch (error) {
    console.error("Error checking order items with invalid batch:", error);
    results.push({
      category: "Order Items",
      issue: "Error checking order items with invalid batch",
      count: -1,
      severity: "High",
      details: [(error as Error).message],
    });
  }
}

/**
 * Check inventory movements without valid batch_id
 */
async function checkInventoryMovementsWithoutBatch(): Promise<void> {
  try {
    const invalidMovements = await db
      .select({
        id: inventoryMovements.id,
        batchId: inventoryMovements.batchId,
      })
      .from(inventoryMovements)
      .leftJoin(batches, eq(inventoryMovements.batchId, batches.id))
      .where(isNull(batches.id));

    results.push({
      category: "Inventory Movements",
      issue: "Inventory movements with invalid batch_id",
      count: invalidMovements.length,
      severity: invalidMovements.length > 0 ? "High" : "Low",
      details:
        invalidMovements.length > 0
          ? invalidMovements
              .slice(0, 10)
              .map(
                (mov) => `Movement ID: ${mov.id}, Batch ID: ${mov.batchId}`
              )
          : undefined,
    });
  } catch (error) {
    console.error("Error checking inventory movements:", error);
    results.push({
      category: "Inventory Movements",
      issue: "Error checking inventory movements",
      count: -1,
      severity: "High",
      details: [(error as Error).message],
    });
  }
}

/**
 * Check invoices without line items
 */
async function checkInvoicesWithoutLineItems(): Promise<void> {
  try {
    const invoicesWithItems = await db
      .select({ invoiceId: invoiceLineItems.invoiceId })
      .from(invoiceLineItems)
      .groupBy(invoiceLineItems.invoiceId);

    const invoiceIdsWithItems = new Set(
      invoicesWithItems.map((row) => row.invoiceId)
    );

    const allInvoices = await db.select({ id: invoices.id }).from(invoices);
    const invoicesWithoutItems = allInvoices.filter(
      (invoice) => !invoiceIdsWithItems.has(invoice.id)
    );

    results.push({
      category: "Invoices",
      issue: "Invoices without line items",
      count: invoicesWithoutItems.length,
      severity: invoicesWithoutItems.length > 0 ? "High" : "Low",
      details:
        invoicesWithoutItems.length > 0
          ? invoicesWithoutItems
              .slice(0, 10)
              .map((inv) => `Invoice ID: ${inv.id}`)
          : undefined,
    });
  } catch (error) {
    console.error("Error checking invoices without line items:", error);
    results.push({
      category: "Invoices",
      issue: "Error checking invoices without line items",
      count: -1,
      severity: "High",
      details: [(error as Error).message],
    });
  }
}

/**
 * Check payments without valid invoice_id (for AR payments)
 */
async function checkPaymentsWithoutInvoice(): Promise<void> {
  try {
    // Check AR payments (paymentType = 'RECEIVED') without invoice_id
    const arPaymentsWithoutInvoice = await db.execute(sql`
      SELECT id, invoiceId, paymentType
      FROM payments
      WHERE paymentType = 'RECEIVED' 
        AND invoiceId IS NOT NULL
        AND invoiceId NOT IN (SELECT id FROM invoices)
    `);

    const rows = Array.isArray(arPaymentsWithoutInvoice) && arPaymentsWithoutInvoice.length > 0 
      ? arPaymentsWithoutInvoice[0] 
      : arPaymentsWithoutInvoice;

    const count = Array.isArray(rows) ? rows.length : 0;

    results.push({
      category: "Payments",
      issue: "AR payments with invalid invoice_id",
      count,
      severity: count > 0 ? "High" : "Low",
      details:
        count > 0 && Array.isArray(rows)
          ? rows
              .slice(0, 10)
              .map(
                (p: { id: number; invoiceId: number }) =>
                  `Payment ID: ${p.id}, Invoice ID: ${p.invoiceId}`
              )
          : undefined,
    });
  } catch (error) {
    console.error("Error checking payments without invoice:", error);
    results.push({
      category: "Payments",
      issue: "Error checking payments without invoice",
      count: -1,
      severity: "High",
      details: [(error as Error).message],
    });
  }
}

/**
 * Check ledger entries without valid account_id
 */
async function checkLedgerEntriesWithoutAccount(): Promise<void> {
  try {
    const invalidEntries = await db.execute(sql`
      SELECT le.id, le.accountId
      FROM ledgerEntries le
      LEFT JOIN accounts a ON le.accountId = a.id
      WHERE a.id IS NULL
      LIMIT 100
    `);

    const rows = Array.isArray(invalidEntries) && invalidEntries.length > 0 
      ? invalidEntries[0] 
      : invalidEntries;

    const count = Array.isArray(rows) ? rows.length : 0;

    results.push({
      category: "Ledger Entries",
      issue: "Ledger entries with invalid account_id",
      count,
      severity: count > 0 ? "High" : "Low",
      details:
        count > 0 && Array.isArray(rows)
          ? rows
              .slice(0, 10)
              .map(
                (e: { id: number; accountId: number }) =>
                  `Entry ID: ${e.id}, Account ID: ${e.accountId}`
              )
          : undefined,
    });
  } catch (error) {
    console.error("Error checking ledger entries:", error);
    results.push({
      category: "Ledger Entries",
      issue: "Error checking ledger entries",
      count: -1,
      severity: "High",
      details: [(error as Error).message],
    });
  }
}

/**
 * Check orders without corresponding invoices (for SALE orders)
 */
async function checkOrdersWithoutInvoices(): Promise<void> {
  try {
    const saleOrdersWithoutInvoices = await db.execute(sql`
      SELECT o.id, o.orderNumber, o.invoiceId
      FROM orders o
      WHERE o.orderType = 'SALE'
        AND o.isDraft = false
        AND (o.invoiceId IS NULL OR o.invoiceId NOT IN (SELECT id FROM invoices))
      LIMIT 100
    `);

    const rows = Array.isArray(saleOrdersWithoutInvoices) && saleOrdersWithoutInvoices.length > 0 
      ? saleOrdersWithoutInvoices[0] 
      : saleOrdersWithoutInvoices;

    const count = Array.isArray(rows) ? rows.length : 0;

    results.push({
      category: "Orders",
      issue: "SALE orders without valid invoices",
      count,
      severity: count > 0 ? "High" : "Low",
      details:
        count > 0 && Array.isArray(rows)
          ? rows
              .slice(0, 10)
              .map(
                (o: { id: number; orderNumber: string }) =>
                  `Order ID: ${o.id}, Number: ${o.orderNumber}`
              )
          : undefined,
    });
  } catch (error) {
    console.error("Error checking orders without invoices:", error);
    results.push({
      category: "Orders",
      issue: "Error checking orders without invoices",
      count: -1,
      severity: "High",
      details: [(error as Error).message],
    });
  }
}

/**
 * Check client_activity without valid client_id
 */
async function checkClientActivityWithoutClient(): Promise<void> {
  try {
    const invalidActivity = await db
      .select({
        id: clientActivity.id,
        clientId: clientActivity.clientId,
      })
      .from(clientActivity)
      .leftJoin(clients, eq(clientActivity.clientId, clients.id))
      .where(isNull(clients.id));

    results.push({
      category: "Client Activity",
      issue: "Client activity records with invalid client_id",
      count: invalidActivity.length,
      severity: invalidActivity.length > 0 ? "Medium" : "Low",
      details:
        invalidActivity.length > 0
          ? invalidActivity
              .slice(0, 10)
              .map(
                (act) => `Activity ID: ${act.id}, Client ID: ${act.clientId}`
              )
          : undefined,
    });
  } catch (error) {
    console.error("Error checking client activity:", error);
    results.push({
      category: "Client Activity",
      issue: "Error checking client activity",
      count: -1,
      severity: "High",
      details: [(error as Error).message],
    });
  }
}

/**
 * Run all audit checks
 */
async function runAudit(): Promise<void> {
  console.log("🔍 Starting Referential Integrity Audit...\n");

  console.log("Checking orders without items...");
  await checkOrdersWithoutItems();

  console.log("Checking orphaned order items...");
  await checkOrphanedOrderItems();

  console.log("Checking order items with invalid batch...");
  await checkOrderItemsWithInvalidBatch();

  console.log("Checking inventory movements...");
  await checkInventoryMovementsWithoutBatch();

  console.log("Checking invoices without line items...");
  await checkInvoicesWithoutLineItems();

  console.log("Checking payments without invoices...");
  await checkPaymentsWithoutInvoice();

  console.log("Checking ledger entries...");
  await checkLedgerEntriesWithoutAccount();

  console.log("Checking orders without invoices...");
  await checkOrdersWithoutInvoices();

  console.log("Checking client activity...");
  await checkClientActivityWithoutClient();

  // Generate report
  console.log("\n" + "=".repeat(60));
  console.log("📊 AUDIT RESULTS");
  console.log("=".repeat(60) + "\n");

  const critical = results.filter((r) => r.severity === "Critical");
  const high = results.filter((r) => r.severity === "High");
  const medium = results.filter((r) => r.severity === "Medium");
  const low = results.filter((r) => r.severity === "Low");

  console.log(`🔴 Critical Issues: ${critical.length}`);
  console.log(`🟠 High Issues: ${high.length}`);
  console.log(`🟡 Medium Issues: ${medium.length}`);
  console.log(`⚪ Low Issues: ${low.length}\n`);

  const totalIssues = results.reduce((sum, r) => sum + (r.count > 0 ? r.count : 0), 0);
  console.log(`📈 Total Issues Found: ${totalIssues}\n`);

  // Display details
  for (const result of results) {
    if (result.count > 0) {
      const icon =
        result.severity === "Critical"
          ? "🔴"
          : result.severity === "High"
          ? "🟠"
          : result.severity === "Medium"
          ? "🟡"
          : "⚪";

      console.log(
        `${icon} ${result.category}: ${result.issue} - ${result.count} found`
      );
      if (result.details && result.details.length > 0) {
        console.log(`   Examples: ${result.details.slice(0, 3).join(", ")}`);
        if (result.details.length > 3) {
          console.log(`   ... and ${result.details.length - 3} more`);
        }
      }
      console.log("");
    }
  }

  // Summary
  console.log("=".repeat(60));
  if (totalIssues === 0) {
    console.log("✅ No referential integrity issues found!");
  } else {
    console.log(`⚠️  Found ${totalIssues} referential integrity issues`);
    console.log("   Run augmentation scripts to fix these issues.");
  }
  console.log("=".repeat(60));
}

// Main execution
runAudit()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Audit failed:", error);
    process.exit(1);
  });
