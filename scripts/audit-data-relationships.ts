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

/**
 * Retry helper for database queries
 */
async function retryQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("ETIMEDOUT") && i < maxRetries - 1) {
        console.log(`  ⚠️  Retry ${i + 1}/${maxRetries} after ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

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
    const result = await retryQuery(async () => {
      return await db.execute(sql`
        SELECT o.id
        FROM orders o
        LEFT JOIN order_line_items oli ON o.id = oli.order_id
        WHERE o.is_draft = 0 AND oli.id IS NULL
        LIMIT 100
      `);
    });

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const ordersWithoutItems = (rows as Array<{ id: number }>) || [];

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
    const result = await retryQuery(async () => {
      return await db.execute(sql`
        SELECT oli.id, oli.order_id as orderId
        FROM order_line_items oli
        LEFT JOIN orders o ON oli.order_id = o.id
        WHERE o.id IS NULL
        LIMIT 100
      `);
    });

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const orphanedItems = (rows as Array<{ id: number; orderId: number }>) || [];

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
    const result = await retryQuery(async () => {
      return await db.execute(sql`
        SELECT oli.id, oli.batch_id as batchId
        FROM order_line_items oli
        LEFT JOIN batches b ON oli.batch_id = b.id
        WHERE b.id IS NULL
        LIMIT 100
      `);
    });

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const invalidBatchItems = (rows as Array<{ id: number; batchId: number }>) || [];

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
    const result = await retryQuery(async () => {
      return await db.execute(sql`
        SELECT im.id, im.batchId
        FROM inventoryMovements im
        LEFT JOIN batches b ON im.batchId = b.id
        WHERE b.id IS NULL
        LIMIT 100
      `);
    });

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const invalidMovements = (rows as Array<{ id: number; batchId: number | null }>) || [];

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
    const result = await retryQuery(async () => {
      return await db.execute(sql`
        SELECT i.id
        FROM invoices i
        LEFT JOIN invoiceLineItems ili ON i.id = ili.invoiceId
        WHERE ili.id IS NULL
        LIMIT 100
      `);
    });

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const invoicesWithoutItems = (rows as Array<{ id: number }>) || [];

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
    const result = await retryQuery(async () => {
      return await db.execute(sql`
        SELECT id, invoiceId, paymentType
        FROM payments
        WHERE paymentType = 'RECEIVED' 
          AND invoiceId IS NOT NULL
          AND invoiceId NOT IN (SELECT id FROM invoices)
        LIMIT 100
      `);
    });

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const payments = (rows as Array<{ id: number; invoiceId: number }>) || [];

    results.push({
      category: "Payments",
      issue: "AR payments with invalid invoice_id",
      count: payments.length,
      severity: payments.length > 0 ? "High" : "Low",
      details:
        payments.length > 0
          ? payments
              .slice(0, 10)
              .map(
                (p) => `Payment ID: ${p.id}, Invoice ID: ${p.invoiceId}`
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
    const result = await retryQuery(async () => {
      return await db.execute(sql`
        SELECT le.id, le.accountId
        FROM ledgerEntries le
        LEFT JOIN accounts a ON le.accountId = a.id
        WHERE a.id IS NULL
        LIMIT 100
      `);
    });

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const invalidEntries = (rows as Array<{ id: number; accountId: number }>) || [];

    results.push({
      category: "Ledger Entries",
      issue: "Ledger entries with invalid account_id",
      count: invalidEntries.length,
      severity: invalidEntries.length > 0 ? "High" : "Low",
      details:
        invalidEntries.length > 0
          ? invalidEntries
              .slice(0, 10)
              .map(
                (e) => `Entry ID: ${e.id}, Account ID: ${e.accountId}`
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
    const result = await retryQuery(async () => {
      return await db.execute(sql`
        SELECT o.id, o.order_number as orderNumber, o.invoice_id as invoiceId
        FROM orders o
        WHERE o.orderType = 'SALE'
          AND o.is_draft = 0
          AND (o.invoice_id IS NULL OR o.invoice_id NOT IN (SELECT id FROM invoices))
        LIMIT 100
      `);
    });

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const saleOrdersWithoutInvoices = (rows as Array<{ id: number; orderNumber: string }>) || [];

    results.push({
      category: "Orders",
      issue: "SALE orders without valid invoices",
      count: saleOrdersWithoutInvoices.length,
      severity: saleOrdersWithoutInvoices.length > 0 ? "High" : "Low",
      details:
        saleOrdersWithoutInvoices.length > 0
          ? saleOrdersWithoutInvoices
              .slice(0, 10)
              .map(
                (o) => `Order ID: ${o.id}, Number: ${o.orderNumber}`
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
    const result = await retryQuery(async () => {
      return await db.execute(sql`
        SELECT ca.id, ca.client_id as clientId
        FROM client_activity ca
        LEFT JOIN clients c ON ca.client_id = c.id
        WHERE c.id IS NULL
        LIMIT 100
      `);
    });

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const invalidActivity = (rows as Array<{ id: number; clientId: number }>) || [];

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
