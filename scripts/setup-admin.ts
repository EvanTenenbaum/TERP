/**
 * Admin Setup Script
 *
 * Usage:
 *   tsx scripts/setup-admin.ts <email> <password>
 *
 * This script:
 * 1. Creates or updates a user with the given email
 * 2. Sets their password (bcrypt hashed)
 * 3. Sets users.role = 'admin'
 * 4. Assigns the "Super Admin" RBAC role
 *
 * Examples:
 *   pnpm setup:admin admin@example.com MySecurePassword123!
 *   tsx scripts/setup-admin.ts evan@terp.com SuperSecret123
 */

import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { roles, userRoles } from "../drizzle/schema-rbac";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: tsx scripts/setup-admin.ts <email> <password>");
    console.error(
      "Example: tsx scripts/setup-admin.ts admin@example.com MySecurePassword123!"
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ Password must be at least 8 characters");
    process.exit(1);
  }

  console.info(`🔧 Setting up admin access for: ${email}`);

  // Connect to database
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection, {
    schema: { ...schema, roles, userRoles },
    mode: "default",
  });

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    console.info("✅ Password hashed");

    // Check if user exists
    const existingUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    let userOpenId: string;

    if (existingUsers.length > 0) {
      // Update existing user
      const user = existingUsers[0];
      userOpenId = user.openId;

      await db
        .update(schema.users)
        .set({
          loginMethod: passwordHash,
          role: "admin",
        })
        .where(eq(schema.users.id, user.id));

      console.info(`✅ Updated existing user (ID: ${user.id})`);
    } else {
      // Create new user
      userOpenId = `admin-${Date.now()}`;

      await db.insert(schema.users).values({
        openId: userOpenId,
        email: email,
        name: "Admin User",
        loginMethod: passwordHash,
        role: "admin",
      });

      const newUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (newUser.length > 0) {
        console.info(`✅ Created new user (ID: ${newUser[0].id})`);
      }
    }

    // Find Super Admin role
    const superAdminRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "Super Admin"))
      .limit(1);

    if (superAdminRoles.length === 0) {
      console.info("⚠️  Super Admin role not found in database");
      console.info("   Run RBAC seeder first: tsx scripts/seed-rbac.ts");
      console.info("   User can still login but may have limited permissions");
      console.info(
        "   (users.role='admin' grants god-mode access as fallback)"
      );
    } else {
      const roleId = superAdminRoles[0].id;

      // Check if user already has this role
      const existingRoles = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, userOpenId))
        .limit(1);

      if (existingRoles.length > 0) {
        // Update existing role assignment
        await db
          .update(userRoles)
          .set({ roleId: roleId })
          .where(eq(userRoles.userId, userOpenId));
        console.info("✅ Updated Super Admin role assignment");
      } else {
        // Create new role assignment
        await db.insert(userRoles).values({
          userId: userOpenId,
          roleId: roleId,
          assignedBy: "setup-script",
        });
        console.info("✅ Assigned Super Admin role");
      }
    }

    console.info("\n🎉 Admin setup complete!");
    console.info(`   Email: ${email}`);
    console.info(`   Password: (as provided)`);
    console.info(`   Role: Super Admin`);
    console.info(`\n   Login at: /login`);
  } catch (error) {
    console.error(
      "❌ Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
