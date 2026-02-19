/**
 * Production-Safe Workflow Queue Setup Script
 *
 * This script safely sets up the workflow queue system in production:
 * 1. Creates workflow_statuses table (if not exists)
 * 2. Creates batch_status_history table (if not exists)
 * 3. Adds statusId column to batches table (if not exists)
 * 4. Seeds default workflow statuses (if not exists)
 * 5. Migrates existing batches to workflow statuses
 *
 * Safe to run multiple times - will skip steps that are already complete.
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../_core/logger";

async function setupWorkflowQueue() {
  const db = getDb();

  logger.info("🚀 Starting Workflow Queue Production Setup...\n");

  try {
    // Step 1: Create workflow_statuses table
    logger.info("📋 Step 1: Creating workflow_statuses table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS workflow_statuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
        \`order\` INT NOT NULL DEFAULT 0,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_name (name),
        INDEX idx_order (\`order\`),
        INDEX idx_active (isActive)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    logger.info("✅ workflow_statuses table ready\n");

    // Step 2: Create batch_status_history table
    logger.info("📋 Step 2: Creating batch_status_history table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS batch_status_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batchId INT NOT NULL,
        fromStatusId INT,
        toStatusId INT NOT NULL,
        changedBy INT,
        notes TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_batch (batchId),
        INDEX idx_created (createdAt),
        FOREIGN KEY (batchId) REFERENCES batches(id) ON DELETE CASCADE,
        FOREIGN KEY (fromStatusId) REFERENCES workflow_statuses(id) ON DELETE SET NULL,
        FOREIGN KEY (toStatusId) REFERENCES workflow_statuses(id) ON DELETE CASCADE,
        FOREIGN KEY (changedBy) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    logger.info("✅ batch_status_history table ready\n");

    // Step 3: Add statusId column to batches table
    logger.info("📋 Step 3: Adding statusId column to batches table...");
    try {
      await db.execute(sql`
        ALTER TABLE batches 
        ADD COLUMN statusId INT AFTER batchStatus,
        ADD FOREIGN KEY (statusId) REFERENCES workflow_statuses(id) ON DELETE SET NULL;
      `);
      logger.info("✅ statusId column added to batches table\n");
    } catch (error) {
      if (
        error instanceof Error
          ? error.message
          : String(error)?.includes("Duplicate column")
      ) {
        logger.info("ℹ️  statusId column already exists, skipping\n");
      } else {
        throw error;
      }
    }

    // Step 4: Seed default workflow statuses
    logger.info("📋 Step 4: Seeding default workflow statuses...");

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

    for (const status of defaultStatuses) {
      try {
        await db.execute(sql`
          INSERT INTO workflow_statuses (name, description, color, \`order\`)
          VALUES (${status.name}, ${status.description}, ${status.color}, ${status.order})
          ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            color = VALUES(color),
            \`order\` = VALUES(\`order\`);
        `);
        logger.info(`  ✓ ${status.name}`);
      } catch (error) {
        logger.warn(`  ⚠️  ${status.name} - ${error.message}`);
      }
    }
    logger.info("✅ Default workflow statuses seeded\n");

    // Step 5: Migrate existing batches to workflow statuses
    logger.info(
      "📋 Step 5: Migrating existing batches to workflow statuses..."
    );

    // Get status IDs
    const statusMap = await db.execute(
      sql`SELECT id, name FROM workflow_statuses`
    );
    const statuses = statusMap.rows as Array<{ id: number; name: string }>;

    const qualityCheckId = statuses.find(s => s.name === "Quality Check")?.id;
    const labTestingId = statuses.find(s => s.name === "Lab Testing")?.id;
    const packagingId = statuses.find(s => s.name === "Packaging")?.id;
    const readyForSaleId = statuses.find(s => s.name === "Ready for Sale")?.id;
    const onHoldId = statuses.find(s => s.name === "On Hold")?.id;

    if (
      !qualityCheckId ||
      !labTestingId ||
      !packagingId ||
      !readyForSaleId ||
      !onHoldId
    ) {
      throw new Error("Failed to find all required workflow statuses");
    }

    // Count batches that need migration
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM batches WHERE statusId IS NULL
    `);
    const batchesToMigrate = (countResult.rows[0] as { count: number }).count;

    if (batchesToMigrate === 0) {
      logger.info("ℹ️  All batches already have workflow statuses assigned\n");
    } else {
      logger.info(`  Found ${batchesToMigrate} batches to migrate`);

      // Migrate batches based on quantity (intelligent distribution)
      // Ready for Sale: 0 quantity (sold out)
      await db.execute(sql`
        UPDATE batches 
        SET statusId = ${readyForSaleId}
        WHERE statusId IS NULL AND onHandQty = 0
      `);

      // On Hold: Random 10% of remaining batches
      await db.execute(sql`
        UPDATE batches 
        SET statusId = ${onHoldId}
        WHERE statusId IS NULL AND RAND() < 0.1
      `);

      // Quality Check: High quantity (> 500)
      await db.execute(sql`
        UPDATE batches 
        SET statusId = ${qualityCheckId}
        WHERE statusId IS NULL AND onHandQty > 500
      `);

      // Packaging: Low to medium quantity (< 500)
      await db.execute(sql`
        UPDATE batches 
        SET statusId = ${packagingId}
        WHERE statusId IS NULL AND onHandQty > 0 AND onHandQty < 300
      `);

      // Lab Testing: Everything else
      await db.execute(sql`
        UPDATE batches 
        SET statusId = ${labTestingId}
        WHERE statusId IS NULL
      `);

      logger.info("✅ Batches migrated to workflow statuses\n");
    }

    // Step 6: Verify migration
    logger.info("📋 Step 6: Verifying migration...");
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

    logger.info("\n📊 Workflow Queue Distribution:");
    logger.info("─".repeat(60));

    let totalBatches = 0;
    for (const row of verifyResult.rows as Array<{
      name: string;
      color: string;
      batch_count: number;
      avg_quantity: number;
    }>) {
      const _percentage =
        totalBatches > 0
          ? ((row.batch_count / totalBatches) * 100).toFixed(1)
          : "0.0";
      logger.info(
        `${row.name.padEnd(20)} │ ${String(row.batch_count).padStart(4)} batches │ Avg: ${Math.round(row.avg_quantity).toString().padStart(4)} units`
      );
      totalBatches += row.batch_count;
    }

    logger.info("─".repeat(60));
    logger.info(
      `${"TOTAL".padEnd(20)} │ ${String(totalBatches).padStart(4)} batches`
    );
    logger.info("─".repeat(60));

    logger.info("\n✅ Workflow Queue Setup Complete!");
    logger.info("\n🎉 The workflow queue system is now ready to use!");
    logger.info("   Navigate to /workflow-queue to see your batches\n");
  } catch (error) {
    console.error("\n❌ Error during setup:", error);
    throw error;
  }
}

// Run the setup
setupWorkflowQueue()
  .then(() => {
    logger.info("✅ Setup completed successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
