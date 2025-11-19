import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== SEEDING CLIENT PRICE ALERTS ===\n");

async function seedPriceAlerts() {
  try {
    // Phase 1: Verify prerequisites
    console.log("📋 Phase 1: Verifying prerequisites...");

    const tablesResult = await db.execute(sql`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'defaultdb' 
      AND TABLE_NAME IN ('client_price_alerts', 'clients', 'batches')
    `);
    const tables = (tablesResult[0] as { TABLE_NAME: string }[]).map(
      t => t.TABLE_NAME
    );
    console.log(
      `✓ Found ${tables.length}/3 required tables: ${tables.join(", ")}\n`
    );

    // Get existing data
    const clientsResult = await db.execute(
      sql`SELECT id FROM clients LIMIT 30`
    );
    const clients = clientsResult[0] as { id: number }[];

    const batchesResult = await db.execute(sql`
      SELECT b.id, b.unitCogs 
      FROM batches b 
      WHERE b.batchStatus = 'LIVE'
      LIMIT 25
    `);
    const batches = batchesResult[0] as { id: number; unitCogs: string }[];

    console.log(`✓ Found ${clients.length} clients`);
    console.log(`✓ Found ${batches.length} batches\n`);

    if (clients.length === 0 || batches.length === 0) {
      console.error("❌ Missing required data");
      process.exit(1);
    }

    // Phase 2: Seed Price Alerts
    console.log("📦 Phase 2: Seeding price alerts...");

    const alertCount = 20; // Target 20 alerts
    const createdAlerts: number[] = [];

    for (let i = 0; i < alertCount; i++) {
      const client = clients[i % clients.length];
      const batch = batches[i % batches.length];
      const currentCogs = parseFloat(batch.unitCogs);

      // Set target price (10-30% below current COGS + typical margin)
      // Typical margin is 30-50%, so selling price is COGS * 1.3-1.5
      const typicalSellingPrice = currentCogs * (1.3 + Math.random() * 0.2);
      const discountPercent = 10 + Math.random() * 20; // 10-30% discount
      const targetPrice = typicalSellingPrice * (1 - discountPercent / 100);

      // Random expiration date (30-90 days from now)
      const daysUntilExpiry = 30 + Math.floor(Math.random() * 60);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + daysUntilExpiry);

      // 70% of alerts are active, 30% already triggered
      const isActive = Math.random() > 0.3;
      const triggeredAt = isActive
        ? null
        : new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random time in past 30 days

      await db.execute(sql`
        INSERT INTO client_price_alerts (
          client_id,
          batch_id,
          target_price,
          active,
          triggered_at,
          expires_at
        ) VALUES (
          ${client.id},
          ${batch.id},
          ${targetPrice.toFixed(2)},
          ${isActive ? 1 : 0},
          ${triggeredAt ? triggeredAt.toISOString().slice(0, 19).replace("T", " ") : null},
          ${expiresAt.toISOString().slice(0, 19).replace("T", " ")}
        )
      `);

      const alertIdResult = await db.execute(
        sql`SELECT LAST_INSERT_ID() as id`
      );
      const alertId = (alertIdResult[0] as { id: number }[])[0].id;
      createdAlerts.push(alertId);
    }

    console.log(`✓ Created ${alertCount} price alerts\n`);

    // Phase 3: Validation
    console.log("✅ Phase 3: Validating seeded data...");

    const alertsCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM client_price_alerts`
    );

    const activeCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM client_price_alerts 
      WHERE active = 1
    `);

    const triggeredCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM client_price_alerts 
      WHERE triggered_at IS NOT NULL
    `);

    console.log("📊 Summary:");
    console.log(
      `  - Total Alerts: ${(alertsCount[0] as { count: number }[])[0].count}`
    );
    console.log(
      `  - Active: ${(activeCount[0] as { count: number }[])[0].count}`
    );
    console.log(
      `  - Triggered: ${(triggeredCount[0] as { count: number }[])[0].count}`
    );

    // Show sample alerts
    const sampleAlerts = await db.execute(sql`
      SELECT 
        cpa.id,
        cpa.target_price,
        cpa.active,
        b.code as batch_code,
        b.unitCogs,
        c.id as client_id
      FROM client_price_alerts cpa
      JOIN batches b ON cpa.batch_id = b.id
      JOIN clients c ON cpa.client_id = c.id
      LIMIT 5
    `);
    console.log("\n📦 Sample Price Alerts:");
    (
      sampleAlerts[0] as {
        id: number;
        target_price: string;
        active: number;
        batch_code: string;
        unitCogs: string;
        client_id: number;
      }[]
    ).forEach(alert => {
      const status = alert.active ? "ACTIVE" : "TRIGGERED";
      console.log(
        `  - Client ${alert.client_id} | ${alert.batch_code}: Target $${alert.target_price} (COGS: $${alert.unitCogs}) [${status}]`
      );
    });
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedPriceAlerts();
