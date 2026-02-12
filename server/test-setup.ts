/**
 * Test Database Setup
 * 
 * This file sets up an in-memory SQLite database for testing purposes.
 * It creates all necessary tables and seeds test data.
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../drizzle/schema';
import * as vipPortalSchema from '../drizzle/schema-vip-portal';
import { logger } from './_core/logger';

// Create in-memory SQLite database
const sqlite = new Database(':memory:');
export const testDb = drizzle(sqlite, { schema: { ...schema, ...vipPortalSchema } });

/**
 * Initialize test database with schema
 */
export async function setupTestDatabase() {
  // Create tables
  // Note: In a real implementation, you would run the migration SQL here
  // For now, we'll create a simplified schema for testing
  
  sqlite.exec(`
    -- Clients table
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      subcategory TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Batches table
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'lbs',
      base_price REAL,
      brand TEXT,
      grade TEXT,
      date_received DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- VIP Portal Configurations table
    CREATE TABLE IF NOT EXISTS vip_portal_configurations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL UNIQUE,
      module_live_catalog_enabled INTEGER DEFAULT 0,
      catalog_show_quantity INTEGER DEFAULT 1,
      catalog_show_brand INTEGER DEFAULT 1,
      catalog_show_grade INTEGER DEFAULT 1,
      catalog_show_date INTEGER DEFAULT 1,
      catalog_show_base_price INTEGER DEFAULT 0,
      catalog_show_markup INTEGER DEFAULT 0,
      price_alerts_enabled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    -- Client Interest Lists table
    CREATE TABLE IF NOT EXISTS client_interest_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      status TEXT DEFAULT 'NEW' CHECK(status IN ('NEW', 'REVIEWED', 'CONVERTED', 'ARCHIVED')),
      submitted_at DATETIME NOT NULL,
      reviewed_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    -- Client Interest List Items table
    CREATE TABLE IF NOT EXISTS client_interest_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      interest_list_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      snapshot_price REAL NOT NULL,
      snapshot_quantity REAL NOT NULL,
      snapshot_category TEXT,
      snapshot_brand TEXT,
      snapshot_grade TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (interest_list_id) REFERENCES client_interest_lists(id),
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );

    -- Client Draft Interests table
    CREATE TABLE IF NOT EXISTS client_draft_interests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      UNIQUE(client_id, batch_id)
    );

    -- Client Catalog Views table
    CREATE TABLE IF NOT EXISTS client_catalog_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      filters TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    -- Client Price Alerts table
    CREATE TABLE IF NOT EXISTS client_price_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      target_price REAL NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );

    -- Orders table (simplified)
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL,
      is_draft INTEGER DEFAULT 1,
      type TEXT DEFAULT 'QUOTE' CHECK(type IN ('QUOTE', 'SALE')),
      items TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );
  `);

  logger.info('✓ Test database schema created');
}

/**
 * Seed test data
 */
export async function seedTestData() {
  // Insert test clients
  sqlite.exec(`
    INSERT INTO clients (id, name, email, phone) VALUES
      (1, 'Test Client 1', 'client1@test.com', '555-0001'),
      (2, 'Test Client 2', 'client2@test.com', '555-0002'),
      (3, 'Test Client 3', 'client3@test.com', '555-0003');
  `);

  // Insert test products
  sqlite.exec(`
    INSERT INTO products (id, name, category, subcategory) VALUES
      (1, 'Premium Flower A', 'Flower', 'Indoor'),
      (2, 'Premium Flower B', 'Flower', 'Outdoor'),
      (3, 'Gummy Bears', 'Edibles', 'Gummies'),
      (4, 'Chocolate Bar', 'Edibles', 'Chocolate'),
      (5, 'Vape Cartridge', 'Vapes', 'Cartridges');
  `);

  // Insert test batches
  sqlite.exec(`
    INSERT INTO batches (id, product_id, quantity, base_price, brand, grade, date_received) VALUES
      (1, 1, 100.5, 120.00, 'Brand A', 'AAA', '2024-11-01'),
      (2, 2, 75.25, 100.00, 'Brand B', 'AA', '2024-11-02'),
      (3, 3, 500.0, 15.00, 'Brand C', 'Premium', '2024-11-03'),
      (4, 4, 300.0, 20.00, 'Brand D', 'Premium', '2024-11-04'),
      (5, 5, 200.0, 35.00, 'Brand E', 'Premium', '2024-11-05');
  `);

  // Insert VIP portal configurations
  sqlite.exec(`
    INSERT INTO vip_portal_configurations (client_id, module_live_catalog_enabled) VALUES
      (1, 1),
      (2, 1),
      (3, 0);
  `);

  // Insert draft interests for client 1
  sqlite.exec(`
    INSERT INTO client_draft_interests (client_id, batch_id) VALUES
      (1, 1),
      (1, 3);
  `);

  // Insert submitted interest list for client 1
  sqlite.exec(`
    INSERT INTO client_interest_lists (id, client_id, status, submitted_at) VALUES
      (1, 1, 'NEW', datetime('now'));
    
    INSERT INTO client_interest_list_items (interest_list_id, batch_id, snapshot_price, snapshot_quantity, snapshot_category, snapshot_brand, snapshot_grade) VALUES
      (1, 1, 120.00, 100.5, 'Flower', 'Brand A', 'AAA'),
      (1, 2, 100.00, 75.25, 'Flower', 'Brand B', 'AA');
  `);

  // Insert saved view for client 1
  sqlite.exec(`
    INSERT INTO client_catalog_views (client_id, name, filters) VALUES
      (1, 'Premium Flower', '{"category":"Flower","minPrice":100,"maxPrice":150}');
  `);

  // Insert draft order for testing
  sqlite.exec(`
    INSERT INTO orders (id, order_number, client_id, is_draft, type, items) VALUES
      (1, 'Q-2024-001', 1, 1, 'QUOTE', '[]');
  `);

  logger.info('✓ Test data seeded');
}

/**
 * Clean up test database
 */
export async function teardownTestDatabase() {
  sqlite.close();
  logger.info('✓ Test database closed');
}

/**
 * Reset test database (drop all data)
 */
export async function resetTestDatabase() {
  sqlite.exec(`
    DELETE FROM client_price_alerts;
    DELETE FROM client_catalog_views;
    DELETE FROM client_draft_interests;
    DELETE FROM client_interest_list_items;
    DELETE FROM client_interest_lists;
    DELETE FROM vip_portal_configurations;
    DELETE FROM orders;
    DELETE FROM batches;
    DELETE FROM products;
    DELETE FROM clients;
  `);
  logger.info('✓ Test database reset');
}
