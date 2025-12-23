/**
 * Debug router - for checking database state
 * REMOVE THIS IN PRODUCTION
 */

import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { publicProcedure, router } from '../_core/trpc.js';
import { getDb } from '../db.js';
import { getConnectionPool } from '../_core/connectionPool.js';
import { vendors, clients, products, batches, orders, invoices, payments } from '../../drizzle/schema.js';

export const debugRouter = router({
  /**
   * DIAG-002: Raw MySQL query diagnostic - bypasses Drizzle ORM
   * Tests if the issue is with Drizzle or mysql2/connection
   */
  rawMysqlTest: publicProcedure.query(async () => {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    try {
      const pool = getConnectionPool();
      const connection = await pool.getConnection();

      try {
        // Test 1: Simple COUNT query (should work)
        const [countRows] = await connection.query('SELECT COUNT(*) as total FROM clients');
        results.tests.countQuery = {
          success: true,
          data: countRows,
          method: 'query (text protocol)',
        };
      } catch (err: any) {
        results.tests.countQuery = {
          success: false,
          error: err.message,
          code: err.code,
          errno: err.errno,
        };
      }

      try {
        // Test 2: SELECT with minimal columns (no ENUMs)
        const [minimalRows] = await connection.query('SELECT id, name FROM clients LIMIT 1');
        results.tests.minimalSelect = {
          success: true,
          data: minimalRows,
          method: 'query (text protocol)',
        };
      } catch (err: any) {
        results.tests.minimalSelect = {
          success: false,
          error: err.message,
          code: err.code,
          errno: err.errno,
        };
      }

      try {
        // Test 3: SELECT with ENUM columns
        const [enumRows] = await connection.query(
          'SELECT id, name, cogsAdjustmentType, creditLimitSource FROM clients LIMIT 1'
        );
        results.tests.enumSelect = {
          success: true,
          data: enumRows,
          method: 'query (text protocol)',
        };
      } catch (err: any) {
        results.tests.enumSelect = {
          success: false,
          error: err.message,
          code: err.code,
          errno: err.errno,
        };
      }

      try {
        // Test 4: SELECT * (full row)
        const [fullRows] = await connection.query('SELECT * FROM clients LIMIT 1');
        results.tests.fullSelect = {
          success: true,
          rowCount: (fullRows as any[]).length,
          sampleKeys: (fullRows as any[])[0] ? Object.keys((fullRows as any[])[0]) : [],
          method: 'query (text protocol)',
        };
      } catch (err: any) {
        results.tests.fullSelect = {
          success: false,
          error: err.message,
          code: err.code,
          errno: err.errno,
        };
      }

      try {
        // Test 5: Same query but with execute() (prepared statement / binary protocol)
        const [execRows] = await connection.execute('SELECT * FROM clients LIMIT 1');
        results.tests.fullSelectPrepared = {
          success: true,
          rowCount: (execRows as any[]).length,
          sampleKeys: (execRows as any[])[0] ? Object.keys((execRows as any[])[0]) : [],
          method: 'execute (binary protocol)',
        };
      } catch (err: any) {
        results.tests.fullSelectPrepared = {
          success: false,
          error: err.message,
          code: err.code,
          errno: err.errno,
        };
      }

      connection.release();
      results.connectionReleased = true;
      results.success = true;
    } catch (poolErr: any) {
      results.success = false;
      results.poolError = poolErr.message;
    }

    return results;
  }),


  /**
   * DIAG-003: Test Drizzle ORM queries specifically
   * Compares queries with and without ENUM columns
   */
  drizzleTest: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // Test 1: COUNT via Drizzle
    try {
      const count = await db.select({ count: sql<number>`count(*)` }).from(clients);
      results.tests.drizzleCount = {
        success: true,
        data: count,
      };
    } catch (err: any) {
      results.tests.drizzleCount = {
        success: false,
        error: err.message,
        cause: err.cause?.message || err.cause,
      };
    }

    // Test 2: Minimal columns (no ENUMs) via Drizzle
    try {
      const minimal = await db.select({
        id: clients.id,
        name: clients.name,
      }).from(clients).limit(1);
      results.tests.drizzleMinimal = {
        success: true,
        data: minimal,
      };
    } catch (err: any) {
      results.tests.drizzleMinimal = {
        success: false,
        error: err.message,
        cause: err.cause?.message || err.cause,
      };
    }

    // Test 3: With ENUM columns via Drizzle
    try {
      const withEnums = await db.select({
        id: clients.id,
        name: clients.name,
        cogsAdjustmentType: clients.cogsAdjustmentType,
        creditLimitSource: clients.creditLimitSource,
      }).from(clients).limit(1);
      results.tests.drizzleWithEnums = {
        success: true,
        data: withEnums,
      };
    } catch (err: any) {
      results.tests.drizzleWithEnums = {
        success: false,
        error: err.message,
        cause: err.cause?.message || err.cause,
      };
    }

    // Test 4: SELECT * via Drizzle (includes ALL columns)
    try {
      const full = await db.select().from(clients).limit(1);
      results.tests.drizzleFull = {
        success: true,
        rowCount: full.length,
        sampleKeys: full[0] ? Object.keys(full[0]) : [],
      };
    } catch (err: any) {
      results.tests.drizzleFull = {
        success: false,
        error: err.message,
        cause: err.cause?.message || err.cause,
      };
    }

    results.success = true;
    return results;
  }),

  /**
   * DIAG-005: Check leaderboard_weight_configs table structure
   */
  leaderboardTableCheck: publicProcedure.query(async () => {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    try {
      const pool = getConnectionPool();
      const connection = await pool.getConnection();

      try {
        // Test 1: DESCRIBE the table to see column names
        const [describeRows] = await connection.query('DESCRIBE leaderboard_weight_configs');
        results.tests.tableStructure = {
          success: true,
          columns: describeRows,
        };
      } catch (err: any) {
        results.tests.tableStructure = {
          success: false,
          error: err.message,
        };
      }

      try {
        // Test 2: Raw SELECT with client_type column
        const [selectRows] = await connection.query('SELECT id, user_id, client_type FROM leaderboard_weight_configs LIMIT 1');
        results.tests.selectClientType = {
          success: true,
          data: selectRows,
        };
      } catch (err: any) {
        results.tests.selectClientType = {
          success: false,
          error: err.message,
        };
      }

      try {
        // Test 3: Raw SELECT with leaderboard_client_type column (should fail if column doesn't exist)
        const [selectRows] = await connection.query('SELECT id, user_id, leaderboard_client_type FROM leaderboard_weight_configs LIMIT 1');
        results.tests.selectLeaderboardClientType = {
          success: true,
          data: selectRows,
        };
      } catch (err: any) {
        results.tests.selectLeaderboardClientType = {
          success: false,
          error: err.message,
        };
      }

      connection.release();
      results.connectionReleased = true;
      results.success = true;
    } catch (poolErr: any) {
      results.success = false;
      results.poolError = poolErr.message;
    }

    return results;
  }),

  /**
   * DIAG-007: Comprehensive database schema check
   * Lists all tables and checks for migration tracking
   */
  checkDatabaseSchema: publicProcedure.query(async () => {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
    };

    try {
      const pool = getConnectionPool();
      const connection = await pool.getConnection();

      // Get all tables in the database
      const [allTables] = await connection.query('SHOW TABLES');
      results.allTables = (allTables as any[]).map((row: any) => Object.values(row)[0]);
      results.tableCount = results.allTables.length;

      // Check for drizzle migrations table
      const [migrationsTable] = await connection.query("SHOW TABLES LIKE '__drizzle_migrations'");
      results.hasMigrationsTable = (migrationsTable as any[]).length > 0;

      if (results.hasMigrationsTable) {
        const [migrations] = await connection.query('SELECT * FROM __drizzle_migrations ORDER BY id');
        results.appliedMigrations = migrations;
      }

      // Check for key tables that should exist
      const keyTables = [
        'clients', 'vendors', 'products', 'batches', 'orders', 'invoices', 'payments',
        'users', 'strains', 'purchaseOrders', 'purchase_order_line_items',
        'leaderboard_weight_configs', 'leaderboard_default_weights',
        'leaderboard_metric_cache', 'leaderboard_rank_history'
      ];

      results.keyTableStatus = {};
      for (const table of keyTables) {
        results.keyTableStatus[table] = results.allTables.includes(table);
      }

      connection.release();
      results.success = true;
    } catch (err: any) {
      results.success = false;
      results.error = err.message;
    }

    return results;
  }),

  /**
   * DIAG-006: Check if leaderboard tables exist
   */
  checkLeaderboardTables: publicProcedure.query(async () => {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    try {
      const pool = getConnectionPool();
      const connection = await pool.getConnection();

      // Check if tables exist
      const tables = [
        'leaderboard_weight_configs',
        'leaderboard_default_weights', 
        'leaderboard_metric_cache',
        'leaderboard_rank_history',
        'dashboard_widget_configs'
      ];

      for (const table of tables) {
        try {
          const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`);
          results.tests[table] = {
            exists: (rows as any[]).length > 0,
          };
          
          if ((rows as any[]).length > 0) {
            // Get column info
            const [cols] = await connection.query(`DESCRIBE ${table}`);
            results.tests[table].columns = (cols as any[]).map((c: any) => c.Field);
          }
        } catch (err: any) {
          results.tests[table] = {
            exists: false,
            error: err.message,
          };
        }
      }

      connection.release();
      results.success = true;
    } catch (poolErr: any) {
      results.success = false;
      results.poolError = poolErr.message;
    }

    return results;
  }),

  /**
   * Get counts of all seeded tables (using COUNT instead of SELECT *)
   */
  getCounts: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // DIAG-004: Use COUNT queries instead of SELECT * to avoid ENUM issues
      const [
        vendorsCount,
        clientsCount,
        productsCount,
        batchesCount,
        ordersCount,
        invoicesCount,
        paymentsCount,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(vendors),
        db.select({ count: sql<number>`count(*)` }).from(clients),
        db.select({ count: sql<number>`count(*)` }).from(products),
        db.select({ count: sql<number>`count(*)` }).from(batches),
        db.select({ count: sql<number>`count(*)` }).from(orders),
        db.select({ count: sql<number>`count(*)` }).from(invoices),
        db.select({ count: sql<number>`count(*)` }).from(payments),
      ]);

      return {
        success: true,
        counts: {
          vendors: Number(vendorsCount[0]?.count || 0),
          clients: Number(clientsCount[0]?.count || 0),
          products: Number(productsCount[0]?.count || 0),
          batches: Number(batchesCount[0]?.count || 0),
          orders: Number(ordersCount[0]?.count || 0),
          invoices: Number(invoicesCount[0]?.count || 0),
          payments: Number(paymentsCount[0]?.count || 0),
        },
      };
    } catch (error: any) {
      // FIX-009: Extract cause from DrizzleQueryError
      const cause = error.cause || {};
      return {
        success: false,
        error: error.message,
        mysqlError: cause.sqlMessage || cause.message,
        code: cause.code || error.code,
      };
    }
  }),
});
