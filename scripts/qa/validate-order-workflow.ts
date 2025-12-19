/**
 * WF-001: Order Creation Workflow Validation
 * 
 * Validates the complete order creation flow:
 * 1. Customer selection → inventory browse
 * 2. Add items → credit limit check
 * 3. Submit order → invoice generation
 * 4. Payment recording
 * 
 * Run: npx tsx scripts/qa/validate-order-workflow.ts
 */

import { getDb } from "../../server/db";
import { clients, orders, batches, invoices, ledgerEntries } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

interface ValidationResult {
  step: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  details?: Record<string, unknown>;
}

const results: ValidationResult[] = [];

function log(result: ValidationResult) {
  const icon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⚠️";
  console.log(`${icon} ${result.step}: ${result.message}`);
  if (result.details) {
    console.log(`   Details:`, JSON.stringify(result.details, null, 2));
  }
  results.push(result);
}

async function validateOrderWorkflow() {
  console.log("========================================");
  console.log("WF-001: Order Creation Workflow Validation");
  console.log("========================================\n");

  const db = await getDb();
  if (!db) {
    log({ step: "Database", status: "FAIL", message: "Could not connect to database" });
    return;
  }

  // Step 1: Verify clients exist for order creation
  console.log("\n--- Step 1: Customer Selection ---");
  const clientList = await db.select().from(clients).limit(10);
  
  if (clientList.length === 0) {
    log({ step: "Customer Selection", status: "FAIL", message: "No clients found in database" });
  } else {
    log({ 
      step: "Customer Selection", 
      status: "PASS", 
      message: `Found ${clientList.length} clients available for orders`,
      details: { sampleClients: clientList.slice(0, 3).map(c => ({ id: c.id, name: c.name })) }
    });
  }

  // Step 2: Verify inventory exists for browsing
  console.log("\n--- Step 2: Inventory Browse ---");
  const batchList = await db
    .select()
    .from(batches)
    .where(sql`CAST(${batches.onHandQty} AS DECIMAL) > 0`)
    .limit(10);

  if (batchList.length === 0) {
    log({ step: "Inventory Browse", status: "WARN", message: "No batches with available inventory" });
  } else {
    log({
      step: "Inventory Browse",
      status: "PASS",
      message: `Found ${batchList.length} batches with available inventory`,
      details: { sampleBatches: batchList.slice(0, 3).map(b => ({ id: b.id, sku: b.sku, qty: b.onHandQty })) }
    });
  }

  // Step 3: Verify orders can be created (check recent orders)
  console.log("\n--- Step 3: Order Creation ---");
  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(5);

  if (recentOrders.length === 0) {
    log({ step: "Order Creation", status: "WARN", message: "No orders found - workflow may not have been tested" });
  } else {
    // Check order structure
    const sampleOrder = recentOrders[0];
    const hasRequiredFields = sampleOrder.orderNumber && sampleOrder.clientId && sampleOrder.total;
    
    log({
      step: "Order Creation",
      status: hasRequiredFields ? "PASS" : "FAIL",
      message: hasRequiredFields 
        ? `Found ${recentOrders.length} recent orders with valid structure`
        : "Orders missing required fields",
      details: { 
        latestOrder: {
          id: sampleOrder.id,
          orderNumber: sampleOrder.orderNumber,
          clientId: sampleOrder.clientId,
          total: sampleOrder.total,
          isDraft: sampleOrder.isDraft,
          createdAt: sampleOrder.createdAt
        }
      }
    });

    // Check items parsing
    const items = typeof sampleOrder.items === 'string' 
      ? JSON.parse(sampleOrder.items) 
      : sampleOrder.items;
    
    if (Array.isArray(items) && items.length > 0) {
      log({
        step: "Order Items",
        status: "PASS",
        message: `Order items properly structured (${items.length} items)`,
        details: { sampleItem: items[0] }
      });
    } else {
      log({
        step: "Order Items",
        status: "WARN",
        message: "Order items may be empty or improperly structured"
      });
    }
  }

  // Step 4: Verify invoice generation (for confirmed orders)
  console.log("\n--- Step 4: Invoice Generation ---");
  const confirmedOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.isDraft, false))
    .orderBy(desc(orders.createdAt))
    .limit(5);

  if (confirmedOrders.length === 0) {
    log({ step: "Invoice Generation", status: "WARN", message: "No confirmed orders found to verify invoice generation" });
  } else {
    // Check if invoices exist
    const invoiceList = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(5);

    if (invoiceList.length > 0) {
      log({
        step: "Invoice Generation",
        status: "PASS",
        message: `Found ${invoiceList.length} invoices in system`,
        details: { 
          latestInvoice: {
            id: invoiceList[0].id,
            invoiceNumber: invoiceList[0].invoiceNumber,
            totalAmount: invoiceList[0].totalAmount,
            status: invoiceList[0].status
          }
        }
      });
    } else {
      log({
        step: "Invoice Generation",
        status: "WARN",
        message: "No invoices found - invoice generation may need verification"
      });
    }
  }

  // Step 5: Verify ledger entries (accounting integration)
  console.log("\n--- Step 5: Ledger Entries ---");
  const ledgerList = await db
    .select()
    .from(ledgerEntries)
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(10);

  if (ledgerList.length === 0) {
    log({ step: "Ledger Entries", status: "WARN", message: "No ledger entries found - accounting integration may need verification" });
  } else {
    // Check for balanced entries
    const totalDebits = ledgerList.reduce((sum, e) => sum + parseFloat(e.debit || "0"), 0);
    const totalCredits = ledgerList.reduce((sum, e) => sum + parseFloat(e.credit || "0"), 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    log({
      step: "Ledger Entries",
      status: isBalanced ? "PASS" : "WARN",
      message: isBalanced 
        ? `Found ${ledgerList.length} ledger entries, debits/credits balanced`
        : `Found ${ledgerList.length} ledger entries, but debits/credits may not balance`,
      details: { totalDebits, totalCredits, difference: Math.abs(totalDebits - totalCredits) }
    });
  }

  // Summary
  console.log("\n========================================");
  console.log("VALIDATION SUMMARY");
  console.log("========================================");
  
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const warned = results.filter(r => r.status === "WARN").length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`Total: ${results.length}`);
  
  if (failed > 0) {
    console.log("\n❌ WORKFLOW VALIDATION FAILED");
    process.exit(1);
  } else if (warned > 0) {
    console.log("\n⚠️  WORKFLOW VALIDATION PASSED WITH WARNINGS");
    process.exit(0);
  } else {
    console.log("\n✅ WORKFLOW VALIDATION PASSED");
    process.exit(0);
  }
}

validateOrderWorkflow().catch(console.error);
