#!/usr/bin/env tsx
/**
 * Comprehensive Seed Script for TERP
 *
 * Seeds ALL tables needed for full system testing with properly linked data.
 * This script clears old data first to ensure clean, properly-linked records.
 *
 * Usage:
 *   pnpm seed:comprehensive              # Full seed (recommended)
 *   pnpm seed:comprehensive --light      # Light seed for quick testing
 *   pnpm seed:comprehensive --dry-run    # Preview without changes
 *   pnpm seed:comprehensive --no-clear   # Don't clear existing data
 *
 * IMPORTANT: This script will DELETE existing data by default!
 *
 * Column names verified against drizzle/schema.ts on 2026-01-21
 */

import mysql from 'mysql2/promise';
import { faker } from '@faker-js/faker';

// ============================================================================
// Configuration
// ============================================================================

interface SeedConfig {
  size: 'light' | 'full';
  dryRun: boolean;
  clearData: boolean;
  seed: number;
}

const LIGHT_COUNTS = {
  clients: 15,
  vendors: 5,
  products: 25,
  batches: 40,
  orders: 80,
  invoices: 60,
  payments: 40,
  bills: 20,
  calendarEvents: 15,
  notifications: 30,
};

const FULL_COUNTS = {
  clients: 60,
  vendors: 15,
  products: 100,
  batches: 200,
  orders: 400,
  invoices: 300,
  payments: 200,
  bills: 75,
  calendarEvents: 50,
  notifications: 100,
};

// Tables to clear in reverse FK dependency order
const TABLES_TO_CLEAR = [
  'leaderboard_metric_cache',
  'cash_location_transactions',
  'batch_status_history',
  'inbox_items',
  'notifications',
  'calendar_events',
  'client_transactions',
  'order_line_items',
  'payments',
  'invoice_line_items',
  'invoices',
  'orders',
  'bill_line_items',
  'bills',
  'batches',
  'lots',
  'products',
  'strains',
  'brands',
  'vendor_notes',
  'clients',
  'vendors',
  'workflow_statuses',
  'pricing_defaults',
  'cash_locations',
];

function parseArgs(): SeedConfig {
  const args = process.argv.slice(2);
  return {
    size: args.includes('--light') ? 'light' : 'full',
    dryRun: args.includes('--dry-run'),
    clearData: !args.includes('--no-clear'),
    seed: 42,
  };
}

function getCounts(size: 'light' | 'full') {
  return size === 'light' ? LIGHT_COUNTS : FULL_COUNTS;
}

// California cities for realistic addresses
const CALIFORNIA_CITIES = [
  'Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Oakland',
  'San Jose', 'Fresno', 'Long Beach', 'Bakersfield', 'Anaheim',
];

const COMPANY_SUFFIXES = [
  'Dispensary', 'Cannabis Co', 'Wellness', 'Collective', 'Gardens',
  'Farms', 'Supply', 'Distribution', 'Retail', 'Therapeutics',
];

function generateCaliforniaAddress(): string {
  const city = faker.helpers.arrayElement(CALIFORNIA_CITIES);
  const street = faker.location.streetAddress();
  const zip = faker.location.zipCode('9####');
  return `${street}, ${city}, CA ${zip}`;
}

function generateCompanyName(index: number): string {
  const prefix = faker.helpers.arrayElement([
    faker.location.city(),
    faker.word.adjective(),
    faker.person.lastName(),
  ]);
  const suffix = COMPANY_SUFFIXES[index % COMPANY_SUFFIXES.length];
  return `${prefix} ${suffix}`;
}

// Format date for MySQL
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// ============================================================================
// Database Operations
// ============================================================================

async function clearTables(connection: mysql.Connection, dryRun: boolean) {
  console.log('🗑️  Clearing existing data...');

  if (dryRun) {
    console.log('   [DRY RUN] Would clear tables:', TABLES_TO_CLEAR.join(', '));
    return;
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of TABLES_TO_CLEAR) {
    try {
      await connection.query(`DELETE FROM \`${table}\``);
      console.log(`   ✓ Cleared: ${table}`);
    } catch (error: any) {
      if (error?.code === 'ER_NO_SUCH_TABLE') {
        console.log(`   - Skipped (not exists): ${table}`);
      } else {
        console.log(`   ⚠ Warning clearing ${table}: ${error?.message || error}`);
      }
    }
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('   ✓ Data cleared\n');
}

// ============================================================================
// Seeder Functions - Using raw SQL with EXACT column names from schema.ts
// ============================================================================

async function seedUsers(connection: mysql.Connection) {
  console.log('👤 Seeding users...');

  const [existing] = await connection.query('SELECT id FROM users LIMIT 1');
  if ((existing as any[]).length > 0) {
    console.log('   ✓ Users exist, fetching');
    const [rows] = await connection.query('SELECT id, name FROM users');
    return rows as any[];
  }

  const userData = [
    ['admin-seed-001', 'Admin User', 'admin@terp.local', 'admin'],
    ['user-seed-001', 'Sales Rep 1', 'sales1@terp.local', 'user'],
    ['user-seed-002', 'Sales Rep 2', 'sales2@terp.local', 'user'],
  ];

  for (const [openId, name, email, role] of userData) {
    await connection.query(
      'INSERT INTO users (openId, name, email, role, lastSignedIn) VALUES (?, ?, ?, ?, NOW())',
      [openId, name, email, role]
    );
  }

  console.log(`   ✓ Created ${userData.length} users`);
  const [rows] = await connection.query('SELECT id, name FROM users');
  return rows as any[];
}

async function seedPricingDefaults(connection: mysql.Connection) {
  console.log('💰 Seeding pricing defaults...');

  // Schema: product_category (varchar), default_margin_percent (decimal)
  const categories = ['Flower', 'Pre-Roll', 'Concentrate', 'Edible', 'Vape', 'Topical', 'Tincture', 'Accessories'];

  for (const category of categories) {
    const defaultMargin = faker.number.float({ min: 20, max: 40, fractionDigits: 2 });

    await connection.query(
      `INSERT INTO pricing_defaults (product_category, default_margin_percent)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE default_margin_percent = VALUES(default_margin_percent)`,
      [category, defaultMargin]
    );
  }

  console.log(`   ✓ Created ${categories.length} pricing defaults`);
}

async function seedWorkflowStatuses(connection: mysql.Connection) {
  console.log('📋 Seeding workflow statuses...');

  // Schema: name, slug, color, order (int), isActive (int)
  const statuses = [
    { name: 'Awaiting Intake', slug: 'awaiting-intake', color: '#FFA500', order: 1 },
    { name: 'In Photography', slug: 'in-photography', color: '#3B82F6', order: 2 },
    { name: 'Photography Complete', slug: 'photography-complete', color: '#10B981', order: 3 },
    { name: 'Live', slug: 'live', color: '#22C55E', order: 4 },
    { name: 'On Hold', slug: 'on-hold', color: '#EAB308', order: 5 },
    { name: 'Quarantined', slug: 'quarantined', color: '#EF4444', order: 6 },
    { name: 'Sold Out', slug: 'sold-out', color: '#6B7280', order: 7 },
    { name: 'Closed', slug: 'closed', color: '#1F2937', order: 8 },
  ];

  for (const status of statuses) {
    await connection.query(
      `INSERT INTO workflow_statuses (name, slug, color, \`order\`, isActive)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [status.name, status.slug, status.color, status.order]
    );
  }

  console.log(`   ✓ Created ${statuses.length} workflow statuses`);
  const [rows] = await connection.query('SELECT id, name FROM workflow_statuses ORDER BY `order`');
  return rows as any[];
}

async function seedVendors(connection: mysql.Connection, count: number) {
  console.log('🏭 Seeding vendors...');

  // Schema: name, contactName, contactEmail, contactPhone, notes
  const vendorNames = [
    'NorCal Farms', 'Emerald Triangle Growers', 'Humboldt Harvest Co',
    'Mendocino Gardens', 'Trinity Alps Cultivation', 'Sacramento Valley Farms',
    'Central Coast Growers', 'SoCal Premium Supply', 'Bay Area Collective',
    'Sierra Nevada Farms', 'Redwood Coast Cannabis', 'Golden State Cultivators',
    'Pacific Coast Growers', 'Mountain View Farms', 'Valley Green Supply',
  ];

  for (let i = 0; i < Math.min(count, vendorNames.length); i++) {
    const name = vendorNames[i];
    await connection.query(
      `INSERT INTO vendors (name, contactName, contactEmail, contactPhone, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name,
        faker.person.fullName(),
        faker.internet.email({ firstName: 'contact', lastName: name.split(' ')[0].toLowerCase() }),
        faker.phone.number(),
        faker.lorem.sentence(),
      ]
    );
  }

  console.log(`   ✓ Created ${Math.min(count, vendorNames.length)} vendors`);
  const [rows] = await connection.query('SELECT id, name FROM vendors');
  return rows as any[];
}

async function seedClients(connection: mysql.Connection, count: number) {
  console.log('👥 Seeding clients...');

  // CORRECT column names from schema.ts:
  // teri_code, name, email, phone, address, is_buyer, is_seller, is_brand, tags
  // NOTE: totalRevenue, totalOrders, lastOrderDate DO NOT EXIST - removed

  const whaleCount = Math.floor(count * 0.15);
  const regularCount = count - whaleCount;

  // Whale clients (high volume)
  for (let i = 0; i < whaleCount; i++) {
    const companyName = generateCompanyName(i);
    await connection.query(
      `INSERT INTO clients (teri_code, name, email, phone, address, is_buyer, is_seller, is_brand, tags)
       VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)`,
      [
        `WHL${String(i + 1).padStart(4, '0')}`,
        companyName,
        faker.internet.email({ firstName: 'contact', lastName: companyName.split(' ')[0].toLowerCase() }),
        faker.phone.number(),
        generateCaliforniaAddress(),
        Math.random() < 0.1 ? 1 : 0,
        JSON.stringify(['wholesale', 'high-volume']),
      ]
    );
  }

  // Regular clients
  for (let i = 0; i < regularCount; i++) {
    const companyName = generateCompanyName(i + 100);
    await connection.query(
      `INSERT INTO clients (teri_code, name, email, phone, address, is_buyer, is_seller, is_brand, tags)
       VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?)`,
      [
        `REG${String(i + 1).padStart(4, '0')}`,
        companyName,
        faker.internet.email({ firstName: 'contact', lastName: companyName.split(' ')[0].toLowerCase() }),
        faker.phone.number(),
        generateCaliforniaAddress(),
        JSON.stringify(['retail']),
      ]
    );
  }

  console.log(`   ✓ Created ${count} clients (${whaleCount} whale, ${regularCount} regular)`);
  const [rows] = await connection.query('SELECT id, name, is_buyer as isBuyer FROM clients');
  return rows as any[];
}

async function seedBrands(connection: mysql.Connection, vendorIds: number[]) {
  console.log('🏷️ Seeding brands...');

  // Schema: name, vendorId, description
  const brandNames = [
    'TERP House', 'Premium Select', 'Golden Leaf', 'Pacific Buds',
    'Mountain High', 'Valley Green', 'Sunset Farms', 'Coastal Cannabis',
  ];

  for (let i = 0; i < brandNames.length; i++) {
    await connection.query(
      `INSERT INTO brands (name, vendorId, description) VALUES (?, ?, ?)`,
      [brandNames[i], vendorIds[i % vendorIds.length], faker.lorem.sentence()]
    );
  }

  console.log(`   ✓ Created ${brandNames.length} brands`);
  const [rows] = await connection.query('SELECT id, name FROM brands');
  return rows as any[];
}

async function seedStrains(connection: mysql.Connection) {
  console.log('🌿 Seeding strains...');

  // Schema: name, standardizedName, category, description
  const strainList = [
    { name: 'OG Kush', category: 'Hybrid' },
    { name: 'Blue Dream', category: 'Sativa' },
    { name: 'Gelato', category: 'Hybrid' },
    { name: 'Wedding Cake', category: 'Indica' },
    { name: 'Gorilla Glue', category: 'Hybrid' },
    { name: 'Sour Diesel', category: 'Sativa' },
    { name: 'Girl Scout Cookies', category: 'Hybrid' },
    { name: 'Granddaddy Purple', category: 'Indica' },
    { name: 'Jack Herer', category: 'Sativa' },
    { name: 'Northern Lights', category: 'Indica' },
    { name: 'White Widow', category: 'Hybrid' },
    { name: 'Pineapple Express', category: 'Hybrid' },
    { name: 'Purple Haze', category: 'Sativa' },
    { name: 'Bubba Kush', category: 'Indica' },
    { name: 'Green Crack', category: 'Sativa' },
    { name: 'Zkittlez', category: 'Indica' },
    { name: 'Runtz', category: 'Hybrid' },
    { name: 'Gary Payton', category: 'Hybrid' },
    { name: 'Cereal Milk', category: 'Hybrid' },
    { name: 'Ice Cream Cake', category: 'Indica' },
  ];

  for (const strain of strainList) {
    await connection.query(
      `INSERT INTO strains (name, standardizedName, category, description) VALUES (?, ?, ?, ?)`,
      [strain.name, strain.name.toLowerCase().replace(/\s+/g, '-'), strain.category, faker.lorem.sentence()]
    );
  }

  console.log(`   ✓ Created ${strainList.length} strains`);
  const [rows] = await connection.query('SELECT id, name, category FROM strains');
  return rows as any[];
}

async function seedProducts(connection: mysql.Connection, brandIds: number[], strainIds: number[], count: number) {
  console.log('📦 Seeding products...');

  // Schema: brandId, strainId, nameCanonical, category, subcategory, uomSellable, description
  const categories = ['Flower', 'Pre-Roll', 'Concentrate', 'Edible', 'Vape', 'Topical', 'Tincture'];
  const subcategories = ['Indoor', 'Outdoor', 'Greenhouse'];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    await connection.query(
      `INSERT INTO products (brandId, strainId, nameCanonical, category, subcategory, uomSellable, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        brandIds[i % brandIds.length],
        strainIds[i % strainIds.length],
        `${faker.commerce.productAdjective()} ${category} ${i + 1}`,
        category,
        category === 'Flower' ? subcategories[i % subcategories.length] : null,
        category === 'Flower' ? 'LB' : 'EA',
        faker.lorem.sentence(),
      ]
    );
  }

  console.log(`   ✓ Created ${count} products`);
  const [rows] = await connection.query('SELECT id, nameCanonical, category FROM products');
  return rows as any[];
}

async function seedLots(connection: mysql.Connection, vendorIds: number[]) {
  console.log('📊 Seeding lots...');

  // CORRECT schema: code (not lotCode), vendorId, date (not receivedDate), notes
  // NOTE: totalCost does NOT exist in lots table
  const lotCount = vendorIds.length * 5;

  for (let i = 0; i < lotCount; i++) {
    await connection.query(
      `INSERT INTO lots (code, vendorId, date, notes)
       VALUES (?, ?, ?, ?)`,
      [
        `LOT-${String(i + 1).padStart(5, '0')}`,
        vendorIds[i % vendorIds.length],
        formatDateTime(faker.date.recent({ days: 90 })),
        faker.lorem.sentence(),
      ]
    );
  }

  console.log(`   ✓ Created ${lotCount} lots`);
  const [rows] = await connection.query('SELECT id, code FROM lots');
  return rows as any[];
}

async function seedBatches(connection: mysql.Connection, productIds: number[], lotIds: number[], workflowStatusIds: number[], count: number) {
  console.log('📦 Seeding batches...');

  // CORRECT schema from drizzle/schema.ts:
  // code (not batchCode), sku (REQUIRED), productId, lotId, batchStatus, statusId,
  // grade, cogsMode (REQUIRED), unitCogs, paymentTerms (REQUIRED), onHandQty
  // NOTE: vendorId, initialQty, soldQty, intakeDate DO NOT EXIST

  const statuses = ['AWAITING_INTAKE', 'LIVE', 'PHOTOGRAPHY_COMPLETE', 'ON_HOLD', 'SOLD_OUT'];
  const paymentTermsOptions = ['COD', 'NET_7', 'NET_15', 'NET_30', 'CONSIGNMENT'];
  const cogsModes = ['FIXED', 'RANGE', 'CALCULATED'];

  for (let i = 0; i < count; i++) {
    const status = i < count * 0.6 ? 'LIVE' : statuses[i % statuses.length];
    const unitCogs = faker.number.float({ min: 50, max: 500, fractionDigits: 2 });
    const onHandQty = faker.number.float({ min: 10, max: 500, fractionDigits: 2 });

    await connection.query(
      `INSERT INTO batches (code, sku, productId, lotId, batchStatus, statusId, grade, cogsMode, unitCogs, paymentTerms, onHandQty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `BATCH-${String(i + 1).padStart(6, '0')}`,
        `SKU-${String(i + 1).padStart(8, '0')}`,
        productIds[i % productIds.length],
        lotIds[i % lotIds.length],
        status,
        workflowStatusIds[statuses.indexOf(status) % workflowStatusIds.length],
        faker.helpers.arrayElement(['A', 'B', 'C', null]),
        'FIXED',
        unitCogs,
        paymentTermsOptions[i % paymentTermsOptions.length],
        onHandQty,
      ]
    );
  }

  console.log(`   ✓ Created ${count} batches`);
  const [rows] = await connection.query('SELECT id, productId, unitCogs, onHandQty FROM batches');
  return rows as any[];
}

async function seedOrders(connection: mysql.Connection, clientIds: number[], batchData: any[], userIds: number[], count: number) {
  console.log('🛍️ Seeding orders...');

  // CORRECT column names from schema:
  // order_number, orderType, is_draft, client_id, items, subtotal, tax, discount, total,
  // total_cogs, total_margin, avg_margin_percent, paymentTerms, due_date, saleStatus,
  // fulfillmentStatus, created_by, created_at

  const paymentTerms = ['NET_7', 'NET_15', 'NET_30', 'COD'];

  for (let i = 0; i < count; i++) {
    const clientId = clientIds[i % clientIds.length];
    const itemCount = faker.number.int({ min: 1, max: 5 });

    // Generate order items
    const items = [];
    let subtotal = 0;
    let totalCogs = 0;

    for (let j = 0; j < itemCount; j++) {
      const batch = batchData[(i + j) % batchData.length];
      const unitCogs = parseFloat(batch.unitCogs || '100');
      const marginPercent = faker.number.float({ min: 15, max: 35 });
      const unitPrice = unitCogs / (1 - marginPercent / 100);
      const quantity = faker.number.float({ min: 0.5, max: 20, fractionDigits: 2 });
      const lineTotal = unitPrice * quantity;
      const lineCogs = unitCogs * quantity;

      items.push({
        batchId: batch.id,
        productId: batch.productId,
        quantity,
        unitPrice: parseFloat(unitPrice.toFixed(2)),
        unitCogs,
        lineTotal: parseFloat(lineTotal.toFixed(2)),
        lineCogs: parseFloat(lineCogs.toFixed(2)),
        marginPercent,
      });

      subtotal += lineTotal;
      totalCogs += lineCogs;
    }

    const tax = subtotal * 0.0875;
    const total = subtotal + tax;
    const createdAt = faker.date.recent({ days: 180 });
    const paymentTerm = paymentTerms[i % paymentTerms.length];
    const dueDate = new Date(createdAt);
    dueDate.setDate(dueDate.getDate() + (paymentTerm === 'COD' ? 0 : parseInt(paymentTerm.split('_')[1])));

    const isPaid = Math.random() < 0.6;
    const isOverdue = !isPaid && dueDate < new Date();
    const saleStatus = isPaid ? 'PAID' : (isOverdue ? 'OVERDUE' : 'PENDING');

    await connection.query(
      `INSERT INTO orders (order_number, orderType, is_draft, client_id, items, subtotal, tax, discount, total, total_cogs, total_margin, avg_margin_percent, paymentTerms, due_date, saleStatus, fulfillmentStatus, created_by, created_at, updated_at)
       VALUES (?, 'SALE', 0, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, NOW())`,
      [
        `ORD-${String(i + 1).padStart(6, '0')}`,
        clientId,
        JSON.stringify(items),
        subtotal.toFixed(2),
        tax.toFixed(2),
        total.toFixed(2),
        totalCogs.toFixed(2),
        (subtotal - totalCogs).toFixed(2),
        ((subtotal - totalCogs) / subtotal * 100).toFixed(2),
        paymentTerm,
        formatDate(dueDate),
        saleStatus,
        userIds[0],
        formatDateTime(createdAt),
      ]
    );
  }

  console.log(`   ✓ Created ${count} orders`);
  const [rows] = await connection.query('SELECT id, client_id as clientId, total, created_at as createdAt, items FROM orders');
  return rows as any[];
}

async function seedInvoices(connection: mysql.Connection, orderData: any[], count: number) {
  console.log('💵 Seeding invoices...');

  // Schema: invoiceNumber, customerId, invoiceDate, dueDate, subtotal, taxAmount,
  // discountAmount, totalAmount, amountPaid, amountDue, status, referenceType, referenceId

  for (let i = 0; i < Math.min(count, orderData.length); i++) {
    const order = orderData[i];
    const total = parseFloat(order.total || '1000');
    const isPaid = Math.random() < 0.5;
    const paidAmount = isPaid ? total : (Math.random() < 0.3 ? total * faker.number.float({ min: 0.3, max: 0.7 }) : 0);
    const dueDate = new Date(order.createdAt);
    dueDate.setDate(dueDate.getDate() + faker.helpers.arrayElement([7, 15, 30]));

    const status = paidAmount >= total ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : (dueDate < new Date() ? 'OVERDUE' : 'SENT'));

    await connection.query(
      `INSERT INTO invoices (invoiceNumber, customerId, invoiceDate, dueDate, subtotal, taxAmount, discountAmount, totalAmount, amountPaid, amountDue, status, referenceType, referenceId)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'ORDER', ?)`,
      [
        `INV-${String(i + 1).padStart(6, '0')}`,
        order.clientId,
        formatDate(new Date(order.createdAt)),
        formatDate(dueDate),
        (total / 1.0875).toFixed(2),
        (total - total / 1.0875).toFixed(2),
        total.toFixed(2),
        paidAmount.toFixed(2),
        (total - paidAmount).toFixed(2),
        status,
        order.id,
      ]
    );
  }

  console.log(`   ✓ Created ${Math.min(count, orderData.length)} invoices`);
  const [rows] = await connection.query('SELECT id, customerId, totalAmount, amountPaid FROM invoices');
  return rows as any[];
}

async function seedPayments(connection: mysql.Connection, invoiceData: any[], count: number) {
  console.log('💳 Seeding payments...');

  // Schema: paymentNumber, paymentType, paymentDate, amount, paymentMethod, customerId, referenceNumber, notes
  const paymentMethods = ['CASH', 'CHECK', 'WIRE', 'ACH'];
  const paidInvoices = invoiceData.filter((inv: any) => parseFloat(inv.amountPaid || '0') > 0);
  let created = 0;

  for (let i = 0; i < Math.min(count, paidInvoices.length); i++) {
    const invoice = paidInvoices[i];
    const amount = parseFloat(invoice.amountPaid || '0');

    await connection.query(
      `INSERT INTO payments (paymentNumber, paymentType, paymentDate, amount, paymentMethod, customerId, referenceNumber, notes)
       VALUES (?, 'RECEIVED', ?, ?, ?, ?, ?, ?)`,
      [
        `PAY-${String(i + 1).padStart(6, '0')}`,
        formatDate(faker.date.recent({ days: 60 })),
        amount.toFixed(2),
        faker.helpers.arrayElement(paymentMethods),
        invoice.customerId,
        `REF-${faker.string.alphanumeric(8)}`,
        faker.lorem.sentence(),
      ]
    );
    created++;
  }

  console.log(`   ✓ Created ${created} payments`);
}

async function seedClientTransactions(connection: mysql.Connection, orderData: any[], invoiceData: any[]) {
  console.log('📊 Seeding client transactions...');

  // Schema: client_id, transaction_type, transaction_number, transaction_date, amount, payment_status, notes
  let created = 0;

  // From orders (sales)
  for (const order of orderData.slice(0, 200)) {
    const amount = parseFloat(order.total || '0');
    if (amount <= 0) continue;

    await connection.query(
      `INSERT INTO client_transactions (client_id, transaction_type, transaction_number, transaction_date, amount, payment_status, notes)
       VALUES (?, 'ORDER', ?, ?, ?, 'PENDING', ?)`,
      [
        order.clientId,
        `TXN-${String(created + 1).padStart(6, '0')}`,
        formatDate(new Date(order.createdAt)),
        amount.toFixed(2),
        `Sale from order ${order.id}`,
      ]
    );
    created++;
  }

  // From invoices (payments)
  for (const invoice of invoiceData.slice(0, 150)) {
    const paidAmount = parseFloat(invoice.amountPaid || '0');
    if (paidAmount <= 0) continue;

    await connection.query(
      `INSERT INTO client_transactions (client_id, transaction_type, transaction_number, transaction_date, amount, payment_status, payment_amount, notes)
       VALUES (?, 'PAYMENT', ?, ?, ?, 'PAID', ?, ?)`,
      [
        invoice.customerId,
        `TXN-${String(created + 1).padStart(6, '0')}`,
        formatDate(faker.date.recent({ days: 30 })),
        (-paidAmount).toFixed(2),
        paidAmount.toFixed(2),
        `Payment on invoice ${invoice.id}`,
      ]
    );
    created++;
  }

  console.log(`   ✓ Created ${created} client transactions`);
}

async function seedBatchStatusHistory(connection: mysql.Connection, batchIds: number[], workflowStatusIds: number[], userIds: number[]) {
  console.log('📜 Seeding batch status history...');

  // Schema: batchId, fromStatusId, toStatusId, changedBy, notes, createdAt
  let created = 0;

  for (const batchId of batchIds.slice(0, 100)) {
    const transitionCount = faker.number.int({ min: 1, max: 3 });
    let prevStatusId = workflowStatusIds[0];

    for (let i = 0; i < transitionCount; i++) {
      const toStatusId = workflowStatusIds[Math.min(i + 1, workflowStatusIds.length - 1)];

      await connection.query(
        `INSERT INTO batch_status_history (batchId, fromStatusId, toStatusId, changedBy, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          batchId,
          prevStatusId,
          toStatusId,
          userIds[0],
          faker.lorem.sentence(),
          formatDateTime(faker.date.recent({ days: 90 - (transitionCount - i) * 20 })),
        ]
      );

      prevStatusId = toStatusId;
      created++;
    }
  }

  console.log(`   ✓ Created ${created} batch status history entries`);
}

async function seedNotifications(connection: mysql.Connection, userIds: number[], count: number) {
  console.log('🔔 Seeding notifications...');

  // Schema: recipient_type, user_id, type, title, message, channel, read
  const types = ['info', 'warning', 'success', 'error'];

  for (let i = 0; i < count; i++) {
    const isRead = Math.random() < 0.4;

    await connection.query(
      `INSERT INTO notifications (recipient_type, user_id, type, title, message, channel, \`read\`, created_at, updated_at)
       VALUES ('user', ?, ?, ?, ?, 'in_app', ?, NOW(), NOW())`,
      [
        userIds[i % userIds.length],
        types[i % types.length],
        faker.lorem.sentence({ min: 3, max: 6 }),
        faker.lorem.sentence(),
        isRead ? 1 : 0,
      ]
    );
  }

  console.log(`   ✓ Created ${count} notifications`);
}

async function seedInboxItems(connection: mysql.Connection, userIds: number[], count: number) {
  console.log('📥 Seeding inbox items...');

  // Schema: user_id, source_type, source_id, reference_type, reference_id, title, description, status
  const sourceTypes = ['mention', 'task_assignment', 'task_update'];
  const statuses = ['unread', 'seen', 'completed'];

  for (let i = 0; i < count; i++) {
    const status = statuses[i % statuses.length];

    await connection.query(
      `INSERT INTO inbox_items (user_id, source_type, source_id, reference_type, reference_id, title, description, status, created_at, updated_at)
       VALUES (?, ?, ?, 'order', ?, ?, ?, ?, NOW(), NOW())`,
      [
        userIds[i % userIds.length],
        sourceTypes[i % sourceTypes.length],
        i + 1,
        i + 1,
        faker.lorem.sentence({ min: 3, max: 8 }),
        faker.lorem.paragraph(),
        status,
      ]
    );
  }

  console.log(`   ✓ Created ${count} inbox items`);
}

async function seedCalendarEvents(connection: mysql.Connection, userIds: number[], clientIds: number[], count: number) {
  console.log('📅 Seeding calendar events...');

  // CORRECT schema: start_date, end_date, start_time, end_time, module, event_type,
  // created_by, client_id (NOT related_client_id), is_floating_time
  const modules = ['INVENTORY', 'ACCOUNTING', 'CLIENTS', 'ORDERS', 'GENERAL'];
  const eventTypes = ['MEETING', 'DELIVERY', 'TASK', 'REMINDER', 'INTAKE'];

  for (let i = 0; i < count; i++) {
    const startDate = faker.date.soon({ days: 30 });
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    await connection.query(
      `INSERT INTO calendar_events (title, description, start_date, end_date, start_time, end_time, module, event_type, created_by, client_id, is_floating_time)
       VALUES (?, ?, ?, ?, '09:00:00', '10:00:00', ?, ?, ?, ?, 0)`,
      [
        faker.lorem.sentence({ min: 3, max: 6 }),
        faker.lorem.paragraph(),
        formatDate(startDate),
        formatDate(endDate),
        modules[i % modules.length],
        eventTypes[i % eventTypes.length],
        userIds[i % userIds.length],
        Math.random() < 0.7 ? clientIds[i % clientIds.length] : null,
      ]
    );
  }

  console.log(`   ✓ Created ${count} calendar events`);
}

async function seedBills(connection: mysql.Connection, vendorIds: number[], count: number) {
  console.log('📄 Seeding bills (AP)...');

  // Schema: billNumber, vendorId, billDate, dueDate, subtotal, taxAmount,
  // discountAmount, totalAmount, amountPaid, amountDue, status, notes

  for (let i = 0; i < count; i++) {
    const subtotal = faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 });
    const tax = subtotal * 0.0875;
    const total = subtotal + tax;
    const isPaid = Math.random() < 0.4;
    const paidAmount = isPaid ? total : (Math.random() < 0.2 ? total * faker.number.float({ min: 0.3, max: 0.7 }) : 0);
    const dueDate = faker.date.soon({ days: 30 });

    const status = paidAmount >= total ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : (dueDate < new Date() ? 'OVERDUE' : 'PENDING'));

    await connection.query(
      `INSERT INTO bills (billNumber, vendorId, billDate, dueDate, subtotal, taxAmount, discountAmount, totalAmount, amountPaid, amountDue, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      [
        `BILL-${String(i + 1).padStart(6, '0')}`,
        vendorIds[i % vendorIds.length],
        formatDate(faker.date.recent({ days: 60 })),
        formatDate(dueDate),
        subtotal.toFixed(2),
        tax.toFixed(2),
        total.toFixed(2),
        paidAmount.toFixed(2),
        (total - paidAmount).toFixed(2),
        status,
        faker.lorem.sentence(),
      ]
    );
  }

  console.log(`   ✓ Created ${count} bills`);
}

async function seedCashLocations(connection: mysql.Connection) {
  console.log('💵 Seeding cash locations...');

  // Schema: name, current_balance, is_active
  const locations = [
    { name: 'Main Safe', balance: '50000.00' },
    { name: 'Register 1', balance: '2500.00' },
    { name: 'Register 2', balance: '1800.00' },
    { name: 'Petty Cash', balance: '500.00' },
  ];

  for (const loc of locations) {
    await connection.query(
      `INSERT INTO cash_locations (name, current_balance, is_active) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE current_balance = VALUES(current_balance)`,
      [loc.name, loc.balance]
    );
  }

  console.log(`   ✓ Created ${locations.length} cash locations`);
}

async function seedLeaderboardData(connection: mysql.Connection, clientIds: number[]) {
  console.log('🏆 Seeding leaderboard data...');

  // Schema: client_id, metric_type, metric_value, sample_size, is_significant, calculated_at, expires_at
  const metrics = ['revenue', 'orders', 'margin', 'payment_speed'];
  let created = 0;

  for (const clientId of clientIds.slice(0, 20)) {
    for (const metric of metrics) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await connection.query(
        `INSERT INTO leaderboard_metric_cache (client_id, metric_type, metric_value, sample_size, is_significant, calculated_at, expires_at)
         VALUES (?, ?, ?, ?, 1, NOW(), ?)`,
        [
          clientId,
          metric,
          faker.number.float({ min: 1000, max: 100000, fractionDigits: 2 }),
          faker.number.int({ min: 5, max: 50 }),
          formatDateTime(expiresAt),
        ]
      );
      created++;
    }
  }

  console.log(`   ✓ Created ${created} leaderboard entries`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const config = parseArgs();
  const counts = getCounts(config.size);

  console.log('\n' + '='.repeat(60));
  console.log('🚀 TERP Comprehensive Seed Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${config.size.toUpperCase()}`);
  console.log(`Clear Data: ${config.clearData}`);
  console.log(`Dry Run: ${config.dryRun}`);
  console.log('='.repeat(60) + '\n');

  // Production guard
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ERROR: Cannot run seed script in production environment');
    console.error('   Set NODE_ENV to development or staging to run this script');
    process.exit(1);
  }

  if (config.dryRun) {
    console.log('📋 DRY RUN - No data will be modified\n');
    console.log('Would seed:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  - ${table}: ${count} records`);
    });
    console.log('\nRun without --dry-run to execute.\n');
    return;
  }

  faker.seed(config.seed);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log('📡 Connecting to database...');
  const connection = await mysql.createConnection(dbUrl);
  console.log('   ✓ Connected\n');

  try {
    // Clear existing data first
    if (config.clearData) {
      await clearTables(connection, config.dryRun);
    }

    // Seed in FK dependency order
    const userList = await seedUsers(connection);
    const userIds = userList.map((u: any) => u.id);

    await seedPricingDefaults(connection);

    const workflowStatusList = await seedWorkflowStatuses(connection);
    const workflowStatusIds = workflowStatusList.map((s: any) => s.id);

    const vendorList = await seedVendors(connection, counts.vendors);
    const vendorIds = vendorList.map((v: any) => v.id);

    const clientList = await seedClients(connection, counts.clients);
    const clientIds = clientList.map((c: any) => c.id);

    const brandList = await seedBrands(connection, vendorIds);
    const brandIds = brandList.map((b: any) => b.id);

    const strainList = await seedStrains(connection);
    const strainIds = strainList.map((s: any) => s.id);

    const productList = await seedProducts(connection, brandIds, strainIds, counts.products);
    const productIds = productList.map((p: any) => p.id);

    const lotList = await seedLots(connection, vendorIds);
    const lotIds = lotList.map((l: any) => l.id);

    const batchList = await seedBatches(connection, productIds, lotIds, workflowStatusIds, counts.batches);
    const batchIds = batchList.map((b: any) => b.id);

    const orderList = await seedOrders(connection, clientIds, batchList, userIds, counts.orders);

    const invoiceList = await seedInvoices(connection, orderList, counts.invoices);

    await seedPayments(connection, invoiceList, counts.payments);

    await seedClientTransactions(connection, orderList, invoiceList);

    await seedBatchStatusHistory(connection, batchIds, workflowStatusIds, userIds);

    await seedNotifications(connection, userIds, counts.notifications);

    await seedInboxItems(connection, userIds, Math.floor(counts.notifications / 2));

    await seedCalendarEvents(connection, userIds, clientIds, counts.calendarEvents);

    await seedBills(connection, vendorIds, counts.bills);

    await seedCashLocations(connection);

    await seedLeaderboardData(connection, clientIds);

    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPREHENSIVE SEED COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nAll linked data has been seeded successfully.');
    console.log('The system is now ready for testing.\n');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ SEED FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
