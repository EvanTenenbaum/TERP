/**
 * Synchronous database instance for seed scripts
 * This bypasses the async getDb() pattern for simpler seed scripts
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

// Load environment variables
config();

// Create connection pool
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create drizzle instance with schema
export const db = drizzle(pool, { schema, mode: "default" });
