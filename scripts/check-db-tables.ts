#!/usr/bin/env tsx
import mysql from "mysql2/promise";

async function checkTables() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    const [tables] = await connection.query("SHOW TABLES");
    console.log("📊 Tables in database:", tables);
  } finally {
    await connection.end();
  }
}

checkTables();
