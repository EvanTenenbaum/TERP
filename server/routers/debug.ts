/**
 * Debug router - for checking database state
 * SEC-028: Protected with admin authentication, disabled in production by default
 */

import { sql, isNull, eq } from "drizzle-orm";
import { adminProcedure, router } from "../_core/trpc.js";
import { getDb } from "../db.js";
import { getConnectionPool } from "../_core/connectionPool.js";
import {
  clients,
  products,
  batches,
  orders,
  invoices,
  payments,
  sampleRequests,
} from "../../drizzle/schema.js";
import { TRPCError } from "@trpc/server";
import { env } from "../_core/env.js";

// SEC-028: Debug endpoints are disabled in production unless explicitly enabled
const isDebugEnabled =
  !env.isProduction || process.env.ENABLE_DEBUG_ENDPOINTS === "true";

/**
 * SEC-028: Check if debug operations are allowed
 * Debug endpoints expose sensitive database schema information and are disabled in production
 */
function assertDebugAllowed(): void {
  if (!isDebugEnabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Debug endpoints are disabled in production. Set ENABLE_DEBUG_ENDPOINTS=true to enable (not recommended).",
    });
  }
}

// Type definitions for debug results
interface TestResult {
  success?: boolean;
  data?: unknown;
  error?: string;
  code?: string;
  errno?: number;
  cause?: unknown;
  rowCount?: number;
  sampleKeys?: string[];
  method?: string;
  columns?: unknown[];
  exists?: boolean;
}

interface DebugResults {
  timestamp: string;
  tests: Record<string, TestResult>;
  success?: boolean;
  connectionReleased?: boolean;
  poolError?: string;
  allTables?: string[];
  tableCount?: number;
  hasMigrationsTable?: boolean;
  appliedMigrations?: unknown;
  keyTableStatus?: Record<string, boolean>;
  error?: string;
}

export const debugRouter = router({
  /**
   * DIAG-002: Raw MySQL query diagnostic - bypasses Drizzle ORM
   * Tests if the issue is with Drizzle or mysql2/connection
   * SEC-028: Requires admin authentication, disabled in production
   */
  rawMysqlTest: adminProcedure.query(async () => {
    assertDebugAllowed();
    const results: DebugResults = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    try {
      const pool = getConnectionPool();
      const connection = await pool.getConnection();

      try {
        // Test 1: Simple COUNT query (should work)
        const [countRows] = await connection.query(
          "SELECT COUNT(*) as total FROM clients"
        );
        results.tests.countQuery = {
          success: true,
          data: countRows,
          method: "query (text protocol)",
        };
      } catch (err: unknown) {
        const error = err as { message: string; code?: string; errno?: number };
        results.tests.countQuery = {
          success: false,
          error: error.message,
          code: error.code,
          errno: error.errno,
        };
      }

      try {
        // Test 2: SELECT with minimal columns (no ENUMs)
        const [minimalRows] = await connection.query(
          "SELECT id, name FROM clients LIMIT 1"
        );
        results.tests.minimalSelect = {
          success: true,
          data: minimalRows,
          method: "query (text protocol)",
        };
      } catch (err: unknown) {
        const error = err as { message: string; code?: string; errno?: number };
        results.tests.minimalSelect = {
          success: false,
          error: error.message,
          code: error.code,
          errno: error.errno,
        };
      }

      try {
        // Test 3: SELECT with ENUM columns
        const [enumRows] = await connection.query(
          "SELECT id, name, cogsAdjustmentType, creditLimitSource FROM clients LIMIT 1"
        );
        results.tests.enumSelect = {
          success: true,
          data: enumRows,
          method: "query (text protocol)",
        };
      } catch (err: unknown) {
        const error = err as { message: string; code?: string; errno?: number };
        results.tests.enumSelect = {
          success: false,
          error: error.message,
          code: error.code,
          errno: error.errno,
        };
      }

      try {
        // Test 4: SELECT * (full row)
        const [fullRows] = await connection.query(
          "SELECT * FROM clients LIMIT 1"
        );
        results.tests.fullSelect = {
          success: true,
          rowCount: (fullRows as Array<Record<string, unknown>>).length,
          sampleKeys: (fullRows as Array<Record<string, unknown>>)[0]
            ? Object.keys((fullRows as Array<Record<string, unknown>>)[0])
            : [],
          method: "query (text protocol)",
        };
      } catch (err: unknown) {
        const error = err as { message: string; code?: string; errno?: number };
        results.tests.fullSelect = {
          success: false,
          error: error.message,
          code: error.code,
          errno: error.errno,
        };
      }

      try {
        // Test 5: Same query but with execute() (prepared statement / binary protocol)
        const [execRows] = await connection.execute(
          "SELECT * FROM clients LIMIT 1"
        );
        results.tests.fullSelectPrepared = {
          success: true,
          rowCount: (execRows as Array<Record<string, unknown>>).length,
          sampleKeys: (execRows as Array<Record<string, unknown>>)[0]
            ? Object.keys((execRows as Array<Record<string, unknown>>)[0])
            : [],
          method: "execute (binary protocol)",
        };
      } catch (err: unknown) {
        const error = err as { message: string; code?: string; errno?: number };
        results.tests.fullSelectPrepared = {
          success: false,
          error: error.message,
          code: error.code,
          errno: error.errno,
        };
      }

      connection.release();
      results.connectionReleased = true;
      results.success = true;
    } catch (poolErr: unknown) {
      results.success = false;
      results.poolError =
        poolErr instanceof Error ? poolErr.message : String(poolErr);
    }

    return results;
  }),

  /**
   * DIAG-003: Test Drizzle ORM queries specifically
   * Compares queries with and without ENUM columns
   * SEC-028: Requires admin authentication, disabled in production
   */
  drizzleTest: adminProcedure.query(async () => {
    assertDebugAllowed();
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const results: DebugResults = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // Test 1: COUNT via Drizzle
    try {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(clients);
      results.tests.drizzleCount = {
        success: true,
        data: count,
      };
    } catch (err: unknown) {
      const error = err as {
        message: string;
        cause?: { message?: string } | string;
      };
      results.tests.drizzleCount = {
        success: false,
        error: error.message,
        cause:
          typeof error.cause === "object" && error.cause
            ? error.cause.message || error.cause
            : error.cause,
      };
    }

    // Test 2: Minimal columns (no ENUMs) via Drizzle
    try {
      const minimal = await db
        .select({
          id: clients.id,
          name: clients.name,
        })
        .from(clients)
        .limit(1);
      results.tests.drizzleMinimal = {
        success: true,
        data: minimal,
      };
    } catch (err: unknown) {
      const error = err as {
        message: string;
        cause?: { message?: string } | string;
      };
      results.tests.drizzleMinimal = {
        success: false,
        error: error.message,
        cause:
          typeof error.cause === "object" && error.cause
            ? error.cause.message || error.cause
            : error.cause,
      };
    }

    // Test 3: With ENUM columns via Drizzle
    try {
      const withEnums = await db
        .select({
          id: clients.id,
          name: clients.name,
          cogsAdjustmentType: clients.cogsAdjustmentType,
          creditLimitSource: clients.creditLimitSource,
        })
        .from(clients)
        .limit(1);
      results.tests.drizzleWithEnums = {
        success: true,
        data: withEnums,
      };
    } catch (err: unknown) {
      const error = err as {
        message: string;
        cause?: { message?: string } | string;
      };
      results.tests.drizzleWithEnums = {
        success: false,
        error: error.message,
        cause:
          typeof error.cause === "object" && error.cause
            ? error.cause.message || error.cause
            : error.cause,
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
    } catch (err: unknown) {
      const error = err as {
        message: string;
        cause?: { message?: string } | string;
      };
      results.tests.drizzleFull = {
        success: false,
        error: error.message,
        cause:
          typeof error.cause === "object" && error.cause
            ? error.cause.message || error.cause
            : error.cause,
      };
    }

    results.success = true;
    return results;
  }),

  /**
   * DIAG-005: Check leaderboard_weight_configs table structure
   * SEC-028: Requires admin authentication, disabled in production
   */
  leaderboardTableCheck: adminProcedure.query(async () => {
    assertDebugAllowed();
    const results: DebugResults = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    try {
      const pool = getConnectionPool();
      const connection = await pool.getConnection();

      try {
        // Test 1: DESCRIBE the table to see column names
        const [describeRows] = await connection.query(
          "DESCRIBE leaderboard_weight_configs"
        );
        results.tests.tableStructure = {
          success: true,
          columns: describeRows as unknown[],
        };
      } catch (err: unknown) {
        const error = err as { message: string };
        results.tests.tableStructure = {
          success: false,
          error: error.message,
        };
      }

      try {
        // Test 2: Raw SELECT with client_type column
        const [selectRows] = await connection.query(
          "SELECT id, user_id, client_type FROM leaderboard_weight_configs LIMIT 1"
        );
        results.tests.selectClientType = {
          success: true,
          data: selectRows,
        };
      } catch (err: unknown) {
        const error = err as { message: string };
        results.tests.selectClientType = {
          success: false,
          error: error.message,
        };
      }

      try {
        // Test 3: Raw SELECT with leaderboard_client_type column (should fail if column doesn't exist)
        const [selectRows] = await connection.query(
          "SELECT id, user_id, leaderboard_client_type FROM leaderboard_weight_configs LIMIT 1"
        );
        results.tests.selectLeaderboardClientType = {
          success: true,
          data: selectRows,
        };
      } catch (err: unknown) {
        const error = err as { message: string };
        results.tests.selectLeaderboardClientType = {
          success: false,
          error: error.message,
        };
      }

      connection.release();
      results.connectionReleased = true;
      results.success = true;
    } catch (poolErr: unknown) {
      results.success = false;
      results.poolError =
        poolErr instanceof Error ? poolErr.message : String(poolErr);
    }

    return results;
  }),

  /**
   * DIAG-007: Comprehensive database schema check
   * Lists all tables and checks for migration tracking
   * SEC-028: Requires admin authentication, disabled in production
   */
  checkDatabaseSchema: adminProcedure.query(async () => {
    assertDebugAllowed();
    const results: DebugResults = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    try {
      const pool = getConnectionPool();
      const connection = await pool.getConnection();

      // Get all tables in the database
      const [allTablesRows] = await connection.query("SHOW TABLES");
      const tableNames = (allTablesRows as Array<Record<string, unknown>>).map(
        row => String(Object.values(row)[0])
      );
      results.allTables = tableNames;
      results.tableCount = tableNames.length;

      // Check for drizzle migrations table
      const [migrationsTable] = await connection.query(
        "SHOW TABLES LIKE '__drizzle_migrations'"
      );
      results.hasMigrationsTable = (migrationsTable as unknown[]).length > 0;

      if (results.hasMigrationsTable) {
        const [migrations] = await connection.query(
          "SELECT * FROM __drizzle_migrations ORDER BY id"
        );
        results.appliedMigrations = migrations;
      }

      // Check for key tables that should exist
      const keyTables = [
        "clients",
        "vendors",
        "products",
        "batches",
        "orders",
        "invoices",
        "payments",
        "users",
        "strains",
        "purchaseOrders",
        "purchase_order_line_items",
        "leaderboard_weight_configs",
        "leaderboard_default_weights",
        "leaderboard_metric_cache",
        "leaderboard_rank_history",
      ];

      results.keyTableStatus = {};
      for (const table of keyTables) {
        results.keyTableStatus[table] = tableNames.includes(table);
      }

      connection.release();
      results.success = true;
    } catch (err: unknown) {
      results.success = false;
      results.error = err instanceof Error ? err.message : String(err);
    }

    return results;
  }),

  /**
   * DIAG-006: Check if leaderboard tables exist
   * SEC-028: Requires admin authentication, disabled in production
   */
  checkLeaderboardTables: adminProcedure.query(async () => {
    assertDebugAllowed();
    const results: DebugResults = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    try {
      const pool = getConnectionPool();
      const connection = await pool.getConnection();

      // Check if tables exist
      const tables = [
        "leaderboard_weight_configs",
        "leaderboard_default_weights",
        "leaderboard_metric_cache",
        "leaderboard_rank_history",
        "dashboard_widget_configs",
      ];

      for (const table of tables) {
        try {
          const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`);
          results.tests[table] = {
            exists: (rows as Array<Record<string, unknown>>).length > 0,
          };

          if ((rows as Array<Record<string, unknown>>).length > 0) {
            // Get column info
            const [cols] = await connection.query(`DESCRIBE ${table}`);
            results.tests[table].columns = (
              cols as Array<{ Field: string }>
            ).map(c => c.Field);
          }
        } catch (err: unknown) {
          results.tests[table] = {
            exists: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }

      connection.release();
      results.success = true;
    } catch (poolErr: unknown) {
      results.success = false;
      results.poolError =
        poolErr instanceof Error ? poolErr.message : String(poolErr);
    }

    return results;
  }),

  /**
   * QA-049/QA-050: Data Display Diagnostic Endpoint
   * Comprehensive check of products and samples data at database level
   * SEC-028: Requires admin authentication, disabled in production
   */
  dataDisplayDiagnostics: adminProcedure.query(async () => {
    assertDebugAllowed();
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const timestamp = new Date().toISOString();

      // Products breakdown
      const [productsTotal, productsActive, productsDeleted] =
        await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(products),
          db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(isNull(products.deletedAt)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(sql`${products.deletedAt} IS NOT NULL`),
        ]);

      // Samples breakdown by status
      const [
        samplesTotal,
        samplesPending,
        samplesFulfilled,
        samplesReturned,
        samplesCancelled,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(sampleRequests),
        db
          .select({ count: sql<number>`count(*)` })
          .from(sampleRequests)
          .where(eq(sampleRequests.sampleRequestStatus, "PENDING")),
        db
          .select({ count: sql<number>`count(*)` })
          .from(sampleRequests)
          .where(eq(sampleRequests.sampleRequestStatus, "FULFILLED")),
        db
          .select({ count: sql<number>`count(*)` })
          .from(sampleRequests)
          .where(eq(sampleRequests.sampleRequestStatus, "RETURNED")),
        db
          .select({ count: sql<number>`count(*)` })
          .from(sampleRequests)
          .where(eq(sampleRequests.sampleRequestStatus, "CANCELLED")),
      ]);

      // Brands and Strains for product creation
      const [brandsCount, strainsCount] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(clients)
          .where(eq(clients.isSeller, true)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(sql`strains`)
          .where(sql`deleted_at IS NULL`),
      ]);

      return {
        success: true,
        timestamp,
        diagnostics: {
          products: {
            total: Number(productsTotal[0]?.count || 0),
            active: Number(productsActive[0]?.count || 0),
            deleted: Number(productsDeleted[0]?.count || 0),
            issue:
              Number(productsActive[0]?.count || 0) === 0
                ? "POSSIBLE_ISSUE: No active products found"
                : null,
          },
          samples: {
            total: Number(samplesTotal[0]?.count || 0),
            pending: Number(samplesPending[0]?.count || 0),
            fulfilled: Number(samplesFulfilled[0]?.count || 0),
            returned: Number(samplesReturned[0]?.count || 0),
            cancelled: Number(samplesCancelled[0]?.count || 0),
            issue:
              Number(samplesTotal[0]?.count || 0) === 0
                ? "POSSIBLE_ISSUE: No samples found"
                : null,
          },
          related: {
            brands: Number(brandsCount[0]?.count || 0),
            strains: Number(strainsCount[0]?.count || 0),
          },
        },
        recommendations: [
          Number(productsActive[0]?.count || 0) === 0 &&
          Number(productsDeleted[0]?.count || 0) > 0
            ? 'All products are archived. Toggle "Show Archived" to view them.'
            : null,
          Number(samplesTotal[0]?.count || 0) === 0
            ? "No sample requests exist. Create a new sample request to test."
            : null,
        ].filter(Boolean),
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }),

  /**
   * Get counts of all seeded tables (using COUNT instead of SELECT *)
   * SEC-028: Requires admin authentication, disabled in production
   */
  getCounts: adminProcedure.query(async () => {
    assertDebugAllowed();
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

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
        db
          .select({ count: sql<number>`count(*)` })
          .from(clients)
          .where(eq(clients.isSeller, true)),
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
    } catch (error: unknown) {
      // FIX-009: Extract cause from DrizzleQueryError
      const err = error as {
        message: string;
        code?: string;
        cause?: { sqlMessage?: string; message?: string; code?: string };
      };
      const cause = err.cause || {};
      return {
        success: false,
        error: err.message,
        mysqlError: cause.sqlMessage || cause.message,
        code: cause.code || err.code,
      };
    }
  }),
});
