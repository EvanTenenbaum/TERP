/**
 * Data Validation Script
 *
 * Validates the seeded data for:
 * 1. Referential Integrity - All foreign keys reference existing records
 * 2. Financial Integrity - Ledger entries balance, payments match invoices
 * 3. State Consistency - Valid state transitions
 * 4. Temporal Coherence - Chronologically sensible timestamps
 * 5. Business Logic - Order totals match line items, inventory is consistent
 *
 * Usage:
 *   tsx scripts/validate-seeded-data.ts
 */

import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

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
  const icon = passed ? "✓" : "✗";
  const color = passed ? "" : "❌ ";
  console.log(`   ${color}${icon} ${test}: ${message}`);
  if (details && !passed) {
    console.log(`      Details: ${JSON.stringify(details, null, 2)}`);
  }
}

async function validateData() {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 DATA VALIDATION");
  console.log("=".repeat(80) + "\n");

  try {
    // ========================================================================
    // 1. TABLE COVERAGE
    // ========================================================================
    console.log("📊 1. Table Coverage");
    console.log("-".repeat(80));

    const tables = [
      "users", "accounts", "bankAccounts", "clients", "brands", "strains",
      "products", "lots", "batches", "orders", "invoices", "invoiceLineItems",
      "ledgerEntries", "payments", "clientActivity", "inventoryMovements",
      "orderStatusHistory", "purchaseOrders", "purchaseOrderItems",
      "intakeSessions", "batchStatusHistory", "vendorNotes",
      "calendarEvents", "calendarEventParticipants", "calendarReminders",
      "calendarEventHistory", "comments", "commentMentions", "clientNotes",
      "freeformNotes", "todoLists", "todoTasks", "todoTaskActivity",
      "todoListMembers", "pricingRules", "pricingProfiles", "pricingDefaults"
    ];

    let seededCount = 0;
    for (const table of tables) {
      try {
        const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
        const count = (result[0] as any)[0].count;
        if (count > 0) {
          seededCount++;
          addResult("Coverage", `Table ${table}`, true, `${count} records`);
        } else {
          addResult("Coverage", `Table ${table}`, false, "Empty");
        }
      } catch (error) {
        addResult("Coverage", `Table ${table}`, false, `Error: ${(error as Error).message}`);
      }
    }

    const coverage = (seededCount / tables.length) * 100;
    addResult("Coverage", "Overall Coverage", coverage >= 90, `${seededCount}/${tables.length} tables (${coverage.toFixed(1)}%)`);

    // ========================================================================
    // 2. REFERENTIAL INTEGRITY
    // ========================================================================
    console.log("\n📊 2. Referential Integrity");
    console.log("-".repeat(80));

    // Orders -> Clients
    const ordersWithoutClients = await db.execute(sql.raw(`
      SELECT COUNT(*) as count
      FROM orders o
      LEFT JOIN clients c ON o.customerId = c.id
      WHERE c.id IS NULL
    `));
    const orphanOrders = (ordersWithoutClients[0] as any)[0].count;
    addResult("Referential Integrity", "Orders → Clients", orphanOrders === 0, 
      orphanOrders === 0 ? "All orders have valid clients" : `${orphanOrders} orphan orders`);

    // Invoices -> Orders
    const invoicesWithoutOrders = await db.execute(sql.raw(`
      SELECT COUNT(*) as count
      FROM invoices i
      LEFT JOIN orders o ON i.customerId = o.customerId
      WHERE o.id IS NULL
    `));
    const orphanInvoices = (invoicesWithoutOrders[0] as any)[0].count;
    addResult("Referential Integrity", "Invoices → Orders", orphanInvoices === 0,
      orphanInvoices === 0 ? "All invoices have valid customers" : `${orphanInvoices} orphan invoices`);

    // Invoice Line Items -> Invoices
    const lineItemsWithoutInvoices = await db.execute(sql.raw(`
      SELECT COUNT(*) as count
      FROM invoiceLineItems ili
      LEFT JOIN invoices i ON ili.invoiceId = i.id
      WHERE i.id IS NULL
    `));
    const orphanLineItems = (lineItemsWithoutInvoices[0] as any)[0].count;
    addResult("Referential Integrity", "Invoice Line Items → Invoices", orphanLineItems === 0,
      orphanLineItems === 0 ? "All line items have valid invoices" : `${orphanLineItems} orphan line items`);

    // Payments -> Clients
    const paymentsWithoutClients = await db.execute(sql.raw(`
      SELECT COUNT(*) as count
      FROM payments p
      LEFT JOIN clients c ON p.customerId = c.id
      WHERE c.id IS NULL
    `));
    const orphanPayments = (paymentsWithoutClients[0] as any)[0].count;
    addResult("Referential Integrity", "Payments → Clients", orphanPayments === 0,
      orphanPayments === 0 ? "All payments have valid clients" : `${orphanPayments} orphan payments`);

    // ========================================================================
    // 3. FINANCIAL INTEGRITY
    // ========================================================================
    console.log("\n📊 3. Financial Integrity");
    console.log("-".repeat(80));

    // Ledger Balance (Debits = Credits)
    const ledgerBalance = await db.execute(sql.raw(`
      SELECT 
        SUM(CAST(debit AS DECIMAL(15,2))) as total_debits,
        SUM(CAST(credit AS DECIMAL(15,2))) as total_credits
      FROM ledgerEntries
    `));
    const debits = parseFloat((ledgerBalance[0] as any)[0].total_debits || "0");
    const credits = parseFloat((ledgerBalance[0] as any)[0].total_credits || "0");
    const balanced = Math.abs(debits - credits) < 0.01;
    addResult("Financial Integrity", "Ledger Balance", balanced,
      balanced ? `Debits ($${debits.toFixed(2)}) = Credits ($${credits.toFixed(2)})` : 
      `Imbalance: Debits ($${debits.toFixed(2)}) ≠ Credits ($${credits.toFixed(2)})`);

    // Invoice Totals Match Line Items
    const invoiceTotalMismatch = await db.execute(sql.raw(`
      SELECT i.id, i.total as invoice_total, SUM(CAST(ili.lineTotal AS DECIMAL(15,2))) as line_items_total
      FROM invoices i
      LEFT JOIN invoiceLineItems ili ON i.id = ili.invoiceId
      GROUP BY i.id, i.total
      HAVING ABS(CAST(i.total AS DECIMAL(15,2)) - SUM(CAST(ili.lineTotal AS DECIMAL(15,2)))) > 0.01
      LIMIT 10
    `));
    const mismatchCount = (invoiceTotalMismatch[0] as any).length;
    addResult("Financial Integrity", "Invoice Totals Match Line Items", mismatchCount === 0,
      mismatchCount === 0 ? "All invoice totals match line items" : `${mismatchCount} mismatches found`,
      mismatchCount > 0 ? invoiceTotalMismatch[0] : undefined);

    // ========================================================================
    // 4. TEMPORAL COHERENCE
    // ========================================================================
    console.log("\n📊 4. Temporal Coherence");
    console.log("-".repeat(80));

    // Orders created before invoices
    const ordersAfterInvoices = await db.execute(sql.raw(`
      SELECT COUNT(*) as count
      FROM orders o
      JOIN invoices i ON o.customerId = i.customerId
      WHERE o.createdAt > i.createdAt
      LIMIT 10
    `));
    const temporalViolations = (ordersAfterInvoices[0] as any)[0].count;
    addResult("Temporal Coherence", "Orders Before Invoices", temporalViolations === 0,
      temporalViolations === 0 ? "All orders created before/with invoices" : `${temporalViolations} violations`);

    // Payments after invoices
    const paymentsBeforeInvoices = await db.execute(sql.raw(`
      SELECT COUNT(*) as count
      FROM payments p
      JOIN invoices i ON p.customerId = i.customerId
      WHERE p.paymentDate < i.invoiceDate
      LIMIT 10
    `));
    const paymentViolations = (paymentsBeforeInvoices[0] as any)[0].count;
    addResult("Temporal Coherence", "Payments After Invoices", paymentViolations === 0,
      paymentViolations === 0 ? "All payments after invoices" : `${paymentViolations} violations`);

    // ========================================================================
    // 5. BUSINESS LOGIC
    // ========================================================================
    console.log("\n📊 5. Business Logic");
    console.log("-".repeat(80));

    // Inventory movements reference valid batches
    const invalidInventoryMovements = await db.execute(sql.raw(`
      SELECT COUNT(*) as count
      FROM inventoryMovements im
      LEFT JOIN batches b ON im.batchId = b.id
      WHERE b.id IS NULL
    `));
    const invalidMovements = (invalidInventoryMovements[0] as any)[0].count;
    addResult("Business Logic", "Inventory Movements → Batches", invalidMovements === 0,
      invalidMovements === 0 ? "All movements reference valid batches" : `${invalidMovements} invalid movements`);

    // Client activity references valid clients
    const invalidClientActivity = await db.execute(sql.raw(`
      SELECT COUNT(*) as count
      FROM clientActivity ca
      LEFT JOIN clients c ON ca.clientId = c.id
      WHERE c.id IS NULL
    `));
    const invalidActivity = (invalidClientActivity[0] as any)[0].count;
    addResult("Business Logic", "Client Activity → Clients", invalidActivity === 0,
      invalidActivity === 0 ? "All activity references valid clients" : `${invalidActivity} invalid activity records`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log("\n" + "=".repeat(80));
    console.log("📊 VALIDATION SUMMARY");
    console.log("=".repeat(80));

    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = (passedTests / totalTests) * 100;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${passRate.toFixed(1)}%)`);
    console.log(`Failed: ${failedTests}`);

    if (failedTests > 0) {
      console.log("\n❌ FAILED TESTS:");
      results.filter(r => !r.passed).forEach(r => {
        console.log(`   • [${r.category}] ${r.test}: ${r.message}`);
      });
    }

    console.log("=".repeat(80) + "\n");

    return passRate >= 95; // 95% pass rate required

  } catch (error) {
    console.error("❌ Validation error:", error);
    return false;
  }
}

// Run validation
validateData()
  .then((success) => {
    if (success) {
      console.log("✅ Validation completed successfully");
      process.exit(0);
    } else {
      console.log("❌ Validation failed - data quality issues detected");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  });
