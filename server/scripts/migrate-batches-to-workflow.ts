/**
 * Migrate Existing Batches to Workflow Queue
 *
 * This script intelligently assigns workflow statuses to existing batches
 * based on their characteristics (quantity, age, etc.) to create a realistic
 * workflow queue for testing and production use.
 *
 * Distribution Strategy:
 * - Recent batches (< 7 days old) → Intake Queue or Quality Check
 * - Zero quantity batches → Ready for Sale (sold out)
 * - Low quantity (< 100) → Packaging or Ready for Sale
 * - Medium quantity (100-500) → Lab Testing or Packaging
 * - High quantity (> 500) → Quality Check or Lab Testing
 * - Some batches → On Hold (for testing)
 */

import { getDb } from "../db";
import { batches, workflowStatuses } from "../../drizzle/schema";
import { eq, sql, isNull } from "drizzle-orm";
import { logger } from "../_core/logger";

interface WorkflowStatus {
  id: number;
  name: string;
  slug: string;
}

async function migrateBatchesToWorkflow() {
  logger.info("🔄 Starting batch migration to workflow queue...\n");

  const db = await getDb();

  try {
    // 1. Fetch all workflow statuses
    logger.info("📋 Fetching workflow statuses...");
    const statuses = await db
      .select()
      .from(workflowStatuses)
      .where(eq(workflowStatuses.isActive, true));

    if (statuses.length === 0) {
      logger.error(
        "❌ No workflow statuses found. Please run seed script first."
      );
      process.exit(1);
    }

    const statusMap: Record<string, WorkflowStatus> = {};
    statuses.forEach(status => {
      statusMap[status.slug] = status;
    });

    logger.info(`✓ Found ${statuses.length} workflow statuses\n`);

    // 2. Fetch all batches that don't have a workflow status assigned
    logger.info("📦 Fetching batches without workflow status...");
    const batchesToMigrate = await db
      .select({
        id: batches.id,
        code: batches.code,
        onHandQty: batches.onHandQty,
        createdAt: batches.createdAt,
      })
      .from(batches)
      .where(isNull(batches.statusId));

    logger.info(`✓ Found ${batchesToMigrate.length} batches to migrate\n`);

    if (batchesToMigrate.length === 0) {
      logger.info(
        "✨ No batches need migration. All batches already have workflow statuses."
      );
      process.exit(0);
    }

    // 3. Categorize and assign batches to workflow statuses
    logger.info("🎯 Assigning workflow statuses...\n");

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const assignments: Record<string, number[]> = {
      "intake-queue": [],
      "quality-check": [],
      "lab-testing": [],
      packaging: [],
      "ready-for-sale": [],
      "on-hold": [],
    };

    batchesToMigrate.forEach((batch, index) => {
      const qty = parseFloat(batch.onHandQty);
      const isRecent = new Date(batch.createdAt) > sevenDaysAgo;

      // Use index for deterministic distribution
      const rand = index % 100;

      // Assign based on characteristics
      if (isRecent && rand < 15) {
        // 15% of recent batches → Intake Queue
        assignments["intake-queue"].push(batch.id);
      } else if (isRecent && rand < 35) {
        // 20% of recent batches → Quality Check
        assignments["quality-check"].push(batch.id);
      } else if (qty === 0 && rand < 60) {
        // Zero quantity → Ready for Sale (sold out)
        assignments["ready-for-sale"].push(batch.id);
      } else if (qty < 100 && rand < 70) {
        // Low quantity → Packaging
        assignments["packaging"].push(batch.id);
      } else if (qty < 100) {
        // Low quantity → Ready for Sale
        assignments["ready-for-sale"].push(batch.id);
      } else if (qty >= 100 && qty < 500 && rand < 50) {
        // Medium quantity → Lab Testing
        assignments["lab-testing"].push(batch.id);
      } else if (qty >= 100 && qty < 500) {
        // Medium quantity → Packaging
        assignments["packaging"].push(batch.id);
      } else if (qty >= 500 && rand < 40) {
        // High quantity → Quality Check
        assignments["quality-check"].push(batch.id);
      } else if (qty >= 500 && rand < 80) {
        // High quantity → Lab Testing
        assignments["lab-testing"].push(batch.id);
      } else if (rand < 90) {
        // Some → Packaging
        assignments["packaging"].push(batch.id);
      } else {
        // 10% → On Hold (for testing)
        assignments["on-hold"].push(batch.id);
      }
    });

    // 4. Execute updates
    let totalUpdated = 0;

    for (const [slug, batchIds] of Object.entries(assignments)) {
      if (batchIds.length === 0) continue;

      const status = statusMap[slug];
      if (!status) {
        logger.warn(
          `⚠️  Status "${slug}" not found, skipping ${batchIds.length} batches`
        );
        continue;
      }

      logger.info(
        `📝 Assigning ${batchIds.length} batches to "${status.name}"...`
      );

      // Update batches in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < batchIds.length; i += chunkSize) {
        const chunk = batchIds.slice(i, i + chunkSize);

        await db
          .update(batches)
          .set({ statusId: status.id })
          .where(
            sql`id IN (${sql.join(
              chunk.map(id => sql`${id}`),
              sql`, `
            )})`
          );

        totalUpdated += chunk.length;
      }

      logger.info(
        `   ✓ Assigned ${batchIds.length} batches to "${status.name}"`
      );
    }

    // 5. Summary
    logger.info("\n📊 Migration Summary:");
    logger.info("─".repeat(50));

    for (const [slug, batchIds] of Object.entries(assignments)) {
      const status = statusMap[slug];
      if (status && batchIds.length > 0) {
        const percentage = (
          (batchIds.length / batchesToMigrate.length) *
          100
        ).toFixed(1);
        logger.info(
          `   ${status.name.padEnd(20)} ${batchIds.length.toString().padStart(4)} batches (${percentage}%)`
        );
      }
    }

    logger.info("─".repeat(50));
    logger.info(
      `   ${"Total".padEnd(20)} ${totalUpdated.toString().padStart(4)} batches\n`
    );

    // 6. Verify
    logger.info("✅ Verifying migration...");
    const verifyResult = await db
      .select({
        statusId: batches.statusId,
        count: sql<number>`COUNT(*)`,
      })
      .from(batches)
      .groupBy(batches.statusId);

    const withStatus = verifyResult.find(r => r.statusId !== null);
    const withoutStatus = verifyResult.find(r => r.statusId === null);

    logger.info(`   ✓ Batches with workflow status: ${withStatus?.count || 0}`);
    logger.info(
      `   ✓ Batches without workflow status: ${withoutStatus?.count || 0}\n`
    );

    logger.info("✨ Migration complete!\n");
    logger.info("🎯 Next steps:");
    logger.info("   1. Navigate to /workflow-queue to see the workflow board");
    logger.info("   2. Drag and drop batches between statuses");
    logger.info("   3. View the dashboard widgets for an overview");
    logger.info("   4. Check the history tab to see status changes\n");

    process.exit(0);
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateBatchesToWorkflow();
