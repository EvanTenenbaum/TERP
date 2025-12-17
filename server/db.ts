import { eq } from "drizzle-orm";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import * as schema from "../drizzle/schema";
import { ENV } from './_core/env';
import { getConnectionPool } from './_core/connectionPool';
import { logger } from './_core/logger';

let _db: MySql2Database<typeof schema> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db) {
    try {
      // Use connection pool for better performance
      // Note: getConnectionPool() caches the pool, so this is safe to call multiple times
      // Even if process.env.DATABASE_URL is not available at runtime, the cached pool will be returned
      const pool = getConnectionPool();
      _db = drizzle(pool as any, { schema, mode: 'default' }); // Pool is compatible with drizzle
      logger.info("Database connection established with connection pooling");
    } catch (error) {
      logger.warn({ msg: "Failed to connect to database", error });
      _db = null;
    }
  }
  return _db;
}

// Synchronous db export for use in routers that need immediate access
// This is initialized lazily on first access
let _syncDb: MySql2Database<typeof schema> | null = null;

function initSyncDb(): MySql2Database<typeof schema> | null {
  if (!_syncDb) {
    try {
      const pool = getConnectionPool();
      _syncDb = drizzle(pool as any, { schema, mode: 'default' });
    } catch (error) {
      logger.warn({ msg: "Failed to initialize sync db", error });
      _syncDb = null;
    }
  }
  return _syncDb;
}

// Export db - may be null if database is not available
// Callers should check for null before using
export const db = initSyncDb();

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.
