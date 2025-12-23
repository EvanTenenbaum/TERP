/**
 * Debug router - for checking database state
 * REMOVE THIS IN PRODUCTION
 */

import { z } from 'zod';
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
   * Get counts of all seeded tables
   */
  getCounts: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const [
        vendorsList,
        clientsList,
        productsList,
        batchesList,
        ordersList,
        invoicesList,
        paymentsList,
      ] = await Promise.all([
        db.select().from(vendors),
        db.select().from(clients),
        db.select().from(products),
        db.select().from(batches),
        db.select().from(orders),
        db.select().from(invoices),
        db.select().from(payments),
      ]);

      return {
        success: true,
        counts: {
          vendors: vendorsList.length,
          clients: clientsList.length,
          products: productsList.length,
          batches: batchesList.length,
          orders: ordersList.length,
          invoices: invoicesList.length,
          payments: paymentsList.length,
          total: vendorsList.length + clientsList.length + productsList.length + 
                 batchesList.length + ordersList.length + invoicesList.length + paymentsList.length,
        },
        sampleVendor: vendorsList[0] || null,
        sampleBatch: batchesList[0] || null,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }),
});
