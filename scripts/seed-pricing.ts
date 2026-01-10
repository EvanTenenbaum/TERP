import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const connection = await mysql.createConnection({
  uri: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const db = drizzle(connection);

console.log("🌱 Starting DATA-003: Seed Pricing Tables\n");

// Phase 1: Verify schema
console.log("📋 Phase 1: Verifying schema...");
const tablesResult = await db.execute(sql`
  SELECT TABLE_NAME FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = 'defaultdb' 
  AND TABLE_NAME IN ('pricing_profiles', 'pricing_rules', 'pricing_defaults', 'client_price_alerts')
`);
const tables = (tablesResult[0] as { TABLE_NAME: string }[]).map(
  t => t.TABLE_NAME
);
console.log(
  `✓ Found ${tables.length}/4 required tables: ${tables.join(", ")}\n`
);

// Phase 2: Seed Pricing Defaults
async function seedPricingDefaults() {
  console.log("📝 Phase 2: Seeding pricing defaults...");

  // Include all product categories plus "OTHER" fallback used by order creation
  const categories = [
    { productCategory: "Flower", margin: 35.0 },
    { productCategory: "Edibles", margin: 40.0 },
    { productCategory: "Concentrates", margin: 45.0 },
    { productCategory: "Vapes", margin: 38.0 },
    { productCategory: "Pre-Rolls", margin: 35.0 },
    { productCategory: "Accessories", margin: 50.0 },
    { productCategory: "Topicals", margin: 42.0 },
    { productCategory: "Tinctures", margin: 40.0 },
    // CRITICAL: "OTHER" is used by orders.ts as fallback category
    { productCategory: "OTHER", margin: 30.0 },
    // Additional common categories
    { productCategory: "Seeds", margin: 45.0 },
    { productCategory: "Beverages", margin: 35.0 },
    { productCategory: "DEFAULT", margin: 30.0 },
  ];

  let count = 0;
  for (const cat of categories) {
    await db.execute(sql`
      INSERT INTO pricing_defaults (product_category, default_margin_percent)
      VALUES (${cat.productCategory}, ${cat.margin})
      ON DUPLICATE KEY UPDATE default_margin_percent = ${cat.margin}
    `);
    count++;
  }

  console.log(`✓ Seeded ${count} pricing defaults\n`);
}

// Phase 3: Seed Pricing Profiles
async function seedPricingProfiles() {
  console.log("📝 Phase 3: Seeding pricing profiles...");

  // Get a user to assign as creator
  const usersResult = await db.execute(sql`SELECT id FROM users LIMIT 1`);
  const userId =
    usersResult[0] && (usersResult[0] as { id: number }[]).length > 0
      ? (usersResult[0] as { id: number }[])[0].id
      : null;

  const profiles = [
    {
      name: "Retail Standard",
      description: "Standard retail pricing with 35% margin",
      rules: JSON.stringify({
        baseMargin: 35,
        volumeDiscounts: false,
        loyaltyDiscount: 0,
      }),
    },
    {
      name: "Wholesale Tier 1",
      description: "Wholesale pricing for orders $1000+",
      rules: JSON.stringify({
        baseMargin: 25,
        minimumOrder: 1000,
        volumeDiscounts: true,
      }),
    },
    {
      name: "Wholesale Tier 2",
      description: "Wholesale pricing for orders $5000+",
      rules: JSON.stringify({
        baseMargin: 20,
        minimumOrder: 5000,
        volumeDiscounts: true,
      }),
    },
    {
      name: "VIP Customer",
      description: "Special pricing for VIP customers",
      rules: JSON.stringify({
        baseMargin: 30,
        loyaltyDiscount: 5,
        freeShipping: true,
      }),
    },
    {
      name: "Medical Discount",
      description: "Medical patient pricing with reduced margins",
      rules: JSON.stringify({
        baseMargin: 28,
        medicalDiscount: 10,
        taxExempt: true,
      }),
    },
  ];

  let count = 0;
  for (const profile of profiles) {
    await db.execute(sql`
      INSERT INTO pricing_profiles (name, description, rules, created_by)
      VALUES (${profile.name}, ${profile.description}, ${profile.rules}, ${userId})
    `);
    count++;
  }

  console.log(`✓ Seeded ${count} pricing profiles\n`);
}

// Phase 4: Seed Pricing Rules
async function seedPricingRules() {
  console.log("📝 Phase 4: Seeding pricing rules...");

  const rules = [
    {
      name: "Bulk Discount - 10+ units",
      description: "5% discount for orders of 10 or more units",
      adjustment_type: "PERCENT_MARKDOWN",
      adjustment_value: 5.0,
      conditions: JSON.stringify({
        minQuantity: 10,
      }),
      priority: 10,
    },
    {
      name: "Bulk Discount - 50+ units",
      description: "10% discount for orders of 50 or more units",
      adjustment_type: "PERCENT_MARKDOWN",
      adjustment_value: 10.0,
      conditions: JSON.stringify({
        minQuantity: 50,
      }),
      priority: 20,
    },
    {
      name: "Bulk Discount - 100+ units",
      description: "15% discount for orders of 100 or more units",
      adjustment_type: "PERCENT_MARKDOWN",
      adjustment_value: 15.0,
      conditions: JSON.stringify({
        minQuantity: 100,
      }),
      priority: 30,
    },
    {
      name: "Premium Product Markup",
      description: "Additional 10% markup for premium products",
      adjustment_type: "PERCENT_MARKUP",
      adjustment_value: 10.0,
      conditions: JSON.stringify({
        tags: ["premium", "craft"],
      }),
      priority: 5,
    },
    {
      name: "Clearance Markdown",
      description: "$5 off clearance items",
      adjustment_type: "DOLLAR_MARKDOWN",
      adjustment_value: 5.0,
      conditions: JSON.stringify({
        tags: ["clearance", "discontinued"],
      }),
      priority: 15,
    },
    {
      name: "New Product Premium",
      description: "$2 markup for new releases",
      adjustment_type: "DOLLAR_MARKUP",
      adjustment_value: 2.0,
      conditions: JSON.stringify({
        tags: ["new", "limited-edition"],
      }),
      priority: 8,
    },
    {
      name: "Loyalty Member Discount",
      description: "3% discount for loyalty program members",
      adjustment_type: "PERCENT_MARKDOWN",
      adjustment_value: 3.0,
      conditions: JSON.stringify({
        customerType: "loyalty_member",
      }),
      priority: 12,
    },
    {
      name: "Medical Patient Discount",
      description: "10% discount for medical patients",
      adjustment_type: "PERCENT_MARKDOWN",
      adjustment_value: 10.0,
      conditions: JSON.stringify({
        customerType: "medical",
      }),
      priority: 25,
    },
  ];

  let count = 0;
  for (const rule of rules) {
    await db.execute(sql`
      INSERT INTO pricing_rules (name, description, adjustment_type, adjustment_value, conditions, priority, is_active)
      VALUES (${rule.name}, ${rule.description}, ${rule.adjustment_type}, ${rule.adjustment_value}, ${rule.conditions}, ${rule.priority}, 1)
    `);
    count++;
  }

  console.log(`✓ Seeded ${count} pricing rules\n`);
}

// Phase 5: Seed Client Price Alerts
async function seedClientPriceAlerts() {
  console.log("📝 Phase 5: Seeding client price alerts...");

  // Get some clients and batches
  const clientsResult = await db.execute(sql`SELECT id FROM clients LIMIT 10`);
  const clients = (clientsResult[0] as { id: number }[]).map(c => c.id);

  const batchesResult = await db.execute(sql`SELECT id FROM batches LIMIT 20`);
  const batches = (batchesResult[0] as { id: number }[]).map(b => b.id);

  if (clients.length === 0 || batches.length === 0) {
    console.log("⚠️  No clients or batches found, skipping price alerts\n");
    return;
  }

  let count = 0;
  // Create 15 random price alerts
  for (let i = 0; i < Math.min(15, clients.length * 2); i++) {
    const clientId = clients[i % clients.length];
    const batchId = batches[i % batches.length];
    const targetPrice = (Math.random() * 50 + 10).toFixed(2); // Random price between $10-$60

    // Set expiration 30-90 days from now
    const daysUntilExpiry = Math.floor(Math.random() * 60) + 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysUntilExpiry);

    await db.execute(sql`
      INSERT INTO client_price_alerts (client_id, batch_id, target_price, active, expires_at)
      VALUES (${clientId}, ${batchId}, ${targetPrice}, 1, ${expiresAt.toISOString().slice(0, 19).replace("T", " ")})
    `);
    count++;
  }

  console.log(`✓ Seeded ${count} client price alerts\n`);
}

// Execute seeding
try {
  await seedPricingDefaults();
  await seedPricingProfiles();
  await seedPricingRules();
  await seedClientPriceAlerts();

  console.log("✅ DATA-003 seeding completed successfully!\n");

  // Summary
  const defaultsCount = await db.execute(
    sql`SELECT COUNT(*) as count FROM pricing_defaults`
  );
  const profilesCount = await db.execute(
    sql`SELECT COUNT(*) as count FROM pricing_profiles`
  );
  const rulesCount = await db.execute(
    sql`SELECT COUNT(*) as count FROM pricing_rules`
  );
  const alertsCount = await db.execute(
    sql`SELECT COUNT(*) as count FROM client_price_alerts`
  );

  console.log("📊 Summary:");
  console.log(
    `  - Pricing Defaults: ${(defaultsCount[0] as { count: number }[])[0].count}`
  );
  console.log(
    `  - Pricing Profiles: ${(profilesCount[0] as { count: number }[])[0].count}`
  );
  console.log(
    `  - Pricing Rules: ${(rulesCount[0] as { count: number }[])[0].count}`
  );
  console.log(
    `  - Client Price Alerts: ${(alertsCount[0] as { count: number }[])[0].count}`
  );
} catch (error) {
  console.error("❌ Error during seeding:", error);
  process.exit(1);
} finally {
  await connection.end();
}
