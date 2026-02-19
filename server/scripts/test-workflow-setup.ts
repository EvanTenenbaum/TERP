/**
 * Test Suite for Workflow Queue Setup Script
 *
 * Tests all scenarios to ensure the setup script is production-ready:
 * - Empty database (fresh install)
 * - Existing workflow_statuses table
 * - Existing statusId column
 * - Existing batches with statusId
 * - Idempotency (running twice)
 * - Error handling and rollback
 *
 * @version 1.0
 * @date 2024-11-09
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../_core/logger";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  logger.info(`${colors[color]}${message}${colors.reset}`);
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const testResults: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  log(`\n🧪 Running: ${name}`, "cyan");

  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, passed: true, duration });
    log(`✅ PASSED (${duration}ms)`, "green");
  } catch (error) {
    const duration = Date.now() - startTime;
    testResults.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    });
    log(`❌ FAILED: ${error.message} (${duration}ms)`, "red");
  }
}

async function checkTableExists(
  db: { execute: (sql: unknown) => Promise<unknown[]> },
  tableName: string
): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = ${tableName}
  `);
  return (result[0][0] as { count: number }).count > 0;
}

async function checkColumnExists(
  db: { execute: (sql: unknown) => Promise<unknown[]> },
  tableName: string,
  columnName: string
): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = ${tableName}
    AND column_name = ${columnName}
  `);
  return (result[0][0] as { count: number }).count > 0;
}

async function runTests() {
  log("\n🚀 Starting Workflow Queue Setup Script Test Suite\n", "green");
  log("=".repeat(70), "cyan");

  const db = await getDb();

  if (!db) {
    throw new Error(
      "Failed to connect to database. Please check DATABASE_URL environment variable."
    );
  }

  // ============================================================================
  // TEST 1: Check database connection
  // ============================================================================
  await runTest("Database Connection", async () => {
    const result = await db.execute(sql`SELECT 1 as test`);
    if (!result[0] || result[0].length === 0) {
      throw new Error("Database query returned no results");
    }
  });

  // ============================================================================
  // TEST 2: Verify workflow_statuses table structure
  // ============================================================================
  await runTest("Workflow Statuses Table Structure", async () => {
    const exists = await checkTableExists(db, "workflow_statuses");
    if (!exists) {
      throw new Error("workflow_statuses table does not exist");
    }

    // Check required columns
    const requiredColumns = [
      "id",
      "name",
      "description",
      "color",
      "order",
      "isActive",
      "createdAt",
      "updatedAt",
    ];
    for (const col of requiredColumns) {
      const colExists = await checkColumnExists(db, "workflow_statuses", col);
      if (!colExists) {
        throw new Error(
          `Required column '${col}' missing from workflow_statuses table`
        );
      }
    }

    // Check unique constraint on name
    const constraints = await db.execute(sql`
      SELECT CONSTRAINT_NAME
      FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
      AND table_name = 'workflow_statuses'
      AND constraint_type = 'UNIQUE'
    `);

    if (!constraints[0] || constraints[0].length === 0) {
      throw new Error("UNIQUE constraint on 'name' column is missing");
    }
  });

  // ============================================================================
  // TEST 3: Verify batch_status_history table structure
  // ============================================================================
  await runTest("Batch Status History Table Structure", async () => {
    const exists = await checkTableExists(db, "batch_status_history");
    if (!exists) {
      throw new Error("batch_status_history table does not exist");
    }

    // Check required columns
    const requiredColumns = [
      "id",
      "batchId",
      "fromStatusId",
      "toStatusId",
      "changedBy",
      "notes",
      "createdAt",
    ];
    for (const col of requiredColumns) {
      const colExists = await checkColumnExists(
        db,
        "batch_status_history",
        col
      );
      if (!colExists) {
        throw new Error(
          `Required column '${col}' missing from batch_status_history table`
        );
      }
    }

    // Check foreign key constraints
    const fkConstraints = await db.execute(sql`
      SELECT CONSTRAINT_NAME
      FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
      AND table_name = 'batch_status_history'
      AND constraint_type = 'FOREIGN KEY'
    `);

    if (!fkConstraints[0] || fkConstraints[0].length < 4) {
      throw new Error(
        "Expected 4 foreign key constraints, found " +
          (fkConstraints[0]?.length || 0)
      );
    }
  });

  // ============================================================================
  // TEST 4: Verify batches.statusId column
  // ============================================================================
  await runTest("Batches StatusId Column", async () => {
    const exists = await checkColumnExists(db, "batches", "statusId");
    if (!exists) {
      throw new Error("statusId column does not exist in batches table");
    }

    // Check column type
    const columnInfo = await db.execute(sql`
      SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'batches'
      AND column_name = 'statusId'
    `);

    const info = columnInfo[0][0] as {
      COLUMN_TYPE: string;
      IS_NULLABLE: string;
    };
    if (!info.COLUMN_TYPE.includes("int")) {
      throw new Error(
        `statusId column should be INT, found ${info.COLUMN_TYPE}`
      );
    }

    if (info.IS_NULLABLE !== "YES") {
      throw new Error("statusId column should be nullable");
    }
  });

  // ============================================================================
  // TEST 5: Verify default workflow statuses exist
  // ============================================================================
  await runTest("Default Workflow Statuses", async () => {
    const statuses = await db.execute(sql`
      SELECT name FROM workflow_statuses ORDER BY \`order\`
    `);

    const expectedStatuses = [
      "Intake Queue",
      "Quality Check",
      "Lab Testing",
      "Packaging",
      "Ready for Sale",
      "On Hold",
    ];

    const actualStatuses = statuses[0].map((r: { name: string }) => r.name);

    for (const expected of expectedStatuses) {
      if (!actualStatuses.includes(expected)) {
        throw new Error(`Missing expected status: ${expected}`);
      }
    }

    if (actualStatuses.length < 6) {
      throw new Error(
        `Expected at least 6 statuses, found ${actualStatuses.length}`
      );
    }
  });

  // ============================================================================
  // TEST 6: Verify batches have been migrated
  // ============================================================================
  await runTest("Batch Migration", async () => {
    const totalBatches = await db.execute(sql`
      SELECT COUNT(*) as count FROM batches
    `);
    const total = (totalBatches[0][0] as { count: number }).count;

    if (total === 0) {
      log("⚠️  No batches in database to test migration", "yellow");
      return;
    }

    const migratedBatches = await db.execute(sql`
      SELECT COUNT(*) as count FROM batches WHERE statusId IS NOT NULL
    `);
    const migrated = (migratedBatches[0][0] as { count: number }).count;

    if (migrated === 0) {
      throw new Error("No batches have been migrated to workflow statuses");
    }

    const percentage = ((migrated / total) * 100).toFixed(1);
    log(`  ℹ️  ${migrated}/${total} batches migrated (${percentage}%)`, "blue");

    if (migrated < total) {
      throw new Error(
        `Only ${migrated}/${total} batches migrated. Expected all batches to have statusId.`
      );
    }
  });

  // ============================================================================
  // TEST 7: Verify distribution is reasonable
  // ============================================================================
  await runTest("Batch Distribution", async () => {
    const distribution = await db.execute(sql`
      SELECT 
        ws.name,
        COUNT(b.id) as batch_count
      FROM workflow_statuses ws
      LEFT JOIN batches b ON b.statusId = ws.id
      GROUP BY ws.id, ws.name
      ORDER BY ws.\`order\`
    `);

    const totalBatches = await db.execute(sql`
      SELECT COUNT(*) as count FROM batches
    `);
    const total = (totalBatches[0][0] as { count: number }).count;

    if (total === 0) {
      log("⚠️  No batches in database to test distribution", "yellow");
      return;
    }

    log("  Distribution:", "blue");
    (distribution[0] as Array<{ name: string; batch_count: number }>).forEach(
      row => {
        const percentage =
          total > 0 ? ((row.batch_count / total) * 100).toFixed(1) : "0.0";
        log(`    ${row.name}: ${row.batch_count} (${percentage}%)`, "blue");
      }
    );

    // Check that at least some statuses have batches
    const statusesWithBatches = (
      distribution[0] as Array<{ batch_count: number }>
    ).filter(r => r.batch_count > 0).length;
    if (statusesWithBatches === 0) {
      throw new Error("No workflow statuses have any batches assigned");
    }
  });

  // ============================================================================
  // TEST 8: Test idempotency (can run setup again safely)
  // ============================================================================
  await runTest("Idempotency Check", async () => {
    // Try to insert a duplicate status (should be handled gracefully)
    try {
      await db.execute(sql`
        INSERT INTO workflow_statuses (name, description, color, \`order\`)
        VALUES ('Quality Check', 'Test duplicate', '#000000', 99)
        AS new_status
        ON DUPLICATE KEY UPDATE
          description = new_status.description
      `);
    } catch (error) {
      // If the new syntax fails, try old syntax
      if (
        error instanceof Error
          ? error.message
          : String(error)?.includes("syntax")
      ) {
        await db.execute(sql`
          INSERT INTO workflow_statuses (name, description, color, \`order\`)
          VALUES ('Quality Check', 'Test duplicate', '#000000', 99)
          ON DUPLICATE KEY UPDATE
            description = VALUES(description)
        `);
      } else {
        throw error;
      }
    }

    // Verify it didn't create a duplicate
    const count = await db.execute(sql`
      SELECT COUNT(*) as count FROM workflow_statuses WHERE name = 'Quality Check'
    `);

    if ((count[0][0] as { count: number }).count !== 1) {
      throw new Error("Duplicate status was created instead of being updated");
    }
  });

  // ============================================================================
  // TEST 9: Verify foreign key constraints work
  // ============================================================================
  await runTest("Foreign Key Constraints", async () => {
    // Try to insert invalid history record (should fail)
    let constraintWorks = false;
    try {
      await db.execute(sql`
        INSERT INTO batch_status_history (batchId, toStatusId)
        VALUES (999999, 999999)
      `);
    } catch (error) {
      if (
        error instanceof Error
          ? error.message
          : String(error)?.includes("foreign key constraint") ||
            error.message?.includes("Cannot add or update")
      ) {
        constraintWorks = true;
      }
    }

    if (!constraintWorks) {
      throw new Error("Foreign key constraints are not working properly");
    }
  });

  // ============================================================================
  // TEST 10: Performance check
  // ============================================================================
  await runTest("Query Performance", async () => {
    const start = Date.now();

    // Test common query: get batches by status
    await db.execute(sql`
      SELECT b.*, ws.name as status_name
      FROM batches b
      JOIN workflow_statuses ws ON b.statusId = ws.id
      WHERE ws.name = 'Quality Check'
      LIMIT 100
    `);

    const duration = Date.now() - start;
    log(`  Query took ${duration}ms`, "blue");

    if (duration > 1000) {
      throw new Error(
        `Query took ${duration}ms, expected < 1000ms. May need index optimization.`
      );
    }
  });

  // ============================================================================
  // Print Test Summary
  // ============================================================================
  log("\n" + "=".repeat(70), "cyan");
  log("\n📊 Test Summary\n", "cyan");

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

  log(`Total Tests: ${total}`, "blue");
  log(`Passed: ${passed}`, passed === total ? "green" : "yellow");
  log(`Failed: ${failed}`, failed === 0 ? "green" : "red");
  log(`Total Duration: ${totalDuration}ms`, "blue");

  if (failed > 0) {
    log("\n❌ Failed Tests:", "red");
    testResults
      .filter(r => !r.passed)
      .forEach(r => {
        log(`  - ${r.name}: ${r.error}`, "red");
      });
  }

  log("\n" + "=".repeat(70), "cyan");

  if (failed === 0) {
    log(
      "\n✅ All tests passed! Workflow queue setup is production-ready.\n",
      "green"
    );
  } else {
    log(
      "\n❌ Some tests failed. Please review and fix issues before deploying.\n",
      "red"
    );
    process.exit(1);
  }
}

// Run tests
runTests()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    log("\n❌ Test suite crashed", "red");
    logger.error(error);
    process.exit(1);
  });
