/**
 * QA User Seeder
 * TER-92: Create RBAC QA Role Accounts
 *
 * Creates 6 QA user accounts with specific RBAC roles for testing.
 * This script is idempotent - running it multiple times will skip existing users.
 *
 * Usage:
 *   tsx scripts/seed-qa-users.ts
 *
 * Required Environment:
 *   DATABASE_URL - MySQL connection string
 *
 * @module scripts/seed-qa-users
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PASSWORD = "TerpQA2026!";

/**
 * QA user definitions with their RBAC role assignments.
 * Role names must match exactly what's defined in server/services/rbacDefinitions.ts
 */
const QA_USERS = [
  {
    email: "qa.sales@terp.test",
    name: "QA Sales",
    roleName: "Sales Manager",
  },
  {
    email: "qa.inventory@terp.test",
    name: "QA Inventory",
    roleName: "Inventory Manager",
  },
  {
    email: "qa.accounting@terp.test",
    name: "QA Accounting",
    roleName: "Accountant",
  },
  {
    email: "qa.fulfillment@terp.test",
    name: "QA Fulfillment",
    roleName: "Warehouse Staff",
  },
  {
    email: "qa.auditor@terp.test",
    name: "QA Auditor",
    roleName: "Read-Only Auditor",
  },
  {
    email: "qa.admin@terp.test",
    name: "QA Admin",
    roleName: "Super Admin",
  },
];

async function main() {
  console.info("=".repeat(50));
  console.info("  TERP QA User Seeder (TER-92)");
  console.info("=".repeat(50));
  console.info("");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  let connection: Awaited<ReturnType<typeof mysql.createConnection>> | null =
    null;

  try {
    connection = await mysql.createConnection(databaseUrl);
    const db = drizzle(connection, { schema, mode: "default" });

    console.info("Connected to database.\n");

    // Hash the shared password once
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const stats = { created: 0, skipped: 0, roleAssigned: 0, errors: 0 };

    for (const qaUser of QA_USERS) {
      console.info(`Processing: ${qaUser.email} (${qaUser.roleName})...`);

      try {
        // 1. Check if user already exists
        const [existing] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, qaUser.email))
          .limit(1);

        let userOpenId: string;

        if (existing) {
          console.info(`  User already exists, skipping creation.`);
          userOpenId = existing.openId;
          stats.skipped++;
        } else {
          // 2. Create user (same logic as simpleAuth.createUser)
          await db.insert(schema.users).values({
            openId: qaUser.email,
            email: qaUser.email,
            name: qaUser.name,
            loginMethod: passwordHash,
            lastSignedIn: new Date(),
          });
          userOpenId = qaUser.email;
          console.info(`  Created user.`);
          stats.created++;
        }

        // 3. Find the role
        const [role] = await db
          .select()
          .from(schema.roles)
          .where(eq(schema.roles.name, qaUser.roleName))
          .limit(1);

        if (!role) {
          console.error(
            `  ERROR: Role "${qaUser.roleName}" not found in database.`
          );
          console.error(
            `  Make sure RBAC roles have been seeded first (seedRBACDefaults).`
          );
          stats.errors++;
          continue;
        }

        // 4. Check if role is already assigned
        const [existingAssignment] = await db
          .select()
          .from(schema.userRoles)
          .where(
            and(
              eq(schema.userRoles.userId, userOpenId),
              eq(schema.userRoles.roleId, role.id)
            )
          )
          .limit(1);

        if (existingAssignment) {
          console.info(`  Role "${qaUser.roleName}" already assigned.`);
        } else {
          // 5. Assign the role
          await db.insert(schema.userRoles).values({
            userId: userOpenId,
            roleId: role.id,
          });
          console.info(`  Assigned role "${qaUser.roleName}".`);
          stats.roleAssigned++;
        }

        console.info(`  Done.\n`);
      } catch (error) {
        console.error(`  ERROR processing ${qaUser.email}:`, error);
        stats.errors++;
      }
    }

    // Summary
    console.info("=".repeat(50));
    console.info("  SUMMARY");
    console.info("=".repeat(50));
    console.info(`  Users created:   ${stats.created}`);
    console.info(`  Users skipped:   ${stats.skipped}`);
    console.info(`  Roles assigned:  ${stats.roleAssigned}`);
    console.info(`  Errors:          ${stats.errors}`);
    console.info("");

    if (stats.errors > 0) {
      console.error("Completed with errors. Check output above.");
      process.exit(1);
    } else {
      console.info("All QA users seeded successfully.");
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
