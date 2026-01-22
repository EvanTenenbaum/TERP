#!/usr/bin/env tsx
/**
 * TERP Ultra-Comprehensive Seed Script v3.0
 *
 * Seeds ALL tables with realistic, properly-linked data.
 * Column names verified against production schema dump on 2026-01-22
 *
 * Production has 111 tables - this script seeds the critical ones for full app testing.
 *
 * Usage:
 *   pnpm seed:comprehensive              # Full seed
 *   pnpm seed:comprehensive --light      # Light seed for quick testing
 *   pnpm seed:comprehensive --dry-run    # Preview without changes
 */

import mysql from 'mysql2/promise';
import { faker } from '@faker-js/faker';
// DATA-004: Import feature flags seeder
import { seedFeatureFlags } from '../server/services/seedFeatureFlags';

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
  clients: 30,
  vendors: 10,
  products: 50,
  batches: 80,
  orders: 150,
  invoices: 120,
  payments: 80,
  bills: 40,
  calendarEvents: 40,
  todoLists: 8,
  todoTasks: 30,
  comments: 50,
  sampleRequests: 20,
  intakeSessions: 10,
  vipClients: 15,
  clientNeeds: 20,
  vendorSupply: 15,
  recurringOrders: 8,
  referralCredits: 10,
};

const FULL_COUNTS = {
  clients: 100,
  vendors: 25,
  products: 150,
  batches: 300,
  orders: 500,
  invoices: 400,
  payments: 300,
  bills: 100,
  calendarEvents: 100,
  todoLists: 20,
  todoTasks: 80,
  comments: 150,
  sampleRequests: 60,
  intakeSessions: 30,
  vipClients: 40,
  clientNeeds: 60,
  vendorSupply: 50,
  recurringOrders: 20,
  referralCredits: 30,
};

// Tables to clear in reverse FK dependency order
const TABLES_TO_CLEAR = [
  // Leaderboard & Dashboard
  'leaderboard_metric_cache',
  'leaderboard_rank_history',
  'leaderboard_weight_configs',
  'leaderboard_scores',
  'dashboard_widget_configs',

  // Calendar
  'calendar_event_history',
  'calendar_event_participants',
  'calendar_reminders',
  'calendar_recurrence_instances',
  'calendar_recurrence_rules',
  'calendar_views',
  'appointment_requests',
  'time_off_requests',
  'calendar_blocked_dates',
  'calendar_availability',
  'appointment_types',
  'calendar_events',
  'client_meeting_history',
  'calendar_user_access',
  'calendars',

  // Todo & Comments
  'comment_mentions',
  'comments',
  'todo_task_activity',
  'todo_tasks',
  'todo_list_members',
  'todo_lists',

  // Notes
  'note_activity',
  'note_comments',
  'freeform_notes',
  'scratch_pad_notes',

  // Inbox
  'inbox_items',

  // VIP Portal
  'vip_tier_history',
  'client_vip_status',
  'vip_tiers',
  'vip_portal_auth',
  'vip_portal_configurations',
  'client_price_alerts',
  'client_draft_interests',
  'client_interest_list_items',
  'client_interest_lists',
  'client_catalog_views',

  // Referrals
  'referral_credits',

  // Marketplace
  'match_records',
  'vendor_supply',
  'client_needs',

  // Samples
  'sample_inventory_log',
  'sampleAllocations',
  'sampleRequests',

  // Intake
  'intake_discrepancies',
  'intake_receipt_items',
  'intake_receipts',
  'intake_session_batches',
  'intake_sessions',

  // Inventory
  'inventoryAlerts',
  'inventoryMovements',
  'inventoryViews',
  'batchLocations',

  // Transactions & Finance
  'transactionLinks',
  'transactions',
  'ledgerEntries',
  'client_transactions',

  // Returns
  'returns',

  // Orders & Payments
  'order_audit_log',
  'order_status_history',
  'order_line_items',
  'recurring_orders',
  'payments',
  'invoiceLineItems',
  'invoices',
  'orders',

  // Bills
  'billLineItems',
  'bills',

  // Purchase Orders
  'purchaseOrderItems',
  'purchaseOrders',

  // Batch History
  'batch_status_history',
  'paymentHistory',
  'cogsHistory',

  // Batches & Products
  'batches',
  'lots',
  'productTags',
  'productMedia',
  'productSynonyms',
  'products',
  'strains',
  'brands',

  // Tags
  'tagGroupMembers',
  'tagGroups',
  'tagHierarchy',
  'tags',

  // Locations
  'locations',

  // Clients & Vendors
  'clientTags',
  'client_communications',
  'client_contacts',
  'supplier_profiles',
  'vendorNotes',
  'clients',
  'vendors',

  // System config
  'workflow_statuses',
  'pricing_defaults',
  'pricing_profiles',
  'pricing_rules',
  'paymentMethods',
  'unit_types',
  'categories',
  'subcategories',
  'grades',
  'sales_sheet_templates',
  'salesSheetVersions',
  'sales_sheet_history',
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
  'Santa Ana', 'Riverside', 'Stockton', 'Irvine', 'Chula Vista',
  'Santa Rosa', 'Modesto', 'Huntington Beach', 'Glendale', 'San Bernardino',
];

// Realistic dispensary/cannabis company names
const COMPANY_PREFIXES = [
  'Green', 'Pacific', 'Golden', 'West Coast', 'Mountain', 'Valley',
  'Coastal', 'Emerald', 'Sunset', 'Harbor', 'Bay', 'Sierra', 'NorCal',
  'SoCal', 'Central', 'Redwood', 'Trinity', 'Mendocino', 'Humboldt',
  'Marin', 'Sonoma', 'Napa', 'Tahoe', 'Santa Cruz', 'Monterey',
];

const COMPANY_SUFFIXES = [
  'Dispensary', 'Cannabis Co', 'Wellness Center', 'Collective', 'Gardens',
  'Farms', 'Supply', 'Distribution', 'Therapeutics', 'Health',
  'Naturals', 'Organics', 'Premium', 'Select', 'Reserve', 'Apothecary',
];

function generateCompanyName(): string {
  const prefix = faker.helpers.arrayElement(COMPANY_PREFIXES);
  const suffix = faker.helpers.arrayElement(COMPANY_SUFFIXES);
  if (Math.random() < 0.3) {
    const city = faker.helpers.arrayElement(CALIFORNIA_CITIES);
    return `${city} ${suffix}`;
  }
  return `${prefix} ${suffix}`;
}

function generateCaliforniaAddress(): string {
  const city = faker.helpers.arrayElement(CALIFORNIA_CITIES);
  const street = faker.location.streetAddress();
  const zip = faker.location.zipCode('9####');
  return `${street}, ${city}, CA ${zip}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// ============================================================================
// Database Operations
// ============================================================================

async function tableExists(connection: mysql.Connection, tableName: string): Promise<boolean> {
  try {
    await connection.query(`SELECT 1 FROM \`${tableName}\` LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function clearTables(connection: mysql.Connection, dryRun: boolean) {
  console.log('🗑️  Clearing existing data...');

  if (dryRun) {
    console.log('   [DRY RUN] Would clear tables');
    return;
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of TABLES_TO_CLEAR) {
    try {
      await connection.query(`DELETE FROM \`${table}\``);
      console.log(`   ✓ Cleared: ${table}`);
    } catch (error: any) {
      if (error?.code === 'ER_NO_SUCH_TABLE') {
        // Silent skip
      } else {
        // console.log(`   - Skipped: ${table}`);
      }
    }
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('   ✓ Data cleared\n');
}

// ============================================================================
// TIER 1: Core Foundation Tables
// ============================================================================

async function seedUsers(connection: mysql.Connection) {
  console.log('👤 Seeding users...');

  const [existing] = await connection.query('SELECT id FROM users LIMIT 1');
  if ((existing as any[]).length > 0) {
    console.log('   ✓ Users exist, fetching');
    const [rows] = await connection.query('SELECT id, name FROM users');
    return rows as any[];
  }

  // Production schema: openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn
  const userData = [
    ['admin-seed-001', 'Admin User', 'admin@terp.local', 'admin'],
    ['user-seed-001', 'Sarah Johnson', 'sarah.johnson@terp.local', 'user'],
    ['user-seed-002', 'Mike Chen', 'mike.chen@terp.local', 'user'],
    ['user-seed-003', 'Emily Rodriguez', 'emily.rodriguez@terp.local', 'user'],
    ['user-seed-004', 'David Kim', 'david.kim@terp.local', 'user'],
    ['user-seed-005', 'Jessica Williams', 'jessica.williams@terp.local', 'user'],
  ];

  for (const [openId, name, email, role] of userData) {
    await connection.query(
      `INSERT INTO users (openId, name, email, role, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [openId, name, email, role]
    );
  }

  console.log(`   ✓ Created ${userData.length} users`);
  const [rows] = await connection.query('SELECT id, name FROM users');
  return rows as any[];
}

async function seedWorkflowStatuses(connection: mysql.Connection) {
  console.log('📋 Seeding workflow statuses...');

  // Production schema: name, slug, color, order (int), isActive (tinyint)
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
      `INSERT INTO workflow_statuses (name, slug, color, \`order\`, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [status.name, status.slug, status.color, status.order]
    );
  }

  console.log(`   ✓ Created ${statuses.length} workflow statuses`);
  const [rows] = await connection.query('SELECT id, name, slug FROM workflow_statuses ORDER BY `order`');
  return rows as any[];
}

async function seedPricingDefaults(connection: mysql.Connection) {
  console.log('💰 Seeding pricing defaults...');

  // Production schema: product_category, default_margin_percent
  const categories = ['Flower', 'Pre-Roll', 'Concentrate', 'Edible', 'Vape', 'Topical', 'Tincture', 'Accessories'];

  for (const category of categories) {
    const defaultMargin = faker.number.float({ min: 20, max: 40, fractionDigits: 2 });
    await connection.query(
      `INSERT INTO pricing_defaults (product_category, default_margin_percent, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE default_margin_percent = VALUES(default_margin_percent)`,
      [category, defaultMargin]
    );
  }

  console.log(`   ✓ Created ${categories.length} pricing defaults`);
}

async function seedVendors(connection: mysql.Connection, count: number) {
  console.log('🏭 Seeding vendors...');

  // Production schema: name, contactName, contactEmail, contactPhone, paymentTerms, notes
  const vendorNames = [
    'NorCal Premium Farms', 'Emerald Triangle Growers', 'Humboldt Harvest Co',
    'Mendocino Gardens', 'Trinity Alps Cultivation', 'Sacramento Valley Farms',
    'Central Coast Growers', 'SoCal Premium Supply', 'Bay Area Collective',
    'Sierra Nevada Farms', 'Redwood Coast Cannabis', 'Golden State Cultivators',
    'Pacific Coast Growers', 'Mountain View Organics', 'Valley Green Supply',
    'Sunset Valley Farms', 'Coastal Range Cultivation', 'High Sierra Gardens',
    'Delta Farms California', 'Riverside Premium Growers', 'Santa Cruz Naturals',
    'Monterey Bay Farms', 'Napa Valley Cannabis', 'Sonoma County Growers',
    'Tahoe Mountain Supply',
  ];

  for (let i = 0; i < Math.min(count, vendorNames.length); i++) {
    const name = vendorNames[i];
    const contactName = faker.person.fullName();
    await connection.query(
      `INSERT INTO vendors (name, contactName, contactEmail, contactPhone, paymentTerms, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        name,
        contactName,
        faker.internet.email({ firstName: contactName.split(' ')[0], lastName: name.split(' ')[0].toLowerCase() }),
        faker.phone.number('(###) ###-####'),
        faker.helpers.arrayElement(['NET_15', 'NET_30', 'COD']),
        `Premium cannabis supplier - ${faker.lorem.sentence()}`,
      ]
    );
  }

  console.log(`   ✓ Created ${Math.min(count, vendorNames.length)} vendors`);
  const [rows] = await connection.query('SELECT id, name FROM vendors');
  return rows as any[];
}

async function seedClients(connection: mysql.Connection, count: number) {
  console.log('👥 Seeding clients...');

  // Production schema: teri_code, name, email, phone, address, is_buyer, is_seller, is_brand, tags
  const usedNames = new Set<string>();
  const whaleCount = Math.floor(count * 0.15);
  const regularCount = count - whaleCount;

  // Whale clients (high volume)
  for (let i = 0; i < whaleCount; i++) {
    let companyName = generateCompanyName();
    while (usedNames.has(companyName)) {
      companyName = `${generateCompanyName()} ${faker.helpers.arrayElement(['Inc', 'LLC', 'Group'])}`;
    }
    usedNames.add(companyName);

    await connection.query(
      `INSERT INTO clients (teri_code, name, email, phone, address, is_buyer, is_seller, is_brand, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, NOW(), NOW())`,
      [
        `WHL${String(i + 1).padStart(4, '0')}`,
        companyName,
        faker.internet.email({ firstName: 'orders', lastName: companyName.split(' ')[0].toLowerCase() }),
        faker.phone.number('(###) ###-####'),
        generateCaliforniaAddress(),
        Math.random() < 0.2 ? 1 : 0,
        Math.random() < 0.1 ? 1 : 0,
        JSON.stringify(['wholesale', 'high-volume', 'vip']),
      ]
    );
  }

  // Regular clients
  for (let i = 0; i < regularCount; i++) {
    let companyName = generateCompanyName();
    while (usedNames.has(companyName)) {
      companyName = `${generateCompanyName()} ${faker.number.int({ min: 1, max: 99 })}`;
    }
    usedNames.add(companyName);

    await connection.query(
      `INSERT INTO clients (teri_code, name, email, phone, address, is_buyer, is_seller, is_brand, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, 0, ?, NOW(), NOW())`,
      [
        `REG${String(i + 1).padStart(4, '0')}`,
        companyName,
        faker.internet.email({ firstName: 'contact', lastName: companyName.split(' ')[0].toLowerCase() }),
        faker.phone.number('(###) ###-####'),
        generateCaliforniaAddress(),
        Math.random() < 0.15 ? 1 : 0,
        JSON.stringify(['retail']),
      ]
    );
  }

  console.log(`   ✓ Created ${count} clients (${whaleCount} whale, ${regularCount} regular)`);
  const [rows] = await connection.query('SELECT id, name, teri_code, is_buyer, is_seller FROM clients');
  return rows as any[];
}

async function seedBrands(connection: mysql.Connection, vendorIds: number[]) {
  console.log('🏷️ Seeding brands...');

  // Production schema: name, vendorId, description
  const brandNames = [
    'TERP House Premium', 'Golden Leaf Select', 'Pacific Buds Co',
    'Mountain High Reserve', 'Valley Green Organics', 'Sunset Farms Elite',
    'Coastal Cannabis Premium', 'Sierra Select', 'NorCal Naturals',
    'Emerald Reserve', 'Bay Area Best', 'Central Valley Choice',
    'Humboldt Heritage', 'Mendocino Magic', 'Trinity Top Shelf',
  ];

  for (let i = 0; i < brandNames.length; i++) {
    await connection.query(
      `INSERT INTO brands (name, vendorId, description, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())`,
      [brandNames[i], vendorIds[i % vendorIds.length], faker.lorem.sentence()]
    );
  }

  console.log(`   ✓ Created ${brandNames.length} brands`);
  const [rows] = await connection.query('SELECT id, name, vendorId FROM brands');
  return rows as any[];
}

async function seedStrains(connection: mysql.Connection) {
  console.log('🌿 Seeding strains...');

  // Production schema: name, standardizedName, aliases, category, description
  const strainList = [
    { name: 'OG Kush', category: 'Hybrid' },
    { name: 'Blue Dream', category: 'Sativa' },
    { name: 'Gelato', category: 'Hybrid' },
    { name: 'Wedding Cake', category: 'Indica' },
    { name: 'Gorilla Glue #4', category: 'Hybrid' },
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
    { name: 'Mimosa', category: 'Sativa' },
    { name: 'Do-Si-Dos', category: 'Indica' },
    { name: 'MAC', category: 'Hybrid' },
    { name: 'Apple Fritter', category: 'Hybrid' },
    { name: 'Biscotti', category: 'Indica' },
    { name: 'Jealousy', category: 'Hybrid' },
    { name: 'London Pound Cake', category: 'Indica' },
    { name: 'Pink Runtz', category: 'Hybrid' },
  ];

  for (const strain of strainList) {
    await connection.query(
      `INSERT INTO strains (name, standardizedName, category, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [strain.name, strain.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), strain.category, faker.lorem.sentence()]
    );
  }

  console.log(`   ✓ Created ${strainList.length} strains`);
  const [rows] = await connection.query('SELECT id, name, category FROM strains');
  return rows as any[];
}

async function seedLocations(connection: mysql.Connection) {
  console.log('📍 Seeding locations...');

  // Production schema: site, zone, rack, shelf, bin, isActive
  const locations = [
    { site: 'Main Warehouse', zone: 'A', rack: '1', shelf: '1', bin: '1' },
    { site: 'Main Warehouse', zone: 'A', rack: '1', shelf: '2', bin: '1' },
    { site: 'Main Warehouse', zone: 'A', rack: '2', shelf: '1', bin: '1' },
    { site: 'Main Warehouse', zone: 'B', rack: '1', shelf: '1', bin: '1' },
    { site: 'Main Warehouse', zone: 'B', rack: '1', shelf: '2', bin: '1' },
    { site: 'Cold Storage', zone: 'C', rack: '1', shelf: '1', bin: '1' },
    { site: 'Cold Storage', zone: 'C', rack: '1', shelf: '2', bin: '1' },
    { site: 'Vault', zone: 'V', rack: '1', shelf: '1', bin: '1' },
  ];

  for (const loc of locations) {
    await connection.query(
      `INSERT INTO locations (site, zone, rack, shelf, bin, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [loc.site, loc.zone, loc.rack, loc.shelf, loc.bin]
    );
  }

  console.log(`   ✓ Created ${locations.length} locations`);
  const [rows] = await connection.query('SELECT id, site, zone FROM locations');
  return rows as any[];
}

async function seedTags(connection: mysql.Connection) {
  console.log('🏷️ Seeding tags...');

  // Production schema: name, standardizedName, category, description
  // Valid ENUM values: STATUS, PRIORITY, TYPE, CUSTOM, STRAIN, FLAVOR, EFFECT
  const tagData = [
    { name: 'Indoor', category: 'CUSTOM' },
    { name: 'Outdoor', category: 'CUSTOM' },
    { name: 'Greenhouse', category: 'CUSTOM' },
    { name: 'Light Dep', category: 'CUSTOM' },
    { name: 'Organic', category: 'CUSTOM' },
    { name: 'Premium', category: 'CUSTOM' },
    { name: 'Budget', category: 'CUSTOM' },
    { name: 'High THC', category: 'EFFECT' },
    { name: 'High CBD', category: 'EFFECT' },
    { name: 'Award Winner', category: 'STATUS' },
    { name: 'New Arrival', category: 'STATUS' },
    { name: 'Limited Edition', category: 'STATUS' },
    { name: 'Best Seller', category: 'STATUS' },
    { name: 'Staff Pick', category: 'STATUS' },
  ];

  for (const tag of tagData) {
    await connection.query(
      `INSERT INTO tags (name, standardizedName, category, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [tag.name, tag.name.toLowerCase().replace(/\s+/g, '-'), tag.category, faker.lorem.sentence()]
    );
  }

  console.log(`   ✓ Created ${tagData.length} tags`);
  const [rows] = await connection.query('SELECT id, name FROM tags');
  return rows as any[];
}

// ============================================================================
// TIER 2: Product & Inventory Tables
// ============================================================================

async function seedProducts(connection: mysql.Connection, brandIds: number[], strainIds: number[], count: number) {
  console.log('📦 Seeding products...');

  // Production schema: brandId, strainId, nameCanonical, category, subcategory, uomSellable, description, margin
  const categories = ['Flower', 'Pre-Roll', 'Concentrate', 'Edible', 'Vape', 'Topical', 'Tincture'];
  const subcategories: Record<string, string[]> = {
    Flower: ['Indoor', 'Outdoor', 'Greenhouse', 'Light Dep'],
    'Pre-Roll': ['Single', 'Multi-Pack', 'Infused'],
    Concentrate: ['Live Resin', 'Shatter', 'Wax', 'Rosin', 'Diamonds'],
    Edible: ['Gummies', 'Chocolate', 'Beverages', 'Baked Goods'],
    Vape: ['Cartridge', 'Disposable', 'Pod'],
    Topical: ['Lotion', 'Balm', 'Oil'],
    Tincture: ['Full Spectrum', 'Isolate', 'Broad Spectrum'],
  };

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const subs = subcategories[category] || [];
    const strain = strainIds[i % strainIds.length];
    const brand = brandIds[i % brandIds.length];

    await connection.query(
      `INSERT INTO products (brandId, strainId, nameCanonical, category, subcategory, uomSellable, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        brand,
        strain,
        `${faker.commerce.productAdjective()} ${category} - ${faker.word.noun()}`,
        category,
        subs.length > 0 ? subs[i % subs.length] : null,
        category === 'Flower' ? 'LB' : 'EA',
        faker.lorem.sentence(),
      ]
    );
  }

  console.log(`   ✓ Created ${count} products`);
  const [rows] = await connection.query('SELECT id, nameCanonical, category, brandId FROM products');
  return rows as any[];
}

async function seedLots(connection: mysql.Connection, vendorIds: number[]) {
  console.log('📊 Seeding lots...');

  // Production schema: code, vendorId, supplier_client_id, date, notes
  const lotCount = vendorIds.length * 10;

  for (let i = 0; i < lotCount; i++) {
    await connection.query(
      `INSERT INTO lots (code, vendorId, date, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [
        `LOT-${formatDate(new Date()).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
        vendorIds[i % vendorIds.length],
        formatDateTime(faker.date.recent({ days: 120 })),
        faker.lorem.sentence(),
      ]
    );
  }

  console.log(`   ✓ Created ${lotCount} lots`);
  const [rows] = await connection.query('SELECT id, code, vendorId FROM lots');
  return rows as any[];
}

async function seedBatches(connection: mysql.Connection, productIds: number[], lotIds: number[], workflowStatusIds: number[], count: number) {
  console.log('📦 Seeding batches...');

  // Production schema: code, sku, productId, lotId, batchStatus, statusId, grade, cogsMode, unitCogs,
  // paymentTerms, onHandQty, sampleQty, reservedQty, quarantineQty, holdQty, defectiveQty, publishEcom, publishB2b
  const statuses = ['AWAITING_INTAKE', 'LIVE', 'PHOTOGRAPHY_COMPLETE', 'ON_HOLD', 'SOLD_OUT'];
  const paymentTermsOptions = ['COD', 'NET_7', 'NET_15', 'NET_30', 'CONSIGNMENT'];
  const grades = ['A', 'A', 'A', 'B', 'B', 'C', null];

  for (let i = 0; i < count; i++) {
    const status = i < count * 0.65 ? 'LIVE' : statuses[i % statuses.length];
    const statusIdx = statuses.indexOf(status);
    const unitCogs = faker.number.float({ min: 100, max: 800, fractionDigits: 2 });
    const onHandQty = faker.number.float({ min: 5, max: 250, fractionDigits: 2 });

    await connection.query(
      `INSERT INTO batches (code, sku, productId, lotId, batchStatus, statusId, grade, cogsMode, unitCogs, paymentTerms, onHandQty, sampleQty, reservedQty, quarantineQty, holdQty, defectiveQty, publishEcom, publishB2b, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'FIXED', ?, ?, ?, 0, 0, 0, 0, 0, ?, ?, NOW(), NOW())`,
      [
        `BATCH-${formatDate(new Date()).replace(/-/g, '')}-${String(i + 1).padStart(5, '0')}`,
        `SKU-${String(i + 1).padStart(8, '0')}`,
        productIds[i % productIds.length],
        lotIds[i % lotIds.length],
        status,
        workflowStatusIds[statusIdx % workflowStatusIds.length] || workflowStatusIds[0],
        faker.helpers.arrayElement(grades),
        unitCogs,
        paymentTermsOptions[i % paymentTermsOptions.length],
        onHandQty,
        status === 'LIVE' ? 1 : 0,
        status === 'LIVE' ? 1 : 0,
      ]
    );
  }

  console.log(`   ✓ Created ${count} batches`);
  const [rows] = await connection.query('SELECT id, productId, unitCogs, onHandQty, batchStatus FROM batches');
  return rows as any[];
}

// ============================================================================
// TIER 3: Transaction Tables
// ============================================================================

async function seedOrders(connection: mysql.Connection, clientIds: number[], batchData: any[], userIds: number[], count: number) {
  console.log('🛍️ Seeding orders...');

  // Production schema: order_number, orderType, client_id, items, subtotal, tax, discount, total,
  // version, total_cogs, total_margin, avg_margin_percent, paymentTerms, due_date, saleStatus,
  // fulfillmentStatus, created_by, is_draft
  const paymentTerms = ['NET_7', 'NET_15', 'NET_30', 'COD'];

  for (let i = 0; i < count; i++) {
    const clientId = clientIds[i % clientIds.length];
    const itemCount = faker.number.int({ min: 1, max: 5 });

    const items = [];
    let subtotal = 0;
    let totalCogs = 0;

    for (let j = 0; j < itemCount; j++) {
      const batch = batchData[(i + j) % batchData.length];
      const unitCogs = parseFloat(batch.unitCogs || '100');
      const marginPercent = faker.number.float({ min: 18, max: 40 });
      const unitPrice = unitCogs / (1 - marginPercent / 100);
      const quantity = faker.number.float({ min: 0.25, max: 15, fractionDigits: 2 });
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

    const isPaid = Math.random() < 0.55;
    const isOverdue = !isPaid && dueDate < new Date();
    const saleStatus = isPaid ? 'PAID' : (isOverdue ? 'OVERDUE' : 'PENDING');

    await connection.query(
      `INSERT INTO orders (order_number, orderType, client_id, items, subtotal, tax, discount, total, version, total_cogs, total_margin, avg_margin_percent, paymentTerms, due_date, saleStatus, fulfillmentStatus, created_by, is_draft, created_at, updated_at)
       VALUES (?, 'SALE', ?, ?, ?, ?, 0, ?, 1, ?, ?, ?, ?, ?, ?, 'PENDING', ?, 0, ?, NOW())`,
      [
        `ORD-${formatDate(createdAt).replace(/-/g, '')}-${String(i + 1).padStart(5, '0')}`,
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
        userIds[i % userIds.length],
        formatDateTime(createdAt),
      ]
    );
  }

  console.log(`   ✓ Created ${count} orders`);
  const [rows] = await connection.query('SELECT id, client_id as clientId, total, saleStatus, created_at as createdAt, items FROM orders');
  return rows as any[];
}

async function seedInvoices(connection: mysql.Connection, orderData: any[], userIds: number[], count: number) {
  console.log('💵 Seeding invoices...');

  // Production schema: invoiceNumber, customerId, invoiceDate, dueDate, subtotal, taxAmount,
  // discountAmount, totalAmount, amountPaid, amountDue, status, paymentTerms, notes,
  // referenceType, referenceId, createdBy, version
  for (let i = 0; i < Math.min(count, orderData.length); i++) {
    const order = orderData[i];
    const total = parseFloat(order.total || '1000');
    const isPaid = Math.random() < 0.5;
    const paidAmount = isPaid ? total : (Math.random() < 0.3 ? total * faker.number.float({ min: 0.3, max: 0.7 }) : 0);
    const dueDate = new Date(order.createdAt);
    dueDate.setDate(dueDate.getDate() + faker.helpers.arrayElement([7, 15, 30]));

    const status = paidAmount >= total ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : (dueDate < new Date() ? 'OVERDUE' : 'SENT'));

    await connection.query(
      `INSERT INTO invoices (invoiceNumber, customerId, invoiceDate, dueDate, subtotal, taxAmount, discountAmount, totalAmount, amountPaid, amountDue, status, referenceType, referenceId, createdBy, version, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'ORDER', ?, ?, 1, NOW(), NOW())`,
      [
        `INV-${formatDate(new Date(order.createdAt)).replace(/-/g, '')}-${String(i + 1).padStart(5, '0')}`,
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
        userIds[i % userIds.length],
      ]
    );
  }

  console.log(`   ✓ Created ${Math.min(count, orderData.length)} invoices`);
  const [rows] = await connection.query('SELECT id, customerId, totalAmount, amountPaid, status FROM invoices');
  return rows as any[];
}

async function seedPayments(connection: mysql.Connection, invoiceData: any[], userIds: number[], count: number) {
  console.log('💳 Seeding payments...');

  // Production schema: paymentNumber, paymentType, paymentDate, amount, paymentMethod,
  // referenceNumber, customerId, vendorId, invoiceId, billId, notes, isReconciled, createdBy
  const paymentMethods = ['CASH', 'CHECK', 'WIRE', 'ACH'];
  const paidInvoices = invoiceData.filter((inv: any) => parseFloat(inv.amountPaid || '0') > 0);
  let created = 0;

  for (let i = 0; i < Math.min(count, paidInvoices.length); i++) {
    const invoice = paidInvoices[i];
    const amount = parseFloat(invoice.amountPaid || '0');

    await connection.query(
      `INSERT INTO payments (paymentNumber, paymentType, paymentDate, amount, paymentMethod, customerId, invoiceId, referenceNumber, notes, isReconciled, createdBy, createdAt, updatedAt)
       VALUES (?, 'RECEIVED', ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())`,
      [
        `PAY-${formatDate(new Date()).replace(/-/g, '')}-${String(i + 1).padStart(5, '0')}`,
        formatDate(faker.date.recent({ days: 60 })),
        amount.toFixed(2),
        faker.helpers.arrayElement(paymentMethods),
        invoice.customerId,
        invoice.id,
        `REF-${faker.string.alphanumeric(10).toUpperCase()}`,
        `Payment for invoice - ${faker.lorem.words(3)}`,
        userIds[i % userIds.length],
      ]
    );
    created++;
  }

  console.log(`   ✓ Created ${created} payments`);
}

async function seedBills(connection: mysql.Connection, vendorClientIds: number[], userIds: number[], count: number) {
  console.log('📄 Seeding bills (AP)...');

  // DATA-001: vendorId in bills references clients.id (where is_seller=true), NOT vendors.id
  // This ensures accounting dashboard can join bills to clients for vendor name display
  // Production schema: billNumber, vendorId, billDate, dueDate, subtotal, taxAmount,
  // discountAmount, totalAmount, amountPaid, amountDue, status, notes, createdBy, version
  for (let i = 0; i < count; i++) {
    const subtotal = faker.number.float({ min: 2000, max: 75000, fractionDigits: 2 });
    const tax = subtotal * 0.0875;
    const total = subtotal + tax;
    const isPaid = Math.random() < 0.4;
    const paidAmount = isPaid ? total : (Math.random() < 0.2 ? total * faker.number.float({ min: 0.3, max: 0.7 }) : 0);
    const billDate = faker.date.recent({ days: 90 });
    const dueDate = new Date(billDate);
    dueDate.setDate(dueDate.getDate() + faker.helpers.arrayElement([15, 30, 45]));

    const status = paidAmount >= total ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : (dueDate < new Date() ? 'OVERDUE' : 'PENDING'));

    await connection.query(
      `INSERT INTO bills (billNumber, vendorId, billDate, dueDate, subtotal, taxAmount, discountAmount, totalAmount, amountPaid, amountDue, status, notes, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        `BILL-${formatDate(billDate).replace(/-/g, '')}-${String(i + 1).padStart(5, '0')}`,
        vendorClientIds[i % vendorClientIds.length],
        formatDate(billDate),
        formatDate(dueDate),
        subtotal.toFixed(2),
        tax.toFixed(2),
        total.toFixed(2),
        paidAmount.toFixed(2),
        (total - paidAmount).toFixed(2),
        status,
        `Vendor bill - ${faker.lorem.words(4)}`,
        userIds[i % userIds.length],
      ]
    );
  }

  console.log(`   ✓ Created ${count} bills`);
}

async function seedClientTransactions(connection: mysql.Connection, orderData: any[], invoiceData: any[]) {
  console.log('📊 Seeding client transactions...');

  // Production schema: client_id, transaction_type, transaction_number, transaction_date, amount, payment_status, payment_amount, notes
  let created = 0;

  for (const order of orderData.slice(0, 300)) {
    const amount = parseFloat(order.total || '0');
    if (amount <= 0) continue;

    await connection.query(
      `INSERT INTO client_transactions (client_id, transaction_type, transaction_number, transaction_date, amount, payment_status, notes, created_at, updated_at)
       VALUES (?, 'ORDER', ?, ?, ?, 'PENDING', ?, NOW(), NOW())`,
      [
        order.clientId,
        `TXN-${String(created + 1).padStart(6, '0')}`,
        formatDate(new Date(order.createdAt)),
        amount.toFixed(2),
        `Sale from order #${order.id}`,
      ]
    );
    created++;
  }

  for (const invoice of invoiceData.slice(0, 250)) {
    const paidAmount = parseFloat(invoice.amountPaid || '0');
    if (paidAmount <= 0) continue;

    await connection.query(
      `INSERT INTO client_transactions (client_id, transaction_type, transaction_number, transaction_date, amount, payment_status, payment_amount, notes, created_at, updated_at)
       VALUES (?, 'PAYMENT', ?, ?, ?, 'PAID', ?, ?, NOW(), NOW())`,
      [
        invoice.customerId,
        `TXN-${String(created + 1).padStart(6, '0')}`,
        formatDate(faker.date.recent({ days: 45 })),
        (-paidAmount).toFixed(2),
        paidAmount.toFixed(2),
        `Payment on invoice #${invoice.id}`,
      ]
    );
    created++;
  }

  console.log(`   ✓ Created ${created} client transactions`);
}

// DATA-002 FIX: Add bank accounts seeder for cash balance
async function seedBankAccounts(connection: mysql.Connection) {
  console.log('🏦 Seeding bank accounts...');

  const exists = await tableExists(connection, 'bankAccounts');
  if (!exists) {
    console.log('   - Skipped: bankAccounts table not exists');
    return;
  }

  // Production schema: accountName, accountNumber, bankName, accountType, currency, currentBalance, isActive
  const bankAccountData = [
    {
      accountName: 'Operating Account',
      accountNumber: '****4567',
      bankName: 'Chase Business',
      accountType: 'CHECKING',
      currentBalance: 1250000.00, // $1.25M operating cash
    },
    {
      accountName: 'Payroll Account',
      accountNumber: '****8901',
      bankName: 'Chase Business',
      accountType: 'CHECKING',
      currentBalance: 350000.00, // $350K payroll reserve
    },
    {
      accountName: 'Reserve Account',
      accountNumber: '****2345',
      bankName: 'Bank of America',
      accountType: 'SAVINGS',
      currentBalance: 500000.00, // $500K reserve
    },
    {
      accountName: 'Business Credit Card',
      accountNumber: '****6789',
      bankName: 'American Express',
      accountType: 'CREDIT_CARD',
      currentBalance: -25000.00, // $25K outstanding balance
    },
  ];

  for (const account of bankAccountData) {
    await connection.query(
      `INSERT INTO bankAccounts (accountName, accountNumber, bankName, accountType, currency, currentBalance, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'USD', ?, 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE currentBalance = VALUES(currentBalance)`,
      [account.accountName, account.accountNumber, account.bankName, account.accountType, account.currentBalance.toFixed(2)]
    );
  }

  console.log(`   ✓ Created ${bankAccountData.length} bank accounts with total balance: $${bankAccountData.reduce((sum, a) => sum + a.currentBalance, 0).toLocaleString()}`);
}

async function seedBatchStatusHistory(connection: mysql.Connection, batchIds: number[], workflowStatusIds: number[], userIds: number[]) {
  console.log('📜 Seeding batch status history...');

  // Production schema: batchId, fromStatusId, toStatusId, changedBy, notes, createdAt
  let created = 0;

  for (const batchId of batchIds.slice(0, 200)) {
    const transitionCount = faker.number.int({ min: 1, max: 4 });
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
          userIds[created % userIds.length],
          faker.lorem.sentence(),
          formatDateTime(faker.date.recent({ days: 120 - (transitionCount - i) * 25 })),
        ]
      );

      prevStatusId = toStatusId;
      created++;
    }
  }

  console.log(`   ✓ Created ${created} batch status history entries`);
}

// ============================================================================
// TIER 4: Calendar & Task Management
// ============================================================================

async function seedCalendars(connection: mysql.Connection, userIds: number[]) {
  console.log('📅 Seeding calendars...');

  const exists = await tableExists(connection, 'calendars');
  if (!exists) {
    console.log('   - Skipped: calendars table not exists');
    return [];
  }

  // Production schema: name, description, color, type, isDefault, isArchived, ownerId
  const calendarData = [
    { name: 'Office Calendar', description: 'Main office schedule and meetings', color: '#3B82F6', type: 'workspace' },
    { name: 'Accounting Calendar', description: 'Payment and billing deadlines', color: '#10B981', type: 'workspace' },
    { name: 'Sales Calendar', description: 'Client meetings and deliveries', color: '#F59E0B', type: 'workspace' },
    { name: 'Intake Calendar', description: 'Product intake schedules', color: '#8B5CF6', type: 'workspace' },
    { name: 'Collections Calendar', description: 'AR collection follow-ups', color: '#EF4444', type: 'workspace' },
  ];

  for (let i = 0; i < calendarData.length; i++) {
    const cal = calendarData[i];
    await connection.query(
      `INSERT INTO calendars (name, description, color, type, is_default, is_archived, owner_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, NOW(), NOW())`,
      [cal.name, cal.description, cal.color, cal.type, i === 0 ? 1 : 0, userIds[0]]
    );
  }

  console.log(`   ✓ Created ${calendarData.length} calendars`);
  const [rows] = await connection.query('SELECT id, name FROM calendars');
  return rows as any[];
}

// SEED-006: Appointment Types Seeder
async function seedAppointmentTypes(connection: mysql.Connection, calendarIds: number[]) {
  console.log('📅 Seeding appointment types...');

  const exists = await tableExists(connection, 'appointment_types');
  if (!exists) {
    console.log('   - Skipped: appointment_types table not exists');
    return;
  }

  // Production schema: calendar_id, name, description, duration, buffer_before, buffer_after, min_notice_hours, max_advance_days, color, is_active
  const appointmentTypeData = [
    { name: 'Client Meeting', description: 'Standard client meeting', duration: 60, bufferBefore: 15, bufferAfter: 15, color: '#3B82F6' },
    { name: 'Payment Pickup', description: 'Client payment pickup appointment', duration: 30, bufferBefore: 0, bufferAfter: 0, color: '#10B981' },
    { name: 'Product Demo', description: 'Product demonstration session', duration: 45, bufferBefore: 10, bufferAfter: 10, color: '#F59E0B' },
    { name: 'Intake Appointment', description: 'Product intake session', duration: 120, bufferBefore: 30, bufferAfter: 30, color: '#8B5CF6' },
    { name: 'Quick Consultation', description: 'Brief phone or video consultation', duration: 15, bufferBefore: 5, bufferAfter: 5, color: '#EC4899' },
  ];

  let created = 0;
  for (const calId of calendarIds) {
    for (const apt of appointmentTypeData) {
      await connection.query(
        `INSERT INTO appointment_types (calendar_id, name, description, duration, buffer_before, buffer_after, min_notice_hours, max_advance_days, color, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 24, 30, ?, 1, NOW(), NOW())`,
        [calId, apt.name, apt.description, apt.duration, apt.bufferBefore, apt.bufferAfter, apt.color]
      );
      created++;
    }
  }

  console.log(`   ✓ Created ${created} appointment types across ${calendarIds.length} calendars`);
}

// SEED-006: Calendar Availability Seeder
async function seedCalendarAvailability(connection: mysql.Connection, calendarIds: number[]) {
  console.log('📅 Seeding calendar availability...');

  const exists = await tableExists(connection, 'calendar_availability');
  if (!exists) {
    console.log('   - Skipped: calendar_availability table not exists');
    return;
  }

  // Production schema: calendar_id, day_of_week, start_time, end_time, is_available
  // dayOfWeek: 0 = Sunday, 6 = Saturday
  const businessHours = [
    { dayOfWeek: 1, startTime: '09:00:00', endTime: '17:00:00' }, // Monday
    { dayOfWeek: 2, startTime: '09:00:00', endTime: '17:00:00' }, // Tuesday
    { dayOfWeek: 3, startTime: '09:00:00', endTime: '17:00:00' }, // Wednesday
    { dayOfWeek: 4, startTime: '09:00:00', endTime: '17:00:00' }, // Thursday
    { dayOfWeek: 5, startTime: '09:00:00', endTime: '17:00:00' }, // Friday
    { dayOfWeek: 6, startTime: '10:00:00', endTime: '14:00:00' }, // Saturday (limited hours)
  ];

  let created = 0;
  for (const calId of calendarIds) {
    for (const hours of businessHours) {
      await connection.query(
        `INSERT INTO calendar_availability (calendar_id, day_of_week, start_time, end_time, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [calId, hours.dayOfWeek, hours.startTime, hours.endTime]
      );
      created++;
    }
  }

  console.log(`   ✓ Created ${created} availability slots across ${calendarIds.length} calendars`);
}

async function seedCalendarEvents(connection: mysql.Connection, userIds: number[], clientIds: number[], vendorIds: number[], calendarIds: number[], count: number) {
  console.log('📆 Seeding calendar events...');

  // Production schema: title, description, start_date, end_date, start_time, end_time, timezone,
  // module, event_type, priority, status, visibility, is_auto_generated, is_recurring,
  // is_floating_time, created_by, client_id, vendor_id, calendar_id
  const modules = ['INVENTORY', 'ACCOUNTING', 'CLIENTS', 'VENDORS', 'ORDERS', 'GENERAL'];
  const eventTypes = ['MEETING', 'DELIVERY', 'TASK', 'PAYMENT_DUE', 'FOLLOW_UP', 'INTAKE', 'AR_COLLECTION', 'AP_PAYMENT'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH'];
  const statuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];

  for (let i = 0; i < count; i++) {
    const startDate = faker.date.soon({ days: 60 });
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + faker.number.int({ min: 1, max: 4 }));
    const module = modules[i % modules.length];
    const eventType = eventTypes[i % eventTypes.length];
    const status = i < count * 0.8 ? 'SCHEDULED' : statuses[i % statuses.length];

    await connection.query(
      `INSERT INTO calendar_events (title, description, start_date, end_date, start_time, end_time, timezone, module, event_type, priority, status, visibility, is_auto_generated, is_recurring, is_floating_time, created_by, client_id, vendor_id, calendar_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'America/Los_Angeles', ?, ?, ?, ?, 'COMPANY', 0, 0, 0, ?, ?, ?, ?, NOW(), NOW())`,
      [
        `${eventType.replace(/_/g, ' ')} - ${faker.company.buzzPhrase()}`,
        faker.lorem.paragraph(),
        formatDate(startDate),
        formatDate(endDate),
        `${String(faker.number.int({ min: 8, max: 17 })).padStart(2, '0')}:00:00`,
        `${String(faker.number.int({ min: 9, max: 18 })).padStart(2, '0')}:00:00`,
        module,
        eventType,
        priorities[i % priorities.length],
        status,
        userIds[i % userIds.length],
        module === 'CLIENTS' || eventType === 'AR_COLLECTION' ? clientIds[i % clientIds.length] : null,
        module === 'VENDORS' || eventType === 'AP_PAYMENT' ? vendorIds[i % vendorIds.length] : null,
        calendarIds.length > 0 ? calendarIds[i % calendarIds.length] : null,
      ]
    );
  }

  console.log(`   ✓ Created ${count} calendar events`);
  const [rows] = await connection.query('SELECT id, title, client_id, vendor_id FROM calendar_events');
  return rows as any[];
}

async function seedTodoLists(connection: mysql.Connection, userIds: number[], count: number) {
  console.log('📝 Seeding todo lists...');

  // Production schema: name, description, owner_id, is_shared
  const listNames = [
    'Daily Tasks', 'Weekly Goals', 'Client Follow-ups', 'Inventory Checks',
    'Vendor Outreach', 'Compliance Tasks', 'Team Objectives', 'AR Collections',
    'AP Payments', 'Product Photography', 'Sales Calls', 'Delivery Schedule',
    'Quality Control', 'Staff Training', 'Marketing Tasks', 'Urgent Items',
    'Month-End Tasks', 'Quarterly Review', 'New Client Onboarding', 'System Updates',
  ];

  for (let i = 0; i < Math.min(count, listNames.length); i++) {
    await connection.query(
      `INSERT INTO todo_lists (name, description, owner_id, is_shared, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [
        listNames[i],
        faker.lorem.sentence(),
        userIds[i % userIds.length],
        Math.random() < 0.4 ? 1 : 0,
      ]
    );
  }

  console.log(`   ✓ Created ${Math.min(count, listNames.length)} todo lists`);
  const [rows] = await connection.query('SELECT id, name, owner_id FROM todo_lists');
  return rows as any[];
}

async function seedTodoTasks(connection: mysql.Connection, todoListIds: number[], userIds: number[], count: number) {
  console.log('✅ Seeding todo tasks...');

  if (todoListIds.length === 0) {
    console.log('   - Skipped: no todo lists');
    return;
  }

  // Production schema: list_id, title, description, status, priority, due_date,
  // assigned_to, created_by, position, is_completed, completed_at, completed_by
  const statuses = ['todo', 'in_progress', 'done'];
  const priorities = ['low', 'medium', 'high', 'urgent'];

  for (let i = 0; i < count; i++) {
    const status = statuses[i % statuses.length];
    const isCompleted = status === 'done';

    await connection.query(
      `INSERT INTO todo_tasks (list_id, title, description, status, priority, due_date, assigned_to, created_by, position, is_completed, completed_at, completed_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        todoListIds[i % todoListIds.length],
        faker.hacker.phrase(),
        faker.lorem.paragraph(),
        status,
        priorities[i % priorities.length],
        Math.random() < 0.7 ? formatDateTime(faker.date.soon({ days: 14 })) : null,
        userIds[i % userIds.length],
        userIds[(i + 1) % userIds.length],
        i,
        isCompleted ? 1 : 0,
        isCompleted ? formatDateTime(faker.date.recent({ days: 7 })) : null,
        isCompleted ? userIds[i % userIds.length] : null,
      ]
    );
  }

  console.log(`   ✓ Created ${count} todo tasks`);
}

async function seedComments(connection: mysql.Connection, orderIds: number[], clientIds: number[], batchIds: number[], userIds: number[], count: number) {
  console.log('💬 Seeding comments...');

  // Production schema: commentable_type, commentable_id, user_id, content, is_resolved, parent_comment_id
  const commentableTypes = ['order', 'client', 'batch', 'invoice'];

  for (let i = 0; i < count; i++) {
    const type = commentableTypes[i % commentableTypes.length];
    let refId: number;

    switch (type) {
      case 'order':
        refId = orderIds[i % orderIds.length];
        break;
      case 'client':
        refId = clientIds[i % clientIds.length];
        break;
      case 'batch':
        refId = batchIds[i % batchIds.length];
        break;
      default:
        refId = i + 1;
    }

    await connection.query(
      `INSERT INTO comments (commentable_type, commentable_id, user_id, content, is_resolved, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        type,
        refId,
        userIds[i % userIds.length],
        faker.lorem.paragraph(),
        Math.random() < 0.25 ? 1 : 0,
      ]
    );
  }

  console.log(`   ✓ Created ${count} comments`);
}

async function seedInboxItems(connection: mysql.Connection, userIds: number[], count: number) {
  console.log('📥 Seeding inbox items...');

  // Production schema: user_id, source_type, source_id, reference_type, reference_id, title, description, status
  // Valid ENUM values: mention, task_assignment, task_update
  const sourceTypes = ['mention', 'task_assignment', 'task_update'];
  const referenceTypes = ['order', 'client', 'batch', 'invoice', 'task'];
  const statuses = ['unread', 'seen', 'completed'];

  for (let i = 0; i < count; i++) {
    const status = statuses[i % statuses.length];

    await connection.query(
      `INSERT INTO inbox_items (user_id, source_type, source_id, reference_type, reference_id, title, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userIds[i % userIds.length],
        sourceTypes[i % sourceTypes.length],
        i + 1,
        referenceTypes[i % referenceTypes.length],
        i + 1,
        faker.hacker.phrase(),
        faker.lorem.paragraph(),
        status,
      ]
    );
  }

  console.log(`   ✓ Created ${count} inbox items`);
}

// ============================================================================
// TIER 5: VIP Portal & Marketplace
// ============================================================================

async function seedVipTiers(connection: mysql.Connection) {
  console.log('⭐ Seeding VIP tiers...');

  // Production schema: name, display_name, description, level, color, icon,
  // min_spend_ytd, min_orders_ytd, discount_percentage, is_active, is_default
  const tiers = [
    { name: 'bronze', displayName: 'Bronze', level: 1, color: '#CD7F32', minSpend: 0, minOrders: 0, discount: 0 },
    { name: 'silver', displayName: 'Silver', level: 2, color: '#C0C0C0', minSpend: 25000, minOrders: 10, discount: 2 },
    { name: 'gold', displayName: 'Gold', level: 3, color: '#FFD700', minSpend: 75000, minOrders: 25, discount: 5 },
    { name: 'platinum', displayName: 'Platinum', level: 4, color: '#E5E4E2', minSpend: 150000, minOrders: 50, discount: 8 },
    { name: 'diamond', displayName: 'Diamond', level: 5, color: '#B9F2FF', minSpend: 300000, minOrders: 100, discount: 12 },
  ];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    await connection.query(
      `INSERT INTO vip_tiers (name, display_name, description, level, color, min_spend_ytd, min_orders_ytd, discount_percentage, is_active, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)`,
      [
        tier.name,
        tier.displayName,
        `${tier.displayName} tier benefits and pricing`,
        tier.level,
        tier.color,
        tier.minSpend,
        tier.minOrders,
        tier.discount,
        i === 0 ? 1 : 0, // Bronze is default
      ]
    );
  }

  console.log(`   ✓ Created ${tiers.length} VIP tiers`);
  const [rows] = await connection.query('SELECT id, name, level FROM vip_tiers ORDER BY level');
  return rows as any[];
}

async function seedVipPortalConfigurations(connection: mysql.Connection, clientIds: number[], count: number) {
  console.log('🌟 Seeding VIP portal configurations...');

  // Production schema: client_id, module_dashboard_enabled, module_ar_enabled, module_ap_enabled,
  // module_transaction_history_enabled, module_vip_tier_enabled, module_credit_center_enabled,
  // module_marketplace_needs_enabled, module_marketplace_supply_enabled, module_leaderboard_enabled,
  // module_live_catalog_enabled
  const vipClientIds = clientIds.slice(0, count);

  for (const clientId of vipClientIds) {
    await connection.query(
      `INSERT INTO vip_portal_configurations (client_id, module_dashboard_enabled, module_ar_enabled, module_ap_enabled, module_transaction_history_enabled, module_vip_tier_enabled, module_credit_center_enabled, module_marketplace_needs_enabled, module_marketplace_supply_enabled, module_leaderboard_enabled, module_live_catalog_enabled, created_at, updated_at)
       VALUES (?, 1, 1, 1, 1, 1, 1, 1, ?, 1, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE module_dashboard_enabled = 1`,
      [
        clientId,
        Math.random() < 0.3 ? 1 : 0, // Some have supply enabled (they're also sellers)
        Math.random() < 0.8 ? 1 : 0, // Most have live catalog
      ]
    );
  }

  console.log(`   ✓ Created VIP portal configs for ${vipClientIds.length} clients`);
}

async function seedVipPortalAuth(connection: mysql.Connection, clientIds: number[], count: number) {
  console.log('🔐 Seeding VIP portal auth...');

  // Production schema: client_id, email, password_hash, login_count
  const vipClientIds = clientIds.slice(0, count);

  for (let i = 0; i < vipClientIds.length; i++) {
    const clientId = vipClientIds[i];
    const email = `vip${i + 1}@terp-portal.local`;
    // Note: In production, password would be properly hashed
    const passwordHash = '$2a$10$placeholder_hash_for_seed_data';

    try {
      await connection.query(
        `INSERT INTO vip_portal_auth (client_id, email, password_hash, login_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE login_count = login_count + 1`,
        [clientId, email, passwordHash, faker.number.int({ min: 1, max: 50 })]
      );
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`   ✓ Created VIP portal auth for ${vipClientIds.length} clients`);
}

async function seedClientNeeds(connection: mysql.Connection, clientIds: number[], userIds: number[], count: number) {
  console.log('🎯 Seeding client needs...');

  // Production schema: client_id, strain, product_name, strain_type, category, subcategory,
  // grade, quantity_min, quantity_max, price_max, status, priority, needed_by, notes, created_by
  const categories = ['Flower', 'Pre-Roll', 'Concentrate', 'Edible', 'Vape'];
  const strainTypes = ['INDICA', 'SATIVA', 'HYBRID', 'CBD'];
  const statuses = ['ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const strainNames = ['OG Kush', 'Blue Dream', 'Gelato', 'Wedding Cake', 'Gorilla Glue', 'Runtz', 'Zkittlez'];

  for (let i = 0; i < count; i++) {
    const status = i < count * 0.6 ? 'ACTIVE' : statuses[i % statuses.length];

    await connection.query(
      `INSERT INTO client_needs (client_id, strain, strain_type, category, grade, quantity_min, quantity_max, price_max, status, priority, needed_by, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        clientIds[i % clientIds.length],
        strainNames[i % strainNames.length],
        strainTypes[i % strainTypes.length],
        categories[i % categories.length],
        faker.helpers.arrayElement(['A', 'B', 'C', null]),
        faker.number.float({ min: 5, max: 50, fractionDigits: 2 }),
        faker.number.float({ min: 50, max: 200, fractionDigits: 2 }),
        faker.number.float({ min: 200, max: 1000, fractionDigits: 2 }),
        status,
        priorities[i % priorities.length],
        Math.random() < 0.7 ? formatDate(faker.date.soon({ days: 30 })) : null,
        faker.lorem.sentence(),
        userIds[i % userIds.length],
      ]
    );
  }

  console.log(`   ✓ Created ${count} client needs`);
}

async function seedVendorSupply(connection: mysql.Connection, vendorIds: number[], userIds: number[], count: number) {
  console.log('📦 Seeding vendor supply...');

  // Production schema: vendor_id, strain, product_name, strain_type, category, subcategory,
  // grade, quantity_available, unit_price, status, available_until, notes, created_by
  const categories = ['Flower', 'Pre-Roll', 'Concentrate', 'Edible', 'Vape'];
  const strainTypes = ['INDICA', 'SATIVA', 'HYBRID', 'CBD'];
  const statuses = ['AVAILABLE', 'RESERVED', 'PURCHASED', 'EXPIRED'];
  const strainNames = ['OG Kush', 'Blue Dream', 'Gelato', 'Wedding Cake', 'Gorilla Glue', 'Runtz', 'Zkittlez', 'MAC', 'Biscotti'];

  for (let i = 0; i < count; i++) {
    const status = i < count * 0.7 ? 'AVAILABLE' : statuses[i % statuses.length];

    await connection.query(
      `INSERT INTO vendor_supply (vendor_id, strain, strain_type, category, grade, quantity_available, unit_price, status, available_until, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        vendorIds[i % vendorIds.length],
        strainNames[i % strainNames.length],
        strainTypes[i % strainTypes.length],
        categories[i % categories.length],
        faker.helpers.arrayElement(['A', 'B', 'C']),
        faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
        faker.number.float({ min: 150, max: 800, fractionDigits: 2 }),
        status,
        status === 'AVAILABLE' ? formatDateTime(faker.date.soon({ days: 30 })) : null,
        faker.lorem.sentence(),
        userIds[i % userIds.length],
      ]
    );
  }

  console.log(`   ✓ Created ${count} vendor supply entries`);
}

// ============================================================================
// TIER 6: Additional Features
// ============================================================================

async function seedSampleRequests(connection: mysql.Connection, clientIds: number[], productIds: number[], userIds: number[], count: number) {
  console.log('🧪 Seeding sample requests...');

  // Production schema: clientId, requestedBy, requestDate, products (JSON), sampleRequestStatus,
  // fulfilledDate, fulfilledBy, notes, totalCost, relatedOrderId
  const statuses = ['PENDING', 'FULFILLED', 'CANCELLED'];

  for (let i = 0; i < count; i++) {
    const status = statuses[i % statuses.length];
    const products = [
      { productId: productIds[i % productIds.length], quantity: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }) },
      { productId: productIds[(i + 1) % productIds.length], quantity: faker.number.float({ min: 1, max: 3, fractionDigits: 1 }) },
    ];

    await connection.query(
      `INSERT INTO sampleRequests (clientId, requestedBy, requestDate, products, sampleRequestStatus, fulfilledDate, fulfilledBy, notes, totalCost, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        clientIds[i % clientIds.length],
        userIds[i % userIds.length],
        formatDateTime(faker.date.recent({ days: 60 })),
        JSON.stringify(products),
        status,
        status === 'FULFILLED' ? formatDateTime(faker.date.recent({ days: 30 })) : null,
        status === 'FULFILLED' ? userIds[(i + 1) % userIds.length] : null,
        faker.lorem.sentence(),
        faker.number.float({ min: 50, max: 500, fractionDigits: 2 }),
      ]
    );
  }

  console.log(`   ✓ Created ${count} sample requests`);
}

async function seedIntakeSessions(connection: mysql.Connection, sellerClientIds: number[], userIds: number[], count: number) {
  console.log('📥 Seeding intake sessions...');

  // IMPORTANT: vendor_id in intake_sessions references clients.id (NOT vendors.id!)
  // The supplier must be a client with is_seller=1
  // Production schema: session_number, vendor_id, status, receive_date, received_by,
  // payment_terms, total_amount, amount_paid, internal_notes, receipt_generated

  if (sellerClientIds.length === 0) {
    console.log('   - Skipped: no seller clients available');
    return;
  }

  const statuses = ['IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED'];
  const paymentTerms = ['COD', 'NET_7', 'NET_15', 'NET_30'];

  for (let i = 0; i < count; i++) {
    const status = statuses[i % statuses.length];
    const receiveDate = faker.date.recent({ days: 90 });
    const totalAmount = faker.number.float({ min: 5000, max: 100000, fractionDigits: 2 });

    await connection.query(
      `INSERT INTO intake_sessions (session_number, vendor_id, status, receive_date, received_by, payment_terms, total_amount, amount_paid, internal_notes, receipt_generated, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        `INTAKE-${formatDate(receiveDate).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
        sellerClientIds[i % sellerClientIds.length], // Use seller client IDs, not vendor IDs
        status,
        formatDate(receiveDate),
        userIds[i % userIds.length],
        paymentTerms[i % paymentTerms.length],
        totalAmount.toFixed(2),
        status === 'COMPLETED' ? totalAmount.toFixed(2) : '0.00',
        faker.lorem.sentence(),
        status === 'COMPLETED' ? 1 : 0,
      ]
    );
  }

  console.log(`   ✓ Created ${count} intake sessions`);
}

async function seedRecurringOrders(connection: mysql.Connection, clientIds: number[], productIds: number[], userIds: number[], count: number) {
  console.log('🔄 Seeding recurring orders...');

  // Production schema: client_id, frequency, day_of_week, day_of_month, order_template,
  // status, start_date, end_date, next_generation_date, notify_client, created_by
  const frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];
  const statuses = ['ACTIVE', 'PAUSED', 'CANCELLED'];

  for (let i = 0; i < count; i++) {
    const frequency = frequencies[i % frequencies.length];
    const status = i < count * 0.7 ? 'ACTIVE' : statuses[i % statuses.length];
    const startDate = faker.date.recent({ days: 90 });
    const nextGenDate = new Date();
    nextGenDate.setDate(nextGenDate.getDate() + faker.number.int({ min: 1, max: 14 }));

    const orderTemplate = {
      items: [
        { productId: productIds[i % productIds.length], quantity: faker.number.int({ min: 5, max: 50 }) },
        { productId: productIds[(i + 1) % productIds.length], quantity: faker.number.int({ min: 2, max: 20 }) },
      ]
    };

    await connection.query(
      `INSERT INTO recurring_orders (client_id, frequency, day_of_week, order_template, status, start_date, next_generation_date, notify_client, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
      [
        clientIds[i % clientIds.length],
        frequency,
        frequency === 'WEEKLY' ? faker.number.int({ min: 0, max: 6 }) : null,
        JSON.stringify(orderTemplate),
        status,
        formatDate(startDate),
        formatDate(nextGenDate),
        userIds[i % userIds.length],
      ]
    );
  }

  console.log(`   ✓ Created ${count} recurring orders`);
}

async function seedReferralCredits(connection: mysql.Connection, clientIds: number[], orderIds: number[], count: number) {
  console.log('🎁 Seeding referral credits...');

  // Production schema: referrer_client_id, referred_client_id, referred_order_id,
  // credit_percentage, order_total, credit_amount, status
  const statuses = ['PENDING', 'AVAILABLE', 'APPLIED', 'EXPIRED'];

  for (let i = 0; i < count; i++) {
    const status = statuses[i % statuses.length];
    const orderTotal = faker.number.float({ min: 1000, max: 20000, fractionDigits: 2 });
    const creditPercent = 10;
    const creditAmount = orderTotal * (creditPercent / 100);

    await connection.query(
      `INSERT INTO referral_credits (referrer_client_id, referred_client_id, referred_order_id, credit_percentage, order_total, credit_amount, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        clientIds[i % clientIds.length],
        clientIds[(i + 1) % clientIds.length],
        orderIds[i % orderIds.length],
        creditPercent.toFixed(2),
        orderTotal.toFixed(2),
        creditAmount.toFixed(2),
        status,
        `Referral credit - ${faker.lorem.words(3)}`,
      ]
    );
  }

  console.log(`   ✓ Created ${count} referral credits`);
}

async function seedLeaderboardData(connection: mysql.Connection, clientIds: number[]) {
  console.log('🏆 Seeding leaderboard data...');

  // Production schema: client_id, metric_type, metric_value, sample_size, is_significant, calculated_at, expires_at
  const metrics = ['ytd_revenue', 'avg_order_value', 'order_frequency', 'payment_speed', 'margin_performance'];
  let created = 0;

  for (const clientId of clientIds.slice(0, 50)) {
    for (const metric of metrics) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await connection.query(
        `INSERT INTO leaderboard_metric_cache (client_id, metric_type, metric_value, sample_size, is_significant, calculated_at, expires_at)
         VALUES (?, ?, ?, ?, 1, NOW(), ?)
         ON DUPLICATE KEY UPDATE metric_value = VALUES(metric_value)`,
        [
          clientId,
          metric,
          faker.number.float({ min: 1000, max: 150000, fractionDigits: 2 }),
          faker.number.int({ min: 5, max: 100 }),
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

  console.log('\n' + '='.repeat(70));
  console.log('🚀 TERP ULTRA-COMPREHENSIVE SEED SCRIPT v3.0');
  console.log('='.repeat(70));
  console.log(`Mode: ${config.size.toUpperCase()}`);
  console.log(`Clear Data: ${config.clearData}`);
  console.log(`Dry Run: ${config.dryRun}`);
  console.log('='.repeat(70) + '\n');

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

    // ==================== TIER 1: Core Foundation ====================
    console.log('\n📌 TIER 1: Core Foundation\n');

    const userList = await seedUsers(connection);
    const userIds = userList.map((u: any) => u.id);

    const workflowStatusList = await seedWorkflowStatuses(connection);
    const workflowStatusIds = workflowStatusList.map((s: any) => s.id);

    await seedPricingDefaults(connection);

    const vendorList = await seedVendors(connection, counts.vendors);
    const vendorIds = vendorList.map((v: any) => v.id);

    const clientList = await seedClients(connection, counts.clients);
    const clientIds = clientList.map((c: any) => c.id);
    const sellerClientIds = clientList.filter((c: any) => c.is_seller === 1).map((c: any) => c.id);

    const brandList = await seedBrands(connection, vendorIds);
    const brandIds = brandList.map((b: any) => b.id);

    const strainList = await seedStrains(connection);
    const strainIds = strainList.map((s: any) => s.id);

    await seedLocations(connection);
    await seedTags(connection);

    // ==================== TIER 2: Products & Inventory ====================
    console.log('\n📌 TIER 2: Products & Inventory\n');

    const productList = await seedProducts(connection, brandIds, strainIds, counts.products);
    const productIds = productList.map((p: any) => p.id);

    const lotList = await seedLots(connection, vendorIds);
    const lotIds = lotList.map((l: any) => l.id);

    const batchList = await seedBatches(connection, productIds, lotIds, workflowStatusIds, counts.batches);
    const batchIds = batchList.map((b: any) => b.id);

    // ==================== TIER 3: Transactions ====================
    console.log('\n📌 TIER 3: Transactions\n');

    const orderList = await seedOrders(connection, clientIds, batchList, userIds, counts.orders);
    const orderIds = orderList.map((o: any) => o.id);

    const invoiceList = await seedInvoices(connection, orderList, userIds, counts.invoices);

    await seedPayments(connection, invoiceList, userIds, counts.payments);
    // DATA-001 FIX: Use sellerClientIds instead of vendorIds for bills
    // Bills.vendorId should reference clients.id (where is_seller=1), not vendors.id
    // This ensures vendor names display correctly in accounting dashboard
    const billVendorIds = sellerClientIds.length > 0 ? sellerClientIds : vendorIds;
    await seedBills(connection, billVendorIds, userIds, counts.bills);
    await seedClientTransactions(connection, orderList, invoiceList);
    // DATA-002 FIX: Seed bank accounts for cash balance display
    await seedBankAccounts(connection);
    await seedBatchStatusHistory(connection, batchIds, workflowStatusIds, userIds);

    // ==================== TIER 4: Calendar & Tasks ====================
    console.log('\n📌 TIER 4: Calendar & Tasks\n');

    const calendarList = await seedCalendars(connection, userIds);
    const calendarIds = calendarList.map((c: any) => c.id);

    // SEED-006 FIX: Add scheduling tables seeding
    await seedAppointmentTypes(connection, calendarIds);
    await seedCalendarAvailability(connection, calendarIds);

    await seedCalendarEvents(connection, userIds, clientIds, vendorIds, calendarIds, counts.calendarEvents);

    const todoListList = await seedTodoLists(connection, userIds, counts.todoLists);
    const todoListIds = todoListList.map((t: any) => t.id);

    await seedTodoTasks(connection, todoListIds, userIds, counts.todoTasks);
    await seedComments(connection, orderIds, clientIds, batchIds, userIds, counts.comments);
    await seedInboxItems(connection, userIds, Math.floor(counts.clients / 2));

    // ==================== TIER 5: VIP Portal & Marketplace ====================
    console.log('\n📌 TIER 5: VIP Portal & Marketplace\n');

    await seedVipTiers(connection);
    await seedVipPortalConfigurations(connection, clientIds, counts.vipClients);
    await seedVipPortalAuth(connection, clientIds, counts.vipClients);
    await seedClientNeeds(connection, clientIds, userIds, counts.clientNeeds);
    await seedVendorSupply(connection, vendorIds, userIds, counts.vendorSupply);

    // ==================== TIER 6: Additional Features ====================
    console.log('\n📌 TIER 6: Additional Features\n');

    await seedSampleRequests(connection, clientIds, productIds, userIds, counts.sampleRequests);
    await seedIntakeSessions(connection, sellerClientIds, userIds, counts.intakeSessions);
    await seedRecurringOrders(connection, clientIds, productIds, userIds, counts.recurringOrders);
    await seedReferralCredits(connection, clientIds, orderIds, counts.referralCredits);
    await seedLeaderboardData(connection, clientIds);

    // ==================== TIER 7: System Configuration ====================
    console.log('\n📌 TIER 7: System Configuration\n');

    // DATA-004 FIX: Seed feature flags using the dedicated seeder
    // This uses Drizzle ORM and is idempotent (won't duplicate flags)
    console.log('🚩 Seeding feature flags...');
    const featureFlagResult = await seedFeatureFlags('system');
    console.log(`   ✓ Feature flags: ${featureFlagResult.created} created, ${featureFlagResult.skipped} skipped`);
    if (featureFlagResult.errors.length > 0) {
      console.log(`   ⚠️ ${featureFlagResult.errors.length} errors:`, featureFlagResult.errors);
    }

    // ==================== COMPLETE ====================
    console.log('\n' + '='.repeat(70));
    console.log('✅ ULTRA-COMPREHENSIVE SEED COMPLETE!');
    console.log('='.repeat(70));

    console.log('\n📊 SUMMARY:');
    console.log(`   - Users: ${userIds.length}`);
    console.log(`   - Vendors: ${vendorIds.length}`);
    console.log(`   - Clients: ${clientIds.length}`);
    console.log(`   - Brands: ${brandIds.length}`);
    console.log(`   - Products: ${productIds.length}`);
    console.log(`   - Batches: ${batchIds.length}`);
    console.log(`   - Orders: ${orderIds.length}`);
    console.log(`   - Invoices: ${counts.invoices}`);
    console.log(`   - VIP Portal Clients: ${counts.vipClients}`);
    console.log(`   - Calendar Events: ${counts.calendarEvents}`);
    console.log(`   - Todo Lists: ${counts.todoLists}`);
    console.log(`   - Todo Tasks: ${counts.todoTasks}`);
    console.log(`   - Comments: ${counts.comments}`);
    console.log(`   - Sample Requests: ${counts.sampleRequests}`);
    console.log(`   - Intake Sessions: ${counts.intakeSessions}`);
    console.log(`   - Client Needs: ${counts.clientNeeds}`);
    console.log(`   - Vendor Supply: ${counts.vendorSupply}`);
    console.log(`   - Recurring Orders: ${counts.recurringOrders}`);
    console.log(`   - Referral Credits: ${counts.referralCredits}`);
    console.log('\n   All data is properly linked with valid FK references.\n');

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ SEED FAILED');
    console.error('='.repeat(70));
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
