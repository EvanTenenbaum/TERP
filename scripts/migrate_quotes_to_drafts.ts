import { getDb } from '../server/db';
import { orders } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function migrateQuotesToDrafts() {
  console.log('🚀 Starting migration: Quotes → Draft Orders');
  console.log('================================================\n');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
    
    // Update all QUOTE orders to isDraft=true
    console.log('📝 Migrating QUOTE orders to isDraft=true...');
    const quotesResult = await db
      .update(orders)
      .set({ isDraft: true })
      .where(eq(orders.orderType, 'QUOTE'));
    
    console.log(`✅ Migrated ${quotesResult.rowsAffected || 0} QUOTE orders to draft orders\n`);
    
    // Update all SALE orders to isDraft=false
    console.log('💰 Migrating SALE orders to isDraft=false...');
    const salesResult = await db
      .update(orders)
      .set({ isDraft: false })
      .where(eq(orders.orderType, 'SALE'));
    
    console.log(`✅ Migrated ${salesResult.rowsAffected || 0} SALE orders to confirmed orders\n`);
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    const allOrders = await db.select().from(orders);
    const draftCount = allOrders.filter(o => o.isDraft).length;
    const confirmedCount = allOrders.filter(o => !o.isDraft).length;
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   Draft Orders: ${draftCount}`);
    console.log(`   Confirmed Orders: ${confirmedCount}`);
    console.log(`   Total Orders: ${allOrders.length}`);
    
    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateQuotesToDrafts();
