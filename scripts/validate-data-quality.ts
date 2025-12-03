/**
 * Data Quality Validation Test Suite
 * 
 * Validates that all relationships are correct and data quality is maintained.
 * Part of DATA-002-AUGMENT: Augment Seeded Data for Realistic Relationships
 * 
 * Usage: pnpm tsx scripts/validate-data-quality.ts
 */

import { config } from "dotenv";
config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

interface ValidationResult {
  test: string;
  passed: boolean;
  message: string;
  count?: number;
}

const results: ValidationResult[] = [];

/**
 * Test 1: All orders have at least one order_item
 */
async function testOrdersHaveItems(): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM orders o
      LEFT JOIN order_line_items oli ON o.id = oli.order_id
      WHERE o.is_draft = 0 AND oli.id IS NULL
    `);

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const count = Array.isArray(rows) && rows.length > 0 ? (rows[0] as { count: number }).count : 0;

    results.push({
      test: "All orders have at least one order_item",
      passed: count === 0,
      message: count === 0 ? "✅ All orders have items" : `❌ ${count} orders without items`,
      count,
    });
  } catch (error) {
    results.push({
      test: "All orders have at least one order_item",
      passed: false,
      message: `❌ Error: ${(error as Error).message}`,
    });
  }
}

/**
 * Test 2: All order_items have valid product_id and order_id
 */
async function testOrderItemsValid(): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM order_line_items oli
      LEFT JOIN orders o ON oli.order_id = o.id
      LEFT JOIN batches b ON oli.batch_id = b.id
      WHERE o.id IS NULL OR b.id IS NULL
    `);

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const count = Array.isArray(rows) && rows.length > 0 ? (rows[0] as { count: number }).count : 0;

    results.push({
      test: "All order_items have valid order_id and batch_id",
      passed: count === 0,
      message: count === 0 ? "✅ All order items are valid" : `❌ ${count} invalid order items`,
      count,
    });
  } catch (error) {
    results.push({
      test: "All order_items have valid order_id and batch_id",
      passed: false,
      message: `❌ Error: ${(error as Error).message}`,
    });
  }
}

/**
 * Test 3: All inventory movements link to valid batches
 */
async function testInventoryMovementsValid(): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM inventoryMovements im
      LEFT JOIN batches b ON im.batchId = b.id
      WHERE b.id IS NULL
    `);

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const count = Array.isArray(rows) && rows.length > 0 ? (rows[0] as { count: number }).count : 0;

    results.push({
      test: "All inventory movements link to valid batches",
      passed: count === 0,
      message: count === 0 ? "✅ All movements are valid" : `❌ ${count} invalid movements`,
      count,
    });
  } catch (error) {
    results.push({
      test: "All inventory movements link to valid batches",
      passed: false,
      message: `❌ Error: ${(error as Error).message}`,
    });
  }
}

/**
 * Test 4: All invoices have line items
 */
async function testInvoicesHaveItems(): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM invoices i
      LEFT JOIN invoiceLineItems ili ON i.id = ili.invoiceId
      WHERE ili.id IS NULL
    `);

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const count = Array.isArray(rows) && rows.length > 0 ? (rows[0] as { count: number }).count : 0;

    results.push({
      test: "All invoices have line items",
      passed: count === 0,
      message: count === 0 ? "✅ All invoices have items" : `❌ ${count} invoices without items`,
      count,
    });
  } catch (error) {
    results.push({
      test: "All invoices have line items",
      passed: false,
      message: `❌ Error: ${(error as Error).message}`,
    });
  }
}

/**
 * Test 5: All payments link to valid invoices (for AR payments)
 */
async function testPaymentsValid(): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM payments p
      WHERE p.paymentType = 'RECEIVED'
        AND p.invoiceId IS NOT NULL
        AND p.invoiceId NOT IN (SELECT id FROM invoices)
    `);

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const count = Array.isArray(rows) && rows.length > 0 ? (rows[0] as { count: number }).count : 0;

    results.push({
      test: "All AR payments link to valid invoices",
      passed: count === 0,
      message: count === 0 ? "✅ All payments are valid" : `❌ ${count} invalid payments`,
      count,
    });
  } catch (error) {
    results.push({
      test: "All AR payments link to valid invoices",
      passed: false,
      message: `❌ Error: ${(error as Error).message}`,
    });
  }
}

/**
 * Test 6: Order totals match sum of line items
 */
async function testOrderTotalsMatch(): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM orders o
      INNER JOIN (
        SELECT order_id, SUM(line_total) as calculated_total
        FROM order_line_items
        GROUP BY order_id
      ) oli ON o.id = oli.order_id
      WHERE ABS(o.total - oli.calculated_total) > 0.01
    `);

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const count = Array.isArray(rows) && rows.length > 0 ? (rows[0] as { count: number }).count : 0;

    results.push({
      test: "Order totals match sum of line items",
      passed: count === 0,
      message: count === 0 ? "✅ All order totals match" : `❌ ${count} orders with mismatched totals`,
      count,
    });
  } catch (error) {
    results.push({
      test: "Order totals match sum of line items",
      passed: false,
      message: `❌ Error: ${(error as Error).message}`,
    });
  }
}

/**
 * Test 7: Dates are chronologically correct
 */
async function testTemporalCoherence(): Promise<void> {
  try {
    // Check order → invoice → payment sequence
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM orders o
      INNER JOIN invoices i ON o.invoiceId = i.id
      INNER JOIN payments p ON i.id = p.invoiceId
      WHERE o.created_at > i.invoiceDate
         OR i.invoiceDate > p.paymentDate
    `);

    const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const count = Array.isArray(rows) && rows.length > 0 ? (rows[0] as { count: number }).count : 0;

    results.push({
      test: "Dates are chronologically correct",
      passed: count === 0,
      message: count === 0 ? "✅ All dates are coherent" : `❌ ${count} date sequence issues`,
      count,
    });
  } catch (error) {
    results.push({
      test: "Dates are chronologically correct",
      passed: false,
      message: `❌ Error: ${(error as Error).message}`,
    });
  }
}

/**
 * Run all validation tests
 */
async function runValidation(): Promise<void> {
  console.log("🔍 Running Data Quality Validation Tests...\n");

  await testOrdersHaveItems();
  await testOrderItemsValid();
  await testInventoryMovementsValid();
  await testInvoicesHaveItems();
  await testPaymentsValid();
  await testOrderTotalsMatch();
  await testTemporalCoherence();

  // Display results
  console.log("=".repeat(60));
  console.log("📊 VALIDATION RESULTS");
  console.log("=".repeat(60) + "\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const result of results) {
    console.log(`${result.message}`);
  }

  console.log("\n" + "=".repeat(60));
  if (failed === 0) {
    console.log(`✅ All ${passed} tests passed!`);
  } else {
    console.log(`⚠️  ${failed} test(s) failed, ${passed} test(s) passed`);
  }
  console.log("=".repeat(60));
}

// Main execution
runValidation()
  .then(() => {
    const failed = results.filter((r) => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  });
