/**
 * Seed Default Workflow Statuses
 * 
 * Creates the default workflow statuses for the batch queue management system.
 * This should be run once during initial setup or after database reset.
 * 
 * Usage: pnpm tsx server/scripts/seed-workflow-statuses.ts
 */

import { getDb } from "../db";
import { workflowStatuses } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const DEFAULT_STATUSES = [
  {
    name: "Intake Queue",
    slug: "intake-queue",
    color: "#3B82F6", // Blue
    order: 1,
    description: "Newly received batches awaiting initial processing",
  },
  {
    name: "Quality Check",
    slug: "quality-check",
    color: "#F59E0B", // Amber
    order: 2,
    description: "Batches undergoing quality inspection",
  },
  {
    name: "Lab Testing",
    slug: "lab-testing",
    color: "#8B5CF6", // Purple
    order: 3,
    description: "Batches sent for laboratory testing",
  },
  {
    name: "Packaging",
    slug: "packaging",
    color: "#10B981", // Green
    order: 4,
    description: "Batches being packaged for sale",
  },
  {
    name: "Ready for Sale",
    slug: "ready-for-sale",
    color: "#059669", // Emerald
    order: 5,
    description: "Batches ready to be sold to clients",
  },
  {
    name: "On Hold",
    slug: "on-hold",
    color: "#EF4444", // Red
    order: 6,
    description: "Batches temporarily paused or requiring attention",
  },
];

async function seedWorkflowStatuses() {
  console.log("🌱 Seeding default workflow statuses...");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  try {
    let created = 0;
    let skipped = 0;

    for (const status of DEFAULT_STATUSES) {
      // Check if status already exists by slug
      const existing = await db
        .select()
        .from(workflowStatuses)
        .where(eq(workflowStatuses.slug, status.slug))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  Skipping "${status.name}" (already exists)`);
        skipped++;
        continue;
      }

      // Insert new status
      await db.insert(workflowStatuses).values({
        name: status.name,
        slug: status.slug,
        color: status.color,
        order: status.order,
        isActive: 1,
      });

      console.log(`✅ Created "${status.name}"`);
      created++;
    }

    console.log("\n📊 Summary:");
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total:   ${DEFAULT_STATUSES.length}`);
    console.log("\n✨ Seeding complete!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding workflow statuses:", error);
    process.exit(1);
  }
}

// Run the seed function
seedWorkflowStatuses();
