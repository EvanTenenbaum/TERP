/**
 * Synchronous database instance for seed scripts
 * This bypasses the async getDb() pattern for simpler seed scripts
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";

// Load environment variables
config();

// Create connection pool
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create drizzle instance with schema (same syntax as server/db.ts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = drizzle(pool as any, { schema, mode: "default" });
