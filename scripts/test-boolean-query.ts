import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";

console.log("\n=== TESTING BOOLEAN QUERY ===\n");

async function testBooleanQuery() {
  try {
    // Test 1: Direct SQL query with is_draft = 0
    console.log("Test 1: Direct SQL with is_draft = 0");
    const sqlResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM orders WHERE is_draft = 0
    `);
    console.log("Result:", sqlResult[0]);
    
    // Test 2: Drizzle ORM with eq(orders.isDraft, false)
    console.log("\n\nTest 2: Drizzle ORM with eq(orders.isDraft, false)");
    const drizzleResult = await db
      .select()
      .from(orders)
      .where(eq(orders.isDraft, false))
      .limit(5);
    console.log(`Result: ${drizzleResult.length} orders`);
    if (drizzleResult.length > 0) {
      console.log("First order:", {
        id: drizzleResult[0].id,
        orderNumber: drizzleResult[0].orderNumber,
        isDraft: drizzleResult[0].isDraft,
      });
    } else {
      console.log("❌ NO ORDERS RETURNED WITH DRIZZLE!");
    }
    
    // Test 3: Drizzle ORM with eq(orders.isDraft, 0)
    console.log("\n\nTest 3: Drizzle ORM with eq(orders.isDraft, 0)");
    const drizzleResult2 = await db
      .select()
      .from(orders)
      .where(eq(orders.isDraft, 0 as any))
      .limit(5);
    console.log(`Result: ${drizzleResult2.length} orders`);
    
    // Test 4: Check what isDraft values are in the database
    console.log("\n\nTest 4: Check actual isDraft values");
    const allOrders = await db
      .select()
      .from(orders)
      .limit(5);
    console.log("Sample orders:");
    allOrders.forEach((order) => {
      console.log(`  Order ${order.id}: isDraft = ${order.isDraft} (type: ${typeof order.isDraft})`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

testBooleanQuery();
