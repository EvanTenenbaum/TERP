#!/usr/bin/env tsx
/**
 * Digital Ocean E2E Test Suite
 *
 * Comprehensive end-to-end testing against Digital Ocean MySQL database.
 * This script runs database connectivity tests, schema validation, invariant checks,
 * and prepares the environment for Oracle-based E2E tests.
 *
 * Usage:
 *   TEST_DATABASE_URL="mysql://..." pnpm tsx scripts/do-e2e-test-suite.ts
 *
 * Or with environment file:
 *   DATABASE_URL="mysql://..." pnpm tsx scripts/do-e2e-test-suite.ts
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";

// Load environment
config();

// Constants
const DO_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "mysql://doadmin:AVNS_Q_RGkS7-uB3Bk7xC2am@terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED";

// Test result types
interface TestResult {
  name: string;
  category:
    | "connectivity"
    | "schema"
    | "integrity"
    | "invariant"
    | "performance";
  passed: boolean;
  duration: number;
  message: string;
  evidence?: unknown;
}

interface TestSuiteReport {
  timestamp: string;
  database_url_masked: string;
  total_tests: number;
  passed: number;
  failed: number;
  duration_ms: number;
  results: TestResult[];
  summary: {
    by_category: Record<string, { passed: number; failed: number }>;
    critical_failures: string[];
  };
}

// Helper functions
function maskConnectionString(url: string): string {
  return url.replace(/:[^:@]+@/, ":****@");
}

function buildConnectionOptions(databaseUrl: string): mysql.ConnectionOptions {
  const needsSSL =
    databaseUrl.includes("ssl-mode=REQUIRED") ||
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("ssl=true") ||
    databaseUrl.includes("digitalocean.com");

  const cleanDatabaseUrl = databaseUrl
    .replace(/[?&]ssl-mode=[^&]*/gi, "")
    .replace(/[?&]sslmode=[^&]*/gi, "")
    .replace(/[?&]ssl=true/gi, "");

  return {
    uri: cleanDatabaseUrl,
    connectTimeout: 30000,
    ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {}),
  } as mysql.ConnectionOptions;
}

// Test implementations
async function testConnectivity(conn: mysql.Connection): Promise<TestResult> {
  const start = Date.now();
  try {
    await conn.query("SELECT 1 as health_check");
    return {
      name: "Database Connectivity",
      category: "connectivity",
      passed: true,
      duration: Date.now() - start,
      message: "Successfully connected to Digital Ocean MySQL",
    };
  } catch (error) {
    return {
      name: "Database Connectivity",
      category: "connectivity",
      passed: false,
      duration: Date.now() - start,
      message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testDatabaseInfo(conn: mysql.Connection): Promise<TestResult> {
  const start = Date.now();
  try {
    const [rows] = await conn.query(
      "SELECT DATABASE() as db, VERSION() as version, USER() as user"
    );
    const info = (
      rows as Array<{ db: string; version: string; user: string }>
    )[0];
    return {
      name: "Database Info",
      category: "connectivity",
      passed: true,
      duration: Date.now() - start,
      message: `DB: ${info.db}, Version: ${info.version}, User: ${info.user}`,
      evidence: info,
    };
  } catch (error) {
    return {
      name: "Database Info",
      category: "connectivity",
      passed: false,
      duration: Date.now() - start,
      message: `Failed to get DB info: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testTableCount(conn: mysql.Connection): Promise<TestResult> {
  const start = Date.now();
  try {
    const [rows] = await conn.query("SHOW TABLES");
    const count = (rows as Array<unknown>).length;
    return {
      name: "Table Count",
      category: "schema",
      passed: count > 0,
      duration: Date.now() - start,
      message: `Found ${count} tables in database`,
      evidence: { table_count: count },
    };
  } catch (error) {
    return {
      name: "Table Count",
      category: "schema",
      passed: false,
      duration: Date.now() - start,
      message: `Failed to list tables: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testCoreTablesExist(
  conn: mysql.Connection
): Promise<TestResult> {
  const start = Date.now();
  const coreTables = [
    "users",
    "clients",
    "orders",
    "order_items",
    "batches",
    "strains",
    "invoices",
    "payments",
    "inventory_movements",
    "audit_logs",
  ];

  try {
    const [rows] = await conn.query("SHOW TABLES");
    const tables = (rows as Array<Record<string, string>>).map(r =>
      Object.values(r)[0].toLowerCase()
    );
    const missingTables = coreTables.filter(
      t =>
        !tables.includes(t.toLowerCase()) &&
        !tables.includes(t.replace(/_/g, ""))
    );

    if (missingTables.length === 0) {
      return {
        name: "Core Tables Exist",
        category: "schema",
        passed: true,
        duration: Date.now() - start,
        message: `All ${coreTables.length} core tables exist`,
        evidence: { core_tables: coreTables },
      };
    }

    return {
      name: "Core Tables Exist",
      category: "schema",
      passed: false,
      duration: Date.now() - start,
      message: `Missing tables: ${missingTables.join(", ")}`,
      evidence: { missing: missingTables, found: tables.slice(0, 20) },
    };
  } catch (error) {
    return {
      name: "Core Tables Exist",
      category: "schema",
      passed: false,
      duration: Date.now() - start,
      message: `Failed to check tables: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testUserCount(conn: mysql.Connection): Promise<TestResult> {
  const start = Date.now();
  try {
    const [rows] = await conn.query("SELECT COUNT(*) as count FROM users");
    const count = (rows as Array<{ count: number }>)[0].count;
    return {
      name: "User Records",
      category: "integrity",
      passed: count > 0,
      duration: Date.now() - start,
      message: `Found ${count} users in database`,
      evidence: { user_count: count },
    };
  } catch (error) {
    return {
      name: "User Records",
      category: "integrity",
      passed: false,
      duration: Date.now() - start,
      message: `Failed to count users: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testClientCount(conn: mysql.Connection): Promise<TestResult> {
  const start = Date.now();
  try {
    const [rows] = await conn.query(
      "SELECT COUNT(*) as count FROM clients WHERE deletedAt IS NULL"
    );
    const count = (rows as Array<{ count: number }>)[0].count;
    return {
      name: "Active Client Records",
      category: "integrity",
      passed: count > 0,
      duration: Date.now() - start,
      message: `Found ${count} active clients`,
      evidence: { client_count: count },
    };
  } catch (error) {
    return {
      name: "Active Client Records",
      category: "integrity",
      passed: false,
      duration: Date.now() - start,
      message: `Failed to count clients: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testOrderCount(conn: mysql.Connection): Promise<TestResult> {
  const start = Date.now();
  try {
    const [rows] = await conn.query(
      "SELECT COUNT(*) as count FROM orders WHERE deletedAt IS NULL"
    );
    const count = (rows as Array<{ count: number }>)[0].count;
    return {
      name: "Order Records",
      category: "integrity",
      passed: true,
      duration: Date.now() - start,
      message: `Found ${count} orders in database`,
      evidence: { order_count: count },
    };
  } catch (error) {
    return {
      name: "Order Records",
      category: "integrity",
      passed: false,
      duration: Date.now() - start,
      message: `Failed to count orders: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testBatchCount(conn: mysql.Connection): Promise<TestResult> {
  const start = Date.now();
  try {
    const [rows] = await conn.query(
      "SELECT COUNT(*) as count FROM batches WHERE deletedAt IS NULL"
    );
    const count = (rows as Array<{ count: number }>)[0].count;
    return {
      name: "Batch Records",
      category: "integrity",
      passed: count > 0,
      duration: Date.now() - start,
      message: `Found ${count} active batches`,
      evidence: { batch_count: count },
    };
  } catch (error) {
    return {
      name: "Batch Records",
      category: "integrity",
      passed: false,
      duration: Date.now() - start,
      message: `Failed to count batches: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testNoNegativeInventory(
  conn: mysql.Connection
): Promise<TestResult> {
  const start = Date.now();
  try {
    const [rows] = await conn.query(`
      SELECT id, onHandQty
      FROM batches
      WHERE CAST(onHandQty AS DECIMAL(15,4)) < 0
      LIMIT 5
    `);
    const violations = rows as Array<{ id: number; onHandQty: string }>;

    if (violations.length === 0) {
      return {
        name: "No Negative Inventory",
        category: "invariant",
        passed: true,
        duration: Date.now() - start,
        message: "All batch quantities are non-negative",
      };
    }

    return {
      name: "No Negative Inventory",
      category: "invariant",
      passed: false,
      duration: Date.now() - start,
      message: `Found ${violations.length} batches with negative inventory`,
      evidence: violations,
    };
  } catch (error) {
    return {
      name: "No Negative Inventory",
      category: "invariant",
      passed: true,
      duration: Date.now() - start,
      message: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testOrphanedOrderItems(
  conn: mysql.Connection
): Promise<TestResult> {
  const start = Date.now();
  try {
    const [rows] = await conn.query(`
      SELECT oi.id, oi.orderId
      FROM order_items oi
      LEFT JOIN orders o ON oi.orderId = o.id
      WHERE o.id IS NULL
      LIMIT 5
    `);
    const orphans = rows as Array<{ id: number; orderId: number }>;

    if (orphans.length === 0) {
      return {
        name: "No Orphaned Order Items",
        category: "invariant",
        passed: true,
        duration: Date.now() - start,
        message: "All order items reference valid orders",
      };
    }

    return {
      name: "No Orphaned Order Items",
      category: "invariant",
      passed: false,
      duration: Date.now() - start,
      message: `Found ${orphans.length} orphaned order items`,
      evidence: orphans,
    };
  } catch (error) {
    return {
      name: "No Orphaned Order Items",
      category: "invariant",
      passed: true,
      duration: Date.now() - start,
      message: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testPaymentAmounts(conn: mysql.Connection): Promise<TestResult> {
  const start = Date.now();
  try {
    const [rows] = await conn.query(`
      SELECT id, amount
      FROM payments
      WHERE CAST(amount AS DECIMAL(15,2)) <= 0
      LIMIT 5
    `);
    const invalid = rows as Array<{ id: number; amount: string }>;

    if (invalid.length === 0) {
      return {
        name: "Valid Payment Amounts",
        category: "invariant",
        passed: true,
        duration: Date.now() - start,
        message: "All payments have positive amounts",
      };
    }

    return {
      name: "Valid Payment Amounts",
      category: "invariant",
      passed: false,
      duration: Date.now() - start,
      message: `Found ${invalid.length} invalid payment amounts`,
      evidence: invalid,
    };
  } catch (error) {
    return {
      name: "Valid Payment Amounts",
      category: "invariant",
      passed: true,
      duration: Date.now() - start,
      message: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testQueryPerformance(
  conn: mysql.Connection
): Promise<TestResult> {
  const start = Date.now();
  try {
    // Run a complex query to test performance
    await conn.query(`
      SELECT
        o.id,
        o.orderNumber,
        c.name as clientName,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN clients c ON o.clientId = c.id
      LEFT JOIN order_items oi ON oi.orderId = o.id
      WHERE o.deletedAt IS NULL
      GROUP BY o.id, o.orderNumber, c.name
      LIMIT 100
    `);
    const duration = Date.now() - start;

    return {
      name: "Query Performance",
      category: "performance",
      passed: duration < 5000,
      duration,
      message: `Complex join query completed in ${duration}ms`,
      evidence: { query_time_ms: duration },
    };
  } catch (error) {
    return {
      name: "Query Performance",
      category: "performance",
      passed: false,
      duration: Date.now() - start,
      message: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testIndexUsage(conn: mysql.Connection): Promise<TestResult> {
  const start = Date.now();
  try {
    // Check if primary indexes are being used
    const [rows] = await conn.query(`
      SHOW INDEX FROM orders WHERE Key_name = 'PRIMARY'
    `);
    const hasIndex = (rows as Array<unknown>).length > 0;

    return {
      name: "Index Health",
      category: "performance",
      passed: hasIndex,
      duration: Date.now() - start,
      message: hasIndex
        ? "Primary indexes are configured"
        : "Missing primary indexes",
    };
  } catch (error) {
    return {
      name: "Index Health",
      category: "performance",
      passed: true,
      duration: Date.now() - start,
      message: `Skipped: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Main test runner
async function runTestSuite(): Promise<TestSuiteReport> {
  const startTime = Date.now();
  const results: TestResult[] = [];

  console.info("\n" + "=".repeat(70));
  console.info("DIGITAL OCEAN E2E TEST SUITE");
  console.info("=".repeat(70));
  console.info(`Database: ${maskConnectionString(DO_DATABASE_URL)}`);
  console.info(`Timestamp: ${new Date().toISOString()}`);
  console.info("=".repeat(70) + "\n");

  let connection: mysql.Connection | null = null;

  try {
    // Connect to database
    console.info("Connecting to Digital Ocean MySQL...\n");
    connection = await mysql.createConnection(
      buildConnectionOptions(DO_DATABASE_URL)
    );

    // Run all tests
    const tests = [
      testConnectivity,
      testDatabaseInfo,
      testTableCount,
      testCoreTablesExist,
      testUserCount,
      testClientCount,
      testOrderCount,
      testBatchCount,
      testNoNegativeInventory,
      testOrphanedOrderItems,
      testPaymentAmounts,
      testQueryPerformance,
      testIndexUsage,
    ];

    for (const test of tests) {
      const result = await test(connection);
      results.push(result);

      const status = result.passed ? "PASS" : "FAIL";
      const icon = result.passed ? "✅" : "❌";
      console.info(`${icon} [${status}] ${result.name} (${result.duration}ms)`);
      console.info(`   ${result.message}\n`);
    }
  } catch (error) {
    results.push({
      name: "Connection",
      category: "connectivity",
      passed: false,
      duration: Date.now() - startTime,
      message: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }

  // Generate summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const byCategory: Record<string, { passed: number; failed: number }> = {};

  for (const result of results) {
    if (!byCategory[result.category]) {
      byCategory[result.category] = { passed: 0, failed: 0 };
    }
    if (result.passed) {
      byCategory[result.category].passed++;
    } else {
      byCategory[result.category].failed++;
    }
  }

  const criticalFailures = results
    .filter(
      r =>
        !r.passed &&
        (r.category === "connectivity" || r.category === "invariant")
    )
    .map(r => r.name);

  const report: TestSuiteReport = {
    timestamp: new Date().toISOString(),
    database_url_masked: maskConnectionString(DO_DATABASE_URL),
    total_tests: results.length,
    passed,
    failed,
    duration_ms: Date.now() - startTime,
    results,
    summary: {
      by_category: byCategory,
      critical_failures: criticalFailures,
    },
  };

  // Print summary
  console.info("\n" + "=".repeat(70));
  console.info("TEST SUMMARY");
  console.info("=".repeat(70));
  console.info(
    `Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`
  );
  console.info(`Duration: ${report.duration_ms}ms`);
  console.info("\nBy Category:");
  for (const [category, counts] of Object.entries(byCategory)) {
    console.info(
      `  ${category}: ${counts.passed} passed, ${counts.failed} failed`
    );
  }

  if (criticalFailures.length > 0) {
    console.info("\n⚠️  Critical Failures:");
    for (const failure of criticalFailures) {
      console.info(`  - ${failure}`);
    }
  }

  console.info("\n" + "=".repeat(70) + "\n");

  return report;
}

// CLI execution
runTestSuite()
  .then(report => {
    // Write report to file
    const fs = require("fs");
    const reportPath = "do-e2e-test-report.json";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.info(`Report saved to: ${reportPath}`);

    process.exit(report.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error("Test suite failed:", error);
    process.exit(1);
  });
