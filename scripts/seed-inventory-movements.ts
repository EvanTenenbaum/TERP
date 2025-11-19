import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== SEEDING INVENTORY MOVEMENTS ===\n");

async function seedInventoryMovements() {
  try {
    // Phase 1: Verify prerequisites
    console.log("📋 Phase 1: Verifying prerequisites...");

    const tablesResult = await db.execute(sql`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'defaultdb' 
      AND TABLE_NAME IN ('inventoryMovements', 'batches', 'users', 'orders')
    `);
    const tables = (tablesResult[0] as { TABLE_NAME: string }[]).map(
      t => t.TABLE_NAME
    );
    console.log(
      `✓ Found ${tables.length}/4 required tables: ${tables.join(", ")}\n`
    );

    // Get existing data
    const batchesResult = await db.execute(sql`
      SELECT id, onHandQty 
      FROM batches 
      WHERE batchStatus = 'LIVE'
      LIMIT 25
    `);
    const batches = batchesResult[0] as { id: number; onHandQty: number }[];

    const usersResult = await db.execute(sql`SELECT id FROM users LIMIT 5`);
    const users = usersResult[0] as { id: number }[];

    const ordersResult = await db.execute(sql`SELECT id FROM orders LIMIT 25`);
    const orders = ordersResult[0] as { id: number }[];

    console.log(`✓ Found ${batches.length} batches`);
    console.log(`✓ Found ${users.length} users`);
    console.log(`✓ Found ${orders.length} orders\n`);

    if (batches.length === 0 || users.length === 0) {
      console.error("❌ Missing required data");
      process.exit(1);
    }

    // Phase 2: Seed Inventory Movements
    console.log("📦 Phase 2: Seeding inventory movements...");

    const movementTypes = [
      "INTAKE",
      "SALE",
      "ADJUSTMENT",
      "SAMPLE",
      "TRANSFER",
    ];
    const movementCount = 50; // Target 50 movements
    const createdMovements: number[] = [];

    for (let i = 0; i < movementCount; i++) {
      const batch = batches[i % batches.length];
      const user = users[i % users.length];
      const movementType = movementTypes[i % movementTypes.length];

      // Random date in past 90 days
      const daysAgo = Math.floor(Math.random() * 90);
      const movementDate = new Date();
      movementDate.setDate(movementDate.getDate() - daysAgo);

      // Calculate quantities based on movement type
      let quantityChange: number;
      let quantityBefore: number;
      let quantityAfter: number;
      let referenceType: string | null = null;
      let referenceId: number | null = null;
      let reason: string;

      // Simulate current quantity (use batch onHandQty as baseline)
      const currentQty = batch.onHandQty;

      switch (movementType) {
        case "INTAKE":
          // Positive change (receiving inventory)
          quantityChange = 50 + Math.floor(Math.random() * 200); // 50-250 units
          quantityBefore = Math.max(0, currentQty - quantityChange);
          quantityAfter = currentQty;
          reason = "Received from vendor";
          break;

        case "SALE":
          // Negative change (selling inventory)
          quantityChange = -(1 + Math.floor(Math.random() * 20)); // -1 to -20 units
          quantityBefore = currentQty - quantityChange;
          quantityAfter = currentQty;
          referenceType = "Order";
          referenceId = orders.length > 0 ? orders[i % orders.length].id : null;
          reason = "Sold to customer";
          break;

        case "ADJUSTMENT":
          // Can be positive or negative
          quantityChange =
            Math.random() > 0.5
              ? Math.floor(Math.random() * 10) + 1
              : -(Math.floor(Math.random() * 10) + 1);
          quantityBefore = currentQty - quantityChange;
          quantityAfter = currentQty;
          reason =
            quantityChange > 0
              ? "Inventory count correction (found extra)"
              : "Inventory count correction (shrinkage)";
          break;

        case "SAMPLE":
          // Negative change (samples given out)
          quantityChange = -(1 + Math.floor(Math.random() * 5)); // -1 to -5 units
          quantityBefore = currentQty - quantityChange;
          quantityAfter = currentQty;
          reason = "Sample provided to customer";
          break;

        case "TRANSFER":
          // Negative change (transferred to another location/batch)
          quantityChange = -(5 + Math.floor(Math.random() * 15)); // -5 to -20 units
          quantityBefore = currentQty - quantityChange;
          quantityAfter = currentQty;
          reason = "Transferred to another location";
          break;

        default:
          quantityChange = 0;
          quantityBefore = currentQty;
          quantityAfter = currentQty;
          reason = "Unknown";
      }

      // Insert movement
      await db.execute(sql`
        INSERT INTO inventoryMovements (
          batchId,
          inventoryMovementType,
          quantityChange,
          quantityBefore,
          quantityAfter,
          referenceType,
          referenceId,
          reason,
          performedBy,
          createdAt
        ) VALUES (
          ${batch.id},
          ${movementType},
          ${quantityChange.toString()},
          ${quantityBefore.toString()},
          ${quantityAfter.toString()},
          ${referenceType},
          ${referenceId},
          ${reason},
          ${user.id},
          ${movementDate.toISOString().slice(0, 19).replace("T", " ")}
        )
      `);

      const movementIdResult = await db.execute(
        sql`SELECT LAST_INSERT_ID() as id`
      );
      const movementId = (movementIdResult[0] as { id: number }[])[0].id;
      createdMovements.push(movementId);
    }

    console.log(`✓ Created ${movementCount} inventory movements\n`);

    // Phase 3: Validation
    console.log("✅ Phase 3: Validating seeded data...");

    const movementsCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM inventoryMovements`
    );

    const typeDist = await db.execute(sql`
      SELECT inventoryMovementType, COUNT(*) as count 
      FROM inventoryMovements 
      GROUP BY inventoryMovementType
    `);

    console.log("📊 Summary:");
    console.log(
      `  - Total Movements: ${(movementsCount[0] as { count: number }[])[0].count}`
    );

    console.log("\n📈 Movements by Type:");
    (typeDist[0] as { inventoryMovementType: string; count: number }[]).forEach(
      row => {
        console.log(`  - ${row.inventoryMovementType}: ${row.count}`);
      }
    );

    // Show sample movements
    const sampleMovements = await db.execute(sql`
      SELECT 
        im.id,
        im.inventoryMovementType,
        im.quantityChange,
        im.reason,
        b.code as batch_code
      FROM inventoryMovements im
      JOIN batches b ON im.batchId = b.id
      LIMIT 5
    `);
    console.log("\n📦 Sample Movements:");
    (
      sampleMovements[0] as {
        id: number;
        inventoryMovementType: string;
        quantityChange: string;
        reason: string;
        batch_code: string;
      }[]
    ).forEach(movement => {
      console.log(
        `  - ${movement.batch_code}: ${movement.inventoryMovementType} (${movement.quantityChange > "0" ? "+" : ""}${movement.quantityChange}) - ${movement.reason}`
      );
    });
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedInventoryMovements();
