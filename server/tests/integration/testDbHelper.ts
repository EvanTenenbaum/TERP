/**
 * Test Database Helper
 * Provides utilities for integration tests with real database
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { 
  users, 
  vendors, 
  brands, 
  products, 
  batches, 
  clients,
  type InsertUser,
  type InsertVendor,
  type InsertBrand,
  type InsertProduct,
  type InsertBatch,
  type InsertClient,
} from '../../../drizzle/schema';

let testConnection: mysql.Connection | null = null;
let testDb: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create test database connection
 */
export async function getTestDb() {
  if (testDb) return testDb;

  // Create connection to test database
  testConnection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'terp_test',
  });

  testDb = drizzle(testConnection);
  return testDb;
}

/**
 * Close test database connection
 */
export async function closeTestDb() {
  if (testConnection) {
    await testConnection.end();
    testConnection = null;
    testDb = null;
  }
}

/**
 * Clean up test data (delete in reverse order of dependencies)
 */
export async function cleanupTestData(db: ReturnType<typeof drizzle>) {
  // Note: In a real test environment, you'd want to use transactions
  // or a separate test database that gets reset between tests
  
  // For now, we'll just document the cleanup order:
  // 1. orders (depends on clients, batches)
  // 2. batches (depends on products, vendors)
  // 3. products (depends on brands)
  // 4. brands (depends on vendors)
  // 5. clients
  // 6. vendors
  // 7. users
}

/**
 * Seed test data for integration tests
 */
export async function seedTestData(db: ReturnType<typeof drizzle>) {
  // Insert test user
  const testUser: InsertUser = {
    openId: 'test-integration-user',
    name: 'Integration Test User',
    email: 'integration@test.com',
    role: 'admin',
  };

  await db.insert(users).values(testUser);

  // Insert test vendor
  const testVendor: InsertVendor = {
    name: 'Integration Test Vendor',
    contactName: 'Test Contact',
    contactEmail: 'vendor@test.com',
  };

  await db.insert(vendors).values(testVendor);

  // Insert test brand
  const testBrand: InsertBrand = {
    name: 'Integration Test Brand',
    vendorId: 1,
  };

  await db.insert(brands).values(testBrand);

  // Insert test product
  const testProduct: InsertProduct = {
    brandId: 1,
    nameCanonical: 'Integration Test Product',
    category: 'Flower',
    uomSellable: 'EA',
  };

  await db.insert(products).values(testProduct);

  // Insert test batches
  const testBatches: InsertBatch[] = [
    {
      sku: 'INT-TEST-FIXED-001',
      productId: 1,
      vendorId: 1,
      cogsMode: 'FIXED',
      unitCogs: '10.00',
      unitCogsMin: null,
      unitCogsMax: null,
      onHandQty: '100',
      sampleQty: '10',
      status: 'LIVE',
      createdBy: 1,
    },
    {
      sku: 'INT-TEST-RANGE-001',
      productId: 1,
      vendorId: 1,
      cogsMode: 'RANGE',
      unitCogs: null,
      unitCogsMin: '10.00',
      unitCogsMax: '20.00',
      onHandQty: '100',
      sampleQty: '10',
      status: 'LIVE',
      createdBy: 1,
    },
  ];

  await db.insert(batches).values(testBatches);

  // Insert test clients
  const testClients: InsertClient[] = [
    {
      teriCode: 'INT-TEST-001',
      name: 'Integration Test Client 1',
      email: 'client1@test.com',
      isBuyer: true,
      cogsAdjustmentType: 'NONE',
      cogsAdjustmentValue: '0',
    },
    {
      teriCode: 'INT-TEST-002',
      name: 'Integration Test Client 2',
      email: 'client2@test.com',
      isBuyer: true,
      cogsAdjustmentType: 'PERCENTAGE',
      cogsAdjustmentValue: '10',
    },
  ];

  await db.insert(clients).values(testClients);
}

