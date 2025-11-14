/**
 * Apply Comments Migration Script
 * Applies the 0005_add_comments_system.sql migration to the database
 */

import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyCommentsMigration() {
  console.log("🚀 Applying comments system migration...\n");

  try {
    const db = await getDb();
    if (!db) {
      console.error("❌ Database connection failed");
      process.exit(1);
    }

    console.log("✅ Database connection successful\n");

    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      "drizzle/migrations/0005_add_comments_system.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSql = fs.readFileSync(migrationPath, "utf-8");

    console.log("📄 Migration file loaded\n");
    console.log(`Migration SQL length: ${migrationSql.length} characters\n`);
    console.log("Executing migration...\n");

    // Remove comments and split the SQL into individual statements
    const cleanedSql = migrationSql
      .split("\n")
      .filter(line => !line.trim().startsWith("--"))
      .join("\n");

    const statements = cleanedSql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\n/g, " ");
      console.log(`  [${i + 1}/${statements.length}] ${preview}...`);

      try {
        await db.execute(sql.raw(statement));
        console.log(`  ✅ Statement ${i + 1} executed successfully`);
      } catch (error: unknown) {
        // Check if table already exists (not an error)
        const err = error as Error;
        if (err.message?.includes("already exists")) {
          console.log(`  ⚠️  Table already exists, skipping...`);
        } else {
          console.error(
            `  ❌ Error executing statement ${i + 1}:`,
            err.message
          );
          console.error(`     Statement: ${preview}`);
          throw error;
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ Migration applied successfully!");

    // Verify the tables were created
    console.log("\n🔍 Verifying tables...\n");

    const [commentsTableResult] = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'comments'
    `);

    const [mentionsTableResult] = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'comment_mentions'
    `);

    const commentsExists = (commentsTableResult as { count: number }).count > 0;
    const mentionsExists = (mentionsTableResult as { count: number }).count > 0;

    if (commentsExists) {
      console.log("✅ 'comments' table exists");
    } else {
      console.log("❌ 'comments' table NOT found");
    }

    if (mentionsExists) {
      console.log("✅ 'comment_mentions' table exists");
    } else {
      console.log("❌ 'comment_mentions' table NOT found");
    }

    if (commentsExists && mentionsExists) {
      console.log("\n✅ All tables created successfully!");
      process.exit(0);
    } else {
      console.log("\n❌ Some tables were not created");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error during migration:", error);
    process.exit(1);
  }
}

applyCommentsMigration();
