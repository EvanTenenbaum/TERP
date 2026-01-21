/**
 * Direct Table Check Script
 * Directly queries the database to check for tables
 */

import mysql from "mysql2/promise";

async function checkTables() {
  const connection = await mysql.createConnection({
    host: "terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com",
    port: 25060,
    user: "doadmin",
    password: "<REDACTED>",
    database: "defaultdb",
    ssl: {
      rejectUnauthorized: false,
    },
  });

  console.log("✅ Connected to database\n");

  // Show all tables
  const [tables] = await connection.execute("SHOW TABLES");
  console.log("📋 All tables in database:");
  console.log(tables);

  // Check specifically for comments table
  const [commentsCheck] = await connection.execute(
    "SHOW TABLES LIKE 'comments'"
  );
  console.log("\n🔍 Comments table check:");
  console.log(commentsCheck);

  // Check for comment_mentions table
  const [mentionsCheck] = await connection.execute(
    "SHOW TABLES LIKE 'comment_mentions'"
  );
  console.log("\n🔍 Comment_mentions table check:");
  console.log(mentionsCheck);

  await connection.end();
}

checkTables().catch(console.error);
