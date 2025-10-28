/**
 * Realistic Mock Data Generator - Main Orchestrator
 * 
 * Generates 22 months of realistic data for TERP:
 * - $44M total revenue ($2M/month average)
 * - 60 clients (10 whales = 70%, 50 regular = 30%)
 * - 8 vendors (90% consignment intake)
 * - 50 strains, 500+ products
 * - ~176 lots, ~158 batches
 * - ~4,400 orders
 * - Invoices with AR aging (15% overdue, 50% of overdue 120+ days)
 * - Returns (0.5%) and refunds (5% of orders get 5% refund)
 */

import { db } from './db-sync.js';
import { clients, strains, products, lots, batches, orders, invoices, brands, users } from '../drizzle/schema.js';
import { CONFIG } from './generators/config.js';
import { generateAllClients } from './generators/clients.js';
import { generateStrains } from './generators/strains.js';
import { generateProducts } from './generators/products.js';
import { generateLots, generateBatches } from './generators/inventory.js';
import { generateOrders } from './generators/orders.js';
import { generateInvoices, calculateARAgingSummary } from './generators/invoices.js';
import { generateReturns, generateRefunds } from './generators/returns-refunds.js';
import { formatCurrency } from './generators/utils.js';

async function seedRealisticData() {
  console.log('\n🚀 TERP Realistic Data Generator');
  console.log('='.repeat(50));
  console.log(`📅 Period: ${CONFIG.startDate.toLocaleDateString()} - ${CONFIG.endDate.toLocaleDateString()}`);
  console.log(`💰 Target Revenue: ${formatCurrency(CONFIG.totalRevenue)}`);
  console.log(`👥 Clients: ${CONFIG.totalClients} (${CONFIG.whaleClients} whales, ${CONFIG.regularClients} regular)`);
  console.log(`🏭 Vendors: ${CONFIG.totalVendors}`);
  console.log('='.repeat(50) + '\n');

  try {
    // Step 0: Create Default User
    console.log('👤 Creating default user...');
    await db.insert(users).values({
      openId: 'admin-seed-user',
      name: 'Seed Admin',
      email: 'admin@terp.local',
      role: 'admin',
      lastSignedIn: new Date(2023, 10, 1),
    });
    console.log('   ✓ Default user created\n');
    
    // Step 1: Generate Clients
    console.log('👥 Generating clients...');
    const allClients = generateAllClients();
    const whaleClients = allClients.slice(0, CONFIG.whaleClients);
    const regularClients = allClients.slice(CONFIG.whaleClients, CONFIG.whaleClients + CONFIG.regularClients);
    const vendorClients = allClients.slice(CONFIG.whaleClients + CONFIG.regularClients);
    
    console.log(`   ✓ ${whaleClients.length} whale clients`);
    console.log(`   ✓ ${regularClients.length} regular clients`);
    console.log(`   ✓ ${vendorClients.length} vendor clients`);
    console.log(`   ✓ ${allClients.length} total clients\n`);
    
    // Insert clients in batches of 10 to avoid query size limits
    const batchSize = 10;
    for (let i = 0; i < allClients.length; i += batchSize) {
      const batch = allClients.slice(i, i + batchSize);
      await db.insert(clients).values(batch);
    }
    
    // Step 2: Create Default Brand
    console.log('🏷️  Creating default brand...');
    await db.insert(brands).values({
      name: 'TERP House Brand',
      description: 'Default brand for all products',
      createdAt: new Date(2023, 10, 1),
    });
    console.log('   ✓ Default brand created\n');
    
    // Step 3: Generate Strains
    console.log('🌿 Generating strains...');
    const strainsData = generateStrains();
    console.log(`   ✓ ${strainsData.length} strains with normalized names\n`);
    
    await db.insert(strains).values(strainsData);
    
    // Step 4: Generate Products
    console.log('📦 Generating products...');
    const productsData = generateProducts();
    const flowerProducts = productsData.filter(p => p.category === 'Flower');
    const nonFlowerProducts = productsData.filter(p => p.category !== 'Flower');
    console.log(`   ✓ ${flowerProducts.length} flower products`);
    console.log(`   ✓ ${nonFlowerProducts.length} non-flower products`);
    console.log(`   ✓ ${productsData.length} total products\n`);
    
    await db.insert(products).values(productsData);
    
    // Step 5: Generate Lots
    console.log('📊 Generating lots...');
    const vendorIds = vendorClients.map((_, index) => CONFIG.whaleClients + CONFIG.regularClients + index + 1);
    const lotsData = generateLots(vendorIds);
    console.log(`   ✓ ${lotsData.length} lots created\n`);
    
    await db.insert(lots).values(lotsData);
    
    // Step 6: Generate Batches
    console.log('📦 Generating inventory batches...');
    const productIds = productsData.map((_, index) => index + 1);
    const lotIds = lotsData.map((_, index) => index + 1);
    
    const batchesData = generateBatches(productIds, lotIds, vendorIds);
    const consignmentBatches = batchesData.filter(b => b.paymentTerms === 'CONSIGNMENT').length;
    const codBatches = batchesData.filter(b => b.paymentTerms === 'COD').length;
    console.log(`   ✓ ${batchesData.length} batches created`);
    console.log(`   ✓ ${consignmentBatches} consignment batches (${(consignmentBatches / batchesData.length * 100).toFixed(1)}%)`);
    console.log(`   ✓ ${codBatches} COD batches (${(codBatches / batchesData.length * 100).toFixed(1)}%)\n`);
    
    await db.insert(batches).values(batchesData);
    
    // Step 6: Generate Orders
    console.log('📝 Generating orders...');
    console.log('   (This may take a minute...)\n');
    const whaleClientIds = whaleClients.map((_, index) => index + 1);
    const regularClientIds = regularClients.map((_, index) => CONFIG.whaleClients + index + 1);
    
    const ordersData = generateOrders(whaleClientIds, regularClientIds, batchesData);
    const totalRevenue = ordersData.reduce((sum, o) => sum + parseFloat(o.total), 0);
    const whaleRevenue = ordersData
      .filter(o => whaleClientIds.includes(o.clientId))
      .reduce((sum, o) => sum + parseFloat(o.total), 0);
    const regularRevenue = totalRevenue - whaleRevenue;
    
    console.log(`   ✓ ${ordersData.length} orders created`);
    console.log(`   ✓ Total revenue: ${formatCurrency(totalRevenue)}`);
    console.log(`   ✓ Whale revenue: ${formatCurrency(whaleRevenue)} (${(whaleRevenue / totalRevenue * 100).toFixed(1)}%)`);
    console.log(`   ✓ Regular revenue: ${formatCurrency(regularRevenue)} (${(regularRevenue / totalRevenue * 100).toFixed(1)}%)\n`);
    
    await db.insert(orders).values(ordersData);
    
    // Step 7: Generate Invoices
    console.log('💰 Generating invoices and AR aging...');
    const invoicesData = generateInvoices(ordersData);
    const arSummary = calculateARAgingSummary(invoicesData);
    const overdueInvoices = invoicesData.filter(i => i.status === 'OVERDUE').length;
    
    console.log(`   ✓ ${invoicesData.length} invoices created`);
    console.log(`   ✓ ${overdueInvoices} overdue invoices (${(overdueInvoices / invoicesData.length * 100).toFixed(1)}%)`);
    console.log(`   ✓ Total AR: ${formatCurrency(arSummary.totalAR)}`);
    console.log(`   ✓ 120+ days overdue: ${formatCurrency(arSummary.overdue120Plus)} (${(arSummary.overdue120Plus / arSummary.totalAR * 100).toFixed(1)}%)\n`);
    
    await db.insert(invoices).values(invoicesData);
    
    // Step 8: Generate Returns and Refunds
    console.log('↩️  Generating returns and refunds...');
    const returnsData = generateReturns(ordersData);
    const refundsData = generateRefunds(ordersData);
    
    console.log(`   ✓ ${returnsData.length} returns (${(returnsData.length / ordersData.length * 100).toFixed(2)}%)`);
    console.log(`   ✓ ${refundsData.length} refunds (${(refundsData.length / ordersData.length * 100).toFixed(1)}%)\n`);
    
    // Note: Returns and refunds tables need to be added to schema
    // await db.insert(returns).values(returnsData);
    // await db.insert(refunds).values(refundsData);
    
    // Summary
    console.log('✅ Realistic data generation complete!\n');
    console.log('📊 Summary:');
    console.log('='.repeat(50));
    console.log(`   Clients:        ${allClients.length} (${whaleClients.length} whales, ${regularClients.length} regular, ${vendorClients.length} vendors)`);
    console.log(`   Strains:        ${strainsData.length}`);
    console.log(`   Products:       ${productsData.length} (${flowerProducts.length} flower, ${nonFlowerProducts.length} other)`);
    console.log(`   Lots:           ${lotsData.length}`);
    console.log(`   Batches:        ${batchesData.length} (${consignmentBatches} consignment)`);
    console.log(`   Orders:         ${ordersData.length}`);
    console.log(`   Invoices:       ${invoicesData.length} (${overdueInvoices} overdue)`);
    console.log(`   Returns:        ${returnsData.length}`);
    console.log(`   Refunds:        ${refundsData.length}`);
    console.log(`   Total Revenue:  ${formatCurrency(totalRevenue)}`);
    console.log(`   Total AR:       ${formatCurrency(arSummary.totalAR)}`);
    console.log('='.repeat(50) + '\n');
    
    return {
      success: true,
      stats: {
        clients: allClients.length,
        strains: strainsData.length,
        products: productsData.length,
        lots: lotsData.length,
        batches: batchesData.length,
        orders: ordersData.length,
        invoices: invoicesData.length,
        returns: returnsData.length,
        refunds: refundsData.length,
        totalRevenue,
        totalAR: arSummary.totalAR,
      },
    };
  } catch (error) {
    console.error('\n❌ Error generating realistic data:');
    console.error(error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedRealisticData()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

export { seedRealisticData };

