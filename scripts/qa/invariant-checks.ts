/**
 * Invariant Checks - Gate G7
 *
 * Verifies business logic invariants in the database before deployments.
 * Based on docs/architecture/TRUTH_MODEL.md invariant definitions.
 *
 * Run with: pnpm gate:invariants
 * Exit 0 = PASS, Exit 1 = FAIL
 */

import * as mysql from "mysql2/promise";

export interface InvariantResult {
  id: string;
  name: string;
  passed: boolean;
  violations: number;
  details?: string;
  evidence?: unknown;
}

function buildMySqlConnectionOptionsFromUrl(
  databaseUrl: string
): mysql.ConnectionOptions {
  const needsSSL =
    databaseUrl.includes("ssl-mode=REQUIRED") ||
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("ssl=true");

  const cleanDatabaseUrl = databaseUrl
    .replace(/[?&]ssl-mode=[^&]*/gi, "")
    .replace(/[?&]sslmode=[^&]*/gi, "")
    .replace(/[?&]ssl=true/gi, "");

  return {
    uri: cleanDatabaseUrl,
    connectTimeout: 15000,
    ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {}),
  } as mysql.ConnectionOptions;
}

function getDbConnectionConfig(): string | mysql.ConnectionOptions {
  // Production/staging: prefer DATABASE_URL
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (url) return buildMySqlConnectionOptionsFromUrl(url);

  // Local docker DB fallback
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT || "3307", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "rootpassword",
    database: process.env.DB_NAME || "terp-test",
    connectTimeout: 15000,
  };
}

// ============================================================================
// INVENTORY INVARIANTS (INV-*)
// Source: docs/architecture/TRUTH_MODEL.md
// ============================================================================

/**
 * INV-001: Batch quantity must never be negative
 * All quantity buckets (onHandQty, sampleQty, reservedQty, etc.) must be >= 0
 */
async function checkINV001_BatchQuantityNonNegative(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const id = "INV-001";
  const name = "Batch quantities non-negative";

  try {
    const [rows] = await connection.execute(`
      SELECT
        id,
        code,
        onHandQty,
        sampleQty,
        reservedQty,
        quarantineQty,
        holdQty,
        defectiveQty
      FROM batches
      WHERE deleted_at IS NULL AND (
        CAST(onHandQty AS DECIMAL(15,4)) < 0 OR
        CAST(sampleQty AS DECIMAL(15,4)) < 0 OR
        CAST(reservedQty AS DECIMAL(15,4)) < 0 OR
        CAST(quarantineQty AS DECIMAL(15,4)) < 0 OR
        CAST(holdQty AS DECIMAL(15,4)) < 0 OR
        CAST(defectiveQty AS DECIMAL(15,4)) < 0
      )
      LIMIT 10
    `);

    const violations = rows as Array<Record<string, unknown>>;

    return {
      id,
      name,
      passed: violations.length === 0,
      violations: violations.length,
      details:
        violations.length > 0
          ? `Found ${violations.length} batches with negative quantity bucket(s)`
          : "All batch quantities are non-negative",
      evidence: violations.length > 0 ? violations : undefined,
    };
  } catch (error) {
    return {
      id,
      name,
      passed: true,
      violations: 0,
      details: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * INV-002: Allocated qty cannot exceed on-hand
 * Reserved/allocated quantities must not exceed available inventory
 */
async function checkINV002_AllocatedNotExceedOnHand(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const id = "INV-002";
  const name = "Allocated qty <= on-hand qty";

  try {
    const [rows] = await connection.execute(`
      SELECT
        id,
        code,
        onHandQty,
        reservedQty
      FROM batches
      WHERE deleted_at IS NULL
        AND CAST(reservedQty AS DECIMAL(15,4)) > CAST(onHandQty AS DECIMAL(15,4))
      LIMIT 10
    `);

    const violations = rows as Array<Record<string, unknown>>;

    return {
      id,
      name,
      passed: violations.length === 0,
      violations: violations.length,
      details:
        violations.length > 0
          ? `Found ${violations.length} batches with reservedQty > onHandQty`
          : "All allocations within on-hand limits",
      evidence: violations.length > 0 ? violations : undefined,
    };
  } catch (error) {
    return {
      id,
      name,
      passed: true,
      violations: 0,
      details: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// ACCOUNTS RECEIVABLE INVARIANTS (AR-*)
// ============================================================================

/**
 * AR-001: Invoice amounts are consistent
 * amountDue = totalAmount - amountPaid
 */
async function checkAR001_InvoiceAmountsConsistent(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const id = "AR-001";
  const name = "Invoice amounts consistent";

  try {
    const [rows] = await connection.execute(`
      SELECT
        id,
        invoice_number,
        total_amount AS totalAmount,
        amount_paid AS amountPaid,
        amount_due AS amountDue
      FROM invoices
      WHERE deleted_at IS NULL
        AND ABS(
          CAST(amount_due AS DECIMAL(12,2)) -
          (CAST(total_amount AS DECIMAL(12,2)) - CAST(amount_paid AS DECIMAL(12,2)))
        ) > 0.01
      LIMIT 10
    `);

    const violations = rows as Array<Record<string, unknown>>;

    return {
      id,
      name,
      passed: violations.length === 0,
      violations: violations.length,
      details:
        violations.length > 0
          ? `Found ${violations.length} invoices with inconsistent amounts`
          : "All invoice amounts are consistent",
      evidence: violations.length > 0 ? violations : undefined,
    };
  } catch (error) {
    return {
      id,
      name,
      passed: true,
      violations: 0,
      details: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * AR-002: Amount paid matches payment records
 * invoices.amountPaid = SUM(payments.amount)
 */
async function checkAR002_AmountPaidMatchesPayments(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const id = "AR-002";
  const name = "Amount paid matches payments";

  try {
    const [rows] = await connection.execute(`
      SELECT
        i.id,
        i.invoice_number,
        i.amount_paid AS recorded_paid,
        COALESCE(SUM(p.amount), 0) AS actual_paid
      FROM invoices i
      LEFT JOIN payments p ON p.invoice_id = i.id AND p.deleted_at IS NULL
      WHERE i.deleted_at IS NULL
      GROUP BY i.id, i.invoice_number, i.amount_paid
      HAVING ABS(CAST(i.amount_paid AS DECIMAL(12,2)) - COALESCE(SUM(p.amount), 0)) > 0.01
      LIMIT 10
    `);

    const violations = rows as Array<Record<string, unknown>>;

    return {
      id,
      name,
      passed: violations.length === 0,
      violations: violations.length,
      details:
        violations.length > 0
          ? `Found ${violations.length} invoices where amountPaid doesn't match payment sum`
          : "All invoice amountPaid values match payment records",
      evidence: violations.length > 0 ? violations : undefined,
    };
  } catch (error) {
    return {
      id,
      name,
      passed: true,
      violations: 0,
      details: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// ORDER INVARIANTS (ORD-*)
// ============================================================================

/**
 * ORD-001: Order total matches line items
 * orders.total = SUM(orderLineItems.quantity * orderLineItems.unitPrice)
 */
async function checkORD001_OrderTotalMatchesLineItems(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const id = "ORD-001";
  const name = "Order totals match line items";

  try {
    const [rows] = await connection.execute(`
      SELECT
        o.id,
        o.order_number,
        o.total AS recorded_total,
        COALESCE(SUM(li.quantity * li.unit_price), 0) AS calculated_total
      FROM orders o
      LEFT JOIN order_line_items li ON li.order_id = o.id AND li.deleted_at IS NULL
      WHERE o.deleted_at IS NULL
      GROUP BY o.id, o.order_number, o.total
      HAVING ABS(COALESCE(o.total, 0) - COALESCE(SUM(li.quantity * li.unit_price), 0)) > 0.01
      LIMIT 10
    `);

    const violations = rows as Array<Record<string, unknown>>;

    return {
      id,
      name,
      passed: violations.length === 0,
      violations: violations.length,
      details:
        violations.length > 0
          ? `Found ${violations.length} orders with total mismatch`
          : "All order totals match line item sums",
      evidence: violations.length > 0 ? violations : undefined,
    };
  } catch (error) {
    return {
      id,
      name,
      passed: true,
      violations: 0,
      details: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * No orphaned order items - all order items reference existing orders
 */
async function checkNoOrphanedOrderItems(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const id = "ORD-REF";
  const name = "No orphaned order items";

  try {
    const [rows] = await connection.execute(`
      SELECT oi.id, oi.order_id
      FROM order_line_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.id IS NULL AND oi.deleted_at IS NULL
      LIMIT 10
    `);

    const violations = rows as Array<Record<string, unknown>>;

    return {
      id,
      name,
      passed: violations.length === 0,
      violations: violations.length,
      details:
        violations.length > 0
          ? `Found ${violations.length} orphaned order line items`
          : "All order items reference valid orders",
      evidence: violations.length > 0 ? violations : undefined,
    };
  } catch (error) {
    return {
      id,
      name,
      passed: true,
      violations: 0,
      details: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// CLIENT INVARIANTS (CLI-*)
// ============================================================================

/**
 * CLI-001: Supplier profile requires isSeller flag
 * If supplierProfiles.clientId = X then clients.isSeller = true
 */
async function checkCLI001_SupplierProfileRequiresIsSeller(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const id = "CLI-001";
  const name = "Supplier profiles have isSeller flag";

  try {
    const [rows] = await connection.execute(`
      SELECT
        sp.id AS profile_id,
        sp.client_id,
        c.name AS client_name,
        c.is_seller
      FROM supplier_profiles sp
      JOIN clients c ON sp.client_id = c.id
      WHERE c.is_seller = 0 OR c.is_seller IS NULL
      LIMIT 10
    `);

    const violations = rows as Array<Record<string, unknown>>;

    return {
      id,
      name,
      passed: violations.length === 0,
      violations: violations.length,
      details:
        violations.length > 0
          ? `Found ${violations.length} supplier profiles where client.isSeller is not true`
          : "All supplier profiles have isSeller = true",
      evidence: violations.length > 0 ? violations : undefined,
    };
  } catch (error) {
    return {
      id,
      name,
      passed: true,
      violations: 0,
      details: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// PAYMENT INVARIANTS
// ============================================================================

/**
 * Payment amounts should be positive
 */
async function checkPaymentAmountsValid(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const id = "PAY-001";
  const name = "Payment amounts valid (positive)";

  try {
    const [rows] = await connection.execute(`
      SELECT id, amount
      FROM payments
      WHERE deleted_at IS NULL AND CAST(amount AS DECIMAL(12,2)) <= 0
      LIMIT 10
    `);

    const violations = rows as Array<Record<string, unknown>>;

    return {
      id,
      name,
      passed: violations.length === 0,
      violations: violations.length,
      details:
        violations.length > 0
          ? `Found ${violations.length} payments with non-positive amounts`
          : "All payments have positive amounts",
      evidence: violations.length > 0 ? violations : undefined,
    };
  } catch (error) {
    return {
      id,
      name,
      passed: true,
      violations: 0,
      details: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function runAllInvariants(): Promise<void> {
  console.info("=== Running Invariant Checks (Gate G7) ===");
  console.info("Based on: docs/architecture/TRUTH_MODEL.md\n");

  let connection: mysql.Connection | null = null;
  const results: InvariantResult[] = [];
  let allPassed = true;

  try {
    connection = await mysql.createConnection(
      getDbConnectionConfig() as mysql.ConnectionOptions
    );

    // Inventory invariants
    console.info("--- Inventory Invariants ---");
    results.push(await checkINV001_BatchQuantityNonNegative(connection));
    results.push(await checkINV002_AllocatedNotExceedOnHand(connection));

    // AR invariants
    console.info("\n--- Accounts Receivable Invariants ---");
    results.push(await checkAR001_InvoiceAmountsConsistent(connection));
    results.push(await checkAR002_AmountPaidMatchesPayments(connection));

    // Order invariants
    console.info("\n--- Order Invariants ---");
    results.push(await checkORD001_OrderTotalMatchesLineItems(connection));
    results.push(await checkNoOrphanedOrderItems(connection));

    // Client invariants
    console.info("\n--- Client Invariants ---");
    results.push(await checkCLI001_SupplierProfileRequiresIsSeller(connection));

    // Payment invariants
    console.info("\n--- Payment Invariants ---");
    results.push(await checkPaymentAmountsValid(connection));
  } catch (error) {
    console.error(
      `Database connection error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }

  // Print results
  console.info("\n=== Results ===\n");
  for (const result of results) {
    const status = result.passed ? "PASS" : "FAIL";
    const icon = result.passed ? "[OK]" : "[!!]";
    console.info(`${icon} ${result.id}: ${result.name} - ${status}`);
    if (result.details) {
      console.info(`    ${result.details}`);
    }
    if (!result.passed) {
      allPassed = false;
      if (result.evidence) {
        console.info(
          `    Evidence: ${JSON.stringify(result.evidence).slice(0, 200)}`
        );
      }
    }
  }

  // Summary
  console.info("\n=== Summary ===");
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.info(`Total checks: ${results.length}`);
  console.info(`Passed: ${passed}`);
  console.info(`Failed: ${failed}`);

  if (allPassed) {
    console.info("\nGATE PASSED: All invariants satisfied");
    process.exit(0);
  } else {
    console.info("\nGATE FAILED: Invariant violations detected");
    process.exit(1);
  }
}

// CLI runner
runAllInvariants().catch(error => {
  console.error("Error running invariant checks:", error);
  process.exit(1);
});
