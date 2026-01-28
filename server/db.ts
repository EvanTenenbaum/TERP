import { eq } from "drizzle-orm";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import * as schema from "../drizzle/schema";
import { ENV } from './_core/env';
import { getConnectionPool } from './_core/connectionPool';
import { logger } from './_core/logger';

let _db: MySql2Database<typeof schema> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb(): Promise<MySql2Database<typeof schema>> {
  if (!_db) {
    try {
      // Use connection pool for better performance
      // Note: getConnectionPool() caches the pool, so this is safe to call multiple times
      // Even if process.env.DATABASE_URL is not available at runtime, the cached pool will be returned
      const pool = getConnectionPool();
      _db = drizzle(pool as any, { schema, mode: 'default' }); // Pool is compatible with drizzle
      logger.info("Database connection established with connection pooling");
    } catch (error) {
      logger.error({ msg: "Failed to connect to database", error });
      throw new Error("Database connection failed - cannot start server without database");
    }
  }
  return _db;
}

// Synchronous db export for use in routers that need immediate access
// This is initialized lazily on first access
let _syncDb: MySql2Database<typeof schema> | null = null;

function initSyncDb(): MySql2Database<typeof schema> {
  if (!_syncDb) {
    try {
      const pool = getConnectionPool();
      _syncDb = drizzle(pool as any, { schema, mode: 'default' });
    } catch (error) {
      // In development/test environments without a database, create a placeholder
      // that will throw meaningful errors when accessed
      logger.warn({ msg: "Database not available - operations will fail", error });
      // Return a proxy that throws on any operation
      return new Proxy({} as MySql2Database<typeof schema>, {
        get(_target, prop) {
          if (prop === 'then') return undefined; // Allow promise checks
          throw new Error(`Database not available - cannot perform operation: ${String(prop)}`);
        }
      });
    }
  }
  return _syncDb;
}

// Export db - guaranteed non-null for TypeScript
// Will throw at runtime if database operations are attempted without a connection
export const db: MySql2Database<typeof schema> = initSyncDb();

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const database = await getDb();

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await database.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    logger.error({ error }, "Failed to upsert user");
    throw error;
  }
}

export async function getUser(openId: string) {
  const database = await getDb();

  const result = await database.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const database = await getDb();

  const result = await database.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * TERP-0014: Get user by numeric ID
 * Used for admin session revocation and other admin operations
 */
export async function getUserById(id: number) {
  const database = await getDb();

  const result = await database.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.
