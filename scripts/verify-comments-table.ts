/**
 * Verify Comments Table Script
 * Checks if the comments and comment_mentions tables exist in the database
 */

import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function verifyCommentsTables() {
  console.log("🔍 Verifying comments tables in database...\n");

  // Check environment variables
  console.log("Environment check:");
  console.log(
    `  DATABASE_URL: ${process.env.DATABASE_URL ? "Set" : "Not set"}`
  );
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
  console.log("");

  try {
    const db = await getDb();
    if (!db) {
      console.error("❌ Database connection failed");
      console.error("   Check that DATABASE_URL is set correctly in .env");
      process.exit(1);
    }

    console.log("✅ Database connection successful\n");

    // Check if comments table exists
    const [commentsTableResult] = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'comments'
    `);

    const commentsTableExists =
      (commentsTableResult as { count: number }).count > 0;

    if (commentsTableExists) {
      console.log("✅ 'comments' table exists");

      // Get column count
      const [columnsResult] = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'comments'
      `);

      console.log(
        `   - Columns: ${(columnsResult as { count: number }).count}`
      );

      // Get row count
      const [rowCountResult] = await db.execute(sql`
        SELECT COUNT(*) as count FROM comments
      `);

      console.log(`   - Rows: ${(rowCountResult as { count: number }).count}`);
    } else {
      console.log("❌ 'comments' table does NOT exist");
      console.log(
        "   - Migration 0005_add_comments_system.sql needs to be run"
      );
    }

    // Check if comment_mentions table exists
    const [mentionsTableResult] = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'comment_mentions'
    `);

    const mentionsTableExists =
      (mentionsTableResult as { count: number }).count > 0;

    if (mentionsTableExists) {
      console.log("\n✅ 'comment_mentions' table exists");

      // Get column count
      const [columnsResult] = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'comment_mentions'
      `);

      console.log(
        `   - Columns: ${(columnsResult as { count: number }).count}`
      );

      // Get row count
      const [rowCountResult] = await db.execute(sql`
        SELECT COUNT(*) as count FROM comment_mentions
      `);

      console.log(`   - Rows: ${(rowCountResult as { count: number }).count}`);
    } else {
      console.log("\n❌ 'comment_mentions' table does NOT exist");
      console.log(
        "   - Migration 0005_add_comments_system.sql needs to be run"
      );
    }

    console.log("\n" + "=".repeat(60));

    if (!commentsTableExists || !mentionsTableExists) {
      console.log("\n⚠️  ACTION REQUIRED:");
      console.log(
        "   Run the migration: drizzle/migrations/0005_add_comments_system.sql"
      );
      console.log("   Or use: pnpm drizzle-kit push");
      process.exit(1);
    } else {
      console.log("\n✅ All comments tables are properly configured");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Error during verification:", error);
    process.exit(1);
  }
}

verifyCommentsTables();
