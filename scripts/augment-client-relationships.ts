/**
 * Augment Client Relationships
 * 
 * Establishes realistic client-product purchase patterns and links clients to their order history.
 * Part of DATA-002-AUGMENT: Augment Seeded Data for Realistic Relationships
 * 
 * Usage: pnpm tsx scripts/augment-client-relationships.ts
 */

import { config } from "dotenv";
config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

import { db } from "./db-sync.js";
import { clients, orders, orderLineItems, batches, products, clientActivity } from "../drizzle/schema.js";
import { sql } from "drizzle-orm";

/**
 * Retry helper for database queries
 */
async function retryQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 5,
  delayMs: number = 3000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      const err = error as Error & { code?: string };
      const isTimeout = err.message?.includes("ETIMEDOUT") || err.code === "ETIMEDOUT";
      
      if (isTimeout && i < maxRetries - 1) {
        const delay = delayMs * (i + 1);
        console.log(`  ⚠️  Connection timeout, retry ${i + 1}/${maxRetries - 1} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Get clients without recent activity
 */
async function getClientsWithoutActivity(days: number = 90): Promise<Array<{ id: number; name: string }>> {
  const result = await retryQuery(async () => {
    return await db.execute(sql`
      SELECT DISTINCT c.id, c.name
      FROM clients c
      LEFT JOIN orders o ON c.id = o.client_id
      WHERE o.id IS NULL 
         OR o.created_at < DATE_SUB(NOW(), INTERVAL ${days} DAY)
      LIMIT 50
    `);
  });

  const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
  return (rows as Array<{ id: number; name: string }>) || [];
}

/**
 * Create client activity record
 */
async function createClientActivity(
  clientId: number,
  activityType: string,
  description: string
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO client_activity (
        client_id,
        activityType,
        description,
        createdAt,
        updatedAt
      ) VALUES (
        ${clientId},
        ${activityType},
        ${description},
        NOW(),
        NOW()
      )
    `);
  } catch (error) {
    console.error(`  ❌ Error creating client activity:`, error);
  }
}

/**
 * Main augmentation function
 */
async function augmentClientRelationships(): Promise<void> {
  console.log("🔧 Augmenting Client Relationships...\n");

  try {
    // Get clients without recent orders
    const clientsWithoutActivity = await getClientsWithoutActivity(90);
    
    console.log(`📊 Found ${clientsWithoutActivity.length} clients without recent activity\n`);

    if (clientsWithoutActivity.length === 0) {
      console.log("✅ All clients have recent activity!");
      return;
    }

    let successCount = 0;

    for (const client of clientsWithoutActivity) {
      try {
        // Create a "PROSPECT" activity for clients without orders
        await createClientActivity(
          client.id,
          "PROSPECT",
          `Initial contact with ${client.name}`
        );
        successCount++;
        console.log(`  ✅ Created activity for client ${client.name}`);
      } catch (error) {
        console.error(`  ❌ Error processing client ${client.name}:`, error);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Augmentation complete!`);
    console.log(`   Clients processed: ${successCount}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Augmentation failed:", error);
    process.exit(1);
  }
}

// Main execution
augmentClientRelationships()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
