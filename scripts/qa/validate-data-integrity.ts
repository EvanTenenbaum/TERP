/**
 * WF-004: Data Integrity Verification
 * 
 * Validates data integrity across the system:
 * 1. FK relationship validation
 * 2. Financial calculation accuracy
 * 3. Audit trail completeness
 * 
 * Run: npx tsx scripts/qa/validate-data-integrity.ts
 */

import { getDb } from "../../server/db";
import { 
  orders, clients, batches, invoices, 
  ledgerEntries, users, products, lots 
} from "../../drizzle/schema";
import { eq, sql, isNull, and, not } from "drizzle-orm";

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

async function validateDataIntegrity() {
  console.log("========================================");
  console.log("WF-004: Data Integrity Verification");
  console.log("========================================\n");

  const db = await getDb();
  if (!db) {
    log({ step: "Database", status: "FAIL", message: "Could not connect to database" });
    return;
  }

  // ==========================================
  // FK RELATIONSHIP VALIDATION
  // ==========================================
  console.log("\n=== FK Relationship Validation ===\n");

  // Check orders → clients FK
  console.log("--- Orders → Clients ---");
  const orphanedOrders = await db
    .select({ orderId: orders.id, clientId: orders.clientId })
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .where(isNull(clients.id))
    .limit(10);

  if (orphanedOrders.length > 0) {
    log({
      step: "Orders → Clients FK",
      status: "FAIL",
      message: `Found ${orphanedOrders.length} orders with invalid client references`,
      details: { orphanedOrders }
    });
  } else {
    log({
      step: "Orders → Clients FK",
      status: "PASS",
      message: "All orders have valid client references"
    });
  }

  // Check batches → products FK
  console.log("--- Batches → Products ---");
  const orphanedBatches = await db
    .select({ batchId: batches.id, productId: batches.productId })
    .from(batches)
    .leftJoin(products, eq(batches.productId, products.id))
    .where(isNull(products.id))
    .limit(10);

  if (orphanedBatches.length > 0) {
    log({
      step: "Batches → Products FK",
      status: "FAIL",
      message: `Found ${orphanedBatches.length} batches with invalid product references`,
      details: { orphanedBatches }
    });
  } else {
    log({
      step: "Batches → Products FK",
      status: "PASS",
      message: "All batches have valid product references"
    });
  }

  // Check batches → lots FK
  console.log("--- Batches → Lots ---");
  const batchesWithoutLots = await db
    .select({ batchId: batches.id, lotId: batches.lotId })
    .from(batches)
    .leftJoin(lots, eq(batches.lotId, lots.id))
    .where(isNull(lots.id))
    .limit(10);

  if (batchesWithoutLots.length > 0) {
    log({
      step: "Batches → Lots FK",
      status: "FAIL",
      message: `Found ${batchesWithoutLots.length} batches with invalid lot references`,
      details: { batchesWithoutLots }
    });
  } else {
    log({
      step: "Batches → Lots FK",
      status: "PASS",
      message: "All batches have valid lot references"
    });
  }

  // Check invoices → clients FK
  console.log("--- Invoices → Clients ---");
  const orphanedInvoices = await db
    .select({ invoiceId: invoices.id, customerId: invoices.customerId })
    .from(invoices)
    .leftJoin(clients, eq(invoices.customerId, clients.id))
    .where(isNull(clients.id))
    .limit(10);

  if (orphanedInvoices.length > 0) {
    log({
      step: "Invoices → Clients FK",
      status: "FAIL",
      message: `Found ${orphanedInvoices.length} invoices with invalid customer references`,
      details: { orphanedInvoices }
    });
  } else {
    log({
      step: "Invoices → Clients FK",
      status: "PASS",
      message: "All invoices have valid customer references"
    });
  }

  // ==========================================
  // FINANCIAL CALCULATION ACCURACY
  // ==========================================
  console.log("\n=== Financial Calculation Accuracy ===\n");

  // Check order totals match item sums
  console.log("--- Order Total Accuracy ---");
  const orderSample = await db
    .select()
    .from(orders)
    .limit(20);

  let orderMismatches = 0;
  const mismatchDetails: Array<{ orderId: number; stored: number; calculated: number }> = [];

  for (const order of orderSample) {
    const items = typeof order.items === 'string' 
      ? JSON.parse(order.items) 
      : order.items;
    
    if (Array.isArray(items)) {
      const calculatedTotal = items.reduce((sum: number, item: any) => {
        return sum + (item.lineTotal || item.quantity * item.unitPrice || 0);
      }, 0);
      
      const storedTotal = parseFloat(order.total || "0");
      const difference = Math.abs(storedTotal - calculatedTotal);
      
      // Allow for small floating point differences (< $0.01)
      if (difference > 0.01) {
        orderMismatches++;
        mismatchDetails.push({
          orderId: order.id,
          stored: storedTotal,
          calculated: calculatedTotal
        });
      }
    }
  }

  if (orderMismatches > 0) {
    log({
      step: "Order Totals",
      status: "WARN",
      message: `Found ${orderMismatches} orders with total mismatches`,
      details: { mismatchDetails: mismatchDetails.slice(0, 5) }
    });
  } else {
    log({
      step: "Order Totals",
      status: "PASS",
      message: `Verified ${orderSample.length} order totals match item sums`
    });
  }

  // Check invoice amounts
  console.log("--- Invoice Amount Accuracy ---");
  const invoiceSample = await db
    .select()
    .from(invoices)
    .limit(20);

  let invoiceMismatches = 0;
  for (const invoice of invoiceSample) {
    const subtotal = parseFloat(invoice.subtotal || "0");
    const tax = parseFloat(invoice.taxAmount || "0");
    const discount = parseFloat(invoice.discountAmount || "0");
    const total = parseFloat(invoice.totalAmount || "0");
    
    const calculatedTotal = subtotal + tax - discount;
    const difference = Math.abs(total - calculatedTotal);
    
    if (difference > 0.01) {
      invoiceMismatches++;
    }
  }

  if (invoiceMismatches > 0) {
    log({
      step: "Invoice Totals",
      status: "WARN",
      message: `Found ${invoiceMismatches} invoices with calculation mismatches`
    });
  } else {
    log({
      step: "Invoice Totals",
      status: "PASS",
      message: `Verified ${invoiceSample.length} invoice calculations`
    });
  }

  // Check ledger balance
  console.log("--- Ledger Balance ---");
  const ledgerTotals = await db
    .select({
      totalDebits: sql<string>`SUM(CAST(${ledgerEntries.debit} AS DECIMAL(15,2)))`,
      totalCredits: sql<string>`SUM(CAST(${ledgerEntries.credit} AS DECIMAL(15,2)))`
    })
    .from(ledgerEntries);

  if (ledgerTotals.length > 0) {
    const debits = parseFloat(ledgerTotals[0].totalDebits || "0");
    const credits = parseFloat(ledgerTotals[0].totalCredits || "0");
    const difference = Math.abs(debits - credits);

    if (difference > 0.01) {
      log({
        step: "Ledger Balance",
        status: "WARN",
        message: `Ledger is out of balance by $${difference.toFixed(2)}`,
        details: { totalDebits: debits, totalCredits: credits, difference }
      });
    } else {
      log({
        step: "Ledger Balance",
        status: "PASS",
        message: "Ledger debits and credits are balanced",
        details: { totalDebits: debits, totalCredits: credits }
      });
    }
  } else {
    log({
      step: "Ledger Balance",
      status: "WARN",
      message: "No ledger entries found"
    });
  }

  // ==========================================
  // AUDIT TRAIL COMPLETENESS
  // ==========================================
  console.log("\n=== Audit Trail Completeness ===\n");

  // Check orders have createdBy
  console.log("--- Order Attribution ---");
  const ordersWithoutCreator = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(isNull(orders.createdBy));

  const missingCreatorCount = Number(ordersWithoutCreator[0]?.count || 0);
  if (missingCreatorCount > 0) {
    log({
      step: "Order Attribution",
      status: "WARN",
      message: `Found ${missingCreatorCount} orders without createdBy attribution`
    });
  } else {
    log({
      step: "Order Attribution",
      status: "PASS",
      message: "All orders have creator attribution"
    });
  }

  // Check invoices have createdBy
  console.log("--- Invoice Attribution ---");
  const invoicesWithoutCreator = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(invoices)
    .where(isNull(invoices.createdBy));

  const missingInvoiceCreatorCount = Number(invoicesWithoutCreator[0]?.count || 0);
  if (missingInvoiceCreatorCount > 0) {
    log({
      step: "Invoice Attribution",
      status: "WARN",
      message: `Found ${missingInvoiceCreatorCount} invoices without createdBy attribution`
    });
  } else {
    log({
      step: "Invoice Attribution",
      status: "PASS",
      message: "All invoices have creator attribution"
    });
  }

  // Check for timestamp consistency
  console.log("--- Timestamp Consistency ---");
  const ordersWithBadTimestamps = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(sql`${orders.updatedAt} < ${orders.createdAt}`);

  const badTimestampCount = Number(ordersWithBadTimestamps[0]?.count || 0);
  if (badTimestampCount > 0) {
    log({
      step: "Timestamp Consistency",
      status: "WARN",
      message: `Found ${badTimestampCount} orders where updatedAt < createdAt`
    });
  } else {
    log({
      step: "Timestamp Consistency",
      status: "PASS",
      message: "All order timestamps are consistent"
    });
  }

  // ==========================================
  // SUMMARY
  // ==========================================
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
    console.log("\n❌ DATA INTEGRITY VALIDATION FAILED");
    process.exit(1);
  } else if (warned > 0) {
    console.log("\n⚠️  DATA INTEGRITY VALIDATION PASSED WITH WARNINGS");
    process.exit(0);
  } else {
    console.log("\n✅ DATA INTEGRITY VALIDATION PASSED");
    process.exit(0);
  }
}

validateDataIntegrity().catch(console.error);
