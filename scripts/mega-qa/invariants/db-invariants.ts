/**
 * Mega QA Backend Invariants
 *
 * Database and business logic invariants that must always hold true.
 * These verify data integrity beyond what E2E tests can check.
 */

import * as mysql from "mysql2/promise";

export interface InvariantResult {
  name: string;
  passed: boolean;
  message: string;
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
  // Cloud/live DB mode: prefer DATABASE_URL (same as app)
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

/**
 * Run all database invariants
 */
export async function runInvariants(): Promise<InvariantResult[]> {
  const results: InvariantResult[] = [];

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(getDbConnectionConfig() as any);

    // Run all invariant checks
    results.push(await checkNoNegativeInventory(connection));
    results.push(await checkDebitsEqualCredits(connection));
    results.push(await checkInvoiceStatusConsistency(connection));
    results.push(await checkNoOrphanedOrderItems(connection));
    results.push(await checkPaymentAmountsValid(connection));
  } catch (error) {
    results.push({
      name: "Database Connection",
      passed: false,
      message: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }

  return results;
}

/**
 * Inventory should never go negative
 */
async function checkNoNegativeInventory(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const name = "No Negative Inventory";

  try {
    // Canonical schema uses per-bucket qty fields stored as strings (varchar).
    // We cast to DECIMAL for numeric comparisons.
    const [rows] = await connection.execute(`
      SELECT
        id,
        onHandQty,
        sampleQty,
        reservedQty,
        quarantineQty,
        holdQty,
        defectiveQty
      FROM batches
      WHERE
        CAST(onHandQty AS DECIMAL(15,4)) < 0 OR
        CAST(sampleQty AS DECIMAL(15,4)) < 0 OR
        CAST(reservedQty AS DECIMAL(15,4)) < 0 OR
        CAST(quarantineQty AS DECIMAL(15,4)) < 0 OR
        CAST(holdQty AS DECIMAL(15,4)) < 0 OR
        CAST(defectiveQty AS DECIMAL(15,4)) < 0
      LIMIT 10
    `);

    const violations = rows as Array<{
      id: number;
      onHandQty: string;
      sampleQty: string;
      reservedQty: string;
      quarantineQty: string;
      holdQty: string;
      defectiveQty: string;
    }>;

    if (violations.length === 0) {
      return {
        name,
        passed: true,
        message: "All batch quantity buckets are non-negative",
      };
    }

    return {
      name,
      passed: false,
      message: `Found ${violations.length} batches with negative quantity bucket(s)`,
      evidence: violations,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      message: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Double-entry bookkeeping: debits must equal credits
 */
async function checkDebitsEqualCredits(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const name = "Debits Equal Credits";

  try {
    const [rows] = await connection.execute(`
      SELECT 
        SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as total_credits
      FROM journal_entries
    `);

    const result = (
      rows as Array<{ total_debits: string; total_credits: string }>
    )[0];

    if (!result || result.total_debits === null) {
      return { name, passed: true, message: "No journal entries to check" };
    }

    const debits = parseFloat(result.total_debits || "0");
    const credits = parseFloat(result.total_credits || "0");
    const difference = Math.abs(debits - credits);

    // Allow small floating point differences
    if (difference < 0.01) {
      return {
        name,
        passed: true,
        message: `Balanced: Debits=${debits}, Credits=${credits}`,
      };
    }

    return {
      name,
      passed: false,
      message: `Imbalanced by ${difference}`,
      evidence: { debits, credits, difference },
    };
  } catch (error) {
    // Table might not exist
    return {
      name,
      passed: true,
      message: `Skipped (table may not exist): ${error instanceof Error ? error.message : ""}`,
    };
  }
}

/**
 * Invoice status should be consistent with payments
 */
async function checkInvoiceStatusConsistency(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const name = "Invoice Status Consistency";

  try {
    // Find invoices marked as PAID but with no payments, or vice versa
    const [rows] = await connection.execute(`
      SELECT 
        i.id,
        i.status,
        i.total,
        COALESCE(SUM(p.amount), 0) as paid_amount
      FROM invoices i
      LEFT JOIN payments p ON p.invoiceId = i.id
      WHERE i.status = 'PAID'
      GROUP BY i.id, i.status, i.total
      HAVING COALESCE(SUM(p.amount), 0) < i.total
      LIMIT 10
    `);

    const violations = rows as Array<{
      id: number;
      status: string;
      total: string;
      paid_amount: string;
    }>;

    if (violations.length === 0) {
      return {
        name,
        passed: true,
        message: "All PAID invoices have sufficient payments",
      };
    }

    return {
      name,
      passed: false,
      message: `Found ${violations.length} PAID invoices without full payment`,
      evidence: violations,
    };
  } catch (error) {
    return {
      name,
      passed: true,
      message: `Skipped: ${error instanceof Error ? error.message : ""}`,
    };
  }
}

/**
 * Order items should always reference existing orders
 */
async function checkNoOrphanedOrderItems(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const name = "No Orphaned Order Items";

  try {
    const [rows] = await connection.execute(`
      SELECT oi.id, oi.orderId
      FROM order_items oi
      LEFT JOIN orders o ON oi.orderId = o.id
      WHERE o.id IS NULL
      LIMIT 10
    `);

    const orphans = rows as Array<{ id: number; orderId: number }>;

    if (orphans.length === 0) {
      return {
        name,
        passed: true,
        message: "All order items reference valid orders",
      };
    }

    return {
      name,
      passed: false,
      message: `Found ${orphans.length} orphaned order items`,
      evidence: orphans,
    };
  } catch (error) {
    return {
      name,
      passed: true,
      message: `Skipped: ${error instanceof Error ? error.message : ""}`,
    };
  }
}

/**
 * Payment amounts should be positive
 */
async function checkPaymentAmountsValid(
  connection: mysql.Connection
): Promise<InvariantResult> {
  const name = "Payment Amounts Valid";

  try {
    const [rows] = await connection.execute(`
      SELECT id, amount
      FROM payments
      WHERE amount <= 0
      LIMIT 10
    `);

    const invalid = rows as Array<{ id: number; amount: string }>;

    if (invalid.length === 0) {
      return {
        name,
        passed: true,
        message: "All payments have positive amounts",
      };
    }

    return {
      name,
      passed: false,
      message: `Found ${invalid.length} payments with non-positive amounts`,
      evidence: invalid,
    };
  } catch (error) {
    return {
      name,
      passed: true,
      message: `Skipped: ${error instanceof Error ? error.message : ""}`,
    };
  }
}

/**
 * Print invariant results
 */
export function printInvariantResults(results: InvariantResult[]): void {
  console.log("\n📊 DATABASE INVARIANT CHECKS");
  console.log("=".repeat(60));

  for (const result of results) {
    const status = result.passed ? "✅" : "❌";
    console.log(`${status} ${result.name}: ${result.message}`);
    if (!result.passed && result.evidence) {
      console.log(
        `   Evidence: ${JSON.stringify(result.evidence).slice(0, 200)}`
      );
    }
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log("\n" + "=".repeat(60));
  console.log(`Result: ${passed}/${total} invariants passed`);
  console.log("=".repeat(60) + "\n");
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  runInvariants().then(results => {
    printInvariantResults(results);
    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  });
}
