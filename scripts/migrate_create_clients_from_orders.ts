/**
 * Migration Script: Create Clients from Existing Orders
 * 
 * This script extracts unique customer information from existing orders
 * and creates corresponding client records in the clients table.
 * 
 * Safe to run multiple times - checks for existing clients before creating.
 */

import { drizzle } from 'drizzle-orm/mysql2';
import * as mysql from 'mysql2/promise';
import { clients, orders } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

async function migrateCreateClientsFromOrders() {
  console.log("🚀 Starting migration: Create Clients from Orders\n");

  // Create database connection
  let connection: any = null;
  try {
    // Parse DATABASE_URL and configure SSL properly
    const dbUrl = process.env.DATABASE_URL!;
    connection = await mysql.createConnection({
      uri: dbUrl.replace('?ssl=true', ''),
      ssl: { rejectUnauthorized: false }
    });
    const db = drizzle(connection);
    // Step 1: Get all unique customer names from orders
    console.log("📊 Fetching unique customers from orders...");
    
    const uniqueCustomers = await db
      .select({
        customerName: orders.customerName,
        count: sql<number>`count(*)`.as('order_count'),
      })
      .from(orders)
      .where(sql`${orders.customerName} IS NOT NULL AND ${orders.customerName} != ''`)
      .groupBy(orders.customerName);

    console.log(`   ✓ Found ${uniqueCustomers.length} unique customers\n`);

    if (uniqueCustomers.length === 0) {
      console.log("⚠️  No customers found in orders. Nothing to migrate.");
      return;
    }

    // Step 2: Check existing clients
    console.log("🔍 Checking for existing clients...");
    const existingClients = await db.select().from(clients);
    const existingNames = new Set(existingClients.map(c => c.name));
    console.log(`   ✓ Found ${existingClients.length} existing clients\n`);

    // Step 3: Create new clients
    console.log("➕ Creating new client records...");
    let created = 0;
    let skipped = 0;

    for (const customer of uniqueCustomers) {
      const customerName = customer.customerName;
      
      // Skip if client already exists
      if (existingNames.has(customerName)) {
        skipped++;
        continue;
      }

      // Generate TERI code from customer name
      const teriCode = generateTeriCode(customerName, existingClients.length + created + 1);

      // Create client record
      await db.insert(clients).values({
        teriCode,
        name: customerName,
        email: null,
        phone: null,
        address: null,
        isBuyer: true, // All customers from orders are buyers
        isSeller: false,
        isBrand: false,
        isReferee: false,
        isContractor: false,
        creditLimit: "0",
        totalOwed: "0",
        totalPaid: "0",
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      created++;
      
      if (created % 10 === 0) {
        console.log(`   ✓ Created ${created} clients...`);
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   ✓ Created: ${created} new clients`);
    console.log(`   ✓ Skipped: ${skipped} existing clients`);
    console.log(`   ✓ Total clients: ${existingClients.length + created}\n`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    // Close connection
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Generate TERI code from customer name
 * Format: First 3 letters of each word + number
 * Example: "Green Leaf Distributors" -> "GRE-LEA-001"
 */
function generateTeriCode(name: string, index: number): string {
  const words = name.split(' ').filter(w => w.length > 0);
  
  if (words.length === 0) {
    return `CUST-${String(index).padStart(3, '0')}`;
  }

  // Take first 3 letters of first two words
  const parts = words.slice(0, 2).map(word => 
    word.substring(0, 3).toUpperCase()
  );

  return `${parts.join('-')}-${String(index).padStart(3, '0')}`;
}

// Run migration
migrateCreateClientsFromOrders()
  .then(() => {
    console.log("🎉 Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  });
