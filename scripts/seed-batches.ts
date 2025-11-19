import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== SEEDING LOTS & BATCHES ===\n");

async function seedBatchesAndLots() {
  try {
    // Phase 1: Verify prerequisites
    console.log("📋 Phase 1: Verifying prerequisites...");

    const tablesResult = await db.execute(sql`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'defaultdb' 
      AND TABLE_NAME IN ('lots', 'batches', 'products', 'vendors')
    `);
    const tables = (tablesResult[0] as { TABLE_NAME: string }[]).map(
      t => t.TABLE_NAME
    );
    console.log(
      `✓ Found ${tables.length}/4 required tables: ${tables.join(", ")}\n`
    );

    // Get existing data
    const productsResult = await db.execute(
      sql`SELECT id, nameCanonical FROM products LIMIT 30`
    );
    const products = productsResult[0] as {
      id: number;
      nameCanonical: string;
    }[];

    const vendorsResult = await db.execute(sql`SELECT id FROM vendors LIMIT 1`);
    const vendors = vendorsResult[0] as { id: number }[];

    console.log(`✓ Found ${products.length} products`);
    console.log(`✓ Found ${vendors.length} vendors\n`);

    if (products.length === 0) {
      console.error("❌ No products found");
      process.exit(1);
    }

    if (vendors.length === 0) {
      console.error("❌ No vendors found");
      process.exit(1);
    }

    const vendorId = vendors[0].id;

    // Phase 2: Seed Lots
    console.log("📦 Phase 2: Seeding lots...");

    const lotCount = 30; // Create 30 lots
    const createdLots: number[] = [];

    for (let i = 0; i < lotCount; i++) {
      const lotCode = `LOT-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`;

      // Random date in past 180 days
      const daysAgo = Math.floor(Math.random() * 180);
      const lotDate = new Date();
      lotDate.setDate(lotDate.getDate() - daysAgo);

      await db.execute(sql`
        INSERT INTO lots (
          code,
          vendorId,
          date,
          notes
        ) VALUES (
          ${lotCode},
          ${vendorId},
          ${lotDate.toISOString().split("T")[0]},
          ${"Seeded lot for testing"}
        )
      `);

      const lotIdResult = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const lotId = (lotIdResult[0] as { id: number }[])[0].id;
      createdLots.push(lotId);
    }

    console.log(`✓ Created ${lotCount} lots\n`);

    // Phase 3: Seed Batches
    console.log("📦 Phase 3: Seeding batches...");

    const batchStatuses = [
      "LIVE",
      "LIVE",
      "LIVE",
      "LIVE",
      "ON_HOLD",
      "AWAITING_INTAKE",
    ];
    const batchCount = 25; // Target 25 batches
    const createdBatches: number[] = [];

    for (let i = 0; i < batchCount; i++) {
      const product = products[i % products.length];
      const lotId = createdLots[i % createdLots.length];
      const status = batchStatuses[i % batchStatuses.length];

      // Generate unique codes
      const batchCode = `BATCH-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`;
      const sku = `SKU-${product.id}-${String(i + 1).padStart(3, "0")}`;

      // Random quantities
      const onHandQty = 50 + Math.floor(Math.random() * 450); // 50-500 units
      const sampleQty = Math.floor(onHandQty * 0.05); // 5% samples

      // Random COGS ($5-$50 per unit)
      const unitCogs = (5 + Math.random() * 45).toFixed(2);

      // Insert batch
      await db.execute(sql`
        INSERT INTO batches (
          code,
          sku,
          productId,
          lotId,
          batchStatus,
          cogsMode,
          unitCogs,
          paymentTerms,
          onHandQty,
          sampleQty,
          reservedQty,
          quarantineQty,
          holdQty,
          defectiveQty,
          publishEcom,
          publishB2b
        ) VALUES (
          ${batchCode},
          ${sku},
          ${product.id},
          ${lotId},
          ${status},
          'FIXED',
          ${unitCogs},
          'NET_30',
          ${onHandQty},
          ${sampleQty},
          0,
          0,
          0,
          0,
          1,
          1
        )
      `);

      const batchIdResult = await db.execute(
        sql`SELECT LAST_INSERT_ID() as id`
      );
      const batchId = (batchIdResult[0] as { id: number }[])[0].id;
      createdBatches.push(batchId);
    }

    console.log(`✓ Created ${batchCount} batches\n`);

    // Phase 4: Validation
    console.log("✅ Phase 4: Validating seeded data...");

    const lotsCount = await db.execute(sql`SELECT COUNT(*) as count FROM lots`);
    const batchesCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM batches`
    );
    const statusDist = await db.execute(sql`
      SELECT batchStatus, COUNT(*) as count 
      FROM batches 
      GROUP BY batchStatus
    `);

    console.log("📊 Summary:");
    console.log(
      `  - Total Lots: ${(lotsCount[0] as { count: number }[])[0].count}`
    );
    console.log(
      `  - Total Batches: ${(batchesCount[0] as { count: number }[])[0].count}`
    );
    console.log("\n📈 Batches by Status:");
    (statusDist[0] as { batchStatus: string; count: number }[]).forEach(row => {
      console.log(`  - ${row.batchStatus}: ${row.count}`);
    });

    // Show sample batches
    const sampleBatches = await db.execute(sql`
      SELECT b.id, b.code, b.sku, b.batchStatus, b.onHandQty, b.unitCogs
      FROM batches b
      LIMIT 5
    `);
    console.log("\n📦 Sample Batches:");
    (
      sampleBatches[0] as {
        id: number;
        code: string;
        sku: string;
        batchStatus: string;
        onHandQty: number;
        unitCogs: string;
      }[]
    ).forEach(batch => {
      console.log(
        `  - ${batch.code}: ${batch.onHandQty} units @ $${batch.unitCogs} (${batch.batchStatus})`
      );
    });
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedBatchesAndLots();
