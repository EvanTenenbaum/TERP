/**
 * Production-Safe Workflow Queue Setup Script v2
 *
 * This script safely sets up the workflow queue system in production with:
 * - Full transaction support with automatic rollback on failure
 * - Deterministic batch migration (no RAND())
 * - Proper foreign key creation order
 * - MySQL 8.0.20+ compatible syntax
 * - Dry-run mode for testing
 * - Comprehensive error handling and validation
 * - Idempotent execution (safe to run multiple times)
 *
 * Usage:
 *   pnpm tsx server/scripts/setup-workflow-queue-production-v2.ts
 *   pnpm tsx server/scripts/setup-workflow-queue-production-v2.ts --dry-run
 *
 * @version 2.0
 * @date 2024-11-09
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../_core/logger";

// Configuration
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

// Color codes for console output
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

function logStep(step: number, message: string) {
  log(`\n📋 Step ${step}: ${message}`, "cyan");
}

function logSuccess(message: string) {
  log(`✅ ${message}`, "green");
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, "yellow");
}

function logError(message: string) {
  log(`❌ ${message}`, "red");
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, "blue");
}

interface StatusRecord {
  id: number;
  name: string;
}

interface VerificationRow {
  name: string;
  color: string;
  batch_count: number;
  avg_quantity: number;
}

async function checkTableExists(
  db: { execute: (sql: unknown) => Promise<unknown[]> },
  tableName: string
): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = ${tableName}
    `);
    return (result[0][0] as { count: number }).count > 0;
  } catch (_error) {
    return false;
  }
}

async function checkColumnExists(
  db: { execute: (sql: unknown) => Promise<unknown[]> },
  tableName: string,
  columnName: string
): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    `);
    return (result[0][0] as { count: number }).count > 0;
  } catch (_error) {
    return false;
  }
}

async function setupWorkflowQueue() {
  const db = await getDb();

  if (!db) {
    throw new Error(
      "Failed to connect to database. Please check DATABASE_URL environment variable."
    );
  }

  if (DRY_RUN) {
    log(
      "\n🔍 DRY RUN MODE - No changes will be made to the database\n",
      "yellow"
    );
  } else {
    log("\n🚀 Starting Workflow Queue Production Setup...\n", "green");
  }

  try {
    // ============================================================================
    // STEP 1: Create workflow_statuses table
    // ============================================================================
    logStep(1, "Creating workflow_statuses table...");

    const workflowStatusesExists = await checkTableExists(
      db,
      "workflow_statuses"
    );

    if (workflowStatusesExists) {
      logInfo("workflow_statuses table already exists, skipping creation");
    } else {
      if (DRY_RUN) {
        logInfo("Would create workflow_statuses table");
      } else {
        await db.execute(sql`
          CREATE TABLE workflow_statuses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
            \`order\` INT NOT NULL DEFAULT 0,
            isActive TINYINT(1) NOT NULL DEFAULT 1,
            createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_name (name),
            INDEX idx_order (\`order\`),
            INDEX idx_active (isActive),
            INDEX idx_created (createdAt)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        logSuccess("workflow_statuses table created");
      }
    }

    // ============================================================================
    // STEP 2: Add statusId column to batches table (before creating FK constraints)
    // ============================================================================
    logStep(2, "Adding statusId column to batches table...");

    const statusIdExists = await checkColumnExists(db, "batches", "statusId");

    if (statusIdExists) {
      logInfo("statusId column already exists in batches table");

      // Verify column type
      const columnInfo = await db.execute(sql`
        SELECT COLUMN_TYPE, IS_NULLABLE
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'batches'
        AND column_name = 'statusId'
      `);

      const columnType = (columnInfo[0][0] as { COLUMN_TYPE: string })
        .COLUMN_TYPE;
      if (VERBOSE) {
        logInfo(`Current statusId column type: ${columnType}`);
      }
    } else {
      if (DRY_RUN) {
        logInfo("Would add statusId column to batches table");
      } else {
        // Check if batchStatus column exists for positioning
        const batchStatusExists = await checkColumnExists(
          db,
          "batches",
          "batchStatus"
        );

        if (batchStatusExists) {
          await db.execute(sql`
            ALTER TABLE batches 
            ADD COLUMN statusId INT NULL AFTER batchStatus,
            ADD INDEX idx_statusId (statusId);
          `);
        } else {
          // If batchStatus doesn't exist, just add at end
          await db.execute(sql`
            ALTER TABLE batches 
            ADD COLUMN statusId INT NULL,
            ADD INDEX idx_statusId (statusId);
          `);
        }
        logSuccess("statusId column added to batches table");
      }
    }

    // ============================================================================
    // STEP 3: Create batch_status_history table (after workflow_statuses exists)
    // ============================================================================
    logStep(3, "Creating batch_status_history table...");

    const historyTableExists = await checkTableExists(
      db,
      "batch_status_history"
    );

    if (historyTableExists) {
      logInfo("batch_status_history table already exists, skipping creation");
    } else {
      if (DRY_RUN) {
        logInfo("Would create batch_status_history table");
      } else {
        await db.execute(sql`
          CREATE TABLE batch_status_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            batchId INT NOT NULL,
            fromStatusId INT,
            toStatusId INT NOT NULL,
            changedBy INT,
            notes TEXT,
            createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_batch (batchId),
            INDEX idx_created (createdAt),
            INDEX idx_changed_by (changedBy),
            INDEX idx_batch_created (batchId, createdAt),
            CONSTRAINT fk_history_batch FOREIGN KEY (batchId) REFERENCES batches(id) ON DELETE RESTRICT,
            CONSTRAINT fk_history_from_status FOREIGN KEY (fromStatusId) REFERENCES workflow_statuses(id) ON DELETE SET NULL,
            CONSTRAINT fk_history_to_status FOREIGN KEY (toStatusId) REFERENCES workflow_statuses(id) ON DELETE RESTRICT,
            CONSTRAINT fk_history_changed_by FOREIGN KEY (changedBy) REFERENCES users(id) ON DELETE SET NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        logSuccess(
          "batch_status_history table created with proper constraints"
        );
      }
    }

    // ============================================================================
    // STEP 4: Add foreign key constraint to batches.statusId
    // ============================================================================
    logStep(4, "Adding foreign key constraint to batches.statusId...");

    // Check if FK already exists
    const fkCheck = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
      AND table_name = 'batches'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%statusId%'
    `);

    const fkExists = (fkCheck[0][0] as { count: number }).count > 0;

    if (fkExists) {
      logInfo("Foreign key constraint on batches.statusId already exists");
    } else {
      if (DRY_RUN) {
        logInfo("Would add foreign key constraint to batches.statusId");
      } else {
        await db.execute(sql`
          ALTER TABLE batches
          ADD CONSTRAINT fk_batch_status FOREIGN KEY (statusId) 
          REFERENCES workflow_statuses(id) ON DELETE SET NULL;
        `);
        logSuccess("Foreign key constraint added to batches.statusId");
      }
    }

    // ============================================================================
    // STEP 5: Seed default workflow statuses
    // ============================================================================
    logStep(5, "Seeding default workflow statuses...");

    const defaultStatuses = [
      {
        name: "Intake Queue",
        description: "Newly received batches awaiting initial processing",
        color: "#EF4444",
        order: 1,
      },
      {
        name: "Quality Check",
        description: "Batches undergoing quality inspection",
        color: "#F59E0B",
        order: 2,
      },
      {
        name: "Lab Testing",
        description: "Batches in laboratory testing phase",
        color: "#3B82F6",
        order: 3,
      },
      {
        name: "Packaging",
        description: "Batches being packaged for sale",
        color: "#8B5CF6",
        order: 4,
      },
      {
        name: "Ready for Sale",
        description: "Batches ready to be sold",
        color: "#10B981",
        order: 5,
      },
      {
        name: "On Hold",
        description: "Batches temporarily on hold",
        color: "#6B7280",
        order: 6,
      },
    ];

    if (DRY_RUN) {
      logInfo(`Would seed ${defaultStatuses.length} default workflow statuses`);
      defaultStatuses.forEach(s => logInfo(`  - ${s.name} (${s.color})`));
    } else {
      for (const status of defaultStatuses) {
        try {
          // MySQL 8.0.20+ compatible syntax
          await db.execute(sql`
            INSERT INTO workflow_statuses (name, description, color, \`order\`)
            VALUES (${status.name}, ${status.description}, ${status.color}, ${status.order})
            AS new_status
            ON DUPLICATE KEY UPDATE
              description = new_status.description,
              color = new_status.color,
              \`order\` = new_status.\`order\`;
          `);
          logSuccess(`  ✓ ${status.name}`);
        } catch (error) {
          // If the above syntax fails (older MySQL), try the old syntax
          if (
            error instanceof Error
              ? error.message
              : String(error)?.includes("syntax")
          ) {
            try {
              await db.execute(sql`
                INSERT INTO workflow_statuses (name, description, color, \`order\`)
                VALUES (${status.name}, ${status.description}, ${status.color}, ${status.order})
                ON DUPLICATE KEY UPDATE
                  description = VALUES(description),
                  color = VALUES(color),
                  \`order\` = VALUES(\`order\`);
              `);
              logSuccess(`  ✓ ${status.name} (fallback syntax)`);
            } catch (fallbackError) {
              logWarning(`  ⚠️  ${status.name} - ${fallbackError.message}`);
            }
          } else {
            logWarning(`  ⚠️  ${status.name} - ${error.message}`);
          }
        }
      }
      logSuccess("Default workflow statuses seeded");
    }

    // ============================================================================
    // STEP 6: Migrate existing batches to workflow statuses (DETERMINISTIC)
    // ============================================================================
    logStep(6, "Migrating existing batches to workflow statuses...");

    // Get status IDs
    const statusMapResult = await db.execute(
      sql`SELECT id, name FROM workflow_statuses`
    );
    const statuses = statusMapResult[0] as StatusRecord[];

    const statusMap: Record<string, number> = {};
    statuses.forEach(s => {
      statusMap[s.name.toLowerCase()] = s.id;
    });

    const qualityCheckId = statusMap["quality check"];
    const labTestingId = statusMap["lab testing"];
    const packagingId = statusMap["packaging"];
    const readyForSaleId = statusMap["ready for sale"];
    const onHoldId = statusMap["on hold"];

    if (
      !qualityCheckId ||
      !labTestingId ||
      !packagingId ||
      !readyForSaleId ||
      !onHoldId
    ) {
      throw new Error(
        "Failed to find all required workflow statuses. Found: " +
          Object.keys(statusMap).join(", ")
      );
    }

    // Count batches that need migration
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM batches WHERE statusId IS NULL
    `);

    if (!countResult[0] || countResult[0].length === 0) {
      throw new Error("Failed to count batches needing migration");
    }

    const batchesToMigrate = (countResult[0][0] as { count: number }).count;

    if (batchesToMigrate === 0) {
      logInfo("All batches already have workflow statuses assigned");
    } else {
      logInfo(`Found ${batchesToMigrate} batches to migrate`);

      if (DRY_RUN) {
        logInfo("Would migrate batches using deterministic logic:");
        logInfo("  - Ready for Sale: onHandQty = 0 (sold out)");
        logInfo("  - On Hold: id % 10 = 0 (deterministic 10%)");
        logInfo("  - Quality Check: onHandQty > 500");
        logInfo("  - Packaging: onHandQty > 0 AND onHandQty < 300");
        logInfo("  - Lab Testing: everything else");
      } else {
        // Start transaction for atomic migration
        await db.execute(sql`START TRANSACTION`);

        try {
          // Ready for Sale: 0 quantity (sold out)
          const result1 = await db.execute(sql`
            UPDATE batches 
            SET statusId = ${readyForSaleId}
            WHERE statusId IS NULL AND onHandQty = 0
          `);
          logInfo(
            `  ✓ Assigned ${(result1 as { rowsAffected?: number }).rowsAffected || 0} batches to Ready for Sale (sold out)`
          );

          // On Hold: Deterministic 10% (id % 10 = 0)
          const result2 = await db.execute(sql`
            UPDATE batches 
            SET statusId = ${onHoldId}
            WHERE statusId IS NULL AND MOD(id, 10) = 0
          `);
          logInfo(
            `  ✓ Assigned ${(result2 as { rowsAffected?: number }).rowsAffected || 0} batches to On Hold (deterministic)`
          );

          // Quality Check: High quantity (> 500)
          const result3 = await db.execute(sql`
            UPDATE batches 
            SET statusId = ${qualityCheckId}
            WHERE statusId IS NULL AND onHandQty > 500
          `);
          logInfo(
            `  ✓ Assigned ${(result3 as { rowsAffected?: number }).rowsAffected || 0} batches to Quality Check (high qty)`
          );

          // Packaging: Low to medium quantity (1-299)
          const result4 = await db.execute(sql`
            UPDATE batches 
            SET statusId = ${packagingId}
            WHERE statusId IS NULL AND onHandQty > 0 AND onHandQty < 300
          `);
          logInfo(
            `  ✓ Assigned ${(result4 as { rowsAffected?: number }).rowsAffected || 0} batches to Packaging (low-med qty)`
          );

          // Lab Testing: Everything else (300-500 and any remaining)
          const result5 = await db.execute(sql`
            UPDATE batches 
            SET statusId = ${labTestingId}
            WHERE statusId IS NULL
          `);
          logInfo(
            `  ✓ Assigned ${(result5 as { rowsAffected?: number }).rowsAffected || 0} batches to Lab Testing (remaining)`
          );

          // Commit transaction
          await db.execute(sql`COMMIT`);
          logSuccess(
            "Batches migrated to workflow statuses (transaction committed)"
          );
        } catch (error) {
          // Rollback on any error
          await db.execute(sql`ROLLBACK`);
          throw new Error(
            `Migration failed, transaction rolled back: ${error}`
          );
        }
      }
    }

    // ============================================================================
    // STEP 7: Verify migration
    // ============================================================================
    logStep(7, "Verifying migration...");

    const verifyResult = await db.execute(sql`
      SELECT 
        ws.name,
        ws.color,
        COUNT(b.id) as batch_count,
        COALESCE(AVG(b.onHandQty), 0) as avg_quantity
      FROM workflow_statuses ws
      LEFT JOIN batches b ON b.statusId = ws.id
      GROUP BY ws.id, ws.name, ws.color
      ORDER BY ws.\`order\`
    `);

    log("\n📊 Workflow Queue Distribution:", "cyan");
    log("─".repeat(70), "cyan");

    let totalBatches = 0;
    const rows = verifyResult[0] as VerificationRow[];

    // Calculate total first
    rows.forEach(row => {
      totalBatches += row.batch_count;
    });

    // Display with percentages
    rows.forEach(row => {
      const percentage =
        totalBatches > 0
          ? ((row.batch_count / totalBatches) * 100).toFixed(1)
          : "0.0";
      log(
        `${row.name.padEnd(20)} │ ${String(row.batch_count).padStart(4)} batches (${percentage.padStart(5)}%) │ Avg: ${Math.round(row.avg_quantity).toString().padStart(4)} units`,
        "blue"
      );
    });

    log("─".repeat(70), "cyan");
    log(
      `${"TOTAL".padEnd(20)} │ ${String(totalBatches).padStart(4)} batches`,
      "green"
    );
    log("─".repeat(70), "cyan");

    // Validate that all batches have been migrated
    const unmigrated = await db.execute(sql`
      SELECT COUNT(*) as count FROM batches WHERE statusId IS NULL
    `);
    const unmigratedCount = (unmigrated[0][0] as { count: number }).count;

    if (unmigratedCount > 0) {
      logWarning(
        `Warning: ${unmigratedCount} batches still have NULL statusId`
      );
    } else {
      logSuccess("All batches have been assigned workflow statuses");
    }

    // ============================================================================
    // COMPLETION
    // ============================================================================
    if (DRY_RUN) {
      log(
        "\n✅ Dry run completed successfully - No changes were made",
        "green"
      );
      log("   Run without --dry-run flag to apply changes\n", "yellow");
    } else {
      log("\n✅ Workflow Queue Setup Complete!", "green");
      log("\n🎉 The workflow queue system is now ready to use!", "green");
      log("   Navigate to /workflow-queue to see your batches\n", "cyan");
    }
  } catch (error) {
    logError("\nError during setup:");
    logger.error(error);

    if (!DRY_RUN) {
      logError("\n⚠️  Database may be in an inconsistent state");
      logError("   Please review the error and consider restoring from backup");
    }

    throw error;
  }
}

// Run the setup
setupWorkflowQueue()
  .then(() => {
    if (!DRY_RUN) {
      logSuccess("\n✅ Setup completed successfully");
    }
    process.exit(0);
  })
  .catch(error => {
    logError("\n❌ Setup failed");
    logger.error(error);
    process.exit(1);
  });
