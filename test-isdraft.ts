import { getDb } from './server/db';
import { orders } from './drizzle/schema';
import { sql } from 'drizzle-orm';

async function testIsDraft() {
  console.log('=== Testing isDraft values ===\n');
  
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }
  
  // Get all orders
  const allOrders = await db.select().from(orders).limit(30);
  
  console.log(`Total orders in database: ${allOrders.length}\n`);
  
  // Group by isDraft value
  const byIsDraft: Record<string, number> = {};
  allOrders.forEach(order => {
    const key = `${order.isDraft} (${typeof order.isDraft})`;
    byIsDraft[key] = (byIsDraft[key] || 0) + 1;
  });
  
  console.log('Orders grouped by isDraft value:');
  Object.entries(byIsDraft).forEach(([key, count]) => {
    console.log(`  ${key}: ${count} orders`);
  });
  
  console.log('\nFirst 10 orders:');
  allOrders.slice(0, 10).forEach(order => {
    console.log(`  Order #${order.orderNumber}: isDraft=${order.isDraft} (${typeof order.isDraft}), orderType=${order.orderType}, fulfillmentStatus=${order.fulfillmentStatus}`);
  });
  
  console.log('\n=== Testing query with isDraft = 0 ===');
  const confirmedOrders = await db.select().from(orders).where(sql`${orders.isDraft} = 0`).limit(10);
  console.log(`Found ${confirmedOrders.length} orders with isDraft = 0`);
  
  console.log('\n=== Testing query with isDraft = false ===');
  try {
    const confirmedOrders2 = await db.select().from(orders).where(sql`${orders.isDraft} = false`).limit(10);
    console.log(`Found ${confirmedOrders2.length} orders with isDraft = false`);
  } catch (error) {
    console.error('Error querying with isDraft = false:', error);
  }
  
  process.exit(0);
}

testIsDraft().catch(console.error);
