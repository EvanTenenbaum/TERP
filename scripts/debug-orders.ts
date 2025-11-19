import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== DEBUGGING ORDERS ===\n");

async function debugOrders() {
  try {
    // Query orders directly from database
    const ordersResult = await db.execute(sql`
      SELECT id, order_number, orderType, is_draft, fulfillmentStatus, saleStatus, created_at
      FROM orders
      LIMIT 10
    `);
    
    console.log("Orders in database:");
    console.table(ordersResult[0]);
    
    // Count by isDraft
    const draftCountResult = await db.execute(sql`
      SELECT is_draft, COUNT(*) as count
      FROM orders
      GROUP BY is_draft
    `);
    
    console.log("\nOrders count by is_draft:");
    console.table(draftCountResult[0]);
    
    // Check if there are any orders with is_draft = 0 (false)
    const confirmedResult = await db.execute(sql`
      SELECT id, order_number, is_draft, fulfillmentStatus
      FROM orders
      WHERE is_draft = 0
      LIMIT 5
    `);
    
    console.log("\nConfirmed orders (is_draft = 0):");
    console.table(confirmedResult[0]);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

debugOrders();
