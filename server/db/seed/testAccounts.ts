/**
 * Test Account Seeder
 *
 * Creates test accounts for each RBAC role for E2E testing.
 *
 * Usage:
 *   pnpm seed:test-accounts
 *   tsx server/db/seed/testAccounts.ts
 *
 * These accounts are for development/testing only.
 * In production, remove or change passwords for security.
 */

import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as schema from "../../../drizzle/schema";
import { roles, userRoles } from "../../../drizzle/schema-rbac";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface TestAccount {
  email: string;
  name: string;
  userRole: "admin" | "user";
  rbacRoleName: string;
  password: string;
  matrixRoleName?: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: "test-superadmin@terp-app.local",
    name: "Test Super Admin",
    userRole: "admin",
    rbacRoleName: "Super Admin",
    password: "TestSuperAdmin123!",
  },
  {
    email: "test-owner@terp-app.local",
    name: "Test Owner",
    userRole: "user",
    rbacRoleName: "Owner/Executive",
    password: "TestOwner123!",
  },
  {
    email: "test-opsmanager@terp-app.local",
    name: "Test Operations Manager",
    userRole: "user",
    rbacRoleName: "Operations Manager",
    password: "TestOpsManager123!",
  },
  {
    email: "test-salesmanager@terp-app.local",
    name: "Test Sales Manager",
    userRole: "user",
    rbacRoleName: "Sales Manager",
    password: "TestSalesManager123!",
  },
  {
    email: "test-accountant@terp-app.local",
    name: "Test Accountant",
    userRole: "user",
    rbacRoleName: "Accountant",
    password: "TestAccountant123!",
  },
  {
    email: "test-invmanager@terp-app.local",
    name: "Test Inventory Manager",
    userRole: "user",
    rbacRoleName: "Inventory Manager",
    password: "TestInvManager123!",
  },
  {
    email: "test-buyer@terp-app.local",
    name: "Test Buyer",
    userRole: "user",
    rbacRoleName: "Buyer/Procurement",
    password: "TestBuyer123!",
  },
  {
    email: "test-custservice@terp-app.local",
    name: "Test Customer Service",
    userRole: "user",
    rbacRoleName: "Customer Service",
    password: "TestCustService123!",
  },
  {
    email: "test-warehouse@terp-app.local",
    name: "Test Warehouse Staff",
    userRole: "user",
    rbacRoleName: "Warehouse Staff",
    password: "TestWarehouse123!",
  },
  {
    email: "test-auditor@terp-app.local",
    name: "Test Auditor",
    userRole: "user",
    rbacRoleName: "Read-Only Auditor",
    password: "TestAuditor123!",
  },
  {
    email: "test-accounting-manager@terp-app.local",
    name: "Test Accounting Manager",
    userRole: "user",
    rbacRoleName: "Accountant",
    matrixRoleName: "Accounting Manager",
    password: "TestAccountingManager123!",
  },
  {
    email: "test-sales-rep@terp-app.local",
    name: "Test Sales Rep",
    userRole: "user",
    rbacRoleName: "Sales Manager",
    matrixRoleName: "Sales Rep",
    password: "TestSalesRep123!",
  },
  {
    email: "test-purchasing-manager@terp-app.local",
    name: "Test Purchasing Manager",
    userRole: "user",
    rbacRoleName: "Buyer/Procurement",
    matrixRoleName: "Purchasing Manager",
    password: "TestPurchasingManager123!",
  },
  {
    email: "test-fulfillment@terp-app.local",
    name: "Test Fulfillment",
    userRole: "user",
    rbacRoleName: "Warehouse Staff",
    matrixRoleName: "Fulfillment",
    password: "TestFulfillment123!",
  },
  {
    email: "test-manager@terp-app.local",
    name: "Test Manager",
    userRole: "user",
    rbacRoleName: "Operations Manager",
    matrixRoleName: "Manager",
    password: "TestManager123!",
  },
  {
    email: "test-all-auth@terp-app.local",
    name: "Test All Authenticated Users",
    userRole: "user",
    rbacRoleName: "Read-Only Auditor",
    matrixRoleName: "All Authenticated Users",
    password: "TestAllAuthenticated123!",
  },
  {
    email: "test-all-users@terp-app.local",
    name: "Test All Users",
    userRole: "user",
    rbacRoleName: "Read-Only Auditor",
    matrixRoleName: "All Users",
    password: "TestAllUsers123!",
  },
];

async function seedTestAccounts() {
  console.info("🌱 Seeding test accounts...\n");

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
    // Check if RBAC roles exist
    const allRoles = await db.select().from(roles);
    if (allRoles.length === 0) {
      console.info("⚠️  No RBAC roles found in database");
      console.info("   Run RBAC seeder first: tsx scripts/seed-rbac.ts");
      console.info("   Proceeding without role assignments...\n");
    }

    for (const account of TEST_ACCOUNTS) {
      const displayRole = account.matrixRoleName
        ? `${account.matrixRoleName} → ${account.rbacRoleName}`
        : account.rbacRoleName;
      console.info(`Creating: ${account.email} (${displayRole})`);

      // Check if user exists
      const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, account.email))
        .limit(1);

      if (existing.length > 0) {
        console.info(`  ⏭️  Already exists, skipping`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(account.password, 10);

      // Create user with unique openId
      const openId = `test-${account.rbacRoleName.toLowerCase().replace(/[\s/]+/g, "-")}-${Date.now()}`;

      await db.insert(schema.users).values({
        openId,
        email: account.email,
        name: account.name,
        loginMethod: passwordHash,
        role: account.userRole,
      });

      // Find RBAC role
      const rbacRole = allRoles.find(r => r.name === account.rbacRoleName);

      if (rbacRole) {
        // Assign RBAC role
        await db.insert(userRoles).values({
          userId: openId,
          roleId: rbacRole.id,
          assignedBy: "test-seeder",
        });
        console.info(`  ✅ Created with ${account.rbacRoleName} role`);
      } else {
        console.info(
          `  ⚠️  Created but RBAC role "${account.rbacRoleName}" not found`
        );
      }
    }

    console.info("\n✅ Test account seeding complete!");
    console.info("\nTest Accounts:");
    console.info("─".repeat(85));
    console.info(
      "Email".padEnd(40) + " | " + "Role".padEnd(22) + " | " + "Password"
    );
    console.info("─".repeat(85));
    for (const account of TEST_ACCOUNTS) {
      const displayRole = account.matrixRoleName
        ? `${account.matrixRoleName} → ${account.rbacRoleName}`
        : account.rbacRoleName;
      console.info(
        `${account.email.padEnd(40)} | ${displayRole.padEnd(22)} | ${account.password}`
      );
    }
    console.info("─".repeat(85));
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

seedTestAccounts()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });
