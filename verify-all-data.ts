/**
 * Comprehensive Database Verification Script
 * 
 * Checks all tables and relationships to identify what data exists
 * and what's missing in the production database.
 */

import { db } from './scripts/db-sync.js';
import { 
  vendors, clients, products, batches, lots, orders, invoices, payments,
  purchaseOrders, intakeSessions, orderLineItems, invoiceLineItems
} from './drizzle/schema.js';
import { eq, sql } from 'drizzle-orm';

async function verifyAllData() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE DATABASE VERIFICATION');
  console.log('='.repeat(80));
  console.log();

  try {
    // ========================================================================
    // PART 1: Count all records
    // ========================================================================
    console.log('PART 1: RECORD COUNTS');
    console.log('-'.repeat(80));

    const vendorCount = await db.select().from(vendors);
    console.log(`✓ Vendors: ${vendorCount.length}`);

    const clientCount = await db.select().from(clients);
    console.log(`✓ Clients: ${clientCount.length}`);

    const productCount = await db.select().from(products);
    console.log(`✓ Products: ${productCount.length}`);

    const batchCount = await db.select().from(batches);
    console.log(`✓ Batches: ${batchCount.length}`);

    const lotCount = await db.select().from(lots);
    console.log(`✓ Lots: ${lotCount.length}`);

    const orderCount = await db.select().from(orders);
    console.log(`✓ Orders: ${orderCount.length}`);

    const invoiceCount = await db.select().from(invoices);
    console.log(`✓ Invoices: ${invoiceCount.length}`);

    const paymentCount = await db.select().from(payments);
    console.log(`✓ Payments: ${paymentCount.length}`);

    const poCount = await db.select().from(purchaseOrders);
    console.log(`✓ Purchase Orders: ${poCount.length}`);

    const intakeCount = await db.select().from(intakeSessions);
    console.log(`✓ Intake Sessions: ${intakeCount.length}`);

    console.log();
    console.log(`TOTAL RECORDS: ${vendorCount.length + clientCount.length + productCount.length + batchCount.length + orderCount.length + invoiceCount.length + paymentCount.length}`);
    console.log();

    // ========================================================================
    // PART 2: Test Forward Relationships
    // ========================================================================
    console.log('PART 2: FORWARD RELATIONSHIPS');
    console.log('-'.repeat(80));

    // Test batch → vendor
    if (batchCount.length > 0) {
      const sampleBatch = batchCount[0];
      const batchLot = await db.select().from(lots).where(eq(lots.id, sampleBatch.lotId!)).limit(1);
      if (batchLot.length > 0 && batchLot[0].vendorId) {
        const batchVendor = await db.select().from(vendors).where(eq(vendors.id, batchLot[0].vendorId)).limit(1);
        console.log(`✓ Batch → Lot → Vendor: WORKS (Batch #${sampleBatch.id} → Vendor "${batchVendor[0]?.name}")`);
      } else {
        console.log(`✗ Batch → Lot → Vendor: BROKEN (Lot has no vendorId)`);
      }
    }

    // Test order → client
    if (orderCount.length > 0) {
      const sampleOrder = orderCount[0];
      if (sampleOrder.clientId) {
        const orderClient = await db.select().from(clients).where(eq(clients.id, sampleOrder.clientId)).limit(1);
        console.log(`✓ Order → Client: WORKS (Order #${sampleOrder.id} → Client "${orderClient[0]?.name}")`);
      } else {
        console.log(`✗ Order → Client: BROKEN (Order has no clientId)`);
      }
    }

    // Test invoice → client
    if (invoiceCount.length > 0) {
      const sampleInvoice = invoiceCount[0];
      if (sampleInvoice.customerId) {
        const invoiceClient = await db.select().from(clients).where(eq(clients.id, sampleInvoice.customerId)).limit(1);
        console.log(`✓ Invoice → Client: WORKS (Invoice #${sampleInvoice.id} → Client "${invoiceClient[0]?.name}")`);
      } else {
        console.log(`✗ Invoice → Client: BROKEN (Invoice has no customerId)`);
      }
    } else {
      console.log(`⚠ Invoice → Client: CANNOT TEST (No invoices)`);
    }

    console.log();

    // ========================================================================
    // PART 3: Test Reverse Relationships
    // ========================================================================
    console.log('PART 3: REVERSE RELATIONSHIPS');
    console.log('-'.repeat(80));

    // Test vendor → batches
    if (vendorCount.length > 0) {
      const sampleVendor = vendorCount[0];
      const vendorLots = await db.select().from(lots).where(eq(lots.vendorId, sampleVendor.id));
      const lotIds = vendorLots.map(l => l.id);
      let vendorBatchCount = 0;
      if (lotIds.length > 0) {
        for (const lotId of lotIds) {
          const lotBatches = await db.select().from(batches).where(eq(batches.lotId, lotId));
          vendorBatchCount += lotBatches.length;
        }
      }
      console.log(`${vendorBatchCount > 0 ? '✓' : '✗'} Vendor → Batches: ${vendorBatchCount} batches for vendor "${sampleVendor.name}"`);
    }

    // Test client → orders
    if (clientCount.length > 0) {
      const sampleClient = clientCount[0];
      const clientOrders = await db.select().from(orders).where(eq(orders.clientId, sampleClient.id));
      console.log(`${clientOrders.length > 0 ? '✓' : '✗'} Client → Orders: ${clientOrders.length} orders for client "${sampleClient.name}"`);
    }

    // Test client → invoices
    if (clientCount.length > 0 && invoiceCount.length > 0) {
      const sampleClient = clientCount[0];
      const clientInvoices = await db.select().from(invoices).where(eq(invoices.customerId, sampleClient.id));
      console.log(`${clientInvoices.length > 0 ? '✓' : '✗'} Client → Invoices: ${clientInvoices.length} invoices for client "${sampleClient.name}"`);
    } else {
      console.log(`⚠ Client → Invoices: CANNOT TEST (No invoices)`);
    }

    console.log();

    // ========================================================================
    // PART 4: Test Aggregations
    // ========================================================================
    console.log('PART 4: AGGREGATIONS');
    console.log('-'.repeat(80));

    // AR total
    if (invoiceCount.length > 0) {
      const arTotal = invoiceCount.reduce((sum, inv) => sum + Number(inv.amountDue || 0), 0);
      console.log(`✓ Total AR: $${arTotal.toFixed(2)}`);
      
      const overdueInvoices = invoiceCount.filter(inv => 
        ['SENT', 'PARTIAL', 'OVERDUE'].includes(inv.status) && Number(inv.amountDue) > 0
      );
      const overdueAR = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amountDue), 0);
      console.log(`✓ Outstanding AR (SENT/PARTIAL/OVERDUE): $${overdueAR.toFixed(2)}`);
    } else {
      console.log(`⚠ AR calculations: CANNOT TEST (No invoices)`);
    }

    // Client total spent
    if (clientCount.length > 0 && orderCount.length > 0) {
      const sampleClient = clientCount[0];
      const clientOrders = await db.select().from(orders).where(eq(orders.clientId, sampleClient.id));
      const totalSpent = clientOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      console.log(`${totalSpent > 0 ? '✓' : '✗'} Client Total Spent: $${totalSpent.toFixed(2)} for "${sampleClient.name}"`);
    }

    console.log();

    // ========================================================================
    // PART 5: Sample Data
    // ========================================================================
    console.log('PART 5: SAMPLE DATA');
    console.log('-'.repeat(80));

    if (invoiceCount.length > 0) {
      console.log('Sample Invoice:');
      console.log(JSON.stringify(invoiceCount[0], null, 2));
    } else {
      console.log('⚠ No invoices to sample');
    }

    console.log();
    console.log('='.repeat(80));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

verifyAllData();
