/**
 * QA Account Seeder
 *
 * Creates QA test accounts for deterministic RBAC validation.
 * These accounts use the standard QA password (TerpQA2026!) and are mapped
 * to specific RBAC roles for testing USER_FLOW_MATRIX coverage.
 *
 * Usage:
 *   pnpm seed:qa-accounts
 *   tsx server/db/seed/qaAccounts.ts
 *
 * SECURITY: These accounts are for development/QA/staging only.
 * QA_AUTH_ENABLED must be false in production.
 *
 * @module server/db/seed/qaAccounts
 */

import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as schema from "../../../drizzle/schema";
import { roles, userRoles } from "../../../drizzle/schema-rbac";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * QA Account configuration
 */
interface QaAccount {
  email: string;
  name: string;
  userRole: "admin" | "user";
  rbacRoleName: string;
  description: string;
}

/**
 * Standard QA password for all accounts
 * This enables deterministic authentication for automated testing
 */
const QA_PASSWORD = "TerpQA2026!";

/**
 * QA Accounts mapped to USER_FLOW_MATRIX roles
 *
 * Each account corresponds to a role that needs RBAC validation:
 * - Super Admin: Unrestricted system access
 * - Sales Manager: Client and order management
 * - Sales Rep (Customer Service): Client interactions
 * - Inventory Manager: Inventory and product management
 * - Fulfillment (Warehouse Staff): Order fulfillment
 * - Accounting Manager: Financial operations
 * - Read-Only Auditor: Audit and compliance
 */
const QA_ACCOUNTS: QaAccount[] = [
  {
    email: "qa.superadmin@terp.test",
    name: "QA Super Admin",
    userRole: "admin",
    rbacRoleName: "Super Admin",
    description: "Unrestricted access to entire system",
  },
  {
    email: "qa.salesmanager@terp.test",
    name: "QA Sales Manager",
    userRole: "user",
    rbacRoleName: "Sales Manager",
    description: "Full access to clients, orders, quotes, sales sheets",
  },
  {
    email: "qa.salesrep@terp.test",
    name: "QA Sales Rep",
    userRole: "user",
    rbacRoleName: "Customer Service",
    description: "Full access to clients, orders, returns, refunds",
  },
  {
    email: "qa.inventory@terp.test",
    name: "QA Inventory Manager",
    userRole: "user",
    rbacRoleName: "Inventory Manager",
    description: "Full access to inventory, locations, transfers, product intake",
  },
  {
    email: "qa.fulfillment@terp.test",
    name: "QA Fulfillment",
    userRole: "user",
    rbacRoleName: "Warehouse Staff",
    description: "Can receive POs, adjust inventory, transfer inventory, process returns",
  },
  {
    email: "qa.accounting@terp.test",
    name: "QA Accounting Manager",
    userRole: "user",
    rbacRoleName: "Accountant",
    description: "Full access to accounting, credits, COGS, bad debt",
  },
  {
    email: "qa.auditor@terp.test",
    name: "QA Read-Only Auditor",
    userRole: "user",
    rbacRoleName: "Read-Only Auditor",
    description: "Read-only access to all modules, full access to audit logs",
  },
];

/**
 * Seed QA accounts with RBAC role assignments
 * BUG-111 FIX: Now assigns roles to existing users if missing
 */
async function seedQaAccounts(): Promise<void> {
  console.info("=".repeat(80));
  console.info("QA ACCOUNT SEEDER");
  console.info("=".repeat(80));
  console.info("");
  console.info("Purpose: Create deterministic QA accounts for RBAC validation testing");
  console.info("Password: TerpQA2026! (same for all accounts)");
  console.info("");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is not set");
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
      console.info("WARNING: No RBAC roles found in database");
      console.info("   Run RBAC seeder first: tsx scripts/seed-rbac.ts");
      console.info("   Proceeding without role assignments...\n");
    }

    console.info("Creating QA accounts...\n");
    const qaPasswordHash = await bcrypt.hash(QA_PASSWORD, 10);

    let created = 0;
    let skipped = 0;
    let roleAssigned = 0;
    let roleUpdated = 0;
    let passwordUpdated = 0;

    for (const account of QA_ACCOUNTS) {
      process.stdout.write(`  ${account.email.padEnd(35)}`);

      // Check if user exists
      const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, account.email))
        .limit(1);

      let openId: string;

      if (existing.length > 0) {
        // User exists - use existing openId
        openId = existing[0].openId;
        skipped++;

        // Keep QA credentials deterministic for E2E/oracle auth.
        await db
          .update(schema.users)
          .set({
            loginMethod: qaPasswordHash,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.openId, openId));
        passwordUpdated++;

        // BUG-111 FIX: Check if user already has the RBAC role assigned
        const rbacRole = allRoles.find(r => r.name === account.rbacRoleName);

        if (rbacRole) {
          // Check if role is already assigned
          const existingRoleAssignment = await db
            .select()
            .from(userRoles)
            .where(and(eq(userRoles.userId, openId), eq(userRoles.roleId, rbacRole.id)))
            .limit(1);

          if (existingRoleAssignment.length === 0) {
            // Role not assigned - assign it now
            await db.insert(userRoles).values({
              userId: openId,
              roleId: rbacRole.id,
              assignedBy: "qa-seeder",
            });
            console.info(`[UPDATED] Assigned ${account.rbacRoleName} to existing user`);
            roleUpdated++;
          } else {
            console.info(`[SKIP] Already has ${account.rbacRoleName} role`);
          }
        } else {
          console.info(`[SKIP] (RBAC role "${account.rbacRoleName}" not found)`);
        }
        continue;
      }

      // Create user with unique openId
      openId = `qa-${account.rbacRoleName.toLowerCase().replace(/[\s/]+/g, "-")}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await db.insert(schema.users).values({
        openId,
        email: account.email,
        name: account.name,
        loginMethod: qaPasswordHash,
        role: account.userRole,
      });

      created++;

      // Find RBAC role
      const rbacRole = allRoles.find(r => r.name === account.rbacRoleName);

      if (rbacRole) {
        // Assign RBAC role
        await db.insert(userRoles).values({
          userId: openId,
          roleId: rbacRole.id,
          assignedBy: "qa-seeder",
        });
        console.info(`[OK] ${account.rbacRoleName}`);
        roleAssigned++;
      } else {
        console.info(`[OK] (no RBAC role: "${account.rbacRoleName}" not found)`);
      }
    }

    console.info("");
    console.info("=".repeat(80));
    console.info("SUMMARY");
    console.info("=".repeat(80));
    console.info(`  Created:         ${created}`);
    console.info(`  Skipped:         ${skipped}`);
    console.info(`  Password Reset:  ${passwordUpdated}`);
    console.info(`  Roles Assigned:  ${roleAssigned} (new users)`);
    console.info(`  Roles Updated:   ${roleUpdated} (existing users)`);
    console.info("");

    // Print account table
    console.info("QA ACCOUNTS REFERENCE");
    console.info("=".repeat(80));
    console.info(
      "Email".padEnd(35) +
        " | " +
        "Role".padEnd(22) +
        " | " +
        "Password"
    );
    console.info("-".repeat(80));
    for (const account of QA_ACCOUNTS) {
      console.info(
        `${account.email.padEnd(35)} | ${account.rbacRoleName.padEnd(22)} | ${QA_PASSWORD}`
      );
    }
    console.info("-".repeat(80));
    console.info("");

    // Print usage instructions
    console.info("USAGE INSTRUCTIONS");
    console.info("=".repeat(80));
    console.info("1. Set QA_AUTH_ENABLED=true in your .env file");
    console.info("2. Start the server: pnpm dev");
    console.info("3. Login via: POST /api/qa-auth/login");
    console.info("   Body: { email: 'qa.superadmin@terp.test', password: 'TerpQA2026!' }");
    console.info("4. Or use the normal login form with QA credentials");
    console.info("");
    console.info("For full documentation, see: docs/auth/QA_AUTH.md");
    console.info("");
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run seeder
seedQaAccounts()
  .then(() => {
    console.info("QA account seeding complete!");
    process.exit(0);
  })
  .catch(err => {
    console.error("ERROR:", err.message);
    process.exit(1);
  });
