import { getDb } from '../server/db';
import { orders } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function rollbackMigration() {
  console.log('🔄 Rolling back migration: Draft Orders → Quotes/Sales');
  console.log('========================================================\n');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
    
    // Restore QUOTE orderType for draft orders
    console.log('📝 Restoring QUOTE orderType for draft orders...');
    const quotesResult = await db
      .update(orders)
      .set({ orderType: 'QUOTE' })
      .where(eq(orders.isDraft, true));
    
    console.log(`✅ Restored ${quotesResult.rowsAffected || 0} draft orders to QUOTE\n`);
    
    // Restore SALE orderType for confirmed orders
    console.log('💰 Restoring SALE orderType for confirmed orders...');
    const salesResult = await db
      .update(orders)
      .set({ orderType: 'SALE' })
      .where(eq(orders.isDraft, false));
    
    console.log(`✅ Restored ${salesResult.rowsAffected || 0} confirmed orders to SALE\n`);
    
    // Verify rollback
    console.log('🔍 Verifying rollback...');
    const allOrders = await db.select().from(orders);
    const quoteCount = allOrders.filter(o => o.orderType === 'QUOTE').length;
    const saleCount = allOrders.filter(o => o.orderType === 'SALE').length;
    
    console.log(`\n📊 Rollback Summary:`);
    console.log(`   QUOTE Orders: ${quoteCount}`);
    console.log(`   SALE Orders: ${saleCount}`);
    console.log(`   Total Orders: ${allOrders.length}`);
    
    console.log('\n✅ Rollback complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

rollbackMigration();
